-- Increase words_of_support character limit from 120 to 150.
ALTER TABLE donations
  DROP CONSTRAINT IF EXISTS donations_words_of_support_check;

ALTER TABLE donations
  ADD CONSTRAINT donations_words_of_support_check
  CHECK (words_of_support IS NULL OR char_length(words_of_support) <= 150);

COMMENT ON COLUMN donations.words_of_support IS 'Optional message from donor (max 150 chars), shown in Words of Support section.';
