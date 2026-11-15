# Beautora — Contabo VPS Production Deployment

This guide prepares and runs Beautora on a Contabo Ubuntu 24.04 VPS with Docker + Nginx, while **keeping the existing Vercel deployment online** until Contabo is verified.

Repository: `https://github.com/MajidAli36/Beautora_Web.git`  
Server app directory: `/var/www/beautora`  
App port (internal): `3000` (bound to `127.0.0.1` only)

---

## 1. Local development workflow

```bash
# Install
npm ci

# Dev env
cp .env.development.example .env.development.local
# Fill secrets, then:
npm run dev
```

Do not point local `.env.development.local` at production secrets unless you intentionally need them.

---

## 2. Git commit and push workflow

```bash
git status
git add <files>
git commit -m "your message"
git push origin <branch>
```

**Never commit:** `.env.production.local`, `.env.development.local`, API keys, certificates.

Deployment files that belong in git:

- `Dockerfile`
- `docker-compose.yml`
- `.dockerignore`
- `deployment/nginx/*`
- `scripts/deploy-contabo.sh`
- `.env.production.example`
- `DEPLOYMENT_CONTABO.md`

---

## 3. Initial Contabo deployment

### Prerequisites on the VPS

- Ubuntu 24.04 LTS
- Docker Engine + Docker Compose plugin
- Git
- Nginx
- Certbot (`python3-certbot-nginx`)
- DNS A/AAAA records for your domain pointing to the VPS (when ready)

### First-time setup

```bash
sudo mkdir -p /var/www/beautora
sudo chown "$USER":"$USER" /var/www/beautora
cd /var/www/beautora

git clone https://github.com/MajidAli36/Beautora_Web.git .
# or: git clone <url> . on the branch you deploy

cp .env.production.example .env.production.local
nano .env.production.local   # paste real production values

chmod +x scripts/deploy-contabo.sh scripts/contabo-status.sh
./scripts/deploy-contabo.sh
```

The deploy script:

1. Pulls latest git (ff-only)
2. Tags the current image as `beautora-web:previous`
3. Builds and starts Compose
4. Hits `http://127.0.0.1:3000/api/health`
5. Auto-rolls back if health fails and a previous image exists

---

## 4. SSH connection instructions

```bash
ssh root@YOUR_VPS_IP
# or
ssh youruser@YOUR_VPS_IP
```

Use SSH keys; disable password auth once keys work. Prefer a non-root sudo user for day-to-day deploys.

---

## 5. Docker build instructions

From `/var/www/beautora`:

```bash
docker compose --env-file .env.production.local build beautora
```

`NEXT_PUBLIC_*` and `R2_ENDPOINT` are passed as **build args** (required for client bundle + `next/image` remote patterns). Changing them requires a rebuild.

---

## 6. Docker Compose commands

```bash
# Start / recreate
docker compose --env-file .env.production.local up -d

# Status
docker compose --env-file .env.production.local ps

# Logs
docker compose --env-file .env.production.local logs -f --tail=200 beautora

# Stop (does not delete images or env)
docker compose --env-file .env.production.local stop

# Rebuild + restart one service
docker compose --env-file .env.production.local up -d --build beautora
```

Port mapping: `127.0.0.1:3000:3000` — only local Nginx should reach the app.

---

## 7. Production environment configuration

1. Copy `.env.production.example` → `.env.production.local` on the server.
2. Fill all required values (see section below).
3. Ensure file permissions: `chmod 600 .env.production.local`.
4. Never copy local `.env.development.local` blindly to production.

### Required variables

| Variable | Scope | Purpose |
|----------|--------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | build + runtime | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `ANON_KEY`) | build + runtime | Public Supabase key |
| `SUPABASE_SERVICE_ROLE_KEY` | runtime | Admin/server operations, health DB check |
| `NEXT_PUBLIC_SITE_URL` | build + runtime | Canonical site URL |
| `APP_BASE_URL` / `EMAIL_APP_BASE_URL` | build + runtime | App + email links |
| `SMTP_*` / `SMTP_PASSWORD` | runtime | Resend email |
| `R2_*` | runtime (+ `R2_ENDPOINT` at build) | Cloudflare R2 storage |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | build + runtime | Signup CAPTCHA |
| `BEAUTORA_PLATFORM_ADMIN_EMAILS` | runtime | Platform admin allow-list |

### Supabase Auth dashboard

- Site URL = production origin (e.g. `https://www.beautora.app`)
- Redirect URLs include `https://www.beautora.app/auth/callback`

---

## 8. Nginx installation and configuration

```bash
sudo apt update
sudo apt install -y nginx

# WebSocket upgrade map (http context)
sudo cp /var/www/beautora/deployment/nginx/nginx-map-upgrade.conf \
  /etc/nginx/conf.d/map-upgrade.conf

# Site config — REPLACE YOUR_DOMAIN before enabling
sudo cp /var/www/beautora/deployment/nginx/beautora.conf \
  /etc/nginx/sites-available/beautora
sudo nano /etc/nginx/sites-available/beautora

sudo mkdir -p /var/www/certbot
sudo ln -sf /etc/nginx/sites-available/beautora /etc/nginx/sites-enabled/beautora
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t
sudo systemctl reload nginx
```

Notes:

- Template uses placeholder `YOUR_DOMAIN` — do not enable redirects for the wrong host.
- `client_max_body_size 25m` supports product image uploads.
- Proxy timeouts are raised for Server Actions.

---

## 9. Domain DNS configuration

When ready to cut traffic (Vercel can stay until Contabo is healthy):

1. Create **A** (and optional **AAAA**) records for `www` (and apex if used) → Contabo VPS IP.
2. Lower TTL beforehand if you plan a quick cutover.
3. Keep Vercel deployment until Contabo SSL + health checks pass.
4. Host redirects: production currently expects **www** as canonical (`NEXT_PUBLIC_SITE_URL=https://www.beautora.app`). Apex → www should be handled in DNS/Nginx carefully to avoid loops with any remaining Vercel redirect rules.

---

## 10. SSL certificate setup

After DNS points to Contabo:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d YOUR_DOMAIN
# Example: sudo certbot --nginx -d www.beautora.app -d beautora.app

sudo certbot renew --dry-run
```

Certbot will adjust SSL paths in the Nginx site file.

---

## 11. Application health checks

```bash
curl -fsS http://127.0.0.1:3000/api/health
# Expected JSON includes "status":"ok" when Supabase is reachable

curl -fsS https://YOUR_DOMAIN/api/health
./scripts/contabo-status.sh
```

`/api/health` checks DB connectivity via the service role. A `503` usually means missing `SUPABASE_SERVICE_ROLE_KEY` or network/DB issues.

---

## 12. Logs and troubleshooting

```bash
# App logs
docker compose --env-file .env.production.local logs -f --tail=300 beautora

# Nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Container inspect
docker inspect beautora-web --format '{{.State.Health.Status}}'
```

Common issues:

| Symptom | Likely cause |
|---------|----------------|
| Blank CSS / 404 static | Missing `.next/static` copy — rebuild image |
| Auth callback fails | Supabase redirect URL / `NEXT_PUBLIC_SITE_URL` mismatch |
| Images from R2 fail | `R2_ENDPOINT` not set at **build** time for `next/image` |
| Health 503 | Missing service role key or Supabase unreachable |
| Signup bots | Turnstile keys missing |

---

## 13. Restart and update procedures

### Update (recommended)

```bash
cd /var/www/beautora
./scripts/deploy-contabo.sh
```

### Restart only (no rebuild)

```bash
docker compose --env-file .env.production.local restart beautora
```

### Update without git pull

```bash
./scripts/deploy-contabo.sh --no-pull
```

---

## 14. Rollback procedure

Automatic: deploy script rolls back if health fails after a build.

Manual:

```bash
cd /var/www/beautora
./scripts/deploy-contabo.sh --rollback
# or:
docker tag beautora-web:previous beautora-web:latest
docker compose --env-file .env.production.local up -d --no-build --force-recreate beautora
```

---

## 15. Backup recommendations

- **Supabase**: use Supabase dashboard backups / PITR (database is not on the VPS).
- **Env file**: securely back up `.env.production.local` offline (password manager / encrypted store).
- **R2**: enable versioning or lifecycle rules on the bucket if needed.
- **VPS**: snapshot the Contabo instance before major OS upgrades.
- Do **not** run destructive DB scripts (`db:wipe`, spam purge, etc.) against production without an explicit plan.

---

## 16. Security considerations

- App port bound to localhost only; expose 80/443 via Nginx.
- Run container as non-root (`nextjs` uid 1001).
- `no-new-privileges` enabled in Compose.
- Keep secrets only in `.env.production.local` (mode `600`).
- Keep Turnstile enabled in production.
- Firewall: allow 22/80/443 only (`ufw`).
- Fail2ban optional for SSH.
- Do not disable Vercel until Contabo health + SSL + auth + uploads are verified end-to-end.

---

## Docker architecture (summary)

```
Internet → Nginx (:443) → 127.0.0.1:3000 → Docker (beautora-web)
                                              └─ node server.js (Next standalone)
External services: Supabase (DB/Auth), Cloudflare R2, Resend, Turnstile
```

Multi-stage image:

1. **deps** — `npm ci`
2. **builder** — `next build` with `output: "standalone"`
3. **runner** — copy `standalone` + `public` + `.next/static`, run as `nextjs`

---

## Exact command cheat sheet

### Deploy / update

```bash
cd /var/www/beautora && ./scripts/deploy-contabo.sh
```

### Inspect logs

```bash
cd /var/www/beautora
docker compose --env-file .env.production.local logs -f --tail=200 beautora
```

### Restart

```bash
cd /var/www/beautora
docker compose --env-file .env.production.local restart beautora
```

### Rollback

```bash
cd /var/www/beautora && ./scripts/deploy-contabo.sh --rollback
```

---

## Remaining manual steps (need your access)

1. Create `/var/www/beautora` and clone the repo on Contabo.
2. Create `.env.production.local` with real secrets.
3. Confirm domain DNS when ready to cut over.
4. Replace `YOUR_DOMAIN` in Nginx and obtain Let's Encrypt certs.
5. Update Supabase Auth Site URL / redirect URLs if the public host changes.
6. Verify R2 CORS / public access for browser uploads if applicable.
7. Keep Vercel live until Contabo passes production smoke tests.
8. Commit/push these deployment files only when you approve.

---

## Vercel compatibility

- `output: "standalone"` is for Docker; Vercel continues to build/deploy normally.
- Host redirects remain owned by Vercel until you intentionally move DNS.
- No business logic was changed for Contabo beyond enabling standalone output.
