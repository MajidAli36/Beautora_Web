-- Partner referral program: apply → admin approve/reject → first paid subscription credited.

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  username text not null,
  email text not null,
  full_name text,
  phone text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  review_notes text,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partners_username_format check (
    username ~ '^[a-z0-9_]{3,32}$'
  )
);

create unique index if not exists partners_username_unique
  on public.partners (lower(username));

create unique index if not exists partners_email_unique
  on public.partners (lower(email));

create unique index if not exists partners_user_id_unique
  on public.partners (user_id)
  where user_id is not null;

create index if not exists partners_status_idx
  on public.partners (status, created_at desc);

create trigger partners_set_updated_at
  before update on public.partners
  for each row execute function public.set_updated_at();

alter table public.organizations
  add column if not exists referred_by_partner_id uuid references public.partners (id) on delete set null,
  add column if not exists referral_code_used text;

create index if not exists organizations_referred_by_partner_idx
  on public.organizations (referred_by_partner_id)
  where referred_by_partner_id is not null;

-- One commission per org: the first approved subscription payment only.
create table if not exists public.partner_commissions (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  subscription_payment_id uuid not null references public.subscription_payments (id) on delete restrict,
  amount_pkr numeric(12, 2) not null,
  currency text not null default 'PKR',
  status text not null default 'earned'
    check (status in ('earned', 'paid', 'void')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_commissions_org_unique unique (organization_id),
  constraint partner_commissions_payment_unique unique (subscription_payment_id)
);

create index if not exists partner_commissions_partner_idx
  on public.partner_commissions (partner_id, created_at desc);

create trigger partner_commissions_set_updated_at
  before update on public.partner_commissions
  for each row execute function public.set_updated_at();

alter table public.partners enable row level security;
alter table public.partner_commissions enable row level security;

-- Partner can read their own application / profile
create policy "partners_select_own"
  on public.partners
  for select
  to authenticated
  using (user_id = auth.uid());

-- Partner can read their commissions
create policy "partner_commissions_select_own"
  on public.partner_commissions
  for select
  to authenticated
  using (
    exists (
      select 1 from public.partners p
      where p.id = partner_id and p.user_id = auth.uid()
    )
  );

comment on table public.partners is
  'Referral partners. Pending until platform admin approves.';
comment on column public.partners.username is
  'Public referral code used as /signup?ref=username';
comment on table public.partner_commissions is
  'First approved subscription payment for a referred store — full amount credited to partner.';
comment on column public.organizations.referred_by_partner_id is
  'Partner who referred this store (set at org creation when code is valid + approved).';
