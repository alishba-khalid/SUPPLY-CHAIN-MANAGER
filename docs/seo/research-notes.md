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
