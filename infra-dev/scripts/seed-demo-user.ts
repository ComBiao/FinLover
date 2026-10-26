import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

import User from "../../src/server/db/models/User";
import Wallet from "../../src/server/db/models/Wallet";
import WalletMember from "../../src/server/db/models/WalletMember";
import Category from "../../src/server/db/models/Category";
import Transaction from "../../src/server/db/models/Transaction";
import Scheduler from "../../src/server/db/models/Scheduler";
import { DEFAULT_CATEGORIES } from "../../src/server/modules/auth/default-categories";

dotenv.config();
dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/finlover";

export async function seedDemoData() {
  console.log("------------------------------------------------------------");
  console.log("🌱 FinLover Comprehensive Demo Data Seeder (Personal & Shared)");
  console.log("------------------------------------------------------------");
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected to database.");

  const DEMO_EMAIL = "demo@finlover.com";
  const PARTNER_EMAIL = "partner@finlover.com";
  const ROOMMATE_EMAIL = "roommate@finlover.com";
  const DAVE_EMAIL = "dave@finlover.com";
  const DELETE_DEMO_EMAIL = "delete-demo@finlover.com";
  const ALL_DEMO_EMAILS = [
    DEMO_EMAIL,
    PARTNER_EMAIL,
    ROOMMATE_EMAIL,
    DAVE_EMAIL,
    DELETE_DEMO_EMAIL,
  ];
  const PASSWORD_PLAIN = "Password123";
  const passwordHash = await bcrypt.hash(PASSWORD_PLAIN, 10);

  // -------------------------------------------------------------------------
  // 1. Clean up existing demo accounts & related data
  // -------------------------------------------------------------------------
  const existingUsers = await User.find({ email: { $in: ALL_DEMO_EMAILS } });
  const userIds = existingUsers.map((u) => u._id);
  const existingWallets = await Wallet.find({ userId: { $in: userIds } });
  const walletIds = existingWallets.map((w) => w._id);

  console.log(`Cleaning up existing records for demo accounts (${ALL_DEMO_EMAILS.join(", ")})...`);
  await Transaction.collection.deleteMany({
    $or: [{ userId: { $in: userIds } }, { walletId: { $in: walletIds } }],
  });
  await Scheduler.collection.deleteMany({
    $or: [{ userId: { $in: userIds } }, { walletId: { $in: walletIds } }],
  });
  await WalletMember.collection.deleteMany({
    $or: [
      { userId: { $in: userIds } },
      { invitedBy: { $in: userIds } },
      { walletId: { $in: walletIds } },
    ],
  });
  await Wallet.deleteMany({ _id: { $in: walletIds } });
  await Category.deleteMany({ userId: { $in: userIds } });
  await User.deleteMany({ _id: { $in: userIds } });

  // -------------------------------------------------------------------------
  // 2. Create Demo Users (US1-1, US1-2, EPIC 7 Multi-User Shared Wallets)
  // -------------------------------------------------------------------------
  console.log(`Creating demo users:`);
  console.log(` • Primary Demo User:    ${DEMO_EMAIL} (Alex Demo)`);
  console.log(` • Partner / Contributor: ${PARTNER_EMAIL} (Sarah Partner)`);
  console.log(` • Roommate / Contributor:${ROOMMATE_EMAIL} (Bob Roommate)`);
  console.log(` • Colleague (Pending):   ${DAVE_EMAIL} (Dave Colleague)`);

  const demoUser = await User.create({
    email: DEMO_EMAIL,
    name: "Alex Demo (FinLover)",
    passwordHash,
    dataPrivacyConsent: true,
  });

  const partnerUser = await User.create({
    email: PARTNER_EMAIL,
    name: "Sarah Partner",
    passwordHash,
    dataPrivacyConsent: true,
  });

  const roommateUser = await User.create({
    email: ROOMMATE_EMAIL,
    name: "Bob Roommate",
    passwordHash,
    dataPrivacyConsent: true,
  });

  const daveUser = await User.create({
    email: DAVE_EMAIL,
    name: "Dave Colleague",
    passwordHash,
    dataPrivacyConsent: true,
  });

  // -------------------------------------------------------------------------
  // 3. Seed Categories (EPIC 5: US5-1 to US5-6)
  // -------------------------------------------------------------------------
  console.log("Seeding system default categories and custom categories...");
  
  // System Default Categories for Alex Demo (US5-6: Immutable system defaults)
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

  // Seed default categories for companion demo users as well
  for (const companion of [partnerUser, roommateUser, daveUser]) {
    const companionDefaults = DEFAULT_CATEGORIES.map((cat) => ({
      userId: companion._id,
      name: cat.name,
      type: cat.type,
      color: cat.color,
      icon: cat.icon,
      isSystem: true,
      createdAt: new Date("2026-08-01T00:00:00.000Z"),
      updatedAt: new Date("2026-08-01T00:00:00.000Z"),
    }));
    await Category.insertMany(companionDefaults);
  }

  // Custom Categories for Alex Demo (US5-1, US5-3, US5-4, US5-5)
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
  // 4. Seed Personal Wallets (EPIC 6: US6-1 to US6-6)
  // -------------------------------------------------------------------------
  console.log("Seeding personal wallets with saving goals and balances...");

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

  // Seed companion accounts' personal wallets
  await Wallet.create({
    userId: partnerUser._id,
    name: "Sarah Main Wallet",
    color: "#EC4899",
    balance: 45000.0,
    isDefault: true,
    isSaving: false,
  });

  await Wallet.create({
    userId: roommateUser._id,
    name: "Bob Cash",
    color: "#4A4757",
    balance: 8500.0,
    isDefault: true,
    isSaving: false,
  });

  // -------------------------------------------------------------------------
  // 4b. Seed Shared Wallets (EPIC 7: Shared Wallets & Invitations)
  // -------------------------------------------------------------------------
  console.log("Seeding shared wallets, contributor memberships, and pending invitations...");

  // Shared Wallet 1: "Family Living & Bills" (Alex Demo is OWNER)
  // Members: Alex Demo (Owner), Sarah Partner (Contributor), Bob Roommate (Contributor), Dave Colleague (Pending)
  const familySharedWallet = await Wallet.create({
    userId: demoUser._id,
    name: "Family Living & Bills",
    color: "#0284C7", // Sky Blue
    balance: 14500.0,
    isDefault: false,
    isShared: true,
    membershipVersion: 1,
    isSaving: false,
    createdAt: new Date("2026-09-01T00:00:00.000Z"),
  });

  // Shared Wallet 2: "Japan Vacation Fund" (Sarah Partner is OWNER, Alex Demo is CONTRIBUTOR)
  // Demonstrates Contributor role view, shared saving goal progress (40%), and collaborative budgeting
  const vacationSharedWallet = await Wallet.create({
    userId: partnerUser._id,
    name: "Japan Vacation Fund",
    color: "#EC4899", // Pink
    balance: 24000.0,
    isDefault: false,
    isShared: true,
    membershipVersion: 1,
    isSaving: true,
    goalAmount: 60000.0,
    createdAt: new Date("2026-09-10T00:00:00.000Z"),
  });

  // Shared Wallet 3: "Weekend Camping Trip" (Sarah Partner invited Alex Demo -> Pending Invitation 1)
  // Demonstrates InvitationsBanner on Wallets and Home pages with Accept / Decline actions!
  const campingSharedWallet = await Wallet.create({
    userId: partnerUser._id,
    name: "Weekend Camping Trip",
    color: "#10B981", // Emerald
    balance: 3500.0,
    isDefault: false,
    isShared: true,
    membershipVersion: 0,
    isSaving: false,
    createdAt: new Date("2026-10-20T00:00:00.000Z"),
  });

  // Shared Wallet 4: "Office Coffee & Snacks" (Bob Roommate invited Alex Demo -> Pending Invitation 2)
  // Demonstrates NotificationBell multiple invitations badge ("2") and inbox dropdown list!
  const snackSharedWallet = await Wallet.create({
    userId: roommateUser._id,
    name: "Office Coffee & Snacks",
    color: "#F59E0B", // Amber
    balance: 1200.0,
    isDefault: false,
    isShared: true,
    membershipVersion: 0,
    isSaving: false,
    createdAt: new Date("2026-10-22T00:00:00.000Z"),
  });

  // Seed WalletMember rows
  const walletMembersData = [
    // Members of "Family Living & Bills" (Owner: Alex Demo)
    {
      walletId: familySharedWallet._id,
      userId: partnerUser._id,
      status: "accepted" as const,
      invitedBy: demoUser._id,
      createdAt: new Date("2026-09-02T10:00:00.000Z"),
    },
    {
      walletId: familySharedWallet._id,
      userId: roommateUser._id,
      status: "accepted" as const,
      invitedBy: demoUser._id,
      createdAt: new Date("2026-09-05T10:00:00.000Z"),
    },
    {
      walletId: familySharedWallet._id,
      userId: daveUser._id,
      status: "pending" as const, // Pending invite in Members Dialog
      invitedBy: demoUser._id,
      createdAt: new Date("2026-10-15T10:00:00.000Z"),
    },

    // Member of "Japan Vacation Fund" (Owner: Sarah Partner, Alex is Contributor)
    {
      walletId: vacationSharedWallet._id,
      userId: demoUser._id,
      status: "accepted" as const, // Alex accepted Contributor
      invitedBy: partnerUser._id,
      createdAt: new Date("2026-09-12T10:00:00.000Z"),
    },

    // Pending Invitation 1 for Alex Demo (Shows in InvitationsBanner)
    {
      walletId: campingSharedWallet._id,
      userId: demoUser._id,
      status: "pending" as const,
      invitedBy: partnerUser._id,
      createdAt: new Date("2026-10-24T09:00:00.000Z"),
    },

    // Pending Invitation 2 for Alex Demo (Shows in NotificationBell)
    {
      walletId: snackSharedWallet._id,
      userId: demoUser._id,
      status: "pending" as const,
      invitedBy: roommateUser._id,
      createdAt: new Date("2026-10-25T14:00:00.000Z"),
    },
  ];

  await WalletMember.collection.insertMany(walletMembersData);
  console.log(`✅ Seeded ${walletMembersData.length} shared wallet memberships and invitations.`);

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
      createdAt: new Date("2026-08-25T12:00:00.000Z"),
      updatedAt: new Date("2026-08-25T12:00:00.000Z"),
    },

    // =========================================================================
    // SHARED WALLET TRANSACTIONS (EPIC 7: Multi-User Collaboration & Attribution)
    // =========================================================================
    // 1. "Family Living & Bills" (October 2026)
    // Income: ฿35,000 | Expense: ฿20,500 | Net: +฿14,500
    // Demonstrates: Multi-member entries, preset categories, and attribution
    {
      userId: demoUser._id,
      walletId: familySharedWallet._id,
      categoryId: null,
      categoryKey: "others-income",
      type: "income",
      amount: 15000.0,
      date: new Date("2026-10-01T10:00:00.000Z"),
      title: "Alex Living Contribution",
      notes: "Monthly room & food contribution from Alex",
      createdAt: new Date("2026-10-01T10:00:00.000Z"),
      updatedAt: new Date("2026-10-01T10:00:00.000Z"),
    },
    {
      userId: partnerUser._id,
      walletId: familySharedWallet._id,
      categoryId: null,
      categoryKey: "others-income",
      type: "income",
      amount: 15000.0,
      date: new Date("2026-10-01T10:30:00.000Z"),
      title: "Sarah Living Contribution",
      notes: "Monthly contribution from Sarah",
      createdAt: new Date("2026-10-01T10:30:00.000Z"),
      updatedAt: new Date("2026-10-01T10:30:00.000Z"),
    },
    {
      userId: roommateUser._id,
      walletId: familySharedWallet._id,
      categoryId: null,
      categoryKey: "others-income",
      type: "income",
      amount: 5000.0,
      date: new Date("2026-10-02T11:00:00.000Z"),
      title: "Bob Utilities Share",
      notes: "Bob contribution for electric and water bills",
      createdAt: new Date("2026-10-02T11:00:00.000Z"),
      updatedAt: new Date("2026-10-02T11:00:00.000Z"),
    },
    {
      userId: demoUser._id,
      walletId: familySharedWallet._id,
      categoryId: null,
      categoryKey: "essentials",
      type: "expense",
      amount: 12000.0,
      date: new Date("2026-10-03T14:00:00.000Z"),
      title: "Condo Common Fee & Maintenance",
      notes: "Quarterly management and security fee",
      createdAt: new Date("2026-10-03T14:00:00.000Z"),
      updatedAt: new Date("2026-10-03T14:00:00.000Z"),
    },
    {
      userId: partnerUser._id,
      walletId: familySharedWallet._id,
      categoryId: null,
      categoryKey: "shopping",
      type: "expense",
      amount: 3800.0,
      date: new Date("2026-10-05T16:00:00.000Z"),
      title: "Costco Bulk Household Supplies",
      notes: "Detergent, paper towels, and pantry staples",
      createdAt: new Date("2026-10-05T16:00:00.000Z"),
      updatedAt: new Date("2026-10-05T16:00:00.000Z"),
    },
    {
      userId: demoUser._id,
      walletId: familySharedWallet._id,
      categoryId: null,
      categoryKey: "utilities",
      type: "expense",
      amount: 2500.0,
      date: new Date("2026-10-08T15:00:00.000Z"),
      title: "Shared Fiber Internet & TV Package",
      notes: "Gigabit internet and cable connection",
      createdAt: new Date("2026-10-08T15:00:00.000Z"),
      updatedAt: new Date("2026-10-08T15:00:00.000Z"),
    },
    {
      userId: roommateUser._id,
      walletId: familySharedWallet._id,
      categoryId: null,
      categoryKey: "food-drinks",
      type: "expense",
      amount: 1400.0,
      date: new Date("2026-10-12T12:00:00.000Z"),
      title: "Weekly Organic Market Groceries",
      notes: "Fresh produce for shared dinners",
      updatedBy: partnerUser._id, // <<-- Attribution demo: logged by Bob, edited by Sarah!
      createdAt: new Date("2026-10-12T12:00:00.000Z"),
      updatedAt: new Date("2026-10-12T13:30:00.000Z"),
    },
    {
      userId: roommateUser._id,
      walletId: familySharedWallet._id,
      categoryId: null,
      categoryKey: "utilities",
      type: "expense",
      amount: 800.0,
      date: new Date("2026-10-15T09:00:00.000Z"),
      title: "Water Filter Replacement",
      notes: "Clean drinking water cartridge replacement",
      createdAt: new Date("2026-10-15T09:00:00.000Z"),
      updatedAt: new Date("2026-10-15T09:00:00.000Z"),
    },

    // 2. "Japan Vacation Fund" (Shared Saving Wallet: Goal ฿60,000 | Balance ฿24,000 · 40%)
    // Demonstrates: Contributor view, shared saving progress bar, and multi-member travel savings
    {
      userId: partnerUser._id,
      walletId: vacationSharedWallet._id,
      categoryId: null,
      categoryKey: "allowance-gift",
      type: "income",
      amount: 12000.0,
      date: new Date("2026-09-20T10:00:00.000Z"),
      title: "Sarah Initial Flight Deposit",
      notes: "50% flight reservation advance from Sarah",
      createdAt: new Date("2026-09-20T10:00:00.000Z"),
      updatedAt: new Date("2026-09-20T10:00:00.000Z"),
    },
    {
      userId: demoUser._id,
      walletId: vacationSharedWallet._id,
      categoryId: null,
      categoryKey: "allowance-gift",
      type: "income",
      amount: 12000.0,
      date: new Date("2026-09-22T10:00:00.000Z"),
      title: "Alex Initial Flight Deposit",
      notes: "50% flight reservation advance from Alex",
      createdAt: new Date("2026-09-22T10:00:00.000Z"),
      updatedAt: new Date("2026-09-22T10:00:00.000Z"),
    },
    {
      userId: demoUser._id,
      walletId: vacationSharedWallet._id,
      categoryId: null,
      categoryKey: "allowance-gift",
      type: "income",
      amount: 10000.0,
      date: new Date("2026-10-10T10:00:00.000Z"),
      title: "October Travel Savings Injection",
      notes: "Additional accommodation fund",
      createdAt: new Date("2026-10-10T10:00:00.000Z"),
      updatedAt: new Date("2026-10-10T10:00:00.000Z"),
    },
    {
      userId: partnerUser._id,
      walletId: vacationSharedWallet._id,
      categoryId: null,
      categoryKey: "others-expense",
      type: "expense",
      amount: 10000.0,
      date: new Date("2026-10-14T14:00:00.000Z"),
      title: "Tokyo Hotel Early Bird Reservation",
      notes: "3 nights booking in Shinjuku",
      createdAt: new Date("2026-10-14T14:00:00.000Z"),
      updatedAt: new Date("2026-10-14T14:00:00.000Z"),
    },
  ];

  await Transaction.collection.insertMany(transactionsData);
  console.log(`✅ Seeded ${transactionsData.length} transactions (personal and shared).`);

  // -------------------------------------------------------------------------
  // 6. Seed Recurring Transactions (EPIC 4: US4-1 to US4-5)
  // -------------------------------------------------------------------------
  console.log("Seeding recurring transaction rules (active, paused, completed, and cascade-ready)...");

  const schedulersData = [
    // 1. Netflix 4K Subscription (US4-1 / US4-3: Active Monthly Expense, Indefinite)
    {
      userId: demoUser._id,
      walletId: mainBank._id,
      categoryId: categoryMap.get("expense:Entertainment")!,
      type: "expense" as const,
      amount: 419.0,
      title: "Netflix 4K Premium",
      notes: "Family plan shared subscription",
      startDate: new Date("2026-08-15T00:00:00.000Z"),
      anchorDay: 15,
      frequency: "monthly" as const,
      interval: 1,
      endType: "never" as const,
      status: "active" as const,
      createdCount: 3,
      nextDueDate: new Date("2026-11-15T00:00:00.000Z"),
      createdAt: new Date("2026-08-15T00:00:00.000Z"),
      updatedAt: new Date("2026-10-15T00:00:00.000Z"),
    },
    // 2. Condo Rental Fee (US4-1: Active Monthly Expense, Fixed Count of 12 occurrences)
    {
      userId: demoUser._id,
      walletId: mainBank._id,
      categoryId: categoryMap.get("expense:Essentials")!,
      type: "expense" as const,
      amount: 12000.0,
      title: "Condo Rental Fee",
      notes: "1-year fixed condo lease agreement (12 months)",
      startDate: new Date("2026-09-01T00:00:00.000Z"),
      anchorDay: 1,
      frequency: "monthly" as const,
      interval: 1,
      endType: "count" as const,
      endCount: 12,
      status: "active" as const,
      createdCount: 2,
      nextDueDate: new Date("2026-11-01T00:00:00.000Z"),
      createdAt: new Date("2026-09-01T00:00:00.000Z"),
      updatedAt: new Date("2026-10-01T00:00:00.000Z"),
    },
    // 3. Tech Corp Monthly Salary (US4-1: Active Recurring Income, Indefinite)
    {
      userId: demoUser._id,
      walletId: mainBank._id,
      categoryId: categoryMap.get("income:Salary")!,
      type: "income" as const,
      amount: 30000.0,
      title: "Tech Corp Monthly Salary",
      notes: "Monthly automated payroll salary direct deposit",
      startDate: new Date("2026-08-01T00:00:00.000Z"),
      anchorDay: 1,
      frequency: "monthly" as const,
      interval: 1,
      endType: "never" as const,
      status: "active" as const,
      createdCount: 3,
      nextDueDate: new Date("2026-11-01T00:00:00.000Z"),
      createdAt: new Date("2026-08-01T00:00:00.000Z"),
      updatedAt: new Date("2026-10-01T10:00:00.000Z"),
    },
    // 4. Spotify Family Plan (US4-4: Paused Rule with overdue cycle for Resume demo)
    {
      userId: demoUser._id,
      walletId: mainBank._id,
      categoryId: categoryMap.get("expense:Entertainment")!,
      type: "expense" as const,
      amount: 209.0,
      title: "Spotify Family Plan",
      notes: "Temporarily paused subscription",
      startDate: new Date("2026-07-20T00:00:00.000Z"),
      anchorDay: 20,
      frequency: "monthly" as const,
      interval: 1,
      endType: "never" as const,
      status: "paused" as const,
      createdCount: 2,
      nextDueDate: new Date("2026-09-20T00:00:00.000Z"),
      createdAt: new Date("2026-07-20T00:00:00.000Z"),
      updatedAt: new Date("2026-09-15T00:00:00.000Z"),
    },
    // 5. Cloud Storage 2TB (US4-1: Yearly Cadence, Specific End Date)
    {
      userId: demoUser._id,
      walletId: mainBank._id,
      categoryId: categoryMap.get("expense:Utilities")!,
      type: "expense" as const,
      amount: 990.0,
      title: "Cloud Storage 2TB",
      notes: "Annual cloud drive backup subscription",
      startDate: new Date("2026-10-10T00:00:00.000Z"),
      anchorDay: 10,
      frequency: "yearly" as const,
      interval: 1,
      endType: "endDate" as const,
      endDate: new Date("2029-10-10T00:00:00.000Z"),
      status: "active" as const,
      createdCount: 1,
      nextDueDate: new Date("2027-10-10T00:00:00.000Z"),
      createdAt: new Date("2026-10-10T00:00:00.000Z"),
      updatedAt: new Date("2026-10-10T00:00:00.000Z"),
    },
    // 6. Fitness Club 3-Month Trial (US4-2: Completed Schedule)
    {
      userId: demoUser._id,
      walletId: mainBank._id,
      categoryId: categoryMap.get("expense:Health")!,
      type: "expense" as const,
      amount: 1500.0,
      title: "Fitness Club 3-Month Trial",
      notes: "3-month promotional summer trial membership",
      startDate: new Date("2026-07-01T00:00:00.000Z"),
      anchorDay: 1,
      frequency: "monthly" as const,
      interval: 1,
      endType: "count" as const,
      endCount: 3,
      status: "completed" as const,
      createdCount: 3,
      nextDueDate: null,
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
      updatedAt: new Date("2026-09-01T00:00:00.000Z"),
    },
    // 7. Tech Magazine Quarterly (US6-5 / US4-5: Linked to Old Fund for Cascade Deletion)
    {
      userId: demoUser._id,
      walletId: oldFund._id,
      categoryId: categoryMap.get("expense:Shopping")!,
      type: "expense" as const,
      amount: 450.0,
      title: "Tech Magazine Quarterly",
      notes: "Quarterly print magazine subscription on Old Fund",
      startDate: new Date("2026-09-01T00:00:00.000Z"),
      anchorDay: 1,
      frequency: "monthly" as const,
      interval: 3,
      endType: "never" as const,
      status: "active" as const,
      createdCount: 1,
      nextDueDate: new Date("2026-12-01T00:00:00.000Z"),
      createdAt: new Date("2026-09-01T00:00:00.000Z"),
      updatedAt: new Date("2026-09-01T00:00:00.000Z"),
    },
    // 8. Badminton Court Weekly Session (US4-1 / US4-3: Weekly Cadence demonstration)
    {
      userId: demoUser._id,
      walletId: mainBank._id,
      categoryId: categoryMap.get("expense:Health")!,
      type: "expense" as const,
      amount: 400.0,
      title: "Weekly Badminton Court Booking",
      notes: "Tuesday evening court reservation with friends",
      startDate: new Date("2026-10-06T00:00:00.000Z"),
      anchorDay: 6,
      frequency: "weekly" as const,
      interval: 1,
      endType: "never" as const,
      status: "active" as const,
      createdCount: 4,
      nextDueDate: new Date("2026-11-03T00:00:00.000Z"),
      createdAt: new Date("2026-10-06T00:00:00.000Z"),
      updatedAt: new Date("2026-10-27T00:00:00.000Z"),
    },
  ];

  await Scheduler.collection.insertMany(schedulersData);
  console.log(`✅ Seeded ${schedulersData.length} recurring transaction rules.`);

  // -------------------------------------------------------------------------
  // 7. Create Secondary Disposable Account (EPIC 1: US1-4 Delete Account Demo)
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
    createdAt: new Date("2026-10-01T12:00:00.000Z"),
    updatedAt: new Date("2026-10-01T12:00:00.000Z"),
  });

  console.log("------------------------------------------------------------");
  console.log("🎉 Seed Completed Successfully!");
  console.log("------------------------------------------------------------");
  console.log("👤 Primary Demo Account (Alex Demo):");
  console.log(`   Email:        ${DEMO_EMAIL}`);
  console.log(`   Password:     ${PASSWORD_PLAIN}`);
  console.log(`   Personal:     5 Wallets (฿66,380 combined), 17 Categories, 28 Transactions, 8 Recurring Rules`);
  console.log(`   Shared:       Owner: "Family Living & Bills" (3 members)`);
  console.log(`                 Contributor: "Japan Vacation Fund" (Saving Goal ฿60k, 40%)`);
  console.log(`                 Pending Invites: 2 ("Weekend Camping Trip", "Office Coffee & Snacks")`);
  console.log("");
  console.log("👥 Companion Shared Accounts (for multi-user demonstration):");
  console.log(`   • Partner:    ${PARTNER_EMAIL} / ${PASSWORD_PLAIN} (Sarah Partner — Owner of Japan Vacation Fund & Camping invite)`);
  console.log(`   • Roommate:   ${ROOMMATE_EMAIL} / ${PASSWORD_PLAIN} (Bob Roommate — Contributor & Owner of Snack invite)`);
  console.log(`   • Colleague:  ${DAVE_EMAIL} / ${PASSWORD_PLAIN} (Dave Colleague — Pending invitee in Family Living & Bills)`);
  console.log("");
  console.log("👤 Disposable User (for US1-4 Account Deletion Demo):");
  console.log(`   Email:        ${DELETE_DEMO_EMAIL}`);
  console.log(`   Password:     ${PASSWORD_PLAIN}`);
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

