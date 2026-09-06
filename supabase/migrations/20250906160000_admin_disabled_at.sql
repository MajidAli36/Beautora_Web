-- Force-disable flag for platform admin (overrides trial/paid dates).
alter table public.organizations
  add column if not exists admin_disabled_at timestamptz;

comment on column public.organizations.admin_disabled_at is
  'When set by Beautora platform admin, store is locked regardless of subscription dates.';
