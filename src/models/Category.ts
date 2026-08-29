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


CategorySchema.pre('findOneAndDelete', async function () {

  const categoryId = this.getQuery()._id;
  if (!categoryId) return;


  const category = await mongoose.model('Category').findById(categoryId).lean() as { isSystem?: boolean } | null;
  if (category?.isSystem) {
    throw new Error('System categories cannot be deleted.');
  }

  const Transaction = mongoose.model('Transaction');

  await Transaction.updateMany(
    { categoryId: categoryId },
    { $set: { categoryId: null } }
  );
});

export default (mongoose.models.Category as mongoose.Model<ICategory>) || mongoose.model<ICategory>('Category', CategorySchema);