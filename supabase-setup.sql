-- Servelles v0.6 multi-hotel foundation
create extension if not exists pgcrypto;

create table if not exists public.hotels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text,
  slug text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hotel_memberships (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'staff' check (role in ('hotel_admin','manager','department_manager','staff','servelles_admin')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(hotel_id,user_id)
);

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(hotel_id,name)
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  room_number text not null,
  room_name text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(hotel_id,room_number)
);

create or replace function public.my_hotel_ids()
returns setof uuid
language sql stable security definer
set search_path = public
as $$ select hotel_id from public.hotel_memberships where user_id = auth.uid() and active = true; $$;

alter table public.hotels enable row level security;
alter table public.profiles enable row level security;
alter table public.hotel_memberships enable row level security;
alter table public.departments enable row level security;
alter table public.rooms enable row level security;

drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile" on public.profiles for select using (id = auth.uid());
drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "members read their memberships" on public.hotel_memberships;
create policy "members read their memberships" on public.hotel_memberships for select using (user_id = auth.uid());

drop policy if exists "members read their hotels" on public.hotels;
create policy "members read their hotels" on public.hotels for select using (id in (select public.my_hotel_ids()));

drop policy if exists "members read hotel departments" on public.departments;
create policy "members read hotel departments" on public.departments for select using (hotel_id in (select public.my_hotel_ids()));

drop policy if exists "members read hotel rooms" on public.rooms;
create policy "members read hotel rooms" on public.rooms for select using (hotel_id in (select public.my_hotel_ids()));

-- Automatically create a profile whenever an Auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Initial demo hotels. Users are linked after their Auth accounts exist.
insert into public.hotels(name,short_name,slug) values
('Horsham Hotel','Horsham Hotel','horsham-hotel'),
('Balmer Lawn Hotel','Balmer Lawn','balmer-lawn-hotel')
on conflict (slug) do nothing;

insert into public.departments(hotel_id,name)
select h.id,d.name from public.hotels h
cross join (values ('Housekeeping'),('Room Service'),('Engineering'),('Spa'),('Concierge'),('Front Office'),('Duty Manager')) d(name)
where h.slug in ('horsham-hotel','balmer-lawn-hotel')
on conflict (hotel_id,name) do nothing;
