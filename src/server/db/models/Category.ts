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
  const docToUpdate = await this.model.findOne(this.getQuery()).session(this.getOptions().session ?? null);
  if (docToUpdate && docToUpdate.isSystem) {
    throw new Error('System categories cannot be modified.');
  }
});

/**
 * Pre-update hook (updateOne) that prevents modification of system categories.
 */
CategorySchema.pre('updateOne', async function() {
  const docToUpdate = await this.model.findOne(this.getQuery()).session(this.getOptions().session ?? null);
  if (docToUpdate && docToUpdate.isSystem) {
    throw new Error('System categories cannot be modified.');
  }
});

/**
 * Pre-delete hook that prevents deletion of system categories.
 */
CategorySchema.pre('findOneAndDelete', async function() {
  const docToUpdate = await this.model.findOne(this.getQuery()).session(this.getOptions().session ?? null);
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
  const docToDelete = await this.model.findOne(this.getQuery()).session(this.getOptions().session ?? null);
  if (docToDelete && docToDelete.isSystem) {
    throw new Error('System categories cannot be deleted.');
  }
});

// Category deletion with reference cleanup must use deleteCategoryAndCascade().

export default (mongoose.models.Category as mongoose.Model<ICategory>) || mongoose.model<ICategory>('Category', CategorySchema);