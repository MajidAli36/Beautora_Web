# Customer App Management — next-level guide

## Roles

| Role | Who in Beautora | What they do |
|------|-----------------|--------------|
| **Super Admin** | Platform admin email (`/platform`) | Enable / configure / publish / suspend / deactivate customer apps for any salon |
| **Client Admin** | Salon **OWNER** or **ADMIN** | Edit permitted settings on `/customer-app`, publish when ready |
| **Customer** | Mobile app + web `/a/[slug]` | Book/browse via Customer API (published apps only) |

Salon staff (cashier, etc.) do not manage the customer app.

## Lifecycle

```text
Super Admin enables → setup_required (draft)
  → checklist complete → Publish → published
  → Suspend → suspended (API 403, history kept)
  → Deactivate → deactivated
```

Mobile and Customer API only serve **`published`** config.

## Website surfaces

| URL | Audience |
|-----|----------|
| `/platform/customer-apps` | Super Admin list |
| `/platform/customer-apps/[id]` | Super Admin detail |
| `/customer-app` | Salon owner/admin |
| `/a/[slug]` | Web preview / light customer UI |
| `/api/customer/v1/*` | Mobile + integrations |

## Mobile

Folder: `apps/customer-mobile` (Expo React Native).

1. Apply migration `20261017120000_customer_apps.sql` in Supabase.
2. Super Admin enables + publishes an app.
3. Copy slug into `apps/customer-mobile/.env` as `EXPO_PUBLIC_APP_SLUG`.
4. `cd apps/customer-mobile && npm i && npx expo start`.

## Booking sync

`POST /api/customer/v1/bookings` calls existing `createOnlineBooking` → same `appointments` row visible in salon Appointments / POS.

## Salon owner dashboard (`/customer-app`)

Tabs: **Branding** · **Points rules** · **Leaderboard** · **Products in app** · **Reels**

Customer mobile sees published points rules, leaderboard, product list, and vertical reels.

Extra APIs: `/api/customer/v1/loyalty`, `/leaderboard`, `/reels`, `/products`

Also run migration: `20261017140000_customer_app_loyalty_reels.sql`

## Still to build (next iterations)

- Auto-award points on completed booking / paid sale
- In-feed video player (expo-av)
- Customer auth (not marketplace shopper)
- R2 upload for reel files / logos

