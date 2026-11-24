# Product claims check (2026-11-24)

Checked marketing copy against code. Files read: src/lib/metrics/*, src/lib/subscriptions/tiers.ts, src/lib/insights/quick-order.ts, src/app/actions/subscription.ts, src/lib/competitors-data.ts, marketing components.

## Confirmed true
- Trailing 90-day demand window (metrics/inventory.ts, procurement.ts).
- Health score weights 30/20/20/20/10 (metrics/health.ts). Thresholds 80/60 not yet re-read; verify before quoting.
- OTIF is spend-weighted (metrics/supplier.ts).
- Prices and plan limits come from tiers.ts: Starter $49, Growth $199, Professional $649, Enterprise contact-us (shown from $2,000).
- Billing through Polar, monthly products only (polar.ts has monthly env vars only).
- "You approve every action": the app creates PO records only on a click.

## Not true or overstated (fix before rewriting; do not repeat in new pages)
1. PO "cost calculated for you" (features-grid, purchase-orders page): quick-order.ts keeps unknown supplier, quantity and price as null, and the user must enter them. Say "suggested", not "calculated", for every order.
2. "Turn demand calculations into vendor purchase orders instantly" and "Reorders exact quantities": the action creates a PO record in the app. It does not send anything to the supplier (no supplier email in createPoFromSuggestionAction). "Exact" is an overclaim.
3. "Prevent over-ordering and stockouts simultaneously": no evidence in code; remove.
4. /vs/inventory-planner: "Flat pricing ... without surprise fees for growing SKU catalogs". Our plans are tiered by SKU and warehouse (500 / 5,000 / 50,000 SKUs), so the criticism of SKU-tiered pricing also applies to us. Rewrite.
5. /vs pages: competitor facts ("$249+", "no OTIF", "no AI", "requires API integrations") are dated 2026-09-20 and unsourced. Re-verify from each vendor's own site or remove.
6. "Migration takes minutes" (vs pages): unverified.
7. Plan limits (warehouses, SKUs) are shown on the pricing page but tiers.ts says they are not yet enforced. Do not describe them as hard limits.
8. Warehouse transfer approval in the FAQ: no transfer-creation action found in src; the product recommends transfers. Say "recommends", not "approve a transfer".

## Built but not committed (do not advertise)
- Morning briefing EMAIL (src/lib/briefing, api/cron/morning-briefing, briefing_settings migration) is untracked in git. Marketing says "in-app briefing", which is fine. Do not claim email briefings until committed and deployed.

## Not yet checked
- Forecasting claims (7-model tournament, forecasting service availability), the AI Manager page, security/privacy statements, and how-it-works copy.
- Health score thresholds 80 / 60.

## Added 2026-11-24 (purchasing batch): "OTIF" is only on-time
- prisma PurchaseOrder has no received-quantity column. src/lib/metrics/supplier.ts: isInFull() = "received date exists", so every received order counts as in full. The app's "OTIF" score therefore measures on-time delivery only. It cannot detect short shipments.
- "OTIF scorecards", "on-time-in-full delivery" and similar wording appears in: tiers.ts (Starter and Growth feature lists), features-grid, faq, ai-spotlight, daily-review, morning-briefing, competitor-page + competitors-data (15 mentions), features page, supplier-scorecards page, blog index, glossary index, terms page, the supplier-otif blog guide, and the app UI itself.
- Decision needed from the owner: (a) rename to "on-time delivery" everywhere, or (b) add received quantity to purchase orders so "in full" is real. Until then new pages must not claim in-full tracking. The glossary pages already say so.

## Resolved 2026-11-24: OTIF wording (option a)
Public pages now say "on-time delivery". Changed: features-grid, faq, ai-spotlight, daily-review, morning-briefing, competitor-page, competitors-data (all /vs pages), features page, supplier-scorecards page, tiers.ts feature list, and the product paragraph in the supplier-otif blog guide (the guide still teaches OTIF generally and keeps its URL and title for search).
NOT changed (in-app, owner's call): the dashboard labels "OTIF" in suppliers page/table/summary cards, overview, procurement cards, AI manager, insights (alerts, explanations, health alerts, recommendations) and their tests. Until renamed or until received quantity is stored, the app UI and the website use different words for the same score.

## Added 2026-11-24 (feature pages batch)
- The "AI Manager" is NOT a language model. src/app/actions/ai-manager.ts matches four topics by keyword (stockout/risk/low, supplier/otif/delivery, overstock/capital/tied up, anything else) and fills the reply from live data. The feature page and the /vs matrices now say "rule-based Q&A on your data". Check any remaining "AI" wording on the home page (ai-spotlight.tsx, hero) and in the app against this.
- Health score: purchase order timeliness feeds three of five parts (supplier 20%, procurement 14% effective, logistics 20%), more than half the score. Procurement's order fulfilment and cycle-time scores are the same on-time rate counted twice. Logistics is inbound PO timeliness (no shipment data).
- Transfer suggestions are shown for any plan in the code (no gate found); tiers.ts lists them under Professional. The feature page only says "listed as a plan feature". Decide whether to gate or to relist.
- Automatic refresh: confirm it is switched on in production (the UI says "Automatic refresh isn't switched on yet" when it is not) and that the GitHub workflow has CRON_SECRET set, before the page is published.
- Per-plan AI query allowances are not reliably enforced (see the comment in ai-manager.ts); they are not mentioned on the feature page beyond the demo caps.
