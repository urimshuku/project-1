# Paysera callback proxy

Tiny service deployed at **https://payments.studiospace.community**. It exists because
Paysera requires every payment URL (`accepturl`, `cancelurl`, `callbackurl`) to be on a
domain verified in the Paysera project. The Supabase domain cannot be verified, so this
proxy receives Paysera's server callback on our own subdomain and forwards it to the
Supabase Edge Function.

## What it does

- `GET /` — serves `index.html` containing the Paysera verification meta tag.
- `GET /paysera-callback` — forwards the request (query string intact) to
  `https://qqlrhqekqcoivarkzkua.supabase.co/functions/v1/paysera-callback` and returns
  the upstream response (`OK` on success). Signature validation stays in Supabase.

## Deploy (Vercel, free)

1. Create a free account at https://vercel.com (sign in with GitHub).
2. Install the CLI and deploy this folder:

   ```bash
   npm i -g vercel
   cd paysera-proxy
   vercel --prod
   ```

3. In the Vercel dashboard → project → **Settings → Domains**, add
   `payments.studiospace.community`.
4. At Porkbun (DNS) add the record Vercel shows, typically:
   - Type: `CNAME`, Host: `payments`, Value: `cname.vercel-dns.com`
5. Wait for the domain to go active (HTTPS certificate is automatic), then check:
   - `https://payments.studiospace.community/` shows the verification page
   - `https://payments.studiospace.community/paysera-callback` returns `OK`

## After deploy

1. In Paysera project settings, add and verify `https://payments.studiospace.community`
   (meta tag is already served; replace the `content` value in `index.html` if Paysera
   shows a different code, then redeploy with `vercel --prod`).
2. Set the Supabase Edge Function secret so payments use the proxy:

   ```bash
   supabase secrets set PAYSERA_CALLBACK_URL=https://payments.studiospace.community/paysera-callback
   supabase functions deploy paysera-pay-url
   supabase functions deploy paysera-callback --no-verify-jwt
   ```

3. Run a test donation from https://www.studiospace.community and confirm the donation
   is recorded, then resubmit the Paysera draft for review.
