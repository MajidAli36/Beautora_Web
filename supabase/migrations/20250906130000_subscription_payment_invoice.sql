-- Invoice / payment proof image or PDF for JazzCash submissions.
alter table public.subscription_payments
  add column if not exists invoice_path text,
  add column if not exists invoice_mime text;

comment on column public.subscription_payments.invoice_path is
  'Storage path in subscription-invoices bucket (JazzCash receipt/screenshot).';
comment on column public.subscription_payments.invoice_mime is
  'MIME type of the uploaded invoice file.';
