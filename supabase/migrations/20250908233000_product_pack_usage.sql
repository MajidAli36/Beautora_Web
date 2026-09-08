-- Pack size + suggested use-per-client for easy in-house setup (e.g. 50ml tube, 5ml per client).

alter table public.products
  add column if not exists pack_size numeric(12, 3);

alter table public.products
  add column if not exists default_usage_qty numeric(12, 3);

comment on column public.products.pack_size is
  'Size of one purchased pack/bottle in unit_label units (e.g. 50 for a 50ml cream).';

comment on column public.products.default_usage_qty is
  'Suggested quantity per service/client in unit_label units (e.g. 5 ml). Used when linking to a service recipe.';

alter table public.products
  drop constraint if exists products_pack_size_check;
alter table public.products
  add constraint products_pack_size_check
  check (pack_size is null or pack_size > 0);

alter table public.products
  drop constraint if exists products_default_usage_qty_check;
alter table public.products
  add constraint products_default_usage_qty_check
  check (default_usage_qty is null or default_usage_qty > 0);
