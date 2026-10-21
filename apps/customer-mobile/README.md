# Beautora Customer Mobile

Expo / React Native app for salon **Customer Apps**.  
Syncs only with Beautora **Customer API** (`/api/customer/v1/*`) — never marketplace or salon POS APIs directly.

## Screens

| Screen | What it does |
|--------|----------------|
| **Home** | Brand hero, points snapshot, next visit, featured deal/reel, quick actions |
| **Shop** | Deals + product grid (feature-flagged), pull-to-refresh |
| **Rewards** | Balance, earn rules, ledger, leaderboard + tiers |
| **More** | Profile shortcut, bookings, salons, reels, WhatsApp / call |
| **Book** | 3-step flow: salon/service → stylist/day/time → details |
| **Bookings** | Upcoming + history with status pills |
| **Profile** | Local profile (AsyncStorage); phone unlocks loyalty & bookings |
| **Salons** | Assigned locations with call / book |
| **Reels** | Full-screen vertical feed with play-out link |

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

## App structure

```
app/
  (tabs)/          Home · Shop · Rewards · More
  book.tsx         3-step booking
  bookings.tsx
  profile.tsx
  reels.tsx
  salons.tsx
src/
  api/             Typed Customer API client + bundle sync
  context/         AppProvider (config, cache, profile, loyalty)
  components/      Shared UI kit
  lib/format.ts    Money / dates / status helpers
  storage/         Phone / name persistence
  theme/           Brand-aware colors
```
