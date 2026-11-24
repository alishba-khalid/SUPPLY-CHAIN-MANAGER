# New-page proposal: 30 pages to reach 100 (2026-11-24)

Status: PROPOSAL, nothing built. Needs the owner's yes/no per row.

## Where the count stands
- Sitemap today: 70 URLs (home, 4 section pages, 3 feature pages, 7 compare pages, blog index plus 5 guides, glossary index plus 44 terms, about, terms, privacy, security).
- 70 + 30 = 100. `/design-partner` and `/health-check` stay out of the sitemap (lead forms, little to index). Indexing them would count as two of the 30.

## What this is based on, and what it is not
- Evidence is the topics real guides, vendor help pages and comparison sites publish about (web search results, 2026-11-24). It is **not** demand data: no search volumes exist and no Reddit, X or Quora threads could be retrieved. Rank order is by fit to the product, evidence and low overlap, not by traffic.
- Every page that describes the product must pass `docs/seo/product-claims-check.md` before it is written. Rows marked "verify" need a code check first. Compare pages need the vendor's own site read first.

## Rules each new page follows
Title about 50 to 60 characters, description under 160, one H1, 500+ words, one non-commodity element (table, calculator, worked example or checklist), honest limits, FAQ, related links, a Sources section where outside facts are used, and "not advice" notes where legal or accounting topics appear.

## Wave 1: product-supported and low overlap (13 pages)

| # | URL | Type | Primary keyword | Intent | Evidence | Product check | Overlap risk |
|---|---|---|---|---|---|---|---|
| 1 | /features/stockout-projections | Feature | stockout projection software | Commercial | Day-by-day projected balance per SKU is the core product screen; vendors market "projected stockouts" | Verify against projections page and demand-forecast.ts | Low |
| 2 | /features/supply-chain-health-score | Feature | supply chain health score | Commercial | Unique product concept (weights 30/20/20/20/10, bands 80/60) | Weights confirmed in metrics/health.ts; verify bands | Low |
| 3 | /features/data-importer | Feature | import inventory data from excel csv | Commercial | Importer is the onboarding path; competitors' import pages exist | Verify importer limits (row limits by plan) | Low |
| 4 | /features/automatic-data-refresh | Feature | auto refresh inventory from google sheets | Commercial | Sync from Sheets, OneDrive or a CSV link exists (cron refresh-data-sources) | Verify end to end before claiming | Low |
| 5 | /features/multi-warehouse-planning | Feature | multi-warehouse inventory planning software | Commercial | Per-warehouse planning and transfer recommendations (Professional plan) | Recommendations only; no transfer action | Low |
| 6 | /features/ai-manager | Feature | ai inventory assistant | Commercial | Several compared vendors market AI assistants | Verify what the assistant can and cannot answer | Low |
| 7 | /tools/reorder-point-calculator | Tool | reorder point calculator | Transactional | Many free calculators appear for this query (QuickBooks, Qoblex, miniwebtool, Unleashed) | Neutral tool; no product claim | Medium: link to the blog guide, do not repeat it |
| 8 | /tools/safety-stock-calculator | Tool | safety stock calculator | Transactional | Same set of vendor calculators | Use the statistical method the app uses (z x sigma x sqrt(lead time)) plus the simple method | Medium |
| 9 | /tools/eoq-calculator | Tool | eoq calculator | Transactional | Part of calculator suites in search results | Neutral | Medium vs glossary EOQ page |
| 10 | /blog/excel-vs-inventory-software-for-distributors | Guide | excel vs inventory software | Commercial | Inventory Planner, Capterra, Cin7, MYOB all publish on outgrowing Excel | Say what the product replaces and what it does not | Low |
| 11 | /blog/reduce-stockouts-and-overstock | Guide | reduce stockouts and overstock | Informational | Result sets stress per-SKU service levels, ABC segmentation, regular recalculation | No product claim beyond what exists | Medium vs blog overstock guide: focus on policy mix |
| 12 | /blog/inventory-kpis-for-distributors | Guide | inventory kpis for distributors | Informational | Distributor KPI lists name inventory days, cash conversion cycle, turns, GMROI, carrying cost | State which the app shows and which it does not | Medium: hub that links glossary terms |
| 13 | /blog/how-to-choose-inventory-planning-software | Guide | how to choose inventory planning software | Commercial | Vendor checklists name growth, integration, accuracy, security, support, trial on real data | Honest about our limits (no ERP connection) | Low |

## Wave 2: needs research or has real overlap risk (17 pages)

| # | URL | Type | Primary keyword | Intent | Evidence | Needs | Overlap risk |
|---|---|---|---|---|---|---|---|
| 14 | /vs (hub) | Hub | supply chain manager alternatives | Commercial | No index of the 7 compare pages exists | Links only | Low |
| 15 | /vs/fishbowl | Compare | fishbowl alternative | Commercial | Fishbowl, inFlow, Zoho are repeatedly compared in search results | Read Fishbowl's own site | Low |
| 16 | /vs/inflow | Compare | inflow inventory alternative | Commercial | As above | Read inFlow's own site | Low |
| 17 | /vs/zoho-inventory | Compare | zoho inventory alternative | Commercial | As above | Read Zoho's own site | Low |
| 18 | /blog/measure-supplier-lead-time-from-purchase-orders | Guide | how to measure supplier lead time | Informational | Lead-time variability drives safety stock; needs only three PO dates | Product tracks PO cycle time (verify) | Medium vs glossary lead-time |
| 19 | /blog/multi-warehouse-inventory-planning | Guide | balance stock across warehouses | Informational | Vendors (Inventory Planner, Odoo, LS Central, Inform) describe transfer logic and source-side stockout checks | Careful with product claims | Medium vs feature page 5 |
| 20 | /blog/how-to-set-min-max-levels | Guide | how to set min max inventory levels | Informational | Several guides give min = lead-time demand plus safety stock, max = min + order quantity | Differentiate from glossary min/max with a worked table | HIGH: consider cutting |
| 21 | /blog/how-to-calculate-reorder-quantity | Guide | how to calculate reorder quantity | Informational | Appears in the spreadsheet-method results alongside EOQ | Differentiate from EOQ glossary and calculator | HIGH: consider cutting |
| 22 | /blog/set-service-levels-by-abc-class | Guide | service level by abc class | Informational | ABC-based service targets appear in min/max guides | Product has one fixed 95% level; say so | Medium vs glossary service-level |
| 23 | /blog/prepare-spreadsheet-data-for-inventory-software | Guide | prepare data for inventory software import | Informational | Migration and clean-data advice recurs in Excel-outgrowing articles | Match the importer's real columns | Low |
| 24 | /blog/seasonal-demand-planning-for-distributors | Guide | seasonal demand planning | Informational | Seasonality is a standard topic; product has only weekly seasonality | Be explicit about limits | Medium vs glossary seasonality |
| 25 | /blog/how-to-run-a-supplier-performance-review | Guide | supplier performance review | Informational | Supplier KPIs recur in distributor KPI guides | Use on-time delivery wording | Low |
| 26 | /blog/first-90-days-with-inventory-planning-software | Guide | inventory software implementation plan | Informational | Vendors stress phased adoption and trial on real data | Describe our actual onboarding | Low |
| 27 | /blog/how-to-read-a-stockout-projection | Guide | stockout projection chart explained | Informational | Product explainer supporting feature page 1 | Verify chart elements | Low |
| 28 | /blog/purchase-order-checklist-for-distributors | Guide | purchase order checklist | Informational | PO, MOQ, price breaks, landed cost topics are covered by vendor guides | Link to the glossary pages | Low |
| 29 | /blog/inventory-turnover-by-category-in-excel | Guide | calculate inventory turnover in excel | Informational | Turnover by category is listed among distributor KPIs | Differentiate from glossary with a spreadsheet walk-through | Medium |
| 30 | /blog/supplier-scorecard-template | Template | supplier scorecard template | Transactional | Supplier scorecards are a recurring distributor topic | Provide a downloadable CSV; no unverified claims | Medium vs feature page |

## Recommended build order
1. Wave 1 in this order: features 1 to 6 (verify each against code first), calculators 7 to 9, then guides 10 to 13.
2. Wave 2 compare pages 14 to 17 after reading each vendor's own site.
3. Remaining wave 2 guides, dropping rows 20 and 21 first if overlap worries you. Replacement ideas if cut: a "supplier lead time tracking" worksheet and a "demand spike or one-off order" guide.

## Decisions needed from the owner
1. Approve, cut or swap rows (especially 20, 21, 29, 30).
2. Keep `/design-partner` and `/health-check` out of the sitemap (recommended), or index them.
3. Calculators need front-end work. Okay to build them as client-side pages with no data collection?
4. Add a measurement plan before publishing: connect Search Console and Bing Webmaster Tools so the keyword hypotheses can be checked.
