import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

import User from "../../src/server/db/models/User";
import Wallet from "../../src/server/db/models/Wallet";
import Category from "../../src/server/db/models/Category";
import Transaction from "../../src/server/db/models/Transaction";
import Scheduler from "../../src/server/db/models/Scheduler";
import { DEFAULT_CATEGORIES } from "../../src/server/modules/auth/default-categories";

dotenv.config();
dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/finlover";

export const REPORTS_EMAIL = "reports-demo@finlover.com";
const PASSWORD_PLAIN = "Password123";

type WalletKey = "cash" | "bank" | "card";
type Row = {
  wallet: WalletKey;
  /** `type:Name` of a default category, or null for a transaction without a category (counts toward Others). */
  category: string | null;
  amount: number;
  date: string;
  title: string;
};

const income = (wallet: WalletKey, category: string, amount: number, date: string, title: string): Row => ({
  wallet,
  category: `income:${category}`,
  amount: +amount,
  date,
  title,
});
const expense = (wallet: WalletKey, category: string | null, amount: number, date: string, title: string): Row => ({
  wallet,
  category: category === null ? null : `expense:${category}`,
  amount: -amount,
  date,
  title,
});

/**
 * Epic 8 demo ledger. Amounts are signed here (income positive, expense negative) so wallet balances
 * can be derived from them: wallets have no stored opening balance, and the running-balance report works
 * the opening balance back from the current balance, so the two must agree.
 *
 * What each period shows (US = backlog story):
 * - Sep 2026, all wallets: income 45,000, expense 30,000, net +15,000, 11 transactions (US8-1, US8-2). Income is
 *   Salary 88.9% / Investment 11.1%; expense is Food & Drinks 35.0 / Shopping 23.3 / Utilities 20.0 /
 *   Transportation 16.7 / Others 5.0 (US8-4). The 1,500 without a category folds into Others.
 * - Sep 7-13 and Sep 21-27 have expenses only, so a weekly bucket has income 0 (US8-3).
 * - Aug 10-20 has expenses and no income at all (US8-4: empty income card).
 * - Oct 1-15, all wallets: 12,400 before Oct 1, 36,400 on Oct 15, flat on days without transactions; the
 *   Oct 20 and 22 rows come after the range but still count when working the opening balance back (US8-5).
 * - The Credit Card wallet only spends, so its running balance is negative throughout (US8-5).
 * - Nothing exists after Oct 22 2026 or before Jul 1 2026, so Feb 2027 or a 2025 range is the empty period.
 */
export const REPORTS_LEDGER: Row[] = [
  // ---- July 2026: income 28,000, expense 33,000 ------------------------------------------------------------
  income("bank", "Salary", 28000, "2026-07-01", "July salary"),
  expense("bank", "Utilities", 5000, "2026-07-04", "Electricity and water"),
  expense("cash", "Food & Drinks", 6000, "2026-07-07", "Groceries"),
  expense("card", "Shopping", 8000, "2026-07-11", "Laptop bag and accessories"),
  expense("bank", "Transportation", 4000, "2026-07-15", "Monthly transit pass and fuel"),
  expense("cash", "Food & Drinks", 5000, "2026-07-19", "Dining out"),
  expense("card", "Transportation", 3000, "2026-07-24", "Airport transfer"),
  expense("bank", "Shopping", 2000, "2026-07-28", "Clothes"),

  // ---- August 2026: income 33,000, expense 30,600; Aug 2-27 has no income ----------------------------------
  income("bank", "Salary", 30000, "2026-08-01", "August salary"),
  expense("bank", "Utilities", 5500, "2026-08-03", "Electricity and internet"),
  expense("cash", "Food & Drinks", 4200, "2026-08-06", "Groceries"),
  expense("card", "Shopping", 7000, "2026-08-09", "Headphones"),
  expense("bank", "Transportation", 3500, "2026-08-13", "Fuel and parking"),
  expense("cash", "Food & Drinks", 3900, "2026-08-17", "Weekend dinners"),
  expense("card", "Food & Drinks", 3000, "2026-08-21", "Team lunch"),
  expense("card", "Shopping", 2500, "2026-08-24", "Gifts"),
  expense("bank", "Utilities", 1000, "2026-08-26", "Phone bill"),
  income("bank", "Investment", 3000, "2026-08-28", "Dividend payout"),

  // ---- September 2026: income 45,000, expense 30,000 (the Epic 8 acceptance example) ----------------------
  income("bank", "Salary", 40000, "2026-09-01", "September salary"),
  expense("bank", "Utilities", 6000, "2026-09-02", "Electricity and water"),
  expense("cash", "Food & Drinks", 4500, "2026-09-03", "Groceries"),
  expense("card", "Shopping", 5500, "2026-09-05", "New phone case and charger"),
  expense("bank", "Transportation", 3000, "2026-09-08", "Fuel"),
  expense("cash", "Food & Drinks", 3500, "2026-09-10", "Dining out"),
  expense("card", "Transportation", 2000, "2026-09-12", "Ride-hailing"),
  income("bank", "Investment", 5000, "2026-09-15", "Fund dividend"),
  expense("bank", "Food & Drinks", 2500, "2026-09-18", "Team dinner"),
  expense("cash", null, 1500, "2026-09-20", "Misc (category deleted)"),
  expense("card", "Shopping", 1500, "2026-09-25", "Books"),

  // ---- October 2026 (opening balance on Oct 1 is 12,400 across all wallets) -------------------------------
  income("bank", "Salary", 40000, "2026-10-01", "October salary"),
  expense("cash", "Food & Drinks", 600, "2026-10-02", "Breakfast and lunch"),
  expense("card", "Shopping", 9000, "2026-10-03", "Monitor"),
  expense("bank", "Utilities", 2500, "2026-10-06", "Electricity and water"),
  expense("cash", "Transportation", 800, "2026-10-09", "Taxi"),
  expense("bank", "Food & Drinks", 1200, "2026-10-12", "Groceries"),
  expense("card", "Food & Drinks", 1900, "2026-10-14", "Restaurant"),
  // after the Oct 1-15 range, but part of the current balance the opening is worked back from
  income("bank", "Investment", 2000, "2026-10-20", "Dividend payout"),
  expense("card", "Transportation", 700, "2026-10-22", "Ride-hailing"),
];

const WALLETS: { key: WalletKey; name: string; color: string; isDefault: boolean }[] = [
  { key: "cash", name: "Cash", color: "#4A4757", isDefault: true },
  { key: "bank", name: "Bank", color: "#3B82F6", isDefault: false },
  { key: "card", name: "Credit Card", color: "#EF4444", isDefault: false },
];

const sum = (rows: Row[]) => rows.reduce((total, row) => total + row.amount, 0);
const between = (rows: Row[], from: string, to: string) => rows.filter((row) => row.date >= from && row.date <= to);

/** Fails the seed when the ledger drifts from the figures the guide promises. */
function assertLedger(rows: Row[], balances: Record<WalletKey, number>) {
  const check = (label: string, actual: number, expected: number) => {
    if (Math.abs(actual - expected) > 0.001) throw new Error(`Reports seed drifted: ${label} is ${actual}, expected ${expected}`);
  };
  const sep = between(rows, "2026-09-01", "2026-09-30");
  check("Sep income", sum(sep.filter((r) => r.amount > 0)), 45000);
  check("Sep expense", -sum(sep.filter((r) => r.amount < 0)), 30000);
  check("Sep count", sep.length, 11);
  check("Aug 10-20 income", sum(between(rows, "2026-08-10", "2026-08-20").filter((r) => r.amount > 0)), 0);

  const total = (Object.values(balances) as number[]).reduce((a, b) => a + b, 0);
  const sinceOct1 = sum(rows.filter((r) => r.date >= "2026-10-01"));
  check("opening on Oct 1 (all wallets)", total - sinceOct1, 12400);
  check("balance on Oct 15 (all wallets)", 12400 + sum(between(rows, "2026-10-01", "2026-10-15")), 36400);
  if (balances.card >= 0) throw new Error("Reports seed drifted: the Credit Card wallet should be negative");
}

export async function seedReportsData() {
  console.log("------------------------------------------------------------");
  console.log("📊 FinLover Epic 8 Reports Demo Data Seeder");
  console.log("------------------------------------------------------------");
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected to database.");

  const passwordHash = await bcrypt.hash(PASSWORD_PLAIN, 10);

  const existing = await User.find({ email: REPORTS_EMAIL });
  for (const user of existing) {
    console.log(`Cleaning up existing records for ${user.email}...`);
    await Transaction.collection.deleteMany({ userId: user._id });
    await Scheduler.collection.deleteMany({ userId: user._id });
    await Wallet.deleteMany({ userId: user._id });
    await Category.deleteMany({ userId: user._id });
    await User.deleteOne({ _id: user._id });
  }

  const user = await User.create({
    email: REPORTS_EMAIL,
    name: "Riley Reports (FinLover)",
    passwordHash,
    dataPrivacyConsent: true,
  });

  const created = new Date("2026-06-01T00:00:00.000Z");
  const categories = await Category.insertMany(
    DEFAULT_CATEGORIES.map((category) => ({
      userId: user._id,
      name: category.name,
      type: category.type,
      color: category.color,
      icon: category.icon,
      isSystem: true,
      createdAt: created,
      updatedAt: created,
    })),
  );
  const categoryId = new Map(categories.map((c) => [`${c.type}:${c.name}`, c._id as mongoose.Types.ObjectId]));

  const balances: Record<WalletKey, number> = { cash: 0, bank: 0, card: 0 };
  for (const row of REPORTS_LEDGER) balances[row.wallet] += row.amount;
  assertLedger(REPORTS_LEDGER, balances);

  const wallets = new Map<WalletKey, mongoose.Types.ObjectId>();
  for (const wallet of WALLETS) {
    const doc = await Wallet.create({
      userId: user._id,
      name: wallet.name,
      color: wallet.color,
      balance: balances[wallet.key],
      isDefault: wallet.isDefault,
      isSaving: false,
      createdAt: created,
    });
    wallets.set(wallet.key, doc._id as mongoose.Types.ObjectId);
  }

  const documents = REPORTS_LEDGER.map((row) => {
    const date = new Date(`${row.date}T00:00:00.000Z`);
    const id = row.category === null ? null : categoryId.get(row.category);
    if (row.category !== null && !id) throw new Error(`Unknown default category ${row.category}`);
    return {
      userId: user._id,
      walletId: wallets.get(row.wallet)!,
      categoryId: id,
      type: row.amount > 0 ? "income" : "expense",
      amount: Math.abs(row.amount),
      date,
      title: row.title,
      createdAt: date,
      updatedAt: date,
    };
  });
  await Transaction.collection.insertMany(documents);

  console.log("------------------------------------------------------------");
  console.log("🎉 Reports seed completed!");
  console.log(`   Email:    ${REPORTS_EMAIL}`);
  console.log(`   Password: ${PASSWORD_PLAIN}`);
  console.log(`   Data:     ${WALLETS.length} Wallets, ${categories.length} Categories, ${documents.length} Transactions (Jul-Oct 2026)`);
  console.log("------------------------------------------------------------");

  await mongoose.disconnect();
}

if (require.main === module || process.argv[1]?.endsWith("seed-reports-user.ts")) {
  seedReportsData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Seed error:", err);
      process.exit(1);
    });
}
