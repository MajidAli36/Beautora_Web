-- Marketplace product media + seller payment preferences (additive)

alter table public.marketplace_products
  add column if not exists description_html text;

alter table public.marketplace_products
  add column if not exists reel_video_url text;

alter table public.marketplace_products
  add column if not exists reel_video_path text;

alter table public.marketplace_products
  add column if not exists video_path text;

alter table public.marketplace_products
  add column if not exists media_bytes_total bigint not null default 0
    check (media_bytes_total >= 0 and media_bytes_total <= 104857600);

alter table public.marketplace_product_images
  add column if not exists storage_path text;

alter table public.marketplace_product_images
  add column if not exists byte_size bigint not null default 0 check (byte_size >= 0);

alter table public.marketplace_sellers
  add column if not exists accepts_cod boolean not null default true;

alter table public.marketplace_sellers
  add column if not exists accepts_card boolean not null default false;

alter table public.marketplace_sellers
  add column if not exists invoice_email text;

alter table public.marketplace_sellers
  add column if not exists account_email text;

comment on column public.marketplace_products.media_bytes_total is
  'Sum of image + video + reel bytes; hard cap 100 MiB per product.';

comment on column public.marketplace_products.reel_video_url is
  'Vertical reel URL for Beautora /videos TikTok-style feed.';
