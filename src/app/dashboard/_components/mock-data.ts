import { Car, Coffee, ShoppingBag, Wallet, Zap, type LucideIcon } from "lucide-react";

// TODO: replace with real data from a `useDashboardData` react-query hook
// (src/hooks/) backed by GET /api/transactions, /api/categories, etc.,
// once those API routes and models exist.

export interface Category {
  name: string;
  amount: string;
  dotClassName: string;
}

export const categories: Category[] = [
  { name: "Food & Drink", amount: "3,240", dotClassName: "bg-chart-1" },
  { name: "Transport", amount: "1,180", dotClassName: "bg-chart-2" },
  { name: "Shopping", amount: "2,860", dotClassName: "bg-chart-3" },
  { name: "Bills", amount: "1,900", dotClassName: "bg-chart-4" },
];

export interface Transaction {
  name: string;
  category: string;
  date: string;
  icon: LucideIcon;
  iconClassName: string;
  amount: string;
  amountClassName: string;
}

export const transactions: Transaction[] = [
  {
    name: "Grab",
    category: "Transport",
    date: "Today",
    icon: Car,
    iconClassName: "bg-chart-2/15 text-chart-2",
    amount: "-฿180",
    amountClassName: "text-destructive",
  },
  {
    name: "Salary deposit",
    category: "Income",
    date: "Yesterday",
    icon: Wallet,
    iconClassName: "bg-success-bg text-success",
    amount: "+฿32,000",
    amountClassName: "text-success",
  },
  {
    name: "Central World",
    category: "Shopping",
    date: "Aug 21",
    icon: ShoppingBag,
    iconClassName: "bg-chart-3/25 text-foreground/70",
    amount: "-฿1,240",
    amountClassName: "text-destructive",
  },
  {
    name: "Electricity bill",
    category: "Bills",
    date: "Aug 19",
    icon: Zap,
    iconClassName: "bg-chart-4/20 text-chart-4",
    amount: "-฿890",
    amountClassName: "text-destructive",
  },
  {
    name: "Coffee Beans Co.",
    category: "Food & Drink",
    date: "Aug 18",
    icon: Coffee,
    iconClassName: "bg-chart-1/20 text-chart-1",
    amount: "-฿145",
    amountClassName: "text-destructive",
  },
];
