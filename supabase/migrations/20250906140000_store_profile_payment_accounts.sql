-- Store public profile (used on online booking + storefront)
alter table public.organizations
  add column if not exists tagline text,
  add column if not exists address text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists logo_path text,
  add column if not exists cover_path text,
  add column if not exists arrival_notes text,
  add column if not exists business_hours jsonb;

comment on column public.organizations.tagline is 'Short line under salon name on booking page';
comment on column public.organizations.address is 'Public address shown on booking';
comment on column public.organizations.phone is 'Public phone (may differ from WhatsApp)';
comment on column public.organizations.logo_path is 'Storage path in store-assets bucket';
comment on column public.organizations.cover_path is 'Optional cover photo path in store-assets';
comment on column public.organizations.arrival_notes is 'Before-you-arrive tips (newline-separated or free text)';
comment on column public.organizations.business_hours is
  'JSON array of { day, label, closed, open, close } for Mon–Sun';

-- Multiple JazzCash / EasyPaisa / bank accounts for online booking deposits
create table if not exists public.organization_payment_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  account_type text not null
    check (account_type in ('JAZZCASH', 'EASYPAISA', 'BANK', 'OTHER')),
  label text not null,
  account_title text,
  account_number text not null,
  bank_name text,
  extra_note text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organization_payment_accounts_org_idx
  on public.organization_payment_accounts (organization_id, sort_order, created_at);

create trigger organization_payment_accounts_set_updated_at
  before update on public.organization_payment_accounts
  for each row execute function public.set_updated_at();

alter table public.organization_payment_accounts enable row level security;

create policy "members_select_payment_accounts"
  on public.organization_payment_accounts
  for select
  to authenticated
  using (public.is_org_member(organization_id));

create policy "admins_insert_payment_accounts"
  on public.organization_payment_accounts
  for insert
  to authenticated
  with check (public.user_org_role(organization_id) in ('OWNER', 'ADMIN', 'MANAGER'));

create policy "admins_update_payment_accounts"
  on public.organization_payment_accounts
  for update
  to authenticated
  using (public.user_org_role(organization_id) in ('OWNER', 'ADMIN', 'MANAGER'))
  with check (public.user_org_role(organization_id) in ('OWNER', 'ADMIN', 'MANAGER'));

create policy "admins_delete_payment_accounts"
  on public.organization_payment_accounts
  for delete
  to authenticated
  using (public.user_org_role(organization_id) in ('OWNER', 'ADMIN', 'MANAGER'));
