import { g, type GlossaryTerm } from "./types";

const U = "2026-11-24";

/**
 * Forecasting terms, consolidated from 19 thin pages to 7 fuller ones
 * (docs/seo/glossary-merge-map.json). The removed slugs are redirected in
 * merged.ts. Product statements (`inApp`) were checked against
 * forecasting-service/ and src/components/domain/forecast-accuracy-*.tsx.
 */
export const FORECASTING_TERMS: GlossaryTerm[] = [
  {
    slug: "forecast-accuracy",
    term: "Forecast Accuracy",
    short: "Forecast accuracy",
    metaTitle: "Forecast Accuracy: WAPE, MAPE and MASE Explained",
    category: "forecasting",
    definition:
      "Forecast accuracy measures how close demand forecasts came to what actually sold. WAPE, MAPE and MASE are the common ways to score it.",
    explain: [
      [
        "There is no single accuracy number, and the choice matters. Each measure answers a slightly different question, and the wrong one can make a decent forecast look terrible or a poor one look fine. ",
        g("forecast-bias", "Bias"),
        " is measured separately: a forecast can be close on average and still lean the same way every week.",
      ],
      [
        "Judge accuracy where decisions are made: per SKU per warehouse, over the lead time. A single company-wide percentage lets large over-forecasts on one SKU cancel against under-forecasts on another, so it can look healthy while individual shelves are empty or overfull.",
      ],
    ],
    formula: ["Forecast Error = Actual − Forecast", "Accuracy is then summarized with WAPE, MAPE or MASE (below)"],
    sections: [
      {
        title: "WAPE: total error as a share of total demand",
        paragraphs: [
          [
            "WAPE (weighted absolute percentage error) divides the sum of all absolute errors by the sum of all actual demand. Because it works on totals, one slow week cannot blow it up, and the result reads naturally: 'our forecast was off by X% of what we sold'. It also maps to units of stock you got wrong, which is why it is a practical headline measure for a purchasing team.",
          ],
          ["Its blind spot is direction. A WAPE of 15% could be 15% too high every week or a mix of highs and lows, so pair it with a bias check."],
        ],
        formula: ["WAPE = Σ |Actual − Forecast| ÷ Σ Actual × 100"],
      },
      {
        title: "MAPE: the popular measure with a known weakness",
        paragraphs: [
          [
            "MAPE (mean absolute percentage error) averages each period's error as a percentage of that period's actual demand. Percentages are easy to explain, but the method divides by actual demand period by period. When actual demand is small, the percentage explodes: forecasting 2 against an actual of 1 is a 100% error, and an actual of 0 makes the calculation impossible.",
          ],
          [
            "For a distributor with many slow movers, MAPE can therefore be dominated by a handful of tiny periods. Use it for steady, high-volume SKUs, and prefer WAPE or MASE across a mixed range. Hyndman and Koehler, who proposed MASE, make the same point: percentage measures can be infinite or undefined when demand reaches zero.",
          ],
        ],
        formula: ["MAPE = (1 ÷ n) × Σ ( |Actual − Forecast| ÷ Actual ) × 100"],
      },
      {
        title: "MASE: is the method better than guessing last week?",
        paragraphs: [
          [
            "MASE (mean absolute scaled error) divides a forecast's average absolute error by the average error of a naive forecast, which simply repeats the previous value. Below 1 means the method beat the naive benchmark; above 1 means it did worse. Because it is scale-free, it compares fairly across SKUs of any volume and still works when some periods are zero. It is a ratio to a benchmark, not an accuracy percentage, so a MASE of 0.9 does not mean '90% accurate'.",
          ],
          [
            "The standard definition scales by the one-step error of the naive method on the training history. That can make the benchmark look easy for long forecast horizons, so check which benchmark any MASE you are given used, and do not compare figures that used different ones.",
          ],
        ],
        formula: ["MASE = MAE of the forecast ÷ MAE of the naive benchmark", "MAE = mean of |Actual − Forecast|"],
      },
      {
        title: "Choosing between the three",
        table: {
          head: ["Measure", "Best for", "Watch out for"],
          rows: [
            ["WAPE", "Headline score across SKUs and warehouses; purchasing conversations", "Says nothing about direction; one big SKU can dominate"],
            ["MAPE", "Steady, high-volume SKUs", "Breaks on zero or tiny demand; small SKUs distort averages"],
            ["MASE", "Judging whether a model adds value over the naive baseline", "Not a percentage; the benchmark definition matters"],
          ],
        },
      },
      {
        title: "Backtesting and the forecast horizon",
        paragraphs: [
          [
            "Backtesting scores a method by pretending to forecast the past: train on older history, predict a later window, compare with what really sold, then move the cut-off forward and repeat. Rolling-origin backtesting, with several windows, stops one lucky or unlucky period from deciding the winner. It is the fair way to choose a method for a SKU before trusting it with real purchase orders. Never test a method on the same data it was fitted to.",
          ],
          [
            "Match the horizon to the decision. For replenishment, the horizon that matters is the ",
            g("lead-time", "lead time"),
            " plus the review period, because that is how far ahead today's order has to cover. A SKU with a 30-day import lead time and monthly ordering needs a forecast at least 60 days out. A 14-day forecast, however accurate, does not see far enough, and accuracy usually falls as the horizon lengthens.",
          ],
        ],
      },
    ],
    example: [
      [
        "Illustrative numbers: a forecast of 100 units a week for four weeks against actuals of 80, 120, 90 and 110. Total error cancels to zero, which looks perfect, but the absolute errors add up to 60 units on 400 sold, a WAPE of 15%. For a second SKU with actuals of 100, 50 and 10 against forecasts of 90, 60 and 20, every miss is 10 units, so WAPE is 30 ÷ 160 = 18.75%, while MAPE is 43% because the 10-unit week counts as a 100% miss.",
      ],
    ],
    why: [
      [
        "Without measuring accuracy nobody knows whether the forecast is helping. Measured accuracy also sets how much safety stock each SKU needs: the less accurate the forecast over the lead time, the bigger the buffer for the same ",
        g("service-level", "service level"),
        ".",
      ],
    ],
    mistakes: [
      ["Reporting one aggregate number that hides poor SKU-level forecasts."],
      ["Using MAPE on SKUs with zero-demand periods, or averaging it across SKUs so tiny items dominate."],
      ["Reading a low portfolio WAPE as proof that every SKU is well forecast."],
      ["Never comparing against a naive forecast, so a complicated model gets credit it has not earned."],
      ["Judging a model at one horizon and using it at another, such as a 14-day test for a 60-day import."],
    ],
    inApp: [
      "Supply Chain Manager's forecasting service backtests several methods per SKU over rolling 14-day windows and picks the one with the lowest WAPE, preferring a simpler model when the scores are within 1.5%. The Forecast Accuracy page shows each SKU's WAPE and bias, and a portfolio MASE card labelled 'Beating Naive' or 'Behind Naive'. If the forecasting service cannot be reached, the app falls back to a trailing average of recent demand.",
    ],
    faq: [
      {
        q: "What is a good forecast accuracy for a distributor?",
        a: [
          "There is no honest universal target. Accuracy depends on how steady each SKU's demand is, so compare each SKU's score with the naive benchmark (MASE) and with its own history rather than with an industry number.",
        ],
      },
      {
        q: "Should I use WAPE or MAPE?",
        a: [
          "For a range that includes slow movers, WAPE is usually easier to trust because it divides total error by total demand. MAPE is fine for steady, high-volume items.",
        ],
      },
      {
        q: "Why does accuracy get worse for longer horizons?",
        a: ["More can change between now and then: orders, prices, customers. Evaluate accuracy at the horizon you actually order for, which is lead time plus review period."],
      },
    ],
    sources: [
      { label: "Hyndman and Koehler (2006), Another look at measures of forecast accuracy, International Journal of Forecasting", url: "https://doi.org/10.1016/j.ijforecast.2006.03.001" },
    ],
    related: ["forecast-bias", "exponential-smoothing", "intermittent-demand", "service-level", "lead-time"],
    updated: U,
  },
  {
    slug: "forecast-bias",
    term: "Forecast Bias",
    short: "Forecast bias",
    metaTitle: "Forecast Bias and Tracking Signal: Formula & Example",
    category: "forecasting",
    definition:
      "Forecast bias is a consistent tendency to forecast too high or too low. A tracking signal flags it when errors keep leaning one way.",
    explain: [
      [
        "Accuracy measures how big errors are; bias measures which way they lean. A biased forecast does steady damage because the errors do not cancel out: always high builds overstock, always low causes repeated stockouts.",
      ],
      [
        "Bias often has a human source: sales teams inflating forecasts to protect availability, or a model that never learned demand fell after a big customer left. It can also come from the data. If you forecast from shipments during a stockout, the missing sales pull the forecast down, so the next order is too small and the stockout repeats. See ",
        g("lost-sales", "lost sales"),
        ".",
      ],
    ],
    formula: ["Bias % = Σ (Forecast − Actual) ÷ Σ Actual × 100", "Positive = over-forecasting; negative = under-forecasting"],
    sections: [
      {
        title: "Tracking signal: an automatic bias alarm",
        paragraphs: [
          [
            "With thousands of SKUs nobody can eyeball every forecast. A tracking signal turns 'this forecast has gone stale' into a flag. It is the running sum of forecast errors divided by the mean absolute deviation (MAD). When errors go both ways, the sum stays near zero. When the forecast keeps missing in one direction, it climbs. Dividing by MAD scales it so one set of limits works across SKUs.",
          ],
          [
            "Positive values mean demand is running above forecast, negative below. Limits of about ±4 are a common rule of thumb, not a law: tighten them and normal noise triggers constant reviews, loosen them and real drift goes unnoticed. Some teams use a smoothed version that weights recent errors more heavily so it responds faster and forgets old errors.",
          ],
        ],
        formula: ["Tracking Signal = Σ (Actual − Forecast) ÷ MAD", "MAD = mean of |Actual − Forecast|"],
      },
      {
        title: "How to find and fix bias",
        bullets: [
          ["Check bias by SKU group each month, not only overall, and look into any group that leans the same way for three months or more."],
          ["Separate the causes: a lost or won customer still in the history, a forecast adjusted by people, or sales recorded during stockouts."],
          ["Fix the data first. Remove one-off bulk orders and flag stockout periods before changing the model."],
          ["Record every manual override and review later whether it improved or worsened the bias."],
        ],
      },
    ],
    example: [
      [
        "Illustrative numbers: over 12 weeks a SKU was forecast at 1,200 units and sold 1,000. Bias = +20%, which is 200 units of stock you did not need, even if each weekly error looked small. For the tracking signal, if six weekly errors (actual − forecast) were +8, +5, +9, +6, +7 and +10, cumulative error is 45 and MAD is 7.5, so the signal is 6. Demand is running consistently above forecast and the model needs reviewing.",
      ],
    ],
    why: [
      [
        "Bias compounds into inventory problems faster than random error, because errors in one direction add up. It is also usually the easiest forecasting problem to fix once it is visible, which makes it the best place to look first when a SKU keeps ending up with too much or too little stock.",
      ],
    ],
    mistakes: [
      ["Watching only absolute error measures and missing a steady lean."],
      ["Forecasting from shipments during stockouts, which creates a downward bias."],
      ["Using tracking-signal limits so tight that normal noise triggers constant reviews."],
      ["Resetting the signal without fixing the model or data that drifted."],
    ],
    inApp: [
      "Supply Chain Manager's Forecast Accuracy page shows a net bias per SKU in units per day, so you can sort by the SKUs that lean furthest. It does not show a tracking signal.",
    ],
    faq: [
      {
        q: "What is the difference between forecast error and forecast bias?",
        a: ["Error is the miss in one period. Bias is the average direction of those misses over many periods. Small errors can still add up to large bias."],
      },
      {
        q: "What is a good tracking signal limit?",
        a: ["About ±4 is a common starting rule of thumb. Tune it on your own history so that it flags real drift without constant false alarms."],
      },
    ],
    related: ["forecast-accuracy", "exponential-smoothing", "seasonality", "lost-sales", "demand-planning"],
    updated: U,
  },
  {
    slug: "exponential-smoothing",
    term: "Exponential Smoothing",
    short: "Exponential smoothing",
    metaTitle: "Exponential Smoothing, Moving Average, Naive Forecasts",
    category: "forecasting",
    definition:
      "Exponential smoothing forecasts demand as a weighted average of past demand, newest counting most. Moving average and naive forecasts are its simpler cousins.",
    explain: [
      [
        "Most day-to-day demand forecasting for a distributor is done by a small family of simple methods. Understanding how they differ explains why a forecasting system tests several per SKU rather than using one for everything.",
      ],
      [
        "A smoothing factor, alpha (between 0 and 1), sets how quickly exponential smoothing reacts. Simple exponential smoothing tracks a level. Holt's method adds a trend, and Holt-Winters adds a repeating seasonal pattern on top. These methods are cheap to compute and adapt well, which suits forecasting thousands of SKUs every night.",
      ],
    ],
    formula: ["New Forecast = α × Latest Actual + (1 − α) × Previous Forecast"],
    sections: [
      {
        title: "Moving average: every recent period counts equally",
        paragraphs: [
          [
            "A moving average predicts next period's demand as the average of the last n periods, such as 7 or 14 days. A longer window is steadier but slower to react; a shorter window reacts faster but follows noise. Every period in the window counts equally, which is the main difference from exponential smoothing, where older data fades gradually.",
          ],
          [
            "For steady SKUs a moving average is often hard to beat and easy to explain. Its weakness is one-off orders: a single 60-unit day sits in a 7-day window and lifts the forecast by about 7 units a day until it drops out, then the forecast falls again for no real reason.",
          ],
        ],
        formula: ["Forecast (next period) = (Demand₁ + … + Demandₙ) ÷ n, using the last n periods"],
      },
      {
        title: "Naive forecasts: the benchmark every method must beat",
        paragraphs: [
          [
            "A naive forecast assumes the next period will match the last one. A seasonal naive forecast repeats the value from one season ago, for example the same weekday last week. It sounds too simple to be useful, which is the point: if a sophisticated model cannot beat 'next week equals last week', it adds cost and complexity without benefit.",
          ],
          [
            "Naive forecasts also work as a fallback. For new SKUs with very little history, or items whose demand just changed, a naive or seasonal naive forecast is often as good as anything else until enough data builds up to test better methods. The naive error is the denominator of MASE, covered under ",
            g("forecast-accuracy", "forecast accuracy"),
            ".",
          ],
        ],
        formula: ["Naive: Forecast(t + 1) = Actual(t)", "Seasonal naive: Forecast(t + 1) = Actual(t + 1 − season length)"],
      },
      {
        title: "Which method suits which SKU",
        table: {
          head: ["Method", "Suits", "Weakness"],
          rows: [
            ["Naive / seasonal naive", "Benchmarks; very short history", "Repeats noise as well as signal"],
            ["Moving average", "Steady demand with random noise", "Lags trends and seasons; one-off orders linger"],
            ["Simple exponential smoothing", "Stable level, no trend or season", "Lags trending or seasonal SKUs"],
            ["Holt's linear trend", "Sustained growth or decline", "Overshoots when a trend ends"],
            ["Holt-Winters", "Trend plus a repeating weekly or yearly cycle", "Needs enough history to learn the cycle"],
          ],
        },
      },
    ],
    example: [
      [
        "Illustrative numbers: last forecast 100, latest actual 120, α = 0.2. New forecast = 0.2 × 120 + 0.8 × 100 = 104. With α = 0.5 it would jump to 110, reacting faster but chasing more noise. For comparison, daily sales of 12, 15, 9, 14, 10, 13 and 11 give a 7-day moving average of 12 units a day, and a naive forecast would say 11.",
      ],
    ],
    why: [
      [
        "The right method differs by SKU, and picking by feel is how forecasts quietly go wrong. Testing each method on a SKU's own history lets the data choose. Simple methods are also easier to explain to a buyer, which matters when someone has to decide whether to trust a suggested order.",
      ],
    ],
    mistakes: [
      ["Picking alpha by feel instead of testing it on history."],
      ["Using a moving average or simple smoothing on trending or strongly seasonal SKUs, where it always lags."],
      ["Letting one-off bulk orders sit inside the window and inflate the forecast."],
      ["Applying these methods to intermittent demand, where ", g("intermittent-demand", "Croston's method"), " usually does better."],
      ["Skipping the naive benchmark and assuming a complex model must be better."],
    ],
    inApp: [
      "Supply Chain Manager's forecasting service tests naive and weekly seasonal naive forecasts, 7- and 14-day moving averages, simple exponential smoothing, Holt's damped trend and Holt-Winters with a weekly cycle for each SKU, alongside Croston methods for intermittent items. Seasonal methods are skipped when a SKU has under 14 days of history.",
    ],
    faq: [
      {
        q: "What is the difference between a moving average and exponential smoothing?",
        a: ["A moving average weights the last n periods equally and ignores older ones. Exponential smoothing weights all history, with newer data counting more and older data fading gradually."],
      },
      {
        q: "How do I choose alpha?",
        a: ["Test several values on past data and keep the one with the lowest error over rolling windows, instead of picking by feel."],
      },
    ],
    sources: [
      { label: "Hyndman and Athanasopoulos, Forecasting: Principles and Practice (3rd ed.), simple forecasting methods", url: "https://otexts.com/fpp3/simple-methods.html" },
      { label: "Hyndman and Athanasopoulos, Forecasting: Principles and Practice (3rd ed.), exponential smoothing", url: "https://otexts.com/fpp3/expsmooth.html" },
    ],
    related: ["forecast-accuracy", "seasonality", "intermittent-demand", "forecast-bias", "average-daily-demand"],
    updated: U,
  },
  {
    slug: "seasonality",
    term: "Seasonality",
    short: "Seasonality",
    metaTitle: "Seasonality and Demand Spikes: Definition & Examples",
    category: "forecasting",
    definition:
      "Seasonality is a repeating, predictable pattern in demand tied to the calendar. A demand spike is a one-off burst that is not.",
    explain: [
      [
        "Seasonal cycles can be yearly (weather, holidays), monthly (budget cycles) or weekly (trade customers ordering on Mondays). What makes a pattern seasonal is that it repeats at a known interval. A one-off spike does not, and should not be treated as seasonal.",
      ],
      [
        "Seasonal indices express each period as a multiple of the average: an index of 1.4 for December means December demand runs 40% above a typical month.",
      ],
    ],
    formula: ["Seasonal Index = Average demand in that period ÷ Average demand across all periods"],
    sections: [
      {
        title: "Demand spikes: sustained rise or single order?",
        paragraphs: [
          [
            "A demand spike is a short burst of sales far above a SKU's usual rate, and it is either a real rise in demand or a single unusually large order. The two cases need opposite responses. A sustained rise means forecasts and reorder points should go up. A single bulk order is a one-off: reacting to it as a trend leads to overstock once it passes.",
          ],
          [
            "A useful test is to remove the biggest single day and check whether the week is still unusual. If it is not, the spike was one order. Distributors see large one-off orders all the time: project work, stock-ups and new accounts. Separating them from genuine trend changes protects both availability and cash.",
          ],
        ],
      },
      {
        title: "How to tell seasonal from one-off",
        bullets: [
          ["Seasonal: the same period rises in at least two separate cycles, such as two Decembers. One occurrence is not evidence."],
          ["Trend: the rise continues after the biggest single order is removed, and later periods stay high."],
          ["One-off: one order or one day accounts for most of the jump; the rest of the week looks normal."],
          ["Event: a promotion, price change or competitor stockout explains it. Note the cause so the forecast can ignore it next year."],
        ],
      },
      {
        title: "Planning for a seasonal peak",
        paragraphs: [
          [
            "Seasonal SKUs need stock built before the peak, which means ordering at least one ",
            g("lead-time", "lead time"),
            " earlier, and often more, because supplier capacity also tightens in peak season. Missing the pattern leads to stockouts in the peak and overstock afterwards. If you have only a year of history, you have one observation of each season, so treat the first seasonal forecast with caution and review it as the peak arrives. See also ",
            g("anticipation-inventory", "anticipation inventory"),
            ", the stock built ahead of a known peak.",
          ],
        ],
      },
    ],
    example: [
      [
        "Illustrative numbers: a heating product averages 1,000 units a month across the year, 1,800 in January and 400 in July. January's index is 1.8 and July's is 0.4. Planning July purchases from the annual average would leave 600 surplus units on the shelf. For spikes: a SKU usually sells 10 a day. One week it sells 370, and 310 of that came on one day with a single 300-unit order. The other six days total 60 units, a normal pace, so this was one order, not rising demand.",
      ],
    ],
    why: [
      [
        "Seasonality and spikes are the two most common reasons a fixed reorder point goes wrong. Seasonal SKUs need the buffer to move with the calendar, and one-off orders need to be kept out of the average so they do not inflate next month's purchases.",
      ],
    ],
    mistakes: [
      ["Calling a pattern seasonal after seeing it only once."],
      ["Using a plain average for a seasonal SKU."],
      ["Feeding a one-off bulk order into the average and inflating future orders."],
      ["Flagging normal lumps on intermittent SKUs as spikes."],
    ],
    inApp: [
      "Supply Chain Manager's forecasting service includes Holt-Winters with a weekly cycle and a weekly seasonal naive forecast. It flags a demand spike when the last 7 days run at least three times the usual rate and more than three standard deviations above it (and by at least 10 units), and labels whether the spike looks sustained or like a single large order. It does not model yearly seasonality.",
    ],
    faq: [
      {
        q: "How much history do I need to see seasonality?",
        a: ["At least two full cycles. For a yearly pattern that means two years; with one year you can only suspect a season, not confirm it."],
      },
      {
        q: "Should I remove a spike from my history?",
        a: ["If it was a one-off order, yes, or at least cap it, so it does not inflate the forecast. If demand stayed high afterwards, keep it."],
      },
    ],
    related: ["exponential-smoothing", "forecast-bias", "intermittent-demand", "anticipation-inventory", "average-daily-demand"],
    updated: U,
  },
  {
    slug: "intermittent-demand",
    term: "Intermittent Demand",
    short: "Intermittent demand",
    metaTitle: "Intermittent Demand, Croston's Method & Demand CV",
    category: "forecasting",
    definition:
      "Intermittent demand is sales in occasional bursts with many zero periods between, common for spare parts. Croston's method and the CV help handle it.",
    explain: [
      [
        "Standard methods forecast intermittent items poorly: an average spreads demand thinly over periods when nothing sells, then falls short when an order arrives. Specialized methods forecast the size of orders and the gap between them separately.",
      ],
      [
        "Lumpy demand is intermittent demand where order sizes also vary a lot. It is the hardest pattern to forecast and is often better handled with a stocking policy than a precise forecast. Distributors of industrial, electrical and maintenance supplies often have many such SKUs, and handling them with the wrong method creates both stockouts and dead stock.",
      ],
    ],
    sections: [
      {
        title: "Croston's method",
        paragraphs: [
          [
            "Croston's method smooths two things separately: the size of non-zero orders and the interval between them. The forecast demand rate is the smoothed order size divided by the smoothed interval. Estimates update only in periods with demand, so a run of zero weeks does not drag the size estimate down.",
          ],
          [
            "The Syntetos-Boylan Approximation (SBA) corrects a known upward bias in the original method by multiplying the result by (1 − α/2). Note that the output is a demand rate per period, not the quantity you will sell in any given period: a rate of 3 a week does not mean 3 units will sell next week.",
          ],
        ],
        formula: [
          "Demand Rate = Smoothed Order Size ÷ Smoothed Interval Between Orders",
          "SBA variant: Demand Rate × (1 − α ÷ 2)",
        ],
      },
      {
        title: "Coefficient of variation: how erratic is the demand?",
        paragraphs: [
          [
            "The coefficient of variation (CV) is the standard deviation of demand divided by its mean. Standard deviation alone cannot compare a SKU selling 1,000 a week with one selling 10. CV can, because it expresses variability relative to average demand. It is the basis of ",
            g("xyz-analysis", "XYZ classification"),
            ".",
          ],
          [
            "The time bucket matters a great deal. A SKU that sells a few units on random days looks extremely erratic on daily data and quite steady on monthly data. When comparing SKUs or setting XYZ thresholds, use the same bucket for every SKU, ideally one close to how often you review and reorder.",
          ],
        ],
        formula: ["CV = Standard Deviation of Demand ÷ Mean Demand"],
      },
      {
        title: "How to recognize intermittent demand",
        paragraphs: [
          [
            "Two measures are widely used: the average demand interval (ADI), the average number of periods between orders, and the squared CV of the order sizes. Syntetos, Boylan and Croston classified items using cut-offs of 1.32 for ADI and 0.49 for the squared CV, which is why many tools treat an ADI of about 1.32 or more as intermittent. The cut-offs are approximate, so treat them as starting points and tune them on your own data.",
          ],
          [
            "Judge intermittent forecasts with a measure that survives zeros, such as MASE or WAPE, not MAPE. See ",
            g("forecast-accuracy", "forecast accuracy"),
            ".",
          ],
        ],
      },
    ],
    example: [
      [
        "Illustrative numbers: a pump seal sold 0, 0, 12, 0, 0, 0, 10, 0 units over eight weeks. Its average is 2.75 a week, but no week sold 2.75; real demand arrives about every three to four weeks in batches of 10 to 12. Croston's method with orders averaging 12 units about every 4 weeks gives 12 ÷ 4 = 3 units a week, and with α = 0.1 the SBA version is 3 × 0.95 = 2.85. For CV: SKU A averages 200 a week with a standard deviation of 40 (CV 0.2); SKU B averages 10 with a standard deviation of 15 (CV 1.5). SKU A is far more predictable even though its standard deviation is larger.",
      ],
    ],
    why: [
      [
        "High-CV and intermittent SKUs need more safety stock for the same service level, or a different policy altogether, such as holding to a typical order size. Knowing which SKUs are erratic tells you where to trust automation and where to hold buffer.",
      ],
    ],
    mistakes: [
      ["Judging intermittent forecasts with MAPE, which breaks on zero-demand periods."],
      ["Holding stock to the average instead of to the typical order size."],
      ["Using Croston's method on fast, steady SKUs, where simpler methods do better."],
      ["Comparing CVs calculated on different time buckets (daily versus weekly)."],
      ["Including one-off bulk orders that inflate variability."],
    ],
    inApp: [
      "Supply Chain Manager's forecasting service computes each SKU's average demand interval and share of zero-demand days. It treats a SKU as intermittent when zero days reach 40% or the interval reaches 1.32, and then favors the Croston SBA method. Its ABC/XYZ segmentation uses CV cut-offs of 0.5 and 1.0.",
    ],
    faq: [
      {
        q: "Can I use a moving average for slow-moving items?",
        a: ["You can, but it spreads demand over empty periods and misses order-sized spikes. Croston-type methods usually do better, and you can check with a backtest."],
      },
      {
        q: "Is a high CV always bad?",
        a: ["It means demand is harder to forecast, so hold more safety stock for the same service level, or order to a typical order size. It is a signal, not a fault."],
      },
    ],
    sources: [
      { label: "Syntetos and Boylan (2005), The accuracy of intermittent demand estimates, International Journal of Forecasting", url: "https://doi.org/10.1016/j.ijforecast.2004.10.001" },
      { label: "Syntetos, Boylan and Croston (2005), On the categorization of demand patterns, Journal of the Operational Research Society", url: "https://doi.org/10.1057/palgrave.jors.2601841" },
    ],
    related: ["forecast-accuracy", "exponential-smoothing", "xyz-analysis", "service-level", "average-daily-demand"],
    guides: ["safety-stock-formula"],
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
        "Each link in a supply chain sees only the orders from the link below it, not real usage. Each adds its own buffer, batches its orders and reacts to price deals, so a 10% rise in end demand can show up as a much larger jump in the orders a manufacturer receives. The further from the end customer, the bigger the swings.",
      ],
      [
        "Common causes are forecasting from orders rather than consumption, order batching, promotions and rationing during shortages, where customers over-order to secure a share. When the shortage ends, orders collapse and everyone is left holding excess stock.",
      ],
    ],
    sections: [
      {
        title: "How the amplification happens",
        bullets: [
          ["Demand signal processing: each link forecasts from the orders it receives, so a one-off jump looks like a trend and is passed on larger."],
          ["Order batching: ordering weekly or monthly in lumps makes smooth demand look spiky to the supplier."],
          ["Price and promotion swings: forward buying on a deal pulls demand early, then leaves a gap."],
          ["Shortage gaming: customers order more than they need when they expect rationing, then cancel."],
        ],
      },
      {
        title: "How to spot it in your own data",
        paragraphs: [
          [
            "Compare how much your weekly purchase orders to a supplier vary with how much your weekly sales of the same products vary. If orders swing noticeably more than sales, your ordering is amplifying demand. Researchers call the ratio of those two variations the bullwhip ratio, and a value well above 1 means amplification. It is a simple check you can run in a spreadsheet for your ten biggest suppliers, and it often points straight at batching habits, such as one large order at month-end.",
          ],
        ],
        formula: ["Bullwhip ratio = variance of orders placed ÷ variance of sales"],
      },
      {
        title: "What a distributor can do",
        paragraphs: [
          [
            "Distributors sit in the middle of the whip: they receive volatile orders from customers and pass volatile orders to suppliers. Forecasting from your customers' real sell-through where you can get it, and from a smoothed demand rate rather than raw order spikes, reduces the amplification you pass upstream. Ordering smaller lots more often, and sharing forecasts with key suppliers, also helps. ",
            g("vendor-managed-inventory", "Vendor-managed inventory"),
            " is one way to give a supplier real consumption data, and a monthly review such as ",
            g("demand-planning", "demand planning and S&OP"),
            " keeps your own orders consistent with your plan.",
          ],
        ],
      },
    ],
    example: [
      [
        "Illustrative: retailers raise orders 10% after a strong month. Their distributor, seeing the jump and fearing a shortage, raises its own orders 25%. The manufacturer sees orders jump far more than end demand did, adds capacity, and is left with excess when orders fall back to normal.",
      ],
    ],
    why: [
      [
        "The bullwhip effect explains why a distributor's own orders can look far more volatile than its customers' real consumption, and why suppliers sometimes ration or raise lead times for no visible reason. Recognizing it stops you from treating every order spike from a customer as a lasting change in demand.",
      ],
    ],
    mistakes: [
      ["Treating every order spike from a customer as a lasting change in demand."],
      ["Batching purchases into large, infrequent orders that look volatile to suppliers."],
      ["Over-ordering during a shortage, then cancelling when supply recovers."],
    ],
    faq: [
      {
        q: "Who first described the bullwhip effect?",
        a: ["It is commonly associated with Jay Forrester's work on industrial dynamics and later research by Lee, Padmanabhan and Whang. This page does not cite a specific study; consult the original papers for details."],
      },
      {
        q: "Does a small distributor really face the bullwhip effect?",
        a: ["Yes, on both sides: customers' orders are lumpier than their real usage, and your own batching looks lumpy to suppliers."],
      },
    ],
    related: ["demand-planning", "vendor-managed-inventory", "multi-echelon-inventory", "forecast-bias", "seasonality"],
    updated: U,
  },
  {
    slug: "demand-planning",
    term: "Demand Planning",
    short: "Demand planning",
    metaTitle: "Demand Planning and S&OP: Definition & Example",
    category: "forecasting",
    definition:
      "Demand planning forecasts future demand and refines it with market knowledge. S&OP is the regular meeting that aligns that plan with supply and finance.",
    explain: [
      [
        "A statistical forecast is the starting point. Demand planning adds what the history cannot know: a lost customer, a new contract, a price change, a product being replaced. The output is the demand plan that drives replenishment.",
      ],
      [
        "The most useful habit is to record every manual override and check later whether it improved the forecast. Over time that shows which kinds of human input add value, such as known contract wins, and which do not, such as general optimism. Keep the overrides that work and drop the rest, and the plan improves each cycle. Measure the result with ",
        g("forecast-accuracy", "forecast accuracy"),
        " and ",
        g("forecast-bias", "bias"),
        ".",
      ],
    ],
    sections: [
      {
        title: "Sales and operations planning (S&OP)",
        paragraphs: [
          [
            "Sales and operations planning is a regular, usually monthly, process that aligns sales forecasts, purchasing, inventory and finance on one plan. A typical cycle reviews demand (what sales expects), reviews supply (what purchasing and suppliers can deliver), reconciles the gaps, and ends with leadership signing off one plan. The value is less in any single forecast than in everyone working from the same numbers.",
          ],
          [
            "For a small distributor, S&OP does not need to be elaborate. A monthly hour where sales, purchasing and finance review the next quarter's expected demand, supply risks and stock budget covers most of the benefit, as long as the meeting ends with decisions that change orders. S&OP works at the level of product families and totals, not individual SKUs.",
          ],
        ],
      },
      {
        title: "A simple monthly cycle",
        bullets: [
          ["Week 1, data: refresh the statistical forecast and last month's accuracy and bias by product family."],
          ["Week 2, demand review: sales adds known changes (new accounts, lost customers, price moves) as documented overrides."],
          ["Week 3, supply review: purchasing checks supplier capacity, lead times and open orders against the plan."],
          ["Week 4, decision: finance confirms the stock budget (see open-to-buy) and one plan is agreed. Orders change as a result."],
        ],
      },
    ],
    example: [
      [
        "Illustrative: the statistical forecast for a cable range shows steady demand, but sales knows a large customer is switching to a competitor next month. The demand planner cuts that customer's share from the forecast before the next purchase orders go out. In S&OP, purchasing then confirms suppliers can support a new contractor account that adds 15% volume to another family, and finance approves the extra stock investment, so the forecast is updated before orders are placed instead of after stockouts start.",
      ],
    ],
    why: [
      [
        "Many distributor stockouts and overstocks come from information that existed in one department but never reached purchasing. Demand planning and S&OP are how it moves. They let purchasing act early, which is the difference between buying for the market you will have and buying for the one you had.",
      ],
    ],
    mistakes: [
      ["Overriding the statistical forecast with opinions that are never checked afterwards."],
      ["Planning only in revenue, without translating to units by SKU and warehouse."],
      ["Turning S&OP into a report review with no decisions."],
      ["Planning at too detailed a level; S&OP works on product families and totals."],
    ],
    inApp: [
      "Supply Chain Manager produces the statistical forecast and reorder suggestions that a demand plan starts from. It does not have a demand-planning workspace, manual forecast overrides or S&OP features.",
    ],
    faq: [
      {
        q: "What is the difference between demand planning and demand forecasting?",
        a: ["Forecasting produces a statistical estimate from history. Demand planning adds human knowledge and agrees one number that purchasing will act on."],
      },
      {
        q: "Does a small distributor need S&OP?",
        a: ["A lightweight monthly version, with decisions recorded, covers most of the benefit. A heavy process is not necessary."],
      },
    ],
    related: ["forecast-accuracy", "forecast-bias", "bullwhip-effect", "open-to-buy", "lead-time"],
    updated: U,
  },
];
