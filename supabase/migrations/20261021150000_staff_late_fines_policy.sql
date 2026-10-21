-- Org-wide late grace policy + per-incident staff fines (waivable).

alter table public.organizations
  add column if not exists late_grace_minutes int not null default 15
    check (late_grace_minutes >= 0 and late_grace_minutes <= 240),
  add column if not exists late_allowed_days_per_month int not null default 3
    check (late_allowed_days_per_month >= 0 and late_allowed_days_per_month <= 31),
  add column if not exists late_fine_amount numeric(12, 2) not null default 0
    check (late_fine_amount >= 0),
  add column if not exists default_duty_start time default '10:00',
  add column if not exists default_duty_end time default '20:00';

create type public.staff_fine_status as enum ('OPEN', 'WAIVED', 'APPLIED');
create type public.staff_fine_reason as enum (
  'LATE',
  'ABSENCE',
  'HALF_DAY',
  'OTHER'
);

create table public.staff_fines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  staff_id uuid not null references public.staff (id) on delete cascade,
  work_date date not null,
  reason public.staff_fine_reason not null default 'LATE',
  amount numeric(12, 2) not null check (amount >= 0),
  status public.staff_fine_status not null default 'OPEN',
  minutes_late int,
  grace_minutes int,
  notes text,
  payroll_run_id uuid references public.payroll_runs (id) on delete set null,
  waived_by uuid references auth.users (id) on delete set null,
  waived_at timestamptz,
  waive_note text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (staff_id, work_date, reason)
);

create index staff_fines_org_date_idx
  on public.staff_fines (organization_id, work_date desc);
create index staff_fines_staff_status_idx
  on public.staff_fines (staff_id, status);

alter table public.staff_fines enable row level security;

create policy "members_select_staff_fines"
  on public.staff_fines for select to authenticated
  using (public.is_org_member(organization_id));

create policy "managers_manage_staff_fines"
  on public.staff_fines for all to authenticated
  using (public.user_org_role(organization_id) in ('OWNER', 'ADMIN', 'MANAGER'))
  with check (public.user_org_role(organization_id) in ('OWNER', 'ADMIN', 'MANAGER'));

create trigger staff_fines_set_updated_at
  before update on public.staff_fines
  for each row execute function public.set_updated_at();
