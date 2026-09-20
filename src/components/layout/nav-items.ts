import {
  UploadCloud,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Ship,
  Warehouse,
  BarChart3,
  LineChart,
  Waves,
  Sparkles,
  Settings,
  UserCircle,
} from "lucide-react";

export const NAV_ITEMS = [
  { href: "/dashboard/import", label: "Import Data", icon: UploadCloud },
  { href: "/dashboard/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/inventory", label: "Inventory", icon: Package },
  { href: "/dashboard/projections", label: "Projections", icon: Waves },
  { href: "/dashboard/procurement", label: "Procurement", icon: ShoppingCart },
  { href: "/dashboard/suppliers", label: "Suppliers", icon: Truck },
  { href: "/dashboard/logistics", label: "Logistics", icon: Ship },
  { href: "/dashboard/warehouses", label: "Warehouses", icon: Warehouse },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/forecast-accuracy", label: "Forecast Accuracy", icon: LineChart },
  { href: "/dashboard/ai-manager", label: "AI Manager", icon: Sparkles },
] as const;

export const BOTTOM_NAV_ITEMS = [
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/dashboard/profile", label: "Profile", icon: UserCircle },
] as const;
