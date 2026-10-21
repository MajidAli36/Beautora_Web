-- Full inventory valuation for dashboard (not capped by product list limit)

create or replace function public.dashboard_inventory_valuation(
  p_organization_id uuid
)
returns table (
  value_at_cost numeric,
  value_at_retail numeric,
  units_on_hand numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    coalesce(sum(p.stock_quantity * p.cost_price), 0)::numeric as value_at_cost,
    coalesce(sum(p.stock_quantity * p.retail_price), 0)::numeric as value_at_retail,
    coalesce(sum(p.stock_quantity), 0)::numeric as units_on_hand
  from public.products p
  where p.organization_id = p_organization_id
    and p.is_active = true
    and p.deleted_at is null;
$$;

grant execute on function public.dashboard_inventory_valuation(uuid) to authenticated;
