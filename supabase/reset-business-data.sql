-- Full reset for clean live testing.
-- KEEP only: platform admin auth user (admin@syncops.tech)
-- REMOVE: all public business data + every other auth user (salon owners, partners, staff logins)

do $$
declare
  t text;
  wipe text[] := array[
    'sale_usage_lines',
    'sale_version_items',
    'sale_versions',
    'sale_refunds',
    'sale_staff',
    'sale_items',
    'payments',
    'invoices',
    'sales',
    'inventory_transactions',
    'appointment_services',
    'appointment_deposits',
    'appointments',
    'queue_tokens',
    'chairs',
    'staff_attendance',
    'staff_payments',
    'staff_notes',
    'staff_schedules',
    'staff',
    'service_product_usage',
    'package_items',
    'packages',
    'products',
    'product_categories',
    'services',
    'service_categories',
    'customers',
    'device_commands',
    'devices',
    'expenses',
    'whatsapp_messages',
    'whatsapp_templates',
    'customer_feedback',
    'audit_logs',
    'partner_commissions',
    'subscription_payments',
    'organization_payment_accounts',
    'organization_members',
    'team_invitations',
    'organizations',
    'partners'
  ];
begin
  foreach t in array wipe loop
    if to_regclass('public.' || t) is not null then
      execute format('truncate table public.%I restart identity cascade', t);
      raise notice 'truncated %', t;
    end if;
  end loop;
end $$;

-- Delete every auth user except the SyncOps platform admin.
-- Cascades clear identities / sessions / refresh tokens for those users.
delete from auth.users
where lower(coalesce(email, '')) <> lower('admin@syncops.tech');

-- Ensure remaining platform admin metadata stays correct for /platform login.
update auth.users
set
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object(
      'account_type', 'platform_admin',
      'full_name', 'Beautora Platform Admin'
    )
where lower(email) = lower('admin@syncops.tech');
