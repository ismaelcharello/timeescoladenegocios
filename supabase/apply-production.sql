-- TIME Escola de Negócios — setup do Supabase de produção (idempotente).
-- Rode UMA vez no SQL Editor do projeto. Pode ser repetido sem quebrar.
-- Ordem: perfis -> diretório -> papéis -> diretório protegido (service_role).
-- O diretório protegido exige SUPABASE_SERVICE_ROLE_KEY configurada no Cloudflare.

begin;
-- ===== 1. perfis =====
create table if not exists public.member_profiles (
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

create index if not exists member_profiles_company_name_idx on public.member_profiles (company_name);
create index if not exists member_profiles_segment_idx on public.member_profiles (segment);
create index if not exists member_profiles_city_state_idx on public.member_profiles (city, state);
create index if not exists member_profiles_completed_at_idx on public.member_profiles (completed_at) where completed_at is not null;

alter table public.member_profiles enable row level security;
alter table public.member_profiles force row level security;

revoke all on table public.member_profiles from anon;
revoke all on table public.member_profiles from authenticated;
grant select, insert, update on table public.member_profiles to authenticated;

drop policy if exists member_profiles_select_own on public.member_profiles;
create policy member_profiles_select_own
on public.member_profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists member_profiles_insert_own on public.member_profiles;
create policy member_profiles_insert_own
on public.member_profiles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists member_profiles_update_own on public.member_profiles;
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

drop trigger if exists set_member_profile_updated_at on public.member_profiles;
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

drop trigger if exists on_auth_user_created_create_member_profile on auth.users;
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

drop policy if exists member_avatars_select_own on storage.objects;
create policy member_avatars_select_own
on storage.objects
for select
to authenticated
using (
  bucket_id = 'member-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists member_avatars_insert_own on storage.objects;
create policy member_avatars_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'member-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists member_avatars_update_own on storage.objects;
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

drop policy if exists member_avatars_delete_own on storage.objects;
create policy member_avatars_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'member-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- ===== 2. diretório (v1; é substituído pela versão protegida abaixo) =====
alter table public.member_profiles
  add column if not exists is_active boolean not null default true,
  add column if not exists directory_visible boolean not null default true;

create index if not exists member_profiles_directory_idx
  on public.member_profiles (is_active, directory_visible, completed_at)
  where completed_at is not null;

drop policy if exists member_avatars_select_own on storage.objects;

drop policy if exists member_avatars_select_members on storage.objects;
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

-- ===== 3. papéis de aplicação =====
-- Papéis de aplicação são a fonte de autorização administrativa.
-- O e-mail é apenas a identidade de login, nunca uma permissão.
create table if not exists public.app_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_roles_role_check check (role in ('member', 'support', 'coordinator', 'admin', 'super_admin', 'superadmin'))
);

alter table public.app_roles enable row level security;
alter table public.app_roles force row level security;

revoke all on table public.app_roles from anon;
revoke all on table public.app_roles from authenticated;
grant select on table public.app_roles to authenticated;

drop policy if exists app_roles_select_own on public.app_roles;
create policy app_roles_select_own
on public.app_roles
for select
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.set_app_role_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_app_role_updated_at on public.app_roles;
create trigger set_app_role_updated_at
before update on public.app_roles
for each row execute function public.set_app_role_updated_at();

-- Mantém o banco alinhado com os papéis usados pela autorização server-side.
-- A migração é incremental para instalações que já executaram stage_4.
alter table public.app_roles
  drop constraint if exists app_roles_role_check;

alter table public.app_roles
  add constraint app_roles_role_check
  check (role in ('member', 'support', 'coordinator', 'admin', 'super_admin', 'superadmin'));

commit;

-- ===== 4. diretório protegido por service_role =====
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

