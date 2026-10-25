import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

import User from "../../src/server/db/models/User";
import Wallet from "../../src/server/db/models/Wallet";
import WalletMember from "../../src/server/db/models/WalletMember";
import Category from "../../src/server/db/models/Category";
import { DEFAULT_CATEGORIES } from "../../src/server/modules/auth/default-categories";

import fs from "node:fs";

dotenv.config();
dotenv.config({ path: ".env.local" });

export function getMongoUri() {
  const uriFile = `.e2e-mongo-uri-${process.env.E2E_PORT ?? "3000"}`;
  if (fs.existsSync(uriFile)) {
    const fileUri = fs.readFileSync(uriFile, "utf-8").trim();
    if (fileUri) return fileUri;
  }
  return process.env.MONGODB_URI ?? "mongodb://localhost:27017/finlover";
}

export async function seedRecurringE2EData() {
  const uri = getMongoUri();
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(uri);

  const USER_EMAIL = "user@example.com";
  const SECONDARY_EMAIL = "tul@example.com";
  const PASSWORD_PLAIN = "Passw0rd!";
  const passwordHash = await bcrypt.hash(PASSWORD_PLAIN, 10);

  // Clean up any existing records
  const existingUsers = await User.find({ email: { $in: [USER_EMAIL, SECONDARY_EMAIL] } });
  for (const u of existingUsers) {
    const rawDb = mongoose.connection.db;
    if (rawDb) {
      await rawDb.collection("transactions").deleteMany({ userId: u._id });
      await rawDb.collection("schedulers").deleteMany({ userId: u._id });
    }
    await WalletMember.deleteMany({ $or: [{ userId: u._id }, { invitedBy: u._id }] });
    await Wallet.deleteMany({ userId: u._id });
    await Category.deleteMany({ userId: u._id });
    await User.deleteOne({ _id: u._id });
  }

  // Create primary test user
  const primaryUser = await User.create({
    email: USER_EMAIL,
    name: "E2E User",
    passwordHash,
    dataPrivacyConsent: true,
  });

  // Create secondary test user
  const secondaryUser = await User.create({
    email: SECONDARY_EMAIL,
    name: "Tul Secondary",
    passwordHash,
    dataPrivacyConsent: true,
  });

  // Seed default categories for both users
  for (const u of [primaryUser, secondaryUser]) {
    const defaults = DEFAULT_CATEGORIES.map((cat) => ({
      userId: u._id,
      name: cat.name,
      type: cat.type,
      color: cat.color,
      icon: cat.icon,
      isSystem: true,
    }));
    await Category.insertMany(defaults);
  }

  // Add custom categories for primary user ("Gym", "Cloud")
  await Category.insertMany([
    {
      userId: primaryUser._id,
      name: "Gym",
      type: "expense",
      color: "#EC4899",
      icon: "HeartPulse",
      isSystem: false,
    },
    {
      userId: primaryUser._id,
      name: "Cloud",
      type: "expense",
      color: "#3B82F6",
      icon: "PieChart",
      isSystem: false,
    },
  ]);

  // Create Personal Wallet (10,000) and Main Bank (500)
  const personalWallet = await Wallet.create({
    userId: primaryUser._id,
    name: "Personal Wallet",
    balance: 10000,
    isDefault: true,
    isShared: false,
  });

  const mainBankWallet = await Wallet.create({
    userId: primaryUser._id,
    name: "Main Bank",
    balance: 500,
    isDefault: false,
    isShared: false,
  });

  // Create Shared Wallet for testing RT-E2E-11 (Shared Wallet Exclusion)
  const sharedWallet = await Wallet.create({
    userId: primaryUser._id,
    name: "Shared Household",
    balance: 0,
    isDefault: false,
    isShared: true,
  });

  return {
    primaryUser: { id: primaryUser._id.toString(), email: USER_EMAIL },
    secondaryUser: { id: secondaryUser._id.toString(), email: SECONDARY_EMAIL },
    personalWallet: { id: personalWallet._id.toString(), name: "Personal Wallet", balance: 10000 },
    mainBankWallet: { id: mainBankWallet._id.toString(), name: "Main Bank", balance: 500 },
    sharedWallet: { id: sharedWallet._id.toString(), name: "Shared Household", isShared: true },
  };
}

if (process.argv[1] && process.argv[1].endsWith("seed-recurring-e2e.ts")) {
  seedRecurringE2EData()
    .then((result) => {
      console.log("✅ Seeded recurring E2E test data:", result);
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Seed failed:", err);
      process.exit(1);
    });
}

