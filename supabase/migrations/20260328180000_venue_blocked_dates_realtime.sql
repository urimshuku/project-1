-- Let the booking calendar pick up new blocks without a full reload when Realtime is enabled.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'venue_blocked_dates'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.venue_blocked_dates;
  END IF;
END $$;
