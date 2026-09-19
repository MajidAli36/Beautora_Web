-- Align staff write RLS with store members who can manage the floor.
-- App can grant staff.create/edit to RECEPTIONIST (and others), but RLS only allowed
-- OWNER/ADMIN/MANAGER — causing:
--   new row violates row-level security policy for table "staff"

-- staff profiles
drop policy if exists "managers_insert_staff" on public.staff;
create policy "members_insert_staff"
  on public.staff for insert to authenticated
  with check (public.is_org_member(organization_id));

drop policy if exists "managers_update_staff" on public.staff;
create policy "members_update_staff"
  on public.staff for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

drop policy if exists "managers_delete_staff" on public.staff;
create policy "members_delete_staff"
  on public.staff for delete to authenticated
  using (public.is_org_member(organization_id));

-- staff schedules (same gap when saving weekly hours)
drop policy if exists "managers_manage_staff_schedules" on public.staff_schedules;
create policy "members_manage_staff_schedules"
  on public.staff_schedules for all to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
