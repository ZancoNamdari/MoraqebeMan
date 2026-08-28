# Setting up MoraqebeMan locally

Two moving pieces: a Django backend (API, in Docker) and 8 separate
Next.js frontend apps (landing page + 7 role panels, run natively with
npm). Do the backend first, then the frontend.

## 0. Prerequisites

- Docker + Docker Compose (for the backend, Postgres, Redis)
- Node.js 20+ and npm (for the 8 frontend apps — they use Next.js 16 / React 19)
- Git

Check what you have:
```bash
docker --version
node --version   # want 20+
npm --version
```

## 1. Get the code

```bash
git clone https://github.com/ZancoNamdari/MoraqebeMan.git
cd MoraqebeMan
```

If you have the `moraqebeman-redesign.zip` patch from this session, apply it now,
before installing frontend dependencies — it only touches files already in the
repo (globals.css, layout.tsx, page components, a couple of new
`components/layout/app-header.tsx` files, plus `docs/DESIGN_SYSTEM.md`):
```bash
unzip -o moraqebeman-redesign.zip -d .
```

## 2. Backend

```bash
cp .env.example .env
# open .env and swap DJANGO_SECRET_KEY / JWT_SIGNING_KEY for real values
# if you're deploying — the defaults are fine for local dev

docker compose up --build
```

This starts three containers: Postgres, Redis, and the Django API on
`http://localhost:8000` (migrations run automatically on startup). Leave
this running in its own terminal.

Once it's up, create your first admin account (in a second terminal):
```bash
docker compose exec backend python manage.py create_admin
# default username/password: admin / Admin@12345
# override with --username / --password
```

Sanity checks:
- API docs: http://localhost:8000/api/docs/
- Health check: http://localhost:8000/health/

Run the backend test suite any time with:
```bash
docker compose exec backend python manage.py test tests
```

## 3. Frontend — install once per app

Each of the 8 apps under `frontend/` is an independent Next.js project
with its own `package.json` (this is a plain multi-app folder, not an
npm/pnpm workspace, so `npm install` has to run in each one separately):

```bash
cd frontend
for app in landing-page family-panel patient-panel caregiver-panel \
           agency-panel supervisor-panel admin-panel superuser-panel; do
  (cd "$app" && npm install)
done
cd ..
```

This will take a few minutes the first time (8 separate installs).
`shared-ui/` is not a runnable app — it's just a reference copy of the
shared components/tokens; nothing to install there.

## 4. Frontend — run in dev mode

Each app already has its own fixed dev port baked into its
`package.json`, and `landing-page` already points at exactly these
ports by default (`frontend/landing-page/lib/panel-urls.ts`), so you
don't need to configure anything to have them link to each other
correctly on localhost:

| App | Port | Command (from that app's folder) |
|---|---|---|
| supervisor-panel | 3000 | `npm run dev` |
| family-panel | 3001 | `npm run dev` |
| caregiver-panel | 3002 | `npm run dev` |
| patient-panel | 3003 | `npm run dev` |
| agency-panel | 3004 | `npm run dev` |
| superuser-panel | 3005 | `npm run dev` |
| admin-panel | 3006 | `npm run dev` |
| landing-page | 3007 | `npm run dev` |

You almost certainly don't want all 8 running at once for day-to-day
work — pick the one you're actually working on and run just that:
```bash
cd frontend/family-panel
npm run dev
# open http://localhost:3001
```

If you do want the full experience (landing page linking out to every
role panel), open 8 terminal tabs and start all of them, or run them
in the background:
```bash
cd frontend
for app in landing-page family-panel patient-panel caregiver-panel \
           agency-panel supervisor-panel admin-panel superuser-panel; do
  (cd "$app" && npm run dev &)
done
# landing page: http://localhost:3007
```

Each app talks to the backend at `http://localhost:8000` by default
(see each app's `services/api.ts` / `.env` handling if you need to
point it elsewhere).

## 5. Sign-in flow while testing

- Family / patient / caregiver / agency sign-up happens through each
  panel's own `/login` page (phone + OTP, or agency/patient invite
  codes — see each panel's UI).
- Admin / superuser / supervisor panels expect an account with that
  role — use the `create_admin` command from step 2, then use
  `authorization` (superuser only) to grant roles to other accounts,
  or create them directly via Django admin if you've enabled it.

## 6. Production-style deploy (optional)

`docker-compose.prod.yml` wires up Postgres, Redis, the backend, and
5 of the 8 frontend apps (landing_page, family_panel, patient_panel,
caregiver_panel, supervisor_panel) behind nginx with HTTPS —
agency-panel, admin-panel, and superuser-panel aren't wired into it
yet, so add them there if you need those in a real deployment. Full
walkthrough (server requirements, DNS, SSL) is in `docs/DEPLOYMENT.md`.

## Troubleshooting

- **`docker compose up` fails on Postgres health check** — a previous
  run's volume may be stale; `docker compose down -v` and try again
  (this wipes local dev data).
- **A frontend app can't reach the backend** — confirm
  `docker compose ps` shows `backend` healthy on 8000 before starting
  the frontend.
- **`npm install` fails on a specific package** — delete that app's
  `package-lock.json` and `node_modules`, then retry; if it's a
  registry/network issue rather than a real conflict, it'll usually
  resolve on retry.
- **Port already in use** — something else on your machine is using
  one of 3000–3007 or 8000; stop it or change the port in that app's
  `package.json` `dev` script (and update `panel-urls.ts` to match if
  you change one of the 7 panel ports).
