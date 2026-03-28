-- Admin approval tokens + public calendar blocks for approved venue bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS approval_token uuid UNIQUE;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

UPDATE bookings
SET approval_token = gen_random_uuid()
WHERE approval_token IS NULL;

ALTER TABLE bookings
  ALTER COLUMN approval_token SET NOT NULL;

CREATE TABLE IF NOT EXISTS venue_blocked_dates (
  blocked_date date PRIMARY KEY,
  booking_id uuid NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS venue_blocked_dates_booking_id_idx ON venue_blocked_dates (booking_id);

ALTER TABLE venue_blocked_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY venue_blocked_dates_select_public
  ON venue_blocked_dates
  FOR SELECT
  TO anon, authenticated
  USING (true);

COMMENT ON TABLE venue_blocked_dates IS 'Dates unavailable on the public booking calendar after admin approves a request';
COMMENT ON COLUMN bookings.approval_token IS 'Secret token for one-click approve link in admin email';
COMMENT ON COLUMN bookings.approved_at IS 'When admin approved; corresponding dates are in venue_blocked_dates';
