# Beautora Customer Mobile

Expo / React Native app for salon **Customer Apps**.  
Syncs only with Beautora **Customer API** (`/api/customer/v1/*`) — never marketplace or salon POS APIs directly.

## Screens

| Screen | What it does |
|--------|----------------|
| **Onboarding** | Profile (name + phone) → theme picker (8 looks) |
| **Home** | Brand hero, virtual card, notifications teaser, next visit, deals/reels |
| **Shop** | Deals + product grid (feature-flagged), pull-to-refresh |
| **Rewards** | Virtual card + QR, **How to get points** (backend rules text), history, leaderboard |
| **More** | Profile, Appearance, Notifications, bookings, salons, reels, WhatsApp / call |
| **Notifications** | Salon messages + auto rules / welcome / booking tips |
| **Appearance** | Change theme anytime |
| **Book** | 3-step flow: salon/service → stylist/day/time → details |
| **Bookings** | Upcoming + history with status pills |
| **Profile** | Local profile (AsyncStorage); phone unlocks loyalty & bookings |
| **Salons** | Assigned locations with call / book |
| **Reels** | Full-screen vertical feed |

Pull-to-refresh on Home / Shop / Rewards / More re-runs `syncCustomerAppBundle()`.

## Setup

```bash
cd apps/customer-mobile
cp .env.example .env
```

```env
EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:3000
EXPO_PUBLIC_APP_SLUG=your-published-app-slug
```

Use your machine LAN IP (not `localhost`) when testing on a physical phone.

```bash
npm install
npx expo start
```

## API contract

Every request sends:

- Query: `?app=<slug>`
- Header: `x-beautora-app-slug: <slug>`

Slug must be a **published** customer app. Draft/suspended → 403.

Loyalty QR redeem:

- `GET /api/customer/v1/loyalty/qr?phone=` → signed QR payload
- `POST /api/customer/v1/loyalty/redeem` `{ token, points }` → deduct points (salon desk)

Notifications:

- `GET /api/customer/v1/notifications` → salon + system how-to rules

## App structure

```
app/
  (tabs)/          Home · Shop · Rewards · More
  onboarding.tsx   Profile + theme
  appearance.tsx
  notifications.tsx
  book.tsx
  bookings.tsx
  profile.tsx
  reels.tsx
  salons.tsx
src/
  api/             Typed Customer API client + bundle sync
  context/         AppProvider (config, theme, profile, loyalty)
  components/      UI kit + LoyaltyCard
  storage/         Profile, preferences, notification read state
  theme/           Presets + brand-aware colors
```

## Salon dashboard (web)

Under **Customer app**:

- **Points & rules** — set earn/redeem numbers + customer-facing note
- **Notifications** — publish inbox messages (requires DB migration `20261116120000_customer_app_notifications.sql`)
