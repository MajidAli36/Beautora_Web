-- Phase 2: dashboard chart/retention + finance period aggregates (SQL, not Node row pulls)

-- ===== Dashboard: revenue by local calendar day =====
create or replace function public.dashboard_revenue_by_day(
  p_organization_id uuid,
  p_since timestamptz,
  p_until timestamptz
)
returns table (
  day date,
  revenue numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    (s.completed_at at time zone 'Asia/Karachi')::date as day,
    coalesce(sum(s.total), 0)::numeric as revenue
  from public.sales s
  where s.organization_id = p_organization_id
    and s.deleted_at is null
    and s.status in ('COMPLETED', 'AMENDED')
    and s.completed_at >= p_since
    and s.completed_at <= p_until
  group by 1
  order by 1;
$$;

-- ===== Dashboard: appointments by local calendar day =====
create or replace function public.dashboard_appointments_by_day(
  p_organization_id uuid,
  p_since timestamptz,
  p_until timestamptz
)
returns table (
  day date,
  appt_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    (a.scheduled_at at time zone 'Asia/Karachi')::date as day,
    count(*)::bigint as appt_count
  from public.appointments a
  where a.organization_id = p_organization_id
    and a.deleted_at is null
    and a.scheduled_at >= p_since
    and a.scheduled_at <= p_until
  group by 1
  order by 1;
$$;

-- ===== Dashboard: 30d retention / AOV stats =====
create or replace function public.dashboard_retention_stats(
  p_organization_id uuid,
  p_since timestamptz
)
returns table (
  customers_with_sales bigint,
  returning_customers bigint,
  total_spend numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with cust as (
    select
      s.customer_id,
      count(*)::bigint as visit_count,
      sum(s.total)::numeric as spend
    from public.sales s
    where s.organization_id = p_organization_id
      and s.deleted_at is null
      and s.status in ('COMPLETED', 'AMENDED')
      and s.customer_id is not null
      and s.completed_at >= p_since
    group by s.customer_id
  )
  select
    count(*)::bigint as customers_with_sales,
    count(*) filter (where visit_count > 1)::bigint as returning_customers,
    coalesce(sum(spend), 0)::numeric as total_spend
  from cust;
$$;

-- ===== Finance: period cash / opex aggregates (avoid shipping every row) =====
create or replace function public.finance_period_cash_totals(
  p_organization_id uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_from_date date,
  p_to_date date
)
returns table (
  advances_collected numeric,
  unapplied_deposits numeric,
  staff_payments numeric,
  staff_payment_count bigint,
  cash_from_sales numeric,
  expenses_total numeric,
  expense_count bigint,
  expenses_by_category jsonb,
  sale_refunds_total numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with
  adv as (
    select coalesce(sum(d.amount), 0)::numeric as total
    from public.appointment_deposits d
    where d.organization_id = p_organization_id
      and d.status in ('APPROVED', 'REFUNDED')
      and d.paid_at >= p_start
      and d.paid_at <= p_end
  ),
  unapp as (
    select coalesce(sum(d.amount), 0)::numeric as total
    from public.appointment_deposits d
    where d.organization_id = p_organization_id
      and d.status = 'APPROVED'
      and d.applied_to_sale_id is null
  ),
  staff as (
    select
      coalesce(sum(sp.amount), 0)::numeric as total,
      count(*)::bigint as cnt
    from public.staff_payments sp
    where sp.organization_id = p_organization_id
      and sp.payment_date >= p_from_date
      and sp.payment_date <= p_to_date
  ),
  pay as (
    select coalesce(sum(p.amount), 0)::numeric as total
    from public.payments p
    where p.organization_id = p_organization_id
      and p.paid_at >= p_start
      and p.paid_at <= p_end
      and coalesce(p.reference, '') is distinct from 'APPOINTMENT_DEPOSIT'
  ),
  exp_rows as (
    select e.category, e.amount
    from public.expenses e
    where e.organization_id = p_organization_id
      and e.expense_date >= p_from_date
      and e.expense_date <= p_to_date
      and (
        e.description is null
        or (
          e.description not like 'Voided invoice refund%'
          and e.description not like 'Invoice amendment refund%'
          and e.description not like 'Sale refund%'
        )
      )
  ),
  exp as (
    select
      coalesce(sum(amount), 0)::numeric as total,
      count(*)::bigint as cnt,
      coalesce(
        (
          select jsonb_object_agg(category, cat_sum)
          from (
            select category, sum(amount)::numeric as cat_sum
            from exp_rows
            group by category
          ) g
        ),
        '{}'::jsonb
      ) as by_cat
    from exp_rows
  ),
  ref as (
    select coalesce(sum(r.amount), 0)::numeric as total
    from public.sale_refunds r
    where r.organization_id = p_organization_id
      and r.created_at >= p_start
      and r.created_at <= p_end
  )
  select
    (select total from adv),
    (select total from unapp),
    (select total from staff),
    (select cnt from staff),
    (select total from pay),
    coalesce((select total from exp), 0),
    coalesce((select cnt from exp), 0),
    coalesce((select by_cat from exp), '{}'::jsonb),
    (select total from ref);
$$;

-- ===== Finance: sales period summary + id lists for inventory helpers =====
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
      and deleted_at is null
      and status in ('COMPLETED', 'AMENDED', 'REFUNDED', 'VOID')
      and completed_at >= p_start
      and completed_at <= p_end
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

grant execute on function public.dashboard_revenue_by_day(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.dashboard_appointments_by_day(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.dashboard_retention_stats(uuid, timestamptz) to authenticated;
grant execute on function public.finance_period_cash_totals(uuid, timestamptz, timestamptz, date, date) to authenticated;
grant execute on function public.finance_period_sales_bundle(uuid, timestamptz, timestamptz) to authenticated;
