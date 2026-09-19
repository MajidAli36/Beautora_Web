-- Let RECEPTIONIST (and other floor roles) write catalog / ops tables.
-- App defaults now grant create/edit to Receptionist; RLS was still MANAGER-only.

-- Shared role set for floor write access
-- (OWNER/ADMIN/MANAGER/CASHIER/RECEPTIONIST — STAFF stays read-oriented)

-- customers (delete was still managers-only; insert/update already opened earlier)
drop policy if exists "managers_delete_customers" on public.customers;
drop policy if exists "members_delete_customers" on public.customers;
create policy "members_delete_customers"
  on public.customers for delete to authenticated
  using (
    public.user_org_role(organization_id) in (
      'OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST'
    )
  );

-- appointments delete
drop policy if exists "managers_delete_appointments" on public.appointments;
create policy "members_delete_appointments"
  on public.appointments for delete to authenticated
  using (
    public.user_org_role(organization_id) in (
      'OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST'
    )
  );

-- service categories
drop policy if exists "managers_insert_service_categories" on public.service_categories;
drop policy if exists "managers_update_service_categories" on public.service_categories;
drop policy if exists "managers_delete_service_categories" on public.service_categories;
create policy "members_insert_service_categories"
  on public.service_categories for insert to authenticated
  with check (public.is_org_member(organization_id));
create policy "members_update_service_categories"
  on public.service_categories for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "members_delete_service_categories"
  on public.service_categories for delete to authenticated
  using (public.is_org_member(organization_id));

-- services
drop policy if exists "managers_insert_services" on public.services;
drop policy if exists "managers_update_services" on public.services;
drop policy if exists "managers_delete_services" on public.services;
create policy "members_insert_services"
  on public.services for insert to authenticated
  with check (public.is_org_member(organization_id));
create policy "members_update_services"
  on public.services for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "members_delete_services"
  on public.services for delete to authenticated
  using (public.is_org_member(organization_id));

-- packages
drop policy if exists "managers_insert_packages" on public.packages;
drop policy if exists "managers_update_packages" on public.packages;
drop policy if exists "managers_delete_packages" on public.packages;
drop policy if exists "managers_insert_package_items" on public.package_items;
drop policy if exists "managers_update_package_items" on public.package_items;
drop policy if exists "managers_delete_package_items" on public.package_items;
create policy "members_insert_packages"
  on public.packages for insert to authenticated
  with check (public.is_org_member(organization_id));
create policy "members_update_packages"
  on public.packages for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "members_delete_packages"
  on public.packages for delete to authenticated
  using (public.is_org_member(organization_id));
create policy "members_insert_package_items"
  on public.package_items for insert to authenticated
  with check (public.is_org_member(organization_id));
create policy "members_update_package_items"
  on public.package_items for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "members_delete_package_items"
  on public.package_items for delete to authenticated
  using (public.is_org_member(organization_id));

-- product categories + products
drop policy if exists "managers_insert_product_categories" on public.product_categories;
drop policy if exists "managers_update_product_categories" on public.product_categories;
drop policy if exists "managers_delete_product_categories" on public.product_categories;
drop policy if exists "managers_insert_products" on public.products;
drop policy if exists "managers_update_products" on public.products;
drop policy if exists "managers_delete_products" on public.products;
create policy "members_insert_product_categories"
  on public.product_categories for insert to authenticated
  with check (public.is_org_member(organization_id));
create policy "members_update_product_categories"
  on public.product_categories for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "members_delete_product_categories"
  on public.product_categories for delete to authenticated
  using (public.is_org_member(organization_id));
create policy "members_insert_products"
  on public.products for insert to authenticated
  with check (public.is_org_member(organization_id));
create policy "members_update_products"
  on public.products for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "members_delete_products"
  on public.products for delete to authenticated
  using (public.is_org_member(organization_id));

-- service ↔ product recipes
drop policy if exists "managers_insert_service_product_usage" on public.service_product_usage;
drop policy if exists "managers_update_service_product_usage" on public.service_product_usage;
drop policy if exists "managers_delete_service_product_usage" on public.service_product_usage;
create policy "members_insert_service_product_usage"
  on public.service_product_usage for insert to authenticated
  with check (public.is_org_member(organization_id));
create policy "members_update_service_product_usage"
  on public.service_product_usage for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "members_delete_service_product_usage"
  on public.service_product_usage for delete to authenticated
  using (public.is_org_member(organization_id));

-- chairs
drop policy if exists "managers_insert_chairs" on public.chairs;
drop policy if exists "managers_update_chairs" on public.chairs;
drop policy if exists "managers_delete_chairs" on public.chairs;
create policy "members_insert_chairs"
  on public.chairs for insert to authenticated
  with check (public.is_org_member(organization_id));
create policy "members_update_chairs"
  on public.chairs for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "members_delete_chairs"
  on public.chairs for delete to authenticated
  using (public.is_org_member(organization_id));

-- inventory adjustments (stock in / adjust / out)
drop policy if exists "cashiers_insert_inventory_out" on public.inventory_transactions;
drop policy if exists "managers_insert_inventory_in_adjust" on public.inventory_transactions;
drop policy if exists "members_insert_inventory_in_adjust" on public.inventory_transactions;
create policy "members_insert_inventory_transactions"
  on public.inventory_transactions for insert to authenticated
  with check (
    public.is_org_member(organization_id)
    and type in ('IN', 'OUT', 'ADJUSTMENT')
  );

-- devices
drop policy if exists "managers_insert_devices" on public.devices;
drop policy if exists "managers_update_devices" on public.devices;
drop policy if exists "managers_delete_devices" on public.devices;
create policy "members_insert_devices"
  on public.devices for insert to authenticated
  with check (public.is_org_member(organization_id));
create policy "members_update_devices"
  on public.devices for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "members_delete_devices"
  on public.devices for delete to authenticated
  using (public.is_org_member(organization_id));

-- expenses / staff payments / staff notes
drop policy if exists "managers_insert_expenses" on public.expenses;
drop policy if exists "managers_update_expenses" on public.expenses;
drop policy if exists "managers_delete_expenses" on public.expenses;
create policy "members_insert_expenses"
  on public.expenses for insert to authenticated
  with check (public.is_org_member(organization_id));
create policy "members_update_expenses"
  on public.expenses for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "members_delete_expenses"
  on public.expenses for delete to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists "managers_insert_staff_payments" on public.staff_payments;
drop policy if exists "managers_delete_staff_payments" on public.staff_payments;
create policy "members_insert_staff_payments"
  on public.staff_payments for insert to authenticated
  with check (public.is_org_member(organization_id));
create policy "members_delete_staff_payments"
  on public.staff_payments for delete to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists "managers_insert_staff_notes" on public.staff_notes;
drop policy if exists "managers_delete_staff_notes" on public.staff_notes;
create policy "members_insert_staff_notes"
  on public.staff_notes for insert to authenticated
  with check (public.is_org_member(organization_id));
create policy "members_delete_staff_notes"
  on public.staff_notes for delete to authenticated
  using (public.is_org_member(organization_id));

-- sale amend / void / refund supporting tables
drop policy if exists "managers_void_sales" on public.sales;
create policy "members_void_sales"
  on public.sales for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

drop policy if exists "managers_insert_sale_versions" on public.sale_versions;
drop policy if exists "managers_insert_sale_version_items" on public.sale_version_items;
drop policy if exists "managers_insert_sale_refunds" on public.sale_refunds;
create policy "members_insert_sale_versions"
  on public.sale_versions for insert to authenticated
  with check (public.is_org_member(organization_id));
create policy "members_insert_sale_version_items"
  on public.sale_version_items for insert to authenticated
  with check (public.is_org_member(organization_id));
create policy "members_insert_sale_refunds"
  on public.sale_refunds for insert to authenticated
  with check (public.is_org_member(organization_id));

drop policy if exists "managers_delete_sale_usage_lines" on public.sale_usage_lines;
create policy "members_delete_sale_usage_lines"
  on public.sale_usage_lines for delete to authenticated
  using (public.is_org_member(organization_id));

-- store payment accounts (settings)
drop policy if exists "admins_insert_payment_accounts" on public.organization_payment_accounts;
drop policy if exists "admins_update_payment_accounts" on public.organization_payment_accounts;
drop policy if exists "admins_delete_payment_accounts" on public.organization_payment_accounts;
drop policy if exists "managers_insert_store_payment_accounts" on public.organization_payment_accounts;
drop policy if exists "managers_update_store_payment_accounts" on public.organization_payment_accounts;
drop policy if exists "managers_delete_store_payment_accounts" on public.organization_payment_accounts;
create policy "members_insert_payment_accounts"
  on public.organization_payment_accounts for insert to authenticated
  with check (public.is_org_member(organization_id));
create policy "members_update_payment_accounts"
  on public.organization_payment_accounts for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "members_delete_payment_accounts"
  on public.organization_payment_accounts for delete to authenticated
  using (public.is_org_member(organization_id));

-- org profile / settings updates
drop policy if exists "owners_admins_update_organizations" on public.organizations;
create policy "members_update_organizations"
  on public.organizations for update to authenticated
  using (public.is_org_member(id))
  with check (public.is_org_member(id));
