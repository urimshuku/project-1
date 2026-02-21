# Feasibility: Migrating from Stripe to Paysera

## Summary

**Verdict: Migration is feasible.** Your current flow (one-time donations, redirect to gateway, callback to record donation and update category) maps well to Paysera’s Checkout API. Main work is replacing Stripe-specific code with Paysera request building, signature verification, and a small “pending order” store so the callback can recover donation metadata (category, donor name, words of support).

---

## 1. Current Stripe Integration (What You Have)

| Layer | What it does |
|-------|----------------|
| **Frontend** (`PaymentGateway.tsx`) | User picks amount, name, anonymous, words of support → POSTs to `process-donation` → redirects to `checkoutUrl` (Stripe Checkout). Success URL: `/success?session_id={CHECKOUT_SESSION_ID}`. |
| **Edge: process-donation** | Creates Stripe Checkout Session with `metadata` (category_id, donor_name, is_anonymous, words_of_support), returns `checkoutUrl`. |
| **Edge: stripe-webhook** | On `checkout.session.completed`: reads metadata and amount, inserts into `donations`, updates `categories.current_amount`. |
| **Success** | App shows success page when URL has `/success` and `session_id`; no server-side validation of session. |

Important point: **Donation is only recorded in the webhook.** The success URL is for UX only; the source of truth is the webhook writing to the DB.

---

## 2. Paysera Checkout Flow (What You’d Use)

1. **Request**: You build a signed request (params → base64 → URL-safe → sign with `sign = md5(data + sign_password)`) and redirect the user to `https://www.paysera.com/pay/?data=...&sign=...`.
2. **User**: Chooses payment method, pays; on success Paysera redirects to your `accepturl`; on cancel to `cancelurl`.
3. **Callback**: Paysera sends a GET to your `callbackurl` with `data`, `ss1` (and optionally `ss2`/`ss3`). You verify signature, decode `data` (base64 + URL decode), and **only treat `status === 1` as successful payment**. You must respond with **`OK`** so Paysera stops retrying.

Paysera does **not** support arbitrary metadata like Stripe. You get fixed callback parameters (e.g. `orderid`, `request_amount`, `pay_amount`, `pay_currency`, `paytext`, etc.). So you must **identify the donation from `orderid`** and look up the rest (category, donor name, words of support) from your own store.

---

## 3. Mapping Stripe → Paysera

| Stripe | Paysera |
|--------|---------|
| Checkout Session + metadata | Signed redirect to Paysera with `orderid`; donation details stored in your DB and looked up by `orderid` in callback |
| `success_url` / `cancel_url` | `accepturl` / `cancelurl` |
| Webhook `checkout.session.completed` | Callback to `callbackurl` with `status=1` |
| Webhook secret verification | Verify `ss1` (md5) or preferably `ss2`/`ss3` (RSA); or decrypt `data` if project uses encryption |
| Session ID in success URL | Optional: put `orderid` in `accepturl` so success page can show “Thank you for order X” (optional) |

**Currency**: You use EUR; Paysera supports EUR and will return `pay_amount` / `pay_currency` in the callback (may differ if converted).

**Amount**: Stripe uses cents; Paysera uses **cents** in the request (`amount` in cents). Your DB stores euros, so same conversion as today (amount / 100 when writing to DB).

---

## 4. What You Need to Build

### 4.1 Pending orders (required)

- **Reason**: Paysera callback does not send category_id, donor_name, words_of_support, etc. You need to associate callback `orderid` with that data.
- **Approach**: Before redirecting to Paysera, create a **pending donation** row with: unique id (e.g. UUID), category_id, donor_name, amount, is_anonymous, words_of_support. Use that id as Paysera **orderid** (max 40 chars; UUID fits). In the callback, load by orderid, insert into `donations`, update `categories`, then delete or mark the pending row.
- **Schema**: e.g. `paysera_pending` (id uuid primary key, category_id, donor_name, amount, is_anonymous, words_of_support, created_at). Optional: TTL/cleanup for abandoned orders.

### 4.2 Backend (Supabase Edge Functions)

- **process-donation** (replace Stripe logic):
  - Validate input (category_id, donor_name, amount, success_url, cancel_url).
  - Generate a UUID for the payment.
  - Insert into `paysera_pending` with category_id, donor_name, amount (in euros), is_anonymous, words_of_support.
  - Build Paysera request: projectid, orderid (UUID), amount (cents), currency EUR, accepturl, cancelurl, callbackurl, version, paytext (e.g. “Donation – Studio Space”).
  - Encode and sign per [Paysera spec](https://developers.paysera.com/en/checkout/integrations/integration-specification): `data = base64url(query_string)`, `sign = md5(data + sign_password)`.
  - Return `{ success: true, checkoutUrl: "https://www.paysera.com/pay/?data=...&sign=..." }` (and optionally orderid for frontend).
- **paysera-callback** (replaces stripe-webhook):
  - POST/GET: read `data`, `ss1` (and optionally `ss2`/`ss3`).
  - Verify signature (e.g. ss1: `md5(data + sign_password)`; or use Paysera public key for ss2/ss3).
  - Decode `data` (reverse of request: replace `-`/`_` with `+`/`/`, base64 decode, parse query string).
  - If `status !== 1`, respond `OK` and exit (no donation).
  - Load pending row by `orderid`; if missing, respond `OK` and log (idempotent).
  - Insert into `donations` (category_id, donor_name, amount from callback `pay_amount`/`pay_currency` or from pending row; is_anonymous, words_of_support from pending).
  - Update `categories.current_amount` for that category_id.
  - Delete or mark pending row.
  - Return response body **`OK`** (required by Paysera).

Secrets: **PAYSERA_PROJECT_ID**, **PAYSERA_SIGN_PASSWORD** (and optionally Paysera public key for ss2/ss3). Remove Stripe keys from this flow.

### 4.3 Frontend

- **PaymentGateway.tsx**:
  - Keep same API: POST to `process-donation` with category_id, donor_name, amount, is_anonymous, words_of_support, success_url, cancel_url.
  - Backend now returns Paysera `checkoutUrl`; continue to redirect with `window.location.href = checkoutUrl`.
  - Success URL: e.g. `accepturl: `${baseUrl}/success`` (or `/success?order={orderid}` if you want to show order id). No Stripe placeholder.
  - Copy: change “Payments secured by Stripe” to “Payments secured by Paysera” (or similar).
- **App.tsx**:
  - Success page: today you require `session_id` for `/success`. For Paysera you can show success when pathname is `/success` (and optionally when `order` is present). So relax to: pathname includes `success` (or keep a generic `?payment=done` if you prefer).

No other frontend logic needed; backend handles the difference.

### 4.4 Success page

- **SuccessPage.tsx**: No change required. You can keep “Your donation has been successfully processed” and “You’ll receive a confirmation email shortly” (Paysera can send payer emails if you configure it).

### 4.5 Environment and deployment

- **Supabase secrets**: Set `PAYSERA_PROJECT_ID`, `PAYSERA_SIGN_PASSWORD`. Unset or leave unused Stripe keys if you fully switch.
- **Paysera project**: In Paysera: add your site URL, set callback URL to your Edge Function (e.g. `https://<project>.supabase.co/functions/v1/paysera-callback`). Enable “Allow test payments” for testing.
- **Stripe**: Remove or disable Stripe webhook and Stripe-only code paths when you go live with Paysera.

---

## 5. Differences and Considerations

| Topic | Stripe | Paysera |
|-------|--------|---------|
| **Confirmation** | Webhook is source of truth | Callback is source of truth; **must** return `OK`. |
| **Metadata** | In session metadata | Only via your DB (pending row keyed by orderid). |
| **Signature** | Webhook secret (HMAC) | md5(data+password) or RSA (ss2/ss3). |
| **Success URL** | Placeholder `{CHECKOUT_SESSION_ID}` | Static or with your own query params (e.g. orderid). |
| **Testing** | Test mode + test keys | Same environment; enable “Allow test payments” in project. |
| **Country** | Restricted by Stripe | Paysera is often used in EU/Lithuania and other regions; confirm your country is supported. |

---

## 6. Effort Estimate

| Task | Effort |
|------|--------|
| DB migration: `paysera_pending` table | Small |
| process-donation: Paysera request build + sign, pending insert | Medium |
| New paysera-callback: decode, verify, insert donation, update category, return OK | Medium |
| PaymentGateway + App success routing + copy | Small |
| Env vars, Paysera project (callback URL, test mode) | Small |
| Remove Stripe webhook / optional cleanup | Small |

Rough total: **about 1–2 days** for a developer familiar with the codebase and Paysera’s docs.

---

## 7. References

- [Paysera Checkout – Getting started](https://developers.paysera.com/en/checkout/basic)
- [Payment flow](https://developers.paysera.com/en/checkout/flow)
- [Request/callback specification](https://developers.paysera.com/en/checkout/integrations/integration-specification)
- [Callback handling](https://developers.paysera.com/en/checkout/integrations/integration-callback)

---

## 8. Next Steps

1. **Confirm Paysera** supports your country and business type (donations / non-profit if applicable).
2. **Register** at [Paysera](https://bank.paysera.com/en/registration), order “Payment collection service” (and card collection if needed).
3. **Create a project**, add your website, set callback URL to the new Edge Function.
4. Implement **paysera_pending** + **process-donation** (Paysera) + **paysera-callback** and switch frontend to the new success URL and copy.
5. Test with **test=1** and “Allow test payments” enabled, then switch to live when ready.

If you want, the next step can be a concrete implementation plan (file-by-file changes and code snippets for request building and callback verification).
