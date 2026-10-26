import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getHomeSummary } from "@/features/homepage/services/homeService";
import {
  createTransaction,
  deleteTransaction,
  getSharedWalletTransactions,
  updateTransaction,
} from "@/features/transactions/transactionsService";
import { createWallet, deleteWallet, getWallets, mapWalletRecord } from "@/features/wallets/walletsService";
import { acceptInvitation, getInvitations } from "../invitationsService";
import { getMembers, inviteMember } from "../membersService";

const fetchMock = vi.fn();

function ok(data: unknown) {
  return Response.json({ status: true, data });
}

const month = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const walletId = "64b0000000000000000000a1";

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("walletsService shared wallets", () => {
  it("returns the wallets the API sends, shared ones included", async () => {
    fetchMock.mockResolvedValue(
      ok([
        { id: walletId, name: "Cash", balance: 100, isDefault: true, isSaving: false },
        { id: "64b0000000000000000000b2", name: "Pool", balance: 0, isShared: true, role: "owner", memberCount: 2, ownerName: "Tul" },
      ])
    );

    const wallets = await getWallets();

    expect(wallets.map((wallet) => [wallet.name, Boolean(wallet.isShared)])).toEqual([
      ["Cash", false],
      ["Pool", true],
    ]);
    expect(wallets[1]).toMatchObject({ role: "owner", memberCount: 2, ownerName: "Tul" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("maps the shared fields the backend record carries", () => {
    const wallet = mapWalletRecord({
      id: "64b0000000000000000000b2",
      name: "Pool",
      balance: 0,
      isShared: true,
      role: "contributor",
      memberCount: 4,
      members: [{ id: "u1", name: "Bushi" }],
      ownerName: "Bushi",
    });

    expect(wallet).toMatchObject({ isShared: true, role: "contributor", memberCount: 4, ownerName: "Bushi" });
    expect(mapWalletRecord({ id: "1", name: "Plain", balance: 0 })).not.toHaveProperty("isShared");
  });

  it("creates a shared wallet through POST /api/v1/wallets with isShared", async () => {
    fetchMock.mockResolvedValue(
      ok({ id: "64b0000000000000000000c3", name: "Trip", balance: 0, isShared: true, role: "owner", memberCount: 1 })
    );

    const shared = await createWallet({ name: "Trip", isShared: true });

    expect(shared).toMatchObject({ name: "Trip", isShared: true, role: "owner" });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/wallets",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ name: "Trip", isShared: true }) })
    );
  });

  it("deletes a wallet through the API", async () => {
    fetchMock.mockResolvedValue(ok(null));

    await deleteWallet(walletId);

    expect(fetchMock).toHaveBeenCalledWith(`/api/v1/wallets/${walletId}`, expect.objectContaining({ method: "DELETE" }));
  });
});

describe("transactionsService shared wallets", () => {
  it("reads a shared wallet's month from the API with its author fields", async () => {
    fetchMock.mockResolvedValue(
      ok([
        {
          id: "t1",
          walletId,
          categoryId: null,
          type: "expense",
          amount: 10,
          date: "2026-10-03",
          title: "Tea",
          category: { key: "food-drinks" },
          createdBy: { id: "u1", name: "Guy", isYou: false },
          editedBy: { id: "u2", name: "Tul", isYou: true },
        },
      ])
    );

    const [row] = await getSharedWalletTransactions(walletId, month());

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/api/v1/wallets/${walletId}/transactions?month=`),
      expect.anything()
    );
    expect(row).toMatchObject({
      categoryKey: "food-drinks",
      createdBy: { name: "Guy" },
      editedBy: { name: "Tul", isYou: true },
    });
  });

  it("sends create, update and delete to /api/v1/transactions, with categoryKey for a shared wallet", async () => {
    const dto = { id: "t9", walletId, categoryId: null, type: "expense", amount: 5, date: "2026-10-03", title: "Gum" };
    fetchMock.mockImplementation(async () => ok(dto));

    await createTransaction({
      walletId,
      categoryKey: "shopping",
      type: "expense",
      amount: 5,
      date: new Date(2026, 9, 3),
      title: "Gum",
    });
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/v1/transactions",
      expect.objectContaining({ method: "POST" })
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ categoryKey: "shopping" });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty("categoryId");

    await updateTransaction("t9", {
      walletId,
      categoryKey: "shopping",
      type: "expense",
      amount: 6,
      date: new Date(2026, 9, 3),
      title: "Gum",
    });
    expect(fetchMock).toHaveBeenLastCalledWith("/api/v1/transactions/t9", expect.objectContaining({ method: "PUT" }));

    fetchMock.mockResolvedValue(ok(null));
    await deleteTransaction("t9");
    expect(fetchMock).toHaveBeenLastCalledWith("/api/v1/transactions/t9", expect.objectContaining({ method: "DELETE" }));
  });
});

describe("homeService", () => {
  it("passes any wallet id, shared included, to the home summary API", async () => {
    fetchMock.mockResolvedValue(
      ok({ month: month(), walletId, balance: { hasWallets: true, totalBalance: 1, savingGoal: null }, income: 0, expense: 0, net: { net: 0, status: "even" }, topCategories: [] })
    );

    await getHomeSummary(month(), walletId);

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining(`walletId=${walletId}`), expect.anything());
  });
});

describe("members and invitations services", () => {
  it("call the real members and invitations endpoints", async () => {
    fetchMock.mockResolvedValue(ok({ members: [{ userId: "u1", name: "Guy", email: "guy@example.com", role: "owner", status: "accepted" }] }));
    expect((await getMembers(walletId)).map((member) => member.name)).toEqual(["Guy"]);
    expect(fetchMock).toHaveBeenLastCalledWith(`/api/v1/wallets/${walletId}/members`, expect.anything());

    fetchMock.mockResolvedValue(ok({ items: [], total: 0 }));
    expect(await getInvitations()).toEqual([]);
    expect(fetchMock).toHaveBeenLastCalledWith("/api/v1/invitations", expect.anything());

    fetchMock.mockResolvedValue(ok(null));
    await acceptInvitation("inv1");
    expect(fetchMock).toHaveBeenLastCalledWith("/api/v1/invitations/inv1/accept", expect.objectContaining({ method: "POST" }));
  });

  it("invites a member by email", async () => {
    fetchMock.mockResolvedValue(ok({ userId: "u9", name: "Boss", email: "boss@example.com", role: "contributor", status: "pending", isYou: false }));

    await inviteMember(walletId, "boss@example.com");

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/wallets/${walletId}/invitations`,
      expect.objectContaining({ method: "POST", body: JSON.stringify({ email: "boss@example.com" }) })
    );
  });
});
