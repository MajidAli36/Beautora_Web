-- Align customer RLS with app permissions:
-- Receptionists (and cashiers) may create/edit customers.
-- Delete stays Manager+.

drop policy if exists "managers_insert_customers" on public.customers;
drop policy if exists "managers_update_customers" on public.customers;
drop policy if exists "members_insert_customers" on public.customers;
drop policy if exists "members_update_customers" on public.customers;

create policy "members_insert_customers"
  on public.customers
  for insert
  to authenticated
  with check (
    public.user_org_role(organization_id) in (
      'OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST'
    )
  );

create policy "members_update_customers"
  on public.customers
  for update
  to authenticated
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
