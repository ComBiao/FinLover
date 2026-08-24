import "dotenv/config";
import { connectDB } from "../src/lib/db";
import mongoose from "mongoose";

import Category from "../src/models/Category";
import Transaction from "../src/models/Transaction";
import User from "../src/models/User";
import Wallet from "../src/models/Wallet";

async function initDB() {
  try {
    console.log("Connecting to database...");
    await connectDB();
    console.log("Connected successfully!");

    const models = [
      { name: "User", model: User },
      { name: "Category", model: Category },
      { name: "Wallet", model: Wallet },
      { name: "Transaction", model: Transaction },
    ];

    for (const { name, model } of models) {
      console.log(`Initializing schema for ${name}...`);
      
      // Create collection explicitly if it doesn't exist
      await model.createCollection();
      
      // Ensure indexes are built
      await model.syncIndexes();
      
      console.log(`✅ Schema for ${name} initialized successfully.`);
    }

    console.log("🎉 All schemas initialized!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error initializing schemas:", error);
    process.exit(1);
  }
}

initDB();
