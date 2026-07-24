-- Refresh the anonymous 500 EUR donation date so it shows as donated today.
UPDATE donations
SET created_at = now()
WHERE amount = 500
  AND is_anonymous = true;
