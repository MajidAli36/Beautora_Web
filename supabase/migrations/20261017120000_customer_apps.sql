-- Customer App Management (Beautora client-branded apps)
-- One primary customer app per salon organization; optional extra salon assignments later.

create type public.customer_app_status as enum (
  'not_configured',
  'setup_required',
  'pending_approval',
  'approved',
  'published',
  'suspended',
  'deactivated'
);

create type public.customer_app_feature_state as enum (
  'requested',
  'under_review',
  'changes_requested',
  'approved',
  'configured',
  'published',
  'disabled'
);

create table public.customer_apps (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  slug text not null,
  display_name text not null default '',
  status public.customer_app_status not null default 'setup_required',
  enabled_by uuid references auth.users (id) on delete set null,
  enabled_at timestamptz,
  published_at timestamptz,
  suspended_at timestamptz,
  deactivated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_apps_org_unique unique (organization_id),
  constraint customer_apps_slug_unique unique (slug),
  constraint customer_apps_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create index customer_apps_status_idx on public.customer_apps (status);
create index customer_apps_updated_idx on public.customer_apps (updated_at desc);

create trigger customer_apps_set_updated_at
  before update on public.customer_apps
  for each row execute function public.set_updated_at();

-- Draft vs published settings (customer app reads published only)
create table public.customer_app_configs (
  id uuid primary key default gen_random_uuid(),
  customer_app_id uuid not null references public.customer_apps (id) on delete cascade,
  draft jsonb not null default '{}'::jsonb,
  published jsonb,
  draft_updated_at timestamptz not null default now(),
  draft_updated_by uuid references auth.users (id) on delete set null,
  published_at timestamptz,
  published_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_app_configs_app_unique unique (customer_app_id)
);

create trigger customer_app_configs_set_updated_at
  before update on public.customer_app_configs
  for each row execute function public.set_updated_at();

-- Feature flags + approval state per app
create table public.customer_app_features (
  id uuid primary key default gen_random_uuid(),
  customer_app_id uuid not null references public.customer_apps (id) on delete cascade,
  feature_key text not null,
  state public.customer_app_feature_state not null default 'disabled',
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  requested_by uuid references auth.users (id) on delete set null,
  reviewed_by uuid references auth.users (id) on delete set null,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_app_features_unique unique (customer_app_id, feature_key)
);

create index customer_app_features_app_idx on public.customer_app_features (customer_app_id);

create trigger customer_app_features_set_updated_at
  before update on public.customer_app_features
  for each row execute function public.set_updated_at();

-- Extra salon assignments (primary org always implied via customer_apps.organization_id)
create table public.customer_app_salons (
  id uuid primary key default gen_random_uuid(),
  customer_app_id uuid not null references public.customer_apps (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'suspended', 'removed')),
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  assigned_by uuid references auth.users (id) on delete set null,
  removal_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_app_salons_unique unique (customer_app_id, organization_id)
);

create index customer_app_salons_org_idx on public.customer_app_salons (organization_id);

create trigger customer_app_salons_set_updated_at
  before update on public.customer_app_salons
  for each row execute function public.set_updated_at();

-- Product visibility overrides (optional allow-list; empty = all active products of assigned salons)
create table public.customer_app_product_visibility (
  id uuid primary key default gen_random_uuid(),
  customer_app_id uuid not null references public.customer_apps (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  constraint customer_app_product_vis_unique unique (customer_app_id, product_id)
);

-- Audit for privileged customer-app changes
create table public.customer_app_audit_logs (
  id uuid primary key default gen_random_uuid(),
  customer_app_id uuid not null references public.customer_apps (id) on delete cascade,
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index customer_app_audit_app_idx
  on public.customer_app_audit_logs (customer_app_id, created_at desc);

-- RLS: salon members read their org's app; mutations via service role / server actions
alter table public.customer_apps enable row level security;
alter table public.customer_app_configs enable row level security;
alter table public.customer_app_features enable row level security;
alter table public.customer_app_salons enable row level security;
alter table public.customer_app_product_visibility enable row level security;
alter table public.customer_app_audit_logs enable row level security;

create policy "members_select_customer_apps"
  on public.customer_apps for select to authenticated
  using (public.is_org_member(organization_id));

create policy "members_select_customer_app_configs"
  on public.customer_app_configs for select to authenticated
  using (
    exists (
      select 1 from public.customer_apps a
      where a.id = customer_app_id and public.is_org_member(a.organization_id)
    )
  );

create policy "members_select_customer_app_features"
  on public.customer_app_features for select to authenticated
  using (
    exists (
      select 1 from public.customer_apps a
      where a.id = customer_app_id and public.is_org_member(a.organization_id)
    )
  );

create policy "members_select_customer_app_salons"
  on public.customer_app_salons for select to authenticated
  using (
    public.is_org_member(organization_id)
    or exists (
      select 1 from public.customer_apps a
      where a.id = customer_app_id and public.is_org_member(a.organization_id)
    )
  );

create policy "members_select_customer_app_product_visibility"
  on public.customer_app_product_visibility for select to authenticated
  using (
    exists (
      select 1 from public.customer_apps a
      where a.id = customer_app_id and public.is_org_member(a.organization_id)
    )
  );

create policy "members_select_customer_app_audit"
  on public.customer_app_audit_logs for select to authenticated
  using (
    exists (
      select 1 from public.customer_apps a
      where a.id = customer_app_id and public.is_org_member(a.organization_id)
    )
  );
