import { UpdateWalletService } from '@/server/modules/wallets/services/UpdateWalletService';
import { UpdateWalletSavingService } from '@/server/modules/wallets/services/UpdateWalletSavingService';
import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { NextRequest } from 'next/server';
import Wallet from '@/server/db/models/Wallet';
import WalletMember from '@/server/db/models/WalletMember';
import User from '@/server/db/models/User';
import Category from '@/server/db/models/Category';
import Transaction from '@/server/db/models/Transaction';
import { signToken } from '@/server/shared/auth/crypto';
import { seedUser } from '@/test/user-fixture';
import { seedSharedWallet } from '@/test/shared-wallet-fixture';
import { seedTransaction } from '@/test/transaction-fixture';
import { v1 } from '@/server/shared/http/versioned-handlers';
import { GET } from '@/app/api/v1/wallets/[id]/members/route';
import { DELETE } from '@/app/api/v1/wallets/[id]/members/[userId]/route';
import { POST as leaveRoute } from '@/app/api/v1/wallets/[id]/leave/route';
import { POST as transferRoute } from '@/app/api/v1/wallets/[id]/transfer-ownership/route';
import { MongoUnitOfWork } from '@/server/db/unit-of-work';
import { SchedulerRepository } from '@/server/modules/schedulers/repositories/SchedulerRepository';
import { WalletMembersRepository } from '@/server/modules/wallets/repositories/WalletMembersRepository';
import { WalletMembershipRepository } from '@/server/modules/wallets/repositories/WalletMembershipRepository';
import { WalletRepository } from '@/server/modules/wallets/repositories/WalletRepository';
import { UserRepository } from '@/server/modules/users/repositories/UserRepository';
import { WalletPresentationService } from '@/server/modules/wallets/services/WalletPresentationService';
import { WalletMembersService } from '@/server/modules/wallets/services/WalletMembersService';
import { DeleteAccountService } from '@/server/modules/auth/services/DeleteAccountService';
import { walletMembersResponse, sharedWalletResponse } from '@/shared/contracts';
import { buildSpec } from '@/server/shared/docs/openapi';
import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

vi.mock('@/server/db/index', () => ({ connectDB: vi.fn(async () => {}) }));
let mongo: MongoMemoryReplSet;
const [owner, member, pending, outsider, second] = Array.from({ length: 5 }, () => new Types.ObjectId().toString());
const membership = new WalletMembershipRepository(), repo = new WalletRepository(membership), users = new UserRepository(), uow = new MongoUnitOfWork();
const context = (id: string) => ({ params: Promise.resolve({ id }) });
function request(method: string, actor: string | null, body?: unknown) {
  return new NextRequest('http://localhost:3000/api/v1/wallets', { method, headers: { 'content-type': 'application/json', ...(actor ? { authorization: `Bearer ${signToken({ userId: actor })}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
const list = (id: string, actor: string | null = owner) => GET(request('GET', actor), context(id));
const remove = (id: string, target: string, actor: string | null = owner) => DELETE(request('DELETE', actor), { params: Promise.resolve({ id, userId: target }) });
const leave = (id: string, actor: string | null = member) => leaveRoute(request('POST', actor), context(id));
const transfer = (id: string, target: string, actor: string | null = owner) => transferRoute(request('POST', actor, { userId: target }), context(id));
const seed = () => seedSharedWallet(owner, [{ userId: member }, { userId: pending, status: 'pending' }, { userId: second }]);

beforeAll(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri());
  await Promise.all([Wallet.init(), WalletMember.init(), User.init(), Category.init(), Transaction.init()]);
}, 60000);
afterAll(async () => { await mongoose.disconnect(); await mongo?.stop(); });
beforeEach(async () => {
  vi.restoreAllMocks();
  await Promise.all([Wallet.deleteMany({}), WalletMember.deleteMany({}), User.deleteMany({}), Category.deleteMany({}), Transaction.collection.deleteMany({})]);
  for (const id of [owner, member, pending, outsider, second]) await seedUser(id);
});

describe('E7-07 membership APIs on a real replica set', () => {
  it('lists Owner, accepted and pending with emails only for accepted access and never writes on GET', async () => {
    const { wallet } = await seed(); const id = String(wallet._id);
    for (const actor of [owner, member]) {
      const response = await list(id, actor); expect(response.status).toBe(200);
      const data = walletMembersResponse.parse((await response.json()).data);
      expect(data.members).toHaveLength(4);
      expect(data.members[0]).toMatchObject({ userId: owner, role: 'owner', status: 'accepted', email: `${owner}@example.com` });
      expect(data.members.find(row => row.userId === pending)?.status).toBe('pending');
    }
    for (const actor of [pending, outsider]) expect((await list(id, actor)).status).toBe(403);
    expect((await Wallet.findById(id))!.membershipVersion).toBe(0);
  });
  it('enforces authentication, malformed/missing ids, personal isolation and Owner-only mutations', async () => {
    const { wallet } = await seed(); const id = String(wallet._id);
    for (const response of [await list(id, null), await remove(id, member, null), await leave(id, null), await transfer(id, member, null)]) expect(response.status).toBe(401);
    for (const actor of [member, pending, outsider]) {
      expect((await remove(id, second, actor)).status).toBe(403);
      expect((await transfer(id, second, actor)).status).toBe(403);
    }
    for (const actor of [pending, outsider]) expect((await leave(id, actor)).status).toBe(403);
    expect((await list('bad')).status).toBe(400);
    expect((await remove(id, 'bad')).status).toBe(400);
    expect((await transfer(id, 'bad')).status).toBe(400);
    const missing = String(new Types.ObjectId());
    for (const response of [await list(missing), await remove(missing, member), await leave(missing), await transfer(missing, member)]) expect(response.status).toBe(404);
    const personal = await Wallet.create({ userId: owner, name: 'Personal' });
    expect((await list(String(personal._id))).status).toBe(400);
    expect((await list(String(personal._id), member)).status).toBe(404);
    expect((await remove(id, owner)).status).toBe(409);
    expect((await remove(id, outsider)).status).toBe(404);
    expect(await WalletMember.countDocuments({ walletId: id })).toBe(3);
  });
  it('cancels pending invitations and revokes accepted access immediately without changing transactions/balance', async () => {
    const { wallet, memberships } = await seed(); const id = String(wallet._id);
    await seedTransaction(new Transaction({ userId: member, walletId: id, type: 'income', amount: 12, title: 'Preserve', date: new Date() }));
    await Wallet.updateOne({ _id: id }, { balance: 12 });
    expect((await remove(id, pending)).status).toBe(200);
    expect((await remove(id, pending)).status).toBe(404);
    expect((await v1.acceptInvitation(request('POST', pending), context(String(memberships[1]._id)))).status).toBe(404);
    expect((await remove(id, member)).status).toBe(200);
    expect((await list(id, member)).status).toBe(403);
    expect((await v1.getWallet(request('GET', member), context(id))).status).toBe(403);
    await expect(uow.run(ctx => repo.adjust(id, member, 100, ctx))).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(await Transaction.countDocuments({ walletId: id })).toBe(1);
    expect((await Wallet.findById(id))!.balance).toBe(12);
  });
  it.each([-20, 0, 20])('Contributor can leave at balance %s; original transactions remain', async balance => {
    const { wallet } = await seed(); const id = String(wallet._id);
    await Wallet.updateOne({ _id: id }, { balance });
    await seedTransaction(new Transaction({ userId: member, walletId: id, type: 'expense', amount: 2, title: 'Preserve', date: new Date() }));
    expect((await leave(id)).status).toBe(200);
    expect((await leave(id)).status).toBe(403);
    expect(await WalletMember.countDocuments({ walletId: id, userId: member })).toBe(0);
    expect((await Wallet.findById(id))!.balance).toBe(balance);
    expect(await Transaction.countDocuments({ walletId: id })).toBe(1);
  });
  it('Owner must transfer or use explicit deletion even when only pending invitations remain', async () => {
    const { wallet } = await seed(); const id = String(wallet._id);
    const blocked = await leave(id, owner); expect(blocked.status).toBe(409);
    expect((await blocked.json()).error.message).toContain('Transfer');
    await remove(id, member); await remove(id, second);
    const empty = await leave(id, owner); expect(empty.status).toBe(409);
    expect((await empty.json()).error.message).toContain('Delete wallet');
    expect(await Wallet.findById(id)).not.toBeNull();
    expect(await WalletMember.countDocuments({ walletId: id, status: 'pending' })).toBe(1);
  });
  it('transfers atomically with old Owner becoming Contributor and unchanged balances/authors', async () => {
    const { wallet } = await seed(); const id = String(wallet._id);
    await seedTransaction(new Transaction({ userId: owner, walletId: id, type: 'income', amount: 3, title: 'Before transfer', date: new Date() }));
    await Wallet.updateOne({ _id: id }, { balance: 3 });
    const response = await transfer(id, member); expect(response.status).toBe(200);
    const data = sharedWalletResponse.parse((await response.json()).data);
    expect(data.role).toBe('contributor'); expect(data.memberCount).toBe(3);
    expect(data.membersPreview[0].id).toBe(member);
    expect(data).not.toHaveProperty('userId');
    expect(String((await Wallet.findById(id))!.userId)).toBe(member);
    expect(await WalletMember.countDocuments({ walletId: id, userId: member })).toBe(0);
    expect((await WalletMember.findOne({ walletId: id, userId: owner }))!.status).toBe('accepted');
    expect((await remove(id, second, owner)).status).toBe(403);
    expect((await remove(id, second, member)).status).toBe(200);
    expect(String((await Transaction.findOne({ walletId: id }))!.userId)).toBe(owner);
    expect((await Wallet.findById(id))!.balance).toBe(3);
  });
  it('rejects pending/self/non-member transfer and rolls back new owner name collision', async () => {
    const { wallet } = await seed(); const id = String(wallet._id);
    for (const target of [owner, pending, outsider]) expect((await transfer(id, target)).status).toBe(409);
    await Wallet.create({ userId: member, name: wallet.name });
    expect((await transfer(id, member)).status).toBe(409);
    expect(String((await Wallet.findById(id))!.userId)).toBe(owner);
    expect((await Wallet.findById(id))!.membershipVersion).toBe(0);
    expect((await WalletMember.findOne({ walletId: id, userId: member }))!.status).toBe('accepted');
    expect(await WalletMember.countDocuments({ walletId: id, userId: owner })).toBe(0);
  });
  it('rolls back transfer and removal when a later operation fails', async () => {
    const { wallet } = await seed(); const id = String(wallet._id);
    const members = new WalletMembersRepository(new SchedulerRepository());
    const presentation = new WalletPresentationService(membership, users);
    const service = new WalletMembersService(members, membership, repo, users, presentation, uow);
    vi.spyOn(presentation, 'execute').mockRejectedValue(new Error('after transfer'));
    await expect(service.transfer(id, owner, member)).rejects.toThrow('after transfer');
    expect(String((await Wallet.findById(id))!.userId)).toBe(owner);
    expect(await WalletMember.countDocuments({ walletId: id, userId: owner })).toBe(0);
    const original = members.remove.bind(members);
    vi.spyOn(members, 'remove').mockImplementation(async (...args) => { await original(...args); throw new Error('after remove'); });
    await expect(service.remove(id, owner, member)).rejects.toThrow('after remove');
    expect((await WalletMember.findOne({ walletId: id, userId: member }))!.status).toBe('accepted');
    expect((await Wallet.findById(id))!.membershipVersion).toBe(0);
  });
  it('concurrent transfers have only one winner', async () => {
    const { wallet } = await seed(); const id = String(wallet._id);
    const responses = await Promise.all([transfer(id, member), transfer(id, second)]);
    expect(responses.map(response => response.status).sort()).toEqual([200, 403]);
    const newOwner = String((await Wallet.findById(id))!.userId);
    expect([member, second]).toContain(newOwner);
    expect(await WalletMember.countDocuments({ walletId: id, userId: newOwner })).toBe(0);
    expect(await WalletMember.countDocuments({ walletId: id, userId: owner })).toBe(1);
  });
  it('remove racing transfer cannot leave an owner membership or a dangling owner', async () => {
    const { wallet } = await seed(); const id = String(wallet._id);
    const [removed, transferred] = await Promise.all([remove(id, member), transfer(id, member)]);
    if (transferred.status === 200) { expect(removed.status).toBe(403); expect(String((await Wallet.findById(id))!.userId)).toBe(member); }
    else { expect(transferred.status).toBe(409); expect(removed.status).toBe(200); expect(String((await Wallet.findById(id))!.userId)).toBe(owner); }
    expect(await WalletMember.countDocuments({ walletId: id, userId: member })).toBe(0);
  });
  it('a stale balance write retries and loses access after removal commits', async () => {
    const { wallet } = await seed(); const id = String(wallet._id);
    let ready!: () => void, release!: () => void;
    const started = new Promise<void>(resolve => { ready = resolve; });
    const proceed = new Promise<void>(resolve => { release = resolve; });
    const writing = uow.run(async ctx => { await repo.exists(id, member, ctx); ready(); await proceed; await repo.adjust(id, member, 50, ctx); });
    // Attach the rejection assertion before releasing the pending transaction.
    const rejected = expect(writing).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await started;
    try { expect((await remove(id, member)).status).toBe(200); } finally { release(); }
    await rejected; expect((await Wallet.findById(id))!.balance).toBe(0);
  });
  it('transfer racing target account deletion preserves one consistent owner', async () => {
    const { wallet } = await seed(); const id = String(wallet._id);
    const deletion = new DeleteAccountService(users, uow);
    const [change, deleted] = await Promise.allSettled([transfer(id, member), deletion.execute(member)]);
    expect(change.status).toBe('fulfilled');
    const status = change.status === 'fulfilled' ? change.value.status : 0;
    if (status === 200) {
      expect(deleted.status).toBe('rejected');
      expect(deleted.status === 'rejected' && deleted.reason.code).toBe('CONFLICT');
      expect(await User.findById(member)).not.toBeNull();
      expect(String((await Wallet.findById(id))!.userId)).toBe(member);
    } else {
      expect(status).toBe(409); expect(deleted.status).toBe('fulfilled');
      expect(String((await Wallet.findById(id))!.userId)).toBe(owner);
      expect(await WalletMember.countDocuments({ walletId: id, userId: member })).toBe(0);
    }
  });
  it.each(['metadata', 'saving'])('stale Owner authorization cannot change %s after transfer', async kind => {
    const { wallet } = await seed(); const id = String(wallet._id);
    const original = repo.findOwned.bind(repo);
    vi.spyOn(repo, 'findOwned').mockImplementationOnce(async (...args) => {
      const authorized = await original(...args);
      expect((await transfer(id, member)).status).toBe(200);
      return authorized;
    });
    const change = kind === 'metadata'
      ? new UpdateWalletService(repo).execute(id, owner, { name: 'Stale edit' })
      : new UpdateWalletSavingService(repo).execute(id, owner, { isSaving: true, goalAmount: 100 });
    await expect(change).rejects.toMatchObject({ code: 'FORBIDDEN' });
    const stored = await Wallet.findById(id);
    expect(stored!.name).toBe(wallet.name); expect(stored!.isSaving).toBe(false);
  });
  it('account deletion invalidates a pre-authorized balance write on a surviving shared wallet', async () => {
    const { wallet } = await seed(); const id = String(wallet._id);
    let ready!: () => void, release!: () => void;
    const started = new Promise<void>(resolve => { ready = resolve; });
    const proceed = new Promise<void>(resolve => { release = resolve; });
    const writing = uow.run(async ctx => { await repo.exists(id, member, ctx); ready(); await proceed; await repo.adjust(id, member, 50, ctx); });
    const rejected = expect(writing).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await started;
    try { await new DeleteAccountService(users, uow).execute(member); } finally { release(); }
    await rejected;
    expect((await Wallet.findById(id))!.balance).toBe(0);
    expect(await User.findById(member)).toBeNull();
  });

  it('responses match OpenAPI schemas including the second path parameter', async () => {
    const { wallet } = await seed(); const id = String(wallet._id);
    const cases: [string, string, Response][] = [
      ['/api/v1/wallets/{id}/members', 'get', await list(id)],
      ['/api/v1/wallets/{id}/members/{userId}', 'delete', await remove(id, pending)],
      ['/api/v1/wallets/{id}/transfer-ownership', 'post', await transfer(id, member)],
      ['/api/v1/wallets/{id}/leave', 'post', await leave(id, owner)],
    ];
    const ajv = new Ajv({ strict: false }); addFormats(ajv);
    for (const [path, method, response] of cases) {
      expect(response.status).toBe(200);
      const op = buildSpec('v1').paths[path][method] as { responses: Record<string, { content: { 'application/json': { schema: object } } }> };
      const validate = ajv.compile(op.responses['200'].content['application/json'].schema);
      expect(validate(await response.json()), JSON.stringify(validate.errors)).toBe(true);
    }
  });
});
