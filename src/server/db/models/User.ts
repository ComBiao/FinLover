import mongoose, { Schema, Document } from 'mongoose';
import WalletMember from './WalletMember';
import { AppError } from '@/server/shared/kernel/AppError';

export interface IUser extends Document {
  email: string;
  name?: string;
  passwordHash: string;
  dataPrivacyConsent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  membershipVersion: { type: Number, default: 0 },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true 
  },
  name: { type: String, trim: true, maxlength: 100 },
  passwordHash: { 
    type: String, 
    required: true 
  },
  dataPrivacyConsent: { 
    type: Boolean, 
    required: true,
    validate: {
      validator: function(v: boolean) {
        return v === true;
      },
      message: 'Data privacy consent must be granted to create a user record.'
    }
  },
}, {
  timestamps: true
});

/**
 * Pre-delete hook that cascades deletion to all user-related data (wallets, categories, transactions).
 * Database-Level Cascade Delete for Strict Data Privacy.
 */
UserSchema.pre('findOneAndDelete', async function() {
  const user = await this.model.findOne(this.getQuery()).session(this.getOptions().session ?? null);
  if (!user) return;
  const userId = user._id;
  
  const Wallet = mongoose.model('Wallet');
  const Category = mongoose.model('Category');
  const Transaction = mongoose.model('Transaction');
  
  // Account deletion must not orphan invitations or destroy a shared wallet
  // after an invite has been accepted. Wallet writes serialize with accept.
  const session = this.getOptions().session ?? undefined;
  const owned = await Wallet.find({ userId }).select('_id isShared').session(session ?? null);
  for (const wallet of owned) {
    if (wallet.isShared) {
      await Wallet.updateOne({ _id: wallet._id }, { $inc: { membershipVersion: 1 } }, { session });
      if (await WalletMember.exists({ walletId: wallet._id, status: 'accepted' }).session(session ?? null)) {
        throw new AppError('CONFLICT', 'Transfer ownership before deleting your account');
      }
    }
  }
  const ownedIds = owned.map(wallet => wallet._id);
  // Revoking a Contributor account must also conflict with in-flight balance
  // writes on surviving wallets, not just with mutations of the member row.
  const joined = await WalletMember.find({ userId }).select('walletId').sort({ walletId: 1 }).session(session ?? null).lean();
  const ownedSet = new Set(ownedIds.map(id => String(id)));
  for (const member of joined) {
    if (!ownedSet.has(String(member.walletId))) {
      await Wallet.updateOne({ _id: member.walletId, isShared: true }, { $inc: { membershipVersion: 1 } }, { session });
    }
  }
  // Recurring schedules created by user or targeting owned wallets are cleaned below.
  await WalletMember.deleteMany({ $or: [{ userId }, { walletId: { $in: ownedIds } }] }, { session });
  // Keep transactions in surviving shared wallets, including deleted authors.
  const shared = await Wallet.find({ isShared: true, userId: { $ne: userId } }).select('_id').session(session ?? null);
  const survivingSharedIds = shared.map(wallet => wallet._id);
  // A session must execute writes sequentially.
  // Schedulers the user created, plus any (e.g. a member's) that post to a wallet removed with the account.
  await this.model.db.collection('schedulers').deleteMany({ $or: [{ userId }, { walletId: { $in: ownedIds } }] }, { session });
  await Wallet.deleteMany({ userId }, { session: this.getOptions().session ?? undefined });
  await Category.deleteMany({ userId }, { session: this.getOptions().session ?? undefined });
  // Internal cascade deletes the owning wallet(s) too, so no balance survives.
  await Transaction.collection.deleteMany({ $or: [{ walletId: { $in: ownedIds } }, { userId, walletId: { $nin: survivingSharedIds } }] }, { session: this.getOptions().session ?? undefined });
  
  // Omitting next() to maintain strict TypeScript hot-reload safety
});

// TypeScript Hot-Reload Safety Cast
export default (mongoose.models.User as mongoose.Model<IUser>) || mongoose.model<IUser>('User', UserSchema);