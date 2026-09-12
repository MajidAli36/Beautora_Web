-- Dual subscription payment methods: JazzCash (PK) + USDT BEP-20 (international)

alter table public.subscription_payments
  add column if not exists payment_method text not null default 'jazzcash';

alter table public.subscription_payments
  drop constraint if exists subscription_payments_payment_method_check;

alter table public.subscription_payments
  add constraint subscription_payments_payment_method_check
  check (payment_method in ('jazzcash', 'usdt_bep20'));

comment on column public.subscription_payments.payment_method is
  'jazzcash for Pakistan PKR; usdt_bep20 for international USD USDT (BEP-20)';

comment on column public.subscription_payments.jazzcash_number is
  'Payment destination: JazzCash mobile number OR USDT BEP-20 wallet address';
