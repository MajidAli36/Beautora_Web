-- Split dashboard inventory valuation: retail (sellable) vs in-house (back-bar).
-- Keeps original columns for compatibility; adds retail_* and in_house_* breakdowns.

drop function if exists public.dashboard_inventory_valuation(uuid);

create function public.dashboard_inventory_valuation(
  p_organization_id uuid
)
returns table (
  value_at_cost numeric,
  value_at_retail numeric,
  units_on_hand numeric,
  retail_value_at_cost numeric,
  retail_value_at_retail numeric,
  retail_units numeric,
  in_house_value_at_cost numeric,
  in_house_units numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    coalesce(sum(p.stock_quantity * p.cost_price), 0)::numeric as value_at_cost,
    coalesce(sum(p.stock_quantity * p.retail_price), 0)::numeric as value_at_retail,
    coalesce(sum(p.stock_quantity), 0)::numeric as units_on_hand,
    coalesce(
      sum(
        case
          when p.product_kind in ('RETAIL', 'BOTH')
            then p.stock_quantity * p.cost_price
          else 0
        end
      ),
      0
    )::numeric as retail_value_at_cost,
    coalesce(
      sum(
        case
          when p.product_kind in ('RETAIL', 'BOTH')
            then p.stock_quantity * p.retail_price
          else 0
        end
      ),
      0
    )::numeric as retail_value_at_retail,
    coalesce(
      sum(
        case
          when p.product_kind in ('RETAIL', 'BOTH') then p.stock_quantity
          else 0
        end
      ),
      0
    )::numeric as retail_units,
    coalesce(
      sum(
        case
          when p.product_kind = 'IN_HOUSE'
            then p.stock_quantity * p.cost_price
          else 0
        end
      ),
      0
    )::numeric as in_house_value_at_cost,
    coalesce(
      sum(
        case when p.product_kind = 'IN_HOUSE' then p.stock_quantity else 0 end
      ),
      0
    )::numeric as in_house_units
  from public.products p
  where p.organization_id = p_organization_id
    and p.is_active = true
    and p.deleted_at is null;
$$;

grant execute on function public.dashboard_inventory_valuation(uuid) to authenticated;
