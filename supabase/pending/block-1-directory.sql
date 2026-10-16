-- PREPARED ONLY: do not apply automatically. Deploy with the server directory
-- client configured via SUPABASE_SERVICE_ROLE_KEY, after reviewing live grants.
-- D1 membership is checked before any RPC. Authenticated clients keep only their
-- own profile/avatar access. No data or ownership policies are changed.
begin;

-- Regra única no banco para decidir se um perfil pode participar do networking.
-- A lista corresponde a requiredProfileFields em lib/member-profile.ts.
create or replace function public.member_profile_networking_ready(profile public.member_profiles)
returns boolean
language sql
immutable
security invoker
set search_path = ''
as $$
  select
    length(trim(coalesce(profile.full_name, ''))) >= 3
    and length(regexp_replace(coalesce(profile.whatsapp, ''), '\D', '', 'g')) >= 10
    and length(trim(coalesce(profile.city, ''))) >= 2
    and length(trim(coalesce(profile.state, ''))) = 2
    and length(trim(coalesce(profile.job_title, ''))) >= 2
    and length(trim(coalesce(profile.company_name, ''))) >= 2
    and length(trim(coalesce(profile.segment, ''))) >= 2
    and length(trim(coalesce(profile.company_description, ''))) >= 2
    and length(trim(coalesce(profile.services, ''))) >= 2
    and length(trim(coalesce(profile.target_audience, ''))) >= 2
    and length(trim(coalesce(profile.offers, ''))) >= 2
    and length(trim(coalesce(profile.looking_for, ''))) >= 2
    and length(trim(coalesce(profile.desired_referrals, ''))) >= 2;
$$;

revoke all on function public.member_profile_networking_ready(public.member_profiles) from public, anon, authenticated;
grant execute on function public.member_profile_networking_ready(public.member_profiles) to service_role;

-- Perfis legados marcados como concluídos sem os campos essenciais deixam de
-- aparecer assim que esta migration for aplicada.
update public.member_profiles as profile
set completed_at = null
where profile.completed_at is not null
  and not public.member_profile_networking_ready(profile);

drop policy if exists member_avatars_select_members on storage.objects;
drop policy if exists member_avatars_select_own on storage.objects;
create policy member_avatars_select_own on storage.objects for select to authenticated
using (bucket_id = 'member-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

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
  where (select auth.jwt()->>'role') = 'service_role'
    and profile.completed_at is not null
    and public.member_profile_networking_ready(profile)
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
  where (select auth.jwt()->>'role') = 'service_role'
    and profile.user_id = target_user_id
    and profile.completed_at is not null
    and public.member_profile_networking_ready(profile)
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
  where (select auth.jwt()->>'role') = 'service_role'
    and profile.user_id = target_user_id
    and profile.completed_at is not null
    and public.member_profile_networking_ready(profile)
    and profile.is_active
    and profile.directory_visible
  limit 1;
$$;

revoke all on function public.search_member_directory(text, text, text, text) from public, anon, authenticated;
revoke all on function public.get_member_directory_profile(uuid) from public, anon, authenticated;
revoke all on function public.get_member_whatsapp(uuid) from public, anon, authenticated;

grant execute on function public.search_member_directory(text, text, text, text) to service_role;
grant execute on function public.get_member_directory_profile(uuid) to service_role;
grant execute on function public.get_member_whatsapp(uuid) to service_role;

commit;
