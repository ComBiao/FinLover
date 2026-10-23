import mongoose, { Schema } from 'mongoose';

export interface IWalletMember {
  walletId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  status: 'pending' | 'accepted';
  invitedBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const WalletMemberSchema = new Schema<IWalletMember>({
  walletId: { type: Schema.Types.ObjectId, ref: 'Wallet', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted'], required: true, default: 'pending' },
  invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

WalletMemberSchema.index({ walletId: 1, userId: 1 }, { unique: true });
WalletMemberSchema.index({ userId: 1, status: 1, createdAt: -1 });

export default (mongoose.models.WalletMember as mongoose.Model<IWalletMember>) || mongoose.model<IWalletMember>('WalletMember', WalletMemberSchema);
