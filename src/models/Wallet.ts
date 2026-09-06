import mongoose, { Schema, Document } from 'mongoose';
import mongooseLeanGetters from 'mongoose-lean-getters';

export interface IWallet extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  balance: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WalletSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  balance: { type: Number, required: true, default: 0 },
  isDefault: { type: Boolean, default: false }
}, { 
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

WalletSchema.index({ userId: 1, name: 1 }, { unique: true });



WalletSchema.plugin(mongooseLeanGetters);

// TypeScript Hot-Reload Safety Cast
export default (mongoose.models.Wallet as mongoose.Model<IWallet>) || mongoose.model<IWallet>('Wallet', WalletSchema);