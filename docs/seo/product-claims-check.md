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
