-- Store-level switch: allow public online booking (independent of public store listing).
alter table public.organizations
  add column if not exists public_booking_enabled boolean not null default true;

comment on column public.organizations.public_booking_enabled is
  'When false, public Book buttons and /book/[slug] are unavailable. Store listing can stay visible.';
