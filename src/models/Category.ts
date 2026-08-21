import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  type: 'Income' | 'Expense'; 
  icon: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['Income', 'Expense'], required: true },
  icon: { type: String, required: true },
  isSystem: { type: Boolean, default: false, required: true }
}, { 
  timestamps: true 
});

CategorySchema.index({ userId: 1, name: 1 }, { unique: true });

// Database-Level Cascade Update
CategorySchema.pre('findOneAndDelete', async function(next) {
  const categoryId = this.getQuery()._id;
  const Transaction = mongoose.model('Transaction');
  
  // Automatically reassign all linked transactions to "No Category" (null)
  await Transaction.updateMany(
    { categoryId: categoryId },
    { $set: { categoryId: null } }
  );

});

export default (mongoose.models.Category as mongoose.Model<ICategory>) || mongoose.model<ICategory>('Category', CategorySchema);