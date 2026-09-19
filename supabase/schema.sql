-- Coin Planner: initial schema for multi-user households, invitations and secured budget snapshots.
-- This creates tables from scratch; it does not migrate existing user data.

create extension if not exists pgcrypto;

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  invite_code text not null unique default upper(encode(gen_random_bytes(6), 'hex')),
  budget_data jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid references auth.users(id) on delete set null,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create index household_members_user_id_idx on public.household_members(user_id);
create index households_updated_at_idx on public.households(updated_at desc);

alter table public.households enable row level security;
alter table public.household_members enable row level security;

revoke all on public.households from anon, authenticated;
revoke all on public.household_members from anon, authenticated;
grant select, delete on public.households to authenticated;
grant update (budget_data) on public.households to authenticated;
grant select on public.household_members to authenticated;

create or replace function public.is_household_member(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.household_members
    where household_id = p_household_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_household_owner(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.household_members
    where household_id = p_household_id and user_id = auth.uid() and role = 'owner'
  );
$$;

create policy "Members can read their households"
on public.households for select to authenticated
using (public.is_household_member(id));

create policy "Members can update their households"
on public.households for update to authenticated
using (public.is_household_member(id))
with check (public.is_household_member(id));

create policy "Owners can delete their households"
on public.households for delete to authenticated
using (public.is_household_owner(id));

create policy "Members can see household members"
on public.household_members for select to authenticated
using (public.is_household_member(household_id));

create or replace function public.touch_household()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  new.version = old.version + 1;
  return new;
end;
$$;

create trigger households_touch_before_update
before update on public.households
for each row execute function public.touch_household();

create or replace function public.current_display_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    nullif(auth.jwt() -> 'user_metadata' ->> 'display_name', ''),
    nullif(split_part(auth.jwt() ->> 'email', '@', 1), ''),
    'Участник'
  );
$$;

create or replace function public.create_household(p_name text, p_budget_data jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_household_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Требуется авторизация';
  end if;
  if trim(p_name) = '' then
    raise exception 'Укажите название семьи';
  end if;

  insert into public.households (name, budget_data, created_by, updated_by)
  values (trim(p_name), p_budget_data, auth.uid(), auth.uid())
  returning id into new_household_id;

  insert into public.household_members (household_id, user_id, display_name, role)
  values (new_household_id, auth.uid(), public.current_display_name(), 'owner');

  return new_household_id;
end;
$$;

create or replace function public.join_household(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_household_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Требуется авторизация';
  end if;

  select id into target_household_id
  from public.households
  where invite_code = upper(trim(p_invite_code));

  if target_household_id is null then
    raise exception 'Код приглашения не найден';
  end if;

  insert into public.household_members (household_id, user_id, display_name, role)
  values (target_household_id, auth.uid(), public.current_display_name(), 'member')
  on conflict (household_id, user_id) do nothing;

  return target_household_id;
end;
$$;

revoke all on function public.create_household(text, jsonb) from public, anon;
revoke all on function public.join_household(text) from public, anon;
revoke all on function public.is_household_member(uuid) from public, anon;
revoke all on function public.is_household_owner(uuid) from public, anon;
revoke all on function public.current_display_name() from public, anon;
revoke all on function public.touch_household() from public, anon;
grant execute on function public.create_household(text, jsonb) to authenticated;
grant execute on function public.join_household(text) to authenticated;
grant execute on function public.is_household_member(uuid) to authenticated;
grant execute on function public.is_household_owner(uuid) to authenticated;

alter publication supabase_realtime add table public.households;
alter publication supabase_realtime add table public.household_members;
