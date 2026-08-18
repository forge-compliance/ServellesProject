-- Servelles admin hotel-management extension
-- Run once in Supabase SQL Editor.

alter table public.hotels
  add column if not exists contact_email text,
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists notes text;

alter table public.profiles
  add column if not exists email text;

update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and (p.email is null or p.email <> u.email);

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    new.email
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

create table if not exists public.hotel_whatsapp_connections (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  display_phone_number text,
  verified_name text,
  waba_id text,
  phone_number_id text,
  status text not null default 'not_connected' check (status in ('not_connected','pending','connected','disabled')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(hotel_id)
);

create table if not exists public.hotel_pms_connections (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  provider text not null default 'none' check (provider in ('none','guestline','opera_cloud','opera_5','other')),
  property_id text,
  status text not null default 'not_connected' check (status in ('not_connected','pending','connected','disabled')),
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(hotel_id)
);

alter table public.hotel_whatsapp_connections enable row level security;
alter table public.hotel_pms_connections enable row level security;

drop policy if exists "servelles admins read profiles" on public.profiles;
create policy "servelles admins read profiles"
on public.profiles for select to authenticated
using (public.is_servelles_admin() or id = auth.uid());

drop policy if exists "servelles admins manage whatsapp" on public.hotel_whatsapp_connections;
create policy "servelles admins manage whatsapp"
on public.hotel_whatsapp_connections for all to authenticated
using (public.is_servelles_admin())
with check (public.is_servelles_admin());

drop policy if exists "servelles admins manage pms" on public.hotel_pms_connections;
create policy "servelles admins manage pms"
on public.hotel_pms_connections for all to authenticated
using (public.is_servelles_admin())
with check (public.is_servelles_admin());

-- Hotel members may read their own connection status, but not manage it here.
drop policy if exists "hotel members read whatsapp status" on public.hotel_whatsapp_connections;
create policy "hotel members read whatsapp status"
on public.hotel_whatsapp_connections for select to authenticated
using (hotel_id in (select public.my_hotel_ids()));

drop policy if exists "hotel members read pms status" on public.hotel_pms_connections;
create policy "hotel members read pms status"
on public.hotel_pms_connections for select to authenticated
using (hotel_id in (select public.my_hotel_ids()));
