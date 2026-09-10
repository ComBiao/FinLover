import { Car, Coffee, ShoppingBag, Wallet, Zap, type LucideIcon } from "lucide-react";

// TODO: replace with real data from a `useDashboardData` react-query hook
// (src/hooks/) backed by GET /api/transactions, /api/categories, etc.,
// once those API routes and models exist.

// TODO: replace with the signed-in user's real name once the User model
// gains a `name` field and a route exposes the current session's profile
// (session.ts today only carries { userId } in the JWT payload).
export const userName = "Alex";

export const balance = {
  amount: "48,290.00",
  changeLabel: "+12.4% this month",
};

export const income = {
  amount: "32,000",
  sourceLabel: "Salary deposit",
  dateLabel: "yesterday",
};

export const spending = {
  amount: "9,180",
  changeLabel: "↑ 6% vs last month",
};

export const savingsGoal = {
  name: "Emergency fund",
  current: 12400,
  target: 20000,
  percent: 62,
};

export interface Category {
  name: string;
  amount: string;
  dotClassName: string;
}

export const categories: Category[] = [
  { name: "Food & drink", amount: "3,240", dotClassName: "bg-chart-1" },
  { name: "Transport", amount: "1,180", dotClassName: "bg-chart-2" },
  { name: "Shopping", amount: "2,860", dotClassName: "bg-chart-3" },
];

export interface Transaction {
  id: string;
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
    id: "tx-1",
    name: "Grab",
    category: "Transport",
    date: "Today",
    icon: Car,
    iconClassName: "bg-chart-2/15 text-chart-2",
    amount: "-฿180",
    amountClassName: "text-destructive",
  },
  {
    id: "tx-2",
    name: "Salary deposit",
    category: "Income",
    date: "Yesterday",
    icon: Wallet,
    iconClassName: "bg-success-bg text-success",
    amount: "+฿32,000",
    amountClassName: "text-success",
  },
  {
    id: "tx-3",
    name: "Central World",
    category: "Shopping",
    date: "Aug 21",
    icon: ShoppingBag,
    iconClassName: "bg-chart-3/25 text-foreground/70",
    amount: "-฿1,240",
    amountClassName: "text-destructive",
  },
  {
    id: "tx-4",
    name: "Electricity bill",
    category: "Bills",
    date: "Aug 19",
    icon: Zap,
    iconClassName: "bg-chart-4/20 text-chart-4",
    amount: "-฿890",
    amountClassName: "text-destructive",
  },
  {
    id: "tx-5",
    name: "Coffee Beans Co.",
    category: "Food & Drink",
    date: "Aug 18",
    icon: Coffee,
    iconClassName: "bg-chart-1/20 text-chart-1",
    amount: "-฿145",
    amountClassName: "text-destructive",
  },
];
