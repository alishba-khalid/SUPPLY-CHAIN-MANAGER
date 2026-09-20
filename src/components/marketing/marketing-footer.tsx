import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SITE_NAME, CONTACT_EMAIL } from "@/lib/site-config";

const PRODUCT_LINKS = [
  { href: "/features/demand-forecasting", label: "Demand Forecasting" },
  { href: "/features/supplier-scorecards", label: "Supplier Scorecards" },
  { href: "/features/purchase-orders", label: "1-Click Purchase Orders" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

const COMPARISON_LINKS = [
  { href: "/vs/inventory-planner", label: "vs Inventory Planner" },
  { href: "/vs/katana", label: "vs Katana MRP" },
  { href: "/vs/unleashed", label: "vs Unleashed" },
  { href: "/vs/stocktrim", label: "vs StockTrim" },
  { href: "/vs/cin7", label: "vs Cin7 Core" },
];

const COMPANY_LINKS = [
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/security", label: "Security" },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-(--color-border) bg-(--color-surface)">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-5">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-(--color-brand) text-white">
                <Logo size={16} />
              </div>
              <span className="text-body font-semibold text-(--color-text-primary)">{SITE_NAME}</span>
            </div>
            <p className="mt-3 text-caption text-(--color-text-secondary)">
              Supply chain intelligence & demand forecasting for wholesale distributors.
            </p>
          </div>

          <div>
            <p className="text-caption font-semibold uppercase tracking-wide text-(--color-text-muted)">Features</p>
            <ul className="mt-3 space-y-2">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-small text-(--color-text-secondary) hover:text-(--color-text-primary)">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-caption font-semibold uppercase tracking-wide text-(--color-text-muted)">Compare</p>
            <ul className="mt-3 space-y-2">
              {COMPARISON_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-small text-(--color-text-secondary) hover:text-(--color-text-primary)">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-caption font-semibold uppercase tracking-wide text-(--color-text-muted)">Company</p>
            <ul className="mt-3 space-y-2">
              {COMPANY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-small text-(--color-text-secondary) hover:text-(--color-text-primary)">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-caption font-semibold uppercase tracking-wide text-(--color-text-muted)">Contact</p>
            <ul className="mt-3 space-y-2">
              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-small text-(--color-text-secondary) hover:text-(--color-text-primary)"
                >
                  {CONTACT_EMAIL}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-(--color-border) pt-6">
          <p className="text-small text-(--color-text-muted)">
            © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
