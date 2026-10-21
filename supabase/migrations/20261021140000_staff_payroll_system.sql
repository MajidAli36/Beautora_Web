-- Flexible staff compensation + monthly payroll runs (monthly salary & hourly wage).

create type public.staff_pay_type as enum ('MONTHLY', 'HOURLY');
create type public.staff_salary_policy as enum ('FIXED', 'ATTENDANCE_ADJUSTED');
create type public.payroll_run_status as enum ('DRAFT', 'REVIEWED', 'APPROVED', 'PAID');

-- Compensation config on staff profiles
alter table public.staff
  add column if not exists employee_code text,
  add column if not exists department text,
  add column if not exists pay_type public.staff_pay_type,
  add column if not exists monthly_salary numeric(12, 2) check (monthly_salary is null or monthly_salary >= 0),
  add column if not exists hourly_rate numeric(12, 2) check (hourly_rate is null or hourly_rate >= 0),
  add column if not exists expected_hours_per_day numeric(4, 2) not null default 8
    check (expected_hours_per_day > 0 and expected_hours_per_day <= 24),
  add column if not exists expected_days_per_week numeric(3, 1) not null default 6
    check (expected_days_per_week > 0 and expected_days_per_week <= 7),
  add column if not exists break_minutes_per_day int not null default 0
    check (break_minutes_per_day >= 0 and break_minutes_per_day <= 480),
  add column if not exists break_paid boolean not null default false,
  add column if not exists overtime_eligible boolean not null default false,
  add column if not exists overtime_multiplier numeric(4, 2) not null default 1.5
    check (overtime_multiplier >= 1),
  add column if not exists salary_policy public.staff_salary_policy not null default 'FIXED',
  add column if not exists weekly_off_days int[] not null default '{0}',
  add column if not exists schedule_start_time time,
  add column if not exists schedule_end_time time,
  add column if not exists salary_effective_from date,
  add column if not exists hired_on date,
  add column if not exists left_on date;

create unique index if not exists staff_org_employee_code_uidx
  on public.staff (organization_id, employee_code)
  where employee_code is not null and deleted_at is null;

-- Audit trail for salary / compensation changes
create table public.staff_salary_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  staff_id uuid not null references public.staff (id) on delete cascade,
  pay_type public.staff_pay_type,
  monthly_salary numeric(12, 2),
  hourly_rate numeric(12, 2),
  expected_hours_per_day numeric(4, 2),
  expected_days_per_week numeric(3, 1),
  break_minutes_per_day int,
  break_paid boolean,
  overtime_eligible boolean,
  overtime_multiplier numeric(4, 2),
  salary_policy public.staff_salary_policy,
  weekly_off_days int[],
  effective_from date not null default current_date,
  changed_by uuid references auth.users (id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create index staff_salary_history_staff_idx
  on public.staff_salary_history (staff_id, effective_from desc);

alter table public.staff_salary_history enable row level security;

create policy "members_select_staff_salary_history"
  on public.staff_salary_history for select to authenticated
  using (public.is_org_member(organization_id));

create policy "managers_insert_staff_salary_history"
  on public.staff_salary_history for insert to authenticated
  with check (
    public.user_org_role(organization_id) in ('OWNER', 'ADMIN', 'MANAGER')
  );

-- Attendance session enrichments (breaks / approval / lock for payroll)
alter table public.staff_attendance
  add column if not exists break_minutes int not null default 0
    check (break_minutes >= 0 and break_minutes <= 1440),
  add column if not exists approved boolean not null default true,
  add column if not exists locked boolean not null default false,
  add column if not exists corrected_by uuid references auth.users (id) on delete set null,
  add column if not exists corrected_at timestamptz,
  add column if not exists correction_note text;

-- Day-level attendance status overrides (leave / holiday / manual absent)
create type public.attendance_day_status as enum (
  'PRESENT',
  'ABSENT',
  'LATE',
  'HALF_DAY',
  'ON_LEAVE',
  'HOLIDAY',
  'WEEKLY_OFF'
);

create table public.staff_attendance_days (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  staff_id uuid not null references public.staff (id) on delete cascade,
  work_date date not null,
  status public.attendance_day_status not null,
  payable_hours numeric(6, 2),
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (staff_id, work_date)
);

create index staff_attendance_days_org_date_idx
  on public.staff_attendance_days (organization_id, work_date desc);

alter table public.staff_attendance_days enable row level security;

create policy "members_select_staff_attendance_days"
  on public.staff_attendance_days for select to authenticated
  using (public.is_org_member(organization_id));

create policy "managers_manage_staff_attendance_days"
  on public.staff_attendance_days for all to authenticated
  using (public.user_org_role(organization_id) in ('OWNER', 'ADMIN', 'MANAGER', 'RECEPTIONIST'))
  with check (public.user_org_role(organization_id) in ('OWNER', 'ADMIN', 'MANAGER', 'RECEPTIONIST'));

-- Monthly payroll runs
create table public.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  period_year int not null check (period_year between 2000 and 2100),
  period_month int not null check (period_month between 1 and 12),
  period_start date not null,
  period_end date not null,
  status public.payroll_run_status not null default 'DRAFT',
  total_gross numeric(14, 2) not null default 0,
  total_deductions numeric(14, 2) not null default 0,
  total_net numeric(14, 2) not null default 0,
  total_regular_hours numeric(12, 2) not null default 0,
  total_overtime_hours numeric(12, 2) not null default 0,
  staff_count int not null default 0,
  notes text,
  generated_by uuid references auth.users (id) on delete set null,
  reviewed_by uuid references auth.users (id) on delete set null,
  approved_by uuid references auth.users (id) on delete set null,
  paid_by uuid references auth.users (id) on delete set null,
  generated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, period_year, period_month)
);

create index payroll_runs_org_period_idx
  on public.payroll_runs (organization_id, period_year desc, period_month desc);

alter table public.payroll_runs enable row level security;

create policy "members_select_payroll_runs"
  on public.payroll_runs for select to authenticated
  using (public.is_org_member(organization_id));

create policy "managers_manage_payroll_runs"
  on public.payroll_runs for all to authenticated
  using (public.user_org_role(organization_id) in ('OWNER', 'ADMIN', 'MANAGER'))
  with check (public.user_org_role(organization_id) in ('OWNER', 'ADMIN', 'MANAGER'));

create table public.payroll_run_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  payroll_run_id uuid not null references public.payroll_runs (id) on delete cascade,
  staff_id uuid not null references public.staff (id) on delete restrict,
  pay_type public.staff_pay_type not null,
  salary_policy public.staff_salary_policy,
  base_rate numeric(12, 2) not null default 0,
  days_present numeric(6, 2) not null default 0,
  days_absent numeric(6, 2) not null default 0,
  days_leave numeric(6, 2) not null default 0,
  expected_working_days numeric(6, 2) not null default 0,
  regular_hours numeric(10, 2) not null default 0,
  overtime_hours numeric(10, 2) not null default 0,
  regular_earnings numeric(12, 2) not null default 0,
  overtime_earnings numeric(12, 2) not null default 0,
  other_earnings numeric(12, 2) not null default 0,
  gross_earnings numeric(12, 2) not null default 0,
  advances numeric(12, 2) not null default 0,
  other_deductions numeric(12, 2) not null default 0,
  total_deductions numeric(12, 2) not null default 0,
  net_pay numeric(12, 2) not null default 0,
  payment_id uuid references public.staff_payments (id) on delete set null,
  breakdown jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (payroll_run_id, staff_id)
);

create index payroll_run_lines_run_idx on public.payroll_run_lines (payroll_run_id);
create index payroll_run_lines_staff_idx on public.payroll_run_lines (staff_id);

alter table public.payroll_run_lines enable row level security;

create policy "members_select_payroll_run_lines"
  on public.payroll_run_lines for select to authenticated
  using (public.is_org_member(organization_id));

create policy "managers_manage_payroll_run_lines"
  on public.payroll_run_lines for all to authenticated
  using (public.user_org_role(organization_id) in ('OWNER', 'ADMIN', 'MANAGER'))
  with check (public.user_org_role(organization_id) in ('OWNER', 'ADMIN', 'MANAGER'));

create trigger payroll_runs_set_updated_at
  before update on public.payroll_runs
  for each row execute function public.set_updated_at();
