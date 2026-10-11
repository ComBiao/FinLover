import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

import User from "../../src/server/db/models/User";
import Wallet from "../../src/server/db/models/Wallet";
import Category from "../../src/server/db/models/Category";
import Transaction from "../../src/server/db/models/Transaction";
import { DEFAULT_CATEGORIES } from "../../src/server/modules/auth/default-categories";

dotenv.config();
dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/finlover";

export async function seedDemoData() {
  console.log("------------------------------------------------------------");
  console.log("🌱 FinLover Sprint 2 Comprehensive Demo Data Seeder");
  console.log("------------------------------------------------------------");
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected to database.");

  const DEMO_EMAIL = "demo@finlover.com";
  const DELETE_DEMO_EMAIL = "delete-demo@finlover.com";
  const PASSWORD_PLAIN = "Password123";
  const passwordHash = await bcrypt.hash(PASSWORD_PLAIN, 10);

  // -------------------------------------------------------------------------
  // 1. Clean up existing demo accounts
  // -------------------------------------------------------------------------
  const existingUsers = await User.find({ email: { $in: [DEMO_EMAIL, DELETE_DEMO_EMAIL] } });
  for (const existingUser of existingUsers) {
    console.log(`Cleaning up existing records for ${existingUser.email}...`);
    await Transaction.collection.deleteMany({ userId: existingUser._id });
    await Wallet.deleteMany({ userId: existingUser._id });
    await Category.deleteMany({ userId: existingUser._id });
    await User.deleteOne({ _id: existingUser._id });
  }

  // -------------------------------------------------------------------------
  // 2. Create Primary Demo User (US1-1, US1-2)
  // -------------------------------------------------------------------------
  console.log(`Creating primary demo user: ${DEMO_EMAIL}`);
  const demoUser = await User.create({
    email: DEMO_EMAIL,
    name: "Alex Demo (FinLover)",
    passwordHash,
    dataPrivacyConsent: true,
  });

  // -------------------------------------------------------------------------
  // 3. Seed Categories (EPIC 5: US5-1 to US5-6)
  // -------------------------------------------------------------------------
  console.log("Seeding system default categories and custom categories...");
  
  // System Default Categories (US5-6: Immutable system defaults)
  const defaultCategoryDocs = DEFAULT_CATEGORIES.map((cat) => ({
    userId: demoUser._id,
    name: cat.name,
    type: cat.type,
    color: cat.color,
    icon: cat.icon,
    isSystem: true,
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    updatedAt: new Date("2026-08-01T00:00:00.000Z"),
  }));
  const seededDefaults = await Category.insertMany(defaultCategoryDocs);

  // Custom Categories (US5-1, US5-3, US5-4, US5-5)
  const customCategories = await Category.insertMany([
    {
      userId: demoUser._id,
      name: "Pet Supplies",
      type: "expense",
      color: "#10B981",
      icon: "HeartPulse",
      isSystem: false,
      createdAt: new Date("2026-09-01T00:00:00.000Z"),
      updatedAt: new Date("2026-09-01T00:00:00.000Z"),
    },
    {
      userId: demoUser._id,
      name: "Coffee & Cafe",
      type: "expense",
      color: "#D97706",
      icon: "Utensils",
      isSystem: false,
      createdAt: new Date("2026-09-01T00:00:00.000Z"),
      updatedAt: new Date("2026-09-01T00:00:00.000Z"),
    },
    {
      userId: demoUser._id,
      name: "Freelance Consulting",
      type: "income",
      color: "#6366F1",
      icon: "Briefcase",
      isSystem: false,
      createdAt: new Date("2026-09-01T00:00:00.000Z"),
      updatedAt: new Date("2026-09-01T00:00:00.000Z"),
    },
  ]);

  const categoryMap = new Map<string, mongoose.Types.ObjectId>();
  for (const c of [...seededDefaults, ...customCategories]) {
    categoryMap.set(`${c.type}:${c.name}`, c._id as mongoose.Types.ObjectId);
  }

  // -------------------------------------------------------------------------
  // 4. Seed Multiple Wallets (EPIC 6: US6-1 to US6-6)
  // -------------------------------------------------------------------------
  console.log("Seeding multiple wallets with saving goals and balances...");

  // Wallet 1: Main Bank (Standard active wallet)
  const mainBank = await Wallet.create({
    userId: demoUser._id,
    name: "Main Bank",
    color: "#3B82F6", // Blue
    balance: 33140.0,
    isDefault: false,
    isSaving: false,
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
  });

  // Wallet 2: Cash (Default wallet)
  const cashWallet = await Wallet.create({
    userId: demoUser._id,
    name: "Cash",
    color: "#4A4757", // Charcoal
    balance: 2840.0,
    isDefault: true,
    isSaving: false,
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
  });

  // Wallet 3: Emergency Fund (Saving Wallet: US2-7 Scenario 1 - ฿12,400 of ฿20,000 · 62%)
  const emergencyFund = await Wallet.create({
    userId: demoUser._id,
    name: "Emergency Fund",
    color: "#10B981", // Emerald
    balance: 12400.0,
    isDefault: false,
    isSaving: true,
    goalAmount: 20000.0,
    createdAt: new Date("2026-09-01T00:00:00.000Z"),
  });

  // Wallet 4: Trip to Japan (Saving Wallet: US6-6 Scenario 1 - ฿15,000 of ฿50,000 · 30%)
  const japanWallet = await Wallet.create({
    userId: demoUser._id,
    name: "Trip to Japan",
    color: "#EC4899", // Pink
    balance: 15000.0,
    isDefault: false,
    isSaving: true,
    goalAmount: 50000.0,
    createdAt: new Date("2026-09-15T00:00:00.000Z"),
  });

  // Wallet 5: Old Fund (US6-5 Scenario 1 - Dedicated wallet with 5 transactions for Cascade Delete demo)
  const oldFund = await Wallet.create({
    userId: demoUser._id,
    name: "Old Fund",
    color: "#8B5CF6", // Purple
    balance: 3000.0,
    isDefault: false,
    isSaving: false,
    createdAt: new Date("2026-09-01T00:00:00.000Z"),
  });

  // -------------------------------------------------------------------------
  // 5. Seed Transactions (EPIC 2 & EPIC 3)
  // -------------------------------------------------------------------------
  console.log("Seeding transactions across October 2026, September 2026, and August 2026...");

  const transactionsData = [
    // =========================================================================
    // OCTOBER 2026 (Current Month - Surplus Dashboard: US2-3, US2-4, US2-5, US2-6)
    // Income: ฿32,000.00 | Expense: ฿9,180.00 | Net: +฿22,820.00
    // =========================================================================
    // October Incomes on Main Bank
    {
      userId: demoUser._id,
      walletId: mainBank._id,
      categoryId: categoryMap.get("income:Salary")!,
      type: "income",
      amount: 30000.0,
      date: new Date("2026-10-01T12:00:00.000Z"),
      title: "Monthly Salary",
      notes: "Tech Corp Oct 2026 salary direct deposit",
      recurrence: { isRecurring: false, parentId: null },
      createdAt: new Date("2026-10-01T12:00:00.000Z"),
      updatedAt: new Date("2026-10-01T12:00:00.000Z"),
    },
    {
      userId: demoUser._id,
      walletId: mainBank._id,
      categoryId: categoryMap.get("income:Bonus")!,
      type: "income",
      amount: 2000.0,
      date: new Date("2026-10-03T12:00:00.000Z"),
      title: "Quarterly Performance Bonus",
      notes: "Q3 outstanding project delivery bonus",
      recurrence: { isRecurring: false, parentId: null },
      createdAt: new Date("2026-10-03T12:00:00.000Z"),
      updatedAt: new Date("2026-10-03T12:00:00.000Z"),
    },

    // October Expenses on Main Bank (Top Categories Breakdown)
    // 1. Food & Drinks: 2240 + 180 + 820 = ฿3,240.00 (Rank 1 - US2-6)
    {
      userId: demoUser._id,
      walletId: mainBank._id,
      categoryId: categoryMap.get("expense:Food & Drinks")!,
      type: "expense",
      amount: 2240.0,
      date: new Date("2026-10-04T12:00:00.000Z"),
      title: "Monthly Supermarket Groceries",
      notes: "Gourmet Market fresh produce and meat",
      recurrence: { isRecurring: false, parentId: null },
      createdAt: new Date("2026-10-04T12:00:00.000Z"),
      updatedAt: new Date("2026-10-04T12:00:00.000Z"),
    },
    {
      userId: demoUser._id,
      walletId: mainBank._id,
      categoryId: categoryMap.get("expense:Food & Drinks")!,
      type: "expense",
      amount: 180.0,
      date: new Date("2026-10-05T12:00:00.000Z"),
      title: "Specialty Drip Coffee",
      notes: "Chiang Mai single origin coffee beans", // Matches Search "coffee" (US3-3)
      recurrence: { isRecurring: false, parentId: null },
      createdAt: new Date("2026-10-05T12:00:00.000Z"),
      updatedAt: new Date("2026-10-05T12:00:00.000Z"),
    },
    {
      userId: demoUser._id,
      walletId: mainBank._id,
      categoryId: categoryMap.get("expense:Food & Drinks")!,
      type: "expense",
      amount: 820.0,
      date: new Date("2026-10-06T12:00:00.000Z"),
      title: "Dinner with Team",
      notes: "Japanese Izakaya dinner party",
      recurrence: { isRecurring: false, parentId: null },
      createdAt: new Date("2026-10-06T12:00:00.000Z"),
      updatedAt: new Date("2026-10-06T12:00:00.000Z"),
    },

    // 2. Shopping: ฿2,860.00 (Rank 2 - US2-6)
    {
      userId: demoUser._id,
      walletId: mainBank._id,
      categoryId: categoryMap.get("expense:Shopping")!,
      type: "expense",
      amount: 2860.0,
      date: new Date("2026-10-07T12:00:00.000Z"),
      title: "Uniqlo Autumn Clothing",
      notes: "Work fleece jacket and casual trousers",
      recurrence: { isRecurring: false, parentId: null },
      createdAt: new Date("2026-10-07T12:00:00.000Z"),
      updatedAt: new Date("2026-10-07T12:00:00.000Z"),
    },

    // 3. Utilities: 1200 + 700 = ฿1,900.00 (Rank 3 - US2-6)
    {
      userId: demoUser._id,
      walletId: mainBank._id,
      categoryId: categoryMap.get("expense:Utilities")!,
      type: "expense",
      amount: 1200.0,
      date: new Date("2026-10-08T12:00:00.000Z"),
      title: "Condo Electricity & Water",
      notes: "MEA monthly electric bill and water supply",
      recurrence: { isRecurring: false, parentId: null },
      createdAt: new Date("2026-10-08T12:00:00.000Z"),
      updatedAt: new Date("2026-10-08T12:00:00.000Z"),
    },
    {
      userId: demoUser._id,
      walletId: mainBank._id,
      categoryId: categoryMap.get("expense:Utilities")!,
      type: "expense",
      amount: 700.0,
      date: new Date("2026-10-09T12:00:00.000Z"),
      title: "High-Speed Fiber Internet",
      notes: "AIS Fibre home 500/500Mbps monthly plan",
      recurrence: { isRecurring: false, parentId: null },
      createdAt: new Date("2026-10-09T12:00:00.000Z"),
      updatedAt: new Date("2026-10-09T12:00:00.000Z"),
    },

    // 4. Transportation: 680 + 500 = ฿1,180.00 (Rank 4 - US2-6)
    {
      userId: demoUser._id,
      walletId: mainBank._id,
      categoryId: categoryMap.get("expense:Transportation")!,
      type: "expense",
      amount: 680.0,
      date: new Date("2026-10-10T12:00:00.000Z"),
      title: "BTS & MRT Transit Pass",
      notes: "Rabbit card monthly commuter top-up",
      recurrence: { isRecurring: false, parentId: null },
      createdAt: new Date("2026-10-10T12:00:00.000Z"),
      updatedAt: new Date("2026-10-10T12:00:00.000Z"),
    },
    {
      userId: demoUser._id,
      walletId: mainBank._id,
      categoryId: categoryMap.get("expense:Transportation")!,
      type: "expense",
      amount: 500.0,
      date: new Date("2026-10-11T12:00:00.000Z"),
      title: "Airport Taxi Ride",
      notes: "Grab ride to Don Mueang terminal",
      recurrence: { isRecurring: false, parentId: null },
      createdAt: new Date("2026-10-11T12:00:00.000Z"),
      updatedAt: new Date("2026-10-11T12:00:00.000Z"),
    },

    // October Cash Wallet Transactions (includes "Not Chosen" Category fallback demo - US3-5)
    {
      userId: demoUser._id,
      walletId: cashWallet._id,
      categoryId: categoryMap.get("income:Allowance/Gift")!,
      type: "income",
      amount: 3000.0,
      date: new Date("2026-10-01T10:00:00.000Z"),
      title: "ATM Cash Withdrawal",
      notes: "Monthly physical pocket money",
      recurrence: { isRecurring: false, parentId: null },
      createdAt: new Date("2026-10-01T10:00:00.000Z"),
      updatedAt: new Date("2026-10-01T10:00:00.000Z"),
    },
    {
      userId: demoUser._id,
      walletId: cashWallet._id,
      categoryId: null, // "Not Chosen" Category Fallback Demo (US3-5 Scenario 2)
      type: "expense",
      amount: 20.0,
      date: new Date("2026-10-02T10:00:00.000Z"),
      title: "ATM Service Fee",
      notes: "Inter-bank cash withdrawal fee (no category chosen)",
      recurrence: { isRecurring: false, parentId: null },
      createdAt: new Date("2026-10-02T10:00:00.000Z"),
      updatedAt: new Date("2026-10-02T10:00:00.000Z"),
    },
    {
      userId: demoUser._id,
      walletId: cashWallet._id,
      categoryId: categoryMap.get("expense:Food & Drinks")!,
      type: "expense",
      amount: 65.0,
      date: new Date("2026-10-04T08:00:00.000Z"),
      title: "Morning Iced Coffee",
      notes: "Street cart traditional iced coffee with condensed milk", // Matches Search "coffee"
      recurrence: { isRecurring: false, parentId: null },
      createdAt: new Date("2026-10-04T08:00:00.000Z"),
      updatedAt: new Date("2026-10-04T08:00:00.000Z"),
    },
    {
      userId: demoUser._id,
      walletId: cashWallet._id,
      categoryId: categoryMap.get("expense:Food & Drinks")!,
      type: "expense",
      amount: 75.0,
      date: new Date("2026-10-05T18:00:00.000Z"),
      title: "Street Food Pad Thai",
      notes: "Dinner at evening street food market",
      recurrence: { isRecurring: false, parentId: null },
      createdAt: new Date("2026-10-05T18:00:00.000Z"),
      updatedAt: new Date("2026-10-05T18:00:00.000Z"),
    },

    // =========================================================================
    // SEPTEMBER 2026 (Previous Month - Deficit / Overspending: US2-5 Scenario 2)
    // Income: ฿5,000.00 | Expense: ฿9,180.00 | Net: -฿4,180.00
    // =========================================================================
    {
      userId: demoUser._id,
      walletId: mainBank._id,
      categoryId: categoryMap.get("income:Freelance Consulting")!, // Custom Category
      type: "income",
      amount: 5000.0,
      date: new Date("2026-09-01T12:00:00.000Z"),
      title: "Freelance Web Design",
      notes: "Landing page UI design contract payout",
      recurrence: { isRecurring: false, parentId: null },
      createdAt: new Date("2026-09-01T12:00:00.000Z"),
      updatedAt: new Date("2026-09-01T12:00:00.000Z"),
    },
    {
      userId: demoUser._id,
      walletId: mainBank._id,
      categoryId: categoryMap.get("expense:Shopping")!,
      type: "expense",
      amount: 4500.0,
      date: new Date("2026-09-05T12:00:00.000Z"),
      title: "UltraSharp 4K Monitor",
      notes: "Dell 27-inch USB-C monitor upgrade",
      recurrence: { isRecurring: false, parentId: null },
      createdAt: new Date("2026-09-05T12:00:00.000Z"),
      updatedAt: new Date("2026-09-05T12:00:00.000Z"),
    },
    {
      userId: demoUser._id,
      walletId: mainBank._id,
      categoryId: categoryMap.get("expense:Food & Drinks")!,
      type: "expense",
      amount: 3000.0,
      date: new Date("2026-09-12T12:00:00.000Z"),
      title: "Weekend Seafood Buffet",
      notes: "Family reunion dinner",
      recurrence: { isRecurring: false, parentId: null },
      createdAt: new Date("2026-09-12T12:00:00.000Z"),
      updatedAt: new Date("2026-09-12T12:00:00.000Z"),
    },
    {
      userId: demoUser._id,
      walletId: mainBank._id,
      categoryId: categoryMap.get("expense:Coffee & Cafe")!, // Custom Category for US5-4 Delete & Reassignment demo
      type: "expense",
      amount: 1000.0,
      date: new Date("2026-09-18T12:00:00.000Z"),
      title: "AeroPress Coffee Beans",
      notes: "Specialty Ethiopian roasted coffee beans", // Matches Search "coffee"
      recurrence: { isRecurring: false, parentId: null },
      createdAt: new Date("2026-09-18T12:00:00.000Z"),
      updatedAt: new Date("2026-09-18T12:00:00.000Z"),
    },
    {
      userId: demoUser._id,
      walletId: mainBank._id,
      categoryId: categoryMap.get("expense:Transportation")!,
      type: "expense",
      amount: 680.0,
      date: new Date("2026-09-22T12:00:00.000Z"),
      title: "Monthly Train Commute",
      notes: "SRT red line suburban commuter ticket",
      recurrence: { isRecurring: false, parentId: null },
      createdAt: new Date("2026-09-22T12:00:00.000Z"),
      updatedAt: new Date("2026-09-22T12:00:00.000Z"),
    },

    // Saving Wallets Funding Transactions in September
    {
      userId: demoUser._id,
      walletId: emergencyFund._id,
      categoryId: categoryMap.get("income:Investment")!,
      type: "income",
      amount: 12400.0,
      date: new Date("2026-09-01T10:00:00.000Z"),
      title: "Emergency Fund Allocation",
      notes: "High-yield savings target allocation (62% of goal reached)",
      recurrence: { isRecurring: false, parentId: null },
      createdAt: new Date("2026-09-01T10:00:00.000Z"),
      updatedAt: new Date("2026-09-01T10:00:00.000Z"),
    },
    {
      userId: demoUser._id,
      walletId: japanWallet._id,
      categoryId: categoryMap.get("income:Investment")!,
      type: "income",
      amount: 15000.0,
      date: new Date("2026-09-15T10:00:00.000Z"),
      title: "Japan Travel Flight Savings",
      notes: "Initial Tokyo vacation funding",
      recurrence: { isRecurring: false, parentId: null },
      createdAt: new Date("2026-09-15T10:00:00.000Z"),
      updatedAt: new Date("2026-09-15T10:00:00.000Z"),
    },

    // Old Fund: 5 Transactions for US6-5 Cascade Delete Demonstration
    {
      userId: demoUser._id,
      walletId: oldFund._id,
      categoryId: categoryMap.get("income:Others")!,
      type: "income",
      amount: 5000.0,
      date: new Date("2026-09-01T09:00:00.000Z"),
      title: "Old Cash Stash",
      notes: "Initial deposit into old secondary wallet",
      recurrence: { isRecurring: false, parentId: null },
      createdAt: new Date("2026-09-01T09:00:00.000Z"),
      updatedAt: new Date("2026-09-01T09:00:00.000Z"),
    },
    {
      userId: demoUser._id,
      walletId: oldFund._id,
      categoryId: categoryMap.get("expense:Shopping")!,
      type: "expense",
      amount: 450.0,
      date: new Date("2026-09-05T09:00:00.000Z"),
      title: "Vintage Books Purchase",
      notes: "Second-hand programming textbooks",
      recurrence: { isRecurring: false, parentId: null },
      createdAt: new Date("2026-09-05T09:00:00.000Z"),
      updatedAt: new Date("2026-09-05T09:00:00.000Z"),
    },
    {
      userId: demoUser._id,
      walletId: oldFund._id,
      categoryId: categoryMap.get("expense:Shopping")!,
      type: "expense",
      amount: 850.0,
      date: new Date("2026-09-10T09:00:00.000Z"),
      title: "Vintage Denim Jacket",
      notes: "Chatuchak weekend market thrift find",
      recurrence: { isRecurring: false, parentId: null },
      createdAt: new Date("2026-09-10T09:00:00.000Z"),
      updatedAt: new Date("2026-09-10T09:00:00.000Z"),
    },
    {
      userId: demoUser._id,
      walletId: oldFund._id,
      categoryId: categoryMap.get("expense:Food & Drinks")!,
      type: "expense",
      amount: 350.0,
      date: new Date("2026-09-15T09:00:00.000Z"),
      title: "Cold Brew Coffee Beans",
      notes: "Whole bean house blend coffee", // Matches Search "coffee"
      recurrence: { isRecurring: false, parentId: null },
      createdAt: new Date("2026-09-15T09:00:00.000Z"),
      updatedAt: new Date("2026-09-15T09:00:00.000Z"),
    },
    {
      userId: demoUser._id,
      walletId: oldFund._id,
      categoryId: categoryMap.get("expense:Food & Drinks")!,
      type: "expense",
      amount: 350.0,
      date: new Date("2026-09-20T09:00:00.000Z"),
      title: "Bakery Cookies & Croissants",
      notes: "Afternoon team tea-time snack",
      recurrence: { isRecurring: false, parentId: null },
      createdAt: new Date("2026-09-20T09:00:00.000Z"),
      updatedAt: new Date("2026-09-20T09:00:00.000Z"),
    },

    // =========================================================================
    // AUGUST 2026 (Sprint 1 Month - US3-1 Scenario 1 Verification)
    // =========================================================================
    {
      userId: demoUser._id,
      walletId: mainBank._id,
      categoryId: categoryMap.get("income:Others")!,
      type: "income",
      amount: 15000.0,
      date: new Date("2026-08-01T12:00:00.000Z"),
      title: "Opening Balance Funding",
      notes: "Initial savings transfer to start tracking",
      recurrence: { isRecurring: false, parentId: null },
      createdAt: new Date("2026-08-01T12:00:00.000Z"),
      updatedAt: new Date("2026-08-01T12:00:00.000Z"),
    },
    {
      userId: demoUser._id,
      walletId: mainBank._id,
      categoryId: categoryMap.get("expense:Food & Drinks")!, // Matches US3-1 Scenario 1
      type: "expense",
      amount: 500.0,
      date: new Date("2026-08-25T12:00:00.000Z"), // Exactly 2026-08-25 from backlog!
      title: "Sprint 1 Lunch Meeting",
      notes: "Lunch with project team",
      recurrence: { isRecurring: false, parentId: null },
      createdAt: new Date("2026-08-25T12:00:00.000Z"),
      updatedAt: new Date("2026-08-25T12:00:00.000Z"),
    },
  ];

  await Transaction.collection.insertMany(transactionsData);
  console.log(`✅ Seeded ${transactionsData.length} transactions.`);

  // -------------------------------------------------------------------------
  // 6. Create Secondary Disposable Account (EPIC 1: US1-4 Delete Account Demo)
  // -------------------------------------------------------------------------
  console.log(`Creating secondary disposable account: ${DELETE_DEMO_EMAIL}`);
  const deleteDemoUser = await User.create({
    email: DELETE_DEMO_EMAIL,
    name: "Disposable Test User",
    passwordHash,
    dataPrivacyConsent: true,
  });

  const disposableDefaults = DEFAULT_CATEGORIES.map((cat) => ({
    userId: deleteDemoUser._id,
    name: cat.name,
    type: cat.type,
    color: cat.color,
    icon: cat.icon,
    isSystem: true,
  }));
  await Category.insertMany(disposableDefaults);

  const disposableWallet = await Wallet.create({
    userId: deleteDemoUser._id,
    name: "Disposable Wallet",
    color: "#6B7280",
    balance: 1000.0,
    isDefault: true,
    isSaving: false,
  });

  await Transaction.collection.insertOne({
    userId: deleteDemoUser._id,
    walletId: disposableWallet._id,
    categoryId: null,
    type: "income",
    amount: 1000.0,
    date: new Date("2026-10-01T12:00:00.000Z"),
    title: "Test Initial Balance",
    notes: "Disposable transaction for testing delete-account cascade",
    recurrence: { isRecurring: false, parentId: null },
    createdAt: new Date("2026-10-01T12:00:00.000Z"),
    updatedAt: new Date("2026-10-01T12:00:00.000Z"),
  });

  console.log("------------------------------------------------------------");
  console.log("🎉 Seed Completed Successfully!");
  console.log("------------------------------------------------------------");
  console.log("👤 Primary Demo Credentials:");
  console.log(`   Email:    ${DEMO_EMAIL}`);
  console.log(`   Password: ${PASSWORD_PLAIN}`);
  console.log(`   Name:     Alex Demo (FinLover)`);
  console.log("");
  console.log("👤 Disposable User (for US1-4 Account Deletion Demo):");
  console.log(`   Email:    ${DELETE_DEMO_EMAIL}`);
  console.log(`   Password: ${PASSWORD_PLAIN}`);
  console.log("------------------------------------------------------------");

  await mongoose.disconnect();
}

if (require.main === module || process.argv[1]?.endsWith("seed-demo-user.ts")) {
  seedDemoData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Seed error:", err);
      process.exit(1);
    });
}

