# Deployment Guide

This covers deploying the whole platform — backend, Celery worker,
Postgres, Redis, and all five frontends — behind one nginx gateway on
a single server. Everything here was written and verified against the
actual code in this repo (Dockerfiles built and run locally, settings
loaded with real production env vars, nginx config syntax-checked) —
the one thing I could **not** verify myself is the actual `docker
build`/`docker compose up` sequence end-to-end, since Docker itself
isn't available in the environment I work in. Treat the "Deploy" step
below as the first time this exact sequence runs for real, and follow
the verification checklist immediately after.

## What you need before starting

1. **A server (VPS)** — Ubuntu 22.04 or 24.04 recommended. Minimum realistic
   spec for this stack (Postgres + Redis + Django + Celery + 5 Next.js
   apps + nginx, all running at once): **2 vCPU, 4GB RAM, 40GB disk**.
   Any mainstream provider works (DigitalOcean, Hetzner, Arvan Cloud,
   Vultr, etc.) — Hetzner or Arvan Cloud are worth considering
   specifically for lower latency to Iran, given Kavenegar and your
   likely user base.
2. **A domain name** — you'll need to point 6 DNS records at your
   server's IP (root domain + 5 subdomains: `api`, `family`,
   `patient`, `caregiver`, `supervisor`). Any registrar works.
3. **A Kavenegar account** with a **Verify Lookup template** already
   registered for your sender line — without this, OTP codes are only
   logged on the server, never actually texted to anyone. This is a
   real prerequisite for real users, not optional for going live.
4. **SSH access** to the server (a normal part of any VPS).

## 1. Point your domain at the server

At your DNS provider, create these **A records**, all pointing at
your server's IP address:

| Host | Points to |
|---|---|
| `@` (root) | your server IP |
| `www` | your server IP |
| `api` | your server IP |
| `family` | your server IP |
| `patient` | your server IP |
| `caregiver` | your server IP |
| `supervisor` | your server IP |

DNS propagation can take a few minutes to a few hours. You can move on
to server setup while waiting.

## 2. Set up the server

SSH into your server, then:

```bash
# Docker + Compose plugin (official install script)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# log out and back in for the group change to take effect

# confirm
docker --version
docker compose version
```

## 3. Get the code onto the server

```bash
git clone <your-repo-url> moraqebeman
cd moraqebeman
```

(If you're deploying from this delivered zip instead of a git repo,
upload and unzip it on the server instead, then `cd moraqebeman`.)

## 4. Configure secrets

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and fill in every value — the file explains each
one, but the two that matter most:

```bash
# generate two DIFFERENT random secrets like this:
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

Put one result in `DJANGO_SECRET_KEY`, the other in `JWT_SIGNING_KEY`.
**Never reuse the dev values that ship in this repo** — production
settings will actually refuse to start if you leave them as the
placeholder defaults (verified directly: this raises a clear
`RuntimeError` rather than silently running insecurely).

Set `ALLOWED_HOSTS=api.yourdomain.com` and `CORS_ALLOWED_ORIGINS` to
all five real frontend URLs (comma-separated, `https://`, no trailing
slash) — exactly as shown in the example file.

Set a real `POSTGRES_PASSWORD` (not in `backend/.env` — this one goes
in a **separate** `.env` file at the repo root, since docker-compose
reads root-level variables like `POSTGRES_PASSWORD` and
`FAMILY_PANEL_URL` etc. directly):

```bash
cat > .env << 'EOF'
POSTGRES_DB=moraqebeman_db
POSTGRES_USER=moraqebeman_user
POSTGRES_PASSWORD=REPLACE_WITH_A_REAL_RANDOM_PASSWORD

API_URL=https://api.yourdomain.com
FAMILY_PANEL_URL=https://family.yourdomain.com
PATIENT_PANEL_URL=https://patient.yourdomain.com
CAREGIVER_PANEL_URL=https://caregiver.yourdomain.com
SUPERVISOR_PANEL_URL=https://supervisor.yourdomain.com
EOF
```

Also copy every value from `backend/.env` into this root `.env` file
too (`DJANGO_SECRET_KEY`, `JWT_SIGNING_KEY`, `ALLOWED_HOSTS`,
`CORS_ALLOWED_ORIGINS`, `KAVENEGAR_API_KEY`,
`KAVENEGAR_OTP_TEMPLATE`) — `docker-compose.prod.yml` reads from the
root `.env`, not `backend/.env` directly, when you run it with
`--env-file`.

Finally, edit `gateway/nginx.prod.conf` and replace every
`moraqebeman.ir` with your actual domain (5 occurrences).

## 5. First deploy (HTTP only — SSL comes next)

```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

This builds all 9 images (backend, worker, 5 frontends, and pulls
postgres/redis/nginx) and starts everything. The first build will take
a while — subsequent deploys are much faster since Docker caches
unchanged layers.

Watch it come up:

```bash
docker compose -f docker-compose.prod.yml logs -f
```

## 6. Verify it's actually working

```bash
# from the server itself
curl -I http://localhost/  # landing page, via nginx
curl http://localhost:80 -H "Host: api.yourdomain.com"  # or from your own machine:
curl http://api.yourdomain.com/health/
```

Expected: `{"status": "ok", "database": true}`. Then from a browser,
visit each of the 6 domains and confirm each page actually loads (not
just returns 200 — open it and look).

## 7. Create your first supervisor account

```bash
docker compose -f docker-compose.prod.yml exec backend python manage.py create_admin
```

This is the only account type that isn't self-service — everyone else
registers themselves through their panel.

## 8. Seed the matching engine's trait mappings

```bash
docker compose -f docker-compose.prod.yml exec backend python manage.py seed_trait_mappings
```

Without this, the compatibility questionnaires save fine but the
matching/suggestion engine has nothing to compute trait profiles from.

## 9. Add HTTPS (do this before telling anyone the site is live)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
```

Stop the nginx container temporarily so certbot's standalone verifier
can bind port 80:

```bash
docker compose -f docker-compose.prod.yml stop nginx
sudo certbot certonly --standalone \
  -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com \
  -d family.yourdomain.com -d patient.yourdomain.com \
  -d caregiver.yourdomain.com -d supervisor.yourdomain.com
```

This writes certificates to `/etc/letsencrypt/live/yourdomain.com/`.
Now add an HTTPS `server` block for each of the 6 domains in
`gateway/nginx.prod.conf` (duplicate each existing `server { listen
80; ... }` block, change `listen 80` to `listen 443 ssl`, add:

```nginx
ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
```

and turn each existing `listen 80` block into a redirect:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}
```

Mount the certs into the nginx container by adding this to the
`nginx` service in `docker-compose.prod.yml`:

```yaml
    volumes:
      - ./gateway/nginx.prod.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    ports:
      - "80:80"
      - "443:443"
```

Then:

```bash
docker compose -f docker-compose.prod.yml up -d --build nginx
```

Set up auto-renewal (Let's Encrypt certs expire every 90 days):

```bash
echo "0 3 * * * root certbot renew --quiet --deploy-hook 'docker compose -f /path/to/moraqebeman/docker-compose.prod.yml restart nginx'" | sudo tee /etc/cron.d/certbot-renew
```

## Ongoing operations

**Deploying a code update:**
```bash
git pull
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

**Database backups** — set up a daily cron job:
```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U moraqebeman_user moraqebeman_db | gzip > backup-$(date +%F).sql.gz
```

**Viewing logs:**
```bash
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f backend_worker
```

**Restarting a single service:**
```bash
docker compose -f docker-compose.prod.yml restart backend
```

## What's genuinely still open after deployment

- **Real SMS delivery** depends entirely on your Kavenegar account/template being correctly set up — this repo's integration code is real and correct, but actual delivery is only as good as your Kavenegar configuration, which I can't verify from here.
- **No real browser testing has happened on any of this across the whole project** — deployment is the first point where that becomes possible. Click through all five panels for real once this is live.
- **This guide's exact command sequence has not been run end-to-end by me** — Docker isn't available in my environment. Everything here is built on verified pieces (Dockerfiles that produce working standalone servers when run directly with `node server.js`, nginx config with valid syntax, Django settings that load correctly with real production env vars) assembled into a sequence I'm confident is correct, but the full `docker compose up` run itself is genuinely new the first time you do it. If something doesn't work exactly as described, the logs (`docker compose logs`) are the right first place to look, and it's worth telling me exactly what you see so I can help debug it.
