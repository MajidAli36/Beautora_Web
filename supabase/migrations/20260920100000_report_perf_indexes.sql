-- Speed up report / finance date-range scans
create index if not exists payments_org_paid_at_idx
  on public.payments (organization_id, paid_at desc);

create index if not exists inventory_transactions_org_created_at_idx
  on public.inventory_transactions (organization_id, created_at desc);

create index if not exists sale_refunds_org_created_at_idx
  on public.sale_refunds (organization_id, created_at desc);

create index if not exists sale_items_org_sale_id_idx
  on public.sale_items (organization_id, sale_id);

create index if not exists customers_org_created_at_idx
  on public.customers (organization_id, created_at desc)
  where deleted_at is null;

create index if not exists sales_org_customer_completed_idx
  on public.sales (organization_id, customer_id, completed_at desc)
  where deleted_at is null and customer_id is not null;
