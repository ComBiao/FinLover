import mongoose, { Schema, Document } from 'mongoose';
import mongooseLeanGetters from 'mongoose-lean-getters';

export interface IWallet extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  balance: number;
  isDefault: boolean;
  color?: string;
  isSaving: boolean;
  goalAmount?: number;
  hideBalance: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WalletSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true, maxlength: 50 },
  balance: { type: Number, required: true, default: 0 },
  isDefault: { type: Boolean, default: false },
  color: { type: String, trim: true },
  isSaving: { type: Boolean, default: false },
  goalAmount: { type: Number, min: 0 },
  hideBalance: { type: Boolean, default: false }
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
  const wallet = await this.model.findOne(this.getQuery()).session(this.getOptions().session ?? null);
  if (!wallet) return;
  const walletId = wallet._id;
  const Transaction = mongoose.model('Transaction');
  
  // Automatically delete all transactions linked to this wallet to prevent orphaned data
  // Internal cascade deletes the owning wallet(s) too, so no balance survives.
  await Transaction.collection.deleteMany({ walletId: walletId }, { session: this.getOptions().session ?? undefined });
  
  // No next() needed here either!
});

WalletSchema.plugin(mongooseLeanGetters);

// TypeScript Hot-Reload Safety Cast
export default (mongoose.models.Wallet as mongoose.Model<IWallet>) || mongoose.model<IWallet>('Wallet', WalletSchema);
