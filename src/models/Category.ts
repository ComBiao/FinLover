import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  type: 'income' | 'expense'; 
  color?: string;
  icon?: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, maxlength: 50 },
  type: { type: String, enum: ['income', 'expense'], required: true },
  color: { type: String },
  icon: { type: String },
  isSystem: { type: Boolean, default: false }
}, { 
  timestamps: true 
});

CategorySchema.index({ userId: 1, name: 1 }, { unique: true });

/**
 * Pre-save guard that prevents modification of existing system categories.
 * New system category creation is still allowed (isNew === true).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
CategorySchema.pre('save', async function (this: any) {
  if (!this.isNew) {
    const oldDoc = await this.model('Category').findById(this._id).lean() as { isSystem?: boolean } | null;
    if (oldDoc && oldDoc.isSystem) {
      throw new Error('System categories cannot be modified.');
    }
  }
});

/**
 * Pre-update hook that prevents modification of system categories.
 */
CategorySchema.pre('findOneAndUpdate', async function() {
  const docToUpdate = await this.model.findOne(this.getQuery());
  if (docToUpdate && docToUpdate.isSystem) {
    throw new Error('System categories cannot be modified.');
  }
});

/**
 * Pre-update hook (updateOne) that prevents modification of system categories.
 */
CategorySchema.pre('updateOne', async function() {
  const docToUpdate = await this.model.findOne(this.getQuery());
  if (docToUpdate && docToUpdate.isSystem) {
    throw new Error('System categories cannot be modified.');
  }
});

/**
 * Pre-delete hook that prevents deletion of system categories.
 */
CategorySchema.pre('findOneAndDelete', async function() {
  const docToUpdate = await this.model.findOne(this.getQuery());
  if (docToUpdate && docToUpdate.isSystem) {
    throw new Error('System categories cannot be deleted.');
  }
});

/**
 * Pre-delete hook (deleteOne) that prevents deletion of system categories.
 * Note: deleteMany is intentionally unguarded — user-account cascade
 * (User.pre('findOneAndDelete')) depends on Category.deleteMany().
 */
CategorySchema.pre('deleteOne', { document: false, query: true }, async function() {
  const docToDelete = await this.model.findOne(this.getQuery());
  if (docToDelete && docToDelete.isSystem) {
    throw new Error('System categories cannot be deleted.');
  }
});

/**
 * Pre-delete hook that reassigns all transactions linked to this category to "No Category" (null).
 * Database-Level Cascade Update.
 */
CategorySchema.pre('findOneAndDelete', async function() {
  const doc = await this.model.findOne(this.getQuery());
  if (!doc) return;
  const categoryId = doc._id;
  const Transaction = mongoose.model('Transaction');
  
  // Automatically reassign all linked transactions to "No Category" (null)
  await Transaction.updateMany(
    { categoryId: categoryId },
    { $set: { categoryId: null } }
  );

});

/**
 * Pre-delete hook (deleteOne) that reassigns all transactions linked to this category to "No Category" (null).
 * Database-Level Cascade Update.
 */
CategorySchema.pre('deleteOne', { document: false, query: true }, async function() {
  const doc = await this.model.findOne(this.getQuery());
  if (!doc) return;
  const categoryId = doc._id;
  const Transaction = mongoose.model('Transaction');
  
  // Automatically reassign all linked transactions to "No Category" (null)
  await Transaction.updateMany(
    { categoryId: categoryId },
    { $set: { categoryId: null } }
  );
});

export default (mongoose.models.Category as mongoose.Model<ICategory>) || mongoose.model<ICategory>('Category', CategorySchema);