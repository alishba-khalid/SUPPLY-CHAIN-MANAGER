# Supply Chain Manager

An intelligent operations intelligence and automated inventory replenishment platform for distributors and wholesale suppliers. It continuously evaluates 90 days of time-series transactions, supplier lead times, and multi-echelon stock levels across all distribution centers, surfacing an executive supply chain health score, time-phased replenishment orders, and automated supplier expedite actions.

---

## Live Demo & Architecture

- **Live Production URL**: [https://supply-chain-manager-alishba-khalids-projects.vercel.app](https://supply-chain-manager-alishba-khalids-projects.vercel.app)
- **Instant Demo Mode**: [https://supply-chain-manager-alishba-khalids-projects.vercel.app/dashboard/overview?demo=true](https://supply-chain-manager-alishba-khalids-projects.vercel.app/dashboard/overview?demo=true) *(Zero sign-up required, pre-loaded with canonical 4-warehouse dataset)*

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
│     PostgreSQL Database (Neon)       │ │  Python Statistical Service   │
│  • Warehouses, Suppliers, Products   │ │  (FastAPI / Uvicorn Microservice)
│  • Inventory, POs, 90d Transactions  │ │  • 7-Model Rolling Tournament │
│  • Canonical Dataset Protection      │ │  • Croston SBA, Holt-Winters  │
└──────────────────────────────────────┘ └───────────────────────────────┘
```

---

## Core Forecasting & Replenishment Mathematics

Every replenishment recommendation, stock health alert, and safety stock calculation is driven by pure mathematical functions defined in `src/lib/metrics/*` and `src/lib/forecasting/*`:

### 1. Daily Demand Velocity ($\bar{d}$) & Outlier Trimming
To protect against erratic single-day inventory spikes from distorting baseline replenishment, daily demand is computed over the trailing 90 days with $3\sigma$ Winsorization:
$$\bar{d} = \frac{1}{N} \sum_{t=1}^{N} \min(d_t, \mu + 3\sigma)$$

### 2. Time-Phased Forward Projection & Netting
Replenishment does not simply look at static snapshot balances. It computes forward projection across the supplier's actual lead time window $L$ plus review period $R$:
$$\text{Projected Stockout Day} = t \quad \text{where} \quad \text{QOH} + \sum_{\tau \le t} \text{Inbound PO}_\tau - t \cdot \bar{d} \le \text{Safety Stock}$$

- **Expedite Flag**: If an inbound PO is already in transit but scheduled to arrive *after* stockout ($t_{\text{stockout}} < t_{\text{arrival}}$), the system emits an **Expedite Action** rather than double-ordering.
- **Inter-Warehouse Transfer**: If a sibling facility holds excess inventory exceeding its donor solvency target ($\text{QOH}_{\text{donor}} > 1.5 \times \text{Target}_{\text{donor}}$), a **1-Click Inter-Warehouse Transfer** is proposed before cutting a vendor PO.

### 3. Dynamic Safety Stock ($SS$) & Overstock Scaling
Safety stock dynamically scales with demand volatility $\sigma_d$ and supplier lead time variance $\sigma_L$:
$$SS = Z_{0.95} \times \sqrt{L \cdot \sigma_d^2 + \bar{d}^2 \cdot \sigma_L^2}$$
$$\text{Overstock Threshold} = \min(3.0 \times (\bar{d} \cdot L + SS), \; \bar{d} \cdot 180)$$

---

## M5 Competition Demand Forecasting Benchmark

The statistical tournament engine was benchmarked against the real-world Walmart **M5 Forecasting Competition** dataset across 210 time series (Foods, Household, Hobbies) using rolling-origin 3-fold cross-validation with a 14-day forward evaluation horizon:

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

### Key Empirical Findings:
1. **Seasonal Naive excels on Grocery/Foods**: Clear 7-day cyclical demand shopping patterns make Seasonal Naive provide a +37.5% error reduction over standard Naive.
2. **Where Complex Models Fail (Intermittent SKUs)**: For sparse, low-velocity items (Hobbies), fitting seasonal Holt-Winters actually *increases* error by 3.5% to 7.0% due to overfitting on zeroes. The tournament selector intelligently reverts to Croston SBA or simple Moving Average.

---

## Cold-Start & Microservice Fallback Strategy (E4)

- **Architecture**: The Next.js web application communicates with the Python statistical forecaster over authenticated HTTPS (`X-Forecast-Secret`).
- **Resilience**: Client requests have a strict 2,500ms timeout budget. If the microservice is asleep (free-tier cold start) or unreachable, the application falls back seamlessly to deterministic trailing-mean velocity without crashing.
- **Visual Mode Indication**: The dashboard always indicates the active mode:
  - `Live Statistical Forecaster Active (FastAPI v1.0)`: 7-model tournament with 80% prediction intervals.
  - `Statistical Microservice in Offline / Fallback Mode`: Deterministic trailing buffer safety net.

---

## Demo Organization & Sandbox Protection (E5)

- Demo organization ID: `org_demo`
- Pre-seeded with the verified canonical dataset:
  - **4 Warehouses**: `NDC` (50,000 cap), `WH-WEST` (25,000 cap), `WH-EAST` (30,000 cap), `WH-SOUTH` (15,000 cap)
  - **6 Suppliers**: `SUP-001` through `SUP-006` (`SUP-004` at 0% OTIF with 2 overdue POs)
  - **24 Products**: `SKU-1001` through `SKU-1024`
  - **49 Inventory Positions**: Yielding 12 overstock positions and `SKU-1015` at `NDC` with 3.2 days cover
  - **64 Purchase Orders** & **~3,900 Transactions** over 90 days
- **Visitor Isolation**: Write actions (1-Click PO generation, stock adjustments, file imports) in demo mode are intercepted as non-destructive simulations, displaying interactive toast confirmations while keeping canonical test metrics 100% pristine for subsequent visitors.

---

## Smart Data Importer & Header Matching (A4)

The Smart Data Importer allows operators to drop unstandardized spreadsheets (`.xlsx`, `.xlsm`, `.csv`, `.tsv`):
- Automatically scores and detects header rows positioned beneath merged title blocks.
- Cleans South Asian commercial synonyms (`Godown`, `Particulars`, `Party Name`, `Rate`).
- Deduplicates vendor abbreviations using combined Levenshtein distance and token-prefix matching (`"Delta Comp"` $\rightarrow$ `"Delta Components LLC"`).
- Extracts entities in strict relational dependency order (`warehouses` $\rightarrow$ `suppliers` $\rightarrow$ `products` $\rightarrow$ `inventory` $\rightarrow$ `purchase_orders` $\rightarrow$ `transactions`).

*Note on Test Fixture*: 10/10 headers were resolved automatically on the synthetic test fixture (`fixtures/messy_inventory_workbook.xlsx`). In production, ambiguous columns trigger human-in-the-loop review and are stored in workspace mapping memory (`import_mappings`).

---

## Getting Started (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env.local

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
