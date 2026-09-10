-- Lifetime access: SyncOps can gift a store permanent access (no monthly JazzCash).
-- Admin can enable/disable at any time. admin_disabled_at still force-locks the store.

alter table public.organizations
  add column if not exists lifetime_access boolean not null default false,
  add column if not exists lifetime_access_at timestamptz,
  add column if not exists lifetime_access_by uuid references auth.users (id) on delete set null;

comment on column public.organizations.lifetime_access is
  'When true, store skips monthly subscription (paid lifetime / complimentary). Admin can toggle off.';
comment on column public.organizations.lifetime_access_at is
  'When lifetime access was last enabled.';
comment on column public.organizations.lifetime_access_by is
  'Platform admin user who last enabled lifetime access.';

create index if not exists organizations_lifetime_access_idx
  on public.organizations (lifetime_access)
  where lifetime_access = true;
