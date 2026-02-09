-- Update the anonymous €500 donor message to the new wording.
UPDATE donations
SET words_of_support = 'I feel so happy to help you guys!'
WHERE amount = 500
  AND is_anonymous = true
  AND words_of_support = 'I feel so happy to help you!';
