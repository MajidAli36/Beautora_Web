-- Per-role action permissions (create/edit/delete/approve…) inside visible features.
-- Complements organizations.nav_permissions (feature visibility).

alter table public.organizations
  add column if not exists action_permissions jsonb not null default '{}'::jsonb;

comment on column public.organizations.action_permissions is
  'Sparse overrides: { "CASHIER": { "sales.void": false, "products.create": true } }. Merged over role defaults.';
