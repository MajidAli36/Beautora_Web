-- Customer App domain separation: app customers, catalog, deals, point types, leaderboard tiers,
-- appointment attribution (CUSTOMER_APP) — no second booking engine.

-- ===== Appointments: app attribution =====
do $$ begin
  alter type public.appointment_source add value if not exists 'CUSTOMER_APP';
exception
  when duplicate_object then null;
end $$;

alter table public.appointments
  add column if not exists customer_app_id uuid references public.customer_apps (id) on delete set null;

alter table public.appointments
  add column if not exists app_customer_id uuid;

create index if not exists appointments_customer_app_idx
  on public.appointments (customer_app_id, scheduled_at desc)
  where customer_app_id is not null;

-- ===== App customers (separate from salon CRM; optional link) =====
create table if not exists public.customer_app_customers (
  id uuid primary key default gen_random_uuid(),
  customer_app_id uuid not null references public.customer_apps (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  phone text not null,
  email text,
  salon_customer_id uuid references public.customers (id) on delete set null,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_app_customers_phone_unique unique (customer_app_id, phone)
);

create index if not exists customer_app_customers_app_idx
  on public.customer_app_customers (customer_app_id, created_at desc);

create trigger customer_app_customers_set_updated_at
  before update on public.customer_app_customers
  for each row execute function public.set_updated_at();

-- FK for appointments.app_customer_id (added after table exists)
do $$ begin
  alter table public.appointments
    add constraint appointments_app_customer_id_fkey
    foreign key (app_customer_id) references public.customer_app_customers (id) on delete set null;
exception
  when duplicate_object then null;
end $$;

-- ===== App product catalog (never marketplace) =====
create table if not exists public.customer_app_products (
  id uuid primary key default gen_random_uuid(),
  customer_app_id uuid not null references public.customer_apps (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  description text not null default '',
  price numeric(12, 2) not null default 0 check (price >= 0),
  image_url text,
  pos_product_id uuid references public.products (id) on delete set null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_app_products_app_idx
  on public.customer_app_products (customer_app_id, is_active, sort_order);

create trigger customer_app_products_set_updated_at
  before update on public.customer_app_products
  for each row execute function public.set_updated_at();

-- ===== App deals =====
create table if not exists public.customer_app_deals (
  id uuid primary key default gen_random_uuid(),
  customer_app_id uuid not null references public.customer_apps (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  description text not null default '',
  discount_percent numeric(5, 2) check (discount_percent is null or (discount_percent >= 0 and discount_percent <= 100)),
  discount_amount numeric(12, 2) check (discount_amount is null or discount_amount >= 0),
  image_url text,
  starts_at timestamptz,
  ends_at timestamptz,
  app_product_id uuid references public.customer_app_products (id) on delete set null,
  service_id uuid references public.services (id) on delete set null,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_app_deals_app_pub_idx
  on public.customer_app_deals (customer_app_id, is_published, sort_order);

create trigger customer_app_deals_set_updated_at
  before update on public.customer_app_deals
  for each row execute function public.set_updated_at();

-- ===== Flexible point types (CRUD) =====
create table if not exists public.customer_app_point_types (
  id uuid primary key default gen_random_uuid(),
  customer_app_id uuid not null references public.customer_apps (id) on delete cascade,
  code text not null,
  name text not null,
  description text not null default '',
  icon text not null default 'star',
  color text not null default '#0F766E',
  earn_hint text not null default '',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_app_point_types_code_unique unique (customer_app_id, code)
);

create trigger customer_app_point_types_set_updated_at
  before update on public.customer_app_point_types
  for each row execute function public.set_updated_at();

-- Extend ledger with point_type_id
alter table public.customer_app_loyalty_ledger
  add column if not exists point_type_id uuid references public.customer_app_point_types (id) on delete set null;

alter table public.customer_app_loyalty_ledger
  add column if not exists app_customer_id uuid references public.customer_app_customers (id) on delete set null;

create index if not exists customer_app_loyalty_ledger_type_idx
  on public.customer_app_loyalty_ledger (customer_app_id, point_type_id, created_at desc);

-- Seed default "Visit points" for each existing app
insert into public.customer_app_point_types (customer_app_id, code, name, description, earn_hint, sort_order)
select
  a.id,
  'visit',
  'Visit points',
  'Default points from bookings and purchases',
  'Earn on completed bookings and product purchases',
  0
from public.customer_apps a
where not exists (
  select 1 from public.customer_app_point_types t
  where t.customer_app_id = a.id and t.code = 'visit'
);

-- ===== Leaderboard reward tiers (1st / 2nd / 3rd …) =====
create table if not exists public.customer_app_leaderboard_tiers (
  id uuid primary key default gen_random_uuid(),
  customer_app_id uuid not null references public.customer_apps (id) on delete cascade,
  rank integer not null check (rank >= 1 and rank <= 100),
  title text not null default '',
  description text not null default '',
  reward_kind text not null default 'custom'
    check (reward_kind in ('service', 'product', 'custom')),
  reward_image_url text,
  service_id uuid references public.services (id) on delete set null,
  app_product_id uuid references public.customer_app_products (id) on delete set null,
  custom_reward_label text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_app_leaderboard_tiers_rank_unique unique (customer_app_id, rank)
);

create trigger customer_app_leaderboard_tiers_set_updated_at
  before update on public.customer_app_leaderboard_tiers
  for each row execute function public.set_updated_at();

-- Default 1st / 2nd / 3rd tiers for existing apps
insert into public.customer_app_leaderboard_tiers (customer_app_id, rank, title, description, reward_kind, custom_reward_label)
select a.id, v.rank, v.title, v.description, 'custom', v.label
from public.customer_apps a
cross join (values
  (1, '1st place', 'Top ranked client this period', 'Champion reward'),
  (2, '2nd place', 'Runner-up reward', 'Silver reward'),
  (3, '3rd place', 'Third place reward', 'Bronze reward')
) as v(rank, title, description, label)
where not exists (
  select 1 from public.customer_app_leaderboard_tiers t
  where t.customer_app_id = a.id and t.rank = v.rank
);

-- ===== RLS =====
alter table public.customer_app_customers enable row level security;
alter table public.customer_app_products enable row level security;
alter table public.customer_app_deals enable row level security;
alter table public.customer_app_point_types enable row level security;
alter table public.customer_app_leaderboard_tiers enable row level security;

create policy "members_select_app_customers"
  on public.customer_app_customers for select to authenticated
  using (public.is_org_member(organization_id));

create policy "members_select_app_products"
  on public.customer_app_products for select to authenticated
  using (public.is_org_member(organization_id));

create policy "members_select_app_deals"
  on public.customer_app_deals for select to authenticated
  using (public.is_org_member(organization_id));

create policy "members_select_point_types"
  on public.customer_app_point_types for select to authenticated
  using (
    exists (
      select 1 from public.customer_apps a
      where a.id = customer_app_id and public.is_org_member(a.organization_id)
    )
  );

create policy "members_select_leaderboard_tiers"
  on public.customer_app_leaderboard_tiers for select to authenticated
  using (
    exists (
      select 1 from public.customer_apps a
      where a.id = customer_app_id and public.is_org_member(a.organization_id)
    )
  );
