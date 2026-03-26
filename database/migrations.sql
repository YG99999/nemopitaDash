create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  role text not null default 'manager' check (role in ('owner', 'manager')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists agent_logs (
  id uuid primary key default gen_random_uuid(),
  timestamp timestamptz not null default now(),
  action_type varchar(50),
  status varchar(20),
  data jsonb not null default '{}'::jsonb,
  error_message text,
  webhook_id varchar(100),
  webhook_acknowledged boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists daily_reports (
  id uuid primary key default gen_random_uuid(),
  report_date date not null unique,
  sales_total numeric(10, 2) default 0,
  num_transactions int default 0,
  top_items jsonb not null default '[]'::jsonb,
  reviews_new int default 0,
  reviews_sentiment varchar(20) default 'mixed',
  inventory_status jsonb not null default '[]'::jsonb,
  labor_forecast jsonb not null default '[]'::jsonb,
  food_cost_pct numeric(5, 2) default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists suggestions (
  id uuid primary key default gen_random_uuid(),
  suggestion_type varchar(50) not null,
  content text not null,
  data jsonb not null default '{}'::jsonb,
  approved boolean not null default false,
  approved_at timestamptz,
  approved_by varchar(100),
  dismissed boolean not null default false,
  dismissed_at timestamptz,
  dismissed_by varchar(100),
  executed boolean not null default false,
  executed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  daily_report_time time not null default '23:45',
  low_inventory_threshold int not null default 20,
  review_response_target int not null default 2,
  enabled_alerts jsonb not null default '["inventory","reviews","sales"]'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists audit_trail (
  id uuid primary key default gen_random_uuid(),
  action varchar(200) not null,
  performed_by varchar(100) not null,
  ip_address inet,
  details jsonb not null default '{}'::jsonb,
  timestamp timestamptz not null default now()
);

create index if not exists idx_agent_logs_timestamp on agent_logs(timestamp desc);
create index if not exists idx_suggestions_pending on suggestions(approved, dismissed, executed, created_at desc);
create index if not exists idx_audit_trail_timestamp on audit_trail(timestamp desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'manager')
  )
  on conflict (id) do nothing;

  insert into public.settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table profiles enable row level security;
alter table settings enable row level security;
alter table agent_logs enable row level security;
alter table daily_reports enable row level security;
alter table suggestions enable row level security;
alter table audit_trail enable row level security;

drop policy if exists "users can read profiles" on profiles;
create policy "users can read profiles"
  on profiles for select
  using (auth.uid() = id);

drop policy if exists "users can read own settings" on settings;
create policy "users can read own settings"
  on settings for select
  using (auth.uid() = user_id);

drop policy if exists "users can update own settings" on settings;
create policy "users can update own settings"
  on settings for update
  using (auth.uid() = user_id);

drop policy if exists "authenticated users can read logs" on agent_logs;
create policy "authenticated users can read logs"
  on agent_logs for select
  using (auth.role() = 'authenticated');

drop policy if exists "authenticated users can read reports" on daily_reports;
create policy "authenticated users can read reports"
  on daily_reports for select
  using (auth.role() = 'authenticated');

drop policy if exists "authenticated users can read suggestions" on suggestions;
create policy "authenticated users can read suggestions"
  on suggestions for select
  using (auth.role() = 'authenticated');

drop policy if exists "authenticated users can read audit trail" on audit_trail;
create policy "authenticated users can read audit trail"
  on audit_trail for select
  using (auth.role() = 'authenticated');
