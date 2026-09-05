import mongoose, { Schema, Document } from 'mongoose';

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
    type: mongoose.Types.Decimal128,
    required: true,
    validate: {
      validator: function(v: mongoose.Types.Decimal128) {
        const str = v.toString();
        if (str.startsWith('-')) return false;
        
        const [intPart, decPart = ''] = str.split('.');
        if (intPart.replace(/^0+/, '').length > 0) return true; // int >= 1
        
        // If integer is 0, ensure fraction doesn't start with '00' (< 0.01) and isn't all zeros (exactly 0)
        if (decPart.startsWith('00') || decPart.replace(/0/g, '').length === 0) return false;
        return true;
      },
      message: 'Amount must be greater than zero.'
    }
   },
  type: { type: String, enum: ['Income', 'Expense'], required: true },
  date: { type: Date, required: true },
  note: { type: String, maxlength: 255 },
}, {
  timestamps: true,
});

TransactionSchema.index({ userId: 1, date: -1 });
TransactionSchema.index({ walletId: 1 });
TransactionSchema.index({ categoryId: 1 });

TransactionSchema.pre('save', async function () {

  if (!this.categoryId) return;

  const Category = mongoose.model('Category');
  const category = await Category.findById(this.categoryId).session(this.$session()).lean() as { type?: string } | null;

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

// TypeScript Hot-Reload Safety Cast
export default (mongoose.models.Transaction as mongoose.Model<ITransaction>) || mongoose.model<ITransaction>('Transaction', TransactionSchema);