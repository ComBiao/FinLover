import mongoose, { Schema, Document } from 'mongoose';
import mongooseLeanGetters from 'mongoose-lean-getters';

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  walletId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId | null;
  amount: mongoose.Types.Decimal128;
  type: 'Income' | 'Expense'; 
  date: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
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
    get: (value: mongoose.Types.Decimal128) => (value ? parseFloat(value.toString()) : 0)
  },
  type: { type: String, enum: ['Income', 'Expense'], required: true },
  date: { type: Date, required: true },
  notes: { type: String },
}, { 
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

TransactionSchema.index({ userId: 1, date: -1 });
TransactionSchema.index({ walletId: 1 });
TransactionSchema.index({ categoryId: 1 });

TransactionSchema.plugin(mongooseLeanGetters);

// TypeScript Hot-Reload Safety Cast
export default (mongoose.models.Transaction as mongoose.Model<ITransaction>) || mongoose.model<ITransaction>('Transaction', TransactionSchema);