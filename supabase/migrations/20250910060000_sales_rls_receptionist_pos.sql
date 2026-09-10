-- Align POS write RLS with roles that can run checkout in the app.
-- App `pos.sell` can be granted down to RECEPTIONIST via nav/permission overrides,
-- but sales/invoices/payments RLS only allowed OWNER/ADMIN/MANAGER/CASHIER —
-- causing: new row violates row-level security policy for table "sales".

-- sales
drop policy if exists "cashiers_insert_sales" on public.sales;
create policy "cashiers_insert_sales"
  on public.sales for insert to authenticated
  with check (
    public.user_org_role(organization_id) in (
      'OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST'
    )
  );

drop policy if exists "cashiers_update_sales" on public.sales;
create policy "cashiers_update_sales"
  on public.sales for update to authenticated
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

-- sale_items
drop policy if exists "cashiers_insert_sale_items" on public.sale_items;
create policy "cashiers_insert_sale_items"
  on public.sale_items for insert to authenticated
  with check (
    public.user_org_role(organization_id) in (
      'OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST'
    )
  );

drop policy if exists "cashiers_update_sale_items" on public.sale_items;
create policy "cashiers_update_sale_items"
  on public.sale_items for update to authenticated
  using (
    public.user_org_role(organization_id) in (
      'OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST'
    )
  );

drop policy if exists "cashiers_delete_sale_items" on public.sale_items;
create policy "cashiers_delete_sale_items"
  on public.sale_items for delete to authenticated
  using (
    public.user_org_role(organization_id) in (
      'OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST'
    )
  );

-- invoices
drop policy if exists "cashiers_insert_invoices" on public.invoices;
create policy "cashiers_insert_invoices"
  on public.invoices for insert to authenticated
  with check (
    public.user_org_role(organization_id) in (
      'OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST'
    )
  );

-- payments
drop policy if exists "cashiers_insert_payments" on public.payments;
create policy "cashiers_insert_payments"
  on public.payments for insert to authenticated
  with check (
    public.user_org_role(organization_id) in (
      'OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST'
    )
  );
