/*
  # Studio Space Schema

  1. New Tables
    - `categories`
      - `id` (uuid, primary key)
      - `name` (text, unique) - Category name (e.g., "General", "Insulation")
      - `description` (text) - Description of what funds are used for
      - `target_amount` (numeric) - Funding target in euros
      - `current_amount` (numeric) - Current amount raised
      - `sort_order` (integer) - Display order
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `donations`
      - `id` (uuid, primary key)
      - `category_id` (uuid, foreign key) - Links to categories
      - `donor_name` (text) - Name of donor
      - `amount` (numeric) - Donation amount in euros
      - `is_anonymous` (boolean) - Whether to show donor anonymously
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Public read access for categories and donations (for leaderboards)
    - No direct write access (donations will be created via Edge Function after payment)
*/

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text NOT NULL,
  target_amount numeric NOT NULL DEFAULT 0,
  current_amount numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  donor_name text NOT NULL,
  amount numeric NOT NULL,
  is_anonymous boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view categories"
  ON categories FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can view donations"
  ON donations FOR SELECT
  TO public
  USING (true);

CREATE INDEX IF NOT EXISTS donations_category_id_idx ON donations(category_id);
CREATE INDEX IF NOT EXISTS donations_created_at_idx ON donations(created_at DESC);