-- Add optional "words of support" to donations (max 120 chars, set from payment form).
-- If you use a Stripe webhook to insert donations, read session.metadata.words_of_support and insert it here.
ALTER TABLE donations
  ADD COLUMN IF NOT EXISTS words_of_support text CHECK (char_length(words_of_support) <= 120);

COMMENT ON COLUMN donations.words_of_support IS 'Optional message from donor (max 120 chars), shown in Words of support section.';
