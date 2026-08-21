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

// Database-Level Cascade Delete for Strict Data Privacy
UserSchema.pre('findOneAndDelete', async function() {
  const userId = this.getQuery()._id;
  
  const Wallet = mongoose.model('Wallet');
  const Category = mongoose.model('Category');
  const Transaction = mongoose.model('Transaction');
  
  // Execute all deletions concurrently for optimal performance
  await Promise.all([
    Wallet.deleteMany({ userId: userId }),
    Category.deleteMany({ userId: userId }),
    Transaction.deleteMany({ userId: userId })
  ]);
  
  // Omitting next() to maintain strict TypeScript hot-reload safety
});

// TypeScript Hot-Reload Safety Cast
export default (mongoose.models.User as mongoose.Model<IUser>) || mongoose.model<IUser>('User', UserSchema);