import mongoose from 'mongoose';
import Category from '@/models/Category';
import Transaction from '@/models/Transaction';

/**
 * Deletes a category and nullifies the categoryId on all associated transactions.
 * Uses a Mongoose session (transaction) to guarantee atomic operations.
 * 
 * Note: MongoDB transactions require a Replica Set. If you are running MongoDB 
 * standalone locally, you must either configure it as a Replica Set or remove 
 * the session logic here.
 */
export async function deleteCategoryAndCascade(
  categoryId: mongoose.Types.ObjectId | string,
  userId: mongoose.Types.ObjectId | string
) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Delete the category (ensure it belongs to the user for security)
    const deletedCategory = await Category.findOneAndDelete(
      { _id: categoryId, userId },
      { session }
    );

    if (!deletedCategory) {
      throw new Error('Category not found or you do not have permission to delete it.');
    }

    // 2. Nullify the category on affected transactions
    await Transaction.updateMany(
      { categoryId, userId },
      { $set: { categoryId: null } },
      { session }
    );

    await session.commitTransaction();
    return deletedCategory;
  } catch (error) {
    // Guard: only abort if the transaction is still active
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    await session.endSession();
  }
}
