-- Retail vs in-house product kinds + service consumable recipes

create type public.product_kind as enum ('RETAIL', 'IN_HOUSE', 'BOTH');

alter table public.products
  add column if not exists product_kind public.product_kind not null default 'RETAIL';

comment on column public.products.product_kind is
  'RETAIL = sell at POS; IN_HOUSE = back-bar only; BOTH = sellable and usable in services';

create index if not exists products_org_kind_idx
  on public.products (organization_id, product_kind);

-- Allow fractional usage quantities (e.g. 0.05 tube per service)
alter table public.products
  alter column stock_quantity type numeric(12, 3)
  using stock_quantity::numeric(12, 3);

alter table public.inventory_transactions
  alter column quantity type numeric(12, 3)
  using quantity::numeric(12, 3);

alter table public.inventory_transactions
  drop constraint if exists inventory_transactions_quantity_check;

alter table public.inventory_transactions
  add constraint inventory_transactions_quantity_check check (quantity > 0);

create or replace function public.apply_inventory_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_stock numeric(12, 3);
begin
  if new.type = 'IN' then
    update public.products
    set stock_quantity = stock_quantity + new.quantity
    where id = new.product_id;
  elsif new.type = 'OUT' then
    select stock_quantity into current_stock
    from public.products
    where id = new.product_id
    for update;

    if current_stock is null then
      raise exception 'Product not found for inventory OUT';
    end if;

    if current_stock < new.quantity then
      raise exception 'Insufficient stock (have %, need %)', current_stock, new.quantity;
    end if;

    update public.products
    set stock_quantity = stock_quantity - new.quantity
    where id = new.product_id;
  elsif new.type = 'ADJUSTMENT' then
    update public.products
    set stock_quantity = new.quantity
    where id = new.product_id;
  end if;
  return new;
end;
$$;

-- Service → product usage recipe (BOM-lite)
create table public.service_product_usage (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity_per_service numeric(12, 3) not null check (quantity_per_service > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (service_id, product_id)
);

create index service_product_usage_org_idx
  on public.service_product_usage (organization_id);
create index service_product_usage_service_idx
  on public.service_product_usage (service_id);
create index service_product_usage_product_idx
  on public.service_product_usage (product_id);

create trigger service_product_usage_set_updated_at
  before update on public.service_product_usage
  for each row execute function public.set_updated_at();

alter table public.service_product_usage enable row level security;

create policy "members_select_service_product_usage"
  on public.service_product_usage for select to authenticated
  using (public.is_org_member(organization_id));

create policy "managers_insert_service_product_usage"
  on public.service_product_usage for insert to authenticated
  with check (public.user_org_role(organization_id) in ('OWNER', 'ADMIN', 'MANAGER'));

create policy "managers_update_service_product_usage"
  on public.service_product_usage for update to authenticated
  using (public.user_org_role(organization_id) in ('OWNER', 'ADMIN', 'MANAGER'))
  with check (public.user_org_role(organization_id) in ('OWNER', 'ADMIN', 'MANAGER'));

create policy "managers_delete_service_product_usage"
  on public.service_product_usage for delete to authenticated
  using (public.user_org_role(organization_id) in ('OWNER', 'ADMIN', 'MANAGER'));
