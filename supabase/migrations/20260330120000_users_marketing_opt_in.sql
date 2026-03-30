-- Contact emails with marketing consent (newsletter opt-in from public forms).
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_email_unique unique (email)
);

alter table public.users enable row level security;

-- No anon access; Edge Functions use service role only.
comment on table public.users is 'Marketing/contact records keyed by email from bookings, joins, and donations.';
comment on column public.users.marketing_opt_in is 'Newsletter / studio updates opt-in from forms; default false.';
