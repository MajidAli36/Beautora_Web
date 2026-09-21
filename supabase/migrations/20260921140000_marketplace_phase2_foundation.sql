-- Phase 2: Beautora Marketplace foundation (additive, free launch)
-- listing_fee = 0, default_commission = 0; architecture ready to monetize later.

-- ---------------------------------------------------------------------------
-- Org: enable marketplace storefront on existing salon profiles
-- ---------------------------------------------------------------------------
alter table public.organizations
  add column if not exists marketplace_store_enabled boolean not null default false;

alter table public.organizations
  add column if not exists marketplace_store_published_at timestamptz;

-- ---------------------------------------------------------------------------
-- Global marketplace settings (single-row config)
-- ---------------------------------------------------------------------------
create table if not exists public.marketplace_settings (
  id int primary key default 1 check (id = 1),
  listing_fee numeric(12,2) not null default 0 check (listing_fee >= 0),
  default_commission_rate numeric(5,4) not null default 0 check (default_commission_rate >= 0 and default_commission_rate <= 1),
  featured_listing_price numeric(12,2) not null default 0 check (featured_listing_price >= 0),
  advertising_price numeric(12,2) not null default 0 check (advertising_price >= 0),
  online_payments_enabled boolean not null default false,
  marketplace_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

insert into public.marketplace_settings (id, listing_fee, default_commission_rate)
values (1, 0, 0)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Commission rules (priority: product > seller > category > global)
-- ---------------------------------------------------------------------------
create table if not exists public.marketplace_commission_rules (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('global', 'category', 'seller', 'product')),
  category_id uuid references public.marketplace_categories(id) on delete cascade,
  seller_id uuid references public.marketplace_sellers(id) on delete cascade,
  product_id uuid references public.marketplace_products(id) on delete cascade,
  rate numeric(5,4) not null check (rate >= 0 and rate <= 1),
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketplace_commission_rules_scope_fk check (
    (scope = 'global' and category_id is null and seller_id is null and product_id is null)
    or (scope = 'category' and category_id is not null and seller_id is null and product_id is null)
    or (scope = 'seller' and seller_id is not null and category_id is null and product_id is null)
    or (scope = 'product' and product_id is not null and category_id is null and seller_id is null)
  )
);

create unique index if not exists marketplace_commission_rules_global_uidx
  on public.marketplace_commission_rules ((scope))
  where scope = 'global' and is_active;

create unique index if not exists marketplace_commission_rules_category_uidx
  on public.marketplace_commission_rules (category_id)
  where scope = 'category' and is_active;

create unique index if not exists marketplace_commission_rules_seller_uidx
  on public.marketplace_commission_rules (seller_id)
  where scope = 'seller' and is_active;

create unique index if not exists marketplace_commission_rules_product_uidx
  on public.marketplace_commission_rules (product_id)
  where scope = 'product' and is_active;

-- ---------------------------------------------------------------------------
-- Brands
-- ---------------------------------------------------------------------------
create table if not exists public.marketplace_brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Categories: taxonomy extras
-- ---------------------------------------------------------------------------
alter table public.marketplace_categories
  add column if not exists parent_id uuid references public.marketplace_categories(id) on delete set null;

alter table public.marketplace_categories
  add column if not exists kind text not null default 'product'
    check (kind in ('product', 'service', 'both'));

alter table public.marketplace_categories
  add column if not exists image_url text;

-- ---------------------------------------------------------------------------
-- Sellers: storefront enrichment
-- ---------------------------------------------------------------------------
alter table public.marketplace_sellers
  add column if not exists logo_url text;

alter table public.marketplace_sellers
  add column if not exists cover_url text;

alter table public.marketplace_sellers
  add column if not exists verified_at timestamptz;

alter table public.marketplace_sellers
  add column if not exists featured_until timestamptz;

alter table public.marketplace_sellers
  add column if not exists store_published_at timestamptz;

alter table public.marketplace_sellers
  add column if not exists delivery_notes text;

alter table public.marketplace_sellers
  add column if not exists supports_cod boolean not null default true;

alter table public.marketplace_sellers
  add column if not exists city text;

alter table public.marketplace_sellers
  add column if not exists country text;

-- ---------------------------------------------------------------------------
-- Products: commerce + SEO fields
-- ---------------------------------------------------------------------------
alter table public.marketplace_products
  add column if not exists brand_id uuid references public.marketplace_brands(id) on delete set null;

alter table public.marketplace_products
  add column if not exists short_description text;

alter table public.marketplace_products
  add column if not exists sale_price numeric(12,2) check (sale_price is null or sale_price >= 0);

alter table public.marketplace_products
  add column if not exists cost_price numeric(12,2) check (cost_price is null or cost_price >= 0);

alter table public.marketplace_products
  add column if not exists sku text;

alter table public.marketplace_products
  add column if not exists barcode text;

alter table public.marketplace_products
  add column if not exists low_stock_threshold int not null default 0 check (low_stock_threshold >= 0);

alter table public.marketplace_products
  add column if not exists weight_grams numeric(12,2);

alter table public.marketplace_products
  add column if not exists seo_title text;

alter table public.marketplace_products
  add column if not exists seo_description text;

alter table public.marketplace_products
  add column if not exists video_url text;

create index if not exists marketplace_products_brand_idx
  on public.marketplace_products(brand_id);

-- ---------------------------------------------------------------------------
-- Product images & variants
-- ---------------------------------------------------------------------------
create table if not exists public.marketplace_product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.marketplace_products(id) on delete cascade,
  url text not null,
  alt_text text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists marketplace_product_images_product_idx
  on public.marketplace_product_images(product_id, sort_order);

create table if not exists public.marketplace_product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.marketplace_products(id) on delete cascade,
  name text not null,
  sku text,
  barcode text,
  price numeric(12,2) not null check (price >= 0),
  sale_price numeric(12,2) check (sale_price is null or sale_price >= 0),
  stock int not null default 0 check (stock >= 0),
  image_url text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, name)
);

create index if not exists marketplace_product_variants_product_idx
  on public.marketplace_product_variants(product_id);

-- ---------------------------------------------------------------------------
-- Orders: buyer account + payment fields
-- ---------------------------------------------------------------------------
alter table public.marketplace_orders
  add column if not exists buyer_user_id uuid references auth.users(id) on delete set null;

alter table public.marketplace_orders
  add column if not exists payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'pending', 'paid', 'refunded', 'partially_refunded'));

alter table public.marketplace_orders
  add column if not exists payment_provider text not null default 'cod';

alter table public.marketplace_orders
  add column if not exists idempotency_key text;

alter table public.marketplace_orders
  add column if not exists currency text not null default 'PKR';

create unique index if not exists marketplace_orders_idempotency_uidx
  on public.marketplace_orders(idempotency_key)
  where idempotency_key is not null;

create index if not exists marketplace_orders_buyer_user_idx
  on public.marketplace_orders(buyer_user_id);

-- ---------------------------------------------------------------------------
-- Order items: variant + per-line fulfillment
-- ---------------------------------------------------------------------------
alter table public.marketplace_order_items
  add column if not exists variant_id uuid references public.marketplace_product_variants(id) on delete set null;

alter table public.marketplace_order_items
  add column if not exists variant_name text;

alter table public.marketplace_order_items
  add column if not exists fulfillment_status text not null default 'placed'
    check (fulfillment_status in (
      'placed', 'confirmed', 'processing', 'ready', 'shipped', 'delivered', 'cancelled'
    ));

-- ---------------------------------------------------------------------------
-- Per-seller sub-orders (independent fulfillment)
-- ---------------------------------------------------------------------------
create table if not exists public.marketplace_seller_orders (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.marketplace_orders(id) on delete cascade,
  seller_id uuid not null references public.marketplace_sellers(id) on delete restrict,
  status text not null default 'placed'
    check (status in (
      'placed', 'confirmed', 'processing', 'ready', 'shipped', 'delivered', 'cancelled'
    )),
  subtotal numeric(12,2) not null default 0,
  shipping_fee numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  tracking_number text,
  seller_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, seller_id)
);

create index if not exists marketplace_seller_orders_seller_idx
  on public.marketplace_seller_orders(seller_id, status);

alter table public.marketplace_order_items
  add column if not exists seller_order_id uuid references public.marketplace_seller_orders(id) on delete set null;

-- ---------------------------------------------------------------------------
-- Commissions: rule source snapshot
-- ---------------------------------------------------------------------------
alter table public.marketplace_commissions
  add column if not exists rule_scope text
    check (rule_scope is null or rule_scope in ('global', 'category', 'seller', 'product', 'settings'));

alter table public.marketplace_commissions
  alter column rate set default 0;

-- ---------------------------------------------------------------------------
-- Seller ledger (append-only)
-- ---------------------------------------------------------------------------
create table if not exists public.marketplace_seller_ledger (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.marketplace_sellers(id) on delete cascade,
  entry_type text not null check (entry_type in (
    'SELLER_CREDIT', 'SELLER_DEBIT', 'COMMISSION', 'REFUND', 'PAYOUT', 'ADJUSTMENT'
  )),
  amount numeric(12,2) not null,
  currency text not null default 'PKR',
  order_id uuid references public.marketplace_orders(id) on delete set null,
  seller_order_id uuid references public.marketplace_seller_orders(id) on delete set null,
  commission_id uuid references public.marketplace_commissions(id) on delete set null,
  payout_id uuid references public.marketplace_payouts(id) on delete set null,
  idempotency_key text,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create unique index if not exists marketplace_seller_ledger_idempotency_uidx
  on public.marketplace_seller_ledger(idempotency_key)
  where idempotency_key is not null;

create index if not exists marketplace_seller_ledger_seller_idx
  on public.marketplace_seller_ledger(seller_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Payout requests (seller-initiated; admin approves)
-- ---------------------------------------------------------------------------
create table if not exists public.marketplace_payout_requests (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.marketplace_sellers(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'PKR',
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'held', 'completed', 'cancelled')),
  method text not null default 'manual'
    check (method in ('manual', 'bank', 'wallet', 'provider')),
  payout_details text,
  review_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  payout_id uuid references public.marketplace_payouts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists marketplace_payout_requests_seller_idx
  on public.marketplace_payout_requests(seller_id, status);

-- ---------------------------------------------------------------------------
-- Payment intents (future online payments)
-- ---------------------------------------------------------------------------
create table if not exists public.marketplace_payment_intents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.marketplace_orders(id) on delete cascade,
  provider text not null,
  provider_ref text,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'PKR',
  status text not null default 'created'
    check (status in ('created', 'pending', 'succeeded', 'failed', 'refunded', 'cancelled')),
  idempotency_key text not null,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (idempotency_key)
);

create index if not exists marketplace_payment_intents_order_idx
  on public.marketplace_payment_intents(order_id);

-- ---------------------------------------------------------------------------
-- Buyer addresses & wishlist
-- ---------------------------------------------------------------------------
create table if not exists public.marketplace_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text,
  full_name text not null,
  phone text not null,
  line1 text not null,
  line2 text,
  city text not null,
  area text,
  country text not null default 'Pakistan',
  postal_code text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists marketplace_addresses_user_idx
  on public.marketplace_addresses(user_id);

create table if not exists public.marketplace_wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('product', 'salon', 'service')),
  product_id uuid references public.marketplace_products(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  service_id uuid references public.services(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint marketplace_wishlists_target_check check (
    (target_type = 'product' and product_id is not null)
    or (target_type = 'salon' and organization_id is not null)
    or (target_type = 'service' and service_id is not null)
  )
);

create unique index if not exists marketplace_wishlists_product_uidx
  on public.marketplace_wishlists(user_id, product_id)
  where target_type = 'product';

create unique index if not exists marketplace_wishlists_salon_uidx
  on public.marketplace_wishlists(user_id, organization_id)
  where target_type = 'salon';

create unique index if not exists marketplace_wishlists_service_uidx
  on public.marketplace_wishlists(user_id, service_id)
  where target_type = 'service';

-- ---------------------------------------------------------------------------
-- Featured listings
-- ---------------------------------------------------------------------------
create table if not exists public.marketplace_featured_listings (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('seller', 'product', 'salon')),
  seller_id uuid references public.marketplace_sellers(id) on delete cascade,
  product_id uuid references public.marketplace_products(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  kind text not null default 'featured'
    check (kind in ('featured', 'sponsored')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists marketplace_featured_listings_active_idx
  on public.marketplace_featured_listings(target_type, is_active, starts_at);

-- ---------------------------------------------------------------------------
-- Analytics events
-- ---------------------------------------------------------------------------
create table if not exists public.marketplace_analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  user_id uuid references auth.users(id) on delete set null,
  seller_id uuid references public.marketplace_sellers(id) on delete set null,
  product_id uuid references public.marketplace_products(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists marketplace_analytics_events_type_idx
  on public.marketplace_analytics_events(event_type, created_at desc);

create index if not exists marketplace_analytics_events_seller_idx
  on public.marketplace_analytics_events(seller_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Reviews enrichment
-- ---------------------------------------------------------------------------
alter table public.marketplace_reviews
  add column if not exists user_id uuid references auth.users(id) on delete set null;

alter table public.marketplace_reviews
  add column if not exists order_item_id uuid references public.marketplace_order_items(id) on delete set null;

alter table public.marketplace_reviews
  add column if not exists is_verified boolean not null default false;

alter table public.marketplace_reviews
  add column if not exists seller_reply text;

alter table public.marketplace_reviews
  add column if not exists seller_replied_at timestamptz;

-- ---------------------------------------------------------------------------
-- Resolve commission rate helper
-- ---------------------------------------------------------------------------
create or replace function public.marketplace_resolve_commission_rate(
  p_product_id uuid,
  p_seller_id uuid,
  p_category_id uuid
)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r numeric(5,4);
begin
  select rate into r
  from public.marketplace_commission_rules
  where is_active and scope = 'product' and product_id = p_product_id
  limit 1;
  if found then return r; end if;

  select rate into r
  from public.marketplace_commission_rules
  where is_active and scope = 'seller' and seller_id = p_seller_id
  limit 1;
  if found then return r; end if;

  if p_category_id is not null then
    select rate into r
    from public.marketplace_commission_rules
    where is_active and scope = 'category' and category_id = p_category_id
    limit 1;
    if found then return r; end if;
  end if;

  select default_commission_rate into r
  from public.marketplace_settings
  where id = 1;
  if found then return coalesce(r, 0); end if;

  return 0;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.marketplace_settings enable row level security;
alter table public.marketplace_commission_rules enable row level security;
alter table public.marketplace_brands enable row level security;
alter table public.marketplace_product_images enable row level security;
alter table public.marketplace_product_variants enable row level security;
alter table public.marketplace_seller_orders enable row level security;
alter table public.marketplace_seller_ledger enable row level security;
alter table public.marketplace_payout_requests enable row level security;
alter table public.marketplace_payment_intents enable row level security;
alter table public.marketplace_addresses enable row level security;
alter table public.marketplace_wishlists enable row level security;
alter table public.marketplace_featured_listings enable row level security;
alter table public.marketplace_analytics_events enable row level security;

-- Settings: public read (commission display); writes via service role / platform
drop policy if exists mp_settings_select_all on public.marketplace_settings;
create policy mp_settings_select_all
  on public.marketplace_settings for select
  to anon, authenticated
  using (true);

drop policy if exists mp_commission_rules_select_all on public.marketplace_commission_rules;
create policy mp_commission_rules_select_all
  on public.marketplace_commission_rules for select
  to authenticated
  using (true);

drop policy if exists mp_brands_select_active on public.marketplace_brands;
create policy mp_brands_select_active
  on public.marketplace_brands for select
  to anon, authenticated
  using (is_active = true);

-- Images / variants: public if product published, else seller owner
drop policy if exists mp_product_images_select on public.marketplace_product_images;
create policy mp_product_images_select
  on public.marketplace_product_images for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.marketplace_products p
      where p.id = product_id
        and (p.status = 'published' or public.is_marketplace_seller_owner(p.seller_id))
    )
  );

drop policy if exists mp_product_images_write on public.marketplace_product_images;
create policy mp_product_images_write
  on public.marketplace_product_images for all
  to authenticated
  using (
    exists (
      select 1 from public.marketplace_products p
      where p.id = product_id and public.is_marketplace_seller_owner(p.seller_id)
    )
  )
  with check (
    exists (
      select 1 from public.marketplace_products p
      where p.id = product_id and public.is_marketplace_seller_owner(p.seller_id)
    )
  );

drop policy if exists mp_product_variants_select on public.marketplace_product_variants;
create policy mp_product_variants_select
  on public.marketplace_product_variants for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.marketplace_products p
      where p.id = product_id
        and (p.status = 'published' or public.is_marketplace_seller_owner(p.seller_id))
    )
  );

drop policy if exists mp_product_variants_write on public.marketplace_product_variants;
create policy mp_product_variants_write
  on public.marketplace_product_variants for all
  to authenticated
  using (
    exists (
      select 1 from public.marketplace_products p
      where p.id = product_id and public.is_marketplace_seller_owner(p.seller_id)
    )
  )
  with check (
    exists (
      select 1 from public.marketplace_products p
      where p.id = product_id and public.is_marketplace_seller_owner(p.seller_id)
    )
  );

drop policy if exists mp_seller_orders_select on public.marketplace_seller_orders;
create policy mp_seller_orders_select
  on public.marketplace_seller_orders for select
  to authenticated
  using (
    public.is_marketplace_seller_owner(seller_id)
    or exists (
      select 1 from public.marketplace_orders o
      where o.id = order_id and o.buyer_user_id = auth.uid()
    )
  );

drop policy if exists mp_seller_orders_update on public.marketplace_seller_orders;
create policy mp_seller_orders_update
  on public.marketplace_seller_orders for update
  to authenticated
  using (public.is_marketplace_seller_owner(seller_id))
  with check (public.is_marketplace_seller_owner(seller_id));

-- Buyer can read own parent orders (seller access remains mp_orders_select_seller)
drop policy if exists mp_orders_select_buyer on public.marketplace_orders;
create policy mp_orders_select_buyer
  on public.marketplace_orders for select
  to authenticated
  using (buyer_user_id = auth.uid());

drop policy if exists mp_ledger_select_seller on public.marketplace_seller_ledger;
create policy mp_ledger_select_seller
  on public.marketplace_seller_ledger for select
  to authenticated
  using (public.is_marketplace_seller_owner(seller_id));

drop policy if exists mp_payout_requests_select on public.marketplace_payout_requests;
create policy mp_payout_requests_select
  on public.marketplace_payout_requests for select
  to authenticated
  using (public.is_marketplace_seller_owner(seller_id));

drop policy if exists mp_payout_requests_insert on public.marketplace_payout_requests;
create policy mp_payout_requests_insert
  on public.marketplace_payout_requests for insert
  to authenticated
  with check (public.is_marketplace_seller_owner(seller_id));

drop policy if exists mp_addresses_own on public.marketplace_addresses;
create policy mp_addresses_own
  on public.marketplace_addresses for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists mp_wishlists_own on public.marketplace_wishlists;
create policy mp_wishlists_own
  on public.marketplace_wishlists for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists mp_featured_select_active on public.marketplace_featured_listings;
create policy mp_featured_select_active
  on public.marketplace_featured_listings for select
  to anon, authenticated
  using (
    is_active = true
    and starts_at <= now()
    and (ends_at is null or ends_at > now())
  );

drop policy if exists mp_analytics_insert_auth on public.marketplace_analytics_events;
create policy mp_analytics_insert_auth
  on public.marketplace_analytics_events for insert
  to authenticated, anon
  with check (true);

drop policy if exists mp_analytics_select_seller on public.marketplace_analytics_events;
create policy mp_analytics_select_seller
  on public.marketplace_analytics_events for select
  to authenticated
  using (
    seller_id is not null
    and public.is_marketplace_seller_owner(seller_id)
  );

-- Payment intents: buyer read own
drop policy if exists mp_payment_intents_select_buyer on public.marketplace_payment_intents;
create policy mp_payment_intents_select_buyer
  on public.marketplace_payment_intents for select
  to authenticated
  using (
    exists (
      select 1 from public.marketplace_orders o
      where o.id = order_id and o.buyer_user_id = auth.uid()
    )
  );
