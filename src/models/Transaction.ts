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
  categoryId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Category', 
    default: null,
    validate: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validator: async function(this: any, value: mongoose.Types.ObjectId | null) {
        if (!value) return true;
        const Category = mongoose.model('Category');
        const category = await Category.findById(value);
        if (!category) return false;
        
        // Mongoose 'this' might be the document (save) or query (update)
        const txType = this.type || (this.getUpdate && this.getUpdate()?.$set?.type);
        if (txType && category.type !== txType) return false;
        return true;
      },
      message: 'Referenced category does not exist or type mismatch'
    }
  },
  type: { type: String, enum: ['income', 'expense'], required: true },
  amount: { type: Number, required: true, min: [0.01, 'Amount must be at least 0.01'] },
  date: { type: Date, required: true },
  notes: { type: String, maxlength: 255 },
}, { 
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

TransactionSchema.index({ userId: 1 });
TransactionSchema.index({ walletId: 1, userId: 1 });
TransactionSchema.index({ categoryId: 1 });

TransactionSchema.plugin(mongooseLeanGetters);

export default (mongoose.models.Transaction as mongoose.Model<ITransaction>) || mongoose.model<ITransaction>('Transaction', TransactionSchema);