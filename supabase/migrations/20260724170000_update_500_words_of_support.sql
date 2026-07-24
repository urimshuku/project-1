-- Update the anonymous 500 EUR donor's words of support to the new message.
UPDATE donations
SET words_of_support = 'Seeing how much dedication goes into this place, I''m glad to contribute!'
WHERE amount = 500
  AND is_anonymous = true;
