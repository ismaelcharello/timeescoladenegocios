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

create trigger set_app_role_updated_at
before update on public.app_roles
for each row execute function public.set_app_role_updated_at();
