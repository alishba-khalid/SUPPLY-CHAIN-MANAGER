import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Ship,
  Warehouse,
  BarChart3,
  Sparkles,
  Settings,
  UserCircle,
} from "lucide-react";

export const NAV_ITEMS = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/procurement", label: "Procurement", icon: ShoppingCart },
  { href: "/suppliers", label: "Suppliers", icon: Truck },
  { href: "/logistics", label: "Logistics", icon: Ship },
  { href: "/warehouses", label: "Warehouses", icon: Warehouse },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/ai-manager", label: "AI Manager", icon: Sparkles },
] as const;

export const BOTTOM_NAV_ITEMS = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/profile", label: "Profile", icon: UserCircle },
] as const;
