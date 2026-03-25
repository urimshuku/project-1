/*
  # Bookings table for venue requests

  Stores incoming venue booking requests from the booking API.
*/

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dates text[] NOT NULL CHECK (cardinality(dates) > 0),
  start_time text NOT NULL,
  end_time text NOT NULL,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  activity_type text NOT NULL,
  group_size integer NOT NULL CHECK (group_size > 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bookings_created_at_idx ON bookings(created_at DESC);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
