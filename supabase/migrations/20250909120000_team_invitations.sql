-- Team invitations: admin invites staff by email → recipient accepts → account created.
-- Pending invites reserve the email so it cannot be used for salon or partner signup.

create table if not exists public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  role public.member_role not null
    check (role in ('ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST', 'STAFF')),
  token_hash text not null,
  invited_by uuid references auth.users (id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_invitations_email_format check (email = lower(email))
);

create unique index if not exists team_invitations_token_hash_unique
  on public.team_invitations (token_hash);

-- One pending invite per org + email
create unique index if not exists team_invitations_org_email_pending_unique
  on public.team_invitations (organization_id, email)
  where status = 'pending';

-- Any pending invite reserves the email globally (blocks salon/partner signup)
create unique index if not exists team_invitations_email_pending_unique
  on public.team_invitations (email)
  where status = 'pending';

create index if not exists team_invitations_org_status_idx
  on public.team_invitations (organization_id, status, created_at desc);

create trigger team_invitations_set_updated_at
  before update on public.team_invitations
  for each row execute function public.set_updated_at();

alter table public.team_invitations enable row level security;

create policy "admins_select_team_invitations"
  on public.team_invitations
  for select
  to authenticated
  using (
    public.user_org_role(organization_id) in ('OWNER', 'ADMIN')
  );

create policy "admins_insert_team_invitations"
  on public.team_invitations
  for insert
  to authenticated
  with check (
    public.user_org_role(organization_id) in ('OWNER', 'ADMIN')
  );

create policy "admins_update_team_invitations"
  on public.team_invitations
  for update
  to authenticated
  using (
    public.user_org_role(organization_id) in ('OWNER', 'ADMIN')
  )
  with check (
    public.user_org_role(organization_id) in ('OWNER', 'ADMIN')
  );

create policy "admins_delete_team_invitations"
  on public.team_invitations
  for delete
  to authenticated
  using (
    public.user_org_role(organization_id) in ('OWNER', 'ADMIN')
  );

comment on table public.team_invitations is
  'Pending staff dashboard invites. Email is reserved until accepted, revoked, or expired.';
