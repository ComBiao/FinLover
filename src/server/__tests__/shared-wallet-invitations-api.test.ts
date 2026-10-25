import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { NextRequest } from 'next/server';
import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import Wallet from '@/server/db/models/Wallet';
import WalletMember from '@/server/db/models/WalletMember';
import User from '@/server/db/models/User';
import Transaction from '@/server/db/models/Transaction';
import Category from '@/server/db/models/Category';
import { v1 } from '@/server/shared/http/versioned-handlers';
import { POST as inviteRoute } from '@/app/api/v1/wallets/[id]/invitations/route';
import { POST as acceptRoute } from '@/app/api/v1/invitations/[id]/accept/route';
import { POST as declineRoute } from '@/app/api/v1/invitations/[id]/decline/route';
import { GET as inboxRoute } from '@/app/api/v1/invitations/route';
import { signToken } from '@/server/shared/auth/crypto';
import { seedUser } from '@/test/user-fixture';
import { seedSharedWallet } from '@/test/shared-wallet-fixture';
import { seedTransaction } from '@/test/transaction-fixture';
import { MongoUnitOfWork } from '@/server/db/unit-of-work';
import { WalletMembershipRepository } from '@/server/modules/wallets/repositories/WalletMembershipRepository';
import { WalletRepository } from '@/server/modules/wallets/repositories/WalletRepository';
import { WalletInvitationRepository } from '@/server/modules/wallets/repositories/WalletInvitationRepository';
import { WalletInvitationService } from '@/server/modules/wallets/services/WalletInvitationService';
import { UserRepository } from '@/server/modules/users/repositories/UserRepository';
import { DeleteAccountService } from '@/server/modules/auth/services/DeleteAccountService';
import { buildSpec } from '@/server/shared/docs/openapi';
import { sharedWalletResponse, walletMemberResponse, myInvitationsResponse } from '@/shared/contracts';

vi.mock('@/server/db/index', () => ({ connectDB: vi.fn(async () => {}) }));
const cookieStore = vi.hoisted(() => ({ set: vi.fn(), delete: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => cookieStore) }));
let mongo: MongoMemoryReplSet;
const [owner, contributor, pending, outsider] = Array.from({ length: 4 }, () => new Types.ObjectId().toString());
const memberships = new WalletMembershipRepository();
const repo = new WalletRepository(memberships);
const uow = new MongoUnitOfWork();
const email = (id: string) => `${id}@example.com`;
const context = (id = '') => ({ params: Promise.resolve({ id }) });
function request(method: string, userId: string | null = owner, body?: unknown, path = '/api/v1/wallets') {
  return new NextRequest(`http://localhost:3000${path}`, { method,
    headers: { 'content-type': 'application/json', ...(userId ? { authorization: `Bearer ${signToken({ userId })}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
const invite = (id: string, userId: string | null = owner, target = email(pending)) => inviteRoute(request('POST', userId, { email: target }, `/api/v1/wallets/${id}/invitations`), context(id));
const accept = (id: string, userId: string | null = pending) => acceptRoute(request('POST', userId, undefined, `/api/v1/invitations/${id}/accept`), context(id));
const decline = (id: string, userId: string | null = pending) => declineRoute(request('POST', userId, undefined, `/api/v1/invitations/${id}/decline`), context(id));
const detail = (id: string, userId: string | null) => v1.getWallet(request('GET', userId), context(id));
const inbox = (id: string) => inboxRoute(request('GET', id, undefined, '/api/v1/invitations'));

beforeAll(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri());
  await Promise.all([Wallet.init(), WalletMember.init(), User.init(), Transaction.init(), Category.init()]);
}, 60000);
afterAll(async () => { await mongoose.disconnect(); await mongo?.stop(); });
beforeEach(async () => {
  vi.restoreAllMocks();
  await Promise.all([Wallet.deleteMany({}), WalletMember.deleteMany({}), User.deleteMany({}), Category.deleteMany({}), Transaction.collection.deleteMany({})]);
  for (const id of [owner, contributor, pending, outsider]) await seedUser(id);
  await User.updateOne({ _id: owner }, { name: 'Owner' });
});

describe('E7-01b/02 real database API', () => {
  it('creates a zero-balance shared saving wallet owned by principal, with full card metadata', async () => {
    const res = await v1.createWallet(request('POST', owner, { name: 'Trip', isShared: true, isSaving: true, goalAmount: 1000, balance: 999, userId: outsider, role: 'contributor' }), context());
    expect(res.status).toBe(201);
    const { data } = await res.json();
    expect(sharedWalletResponse.parse(data)).toMatchObject({ balance: 0, role: 'owner', memberCount: 1, ownerName: 'Owner', membersPreview: [{ id: owner, name: 'Owner' }] });
    expect(String((await Wallet.findById(data.id))!.userId)).toBe(owner);
    expect(await WalletMember.countDocuments({ walletId: data.id })).toBe(0);
    expect((await v1.createWallet(request('POST', owner, { name: 'Trip', isShared: true }), context())).status).toBe(409);
    expect((await v1.createWallet(request('POST', owner, { name: 'Bad', isShared: 'yes' }), context())).status).toBe(400);
    expect((await v1.createWallet(request('POST', null, { name: 'No', isShared: true }), context())).status).toBe(401);
  });

  it('normalizes email, keeps pending inaccessible, accepts only as invitee, and exposes membership immediately', async () => {
    const { wallet } = await seedSharedWallet(owner);
    const id = String(wallet._id);
    const res = await invite(id, owner, ` ${email(pending).toUpperCase()} `);
    expect(res.status).toBe(201);
    const invitation = (await res.json()).data;
    expect(invitation).toMatchObject({ walletId: id, invitedByName: 'Owner' });
    const listed = (await (await inbox(pending)).json()).data;
    expect(myInvitationsResponse.parse(listed)).toEqual({ items: [invitation], total: 1 });
    expect((await (await inbox(outsider)).json()).data.total).toBe(0);
    expect((await detail(id, pending)).status).toBe(403);
    expect((await accept(invitation.id, outsider)).status).toBe(403);
    expect((await decline(invitation.id, owner)).status).toBe(403);
    expect((await WalletMember.findById(invitation.id))!.status).toBe('pending');
    const accepted = await accept(invitation.id);
    expect(accepted.status).toBe(200);
    expect(walletMemberResponse.parse((await accepted.json()).data)).toMatchObject({ userId: pending, role: 'contributor', status: 'accepted', name: 'Unnamed user' });
    expect((await (await inbox(pending)).json()).data).toEqual({ items: [], total: 0 });
    const visible = (await (await detail(id, pending)).json()).data;
    expect(sharedWalletResponse.parse(visible)).toMatchObject({ role: 'contributor', memberCount: 2 });
    expect((await accept(invitation.id)).status).toBe(409);
    expect((await decline(invitation.id)).status).toBe(409);
    expect((await invite(id)).status).toBe(409);
  });

  it('declines without changing wallet, permits a later invitation, and returns 404 on repeat', async () => {
    const { wallet, memberships: rows } = await seedSharedWallet(owner, [{ userId: pending, status: 'pending' }]);
    expect((await decline(String(rows[0]._id))).status).toBe(200);
    expect((await decline(String(rows[0]._id))).status).toBe(404);
    expect(await WalletMember.countDocuments({})).toBe(0);
    expect((await Wallet.findById(wallet._id))!.balance).toBe(0);
    expect((await invite(String(wallet._id))).status).toBe(201);
  });

  it('enforces Owner-only invitation and exact email field errors without mutation', async () => {
    const { wallet } = await seedSharedWallet(owner, [{ userId: contributor }, { userId: pending, status: 'pending' }]);
    const id = String(wallet._id);
    for (const actor of [contributor, pending, outsider]) expect((await invite(id, actor)).status).toBe(403);
    expect((await invite(id, null)).status).toBe(401);
    for (const [target, message] of [[email(owner), 'Cannot invite yourself'], ['absent@example.com', 'User not found']]) {
      const response = await invite(id, owner, target);
      expect(response.status).toBe(400);
      expect((await response.json()).error.fields.email).toBe(message);
    }
    expect((await invite(id, owner, 'bad-email')).status).toBe(400);
    expect((await invite('bad')).status).toBe(400);
    expect((await invite(String(new Types.ObjectId()))).status).toBe(404);
    const personal = await Wallet.create({ userId: owner, name: 'Personal' });
    expect((await invite(String(personal._id))).status).toBe(400);
    expect(await WalletMember.countDocuments({ walletId: id })).toBe(2);
    expect((await Wallet.findById(id))!.membershipVersion).toBe(0);
  });

  it('checks authentication, IDs, JSON, Origin and media type on new routes', async () => {
    const { wallet, memberships: rows } = await seedSharedWallet(owner, [{ userId: pending, status: 'pending' }]);
    const id = String(wallet._id), invitationId = String(rows[0]._id);
    expect((await inboxRoute(request('GET', null))).status).toBe(401);
    expect((await accept(invitationId, null)).status).toBe(401);
    expect((await decline(invitationId, null)).status).toBe(401);
    expect((await accept('bad')).status).toBe(400);
    expect((await decline(String(new Types.ObjectId()))).status).toBe(404);
    const url = `http://localhost:3000/api/v1/wallets/${id}/invitations`;
    const malformed = new NextRequest(url, { method: 'POST', headers: { authorization: `Bearer ${signToken({ userId: owner })}`, 'content-type': 'application/json' }, body: '{' });
    expect((await inviteRoute(malformed, context(id))).status).toBe(400);
    const cookieHeaders = { cookie: `session_token=${signToken({ userId: owner })}` };
    expect((await inviteRoute(new NextRequest(url, { method: 'POST', headers: cookieHeaders, body: '{}' }), context(id))).status).toBe(403);
    expect((await inviteRoute(new NextRequest(url, { method: 'POST', headers: { ...cookieHeaders, origin: 'http://localhost:3000', 'content-type': 'text/plain' }, body: '{}' }), context(id))).status).toBe(415);
  });

  it('lists only accessible wallets, caps preview at three, preserves owned-only mutation and old data', async () => {
    const extra = new Types.ObjectId().toString();
    await seedUser(extra);
    const { wallet } = await seedSharedWallet(owner, [{ userId: contributor }, { userId: outsider }, { userId: extra }, { userId: pending, status: 'pending' }]);
    const id = String(wallet._id);
    await Wallet.collection.insertOne({ userId: new Types.ObjectId(owner), name: 'Legacy', balance: 0, isDefault: false, isSaving: false, createdAt: new Date(), updatedAt: new Date() });
    const owned = (await (await v1.listWallets(request('GET', owner), context())).json()).data;
    expect(owned.find((row: { name: string }) => row.name === 'Legacy').isShared).toBe(false);
    const accepted = (await (await v1.listWallets(request('GET', contributor), context())).json()).data;
    expect(accepted).toHaveLength(1);
    expect(accepted[0]).toMatchObject({ id, memberCount: 4, role: 'contributor' });
    expect(accepted[0].membersPreview).toHaveLength(3);
    expect(accepted[0].membersPreview[0].id).toBe(owner);
    expect((await (await v1.listWallets(request('GET', pending), context())).json()).data).toEqual([]);
    for (const actor of [contributor, pending]) {
      expect((await v1.updateWallet(request('PUT', actor, { name: 'Hacked' }), context(id))).status).toBe(403);
      expect((await v1.updateWalletSaving(request('PATCH', actor, { isSaving: false }), context(id))).status).toBe(403);
      expect((await v1.deleteWallet(request('DELETE', actor), context(id))).status).toBe(403);
    }
    await v1.updateWallet(request('PUT', owner, { isShared: false }), context(id));
    expect((await Wallet.findById(id))!.isShared).toBe(true);
    expect((await detail(String(new Types.ObjectId()), contributor)).status).toBe(404);
    expect((await detail('bad', owner)).status).toBe(400);
    expect((await detail(id, null)).status).toBe(401);
  });

  it('membership-aware balance access stays inside UoW and checks current membership', async () => {
    const { wallet } = await seedSharedWallet(owner, [{ userId: contributor }, { userId: pending, status: 'pending' }]);
    const id = String(wallet._id);
    await uow.run(async ctx => { expect(await repo.exists(id, contributor, ctx)).toBe(true); await repo.adjust(id, contributor, 5, ctx); });
    expect((await Wallet.findById(id))!.balance).toBe(5);
    for (const actor of [pending, outsider]) await expect(uow.run(ctx => repo.adjust(id, actor, 100, ctx))).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await WalletMember.deleteOne({ walletId: id, userId: contributor });
    expect((await detail(id, contributor)).status).toBe(403);
    await expect(uow.run(ctx => repo.adjust(id, contributor, 100, ctx))).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect((await Wallet.findById(id))!.balance).toBe(5);
  });

  it('rolls back invitation and access-version writes if a later step fails', async () => {
    const { wallet } = await seedSharedWallet(owner);
    const users = new UserRepository();
    vi.spyOn(users, 'findPublicByIds').mockRejectedValue(new Error('injected failure'));
    const service = new WalletInvitationService(new WalletInvitationRepository(), memberships, repo, users, uow);
    await expect(service.invite(String(wallet._id), owner, email(pending))).rejects.toThrow('injected failure');
    expect(await WalletMember.countDocuments({})).toBe(0);
    expect((await Wallet.findById(wallet._id))!.membershipVersion).toBe(0);
  });

  it('concurrent duplicate invitations and accepts have exactly one winner', async () => {
    const { wallet } = await seedSharedWallet(owner);
    const responses = await Promise.all([invite(String(wallet._id)), invite(String(wallet._id))]);
    expect(responses.map(res => res.status).sort()).toEqual([201, 409]);
    const row = await WalletMember.findOne({ walletId: wallet._id });
    expect(await WalletMember.countDocuments({ walletId: wallet._id })).toBe(1);
    const accepted = await Promise.all([accept(String(row!._id)), accept(String(row!._id))]);
    expect(accepted.map(res => res.status).sort()).toEqual([200, 409]);
  });

  it('accept racing decline cannot leave an invitation both deleted and accepted', async () => {
    const { memberships: rows } = await seedSharedWallet(owner, [{ userId: pending, status: 'pending' }]);
    const id = String(rows[0]._id);
    const [a, d] = await Promise.all([accept(id), decline(id)]);
    if (a.status === 200) {
      expect(d.status).toBe(409);
      expect((await WalletMember.findById(id))!.status).toBe('accepted');
    } else {
      expect(a.status).toBe(404); expect(d.status).toBe(200);
      expect(await WalletMember.findById(id)).toBeNull();
    }
  });

  it('wallet deletion cleans pending invitations and concurrent acceptance cannot orphan members', async () => {
    const { wallet, memberships: rows } = await seedSharedWallet(owner, [{ userId: pending, status: 'pending' }]);
    const [deleted, accepted] = await Promise.all([v1.deleteWallet(request('DELETE', owner), context(String(wallet._id))), accept(String(rows[0]._id))]);
    expect(deleted.status).toBe(200);
    expect([200, 404]).toContain(accepted.status);
    expect(await WalletMember.countDocuments({ walletId: wallet._id })).toBe(0);
    expect(await Wallet.findById(wallet._id)).toBeNull();
  });

  it('account deletion cannot orphan pending invites or delete an owned accepted shared wallet', async () => {
    const service = new DeleteAccountService(new UserRepository(), uow);
    const { wallet } = await seedSharedWallet(owner, [{ userId: contributor }, { userId: pending, status: 'pending' }]);
    await expect(service.execute(owner)).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(await User.findById(owner)).not.toBeNull();
    await service.execute(pending);
    expect(await WalletMember.countDocuments({ userId: pending })).toBe(0);
    expect(await Wallet.findById(wallet._id)).not.toBeNull();
  });

  it('retains fixture shared transactions and balances when a Contributor deletes their account', async () => {
    const { wallet } = await seedSharedWallet(owner, [{ userId: contributor }]);
    await seedTransaction(new Transaction({ userId: contributor, walletId: wallet._id, type: 'income', amount: 7, title: 'Fixture', date: new Date() }));
    await Wallet.updateOne({ _id: wallet._id }, { balance: 7 });
    await new DeleteAccountService(new UserRepository(), uow).execute(contributor);
    expect(await Transaction.countDocuments({ walletId: wallet._id })).toBe(1);
    expect((await Wallet.findById(wallet._id))!.balance).toBe(7);
    expect(await WalletMember.countDocuments({ userId: contributor })).toBe(0);
  });

  it('enforces shared transaction rules and excludes shared balances from Home All', async () => {
    const { wallet } = await seedSharedWallet(owner, [{ userId: contributor }]);
    await Wallet.updateOne({ _id: wallet._id }, { balance: 99 });
    const body = { walletId: String(wallet._id), type: 'expense', amount: 5, title: 'Shared Tx', date: '2026-10-23' };
    for (const actor of [owner, contributor]) expect((await v1.createTransaction(request('POST', actor, body), context())).status).toBe(201);
    expect((await v1.createTransaction(request('POST', outsider, body), context())).status).toBe(403);
    expect(await Transaction.countDocuments({ walletId: wallet._id })).toBe(2);
    expect((await Wallet.findById(wallet._id))!.balance).toBe(89);
    const summary = await v1.homeSummary(request('GET', owner, undefined, '/api/v1/home/summary?walletId=all&month=2026-10'), context());
    expect(summary.status).toBe(200);
    expect((await summary.json()).data.balance.totalBalance).toBe(0);
  });

  it('rolls back an accepted membership when repository fails after its write', async () => {
    const { wallet, memberships: rows } = await seedSharedWallet(owner, [{ userId: pending, status: 'pending' }]);
    const invitations = new WalletInvitationRepository();
    const original = invitations.accept.bind(invitations);
    vi.spyOn(invitations, 'accept').mockImplementation(async (...args) => { await original(...args); throw new Error('after accept'); });
    const service = new WalletInvitationService(invitations, memberships, repo, new UserRepository(), uow);
    await expect(service.respond(String(rows[0]._id), pending, 'accept')).rejects.toThrow('after accept');
    expect((await WalletMember.findById(rows[0]._id))!.status).toBe('pending');
    expect((await Wallet.findById(wallet._id))!.membershipVersion).toBe(0);
    expect((await detail(String(wallet._id), pending)).status).toBe(403);
  });

  it('accept racing Owner account deletion either blocks deletion or removes the invitation', async () => {
    const { wallet, memberships: rows } = await seedSharedWallet(owner, [{ userId: pending, status: 'pending' }]);
    const service = new DeleteAccountService(new UserRepository(), uow);
    const [deletion, acceptance] = await Promise.allSettled([service.execute(owner), accept(String(rows[0]._id))]);
    expect(acceptance.status).toBe('fulfilled');
    if (deletion.status === 'fulfilled') {
      expect(acceptance.status === 'fulfilled' && acceptance.value.status).toBe(404);
      expect(await Wallet.findById(wallet._id)).toBeNull();
      expect(await WalletMember.countDocuments({ walletId: wallet._id })).toBe(0);
    } else {
      expect(deletion.reason).toMatchObject({ code: 'CONFLICT' });
      expect(acceptance.status === 'fulfilled' && acceptance.value.status).toBe(200);
      expect(await User.findById(owner)).not.toBeNull();
      expect((await WalletMember.findById(rows[0]._id))!.status).toBe('accepted');
    }
  });

  it('inviting a user concurrently with account deletion leaves no orphaned membership', async () => {
    const { wallet } = await seedSharedWallet(owner);
    const service = new DeleteAccountService(new UserRepository(), uow);
    const [response] = await Promise.all([invite(String(wallet._id)), service.execute(pending)]);
    expect([201, 400]).toContain(response.status);
    expect(await User.findById(pending)).toBeNull();
    expect(await WalletMember.countDocuments({ userId: pending })).toBe(0);
  });

  it('new endpoints match generated OpenAPI response contracts', async () => {
    const { wallet } = await seedSharedWallet(owner);
    const response = await invite(String(wallet._id));
    const invitation = await response.json();
    const cases: [string, string, Response | unknown][] = [
      ['/api/v1/wallets/{id}/invitations', 'post', invitation],
      ['/api/v1/invitations', 'get', await inbox(pending)],
      ['/api/v1/invitations/{id}/accept', 'post', await accept(invitation.data.id)],
    ];
    const spec = buildSpec('v1');
    const ajv = new Ajv({ strict: false }); addFormats(ajv);
    for (const [path, method, value] of cases) {
      const body = value instanceof Response ? await value.json() : value;
      const op = spec.paths[path][method] as { responses: Record<string, { content: { 'application/json': { schema: object } } }> };
      const schema = op.responses[path.includes('/wallets/') ? '201' : '200'].content['application/json'].schema;
      const validate = ajv.compile(schema);
      expect(validate(body), JSON.stringify(validate.errors)).toBe(true);
    }
  });
});
