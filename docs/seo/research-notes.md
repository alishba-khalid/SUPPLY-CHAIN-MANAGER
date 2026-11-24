# SEO research notes (2026-11-24)

Status: in progress. No search-volume data exists (Ahrefs connector is on the Free plan, 0 API units; Search Console not connected). Do not quote volumes.

## Sources that could not be used
- Reddit, X, Quora: searches returned no threads. No thread titles are recorded here. Ask the owner to paste any real ones.

## Competitor facts (read from each vendor's own site, dated)
| Vendor | Fact | URL | Date |
|---|---|---|---|
| EazyStock | Cloud inventory optimization that connects to an ERP; for "SMB wholesalers, distributors, retailers, and manufacturers" (claim). | eazystock.com, /pricing | 2026-11-24 |
| EazyStock | No prices published. Quote only. Annual billing; monthly billing costs 10% more. Price depends on users and SKU count. Free trial: not confirmed. | eazystock.com/pricing | 2026-11-24 |
| Netstock | Demand and supply planning with an AI add-on. ERP integrations (60+ claimed). | netstock.com | 2026-11-24 |
| Netstock | FAQ: "Pricing starts at $900/month", annual subscription. Currency code not stated, so not confirmed. No free trial found. | netstock.com/pricing | 2026-11-24 |
| Netstock | Marketing claims, not verified: "fully operational in 90 days or less" conflicts with its own FAQ ("6-10 weeks"). | netstock.com | 2026-11-24 |

Already on the site (vs pages, last updated 2026-09-20, re-verify before the compare batch): Inventory Planner, Katana, Unleashed, StockTrim, Cin7.
Names seen in search results, not yet read: Odoo, NetSuite, Epicor Prophet 21, Fishbowl, GMDH Streamline, inFlow, Zoho Inventory.

## Topics real sources discuss (from search results, vendor-heavy)
- Outgrowing Excel / spreadsheets for reordering (Inventory Planner, Capterra, Cin7, MYOB all publish on it).
- Reorder point and reorder quantity in a spreadsheet; EOQ versus simple methods.
- Reducing stockouts and overstock at the same time (per-item service levels, review cadence).
- "Alternatives to X" pages for Inventory Planner, with EazyStock named as distributor-focused.

## Candidate new pages (about 27 slots). Intent only; volumes unknown
1. /vs/eazystock
2. /vs/netstock
3. Another 2 to 4 /vs pages after reading each vendor's site (Fishbowl, inFlow, Odoo, Prophet 21)
4. Excel vs software for distributor reordering
5. Reorder quantity in Excel (links to the reorder point guide and EOQ)
6. Reducing stockouts and overstock together
7. Alternatives pages for popular phrases ("Inventory Planner alternatives")
8. Use-case pages per distributor type, only if the product truly supports them (check code)
9. More blog guides: lead time variability, ABC classification for purchasing, demand forecasting for intermittent demand

Still to do: product-claims check against the code, keyword map (one primary per page), read remaining competitor sites, more question research.

## Competitor re-verification (2026-11-24, vendor sites only)
Applied to src/lib/competitors-data.ts. Old figures ($249+, $359+, $349+, $99+, $325+) were wrong or unsourced and are removed.
- Inventory Planner: pricing not published (request pricing); AI assistant yes (Sage Copilot, claim); OTIF and CSV import not confirmed; implementation required.
- Katana: Free plan $0 up to 30 SKUs; Advantage custom, annual contract; AI assistant, multi-location, CSV import yes.
- Unleashed: site returned HTTP 403, nothing confirmed. Page says so.
- StockTrim: from $49/mo billed annually, revenue-banded; unlimited users and SKUs; 14-day trial; AI assistant yes.
- Cin7 Core: $349 / $599 / $1,199 per month USD; forecasting is an add-on; "four weeks" onboarding is a claim.
- EazyStock and Netstock added (see above).
Not read: Netstock/EazyStock free trial, Unleashed anything. Re-check by 2027-02-24.

## Glossary consolidation log
- 2026-11-24: forecasting done. 19 terms -> 7 pages (forecast-accuracy, forecast-bias, exponential-smoothing, seasonality, intermittent-demand, bullwhip-effect, demand-planning). 12 slugs redirect (src/lib/glossary/merged.ts, next.config.ts). Remaining: inventory+stock, purchasing, warehouse, finance.
- 2026-11-24: inventory + stock done. 34 terms (plus 6 from purchasing/finance/warehouse) -> 16 pages. 24 more slugs redirect; slow-moving-inventory, obsolete-inventory, safety-time redirect to blog guides. 72 glossary pages live. Remaining: purchasing, warehouse, finance.
- OPEN: docs/metrics.md and blog safety-stock-formula say safety stock = demand x 0.5 x lead time; code (metrics/inventory.ts) uses z x sigma x sqrt(lead time) at 95% when demand varies, else the half-lead-time rule. Fix in the blog batch.
- OPEN: app has no allocations/holds, backorders, fill rate, min/max levels or UoM conversion; "available" in the UI = quantity on hand.
- 2026-11-24: purchasing done (19 -> 8 pages + payment-terms kept for finance) and warehouse done (19 terms incl. 2 moved earlier -> 7 pages). 51 glossary pages live, 67 redirects total. Remaining: finance (13 terms -> 6 pages; payment-terms joins cash-to-cash-cycle).
- 2026-11-24: finance done (13 terms + payment-terms -> 6 pages). GLOSSARY CONSOLIDATION COMPLETE: 108 terms -> 44 pages (49 incl. blog-guide entries), 61 slug redirects + 3 to blog guides. Site now ~72 URLs; 28 slots left for new pages.
