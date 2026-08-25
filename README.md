# Supply Chain Manager

An operations dashboard for distributors — inventory health, supplier reliability,
procurement performance, logistics, and warehouse utilization, all rolled up into a
single health score. Every number is computed by pure functions in `src/lib/metrics/*`
and `src/lib/insights/*` from real data in Postgres — see `docs/metrics.md` for the
exact formula behind every figure on the dashboard.

## Prerequisites

- Node.js 20+
- No Docker and no separate Postgres install needed — the database runs locally via
  Prisma's own dev server (see below).

## Getting started

```bash
npm install

# 1. Start the local database (leave this running in its own terminal)
npm run db:dev

# 2. In another terminal: create the schema and load demo data
npm run db:migrate
npm run db:seed

# 3. Run the app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it redirects to `/dashboard/overview`.
The marketing landing page lives at `/`.

## Database

The app is backed by Postgres via [Prisma](https://www.prisma.io/) (schema at
`prisma/schema.prisma`). Locally it runs on **Prisma's own dev server** (`prisma dev`) —
a real Postgres instance with no Docker or manual install required. It's a separate
long-running process from `next dev`, so keep it running in its own terminal while you
work.

| Command | What it does |
| --- | --- |
| `npm run db:dev` | Starts the local Postgres server (run this first, leave it running) |
| `npm run db:migrate` | Applies `prisma/schema.prisma` to the database |
| `npm run db:seed` | Wipes and repopulates a realistic-but-imperfect demo distributor (3 warehouses, ~120 SKUs, 8 suppliers, ~200 purchase orders, 90 days of transactions) — safe to re-run any time |
| `npm run db:health` | Prints the current health score breakdown by domain, without starting the app |
| `npm run db:studio` | Opens Prisma Studio, a GUI for browsing/editing the data directly |

**If the database connection acts up** (`P1017` / "connection closed" errors — a known
rough edge of the local dev server under sustained use): stop and restart it —

```bash
npx prisma dev stop scm2
npm run db:dev
```

then re-run whichever command failed. The app's own Prisma client (`src/lib/prisma.ts`)
already retries transient connection drops automatically, so this is only needed if a
command fails outright.

### Schema scope

The schema intentionally covers six tables — `warehouses`, `suppliers`, `products`,
`inventory`, `purchase_orders`, `transactions` — with no customer-order or shipment
concept yet. See the "Schema scope" section at the top of `docs/metrics.md` for what
that means for the Logistics score and OTIF calculation.

## Project structure

- `src/lib/metrics/*` — pure calculation functions (no data access, no UI)
- `src/lib/insights/*` — alerts, recommendations, and the activity feed, derived from
  the metrics layer
- `src/data/repositories/*` — the only place that queries Prisma; everything else reads
  through these functions
- `src/app/(app)/dashboard/*` — the authenticated app shell (noindexed)
- `src/app/(marketing)/*` — the public landing page
- `docs/metrics.md` — the single source of truth for every formula; update it first if
  a calculation changes

## Learn more

This project uses the Next.js App Router. See the
[Next.js documentation](https://nextjs.org/docs) for framework-level questions.
