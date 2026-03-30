-- Unsubscribe tokens and preferences for public.users (no email in URLs — token only).
alter table public.users
  add column if not exists unsubscribe_token text unique;

alter table public.users
  add column if not exists unsubscribed boolean not null default false;

alter table public.users
  add column if not exists email_preferences jsonb not null default '{}'::jsonb;

comment on column public.users.unsubscribe_token is 'Opaque secret for one-click unsubscribe / preferences (never put email in links).';
comment on column public.users.unsubscribed is 'When true, do not send user-facing emails (transactional + marketing).';
comment on column public.users.email_preferences is 'Optional structured preferences (e.g. events_updates).';

-- Backfill tokens for existing rows (URL-safe, no pgcrypto — uses core gen_random_uuid)
update public.users
set unsubscribe_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
where unsubscribe_token is null;

create index if not exists users_unsubscribe_token_idx on public.users (unsubscribe_token)
  where unsubscribe_token is not null;
