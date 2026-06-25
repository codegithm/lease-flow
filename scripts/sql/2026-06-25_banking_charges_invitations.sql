-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Banking details, Charge configs, and User invitations
-- Date: 2026-06-25
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Company banking details (one per company, unique account number across companies) ──
create table if not exists public.company_banking_details (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,
  bank_name text not null,
  account_holder text not null,
  account_number text not null,
  branch_code text,
  branch_name text,
  account_type text not null default 'Current',
  swift_code text,
  vat_number text,
  registration_number text,
  contact_email text,
  contact_phone text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  -- Prevent two companies from sharing the same bank account
  constraint company_banking_details_account_unique unique (account_number)
);

drop trigger if exists company_banking_details_set_updated_at on public.company_banking_details;
create trigger company_banking_details_set_updated_at
before update on public.company_banking_details
for each row execute procedure public.set_updated_at();

alter table public.company_banking_details enable row level security;

drop policy if exists company_banking_details_read on public.company_banking_details;
create policy company_banking_details_read on public.company_banking_details
for select using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = company_banking_details.company_id
  )
);

drop policy if exists company_banking_details_manage on public.company_banking_details;
create policy company_banking_details_manage on public.company_banking_details
for all using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = company_banking_details.company_id
      and lower(p.role) in ('owner', 'admin', 'landlord', 'property_manager')
  )
) with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = company_banking_details.company_id
      and lower(p.role) in ('owner', 'admin', 'landlord', 'property_manager')
  )
);

-- ── Company charge configurations (recurring/optional charges per company) ──
create table if not exists public.company_charge_configs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  charge_type text not null,
  name text not null,
  description text,
  amount numeric(12,2) not null default 0,
  is_enabled boolean not null default true,
  is_fixed boolean not null default false,
  tax_rate numeric(5,2) not null default 0,
  display_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (company_id, charge_type)
);

drop trigger if exists company_charge_configs_set_updated_at on public.company_charge_configs;
create trigger company_charge_configs_set_updated_at
before update on public.company_charge_configs
for each row execute procedure public.set_updated_at();

alter table public.company_charge_configs enable row level security;

drop policy if exists company_charge_configs_read on public.company_charge_configs;
create policy company_charge_configs_read on public.company_charge_configs
for select using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = company_charge_configs.company_id
  )
);

drop policy if exists company_charge_configs_manage on public.company_charge_configs;
create policy company_charge_configs_manage on public.company_charge_configs
for all using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = company_charge_configs.company_id
      and lower(p.role) in ('owner', 'admin', 'landlord', 'property_manager')
  )
) with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = company_charge_configs.company_id
      and lower(p.role) in ('owner', 'admin', 'landlord', 'property_manager')
  )
);

-- ── User invitations ──
create table if not exists public.user_invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null,
  role text not null default 'agent',
  invited_by_user_id uuid references public.profiles(id) on delete set null,
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  status text not null default 'pending',
  expires_at timestamptz not null default (timezone('utc', now()) + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (company_id, email)
);

alter table public.user_invitations enable row level security;

drop policy if exists user_invitations_read on public.user_invitations;
create policy user_invitations_read on public.user_invitations
for select using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = user_invitations.company_id
  )
);

drop policy if exists user_invitations_manage on public.user_invitations;
create policy user_invitations_manage on public.user_invitations
for all using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = user_invitations.company_id
      and lower(p.role) in ('owner', 'admin', 'landlord', 'property_manager')
  )
) with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = user_invitations.company_id
      and lower(p.role) in ('owner', 'admin', 'landlord', 'property_manager')
  )
);

-- ── Bulk migration records (track imported tenants) ──
create table if not exists public.bulk_migrations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  file_name text not null,
  status text not null default 'processing',
  total_rows integer not null default 0,
  processed_rows integer not null default 0,
  failed_rows integer not null default 0,
  errors text,
  created_by_user_id uuid references public.profiles(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.bulk_migrations enable row level security;

drop policy if exists bulk_migrations_policy on public.bulk_migrations;
create policy bulk_migrations_policy on public.bulk_migrations
for all using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = bulk_migrations.company_id
  )
) with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.company_id = bulk_migrations.company_id
  )
);
