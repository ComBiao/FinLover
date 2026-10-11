import type { SystemCategorySeed } from '@/server/shared/ports/categories';

export const DEFAULT_CATEGORIES = [
  { name: 'Food & Drinks', type: 'expense', color: '#EA580C', icon: 'Utensils' },
  { name: 'Transportation', type: 'expense', color: '#2563EB', icon: 'Car' },
  { name: 'Essentials', type: 'expense', color: '#16A34A', icon: 'Home' },
  { name: 'Shopping', type: 'expense', color: '#DB2777', icon: 'ShoppingCart' },
  { name: 'Utilities', type: 'expense', color: '#CA8A04', icon: 'Zap' },
  { name: 'Health', type: 'expense', color: '#DC2626', icon: 'HeartPulse' },
  { name: 'Entertainment', type: 'expense', color: '#9333EA', icon: 'Film' },
  { name: 'Others', type: 'expense', color: '#4B5563', icon: 'MoreHorizontal' },
  { name: 'Salary', type: 'income', color: '#16A34A', icon: 'Wallet' },
  { name: 'Wages', type: 'income', color: '#059669', icon: 'Banknote' },
  { name: 'Allowance/Gift', type: 'income', color: '#DB2777', icon: 'Gift' },
  { name: 'Bonus', type: 'income', color: '#CA8A04', icon: 'Award' },
  { name: 'Investment', type: 'income', color: '#2563EB', icon: 'PieChart' },
  { name: 'Others', type: 'income', color: '#4B5563', icon: 'MoreHorizontal' },
] as const satisfies readonly SystemCategorySeed[];
