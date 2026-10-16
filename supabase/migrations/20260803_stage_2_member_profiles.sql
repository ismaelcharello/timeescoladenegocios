create table public.member_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_path text,
  whatsapp text,
  city text,
  state text,
  job_title text,
  company_name text,
  segment text,
  website_url text,
  instagram_url text,
  linkedin_url text,
  company_description text,
  products text,
  services text,
  target_audience text,
  service_area text,
  differentiators text,
  regions_served text,
  offers text,
  how_can_help text,
  looking_for text,
  desired_professionals text,
  desired_referrals text,
  company_problems text,
  desired_partnerships text,
  onboarding_step smallint not null default 1,
  profile_completeness smallint not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_profiles_onboarding_step_check check (onboarding_step between 1 and 5),
  constraint member_profiles_completeness_check check (profile_completeness between 0 and 100),
  constraint member_profiles_state_check check (state is null or state ~ '^[A-Z]{2}$'),
  constraint member_profiles_full_name_length_check check (full_name is null or char_length(full_name) <= 160)
);

create index member_profiles_company_name_idx on public.member_profiles (company_name);
create index member_profiles_segment_idx on public.member_profiles (segment);
create index member_profiles_city_state_idx on public.member_profiles (city, state);
create index member_profiles_completed_at_idx on public.member_profiles (completed_at) where completed_at is not null;

alter table public.member_profiles enable row level security;
alter table public.member_profiles force row level security;

revoke all on table public.member_profiles from anon;
revoke all on table public.member_profiles from authenticated;
grant select, insert, update on table public.member_profiles to authenticated;

create policy member_profiles_select_own
on public.member_profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy member_profiles_insert_own
on public.member_profiles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy member_profiles_update_own
on public.member_profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create or replace function public.set_member_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_member_profile_updated_at
before update on public.member_profiles
for each row execute function public.set_member_profile_updated_at();

create or replace function public.handle_new_member_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.member_profiles (user_id, full_name)
  values (new.id, nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_member_profile() from public, anon, authenticated;

create trigger on_auth_user_created_create_member_profile
after insert on auth.users
for each row execute function public.handle_new_member_profile();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'member-avatars',
  'member-avatars',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy member_avatars_select_own
on storage.objects
for select
to authenticated
using (
  bucket_id = 'member-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy member_avatars_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'member-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy member_avatars_update_own
on storage.objects
for update
to authenticated
using (
  bucket_id = 'member-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'member-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy member_avatars_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'member-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
