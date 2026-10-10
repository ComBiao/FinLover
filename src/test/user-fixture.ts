import mongoose from 'mongoose';
import User from '@/server/db/models/User';

/** Inserts a minimal valid user so tokens signed for this ID pass the account-exists check. */
export async function seedUser(id: string | mongoose.Types.ObjectId) {
  return User.create({
    _id: id,
    email: `${String(id)}@example.com`,
    passwordHash: 'not-a-real-hash',
    dataPrivacyConsent: true,
  });
}