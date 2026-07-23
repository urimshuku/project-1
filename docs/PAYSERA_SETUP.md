# Paysera donation checkout

This app uses **Paysera** as the only payment gateway for one-time donations. Users enter amount, name, and email on your site and are redirected to Paysera’s hosted payment page to complete payment. No card or bank details are stored by the app.

---

## Environment variables

### Frontend (`.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL (for Edge Functions). |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon key. |

### Backend (Supabase Edge Function secrets)

Set these in **Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Secrets**.

| Variable | Required | Description |
|----------|----------|-------------|
| `PAYSERA_PROJECT_ID` | Yes | Your Paysera project ID (e.g. `254482`). From Paysera: Service management → My Projects → Project settings. |
| `PAYSERA_SIGN_PASSWORD` | Yes | Sign password for the project (Paysera → General settings). Never expose in the frontend. |
| `PAYSERA_TEST` | No | Set to `true` to allow test payments. Enable test mode for the project in Paysera first. |

---

## Flow

1. User selects or enters amount, name, email, and optional words of support on the donation form.
2. User clicks **Continue to payment** → frontend calls **paysera-pay-url** with donation data and return URLs.
3. Backend creates a pending record, builds signed Paysera params (no billing address unless Paysera enforces it), returns redirect URL.
4. User is redirected to Paysera’s hosted page to pay.
5. **Success:** Paysera redirects to `/success?paysera=1`. Paysera calls **paysera-callback** (GET with `data` + `ss1`); we verify the signature, then move the pending donation to **donations** and return `OK`.
6. **Cancel/failure:** Paysera redirects to `/cancel`; user sees the cancel page and can go back home.

---

## Deploy

```bash
supabase db push
supabase functions deploy paysera-pay-url
supabase functions deploy paysera-callback
```

Then set the secrets (see above). The callback URL is your Supabase project URL + `/functions/v1/paysera-callback`; ensure it is reachable by Paysera (no auth required for the callback).

Deploy `paysera-callback` with JWT verification off (`verify_jwt = false` in `supabase/config.toml`, or `supabase functions deploy paysera-callback --no-verify-jwt`), because Paysera’s server callback does not send a Supabase JWT.

---

## Fix error 0x13 (URL address mismatch)

Paysera error **0x13** means `accepturl`, `cancelurl`, `callbackurl`, or the payment referer does not match domains confirmed on the project. **Every domain must be ownership-verified (meta tag / file); Paysera will not whitelist third-party hosts like `*.supabase.co`** (confirmed by Paysera tech support, project 256874).

Because GitHub Pages is static and cannot receive server callbacks, the callback goes through a small proxy on a subdomain we own — see `paysera-proxy/README.md`.

Domains to confirm in Paysera → **Projects and Activities → My projects → Project settings**:

| Purpose | Domain / URL to confirm |
|---------|-------------------------|
| Live site (accept/cancel + referer) | `https://www.studiospace.community` |
| Callback proxy | `https://payments.studiospace.community` |

Exact URLs this app sends:

- `accepturl`: `https://www.studiospace.community/success?paysera=1`
- `cancelurl`: `https://www.studiospace.community/cancel`
- `callbackurl`: `https://payments.studiospace.community/paysera-callback` (set via Edge secret `PAYSERA_CALLBACK_URL`; falls back to the Supabase URL if unset, which Paysera rejects)

Also enable **Allow test payments** in the project, and set Edge secret `PAYSERA_TEST=true` while Paysera reviews. After go-live, set `PAYSERA_TEST=false`.

Do **not** use Paysera’s donation-button HTML generator for this site; checkout is already custom (`PaymentGateway` → `paysera-pay-url`).

---

## Callback verification

The **paysera-callback** function:

- Receives GET with query params `data` (base64-encoded payload) and `ss1` (signature).
- Verifies `ss1 === MD5(data + PAYSERA_SIGN_PASSWORD)` before trusting the payload.
- Only on `status=1` (success): loads pending donation by `orderid`, inserts into **donations**, updates category total, deletes pending row, returns `OK`.
- Stores only non-sensitive data (amount, donor name, email, reference). No card or bank details.

---

## GitHub Pages / CI

For the live site, add repository secrets so the build gets Supabase config:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

The workflow should pass these into the build (see your workflow file).
