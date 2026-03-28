-- Email lookup indexes to support case-insensitive dedupe checks.
create index if not exists idx_bookings_email_lower on bookings ((lower(email)));
create index if not exists idx_activity_joins_email_lower on activity_joins ((lower(email)));
create index if not exists idx_pending_paysera_email_category_lower on pending_paysera_donations ((lower(email)), category_id);
