# syntax=docker/dockerfile:1
# Beautora — production multi-stage image (Next.js standalone)
# Target: Contabo VPS / Docker Compose. Vercel deploys remain independent.

# Node 24 ships npm 11+, which matches the lockfile producer (Windows/npm 11).
# Node 22's npm 10 rejects this lockfile as incomplete for Tailwind oxide WASM
# optional deps (@emnapi/core, @emnapi/runtime) — see tailwindcss#20324 / npm#4828.
ARG NODE_VERSION=24-alpine

# -----------------------------------------------------------------------------
# Dependencies
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# -----------------------------------------------------------------------------
# Builder
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* and R2_ENDPOINT are inlined / read at build time.
# Pass them as --build-arg (docker compose reads them from .env.production.local).
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SITE_URL=https://www.beautora.app
ARG NEXT_PUBLIC_BOOKING_SLUG=hair-salon
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID
ARG NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
ARG NEXT_PUBLIC_RECEIPT_WIDTH
ARG R2_ENDPOINT
ARG APP_BASE_URL=https://www.beautora.app
ARG EMAIL_APP_BASE_URL=https://www.beautora.app

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_BOOKING_SLUG=$NEXT_PUBLIC_BOOKING_SLUG \
    NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY \
    NEXT_PUBLIC_GA_MEASUREMENT_ID=$NEXT_PUBLIC_GA_MEASUREMENT_ID \
    NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=$NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION \
    NEXT_PUBLIC_RECEIPT_WIDTH=$NEXT_PUBLIC_RECEIPT_WIDTH \
    R2_ENDPOINT=$R2_ENDPOINT \
    APP_BASE_URL=$APP_BASE_URL \
    EMAIL_APP_BASE_URL=$EMAIL_APP_BASE_URL \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

RUN npm run build

# -----------------------------------------------------------------------------
# Runner (minimal)
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS runner
RUN apk add --no-cache libc6-compat wget
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# public assets + standalone server + static chunks
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=8s --start-period=60s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1

CMD ["node", "server.js"]
