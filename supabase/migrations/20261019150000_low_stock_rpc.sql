-- Low-stock products without pulling the full catalog into Node

create or replace function public.low_stock_products(
  p_organization_id uuid,
  p_limit int default 100
)
returns table (
  id uuid,
  name text,
  stock_quantity integer,
  low_stock_threshold integer
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    p.id,
    p.name,
    p.stock_quantity,
    p.low_stock_threshold
  from public.products p
  where p.organization_id = p_organization_id
    and p.deleted_at is null
    and p.is_active = true
    and p.stock_quantity <= p.low_stock_threshold
  order by p.stock_quantity asc, p.name asc
  limit greatest(p_limit, 1);
$$;

grant execute on function public.low_stock_products(uuid, int) to authenticated;
