-- Beautora Marketplace MVP — isolated from salon POS / finances

create table if not exists public.marketplace_sellers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  shop_name text not null,
  slug text not null unique,
  bio text,
  payout_notes text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists marketplace_sellers_user_idx on public.marketplace_sellers(user_id);
create index if not exists marketplace_sellers_org_idx on public.marketplace_sellers(organization_id);
create index if not exists marketplace_sellers_status_idx on public.marketplace_sellers(status);

create table if not exists public.marketplace_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.marketplace_products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.marketplace_sellers(id) on delete cascade,
  category_id uuid references public.marketplace_categories(id) on delete set null,
  title text not null,
  slug text not null,
  description text,
  price numeric(12,2) not null check (price >= 0),
  stock int not null default 0 check (stock >= 0),
  image_url text,
  status text not null default 'draft'
    check (status in ('draft', 'pending', 'published', 'rejected')),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (seller_id, slug)
);

create index if not exists marketplace_products_seller_idx on public.marketplace_products(seller_id);
create index if not exists marketplace_products_status_idx on public.marketplace_products(status);
create index if not exists marketplace_products_category_idx on public.marketplace_products(category_id);

create table if not exists public.marketplace_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  buyer_name text not null,
  buyer_phone text not null,
  buyer_address text not null,
  buyer_notes text,
  status text not null default 'placed'
    check (status in ('placed', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  payment_method text not null default 'COD',
  subtotal numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marketplace_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.marketplace_orders(id) on delete cascade,
  seller_id uuid not null references public.marketplace_sellers(id) on delete restrict,
  product_id uuid references public.marketplace_products(id) on delete set null,
  product_title text not null,
  unit_price numeric(12,2) not null,
  quantity int not null check (quantity > 0),
  line_total numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create index if not exists marketplace_order_items_order_idx on public.marketplace_order_items(order_id);
create index if not exists marketplace_order_items_seller_idx on public.marketplace_order_items(seller_id);

create table if not exists public.marketplace_commissions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.marketplace_orders(id) on delete cascade,
  seller_id uuid not null references public.marketplace_sellers(id) on delete cascade,
  gross_amount numeric(12,2) not null,
  rate numeric(5,4) not null default 0.10,
  commission_amount numeric(12,2) not null,
  payout_status text not null default 'owed'
    check (payout_status in ('owed', 'paid')),
  payout_id uuid,
  created_at timestamptz not null default now(),
  unique (order_id, seller_id)
);

create table if not exists public.marketplace_payouts (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.marketplace_sellers(id) on delete cascade,
  amount numeric(12,2) not null,
  notes text,
  paid_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.marketplace_commissions
  drop constraint if exists marketplace_commissions_payout_id_fkey;
alter table public.marketplace_commissions
  add constraint marketplace_commissions_payout_id_fkey
  foreign key (payout_id) references public.marketplace_payouts(id) on delete set null;

create table if not exists public.marketplace_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.marketplace_products(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  reviewer_name text not null,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists marketplace_reviews_product_idx on public.marketplace_reviews(product_id);

-- Seed categories
insert into public.marketplace_categories (name, slug, sort_order)
values
  ('Hair care', 'hair-care', 10),
  ('Skin care', 'skin-care', 20),
  ('Tools', 'tools', 30),
  ('Accessories', 'accessories', 40),
  ('Other', 'other', 90)
on conflict (slug) do nothing;

-- Helpers
create or replace function public.is_marketplace_seller_owner(p_seller_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.marketplace_sellers s
    where s.id = p_seller_id
      and (
        s.user_id = auth.uid()
        or (
          s.organization_id is not null
          and public.user_org_role(s.organization_id) in ('OWNER', 'ADMIN', 'MANAGER')
        )
      )
  );
$$;

create or replace function public.next_marketplace_order_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  n bigint;
begin
  n := (extract(epoch from now()) * 1000)::bigint;
  return 'MP-' || n::text;
end;
$$;

-- RLS
alter table public.marketplace_sellers enable row level security;
alter table public.marketplace_categories enable row level security;
alter table public.marketplace_products enable row level security;
alter table public.marketplace_orders enable row level security;
alter table public.marketplace_order_items enable row level security;
alter table public.marketplace_commissions enable row level security;
alter table public.marketplace_payouts enable row level security;
alter table public.marketplace_reviews enable row level security;

-- Categories: public read
create policy "mp_categories_select_all"
  on public.marketplace_categories for select
  to anon, authenticated
  using (is_active = true);

-- Sellers
create policy "mp_sellers_select_own_or_public"
  on public.marketplace_sellers for select
  to anon, authenticated
  using (
    status = 'approved'
    or user_id = auth.uid()
    or (
      organization_id is not null
      and public.is_org_member(organization_id)
    )
  );

create policy "mp_sellers_insert_own"
  on public.marketplace_sellers for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "mp_sellers_update_own"
  on public.marketplace_sellers for update
  to authenticated
  using (public.is_marketplace_seller_owner(id))
  with check (public.is_marketplace_seller_owner(id));

-- Products
create policy "mp_products_select_published_or_owner"
  on public.marketplace_products for select
  to anon, authenticated
  using (
    status = 'published'
    or public.is_marketplace_seller_owner(seller_id)
  );

create policy "mp_products_insert_owner"
  on public.marketplace_products for insert
  to authenticated
  with check (public.is_marketplace_seller_owner(seller_id));

create policy "mp_products_update_owner"
  on public.marketplace_products for update
  to authenticated
  using (public.is_marketplace_seller_owner(seller_id))
  with check (public.is_marketplace_seller_owner(seller_id));

create policy "mp_products_delete_owner"
  on public.marketplace_products for delete
  to authenticated
  using (public.is_marketplace_seller_owner(seller_id));

-- Orders: sellers see their items; guests place via service role in app
create policy "mp_orders_select_seller"
  on public.marketplace_orders for select
  to authenticated
  using (
    exists (
      select 1 from public.marketplace_order_items i
      where i.order_id = id
        and public.is_marketplace_seller_owner(i.seller_id)
    )
  );

create policy "mp_order_items_select_seller"
  on public.marketplace_order_items for select
  to authenticated
  using (public.is_marketplace_seller_owner(seller_id));

create policy "mp_order_items_update_seller"
  on public.marketplace_order_items for update
  to authenticated
  using (public.is_marketplace_seller_owner(seller_id));

-- Commissions / payouts: seller read
create policy "mp_commissions_select_seller"
  on public.marketplace_commissions for select
  to authenticated
  using (public.is_marketplace_seller_owner(seller_id));

create policy "mp_payouts_select_seller"
  on public.marketplace_payouts for select
  to authenticated
  using (public.is_marketplace_seller_owner(seller_id));

-- Reviews: public read non-hidden; anyone authenticated can insert
create policy "mp_reviews_select_public"
  on public.marketplace_reviews for select
  to anon, authenticated
  using (is_hidden = false);

create policy "mp_reviews_insert_any"
  on public.marketplace_reviews for insert
  to anon, authenticated
  with check (true);
