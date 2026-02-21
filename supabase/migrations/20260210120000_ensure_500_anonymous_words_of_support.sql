-- Ensure the anonymous €500 donor's words of support are set (actual message from the donor).
UPDATE donations
SET words_of_support = 'I feel so happy to help you guys!'
WHERE amount = 500
  AND is_anonymous = true
  AND (words_of_support IS NULL OR words_of_support != 'I feel so happy to help you guys!');
