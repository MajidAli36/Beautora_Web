-- Seller contact phone for marketplace moderation / outreach
alter table public.marketplace_sellers
  add column if not exists phone text;

comment on column public.marketplace_sellers.phone is
  'Seller contact phone collected at registration (required for new sellers).';
