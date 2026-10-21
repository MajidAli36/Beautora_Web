-- Keep soft-deleted VOID/REFUNDED tickets in period sales revenue (by completed_at)
-- so Finances can reverse them on void/refund date via SALE_VOID / SALE_FULL_REFUND
-- without understating profit (soft-delete alone was dropping them from sales_revenue
-- while fullTicketReversals still subtracted the ticket).

create or replace function public.finance_period_sales_bundle(
  p_organization_id uuid,
  p_start timestamptz,
  p_end timestamptz
)
returns table (
  sales_revenue numeric,
  sale_count bigint,
  posted_ids uuid[],
  usage_ids uuid[]
)
language sql
stable
security invoker
set search_path = public
as $$
  with s as (
    select id, total, status
    from public.sales
    where organization_id = p_organization_id
      and completed_at >= p_start
      and completed_at <= p_end
      and status in ('COMPLETED', 'AMENDED', 'REFUNDED', 'VOID')
      and (
        deleted_at is null
        or status in ('VOID', 'REFUNDED')
      )
  )
  select
    coalesce(sum(total), 0)::numeric as sales_revenue,
    count(*)::bigint as sale_count,
    coalesce(
      array_agg(id) filter (where status in ('COMPLETED', 'AMENDED')),
      '{}'::uuid[]
    ) as posted_ids,
    coalesce(array_agg(id), '{}'::uuid[]) as usage_ids
  from s;
$$;

grant execute on function public.finance_period_sales_bundle(uuid, timestamptz, timestamptz) to authenticated;
