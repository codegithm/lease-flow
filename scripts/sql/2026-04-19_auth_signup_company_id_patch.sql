-- Patch: Enforce company ID verification on auth signup,
-- while still supporting new company creation when companyName is provided.
-- Safe to run multiple times.

begin;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  target_role text := lower(coalesce(metadata ->> 'role', 'tenant'));
  target_role_id integer;
  target_company_id_text text := nullif(trim(coalesce(metadata ->> 'companyId', metadata ->> 'company_id', '')), '');
  target_company_name text := nullif(trim(coalesce(metadata ->> 'companyName', '')), '');
  target_company_address text := nullif(trim(coalesce(metadata ->> 'companyLocation', metadata ->> 'companyAddress', metadata ->> 'company_address', '')), '');
  target_country_code text := upper(coalesce(metadata ->> 'countryCode', 'ZA'));
  target_company_id uuid;
begin
  target_role_id := (
    select id
    from public.roles
    where lower(name) = target_role
    limit 1
  );

  if target_company_id_text is not null then
    begin
      target_company_id := target_company_id_text::uuid;
    exception when others then
      raise exception 'Invalid company ID format: %', target_company_id_text;
    end;

    perform 1
    from public.companies
    where id = target_company_id;

    if not found then
      raise exception 'Company ID % does not exist', target_company_id_text;
    end if;
  elsif target_company_name is not null then
    if target_company_address is null then
      raise exception 'Company location is required when creating a new company';
    end if;

    target_company_id := (
      select id
      from public.companies
      where lower(name) = lower(target_company_name)
      limit 1
    );

    if target_company_id is null then
      insert into public.companies (name, address, country_code)
      values (target_company_name, target_company_address, target_country_code)
      returning id into target_company_id;
    end if;
  end if;

  insert into public.profiles (
    id,
    email,
    full_name,
    cell_number,
    role_id,
    role,
    company_id,
    status
  )
  values (
    new.id,
    new.email,
    coalesce(metadata ->> 'fullName', metadata ->> 'name', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(metadata ->> 'cellNumber', metadata ->> 'phone'),
    target_role_id,
    target_role,
    target_company_id,
    lower(coalesce(metadata ->> 'status', 'active'))
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = excluded.full_name,
      cell_number = excluded.cell_number,
      role_id = excluded.role_id,
      role = excluded.role,
      company_id = excluded.company_id,
      status = excluded.status,
      updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

commit;
