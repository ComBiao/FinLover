import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  type: 'income' | 'expense'; 
  color?: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, maxlength: 50 },
  type: { type: String, enum: ['income', 'expense'], required: true },
  color: { type: String },
  isSystem: { type: Boolean, default: false }
}, { 
  timestamps: true 
});

CategorySchema.index({ userId: 1, name: 1 }, { unique: true });

export default (mongoose.models.Category as mongoose.Model<ICategory>) || mongoose.model<ICategory>('Category', CategorySchema);