import mongoose, { Schema, Document } from 'mongoose';
import mongooseLeanGetters from 'mongoose-lean-getters';

export interface IWallet extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  balance: mongoose.Types.Decimal128;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WalletSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  balance: { 
    type: Schema.Types.Decimal128, 
    required: true,
    default: 0.00,
    get: (value: mongoose.Types.Decimal128) => (value ? parseFloat(value.toString()) : 0)
  },
  isDefault: { type: Boolean, default: false, required: true }
}, { 
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

WalletSchema.index({ userId: 1, name: 1 }, { unique: true });

/**
 * Pre-delete hook that automatically deletes all transactions linked to this wallet.
 * Database-Level Cascade Delete.
 */
WalletSchema.pre('findOneAndDelete', async function() {
  const walletId = this.getQuery()._id;
  const Transaction = mongoose.model('Transaction');
  
  // Automatically delete all transactions linked to this wallet to prevent orphaned data
  await Transaction.deleteMany({ walletId: walletId });
  
  // No next() needed here either!
});

WalletSchema.plugin(mongooseLeanGetters);

// TypeScript Hot-Reload Safety Cast
export default (mongoose.models.Wallet as mongoose.Model<IWallet>) || mongoose.model<IWallet>('Wallet', WalletSchema);