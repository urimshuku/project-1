-- Set words of support for the anonymous €500 donor.
UPDATE donations
SET words_of_support = 'I feel so happy to help you guys!'
WHERE id = (
  SELECT id FROM donations
  WHERE amount = 500 AND is_anonymous = true
    AND (words_of_support IS NULL OR words_of_support = '')
  ORDER BY created_at DESC
  LIMIT 1
);
