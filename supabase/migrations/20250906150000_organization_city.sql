-- City for public directory search / filters
alter table public.organizations
  add column if not exists city text;

comment on column public.organizations.city is
  'City used for store directory search and filters (e.g. Lahore, Gujranwala).';

create index if not exists organizations_city_idx
  on public.organizations (city);
