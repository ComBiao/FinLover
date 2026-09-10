import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Category from '../Category';

describe('isSystem Bypass Test', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('can bypass isSystem using save', async () => {
    const cat = await Category.create({ 
      userId: new mongoose.Types.ObjectId(), 
      name: 'Food', 
      type: 'expense', 
      isSystem: true 
    });
    
    cat.isSystem = false;
    cat.name = 'Hacked Food';
    try {
      await cat.save();
    } catch (e) {
      console.log('HOOK THREW:', (e as Error).message);
      return;
    }
    console.log('SAVE SUCCEEDED!');
  });
});
