/*
  Archive all cause categories and consolidate fundraising under one category.

  - Add categories.archived (new column); archived categories are hidden from the site.
  - Archive: Workshop Tables, Insulation, Garden, Kitchen, Essentials (and legacy A/C).
  - Rename General Donations -> Renovations with a 14,300 EUR goal, 500 EUR raised,
    and a visible progress bar. The row id is preserved so existing donations,
    pending payments, and share links keep working.
*/

ALTER TABLE categories ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

UPDATE categories
SET archived = true,
    updated_at = now()
WHERE name IN ('Workshop Tables', 'Insulation', 'Garden', 'Kitchen', 'Essentials', 'A/C');

UPDATE categories
SET name = 'Renovations',
    description = 'Structural renovations to keep Studio Space open: repairing the roof, replacing windows, insulating the walls, restoring the unused 8 m2 area, and rebuilding the bathroom.',
    target_amount = 14300,
    current_amount = 500,
    has_progress_bar = true,
    sort_order = 0,
    archived = false,
    updated_at = now()
WHERE name = 'General Donations';
