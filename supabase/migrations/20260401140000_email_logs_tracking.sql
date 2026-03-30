-- Sent-email analytics: opens + clicks (tracking_id → Edge track-open / track-click).
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  email_type text NOT NULL DEFAULT 'unknown',
  tracking_id text,
  opened_at timestamptz,
  clicked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users (id) ON DELETE SET NULL;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS email_type text;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS tracking_id text;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS opened_at timestamptz;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS clicked_at timestamptz;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS created_at timestamptz;

UPDATE public.email_logs SET email_type = 'unknown' WHERE email_type IS NULL;
ALTER TABLE public.email_logs ALTER COLUMN email_type SET DEFAULT 'unknown';
ALTER TABLE public.email_logs ALTER COLUMN email_type SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS email_logs_tracking_id_uidx ON public.email_logs (tracking_id)
  WHERE tracking_id IS NOT NULL;

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.email_logs IS 'Outbound email analytics; inserts from Edge (service role).';
COMMENT ON COLUMN public.email_logs.tracking_id IS 'Opaque id for open pixel and click redirects.';
