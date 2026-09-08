-- Per-salon WhatsApp message templates (thank-you, reminders, etc.)
create table public.whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  body text not null,
  is_default boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint whatsapp_templates_name_len check (char_length(trim(name)) between 1 and 80),
  constraint whatsapp_templates_body_len check (char_length(trim(body)) between 1 and 4000)
);

create index whatsapp_templates_org_idx
  on public.whatsapp_templates (organization_id, sort_order, created_at);

-- At most one default template per organization
create unique index whatsapp_templates_one_default_per_org
  on public.whatsapp_templates (organization_id)
  where is_default;

alter table public.whatsapp_templates enable row level security;

create policy "members_select_whatsapp_templates"
  on public.whatsapp_templates for select to authenticated
  using (public.is_org_member(organization_id));

create policy "staff_insert_whatsapp_templates"
  on public.whatsapp_templates for insert to authenticated
  with check (
    public.user_org_role(organization_id) in ('OWNER', 'ADMIN', 'MANAGER', 'RECEPTIONIST')
  );

create policy "staff_update_whatsapp_templates"
  on public.whatsapp_templates for update to authenticated
  using (
    public.user_org_role(organization_id) in ('OWNER', 'ADMIN', 'MANAGER', 'RECEPTIONIST')
  )
  with check (
    public.user_org_role(organization_id) in ('OWNER', 'ADMIN', 'MANAGER', 'RECEPTIONIST')
  );

create policy "staff_delete_whatsapp_templates"
  on public.whatsapp_templates for delete to authenticated
  using (
    public.user_org_role(organization_id) in ('OWNER', 'ADMIN', 'MANAGER')
  );
