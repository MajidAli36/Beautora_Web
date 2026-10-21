-- Salon-owned loyalty rules, leaderboard, product visibility helpers, TikTok-style reels

create table public.customer_app_loyalty_rules (
  customer_app_id uuid primary key references public.customer_apps (id) on delete cascade,
  enabled boolean not null default false,
  points_per_currency numeric(12, 4) not null default 1
    check (points_per_currency >= 0),
  points_per_completed_booking integer not null default 10
    check (points_per_completed_booking >= 0),
  points_per_product_purchase integer not null default 5
    check (points_per_product_purchase >= 0),
  welcome_bonus_points integer not null default 0
    check (welcome_bonus_points >= 0),
  redeem_points_per_currency numeric(12, 4) not null default 100
    check (redeem_points_per_currency > 0),
  min_redeem_points integer not null default 100
    check (min_redeem_points >= 0),
  expiry_days integer
    check (expiry_days is null or expiry_days > 0),
  show_on_customer_app boolean not null default true,
  rules_note text not null default '',
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger customer_app_loyalty_rules_set_updated_at
  before update on public.customer_app_loyalty_rules
  for each row execute function public.set_updated_at();

-- Idempotent ledger (phone-scoped until full customer auth exists)
create table public.customer_app_loyalty_ledger (
  id uuid primary key default gen_random_uuid(),
  customer_app_id uuid not null references public.customer_apps (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_phone text not null,
  customer_id uuid references public.customers (id) on delete set null,
  delta_points integer not null,
  balance_after integer not null,
  reason text not null,
  reference_type text,
  reference_id text,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  constraint customer_app_loyalty_ledger_idem unique (customer_app_id, idempotency_key)
);

create index customer_app_loyalty_ledger_phone_idx
  on public.customer_app_loyalty_ledger (customer_app_id, customer_phone, created_at desc);

create table public.customer_app_leaderboard_rules (
  customer_app_id uuid primary key references public.customer_apps (id) on delete cascade,
  enabled boolean not null default false,
  title text not null default 'Top clients',
  metric text not null default 'points'
    check (metric in ('points', 'bookings', 'spend')),
  window_days integer not null default 30
    check (window_days between 1 and 365),
  top_n integer not null default 10
    check (top_n between 3 and 50),
  show_display_name boolean not null default true,
  show_on_customer_app boolean not null default true,
  rules_note text not null default '',
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger customer_app_leaderboard_rules_set_updated_at
  before update on public.customer_app_leaderboard_rules
  for each row execute function public.set_updated_at();

-- TikTok-style vertical reels for the customer app (salon-owned, not marketplace)
create table public.customer_app_reels (
  id uuid primary key default gen_random_uuid(),
  customer_app_id uuid not null references public.customer_apps (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null default '',
  caption text not null default '',
  video_url text not null,
  poster_url text,
  product_id uuid references public.products (id) on delete set null,
  service_id uuid references public.services (id) on delete set null,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customer_app_reels_app_pub_idx
  on public.customer_app_reels (customer_app_id, is_published, sort_order, created_at desc);

create trigger customer_app_reels_set_updated_at
  before update on public.customer_app_reels
  for each row execute function public.set_updated_at();

alter table public.customer_app_loyalty_rules enable row level security;
alter table public.customer_app_loyalty_ledger enable row level security;
alter table public.customer_app_leaderboard_rules enable row level security;
alter table public.customer_app_reels enable row level security;

create policy "members_select_loyalty_rules"
  on public.customer_app_loyalty_rules for select to authenticated
  using (
    exists (
      select 1 from public.customer_apps a
      where a.id = customer_app_id and public.is_org_member(a.organization_id)
    )
  );

create policy "members_select_leaderboard_rules"
  on public.customer_app_leaderboard_rules for select to authenticated
  using (
    exists (
      select 1 from public.customer_apps a
      where a.id = customer_app_id and public.is_org_member(a.organization_id)
    )
  );

create policy "members_select_app_reels"
  on public.customer_app_reels for select to authenticated
  using (public.is_org_member(organization_id));

create policy "members_select_loyalty_ledger"
  on public.customer_app_loyalty_ledger for select to authenticated
  using (public.is_org_member(organization_id));
