# Supply Chain Manager

## [→ Live demo — no signup required](https://supplychainmanager.app/dashboard/overview?demo=true)

Opens directly into a populated dashboard pre-loaded with a seeded 4-warehouse dataset. Nothing to create, nothing to configure. Writes (1-click orders, stock adjustments, imports) are intercepted as simulations in this mode — the canonical data stays pristine for the next visitor.

---

An inventory replenishment and operations-health platform for distributors and wholesale suppliers. It reads 90 days of transaction history, supplier lead times, and stock levels across every warehouse, and turns that into a daily-updated health score, time-phased reorder/expedite/transfer recommendations, and a stockout-projection view per SKU — built to answer "what do I need to order today, and why" without a planner building a pivot table first.

## Screenshot

![SKU-1015 sawtooth stockout projection](docs/screenshots/sawtooth-sku-1015.png)

The projected on-hand balance for one SKU at one warehouse, walked forward day by day: it declines at the forecast demand rate, crosses into the red stockout band, then steps up sharply when PO-8063 lands — with its revised ETA shown alongside the date it was originally due, since it arrived late. The badge above the chart states the forecasting mode currently in effect; this capture landed on a cold start, which is itself the honest, expected behavior (see Limitations).

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Next.js 16 Web App (Vercel)                     │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────┐  │
│  │   Domain Engine & Metrics Layer │  │   Smart Importer Pipeline   │  │
│  │   (Time-Phased Netting Math)    │  │   (Header Detection, Fuzzy) │  │
│  └─────────────────────────────────┘  └─────────────────────────────┘  │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │ Prisma ORM (Pooled)             │ HTTPS + X-Forecast-Secret
                   ▼                                 ▼
┌──────────────────────────────────────┐ ┌───────────────────────────────┐
│     PostgreSQL Database (Neon)       │ │  Python Forecasting Service   │
│  • Warehouses, Suppliers, Products   │ │  (FastAPI, Vercel serverless) │
│  • Inventory, POs, 90d Transactions  │ │  • 7-Model Rolling Tournament │
│  • Canonical Dataset Protection      │ │  • Croston SBA, Holt-Winters  │
└──────────────────────────────────────┘ └───────────────────────────────┘
```

The web app and the forecasting service are two separately deployed Vercel projects. The web app calls the forecasting service over authenticated HTTPS for the model-tournament path (Forecast Accuracy page, stockout projections); the core reorder-point math below runs independently, in the web app itself, and never depends on the Python service being reachable.

**The Python service is a Vercel serverless function, not a container.** `forecasting-service/api/index.py` re-exports the existing FastAPI `app` object; Vercel's zero-config FastAPI detection wraps it as a Fluid Compute function (`vercel project inspect` confirms `Framework Preset: FastAPI`). statsmodels, scipy, pandas, and numpy all fit comfortably — the deployed function bundle is 62.6MB, well under Vercel's 250MB standard / 5GB Fluid Compute limits. There is no always-on process and no traditional "sleeping free-tier dyno"; the runtime is a request-triggered function whose container gets recycled after a period of inactivity, same as any other Vercel Function.

## The forecasting approach

- **Time-phased, not flat netting.** Replenishment isn't "on-hand minus reorder point." The engine walks forward day by day across the supplier's lead time plus review period, crediting each inbound PO on the day it's projected to land and debiting daily demand, until it finds the day the balance would cross zero (if ever). That day-by-day walk is the same data structure that draws the sawtooth chart above — the chart and the reorder alerts read one shared function, so they can't disagree.
- **Safety stock from demand variability**, not a flat percentage: $SS = Z_{0.95} \times \sqrt{L \cdot \sigma_d^2 + \bar{d}^2 \cdot \sigma_L^2}$ — it scales with how erratic the demand *and* the supplier's delivery timing actually are, not a guessed buffer.
- **Per-series model tournament.** The Python service rolling-origin cross-validates 7 classical methods (Naive, Seasonal Naive, SMA 7d/14d, Simple Exponential Smoothing, Holt Linear Trend, Holt-Winters, Croston/Croston SBA) independently for every SKU × warehouse pair, and the lowest out-of-fold WAPE wins — a fast-moving SKU and an intermittent one don't get the same model.
- **Reorder vs. Expedite vs. Transfer** are three different answers to "the projection shows a problem":
  - **Reorder** — no PO is already in transit; cut a new one.
  - **Expedite** — a PO exists, but it's scheduled to land *after* the projected stockout date; the fix is to expedite it, not double-order.
  - **Transfer** — a sibling warehouse holds solvent surplus that can cover the gap without waiting on the vendor at all.

## M5 Competition demand forecasting benchmark

The tournament engine was benchmarked against the real Walmart **M5 Forecasting Competition** dataset — 210 time series across Foods, Household, and Hobbies — using rolling-origin 3-fold cross-validation with a 14-day forward horizon:

| Category | Model Candidate | WAPE | MASE vs Naive | Lift vs Naive |
| :--- | :--- | :--- | :--- | :--- |
| **Foods (Fast Moving)** | Naive (Last Value) | 24.7% | 1.000 | +0.0% |
| | Seasonal Naive (Weekly $m=7$) | 15.4% | 0.625 | +37.5% |
| | SMA (14-Day) | 21.3% | 0.865 | +13.5% |
| | Single Exp Smoothing (SES) | 21.3% | 0.864 | +13.6% |
| | Holt-Winters Additive | 21.3% | 0.864 | +13.6% |
| | Croston (SBA Debiased) | 21.5% | 0.871 | +12.9% |
| | **Tournament Winner** | **15.4%** | **0.622** | **+37.8%** |
| **Household (Moderate)**| Naive (Last Value) | 38.1% | 1.000 | +0.0% |
| | Seasonal Naive (Weekly $m=7$) | 37.2% | 0.977 | +2.3% |
| | SMA (14-Day) | 28.4% | 0.745 | +25.5% |
| | Single Exp Smoothing (SES) | 28.4% | 0.746 | +25.4% |
| | Holt-Winters Additive | 32.3% | 0.848 | +15.2% |
| | Croston (SBA Debiased) | 28.6% | 0.753 | +24.7% |
| | **Tournament Winner** | **28.0%** | **0.735** | **+26.5%** |
| **Hobbies (Intermittent)**| Naive (Last Value) | 157.8% | 1.000 | +0.0% |
| | Seasonal Naive (Weekly $m=7$) | 168.9% | 1.070 | *-7.0% (Worse)* |
| | SMA (14-Day) | 156.8% | 0.994 | +0.6% |
| | Single Exp Smoothing (SES) | 156.9% | 0.994 | +0.6% |
| | Holt-Winters Additive | 163.3% | 1.035 | *-3.5% (Worse)* |
| | Croston (SBA Debiased) | 156.6% | 0.992 | +0.8% |
| | **Tournament Winner** | **120.7%** | **0.765** | **+23.5%** |
| **OVERALL PORTFOLIO** | **Naive Baseline** | **73.5%** | **1.000** | **+0.0%** |
| | **Tournament Selection** | **54.7%** | **0.744** | **+25.6% Lift** |

**Where the naive baseline wins.** On Hobbies (sparse, low-velocity items), Seasonal Naive and Holt-Winters both *lose* to plain Naive by 3.5–7.0% — fitting a weekly seasonal pattern onto mostly-zero series overfits the zeroes. The tournament selector catches this per series and reverts to Croston SBA or a simple moving average instead of forcing a seasonal model where it doesn't belong.

## Limitations, stated plainly

- **The Smart Importer's "10/10 headers resolved" claim is a self-test, not a customer validation.** It was measured against `fixtures/messy_inventory_workbook.xlsx`, a workbook I wrote myself to exercise the header-detection logic — not a real customer file. Treat it as a demonstration of the scoring approach, not a measured accuracy rate.
- **No real customer has used this system.** Every number in the demo — OTIF rates, stockout projections, demand patterns — comes from a synthetic seeded dataset, not production usage.
- **Imports are capped per plan** (demo/trial 50,000 rows per import; Starter 100,000; Growth 500,000; Professional 2,000,000), configured in `src/lib/subscriptions/tiers.ts` and enforced server-side; a single org can be given a higher limit via `organizations.import_row_limit_override`. Files upload in 2,000-row chunks and commit in one transaction. The largest file tested end-to-end is 21,586 rows — the higher tiers' ceilings are configured, not yet load-tested. Imports into the public demo workspace run in full and are then rolled back, so the shared demo data never changes.
- **No payment processing is wired up.** The plan/billing UI writes to an in-memory store to demonstrate tier gating; it is not connected to Stripe or any processor.
- **Cold starts happen, and the app says so.** The forecasting service runs as a serverless function; after a period of inactivity, the first request can be slow enough to miss the web app's 2.5-second budget. When that happens, the dashboard falls back to a deterministic trailing-mean calculation automatically — and always labels which mode produced the numbers on screen, never silently.
- **The forecasting service isn't git-connected for auto-deploy yet.** It was deployed via CLI from a local directory; a `GET /health` currently returns an empty `commit_sha` because of that, not because of a code bug (see `src/lib/forecasting/__tests__/contract-deployed-service.test.ts`, which asserts this and currently fails on that one check by design, to keep the gap visible instead of silent). Fixing it needs the project's Root Directory set to `forecasting-service` in the Vercel dashboard — the Vercel CLI has no command for that setting.

## Getting started (local development)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env.local
# FORECAST_SERVICE_URL / FORECAST_SERVICE_SECRET are optional locally —
# without them the app runs correctly in fallback (trailing-mean) mode.

# 3. Start local Postgres database (Prisma dev server)
npm run db:dev

# 4. Apply migrations and seed canonical dataset
npm run db:migrate
npm run db:seed

# 5. Run test suites & verification
npm test
npm run test:verify

# 6. Start Next.js development server on port 3005
npm run dev
```

Open [http://localhost:3005](http://localhost:3005) to explore the application locally.

### Demo dataset

Org `org_demo` is pre-seeded with: 4 warehouses, 6 suppliers, 24 products, 49 inventory positions, 64 purchase orders, and ~3,900 transactions over 90 days. `npm run db:seed` anchors every transaction/PO date to the real clock at seed time (not a fixed calendar date), so these five counts and SKU-1015's ~3.2 days of cover are exact immediately after a fresh seed and then drift slowly as real time passes — expected, not a bug. `npm run test:verify` checks all of this against whichever database `DATABASE_URL` points at.

### Known metric drift

Two numbers move for reasons worth naming explicitly, so a future "why doesn't this match the README" doesn't turn into a multi-hour investigation the way it did once already:

- **Overall health score** (weighted: inventory 0.30, supplier 0.20, procurement 0.20, logistics 0.20, warehouse 0.10) sits around **85/100** on a freshly seeded canonical dataset, not a lower number some earlier planning notes assumed — verified by re-running the pre-refactor scoring formula against live data and getting 84, not a materially different number. `verify-canonical.ts` asserts it stays in a 75-95 band; a value outside that band is a real regression worth investigating, not drift.
- **Alert count** sits around **6** (1 stockout-imminent, 1 low-stock, 2 overdue POs, 1 supplier underperformance, 1 overstock rollup covering all 12 overstocked positions as a single card) — not a much larger number. `verify-canonical.ts` asserts a 4-10 band for the same reason.

Both bands, and the reasoning behind them, live in `prisma/verify-canonical.ts`'s file header — update the band and this paragraph together if the scoring formula or seed data changes deliberately.
