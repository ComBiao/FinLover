import mongoose, { Schema, Document } from 'mongoose';
import mongooseLeanGetters from 'mongoose-lean-getters';
import Category from './Category';

// Side-effect import: ensure the Wallet schema is registered before any
// hook calls mongoose.model('Wallet'). Prevents MissingSchemaError when
// Transaction is loaded before Wallet in production route ordering.
import './Wallet';

// ---------------------------------------------------------------------------
// Recurrence sub-document
// ---------------------------------------------------------------------------
export interface IRecurrence {
  isRecurring: boolean;
  frequency?: 'weekly' | 'monthly';
  startDate?: Date;
  parentId?: mongoose.Types.ObjectId | null;
}

const RecurrenceSchema = new Schema<IRecurrence>(
  {
    isRecurring: { type: Boolean, default: false },
    frequency: {
      type: String,
      enum: ['weekly', 'monthly'],
      required: [
        function (this: IRecurrence) { return this.isRecurring; },
        'recurrence.frequency is required when isRecurring is true',
      ],
    },
    startDate: {
      type: Date,
      required: [
        function (this: IRecurrence) { return this.isRecurring; },
        'recurrence.startDate is required when isRecurring is true',
      ],
    },
    parentId: { type: Schema.Types.ObjectId, ref: 'Transaction', default: null },
  },
  { _id: false }
);

// ---------------------------------------------------------------------------
// Transaction document interface
// ---------------------------------------------------------------------------
export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  walletId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId | null;
  type: 'income' | 'expense';
  amount: number;
  date: Date;
  notes?: string;
  note?: string;
  recurrence: IRecurrence;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the signed balance delta a transaction contributes to its wallet. */
function toDelta(type: string, amount: number): number {
  return type === 'income' ? amount : -amount;
}

// ---------------------------------------------------------------------------
// Transaction Schema
// ---------------------------------------------------------------------------
const TransactionSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  walletId: { type: Schema.Types.ObjectId, ref: 'Wallet', required: true },
  categoryId: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    default: null,
    validate: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validator: async function(this: any, value: mongoose.Types.ObjectId | null) {
        if (!value) return true;
        const category = await Category.findById(value);
        if (!category) return false;

        // Mongoose 'this' might be the document (save) or query (update)
        let txType = this.type;

        if (this.getUpdate) {
          const update = this.getUpdate();
          txType = update.$set?.type || update.type;

          if (!txType) {
            const existing = await this.model.findOne(this.getQuery());
            if (existing) txType = existing.type;
          }
        }

        if (typeof txType === 'string') txType = txType.toLowerCase();
        if (txType && category.type !== txType) return false;
        return true;
      },
      message: 'Referenced category does not exist or type mismatch'
    }
  },
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: true,
    // The transaction API accepts title-case values; persist the model's
    // canonical lowercase representation used by Category and balance hooks.
    set: (value: unknown) => typeof value === 'string' ? value.toLowerCase() : value,
  },
  amount: { type: Number, required: true, min: [0.01, 'Amount must be at least 0.01'] },
  date: { type: Date, required: true },
  notes: { type: String, maxlength: 255, alias: 'note' },
  recurrence: { type: RecurrenceSchema, default: () => ({ isRecurring: false }) },
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true },
});

// Compound indexes:
// - list/sum transactions for a user, newest first
// - list/sum transactions for a specific wallet, newest first (wallet history, balance calc)
TransactionSchema.index({ userId: 1, date: -1 });
TransactionSchema.index({ walletId: 1, date: -1 });
TransactionSchema.index({ walletId: 1, userId: 1 });
TransactionSchema.index({ categoryId: 1 });
TransactionSchema.index({ 'recurrence.parentId': 1 });

TransactionSchema.pre('save', async function (this: ITransaction) {
  // Only re-validate category/wallet ownership when relevant fields actually changed,
  // to avoid unnecessary DB round-trips on every save (e.g. editing just `note`).
  const needsCategoryCheck =
    this.isModified('userId') ||
    this.isModified('categoryId') ||
    this.isModified('type');
  const needsWalletCheck =
    this.isModified('userId') || this.isModified('walletId');

  if (needsWalletCheck) {
    // Use this.$model to avoid MissingSchemaError if Wallet hasn't been
    // imported/compiled elsewhere yet, and to prevent cross-file registration
    // order issues.
    const Wallet = this.$model('Wallet');
    const wallet = await Wallet.findOne({ _id: this.walletId, userId: this.userId }).lean();

    if (!wallet) {
      throw new Error(`Wallet with id '${this.walletId}' does not exist or does not belong to this user.`);
    }
  }

  if (needsCategoryCheck) {
    if (!this.categoryId) return;

    const category = await Category.findOne({ _id: this.categoryId, userId: this.userId }).lean() as { type?: string } | null;

    if (!category) {
      throw new Error(`Category with id '${this.categoryId}' does not exist.`);
    }

    if (category.type !== this.type) {
      throw new Error(
        `Transaction type '${this.type}' does not match category type '${category.type}'. ` +
        'A transaction must belong to a category of the same type.'
      );
    }
  }
});

TransactionSchema.plugin(mongooseLeanGetters);

// ---------------------------------------------------------------------------
// Wallet balance sync — post hooks
//
// KNOWN LIMITATIONS:
//   1. Atomicity: Wallet $inc updates are NOT wrapped in a MongoDB session
//      with the transaction write. Each $inc is individually atomic, but a
//      failure between two writes (e.g. cross-wallet transfer) can leave
//      balances drifted. Wrapping in withTransaction() requires all
//      environments (including test mongodb-memory-server) to run as a
//      replica set. See walletService.ts for the session-based pattern.
//   2. insertMany: Mongoose save middleware does not fire for insertMany().
//      If bulk-creating transactions, callers must manually adjust wallet
//      balances.
//   3. Isolation: The post('findOneAndUpdate') re-read (findById after
//      update) has no session — a concurrent delete/update in the gap can
//      cause a skipped or mis-applied reversal.
// ---------------------------------------------------------------------------

/**
 * Stash state before save so we can tell if it's a new document
 * and reverse the old balance delta if it's an update.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
TransactionSchema.pre('save', async function (this: any) {
  this._wasNew = this.isNew;
  if (!this.isNew) {
    this._oldDoc = await mongoose.model('Transaction').findById(this._id).lean();
  }
});

/**
 * After a transaction is saved, update the wallet balance.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
TransactionSchema.post('save', async function (this: any, doc: ITransaction) {
  const Wallet = mongoose.model('Wallet');

  if (this._wasNew) {
    await Wallet.findByIdAndUpdate(doc.walletId, {
      $inc: { balance: toDelta(doc.type, doc.amount) },
    });
  } else {
    const oldDoc = this._oldDoc as ITransaction | null;
    if (oldDoc) {
      const reverseDelta = toDelta(oldDoc.type, oldDoc.amount) * -1;
      const newDelta = toDelta(doc.type, doc.amount);
      const sameWallet = oldDoc.walletId.toString() === doc.walletId.toString();

      // Skip the DB write when type, amount, and wallet are all unchanged.
      if (sameWallet && reverseDelta + newDelta === 0) return;

      if (!sameWallet) {
        await Promise.all([
          Wallet.findByIdAndUpdate(oldDoc.walletId, { $inc: { balance: reverseDelta } }),
          Wallet.findByIdAndUpdate(doc.walletId, { $inc: { balance: newDelta } })
        ]);
      } else {
        await Wallet.findByIdAndUpdate(doc.walletId, {
          $inc: { balance: reverseDelta + newDelta },
        });
      }
    }
  }
});

/**
 * Stash the current transaction document BEFORE an update so the post hook
 * can reverse its delta.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
TransactionSchema.pre(['findOneAndUpdate', 'updateOne'], async function (this: any) {
  this._oldDoc = await mongoose.model('Transaction').findOne(this.getQuery()).lean();
});

/**
 * After updating a transaction, reverse the old balance delta and apply the new one.
 * Re-reads the committed document to guard against callers omitting { new: true },
 * which would otherwise pass the pre-update snapshot as updatedDoc.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
TransactionSchema.post(['findOneAndUpdate', 'updateOne'], async function (this: any) {
  const Wallet = mongoose.model('Wallet');
  const oldDoc = this._oldDoc as ITransaction | null;
  if (!oldDoc) return;

  // Re-read after update to always get the committed state.
  const newDoc = await mongoose.model('Transaction').findById(oldDoc._id).lean() as ITransaction | null;
  if (!newDoc) return;

  const reverseDelta = toDelta(oldDoc.type, oldDoc.amount) * -1;
  const newDelta = toDelta(newDoc.type, newDoc.amount);

  if (oldDoc.walletId.toString() !== newDoc.walletId.toString()) {
    // Wallet changed: reverse from old wallet, apply to new wallet
    await Promise.all([
      Wallet.findByIdAndUpdate(oldDoc.walletId, { $inc: { balance: reverseDelta } }),
      Wallet.findByIdAndUpdate(newDoc.walletId, { $inc: { balance: newDelta } })
    ]);
  } else {
    // Same wallet: combine deltas
    await Wallet.findByIdAndUpdate(newDoc.walletId, {
      $inc: { balance: reverseDelta + newDelta },
    });
  }
});

/**
 * After deleting a transaction via findOneAndDelete, reverse its balance delta from the wallet.
 */
TransactionSchema.post('findOneAndDelete', async function (deletedDoc: ITransaction | null) {
  if (!deletedDoc) return;
  const Wallet = mongoose.model('Wallet');
  await Wallet.findByIdAndUpdate(deletedDoc.walletId, {
    $inc: { balance: toDelta(deletedDoc.type, deletedDoc.amount) * -1 },
  });
});

/**
 * Pre-hook for deleteOne to stash the document before it is deleted.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
TransactionSchema.pre('deleteOne', { document: false, query: true }, async function (this: any) {
  this._deletedDoc = await mongoose.model('Transaction').findOne(this.getQuery()).lean();
});

/**
 * Post-hook for deleteOne to reverse the stashed document's balance delta.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
TransactionSchema.post('deleteOne', { document: false, query: true }, async function (this: any) {
  const deletedDoc = this._deletedDoc as ITransaction | null;
  if (!deletedDoc) return;
  const Wallet = mongoose.model('Wallet');
  await Wallet.findByIdAndUpdate(deletedDoc.walletId, {
    $inc: { balance: toDelta(deletedDoc.type, deletedDoc.amount) * -1 },
  });
});

export default (mongoose.models.Transaction as mongoose.Model<ITransaction>) || mongoose.model<ITransaction>('Transaction', TransactionSchema);
