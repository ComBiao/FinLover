import mongoose, { Schema, Document } from 'mongoose';
import mongooseLeanGetters from 'mongoose-lean-getters';

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

// Compound index: list transactions for a user, newest first
TransactionSchema.index({ userId: 1, date: -1 });

TransactionSchema.pre('save', async function () {

  if (!this.categoryId) return;

  const Category = mongoose.model('Category');
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
});

TransactionSchema.plugin(mongooseLeanGetters);

// TypeScript Hot-Reload Safety Cast
export default (mongoose.models.Transaction as mongoose.Model<ITransaction>) || mongoose.model<ITransaction>('Transaction', TransactionSchema);