-- Create profiles table linked to auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  camp text,
  level integer default 1,
  xp integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Allow users to select their own profile
create policy "Profiles: select own" on public.profiles
  for select
  using ( auth.uid() = id );

-- Allow users to insert a profile for themselves
create policy "Profiles: insert own" on public.profiles
  for insert
  with check ( auth.uid() = id );

-- Allow users to update their own profile
create policy "Profiles: update own" on public.profiles
  for update
  using ( auth.uid() = id )
  with check ( auth.uid() = id );

-- Trigger to update updated_at
create function public.update_profiles_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at
  before update on public.profiles
  for each row
  execute procedure public.update_profiles_updated_at();

-- Optional: create profile automatically when a user is created
create function public.handle_user_created()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name, created_at)
  values (new.id, new.email, now())
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Attach trigger to auth.users (Supabase recommends creating a trigger on auth.users)

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_user_created();
