-- Seller COD terms + card payment information (additive)

alter table public.marketplace_sellers
  add column if not exists cod_terms text;

alter table public.marketplace_sellers
  add column if not exists cod_prep_note text;

alter table public.marketplace_sellers
  add column if not exists card_instructions text;

alter table public.marketplace_sellers
  add column if not exists card_account_title text;

alter table public.marketplace_sellers
  add column if not exists card_account_number text;

alter table public.marketplace_sellers
  add column if not exists card_bank_name text;

alter table public.marketplace_sellers
  add column if not exists card_networks text;

comment on column public.marketplace_sellers.cod_terms is
  'Buyer-facing COD terms shown at checkout / invoice context.';

comment on column public.marketplace_sellers.card_account_number is
  'Bank / JazzCash / EasyPaisa / wallet number for card or online transfers.';
