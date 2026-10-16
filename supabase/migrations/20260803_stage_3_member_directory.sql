alter table public.member_profiles
  add column is_active boolean not null default true,
  add column directory_visible boolean not null default true;

create index member_profiles_directory_idx
  on public.member_profiles (is_active, directory_visible, completed_at)
  where completed_at is not null;

drop policy if exists member_avatars_select_own on storage.objects;

create policy member_avatars_select_members
on storage.objects
for select
to authenticated
using (bucket_id = 'member-avatars');

create or replace function public.search_member_directory(
  search_term text default null,
  segment_filter text default null,
  city_filter text default null,
  service_filter text default null
)
returns table (
  user_id uuid,
  full_name text,
  avatar_path text,
  job_title text,
  company_name text,
  segment text,
  city text,
  state text,
  company_description text,
  services text,
  offers text,
  service_area text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    profile.user_id,
    profile.full_name,
    profile.avatar_path,
    profile.job_title,
    profile.company_name,
    profile.segment,
    profile.city,
    profile.state,
    profile.company_description,
    profile.services,
    profile.offers,
    profile.service_area
  from public.member_profiles as profile
  where auth.uid() is not null
    and profile.completed_at is not null
    and profile.is_active
    and profile.directory_visible
    and (
      nullif(trim(search_term), '') is null
      or concat_ws(' ',
        profile.full_name,
        profile.company_name,
        profile.job_title,
        profile.segment,
        profile.company_description,
        profile.products,
        profile.services,
        profile.offers,
        profile.how_can_help,
        profile.target_audience,
        profile.service_area
      ) ilike '%' || trim(search_term) || '%'
    )
    and (nullif(trim(segment_filter), '') is null or profile.segment = trim(segment_filter))
    and (nullif(trim(city_filter), '') is null or profile.city = trim(city_filter))
    and (
      nullif(trim(service_filter), '') is null
      or concat_ws(' ', profile.services, profile.products, profile.offers, profile.how_can_help)
        ilike '%' || trim(service_filter) || '%'
    )
  order by profile.profile_completeness desc, profile.full_name asc
  limit 100;
$$;

create or replace function public.get_member_directory_profile(target_user_id uuid)
returns table (
  user_id uuid,
  full_name text,
  avatar_path text,
  job_title text,
  company_name text,
  segment text,
  city text,
  state text,
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
  desired_partnerships text,
  website_url text,
  instagram_url text,
  linkedin_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    profile.user_id,
    profile.full_name,
    profile.avatar_path,
    profile.job_title,
    profile.company_name,
    profile.segment,
    profile.city,
    profile.state,
    profile.company_description,
    profile.products,
    profile.services,
    profile.target_audience,
    profile.service_area,
    profile.differentiators,
    profile.regions_served,
    profile.offers,
    profile.how_can_help,
    profile.looking_for,
    profile.desired_professionals,
    profile.desired_referrals,
    profile.desired_partnerships,
    profile.website_url,
    profile.instagram_url,
    profile.linkedin_url
  from public.member_profiles as profile
  where auth.uid() is not null
    and profile.user_id = target_user_id
    and profile.completed_at is not null
    and profile.is_active
    and profile.directory_visible
  limit 1;
$$;

create or replace function public.get_member_whatsapp(target_user_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select profile.whatsapp
  from public.member_profiles as profile
  where auth.uid() is not null
    and profile.user_id = target_user_id
    and profile.completed_at is not null
    and profile.is_active
    and profile.directory_visible
  limit 1;
$$;

revoke all on function public.search_member_directory(text, text, text, text) from public, anon;
revoke all on function public.get_member_directory_profile(uuid) from public, anon;
revoke all on function public.get_member_whatsapp(uuid) from public, anon;

grant execute on function public.search_member_directory(text, text, text, text) to authenticated;
grant execute on function public.get_member_directory_profile(uuid) to authenticated;
grant execute on function public.get_member_whatsapp(uuid) to authenticated;
