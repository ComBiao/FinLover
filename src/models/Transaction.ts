import mongoose, { Schema, Document } from 'mongoose';
import mongooseLeanGetters from 'mongoose-lean-getters';
import Category from './Category';

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  walletId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId | null;
  amount: mongoose.Types.Decimal128;
  type: 'Income' | 'Expense';
  date: Date;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  walletId: { type: Schema.Types.ObjectId, ref: 'Wallet', required: true },
  categoryId: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: false,
    default: null
  },
  amount: {
    type: Schema.Types.Decimal128,
    required: true,
    get: (value: mongoose.Types.Decimal128) => (value ? parseFloat(value.toString()) : 0),
  },
  type: { type: String, enum: ['Income', 'Expense'], required: true },
  date: { type: Date, required: true },
  note: { type: String, maxlength: 255 },
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

TransactionSchema.pre('save', async function (this: ITransaction) {
  // Only re-validate category/wallet ownership when relevant fields actually changed,
  // to avoid unnecessary DB round-trips on every save (e.g. editing just `note`).
  const needsCategoryCheck = this.isModified('categoryId') || this.isModified('type');
  const needsWalletCheck = this.isModified('walletId');

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

// TypeScript Hot-Reload Safety Cast
export default (mongoose.models.Transaction as mongoose.Model<ITransaction>) || mongoose.model<ITransaction>('Transaction', TransactionSchema);