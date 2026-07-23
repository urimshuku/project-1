/**
 * Forwards Paysera's server callback (GET with `data` + `ss1` query params)
 * to the Supabase Edge Function that validates and records the payment.
 *
 * Paysera requires the callback URL to be on a domain verified in the
 * project (payments.studiospace.community); Supabase's own domain cannot
 * be verified, hence this proxy.
 */
const UPSTREAM =
  process.env.UPSTREAM_CALLBACK_URL ||
  'https://qqlrhqekqcoivarkzkua.supabase.co/functions/v1/paysera-callback';

export default async function handler(req, res) {
  try {
    const target = new URL(UPSTREAM);
    for (const [key, value] of Object.entries(req.query)) {
      target.searchParams.set(key, Array.isArray(value) ? value[0] : value);
    }
    const upstream = await fetch(target.toString(), { method: 'GET' });
    const body = await upstream.text();
    res.status(upstream.status).setHeader('Content-Type', 'text/plain').send(body);
  } catch (err) {
    console.error('paysera-callback proxy error:', err);
    // Do NOT return "OK" on failure — Paysera should retry so the payment
    // is not lost if Supabase was briefly unreachable.
    res.status(502).setHeader('Content-Type', 'text/plain').send('Proxy error');
  }
}
