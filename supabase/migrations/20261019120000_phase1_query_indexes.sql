-- Phase 1 query perf: deposit paid_at scans + open attendance sessions

create index if not exists appointment_deposits_org_paid_at_idx
  on public.appointment_deposits (organization_id, paid_at desc)
  where paid_at is not null;

create index if not exists staff_attendance_org_open_idx
  on public.staff_attendance (organization_id, check_in_at desc)
  where check_out_at is null;
