# Supabase Environment Audit — Beautora (Next.js + Docker)

Date: 2026-11-16  
Scope: Local Windows project only (no Contabo changes in this audit)  
Production domain: `https://www.beautora.app`

**This document never contains real credentials.**

---

## 1. Root cause

Production browser error:

```text
Missing environment variable: NEXT_PUBLIC_SUPABASE_URL
```

Origin: `lib/supabase/env.ts` → `getSupabaseUrl()` / `getSupabaseAnonKey()`, used by:

- `lib/supabase/client.ts` (browser)
- `lib/supabase/server.ts` (server)
- `lib/supabase/middleware.ts` (edge/middleware)

### Why the Docker image could “build OK” but the browser still failed

A prior empty-string hardening helper used **dynamic** env access:

```ts
process.env[name]
```

Next.js **only inlines** public env vars that appear as **static** property access, e.g.:

```ts
process.env.NEXT_PUBLIC_SUPABASE_URL
```

Dynamic indexing is **not** replaced in client bundles, so in the browser those values were always `undefined` even when Docker correctly passed build-args and `next build` succeeded.

### Secondary (still relevant) issue

Docker Compose often passes:

```yaml
NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}
```

When unset, that becomes `""`. Using `??` would treat `""` as present and shadow a real `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The fix uses `||` / trim so empty strings are ignored.

---

## 2. Files changed

| File | Change |
|------|--------|
| `lib/supabase/env.ts` | Static `process.env.NEXT_PUBLIC_*` access; empty-string safe; service role remains server-only |
| `docker-compose.yml` | Require `NEXT_PUBLIC_SUPABASE_URL` at compose interpolation (`:?`); clarify build-arg comments |
| `docs/SUPABASE_ENVIRONMENT_AUDIT.md` | This report |

Unchanged (already correct for this issue):

- `lib/supabase/client.ts`, `server.ts`, `admin.ts`, `middleware.ts`
- `Dockerfile` (ARG → ENV before `npm run build`, fail-fast, runner public ENVs, no service-role build-arg)

---

## 3. Environment variable loading flow

```text
Local / Vercel
  .env* / Vercel dashboard
       │
       ▼
  process.env.NEXT_PUBLIC_*  ──(static access)──► Next.js inlines into browser JS
  process.env.SUPABASE_SERVICE_ROLE_KEY ─────────► server only (admin client)

Contabo Docker
  .env.production.local
       │
       ├─ docker compose --env-file …  → build.args (NEXT_PUBLIC_* only)
       │         │
       │         ▼
       │   Dockerfile builder ENV → next build (inline into client)
       │         │
       │         ▼
       │   runner ENV (public vars again for server/middleware fallback)
       │
       └─ service env_file → runtime secrets (SERVICE_ROLE, SMTP, R2, …)
```

### Required public vars (browser + server cookie clients)

- `NEXT_PUBLIC_SUPABASE_URL` (**required**)
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` **or** `NEXT_PUBLIC_SUPABASE_ANON_KEY` (at least one non-empty)

### Required server-only (runtime; never build-arg for “secrecy”, never client)

- `SUPABASE_SERVICE_ROLE_KEY` (health DB check, admin actions, invites, etc.)

---

## 4. Docker build configuration

`Dockerfile` builder stage:

1. Declares `ARG` for each `NEXT_PUBLIC_*` (+ `R2_ENDPOINT`, app URLs).
2. Sets matching `ENV` **before** `npm run build`.
3. Fail-fast `RUN` if URL or public key missing.
4. Does **not** accept `SUPABASE_SERVICE_ROLE_KEY` as a build arg.

`docker-compose.yml` build args are interpolated from `--env-file .env.production.local`.

---

## 5. Docker runtime configuration

- `env_file: .env.production.local` loads runtime secrets into the container.
- Port binding remains `127.0.0.1:3000:3000` (Nginx terminates public HTTPS).
- Healthcheck: `wget http://127.0.0.1:3000/api/health`.

Public Supabase values are also set on the runner image ENV from build args so server/middleware can read them if needed.

---

## 6. Browser vs server

| Concern | Browser | Server |
|---------|---------|--------|
| Supabase URL | Inlined `NEXT_PUBLIC_SUPABASE_URL` | Same + runtime ENV |
| Public key | Inlined anon **or** publishable | Same |
| Service role | Must never appear as a value | `createAdminClient()` |
| Client entry | `lib/supabase/client.ts` | `server.ts` / `admin.ts` / route handlers |

---

## 7. Security findings

1. **Fixed:** Dynamic `process.env[name]` broke public env inlining (availability bug; not a secret leak).
2. **OK:** `SUPABASE_SERVICE_ROLE_KEY` is not a Docker build arg.
3. **OK:** Client components do not import `createAdminClient`.
4. **OK:** Client bundle contains the **name** `SUPABASE_SERVICE_ROLE_KEY` only as UI help text in team management — not the secret value.
5. **Caution:** `docker compose config` prints full `env_file` values (including service role). Do not paste that output into tickets/chat. Prefer redacted checks.
6. **Local note:** `.env.production.local` exists on the Windows machine and is gitignored (correct). Ensure the VPS copy has the same **names** filled with production values.

---

## 8. Validation results (local)

| Check | Result |
|-------|--------|
| TypeScript `tsc --noEmit` | **Passed** (exit 0) |
| ESLint `npm run lint` | **Failed** — pre-existing project issues (e.g. marketplace cart effect, prefer-const); **not** introduced by this env fix |
| Next.js `npm run build` with public env loaded | **Passed** (exit 0) |
| Client static chunks contain Supabase project host | **Passed** (inlined) |
| `process.env[name]` in client static | **None** |
| Service-role **value** in client static | **Not found** (name-only UI string) |
| `docker compose --env-file .env.production.local config` | **Passed** (exit 0); URL + publishable present; anon empty string (handled by `\|\|`) |
| Docker image build | **Skipped** — Docker Engine not running on this machine at validation time |

---

## 9. Remaining deployment steps

1. Commit and push the local fix (do not commit `.env.production.local`).
2. On Contabo: `git pull`, then **rebuild with `--no-cache`** using `--env-file .env.production.local` so public vars are re-inlined.
3. Confirm VPS `.env.production.local` has non-empty `NEXT_PUBLIC_SUPABASE_URL` and publishable/anon key.
4. Verify browser login on `https://www.beautora.app` (no missing-env toast/error).
5. Verify `/api/health` returns connected/ok when service role is set.

---

## 10. Exact production commands (manual)

### Local (after review)

```bash
git status
git add lib/supabase/env.ts docker-compose.yml docs/SUPABASE_ENVIRONMENT_AUDIT.md
git commit -m "fix Supabase production environment configuration"
git push
```

### Contabo VPS

```bash
cd /var/www/beautora
git pull --ff-only

# Confirm key NAMES exist (do not cat secrets into logs)
grep -E '^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY|NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY)=' .env.production.local | cut -d= -f1

# Rebuild so Next.js re-inlines NEXT_PUBLIC_* into the browser bundle
docker compose --env-file .env.production.local build --no-cache beautora
docker compose --env-file .env.production.local up -d beautora

docker compose --env-file .env.production.local ps
curl -sS http://127.0.0.1:3000/api/health
```

### Rollback (if needed)

```bash
docker tag beautora-web:previous beautora-web:latest
docker compose --env-file .env.production.local up -d --no-build --force-recreate beautora
```

(Requires a previously tagged `beautora-web:previous` from `scripts/deploy-contabo.sh`.)
