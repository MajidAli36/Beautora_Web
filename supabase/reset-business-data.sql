-- Wipe ALL public business data. KEEP: auth.users (and auth identities).
-- Removes organizations, partners, memberships, and all salon operational data.
-- After this, existing logins can re-onboard into empty stores (no dummy seed).

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

-- Clear salon/partner onboarding flags so logins can create a fresh empty store.
update auth.users
set raw_user_meta_data = (
  (
    (
      (
        (
          coalesce(raw_user_meta_data, '{}'::jsonb)
          - 'onboarding_completed'
        )
        - 'account_type'
      )
      - 'partner_username'
    )
    - 'partner_status'
  )
  - 'salon_name'
);
