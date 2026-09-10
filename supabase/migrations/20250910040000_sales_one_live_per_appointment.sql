-- One live (non-void / non-refunded) invoice per appointment.
-- Prevents concurrent POS checkouts from double-billing the same booking.

-- Clean accidental duplicates: keep earliest completed sale, void the rest.
with ranked as (
  select
    id,
    row_number() over (
      partition by appointment_id
      order by completed_at asc nulls last, created_at asc, id asc
    ) as rn
  from public.sales
  where appointment_id is not null
    and deleted_at is null
    and status not in ('VOID', 'REFUNDED')
)
update public.sales s
set
  status = 'VOID',
  void_reason = coalesce(s.void_reason, 'Duplicate appointment invoice — migration cleanup'),
  voided_at = coalesce(s.voided_at, now()),
  deleted_at = coalesce(s.deleted_at, now()),
  updated_at = now()
from ranked r
where s.id = r.id
  and r.rn > 1;

create unique index if not exists sales_one_live_per_appointment_uidx
  on public.sales (appointment_id)
  where appointment_id is not null
    and deleted_at is null
    and status not in ('VOID', 'REFUNDED');

comment on index public.sales_one_live_per_appointment_uidx is
  'At most one live COMPLETED/AMENDED/DRAFT sale per appointment';
