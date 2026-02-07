/*
  # Mark the €500 donation as anonymous

  So the donor shows as "Anonymous" in the donors list.
*/

UPDATE donations
SET is_anonymous = true
WHERE amount = 500;
