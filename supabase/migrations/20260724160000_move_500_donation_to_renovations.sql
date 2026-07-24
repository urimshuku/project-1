/*
  Move the 500 EUR anonymous donation from Workshop Tables to Renovations.

  Renovations already counts this 500 EUR in its current_amount (500 of 14,300),
  so only the donation record is reassigned; Workshop Tables is zeroed out.
  Also tidy the Renovations description (use the proper m² unit).
*/

UPDATE donations d
SET category_id = (SELECT id FROM categories WHERE name = 'Renovations' LIMIT 1)
FROM categories c
WHERE d.category_id = c.id
  AND c.name = 'Workshop Tables';

UPDATE categories
SET current_amount = 0,
    updated_at = now()
WHERE name = 'Workshop Tables';

UPDATE categories
SET description = 'Structural renovations to keep Studio Space open: repairing the roof, replacing windows, insulating the walls, restoring the unused 8 m² area, and rebuilding the bathroom.',
    updated_at = now()
WHERE name = 'Renovations';
