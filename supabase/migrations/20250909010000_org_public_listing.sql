-- Whether this salon appears on the public marketing site (/stores, homepage) and /book/[slug].
alter table public.organizations
  add column if not exists public_listing_enabled boolean not null default true;

comment on column public.organizations.public_listing_enabled is
  'When true, the salon is listed on the public site and accepting public online booking URLs.';
