# Statistical Demand Forecasting Microservice

A production-ready statistical demand forecasting service built in Python (FastAPI). It delivers tournament model selection across classical time series algorithms, 80% prediction intervals for safety stock sizing, rolling-origin backtesting with zero lookahead bias, and automated 3x3 ABC/XYZ portfolio classification.

---

## 1. Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │    Next.js App (Supply Chain Manager)  │
                      │  - Time-Phased Projection Engine       │
                      │  - Suggested Purchase Orders           │
                      │  - Forecast Accuracy Planner Cockpit   │
                      └──────────────────┬─────────────────────┘
                                         │
                 HTTP (POST /forecast,   │ Fallback to robust
                 POST /backtest, 2.5s)   │ trailing-mean velocity
                                         ▼
                      ┌────────────────────────────────────────┐
                      │ Python Statistical Forecaster (FastAPI)│
                      │  - Naive & Seasonal Naive (Baselines)  │
                      │  - Moving Average (SMA 7d/14d)         │
                      │  - Exponential Smoothing (SES / Holt / │
                      │    Holt-Winters weekly m=7)            │
                      │  - Croston & SBA (Intermittent demand) │
                      │  - Rolling-Origin Backtesting (CV)     │
                      │  - WAPE / Bias / MAPE / RMSE / MASE    │
                      │  - Per-Series Tournament Model Select  │
                      │  - 3x3 ABC/XYZ Segmentation & Policy   │
                      │  - 80% Prediction Intervals (SS input) │
                      └────────────────────────────────────────┘
```

---

## 2. Models & Formulations

| Model | Formula / Implementation | Best Suited For |
| :--- | :--- | :--- |
| **Naive** | $\hat{y}_{t+h} = y_t$ | Short history, benchmark comparison |
| **Seasonal Naive** | $\hat{y}_{t+h} = y_{t+h-m}$ ($m=7$) | Dominant weekly patterns, retail grocery baseline |
| **Simple Moving Average** | $\hat{y}_{t+h} = \frac{1}{k}\sum_{i=0}^{k-1} y_{t-i}$ | Steady demand, noise suppression |
| **Simple Exp Smoothing (SES)** | $\ell_t = \alpha y_t + (1-\alpha)\ell_{t-1}$ | Constant level without trend or seasonality |
| **Holt Linear Damped** | $\hat{y}_{t+h} = \ell_t + \sum_{i=1}^h \phi^i b_t$ ($\phi=0.95$) | Sustained growth/decline with damping |
| **Holt-Winters (Weekly)** | $\hat{y}_{t+h} = \ell_t + h b_t + s_{t+h-m}$ ($m=7$) | Trend + strong day-of-week seasonality |
| **Croston Classical** | $\hat{y}_{t+h} = z_t / p_t$ | Intermittent / sparse demand |
| **Croston SBA** | $\hat{y}_{t+h} = (1 - \alpha/2) \cdot (z_t / p_t)$ | Debiased intermittent replenishment |

---

## 3. Rolling-Origin Cross-Validation & Tournament Selection

The service conducts rolling-origin backtesting across expanding folds. On every fold, the boundary invariant is strictly asserted:
$$\text{train\_end\_idx} < \text{test\_start\_idx}$$

### Tournament Selection Criterion
The tournament winner is chosen primarily by **lowest out-of-fold WAPE**:
$$\text{WAPE} = \frac{\sum |y - \hat{y}|}{\sum y}$$

**Tie-Break Parsimony Rule**: If any simpler candidate is within $1.5\%$ WAPE of the best performing model, the simpler model is selected to prevent overfitting.
**Intermittency Rule**: If zero-demand days $\ge 40\%$ or Average Demand Interval $\text{ADI} \ge 1.32$, the model selection prioritizes Croston SBA.

---

## 4. 3x3 ABC/XYZ Portfolio Segmentation

- **ABC (Consumption Value)**: $A$ = Top 80% annual revenue, $B$ = Next 15%, $C$ = Bottom 5%.
- **XYZ (Demand Volatility)**: $X$ = $CV \le 0.50$, $Y$ = $0.50 < CV \le 1.00$, $Z$ = $CV > 1.00$.

---

## 5. Running the Service

```bash
# 1. Activate environment and run tests
forecasting-service\.venv\Scripts\pytest forecasting-service/tests/ -v

# 2. Run M5 validation benchmark
forecasting-service\.venv\Scripts\python forecasting-service/notebooks/validate_m5.py

# 3. Start the FastAPI development server
forecasting-service\.venv\Scripts\uvicorn app.main:app --port 8000 --app-dir forecasting-service
```

## 6. Deployment (Render)

The `Dockerfile` in this directory already binds to `0.0.0.0:$PORT`, which
is exactly what Render's Docker runtime expects — no changes needed to
deploy it as-is. On Render:

- **New Web Service** → connect this repo → **Root Directory**: `forecasting-service` → **Runtime**: Docker (uses the `Dockerfile` here).
- Render sets `PORT` itself; don't set it manually.
- Render also sets `RENDER_GIT_COMMIT` / `RENDER_GIT_BRANCH` automatically for a git-connected service — `GET /health` picks these up for its `commit_sha` / `commit_ref` fields with no extra config.

**Environment variables to set in the Render dashboard** (Environment tab): see `.env.example` in this directory — `FORECAST_SERVICE_SECRET` (must match the web app's) and `CORS_ALLOWED_ORIGINS` (the web app's Vercel domain).

**Health check**: point Render's health check path, and any external uptime monitor, at `GET /health`. It's unauthenticated (no `X-Forecast-Secret` required) and does no model work, so it's cheap to poll.
