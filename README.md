# Prialto Finance App

An internal, live finance dashboard for Prialto — pulls from Salesforce, QuickBooks
Online, and Time Doctor into one place so department heads and finance
stakeholders can see revenue, unit economics, utilization, and core financials
without jumping between three tools.

Status: **working scaffold, running on demo data by default.** The full app
(auth, dashboards, integration connectors, sync jobs) is built; what's not done
yet is connecting it to Prialto's real accounts, which requires credentials only
a Prialto admin can generate (see `docs/CREDENTIALS.md`) and a real deployment
target (see "Deploying" below).

## What's in here

- **Revenue & Unit Economics** — MRR/ARR, active Prialto Units by tier, top
  clients, Salesforce pipeline by stage.
- **Utilization & Delivery Cost** — hours billed vs. hours delivered (from Time
  Doctor), by delivery region (Guatemala/Manila/Nairobi) and by client, with an
  at-risk-clients view.
- **Core Financials** — P&L, balance sheet, AR aging, opex by department, cash
  position — from QuickBooks' documented Accounting API entities (not the
  legacy Reports API, which Intuit is retiring parts of on June 30, 2026).
- **Data Health** — integration status per source, so finance can see at a
  glance whether a sync is current or broken.
- **Company SSO** — Google Workspace / Microsoft login only, restricted to your
  email domain (`ALLOWED_EMAIL_DOMAIN`); no separate passwords.

## Architecture

- **Next.js 14** (App Router, TypeScript) — one codebase for frontend + API/backend.
- **PostgreSQL + Prisma** — normalized store for clients, units, invoices, time
  entries, financial statement lines, and a `MonthlyMetric` rollup table that
  trend charts read from (see `prisma/schema.prisma` for the full model + the
  reasoning comments above each table).
- **NextAuth** — Google + Microsoft Entra (Azure AD) SSO providers.
- **Recharts** — all charts follow the palette/interaction rules in the
  project's dataviz guidelines (fixed categorical color order, single-hue
  sequential, no dual-axis charts, tooltips + legends, accessible data tables
  alongside every chart).
- **Integration connectors** (`src/lib/integrations/`) — one file per source,
  each handling OAuth token refresh and typed fetches against that system's
  documented API. `scripts/sync-all.ts` orchestrates a pull across all of them
  and records results in `SyncRun` (surfaced on the Data Health page).
- **Mock data mode** (`USE_MOCK_DATA=true`, the default) — every dashboard
  query function (`src/lib/queries/*.ts`) returns realistic generated data
  shaped like Prialto's real unit economics, so the whole app is reviewable
  and demoable before any real credentials exist. Flip to `false` once synced
  data is flowing.

```
src/
  app/                    routes (App Router)
    login/                SSO sign-in
    dashboard/             revenue, utilization, financials, data-health
    api/auth/[...nextauth]/
  components/
    charts/                Recharts wrappers (TrendLineChart, CategoryBarChart, ...)
    ui/                    StatTile, DataTable, Nav, FilterBar, Badge
  lib/
    integrations/          salesforce.ts, quickbooks.ts, timedoctor.ts
    queries/                revenue.ts, utilization.ts, financials.ts (mock ⇄ live switch)
    mock-data.ts            demo data generator
    auth.ts, db.ts
prisma/
  schema.prisma
  seed.ts                  seeds a Postgres DB with sync-shaped demo data
scripts/
  sync-all.ts               pulls from all 3 sources, writes SyncRun records
docs/
  CREDENTIALS.md            how to get API access to all 3 systems
```

## Running it locally

Requires Node 18.18+ and Docker (for Postgres) — or point `DATABASE_URL` at
any Postgres instance you already have.

```bash
cp .env.example .env          # fill in NEXTAUTH_SECRET at minimum to run locally
docker compose up -d db       # starts Postgres only
npm install
npm run db:push               # creates tables from prisma/schema.prisma
npm run db:seed               # optional — seeds realistic demo rows into Postgres
npm run dev                   # http://localhost:3000
```

With `USE_MOCK_DATA=true` (default), the dashboards work immediately —no DB
required for the dashboard pages themselves, though auth still needs a
database to store users, so `db:push` is still required once.

## Connecting real data

1. Get API credentials for each system — `docs/CREDENTIALS.md` walks through
   Salesforce, QuickBooks Online, and Time Doctor step by step.
2. Fill in `.env` with the values you get.
3. Set `USE_MOCK_DATA=false`.
4. Run `npm run sync:all` once for an initial backfill.
5. Schedule `sync:all` to run periodically (see "Scheduling syncs" below).

## Scheduling syncs

`scripts/sync-all.ts` is a plain Node script — run it however fits your
deployment:

- **Cron on a server / container:** `0 */4 * * * cd /app && npm run sync:all`
- **Vercel Cron** (if deploying to Vercel): add a `vercel.json` cron entry
  pointing at a small API route that calls the same sync functions.
- **GitHub Actions on a schedule:** a workflow that checks out the repo,
  installs deps, and runs `npm run sync:all` against your production
  `DATABASE_URL`.

Time Doctor data (hours delivered) is the most time-sensitive for the
utilization dashboard — sync it hourly if utilization/at-risk-client alerts
matter day-to-day; Salesforce/QuickBooks every 4 hours is plenty for revenue
and financials.

## Deploying

This was built deployable-anywhere rather than locked to one host, per your
call to decide hosting later:

- **Docker (any cloud or on-prem):** `docker compose up --build` brings up the
  app + Postgres together. Point a reverse proxy / load balancer at port 3000
  and set real env vars via your platform's secrets manager instead of `.env`.
- **Vercel + managed Postgres** (e.g. Neon, Supabase, RDS): deploy the Next.js
  app to Vercel, point `DATABASE_URL` at your managed Postgres, run
  `npm run db:push` once against it, and set up sync scheduling via Vercel
  Cron (see above) since Vercel's serverless functions don't run long-lived
  background jobs.
- **Your own AWS/Azure/GCP account:** the Dockerfile works as-is on ECS,
  Cloud Run, Azure Container Apps, etc. — same Docker path as above.

Whichever you pick, set `NEXTAUTH_URL` to the real deployed URL and register
that URL's OAuth callback paths with Google/Microsoft and with each of the 4
data-source apps (see `docs/CREDENTIALS.md`).

## Access control

Roles live on `User.role` in the database (`ADMIN`, `EXECUTIVE`,
`DEPARTMENT_HEAD`, `VIEWER`) — an admin needs to set each new user's role
after their first SSO login (there's no self-service role picker yet by
design, since this is finance data). `ALLOWED_EMAIL_DOMAIN` blocks sign-in
from outside your company domain regardless of role.

## What's genuinely done vs. what's next

**Done:** full app shell, SSO, all three dashboards wired to real chart
components and a real (if currently mock-backed) data layer, Prisma schema
covering the whole data model, working connector code against each system's
*documented* API, a sync orchestrator, Docker packaging, and this doc set.

**Next, in rough priority order:**
1. An admin actually completes the OAuth consent flow for each of the 4
   systems in a real deployment (needs a live URL for callbacks — see
   "Deploying").
2. Backfill `Client.salesforceId` / `Client.quickbooksId` so records from
   different systems resolve to the same client (today the sync script
   assumes Salesforce Account Id already matches an existing Client row —
   the first real sync will need a one-time reconciliation pass).
3. Wire the `FilterBar` controls to actually filter query results (currently
   UI-only) once there's live multi-dimensional data to filter.
4. Build out the "at-risk clients" and "net revenue retention" calculations
   properly once ≥2 periods of live data exist (marked as `TODO` in
   `lib/queries/*.ts`).
