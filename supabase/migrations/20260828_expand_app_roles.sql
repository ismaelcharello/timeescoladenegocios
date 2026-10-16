-- Mantém o banco alinhado com os papéis usados pela autorização server-side.
-- A migração é incremental para instalações que já executaram stage_4.
alter table public.app_roles
  drop constraint if exists app_roles_role_check;

alter table public.app_roles
  add constraint app_roles_role_check
  check (role in ('member', 'support', 'coordinator', 'admin', 'super_admin', 'superadmin));
