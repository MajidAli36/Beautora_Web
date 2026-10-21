-- Marketplace order-item pricing snapshots for historical gross profit.
-- unit_price remains the charged (effective) unit price.
-- list_unit_price = original selling/list price at sale time.
-- unit_cost = manufacturing/purchase cost snapshot (private; seller/admin only via RLS).
-- unit_discount = list_unit_price - unit_price (never negative).

alter table public.marketplace_order_items
  add column if not exists unit_cost numeric(12,2);

alter table public.marketplace_order_items
  add column if not exists list_unit_price numeric(12,2);

alter table public.marketplace_order_items
  add column if not exists unit_discount numeric(12,2) not null default 0;

alter table public.marketplace_order_items
  add column if not exists product_sku text;

comment on column public.marketplace_order_items.unit_cost is
  'Cost snapshot at sale time. Historical rows may be backfilled from current product cost when missing.';
comment on column public.marketplace_order_items.list_unit_price is
  'List/selling price snapshot before discount at sale time.';
comment on column public.marketplace_order_items.unit_discount is
  'Per-unit discount (list_unit_price - unit_price). Zero when no discount.';
comment on column public.marketplace_order_items.product_sku is
  'SKU snapshot at sale time (optional).';

-- Soft backfill from current product (documented limitation: not true historical cost).
update public.marketplace_order_items i
set
  unit_cost = coalesce(i.unit_cost, coalesce(p.cost_price, 0)),
  list_unit_price = coalesce(i.list_unit_price, i.unit_price),
  unit_discount = greatest(
    0,
    round((coalesce(i.list_unit_price, i.unit_price) - i.unit_price)::numeric, 2)
  ),
  product_sku = coalesce(i.product_sku, p.sku)
from public.marketplace_products p
where i.product_id = p.id
  and (
    i.unit_cost is null
    or i.list_unit_price is null
    or i.product_sku is null
  );

update public.marketplace_order_items
set
  unit_cost = coalesce(unit_cost, 0),
  list_unit_price = coalesce(list_unit_price, unit_price),
  unit_discount = greatest(0, round((coalesce(list_unit_price, unit_price) - unit_price)::numeric, 2))
where unit_cost is null
   or list_unit_price is null;

alter table public.marketplace_order_items
  alter column unit_cost set default 0;

alter table public.marketplace_order_items
  alter column list_unit_price set default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'marketplace_order_items_unit_cost_nonneg'
  ) then
    alter table public.marketplace_order_items
      add constraint marketplace_order_items_unit_cost_nonneg
      check (unit_cost is null or unit_cost >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'marketplace_order_items_unit_discount_nonneg'
  ) then
    alter table public.marketplace_order_items
      add constraint marketplace_order_items_unit_discount_nonneg
      check (unit_discount >= 0);
  end if;
end $$;
