import mongoose, { Schema, Document } from 'mongoose';
import mongooseLeanGetters from 'mongoose-lean-getters';

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  walletId: mongoose.Types.ObjectId;
  categoryId?: mongoose.Types.ObjectId | null;
  type: 'income' | 'expense'; 
  amount: number;
  date: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  walletId: { type: Schema.Types.ObjectId, ref: 'Wallet', required: true },
  categoryId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
  type: { type: String, enum: ['income', 'expense'], required: true },
  amount: { type: Number, required: true, min: [0.0001, 'Amount must be strictly positive'] },
  date: { type: Date, required: true },
  notes: { type: String, maxlength: 255 },
}, { 
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

TransactionSchema.index({ userId: 1 });
TransactionSchema.index({ categoryId: 1 });

TransactionSchema.plugin(mongooseLeanGetters);

export default (mongoose.models.Transaction as mongoose.Model<ITransaction>) || mongoose.model<ITransaction>('Transaction', TransactionSchema);