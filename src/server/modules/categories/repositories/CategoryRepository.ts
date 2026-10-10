import "server-only";
import type { TransactionContext } from '@/server/shared/ports/unit-of-work';
import { sessionOf } from '@/server/db/unit-of-work';
import Category from '@/server/db/models/Category';
import type { CategoryInput, CategoryRepositoryPort, SystemCategorySeed } from '@/server/shared/ports/categories';
export class CategoryRepository implements CategoryRepositoryPort {
  async typeOf(id: string, userId: string, context: TransactionContext) {
    const doc = await Category.findOne({ _id: id, userId }).session(sessionOf(context)!).lean();
    return doc?.type ?? null;
  }
  async findOwned(id: string, userId: string, context?: TransactionContext) {
    const doc = await Category.findOne({ _id: id, userId }).session(sessionOf(context) ?? null);
    return doc ? { id: String(doc._id), isSystem: doc.isSystem, type: doc.type } : null;
  }
  async create(userId: string, input: CategoryInput) { return Category.create({ ...input, userId, isSystem: false }); }
  async update(id: string, userId: string, input: CategoryInput) {
    const doc = await Category.findOne({ _id: id, userId });
    if (!doc) return null;
    Object.assign(doc, input);
    return doc.save();
  }
  async delete(id: string, userId: string, context: TransactionContext) { return Category.findOneAndDelete({ _id: id, userId, isSystem: false }, { session: sessionOf(context) }); }
  async createSystemDefaults(userId: string, categories: readonly SystemCategorySeed[], context: TransactionContext) {
    await Category.insertMany(
      categories.map((category) => ({ ...category, userId, isSystem: true })),
      { session: sessionOf(context) },
    );
  }
}
