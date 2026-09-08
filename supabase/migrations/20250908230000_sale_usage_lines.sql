-- Snapshot of in-house products used on a completed sale (source of truth for amend/void/refund).
-- Optional unit label on products for cream/ml/spray vs piece (razor).

alter table public.products
  add column if not exists unit_label text;

comment on column public.products.unit_label is
  'Display unit for stock/usage (e.g. piece, ml, spray, g). Informational only.';

create table if not exists public.sale_usage_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  sale_id uuid not null references public.sales (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  product_name text not null,
  quantity numeric(12, 3) not null check (quantity > 0),
  unit_cost numeric(12, 2) not null default 0,
  unit_label text,
  source text not null default 'RECIPE'
    check (source in ('RECIPE', 'OVERRIDE', 'MANUAL')),
  created_at timestamptz not null default now(),
  unique (sale_id, product_id)
);

create index if not exists sale_usage_lines_org_idx
  on public.sale_usage_lines (organization_id);
create index if not exists sale_usage_lines_sale_idx
  on public.sale_usage_lines (sale_id);
create index if not exists sale_usage_lines_product_idx
  on public.sale_usage_lines (product_id);

alter table public.sale_usage_lines enable row level security;

create policy "members_select_sale_usage_lines"
  on public.sale_usage_lines for select to authenticated
  using (public.is_org_member(organization_id));

create policy "cashiers_insert_sale_usage_lines"
  on public.sale_usage_lines for insert to authenticated
  with check (
    public.user_org_role(organization_id) in (
      'OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST'
    )
  );

create policy "cashiers_update_sale_usage_lines"
  on public.sale_usage_lines for update to authenticated
  using (
    public.user_org_role(organization_id) in (
      'OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST'
    )
  )
  with check (
    public.user_org_role(organization_id) in (
      'OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST'
    )
  );

create policy "managers_delete_sale_usage_lines"
  on public.sale_usage_lines for delete to authenticated
  using (
    public.user_org_role(organization_id) in (
      'OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST'
    )
  );
