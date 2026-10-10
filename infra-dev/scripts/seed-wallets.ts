import mongoose from "mongoose";
import User from "../../src/server/db/models/User";
import Wallet from "../../src/server/db/models/Wallet";
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: ".env.local" });

async function main() {
  await mongoose.connect(process.env.MONGODB_URI ?? "mongodb://localhost:27017/finlover");

  const user = await User.findOne();
  if (!user) {
    console.log("No user found. Please register an account first.");
    process.exit(1);
  }

  await Wallet.deleteMany({ userId: user._id });

  await Wallet.create([
    {
      userId: user._id,
      name: "Cash",
      color: "#4A4757",
      balance: 1500,
      isSaving: false,
      isDefault: true,
    },
    {
      userId: user._id,
      name: "Main Bank",
      color: "#3b82f6",
      balance: 24500,
      isSaving: false,
    },
    {
      userId: user._id,
      name: "Emergency Fund",
      color: "#10b981",
      balance: 50000,
      isSaving: true,
      goalAmount: 100000,
    }
  ]);

  console.log("Successfully seeded 3 mock wallets for user:", user.email);
  process.exit(0);
}

main().catch(console.error);
