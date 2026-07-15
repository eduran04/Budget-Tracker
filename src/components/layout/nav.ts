import {
  ArrowLeftRight,
  ChartPie,
  LayoutDashboard,
  PiggyBank,
  Settings,
  Target,
  Wallet,
} from "lucide-react";

export const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { to: "/accounts", label: "Accounts", icon: Wallet },
  { to: "/budgets", label: "Budgets", icon: ChartPie },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/reports", label: "Reports", icon: PiggyBank },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;
