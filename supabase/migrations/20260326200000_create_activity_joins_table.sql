-- Activity join requests submitted via the Join an Activity form
create table if not exists activity_joins (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  activities text[] not null default '{}',
  future_activities text,
  created_at timestamptz not null default now()
);

alter table activity_joins enable row level security;
