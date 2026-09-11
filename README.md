# MoraqebeMan 

An eldercare platform connecting families, elderly patients, professional caregivers, and care agencies — live at [moraqebman.ir](https://moraqebman.ir).

## What this is

Families and patients register separately, connect securely, and get matched with vetted caregivers. Agencies manage their own roster of caregivers and clients through a dedicated panel. Platform staff review and approve caregiver applications before they go live.

## Architecture

- **Backend**: Django + Django REST Framework, one monolithic project (`backend/`) rather than microservices — chosen for lower operational overhead at this stage. PostgreSQL for data, Redis for caching and as the Celery broker, Celery for background jobs (SMS, notifications).
- **Frontend**: 8 separate Next.js applications, one per user type, each with its own subdomain:
  - `moraqebman.ir` — public landing page
  - `family.moraqebman.ir`, `patient.moraqebman.ir`, `caregiver.moraqebman.ir` — OTP-based login
  - `agency.moraqebman.ir`, `admin.moraqebman.ir`, `superuser.moraqebman.ir`, `supervisor.moraqebman.ir` — password-based login
- **Infrastructure**: Docker Compose, nginx as reverse proxy with per-subdomain SSL (Let's Encrypt), hosted on a single VPS.

## Repository structure

```
moraqebeman/
├── backend/          # Django project — all server-side logic
│   └── apps/         # accounts, authentication, agencies, caregivers,
│                      # families, care, reviews, audit, authorization
├── frontend/         # 8 Next.js apps — one per panel (see above)
├── gateway/          # nginx configs
└── docker-compose*.yml
```

## Documentation

Deeper technical detail lives in `docs/` rather than here:

- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — production deployment guide
- [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) — shared UI/design conventions across panels
- [`docs/MATCHING.md`](docs/MATCHING.md) — caregiver-patient matching system
- [`docs/PLATFORM_USAGE_GUIDE.md`](docs/PLATFORM_USAGE_GUIDE.md) — how each panel is used
- [`DEPLOY_REMAINING_PANELS.md`](DEPLOY_REMAINING_PANELS.md) — step-by-step reference for adding a new subdomain/panel to production
