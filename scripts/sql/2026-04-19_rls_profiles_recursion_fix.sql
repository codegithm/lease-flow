-- Patch: Fix RLS recursion errors that surface as 500s on profiles/units/notifications.
-- Safe to run multiple times.

begin;

create or replace function public.current_user_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select pr.company_id
  from public.profiles pr
  where pr.id = auth.uid()
  limit 1;
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select lower(pr.role)
  from public.profiles pr
  where pr.id = auth.uid()
  limit 1;
$$;

grant execute on function public.current_user_company_id() to authenticated;
grant execute on function public.current_user_role() to authenticated;

drop policy if exists profiles_read_same_company on public.profiles;
create policy profiles_read_same_company on public.profiles
for select using (
  auth.uid() = id
  or (
    public.current_user_company_id() is not null
    and public.current_user_company_id() = profiles.company_id
  )
);

drop policy if exists profiles_update_self_or_manager on public.profiles;
create policy profiles_update_self_or_manager on public.profiles
for update using (
  auth.uid() = id
  or (
    public.current_user_company_id() = profiles.company_id
    and public.current_user_role() in ('owner', 'landlord', 'admin', 'property_manager')
  )
)
with check (
  auth.uid() = id
  or (
    public.current_user_company_id() = profiles.company_id
    and public.current_user_role() in ('owner', 'landlord', 'admin', 'property_manager')
  )
);

commit;
