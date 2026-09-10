-- Country for store location grouping (with city). Nullable for existing rows;
-- onboarding and settings require both going forward.
alter table public.organizations
  add column if not exists country text;

comment on column public.organizations.country is
  'Country for directory grouping and filters (e.g. Pakistan). Pair with city.';

comment on column public.organizations.city is
  'City for store directory search, filters, and country+city grouping.';

-- Prefer Pakistan for existing stores so grouping has a stable country key.
update public.organizations
set country = 'Pakistan'
where country is null or btrim(country) = '';

create index if not exists organizations_country_idx
  on public.organizations (country);

-- Composite index for future country → city grouping / directory filters.
create index if not exists organizations_country_city_idx
  on public.organizations (country, city);
