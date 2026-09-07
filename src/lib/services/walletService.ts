import mongoose from 'mongoose';
import Wallet from '@/models/Wallet';
import Transaction from '@/models/Transaction';

/**
 * Deletes a wallet and all its associated transactions.
 * Uses a Mongoose session (transaction) to guarantee atomic operations.
 * 
 * Note: MongoDB transactions require a Replica Set. If you are running MongoDB 
 * standalone locally, you must either configure it as a Replica Set or remove 
 * the session logic here.
 */
export async function deleteWalletAndCascade(
  walletId: mongoose.Types.ObjectId | string,
  userId: mongoose.Types.ObjectId | string
) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Delete the wallet (ensure it belongs to the user for security)
    const deletedWallet = await Wallet.findOneAndDelete(
      { _id: walletId, userId },
      { session }
    );

    if (!deletedWallet) {
      throw new Error('Wallet not found or you do not have permission to delete it.');
    }

    // 2. Delete all transactions linked to this wallet
    await Transaction.deleteMany(
      { walletId, userId },
      { session }
    );

    await session.commitTransaction();
    return deletedWallet;
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

