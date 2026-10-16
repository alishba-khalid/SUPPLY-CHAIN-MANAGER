import { g, type GlossaryTerm } from "./types";

const U = "2026-10-16";

export const FORECASTING_TERMS: GlossaryTerm[] = [
  {
    slug: "forecast-accuracy",
    term: "Forecast Accuracy",
    short: "Forecast accuracy",
    category: "forecasting",
    definition:
      "Forecast accuracy measures how close demand forecasts came to what actually sold, so you can judge which methods and SKUs can be trusted.",
    explain: [
      [
        "There is no single accuracy number. Common measures include ", g("mape", "MAPE"), ", ", g("wape", "WAPE"), " and ", g("mase", "MASE"), ", and each answers a slightly different question. ", g("forecast-bias", "Bias"), " is measured separately: a forecast can be accurate on average and still consistently too high.",
      ],
      [
        "Accuracy should be judged at the level decisions are made: per SKU per warehouse over the lead time, not as one company-wide total that lets errors cancel out.",
      ],
    ],
    formula: ["Forecast Error = Actual − Forecast", "Accuracy is then summarized with a measure such as WAPE, MAPE or MASE"],
    example: [
      [
        "Illustrative numbers: a forecast of 100 units a week for four weeks against actuals of 80, 120, 90 and 110. Total error cancels to zero, which looks perfect, but the absolute errors add up to 60 units on 400 sold, a WAPE of 15%.",
      ],
    ],
    why: [
      [
        "Without measuring accuracy, nobody knows whether the forecast is helping. Measured accuracy also sets how much safety stock each SKU needs: the less accurate the forecast, the bigger the buffer.",
      ],
    ],
    mistakes: [
      ["Reporting one aggregate number that hides poor SKU-level forecasts."],
      ["Comparing accuracy across SKUs with MAPE when some have near-zero sales."],
      ["Never comparing against a simple ", g("naive-forecast", "naive forecast"), " to see whether the method adds value."],
    ],
    inApp: [
      "Supply Chain Manager's Forecast Accuracy page reports WAPE and MASE for each SKU's chosen model, grouped by ABC and XYZ class.",
    ],
    related: ["wape", "mape", "mase", "forecast-bias", "backtesting"],
    updated: U,
  },
  {
    slug: "mape",
    term: "MAPE (Mean Absolute Percentage Error)",
    short: "MAPE",
    category: "forecasting",
    definition:
      "MAPE (mean absolute percentage error) averages each period's forecast error as a percentage of actual demand, ignoring whether it was over or under.",
    explain: [
      [
        "It is popular because percentages are easy to explain. Its weakness is low or zero demand: a forecast of 2 against an actual of 1 is a 100% error, and an actual of 0 makes the calculation impossible. Slow and intermittent SKUs can therefore produce huge, misleading MAPEs.",
      ],
      [
        "A common variant, symmetric MAPE, divides by the average of actual and forecast to reduce the problem with small actuals, but it has quirks of its own. For a range with many slow movers, measures that divide total error by total demand, such as WAPE, are usually easier to interpret.",
      ],
    ],
    formula: ["MAPE = (1 ÷ n) × Σ ( |Actual − Forecast| ÷ Actual ) × 100"],
    example: [
      [
        "Illustrative numbers: actuals of 100, 50 and 10 against forecasts of 90, 60 and 20. Percentage errors are 10%, 20% and 100%. MAPE = 43%, driven almost entirely by the 10-unit week.",
      ],
    ],
    why: [
      [
        "For a distributor with many slow movers, MAPE can make a decent forecast look terrible. ", g("wape", "WAPE"), " or ", g("mase", "MASE"), " usually give a fairer picture across a whole range.",
      ],
    ],
    mistakes: [
      ["Using MAPE on SKUs with zero-demand periods."],
      ["Averaging MAPE across SKUs, so tiny items dominate the result."],
    ],
    related: ["wape", "mase", "forecast-accuracy", "intermittent-demand"],
    updated: U,
  },
  {
    slug: "wape",
    term: "WAPE (Weighted Absolute Percentage Error)",
    short: "WAPE",
    category: "forecasting",
    definition:
      "WAPE (weighted absolute percentage error) is total absolute forecast error divided by total actual demand, so high-volume periods and SKUs carry more weight.",
    explain: [
      [
        "Because it divides the sum of errors by the sum of actuals, a single low-volume week cannot blow it up the way it does MAPE. It also works across a group of SKUs: the result reads as 'our forecast was off by X% of what we sold'.",
      ],
    ],
    formula: ["WAPE = Σ |Actual − Forecast| ÷ Σ Actual × 100"],
    example: [
      [
        "Illustrative numbers: the same actuals of 100, 50 and 10 against forecasts of 90, 60 and 20 give absolute errors of 10, 10 and 10. WAPE = 30 ÷ 160 = 18.75%, compared with a MAPE of 43%.",
      ],
    ],
    why: [
      [
        "WAPE tracks the units you actually got wrong, which maps directly to excess stock or shortages. That makes it a practical headline measure for a purchasing team.",
      ],
    ],
    mistakes: [
      ["Reading a low portfolio WAPE as proof that every SKU is well forecast."],
      ["Forgetting that WAPE says nothing about direction; check bias separately."],
    ],
    inApp: [
      "Supply Chain Manager backtests several forecasting methods per SKU and picks the one with the lowest WAPE, preferring the simpler model when results are close.",
    ],
    related: ["mape", "mase", "forecast-accuracy", "forecast-bias", "backtesting"],
    updated: U,
  },
  {
    slug: "mase",
    term: "MASE (Mean Absolute Scaled Error)",
    short: "MASE",
    category: "forecasting",
    definition:
      "MASE (mean absolute scaled error) compares a forecast's average error with that of a simple naive forecast. Below 1 beats naive; above 1 is worse.",
    explain: [
      [
        "Scaling by the naive method's error makes MASE comparable across SKUs of any volume, and it still works when demand is zero in some periods. It answers a blunt question: is this method actually better than assuming tomorrow looks like today?",
      ],
    ],
    formula: [
      "MASE = MAE of the forecast ÷ MAE of a naive forecast on the same history",
      "MAE = mean of |Actual − Forecast|",
    ],
    example: [
      [
        "Illustrative numbers: a smoothing method misses by 6 units a week on average; repeating last week's sales misses by 8. MASE = 6 ÷ 8 = 0.75, so the method removes about a quarter of the naive error.",
      ],
    ],
    why: [
      [
        "A forecast that cannot beat naive is adding complexity, not value. MASE makes that visible per SKU, so you know where to trust a model and where a simple rule will do.",
      ],
    ],
    mistakes: [
      ["Reading a MASE of 0.9 as '90% accurate'. It is a ratio to a benchmark, not an accuracy percentage."],
      ["Comparing MASE figures that used different naive benchmarks (for example last day versus same day last week)."],
    ],
    inApp: [
      "Supply Chain Manager shows MASE on the Forecast Accuracy page, and a MASE above 1 is labelled as behind the naive benchmark.",
    ],
    related: ["naive-forecast", "wape", "forecast-accuracy", "backtesting"],
    updated: U,
  },
  {
    slug: "forecast-bias",
    term: "Forecast Bias",
    short: "Forecast bias",
    category: "forecasting",
    definition:
      "Forecast bias is a consistent tendency to forecast too high or too low, measured by whether errors lean in one direction over time.",
    explain: [
      [
        "Accuracy measures how big errors are; bias measures which way they lean. A biased forecast does steady damage: always high builds overstock, always low causes repeated stockouts.",
      ],
      [
        "Bias often has a human source: sales teams inflating forecasts to protect availability, or a model that never learned demand fell after a big customer left.",
      ],
      [
        "Small bias is normal. What matters is whether it persists. A practical approach is to check bias by SKU group each month and look into any group that leans the same way for three months or more. Fixing bias often means correcting a data issue, such as a lost customer still in the history, rather than changing the model.",
      ],
    ],
    formula: ["Bias % = Σ (Forecast − Actual) ÷ Σ Actual × 100", "Positive = over-forecasting; negative = under-forecasting"],
    example: [
      [
        "Illustrative numbers: over 12 weeks a SKU was forecast at 1,200 units and sold 1,000. Bias = +20%. Even if weekly errors look small, that is 200 units of stock you did not need.",
      ],
    ],
    why: [
      [
        "Bias compounds into inventory problems faster than random error, because the errors do not cancel out. It is also usually the easiest problem to fix once it is visible.",
      ],
    ],
    mistakes: [
      ["Watching only absolute error measures and missing a steady lean."],
      ["Forecasting from shipments during stockouts, which creates a downward bias."],
    ],
    related: ["tracking-signal", "forecast-accuracy", "wape", "lost-sales"],
    updated: U,
  },
  {
    slug: "tracking-signal",
    term: "Tracking Signal",
    short: "Tracking signal",
    category: "forecasting",
    definition:
      "A tracking signal is a running check for forecast bias: cumulative forecast error divided by mean absolute deviation, flagged when it drifts too far from zero.",
    explain: [
      [
        "When errors go both ways, the cumulative error stays near zero. When the forecast keeps missing in one direction, it climbs. Dividing by the mean absolute deviation (MAD) scales it so the same limits work across SKUs. Limits of about ±4 are a common rule of thumb.",
      ],
      [
        "Positive values mean demand is running above forecast, negative below. Some teams use a smoothed version that weights recent errors more heavily, so the signal responds faster to new drift and forgets old errors. Either way, the purpose is the same: to flag forecasts that need attention without reviewing every SKU by hand.",
      ],
    ],
    formula: ["Tracking Signal = Σ (Actual − Forecast) ÷ MAD", "MAD = mean of |Actual − Forecast|"],
    example: [
      [
        "Illustrative numbers: over six weeks the errors (actual − forecast) were +8, +5, +9, +6, +7 and +10. Cumulative error = 45, MAD = 7.5, tracking signal = 6. Demand is running consistently above forecast, so the model needs reviewing.",
      ],
    ],
    why: [
      [
        "With thousands of SKUs, nobody can eyeball every forecast. A tracking signal turns 'this forecast has gone stale' into an automatic flag.",
      ],
    ],
    mistakes: [
      ["Using limits so tight that normal noise triggers constant reviews."],
      ["Resetting the signal without fixing the model that drifted."],
    ],
    related: ["forecast-bias", "forecast-accuracy", "exponential-smoothing", "demand-spike"],
    updated: U,
  },
  {
    slug: "moving-average-forecast",
    term: "Moving Average Forecast",
    short: "Moving average",
    category: "forecasting",
    definition:
      "A moving average forecast predicts next period's demand as the average of the most recent periods, such as the last 7 or 14 days.",
    explain: [
      [
        "It is the simplest smoothing method. A longer window is steadier but slower to react; a shorter window reacts faster but follows noise. Every period in the window counts equally, which is the main difference from ", g("exponential-smoothing", "exponential smoothing"), ".",
      ],
    ],
    formula: ["Forecast (next period) = (Demand₁ + Demand₂ + … + Demandₙ) ÷ n, using the last n periods"],
    example: [
      [
        "Illustrative numbers: daily sales of 12, 15, 9, 14, 10, 13 and 11 over the last week give a 7-day moving average of 12 units a day. A one-off 60-unit day would lift the next week's forecast by about 7 units a day until it drops out of the window.",
      ],
    ],
    why: [
      [
        "For steady SKUs a moving average is often hard to beat, and it is easy to explain. It also makes a sensible benchmark for more complex models.",
      ],
    ],
    mistakes: [
      ["Using it on trending or seasonal SKUs, where it always lags behind."],
      ["Letting one-off bulk orders sit inside the window and inflate the forecast."],
    ],
    inApp: [
      "Supply Chain Manager includes 7- and 14-day moving averages among the methods it backtests for each SKU.",
    ],
    related: ["exponential-smoothing", "naive-forecast", "demand-spike", "backtesting"],
    updated: U,
  },
  {
    slug: "exponential-smoothing",
    term: "Exponential Smoothing",
    short: "Exponential smoothing",
    category: "forecasting",
    definition:
      "Exponential smoothing forecasts demand as a weighted average of past demand in which the newest data counts most and older data fades gradually.",
    explain: [
      [
        "A smoothing factor, alpha (between 0 and 1), sets how quickly the forecast reacts. Simple exponential smoothing tracks a level. Holt's method adds a trend, and Holt-Winters adds a repeating seasonal pattern on top.",
      ],
    ],
    formula: ["New Forecast = α × Latest Actual + (1 − α) × Previous Forecast"],
    example: [
      [
        "Illustrative numbers: last forecast 100, latest actual 120, α = 0.2. New forecast = 0.2 × 120 + 0.8 × 100 = 104. With α = 0.5 it would jump to 110, reacting faster but also chasing more noise.",
      ],
    ],
    why: [
      [
        "Exponential smoothing methods are cheap to compute and adapt well, which suits a distributor forecasting thousands of SKUs every night.",
      ],
    ],
    mistakes: [
      ["Picking alpha by feel instead of testing it on history."],
      ["Using simple smoothing on strongly seasonal SKUs, where it will always lag the season."],
      ["Applying it to intermittent demand, where ", g("crostons-method", "Croston's method"), " usually does better."],
    ],
    inApp: [
      "Supply Chain Manager backtests simple exponential smoothing, Holt's linear trend and Holt-Winters with a weekly cycle for each SKU.",
    ],
    related: ["moving-average-forecast", "seasonality", "crostons-method", "backtesting"],
    updated: U,
  },
  {
    slug: "seasonality",
    term: "Seasonality",
    short: "Seasonality",
    category: "forecasting",
    definition:
      "Seasonality is a repeating, predictable pattern in demand tied to the calendar, such as higher sales every winter, every month-end or every Monday.",
    explain: [
      [
        "Seasonal cycles can be yearly (weather, holidays), monthly (budget cycles) or weekly (trade customers ordering on Mondays). A seasonal pattern repeats at a known interval; a one-off spike does not, and should not be treated as seasonal.",
      ],
      [
        "Seasonal indices express each period as a multiple of the average: an index of 1.4 for December means December demand runs 40% above a typical month.",
      ],
    ],
    formula: ["Seasonal Index = Average demand in that period ÷ Average demand across all periods"],
    example: [
      [
        "Illustrative numbers: a heating product averages 1,000 units a month across the year, 1,800 in January and 400 in July. January's index is 1.8 and July's is 0.4. Planning July purchases from the annual average would leave 600 surplus units on the shelf.",
      ],
    ],
    why: [
      [
        "Seasonal SKUs need stock built before the peak, which means ordering at least one lead time earlier. Missing the pattern leads to stockouts in the peak and overstock afterwards.",
      ],
    ],
    mistakes: [
      ["Calling a pattern seasonal after seeing it only once."],
      ["Using a plain average for a seasonal SKU."],
    ],
    related: ["anticipation-inventory", "exponential-smoothing", "naive-forecast", "forecast-horizon"],
    updated: U,
  },
  {
    slug: "intermittent-demand",
    term: "Intermittent Demand",
    short: "Intermittent demand",
    category: "forecasting",
    definition:
      "Intermittent demand is sales that come in occasional bursts, with many periods of zero demand in between, common for spare parts and specialist items.",
    explain: [
      [
        "Standard methods forecast intermittent items poorly: an average spreads demand thinly over periods when nothing sells, then falls short when an order arrives. Specialized methods such as ", g("crostons-method", "Croston's method"), " forecast the size of orders and the gap between them separately.",
      ],
      [
        "Lumpy demand is intermittent demand where order sizes also vary a lot. It is the hardest pattern to forecast and often better handled with a stocking policy than a precise forecast.",
      ],
    ],
    example: [
      [
        "Illustrative numbers: a pump seal sold 0, 0, 12, 0, 0, 0, 10, 0 units over eight weeks. Its average is 2.75 a week, but no week actually sold 2.75; real demand arrives about every three to four weeks, in batches of 10 to 12.",
      ],
    ],
    why: [
      [
        "Distributors of industrial, electrical and maintenance supplies often have many intermittent SKUs. Handling them with the wrong method creates both stockouts and dead stock.",
      ],
    ],
    mistakes: [
      ["Judging intermittent forecasts with MAPE, which breaks on zero-demand periods."],
      ["Holding stock to the average instead of to the typical order size."],
    ],
    inApp: [
      "Supply Chain Manager tests Croston's method and its SBA variant on SKUs whose history shows intermittent demand.",
    ],
    related: ["crostons-method", "xyz-analysis", "coefficient-of-variation", "mase"],
    updated: U,
  },
  {
    slug: "crostons-method",
    term: "Croston's Method",
    short: "Croston's method",
    category: "forecasting",
    definition:
      "Croston's method forecasts intermittent demand by smoothing two things separately: the size of non-zero orders and the interval between them.",
    explain: [
      [
        "The forecast demand rate is the smoothed order size divided by the smoothed interval. Estimates only update in periods with demand, so a run of zero weeks does not drag the size estimate down.",
      ],
      [
        "The Syntetos-Boylan Approximation (SBA) is a common variant that corrects a known upward bias in the original method by multiplying the result by (1 − α/2).",
      ],
    ],
    formula: [
      "Demand Rate = Smoothed Order Size ÷ Smoothed Interval Between Orders",
      "SBA variant: Demand Rate × (1 − α ÷ 2)",
    ],
    example: [
      [
        "Illustrative numbers: orders average 12 units and arrive about every 4 weeks. Croston's forecast is 12 ÷ 4 = 3 units a week. With α = 0.1, the SBA version is 3 × 0.95 = 2.85 units a week.",
      ],
    ],
    why: [
      [
        "For spare parts and specialist lines it gives a more realistic demand rate than an average, which feeds better safety stock and reorder decisions.",
      ],
    ],
    mistakes: [
      ["Using Croston's method on fast, steady SKUs, where simpler methods do better."],
      ["Reading the per-period rate as the quantity you will sell each period."],
    ],
    inApp: [
      "Supply Chain Manager includes classical Croston and Croston SBA in its per-SKU model backtests.",
    ],
    related: ["intermittent-demand", "exponential-smoothing", "xyz-analysis", "backtesting"],
    updated: U,
  },
  {
    slug: "coefficient-of-variation",
    term: "Coefficient of Variation (CV)",
    short: "Coefficient of variation",
    category: "forecasting",
    definition:
      "The coefficient of variation (CV) is the standard deviation of demand divided by its mean, a scale-free measure of how volatile a SKU's demand is.",
    explain: [
      [
        "Standard deviation alone cannot compare a SKU selling 1,000 a week with one selling 10. CV can, because it expresses variability relative to average demand. It is the basis of ", g("xyz-analysis", "XYZ classification"), ".",
      ],
      [
        "The time bucket matters a great deal. A SKU that sells a few units on random days looks extremely erratic on daily data and quite steady on monthly data. When comparing SKUs or setting XYZ thresholds, use the same bucket for all of them, ideally one close to how often you review and reorder.",
      ],
    ],
    formula: ["CV = Standard Deviation of Demand ÷ Mean Demand"],
    example: [
      [
        "Illustrative numbers: SKU A averages 200 a week with a standard deviation of 40 (CV 0.2). SKU B averages 10 with a standard deviation of 15 (CV 1.5). SKU A is far more predictable even though its standard deviation is larger.",
      ],
    ],
    why: [
      [
        "CV tells you where to trust automation and where to hold extra buffer. High-CV SKUs need more safety stock for the same service level, or a different policy altogether.",
      ],
    ],
    mistakes: [
      ["Comparing CVs calculated on different time buckets (daily versus weekly)."],
      ["Including one-off bulk orders that inflate variability."],
    ],
    related: ["xyz-analysis", "intermittent-demand", "service-level", "demand-spike"],
    guides: ["safety-stock-formula"],
    updated: U,
  },
  {
    slug: "naive-forecast",
    term: "Naive Forecast",
    short: "Naive forecast",
    category: "forecasting",
    definition:
      "A naive forecast assumes the next period will match the last one, or the same period last cycle, and serves as the benchmark other methods must beat.",
    explain: [
      [
        "It sounds too simple to be useful, which is the point. If a sophisticated model cannot beat 'next week equals last week', it is adding cost and complexity without benefit. A seasonal naive forecast repeats the value from one season ago, for example the same weekday last week.",
      ],
      [
        "A naive forecast is also a useful fallback. For new SKUs with very little history, or items whose demand has just changed, a naive or seasonal naive forecast is often as good as anything else until enough data builds up to test better methods.",
      ],
    ],
    formula: ["Naive: Forecast(t + 1) = Actual(t)", "Seasonal naive: Forecast(t + 1) = Actual(t + 1 − season length)"],
    example: [
      [
        "Illustrative numbers: last Monday a branch sold 40 units. A seasonal naive forecast with a weekly cycle predicts 40 for next Monday, regardless of what happened on the days in between.",
      ],
    ],
    why: [
      [
        "Benchmarking against naive keeps forecasting honest. It is also the denominator of ", g("mase", "MASE"), ".",
      ],
    ],
    mistakes: [
      ["Skipping the benchmark and assuming a complex model must be better."],
      ["Using a plain naive benchmark for strongly weekly or seasonal demand, where seasonal naive is the fairer test."],
    ],
    inApp: [
      "Supply Chain Manager includes naive and weekly seasonal naive forecasts in every SKU's model comparison.",
    ],
    related: ["mase", "moving-average-forecast", "backtesting", "seasonality"],
    updated: U,
  },
  {
    slug: "demand-spike",
    term: "Demand Spike",
    short: "Demand spike",
    category: "forecasting",
    definition:
      "A demand spike is a short burst of sales far above a SKU's usual rate, either a real rise in demand or a single unusually large order.",
    explain: [
      [
        "The two cases need opposite responses. A sustained rise means future forecasts and reorder points should go up. A single bulk order is a one-off: reacting to it as a trend leads to overstock once it passes.",
      ],
      [
        "A useful test is to remove the biggest single day and check whether the week is still unusual. If it is not, the spike was one order.",
      ],
    ],
    example: [
      [
        "Illustrative numbers: a SKU usually sells 10 a day. One week it sells 370, and 310 of that came on one day with a single 300-unit order. The other six days total 60 units, a normal pace, so this was a one-off order rather than rising demand.",
      ],
    ],
    why: [
      [
        "Distributors see large one-off orders all the time: project work, stock-ups and new accounts. Separating them from genuine trend changes protects both availability and cash.",
      ],
    ],
    mistakes: [
      ["Feeding a one-off bulk order into the average and inflating future orders."],
      ["Flagging normal lumps on intermittent SKUs as spikes."],
    ],
    inApp: [
      "Supply Chain Manager flags a spike when the last 7 days run at least three times the usual rate and more than three standard deviations above it, and labels whether it looks sustained or like a single large order.",
    ],
    related: ["average-daily-demand", "coefficient-of-variation", "tracking-signal", "bullwhip-effect"],
    updated: U,
  },
  {
    slug: "bullwhip-effect",
    term: "Bullwhip Effect",
    short: "Bullwhip effect",
    category: "forecasting",
    definition:
      "The bullwhip effect is the way small changes in end-customer demand grow into ever larger swings in orders further up a supply chain.",
    explain: [
      [
        "Each link sees only the orders from the link below, not real usage. Each adds its own buffer, batches its orders and reacts to price deals, so a 10% rise in end demand can show up as a much larger jump in the orders a manufacturer receives.",
      ],
      [
        "Common causes are forecasting from orders rather than consumption, order batching, promotions and rationing during shortages, where customers over-order to secure a share.",
      ],
    ],
    example: [
      [
        "Illustrative: retailers raise orders 10% after a strong month. Their distributor, seeing the jump and fearing a shortage, raises its own orders 25%. The manufacturer sees orders jump far more than end demand did, adds capacity, and is left with excess when orders fall back.",
      ],
    ],
    why: [
      [
        "Distributors sit in the middle of the whip. Forecasting from your customers' real sell-through where possible, and from a smoothed demand rate rather than raw order spikes, reduces the amplification you pass upstream.",
      ],
    ],
    mistakes: [
      ["Treating every order spike from a customer as a lasting change in demand."],
      ["Batching purchases into large, infrequent orders that look volatile to suppliers."],
    ],
    related: ["vendor-managed-inventory", "demand-spike", "multi-echelon-inventory", "sales-and-operations-planning"],
    updated: U,
  },
  {
    slug: "sales-and-operations-planning",
    term: "Sales and Operations Planning (S&OP)",
    short: "S&OP",
    category: "forecasting",
    definition:
      "Sales and operations planning (S&OP) is a regular, usually monthly, process that aligns sales forecasts, purchasing, inventory and finance on one plan.",
    explain: [
      [
        "A typical cycle reviews demand (what sales expects), supply (what purchasing and suppliers can deliver), reconciles the gaps, and ends with leadership signing off one plan. The value is less in any single forecast than in everyone working from the same numbers.",
      ],
      [
        "For a small distributor, S&OP does not need to be elaborate. A monthly hour where sales, purchasing and finance review the next quarter's expected demand, supply risks and stock budget covers most of the benefit, as long as the meeting ends with decisions that change orders.",
      ],
    ],
    example: [
      [
        "Illustrative: sales expects a new contractor account to add 15% volume on a product family from next quarter. In S&OP, purchasing confirms suppliers can support it, finance approves the extra stock investment, and the forecast is updated before orders are placed instead of after stockouts start.",
      ],
    ],
    why: [
      [
        "Many distributor stockouts and overstocks come from information that existed in one department but never reached purchasing. S&OP is the meeting that moves it.",
      ],
    ],
    mistakes: [
      ["Turning S&OP into a report review with no decisions."],
      ["Planning at too detailed a level; S&OP works on product families and totals, not every SKU."],
    ],
    related: ["demand-planning", "forecast-horizon", "open-to-buy", "bullwhip-effect"],
    updated: U,
  },
  {
    slug: "demand-planning",
    term: "Demand Planning",
    short: "Demand planning",
    category: "forecasting",
    definition:
      "Demand planning is the process of forecasting future demand and refining it with market knowledge so purchasing and inventory decisions rest on one view.",
    explain: [
      [
        "A statistical forecast is the starting point. Demand planning adds what the history cannot know: a lost customer, a new contract, a price change, a product being replaced. The output is the demand plan that drives replenishment.",
      ],
      [
        "The most useful habit is to record every manual override and check later whether it improved the forecast. Over time, that shows which kinds of human input add value, such as known contract wins, and which do not, such as general optimism. Keeping overrides that work and dropping the rest makes the plan better each cycle.",
      ],
    ],
    example: [
      [
        "Illustrative: the statistical forecast for a cable range shows steady demand, but sales knows a large customer is switching to a competitor next month. The demand planner cuts that customer's share from the forecast before the next purchase orders go out.",
      ],
    ],
    why: [
      [
        "Good demand planning lets purchasing act early. It is the difference between buying for the market you will have and buying for the one you had.",
      ],
    ],
    mistakes: [
      ["Overriding the statistical forecast with opinions that are never checked afterwards."],
      ["Planning only in revenue, without translating to units by SKU and warehouse."],
    ],
    related: ["sales-and-operations-planning", "forecast-accuracy", "forecast-bias", "forecast-horizon"],
    updated: U,
  },
  {
    slug: "forecast-horizon",
    term: "Forecast Horizon",
    short: "Forecast horizon",
    category: "forecasting",
    definition:
      "The forecast horizon is how far into the future a forecast looks, for example the next 14 days, the next quarter or the next year.",
    explain: [
      [
        "Accuracy usually falls as the horizon lengthens. For replenishment, the horizon that matters most is the lead time plus the review period, because that is how far ahead today's order has to cover.",
      ],
      [
        "It helps to distinguish the frozen part of the horizon, where orders are already placed and cannot change, from the part you can still influence. Forecast effort and accuracy reviews should focus on the window just beyond the frozen zone, because that is where today's decisions take effect.",
      ],
    ],
    example: [
      [
        "Illustrative: a SKU with a 30-day import lead time and monthly ordering needs a forecast at least 60 days out to size today's order. A 14-day forecast, however accurate, does not see far enough.",
      ],
    ],
    why: [
      [
        "Matching the horizon to lead times keeps forecasting effort pointed at decisions you can still change. Longer horizons serve budgeting and capacity planning, where less precision is acceptable.",
      ],
    ],
    mistakes: [
      ["Judging a model's accuracy at one horizon and using it at another."],
      ["Using a short-horizon forecast for long-lead-time imports."],
    ],
    related: ["lead-time", "backtesting", "periodic-review-system", "sales-and-operations-planning"],
    updated: U,
  },
  {
    slug: "backtesting",
    term: "Forecast Backtesting",
    short: "Backtesting",
    category: "forecasting",
    definition:
      "Backtesting checks a forecasting method by pretending to forecast the past: train on older history, predict a later period and compare with what really sold.",
    explain: [
      [
        "Rolling-origin backtesting repeats this several times, moving the cut-off forward each time, so the result does not hinge on one lucky or unlucky period. It is the fair way to choose between methods for a SKU before trusting one with real purchase orders.",
      ],
    ],
    example: [
      [
        "Illustrative: with a year of daily history, train on the first nine months and forecast the next 14 days, then move the cut-off 14 days later and repeat. Averaging the error over several such windows shows which method holds up, not just which one got lucky once.",
      ],
    ],
    why: [
      [
        "Different SKUs suit different methods. Backtesting each one lets the data, not habit, pick the method, and shows honestly how much accuracy to expect.",
      ],
    ],
    mistakes: [
      ["Testing a method on the same data it was fitted to."],
      ["Picking the most complex model when a simpler one scores about the same."],
    ],
    inApp: [
      "Supply Chain Manager runs rolling-origin backtests over 14-day windows for each SKU, compares methods by WAPE and keeps the simpler model on close calls.",
    ],
    related: ["forecast-accuracy", "wape", "mase", "naive-forecast", "forecast-horizon"],
    updated: U,
  },
];
