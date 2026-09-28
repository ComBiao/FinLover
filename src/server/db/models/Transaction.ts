import mongoose, { Schema, Document } from 'mongoose';
import mongooseLeanGetters from 'mongoose-lean-getters';
import { assertTransactionWrite } from '../transaction-write-guard';


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
// Transaction Schema
// ---------------------------------------------------------------------------
const TransactionSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  walletId: { type: Schema.Types.ObjectId, ref: 'Wallet', required: true },
  categoryId: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    default: null,
  },
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: true,
    // The transaction API accepts title-case values; persist the model's
    // canonical lowercase representation used by Category and transaction services.
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

// No balance hooks: reject unsupported writes instead of silently drifting balances.
TransactionSchema.pre('save', function () { assertTransactionWrite(this, this.$session()); });
TransactionSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne', 'findOneAndReplace', 'deleteOne', 'deleteMany', 'findOneAndDelete'], function () {
  assertTransactionWrite(this, this.getOptions().session);
});
TransactionSchema.pre('deleteOne', { document: true, query: false }, function () {
  assertTransactionWrite(this, this.$session());
});
// Repositories deliberately do not expose bulk writes, which bypass document checks.
TransactionSchema.pre('insertMany', function () { assertTransactionWrite(this); });
TransactionSchema.pre('bulkWrite', function () { assertTransactionWrite(this); });
TransactionSchema.plugin(mongooseLeanGetters);

export default (mongoose.models.Transaction as mongoose.Model<ITransaction>) || mongoose.model<ITransaction>('Transaction', TransactionSchema);
