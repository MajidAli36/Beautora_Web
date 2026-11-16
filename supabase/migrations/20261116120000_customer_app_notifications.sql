-- Salon-authored customer-app notifications (shown in the mobile inbox)

create table if not exists public.customer_app_notifications (
  id uuid primary key default gen_random_uuid(),
  customer_app_id uuid not null references public.customer_apps (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  body text not null default '',
  kind text not null default 'announcement'
    check (kind in ('announcement', 'promo', 'rules', 'reminder')),
  is_published boolean not null default false,
  published_at timestamptz,
  expires_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_app_notifications_app_pub_idx
  on public.customer_app_notifications (customer_app_id, is_published, published_at desc);

create trigger customer_app_notifications_set_updated_at
  before update on public.customer_app_notifications
  for each row execute function public.set_updated_at();

alter table public.customer_app_notifications enable row level security;

create policy "org_members_select_customer_app_notifications"
  on public.customer_app_notifications for select to authenticated
  using (
    organization_id in (
      select om.organization_id from public.organization_members om
      where om.user_id = auth.uid()
    )
  );

create policy "org_admins_write_customer_app_notifications"
  on public.customer_app_notifications for all to authenticated
  using (
    organization_id in (
      select om.organization_id from public.organization_members om
      where om.user_id = auth.uid() and om.role in ('OWNER', 'ADMIN')
    )
  )
  with check (
    organization_id in (
      select om.organization_id from public.organization_members om
      where om.user_id = auth.uid() and om.role in ('OWNER', 'ADMIN')
    )
  );
