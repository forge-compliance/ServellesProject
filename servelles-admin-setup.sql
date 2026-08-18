-- Servelles platform admin extension
-- Run this once in Supabase SQL Editor after supabase-setup.sql.

create table if not exists public.servelles_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.servelles_admins enable row level security;

create or replace function public.is_servelles_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.servelles_admins
    where user_id = auth.uid()
      and active = true
  );
$$;

revoke all on function public.is_servelles_admin() from public;
grant execute on function public.is_servelles_admin() to authenticated;

drop policy if exists "admins read own admin record" on public.servelles_admins;
create policy "admins read own admin record"
on public.servelles_admins
for select
to authenticated
using (user_id = auth.uid());

-- Platform admins can see all tenant records.
drop policy if exists "servelles admins read all hotels" on public.hotels;
create policy "servelles admins read all hotels"
on public.hotels
for select
to authenticated
using (public.is_servelles_admin());

drop policy if exists "servelles admins manage hotels" on public.hotels;
create policy "servelles admins manage hotels"
on public.hotels
for all
to authenticated
using (public.is_servelles_admin())
with check (public.is_servelles_admin());

drop policy if exists "servelles admins read memberships" on public.hotel_memberships;
create policy "servelles admins read memberships"
on public.hotel_memberships
for select
to authenticated
using (public.is_servelles_admin());

drop policy if exists "servelles admins manage memberships" on public.hotel_memberships;
create policy "servelles admins manage memberships"
on public.hotel_memberships
for all
to authenticated
using (public.is_servelles_admin())
with check (public.is_servelles_admin());

drop policy if exists "servelles admins manage departments" on public.departments;
create policy "servelles admins manage departments"
on public.departments
for all
to authenticated
using (public.is_servelles_admin())
with check (public.is_servelles_admin());

drop policy if exists "servelles admins manage rooms" on public.rooms;
create policy "servelles admins manage rooms"
on public.rooms
for all
to authenticated
using (public.is_servelles_admin())
with check (public.is_servelles_admin());

-- After creating your Auth user, make it a Servelles admin with:
-- insert into public.servelles_admins (user_id)
-- select id from auth.users where email = 'YOUR_EMAIL_HERE'
-- on conflict (user_id) do update set active = true;
