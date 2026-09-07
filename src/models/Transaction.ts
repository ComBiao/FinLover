import mongoose, { Schema, Document } from 'mongoose';
import mongooseLeanGetters from 'mongoose-lean-getters';

// ---------------------------------------------------------------------------
// Recurrence sub-document
// ---------------------------------------------------------------------------
export interface IRecurrence {
  isRecurring: boolean;
  frequency?: 'Weekly' | 'Monthly';
  startDate?: Date;
  parentId?: mongoose.Types.ObjectId | null;
}

const RecurrenceSchema = new Schema<IRecurrence>(
  {
    isRecurring: { type: Boolean, default: false },
    frequency: {
      type: String,
      enum: ['Weekly', 'Monthly'],
      required: false,
    },
    startDate: { type: Date, required: false },
    parentId: { type: Schema.Types.ObjectId, ref: 'Transaction', default: null },
  },
  { _id: false }
);

// Cross-field validation: frequency and startDate are required when isRecurring is true
RecurrenceSchema.pre('validate', function (this: IRecurrence) {
  if (this.isRecurring) {
    if (!this.frequency) {
      throw new mongoose.Error.ValidationError(undefined);
    }
    if (!this.startDate) {
      throw new mongoose.Error.ValidationError(undefined);
    }
  }
});

// ---------------------------------------------------------------------------
// Transaction document interface
// ---------------------------------------------------------------------------
export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  walletId: mongoose.Types.ObjectId;
  categoryId?: mongoose.Types.ObjectId | null;
  type: 'income' | 'expense'; 
  amount: number;
  date: Date;
  notes?: string;
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
        const Category = mongoose.model('Category');
        const category = await Category.findById(value);
        if (!category) return false;
        
        // Mongoose 'this' might be the document (save) or query (update)
        const txType = this.type || (this.getUpdate && this.getUpdate()?.$set?.type);
        if (txType && category.type !== txType) return false;
        return true;
      },
      message: 'Referenced category does not exist or type mismatch'
    }
  },
  type: { type: String, enum: ['income', 'expense'], required: true },
  amount: { type: Number, required: true, min: [0.01, 'Amount must be at least 0.01'] },
  date: { type: Date, required: true },
  notes: { type: String, maxlength: 255 },
  recurrence: { type: RecurrenceSchema, default: () => ({ isRecurring: false }) },
}, { 
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

TransactionSchema.index({ userId: 1 });
TransactionSchema.index({ walletId: 1, userId: 1 });
TransactionSchema.index({ categoryId: 1 });
TransactionSchema.index({ 'recurrence.parentId': 1 });

TransactionSchema.plugin(mongooseLeanGetters);

// ---------------------------------------------------------------------------
// Wallet balance sync — post hooks
// Use mongoose.model('Wallet') string lookup to avoid circular imports.
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

      if (oldDoc.walletId.toString() !== doc.walletId.toString()) {
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
TransactionSchema.pre('findOneAndUpdate', async function (this: any) {
  this._oldDoc = await mongoose.model('Transaction').findOne(this.getQuery()).lean();
});

/**
 * After updating a transaction, reverse the old balance delta and apply the new one.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
TransactionSchema.post('findOneAndUpdate', async function (this: any, updatedDoc: ITransaction | null) {
  if (!updatedDoc) return;
  const Wallet = mongoose.model('Wallet');
  const oldDoc = this._oldDoc as ITransaction | null;
  if (oldDoc) {
    const reverseDelta = toDelta(oldDoc.type, oldDoc.amount) * -1;
    const newDelta = toDelta(updatedDoc.type, updatedDoc.amount);

    if (oldDoc.walletId.toString() !== updatedDoc.walletId.toString()) {
      // Wallet changed: reverse from old wallet, apply to new wallet
      await Promise.all([
        Wallet.findByIdAndUpdate(oldDoc.walletId, { $inc: { balance: reverseDelta } }),
        Wallet.findByIdAndUpdate(updatedDoc.walletId, { $inc: { balance: newDelta } })
      ]);
    } else {
      // Same wallet: combine deltas
      await Wallet.findByIdAndUpdate(updatedDoc.walletId, {
        $inc: { balance: reverseDelta + newDelta },
      });
    }
  }
});

/**
 * After deleting a transaction, reverse its balance delta from the wallet.
 */
TransactionSchema.post('findOneAndDelete', async function (deletedDoc: ITransaction | null) {
  if (!deletedDoc) return;
  const Wallet = mongoose.model('Wallet');
  await Wallet.findByIdAndUpdate(deletedDoc.walletId, {
    $inc: { balance: toDelta(deletedDoc.type, deletedDoc.amount) * -1 },
  });
});

export default (mongoose.models.Transaction as mongoose.Model<ITransaction>) || mongoose.model<ITransaction>('Transaction', TransactionSchema);