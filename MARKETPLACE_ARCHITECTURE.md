# Beautora Marketplace — Architecture (Phase 1)

> **Status:** Analysis complete. **No production code changes in this phase.**  
> **Date:** 2026-09-21  
> **Principle:** Extend the existing MVP; do not rewrite Beautora or duplicate salon POS / booking engines.

---

## 1. Existing architecture (what Beautora already has)

### 1.1 Dual-product workspace

| Surface | Purpose | Isolation |
|---------|---------|-----------|
| **Salon SaaS** | Booking, POS, CRM, inventory, reports, finances, WhatsApp, billing | Org-scoped via `organization_members` + RLS |
| **Marketplace (MVP)** | Multi-vendor product shop (COD) | Separate `marketplace_*` tables; optional link to org |

**Intent routing** (`lib/auth/account-types.ts`):

- `product_intent`: `marketplace` | `salon_pos` | `both`
- Cookie `beautora_app_mode`: `saas` | `marketplace`
- Shoppers (`account_type: customer`) land on `/shop` (middleware)

### 1.2 Existing marketplace schema (MVP)

Migration: `supabase/migrations/20260912120000_marketplace_mvp.sql`  
Phone: `20260921120000_marketplace_seller_phone.sql`

| Table | Role |
|-------|------|
| `marketplace_sellers` | Shop profile (`user_id`, optional `organization_id`, `shop_name`, `slug`, `bio`, `phone`, `status`: pending/approved/suspended) |
| `marketplace_categories` | Catalog categories (seeded) |
| `marketplace_products` | Seller catalog (`status`: draft/pending/published/rejected, price, stock, single `image_url`) |
| `marketplace_orders` | COD orders (buyer name/phone/address; **no `buyer_user_id`**) |
| `marketplace_order_items` | Line items (multi-seller capable on one order) |
| `marketplace_commissions` | Accrued on `delivered` (rate currently hardcoded 10%) |
| `marketplace_payouts` | Manual “mark paid” batches |
| `marketplace_reviews` | Product reviews (open insert; hide via platform) |

**Not shared with:** salon POS `products`, `sales`, `subscription_payments`, `partner_commissions`.

### 1.3 Existing marketplace routes

| Route | Role |
|-------|------|
| `/shop` | Public catalog + cart + COD checkout |
| `/marketplace/*` | Seller dashboard (products, inventory, orders, payouts, reviews, settings) |
| `/platform` | Platform seller/product/commission/review moderation |
| `/stores`, `/book` | **Salon directory & booking** — not marketplace retail |

### 1.4 Reusable non-marketplace systems

| System | Reuse for marketplace |
|--------|------------------------|
| `organizations` + public listing | Salon marketplace *storefront* (services + profile); seller retail stays on `marketplace_sellers` |
| Appointments / `createOnlineBooking` | Marketplace service booking — **reuse engine**, no second scheduler |
| Auth + account types | Shopper vs owner; seller registration |
| Partner ref (`beautora_partner_ref`) | Keep for **salon owner** signup attribution; extend later for partner marketplace commissions |
| SEO (`lib/seo/*`) | Product/salon/service public pages |
| Email (Resend) | Order/booking notifications |
| Platform admin | Expand `/platform` marketplace panel → full admin marketplace |
| RLS helpers | `is_org_member`, `is_marketplace_seller_owner` |

### 1.5 What the MVP already does well

- Seller registration + platform approve/suspend  
- Product draft → pending → publish/reject  
- Client cart (`localStorage`) + COD checkout  
- Multi-seller line items on one order  
- Commission accrual on delivery + manual payouts  
- Free listing today (no listing fee); commission exists but can be set to 0%

### 1.6 Critical MVP gaps (vs your target)

- No salon marketplace storefront (services + products under one public URL)  
- No product variants, brands, multi-image, SEO PDP routes  
- No buyer account (`/account`, order history, wishlist, addresses)  
- No per-seller sub-orders / independent fulfillment  
- No payment provider abstraction (COD only)  
- Commission hardcoded (`MARKETPLACE_COMMISSION_RATE = 0.1`) — not admin-configurable  
- No ledger (`SellerBalance` / transactions) — balances are derived  
- No wishlist, coupons, featured listings, search index  
- Order status is **whole-order** (any seller can move shared status)  
- Reviews not purchase-verified  

---

## 2. Target business rules (launch)

| Rule | Launch value | Later |
|------|--------------|-------|
| Listing fee | `0` | Configurable |
| Default commission | `0%` (or keep current 10% but make configurable; **recommend 0% for “free launch”**) | Global / category / seller / product override |
| Salon storefront | Free | Featured / sponsored |
| COD | Required | Keep |
| Online payments | Architecture only | Gateways via `PaymentProvider` |
| Partner referral | Existing salon signup refs | Configurable commission amounts |

---

## 3. Entity strategy: reuse vs add

### 3.1 Reuse (do not duplicate)

| Concept in brief | Existing entity |
|------------------|-----------------|
| Salon | `organizations` |
| Salon CRM customer | `customers` (org-scoped) — **not** marketplace shoppers |
| POS product / stock | `products` — keep separate from marketplace catalog |
| Service | `services` |
| Appointment / booking | `appointments` + public booking actions |
| Shopper auth user | `auth.users` + `account_type: customer` |
| Partner / referral | `partners`, cookie, org `referred_by_partner_id` |

### 3.2 Extend existing marketplace tables

| Table | Additions (Phase 2+) |
|-------|----------------------|
| `marketplace_sellers` | cover/logo paths, verified_at, featured_until, delivery_settings JSON, store_published_at, city/geo if not using org |
| `marketplace_products` | brand_id, short_description, sale_price, cost_price, barcode, weight, dimensions, seo_*, multi-status keep |
| `marketplace_orders` | `buyer_user_id`, payment_status, payment_provider, idempotency_key, shipping fields |
| `marketplace_order_items` | variant_id, fulfillment_status per line (or split sub-orders) |
| `marketplace_commissions` | rule_source, configurable rate snapshot |
| `marketplace_reviews` | `user_id`, `order_item_id` / `appointment_id`, target_type (product/salon/service), verified, seller_reply |
| `marketplace_categories` | richer taxonomy (service vs product), parent_id |

### 3.3 New tables (proposed)

| Entity | Purpose |
|--------|---------|
| `marketplace_brands` | Brands |
| `marketplace_product_images` | Multi-image |
| `marketplace_product_variants` | Size/sku/price/stock |
| `marketplace_seller_orders` | Per-seller sub-order under parent order (fulfillment independence) |
| `marketplace_addresses` | Buyer saved addresses |
| `marketplace_wishlists` | Favorites (salon/service/product) |
| `marketplace_coupons` | Future promos |
| `marketplace_settings` | Global: listing_fee, default_commission, feature flags |
| `marketplace_commission_rules` | Global / category / seller / product rates + priority |
| `marketplace_seller_ledger` | Append-only financial movements |
| `marketplace_payout_requests` | Seller-requested payouts + admin workflow |
| `marketplace_payment_intents` | Future online payments + idempotency |
| `marketplace_featured_listings` | Manual then paid featured |
| `marketplace_analytics_events` | Views, ATC, conversions |
| Referral expansion (optional later) | `referral_clicks`, `referral_conversions` — **after** current partner flow stays stable |

### 3.4 Salon “Marketplace Store” model

**Do not invent a second salon table.**

Public storefront = `organizations` where marketplace is enabled, plus:

- Flag: `organizations.marketplace_store_enabled` (or seller row + org link)  
- Services = existing `services` (filtered for marketplace visibility)  
- Products = `marketplace_products` for linked seller **or** a bridge table if POS products should also list (Phase later; default: marketplace catalog only)  
- Bookings = existing online booking  

Suggested public URL (align with existing where possible):

- Prefer: `/salon/[city]/[slug]` **or** extend `/stores/[slug]` with marketplace tabs  
- Avoid breaking `/stores` SEO already live  

**Recommendation:** Enhance `/stores/[slug]` with tabs (Overview / Services / Products / Gallery / Reviews / About) when marketplace is enabled; add `/marketplace` as discovery hub distinct from `/shop` (products) and `/stores` (salons).

---

## 4. Payment architecture

### 4.1 Abstraction (no vendor lock-in)

```ts
interface PaymentProvider {
  createPayment(input): Promise<PaymentIntent>
  confirmPayment(id): Promise<PaymentResult>
  refundPayment(id, amount?): Promise<RefundResult>
  getPaymentStatus(id): Promise<PaymentStatus>
  verifyWebhook(headers, body): Promise<WebhookEvent>
}
```

- Launch provider: `CodPaymentProvider` (no capture at checkout)  
- Future: JazzCash / Stripe / etc. as adapters  
- Secrets server-only; webhook verification required  

### 4.2 COD flow (launch)

```
Cart → Checkout (address) → Order payment_status=unpaid, method=COD
  → Seller accepts → confirmed → … → delivered
  → Ledger: SELLER_CREDIT (gross - commission), COMMISSION
  → Commission owed → admin payout
```

Do **not** mark COD paid at checkout.

### 4.3 Future online payment flow

```
Checkout → PaymentIntent (idempotency_key)
  → Gateway → webhook PaymentSucceeded
  → Order paid → split ledger → seller available_balance (after hold period)
  → Payout request → admin approve → PAYOUT debit
```

### 4.4 Commission priority

1. Product-specific  
2. Seller-specific  
3. Category  
4. Global default (`marketplace_settings.default_commission_rate`, launch **0**)

Snapshot rate onto commission row at accrual time.

### 4.5 Ledger (not mutable balance)

`marketplace_seller_ledger`:

| type | When |
|------|------|
| `SELLER_CREDIT` | Order delivered / payment captured |
| `COMMISSION` | Platform cut |
| `REFUND` | Refund |
| `PAYOUT` | Payout completed |
| `ADJUSTMENT` | Admin |

Balances = sum(ledger). Never “edit balance” in UI.

---

## 5. Multi-vendor cart & orders

**Today:** one `marketplace_orders` + many items (multi-seller).

**Target:**

1. Keep parent `marketplace_orders` (buyer-facing order number)  
2. Add `marketplace_seller_orders` (one per seller): own `fulfillment_status`, shipping, COD collection  
3. Cart UI groups by seller (client + server validation)  
4. Stock check + price snapshot at checkout (reject stale prices)

---

## 6. Frontend routes (proposed)

### 6.1 Customer / public

| Path | Purpose |
|------|---------|
| `/marketplace` | Marketplace home (hero, categories, featured) — **or** upgrade `/shop` |
| `/shop` | Keep as product catalog (alias or redirect) |
| `/stores` | Salons (enhance filters) |
| `/stores/[slug]` | Salon storefront + marketplace tabs |
| `/product/[slug]` | PDP |
| `/service/[slug]` or book deep-links | Service detail → existing book flow |
| `/cart`, `/checkout` | Dedicated flows (mobile-first) |
| `/account/*` | Profile, orders, bookings, wishlist, addresses |

### 6.2 Salon seller (app)

Keep `/marketplace` group; expand nav:

Overview · My Store · Settings · Services (visibility) · Products · Orders · Bookings (link to appointments) · Reviews · Analytics · Promotions · Payouts  

### 6.3 Admin

Expand `/platform` marketplace section → `/platform/marketplace` metrics + controls (commissions, featured, payouts).

---

## 7. Security implications

| Risk | Mitigation |
|------|------------|
| Cross-tenant product/order access | RLS + server `requireSellerOwner` / org checks |
| Buyer reading others’ orders | `buyer_user_id` + RLS `auth.uid() = buyer_user_id` |
| Trusting seller_id from client | Derive from session / product ownership |
| Double commission / double credit | Idempotency keys on delivery + payment webhooks |
| Open review spam | Require auth + optional verified purchase |
| Payment secrets | Server-only; webhook HMAC |
| Commission tampering | Snapshot rate server-side; admin-only rule edits |

---

## 8. SEO strategy

- SSR/SSG where possible for `/marketplace`, city/category pages, PDP, store pages  
- `buildPageMetadata` + JSON-LD: Product, LocalBusiness, BreadcrumbList  
- Canonical URLs; avoid thin duplicate city×category pages without content  
- Sitemap entries for published products + marketplace-enabled salons  

---

## 9. Referral system

**Keep current:**

- `?ref=username` on `/signup`, `/`, `/partner`  
- Cookie + localStorage 90 days  
- Attribution on owner signup → org `referred_by_partner_id`  
- Partner commission on first **subscription** payment  

**Later (configurable):**

- Admin-set referral reward amount  
- Optional marketplace-specific referral program — **do not block Phase 2–7**

---

## 10. Migration strategy (safe)

1. **Additive migrations only** — no drops of live MVP tables  
2. Backfill: `buyer_user_id` null for old orders; commission rules seed with `default_rate = 0` (or migrate 0.1 → settings)  
3. Feature flags in `marketplace_settings` (e.g. `online_payments_enabled`)  
4. Ship behind flags; keep `/shop` COD working throughout  
5. Dual-read commission: settings/rules → fallback constant until cutover  

---

## 11. Implementation phases (locked to your process)

| Phase | Deliverable | Code? |
|-------|-------------|-------|
| **1** | This document | No |
| **2** | DB migrations (settings, variants, buyer_user_id, ledger, rules, addresses, wishlist, seller_orders, …) | Yes |
| **3** | Backend APIs / server actions | Yes |
| **4** | Customer marketplace UI (home, search, store, PDP) | Yes |
| **5** | Salon marketplace dashboard expansion + onboarding wizard | Yes |
| **6** | Cart + checkout redesign | Yes |
| **7** | COD hardened (per-seller status, ledger on deliver) | Yes |
| **8** | Commission engine + payout requests | Yes |
| **9** | Admin marketplace dashboard | Yes |
| **10** | SEO + performance + security pass | Yes |
| **11** | Tests (isolation, checkout, commission, referral) | Yes |

---

## 12. Recommended Phase 2 scope (next when you say go)

Minimal high-leverage schema without boiling the ocean:

1. `marketplace_settings` (listing_fee=0, default_commission=0)  
2. `marketplace_commission_rules`  
3. `marketplace_products` SEO + sale_price + brand_id  
4. `marketplace_brands`, `marketplace_product_images`, `marketplace_product_variants`  
5. `marketplace_orders.buyer_user_id` + indexes  
6. `marketplace_seller_orders` + per-seller fulfillment_status  
7. `marketplace_seller_ledger`  
8. `marketplace_addresses`, `marketplace_wishlists`  
9. `organizations.marketplace_store_enabled` (+ optional geo later)  
10. Replace hardcoded `MARKETPLACE_COMMISSION_RATE` reads with settings  

Then Phase 3–4 UI against that foundation.

---

## 13. Success criteria mapping

| Actor | Flow | Foundation |
|-------|------|------------|
| Customer | Discover → salon → book | `/stores` + existing booking |
| Customer | Discover → product → cart → COD | `/shop` → evolve cart/checkout |
| Salon | Enable store → list → publish | Org flag + seller + onboarding wizard |
| Admin | Moderate → configure → monetize later | `/platform` + settings/rules |
| Partner | Ref link → paid salon → commission | Existing partner system |

---

## 14. Explicit non-goals for early phases

- Rewriting POS or appointment engines  
- Merging POS `products` stock with marketplace stock (optional bridge later)  
- Live card payments at launch  
- Hard-coding PKR 3000–4500 partner payouts  
- Breaking `/stores` or `/book` SEO/URLs without redirects  

---

**Next step:** Await approval to start **Phase 2 (database migrations)** only, following this document.
