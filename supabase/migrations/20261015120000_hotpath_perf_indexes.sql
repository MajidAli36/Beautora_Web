-- Hot-path indexes + aggregate RPCs (POS, dashboard, customer directory)

-- ===== Indexes =====
create index if not exists sales_org_completed_at_idx
  on public.sales (organization_id, completed_at desc)
  where deleted_at is null;

create index if not exists sales_org_created_at_idx
  on public.sales (organization_id, created_at desc);

create index if not exists sales_org_appointment_live_idx
  on public.sales (organization_id, appointment_id)
  where deleted_at is null and appointment_id is not null;

create index if not exists invoices_org_created_at_idx
  on public.invoices (organization_id, created_at desc);

create index if not exists appointments_org_open_scheduled_idx
  on public.appointments (organization_id, scheduled_at)
  where deleted_at is null
    and status not in ('COMPLETED', 'CANCELLED', 'NO_SHOW');

create index if not exists products_org_active_kind_idx
  on public.products (organization_id, product_kind, name)
  where deleted_at is null and is_active = true;

create index if not exists customers_org_created_at_phone_idx
  on public.customers (organization_id, created_at desc)
  where deleted_at is null;

create index if not exists appointment_deposits_org_unapplied_idx
  on public.appointment_deposits (organization_id, appointment_id)
  where status = 'APPROVED' and applied_to_sale_id is null;

create index if not exists sale_items_org_type_sale_idx
  on public.sale_items (organization_id, item_type, sale_id);

create index if not exists sales_org_customer_status_completed_idx
  on public.sales (organization_id, customer_id, completed_at desc)
  where deleted_at is null
    and status in ('COMPLETED', 'AMENDED')
    and customer_id is not null;

-- ===== RPCs (security invoker — respects RLS) =====

create or replace function public.customer_directory_stats(
  p_organization_id uuid,
  p_customer_ids uuid[],
  p_since timestamptz default (now() - interval '2 years')
)
returns table (
  customer_id uuid,
  total_spent numeric,
  visit_count bigint,
  last_visit_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    s.customer_id,
    coalesce(sum(s.total), 0)::numeric as total_spent,
    count(*)::bigint as visit_count,
    max(s.completed_at) as last_visit_at
  from public.sales s
  where s.organization_id = p_organization_id
    and s.customer_id = any (p_customer_ids)
    and s.deleted_at is null
    and s.status in ('COMPLETED', 'AMENDED')
    and s.completed_at >= p_since
  group by s.customer_id;
$$;

create or replace function public.customer_lifetime_stats(
  p_organization_id uuid,
  p_customer_id uuid
)
returns table (
  total_spent numeric,
  visit_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    coalesce(sum(s.total), 0)::numeric as total_spent,
    count(*)::bigint as visit_count
  from public.sales s
  where s.organization_id = p_organization_id
    and s.customer_id = p_customer_id
    and s.deleted_at is null
    and s.status in ('COMPLETED', 'AMENDED');
$$;

create or replace function public.dashboard_top_services(
  p_organization_id uuid,
  p_since timestamptz,
  p_limit int default 5
)
returns table (
  name text,
  qty numeric,
  revenue numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    si.name,
    coalesce(sum(si.quantity), 0)::numeric as qty,
    coalesce(sum(si.line_total), 0)::numeric as revenue
  from public.sale_items si
  inner join public.sales s
    on s.id = si.sale_id
   and s.organization_id = si.organization_id
  where si.organization_id = p_organization_id
    and si.item_type = 'SERVICE'
    and s.deleted_at is null
    and s.status in ('COMPLETED', 'AMENDED')
    and s.completed_at >= p_since
  group by si.name
  order by revenue desc
  limit greatest(p_limit, 1);
$$;

grant execute on function public.customer_directory_stats(uuid, uuid[], timestamptz) to authenticated;
grant execute on function public.customer_lifetime_stats(uuid, uuid) to authenticated;
grant execute on function public.dashboard_top_services(uuid, timestamptz, int) to authenticated;
