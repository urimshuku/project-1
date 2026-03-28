-- Support continuous vs non-continuous venue booking modes
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS booking_mode text NOT NULL DEFAULT 'non_continuous';

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS continuous_start text;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS continuous_end text;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS per_date_times jsonb;

COMMENT ON COLUMN bookings.booking_mode IS 'continuous | non_continuous';
COMMENT ON COLUMN bookings.continuous_start IS 'ISO local datetime for continuous range start (YYYY-MM-DDTHH:mm)';
COMMENT ON COLUMN bookings.continuous_end IS 'ISO local datetime for continuous range end';
COMMENT ON COLUMN bookings.per_date_times IS 'Optional per-day times for non_continuous: [{ date, startTime, endTime }]';
