-- Link auto-created PAYROLL expenses to staff_payments (no double-count in P&L).

alter table public.expenses
  add column if not exists staff_payment_id uuid
    references public.staff_payments (id) on delete cascade;

create unique index if not exists expenses_staff_payment_uidx
  on public.expenses (staff_payment_id)
  where staff_payment_id is not null;

-- Cash totals: keep staff_payments separate; exclude linked payroll expense rows
-- from expenses_total so net profit does not double-count.
-- Must drop first — return type gains staff_payments_by_type.
drop function if exists public.finance_period_cash_totals(uuid, timestamptz, timestamptz, date, date);

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
  sale_refunds_total numeric,
  staff_payments_by_type jsonb
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
      count(*)::bigint as cnt,
      coalesce(
        (
          select jsonb_object_agg(payment_type, type_sum)
          from (
            select payment_type::text, sum(amount)::numeric as type_sum
            from public.staff_payments
            where organization_id = p_organization_id
              and payment_date >= p_from_date
              and payment_date <= p_to_date
            group by payment_type
          ) t
        ),
        '{}'::jsonb
      ) as by_type
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
      and e.staff_payment_id is null
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
    (select total from exp),
    (select cnt from exp),
    (select by_cat from exp),
    (select total from ref),
    (select by_type from staff);
$$;

grant execute on function public.finance_period_cash_totals(uuid, timestamptz, timestamptz, date, date) to authenticated;
