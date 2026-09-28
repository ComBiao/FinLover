import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  dataPrivacyConsent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true 
  },
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
  
  // A session must execute writes sequentially.
  await Wallet.deleteMany({ userId }, { session: this.getOptions().session ?? undefined });
  await Category.deleteMany({ userId }, { session: this.getOptions().session ?? undefined });
  // Internal cascade deletes the owning wallet(s) too, so no balance survives.
  await Transaction.collection.deleteMany({ userId }, { session: this.getOptions().session ?? undefined });
  
  // Omitting next() to maintain strict TypeScript hot-reload safety
});

// TypeScript Hot-Reload Safety Cast
export default (mongoose.models.User as mongoose.Model<IUser>) || mongoose.model<IUser>('User', UserSchema);