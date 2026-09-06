-- Beautora store subscription: 1-month trial, 3-day grace, manual JazzCash renewals

alter table public.organizations
  add column if not exists trial_ends_at timestamptz,
  add column if not exists subscription_ends_at timestamptz,
  add column if not exists subscription_locked_at timestamptz,
  add column if not exists subscription_status text not null default 'trial';

-- Backfill existing stores: 30-day trial from created_at
update public.organizations
set
  trial_ends_at = coalesce(trial_ends_at, created_at + interval '30 days'),
  subscription_status = coalesce(nullif(subscription_status, ''), 'trial')
where trial_ends_at is null;

alter table public.organizations
  alter column trial_ends_at set default (now() + interval '30 days');

create table if not exists public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  amount numeric(12, 2) not null default 3000,
  currency text not null default 'PKR',
  jazzcash_number text not null default '03226400409',
  transaction_ref text not null,
  payer_name text,
  notes text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  submitted_by uuid references auth.users (id) on delete set null,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscription_payments_org_idx
  on public.subscription_payments (organization_id, created_at desc);

create index if not exists subscription_payments_status_idx
  on public.subscription_payments (status, created_at desc);

create trigger subscription_payments_set_updated_at
  before update on public.subscription_payments
  for each row execute function public.set_updated_at();

alter table public.subscription_payments enable row level security;

-- Members can read their org payments
create policy "members_select_subscription_payments"
  on public.subscription_payments
  for select
  to authenticated
  using (public.is_org_member(organization_id));

-- Owners/admins can submit payment claims
create policy "owners_admins_insert_subscription_payments"
  on public.subscription_payments
  for insert
  to authenticated
  with check (
    public.user_org_role(organization_id) in ('OWNER', 'ADMIN')
    and submitted_by = auth.uid()
    and status = 'pending'
  );
