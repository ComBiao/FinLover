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
import { isMockTarget, sharedWalletMocksEnabled } from "../mockFlag";
import { resetMockStore } from "../mock/sharedWalletMockStore";

const fetchMock = vi.fn();

function ok(data: unknown) {
  return Response.json({ status: true, data });
}

const month = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  resetMockStore({ meName: "Tul" });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("mock flag", () => {
  it("is off by default and opt-in via NEXT_PUBLIC_SHARED_WALLET_MOCKS=true", () => {
    expect(sharedWalletMocksEnabled()).toBe(false);

    vi.stubEnv("NEXT_PUBLIC_SHARED_WALLET_MOCKS", "true");
    expect(sharedWalletMocksEnabled()).toBe(true);

    vi.stubEnv("NEXT_PUBLIC_SHARED_WALLET_MOCKS", "");
    expect(sharedWalletMocksEnabled()).toBe(false);

    vi.stubEnv("NEXT_PUBLIC_SHARED_WALLET_MOCKS", "false");
    expect(sharedWalletMocksEnabled()).toBe(false);
  });

  it("only treats mock-prefixed ids as mock targets while the flag is on", () => {
    expect(isMockTarget("mock-wallet-housemate")).toBe(false);

    vi.stubEnv("NEXT_PUBLIC_SHARED_WALLET_MOCKS", "true");
    expect(isMockTarget("mock-wallet-housemate")).toBe(true);
    expect(isMockTarget("64b0000000000000000000a1")).toBe(false);
    expect(isMockTarget(undefined)).toBe(false);
  });
});

describe("walletsService with the mock layer", () => {
  it("adds the shared wallets after the real ones when the flag is on", async () => {
    vi.stubEnv("NEXT_PUBLIC_SHARED_WALLET_MOCKS", "true");
    fetchMock.mockResolvedValue(
      ok([{ id: "64b0000000000000000000a1", name: "Cash", balance: 100, isDefault: true, isSaving: false }])
    );

    const wallets = await getWallets();

    expect(wallets.map((wallet) => [wallet.name, Boolean(wallet.isShared)])).toEqual([
      ["Cash", false],
      ["Housemate Fund", true],
      ["Japan Trip 2027", true],
    ]);
    expect(wallets[1]).toMatchObject({ role: "owner", memberCount: 3, ownerName: "Tul" });
  });

  it("returns only the API's wallets when the flag is off", async () => {
    fetchMock.mockResolvedValue(
      ok([{ id: "64b0000000000000000000a1", name: "Cash", balance: 100, isDefault: true, isSaving: false }])
    );

    expect((await getWallets()).map((wallet) => wallet.name)).toEqual(["Cash"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("maps the shared fields a real backend record will carry", () => {
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

  it("creates a shared wallet in the mock store, but a personal one through the API", async () => {
    vi.stubEnv("NEXT_PUBLIC_SHARED_WALLET_MOCKS", "true");

    const shared = await createWallet({ name: "Trip", isShared: true });
    expect(shared).toMatchObject({ name: "Trip", isShared: true, role: "owner" });
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockResolvedValue(ok({ id: "64b0000000000000000000c3", name: "Cash", balance: 0, isDefault: false, isSaving: false }));
    await createWallet({ name: "Cash" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("deletes a mock wallet locally and a real one through the API", async () => {
    vi.stubEnv("NEXT_PUBLIC_SHARED_WALLET_MOCKS", "true");

    await deleteWallet("mock-wallet-housemate");
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockResolvedValue(ok(null));
    await deleteWallet("64b0000000000000000000a1");
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/wallets/64b0000000000000000000a1", expect.objectContaining({ method: "DELETE" }));
  });
});

describe("transactionsService with the mock layer", () => {
  it("reads a shared wallet's month from the mock store when on, from the API when off", async () => {
    vi.stubEnv("NEXT_PUBLIC_SHARED_WALLET_MOCKS", "true");
    const rows = await getSharedWalletTransactions("mock-wallet-housemate", month());
    expect(rows).toHaveLength(6);
    expect(rows[0]).toMatchObject({ title: "Groceries", createdBy: { name: "Guy" } });
    expect(fetchMock).not.toHaveBeenCalled();

    vi.unstubAllEnvs();
    fetchMock.mockResolvedValue(
      ok([
        {
          id: "t1",
          walletId: "64b0000000000000000000d4",
          categoryId: null,
          type: "expense",
          amount: 10,
          date: "2026-10-03",
          title: "Tea",
          createdBy: { id: "u1", name: "Guy", isYou: false },
          editedBy: { id: "u2", name: "Tul", isYou: true },
        },
      ])
    );
    const [real] = await getSharedWalletTransactions("64b0000000000000000000d4", month());
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/v1/wallets/64b0000000000000000000d4/transactions?month="), expect.anything());
    expect(real).toMatchObject({ createdBy: { name: "Guy" }, editedBy: { name: "Tul", isYou: true } });
  });

  it("routes create, update and delete for mock ids to the store", async () => {
    vi.stubEnv("NEXT_PUBLIC_SHARED_WALLET_MOCKS", "true");

    const created = await createTransaction({
      walletId: "mock-wallet-housemate",
      type: "expense",
      amount: 50,
      date: new Date(2026, 9, 3),
      title: "Snacks",
    });
    expect(created).toMatchObject({ title: "Snacks", createdBy: { isYou: true } });

    const updated = await updateTransaction(created.id, {
      walletId: "mock-wallet-housemate",
      type: "expense",
      amount: 60,
      date: new Date(2026, 9, 3),
      title: "Snacks",
    });
    expect(updated.amount).toBe(60);

    await deleteTransaction(created.id);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("still sends a real wallet's transaction to the API", async () => {
    vi.stubEnv("NEXT_PUBLIC_SHARED_WALLET_MOCKS", "true");
    fetchMock.mockResolvedValue(
      ok({ id: "t9", walletId: "64b0000000000000000000a1", categoryId: null, type: "expense", amount: 5, date: "2026-10-03", title: "Gum" })
    );

    await createTransaction({ walletId: "64b0000000000000000000a1", type: "expense", amount: 5, date: new Date(2026, 9, 3), title: "Gum" });

    expect(fetchMock).toHaveBeenCalledWith("/api/v1/transactions", expect.objectContaining({ method: "POST" }));
  });
});

describe("homeService with the mock layer", () => {
  it("answers for a mock shared wallet and passes a real wallet to the API", async () => {
    vi.stubEnv("NEXT_PUBLIC_SHARED_WALLET_MOCKS", "true");
    const summary = await getHomeSummary(month(), "mock-wallet-housemate");
    expect(summary.balance.totalBalance).toBe(9391);
    expect(summary.topCategories).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockResolvedValue(
      ok({ month: month(), walletId: "all", balance: { hasWallets: true, totalBalance: 1, savingGoal: null }, income: 0, expense: 0, net: { net: 0, status: "even" }, topCategories: [] })
    );
    await getHomeSummary(month(), "all");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("members and invitations services", () => {
  it("use the mock store for mock wallets and the API otherwise", async () => {
    vi.stubEnv("NEXT_PUBLIC_SHARED_WALLET_MOCKS", "true");

    expect((await getMembers("mock-wallet-housemate")).map((member) => member.name)).toContain("Guy");
    expect((await getInvitations()).map((invitation) => invitation.walletName)).toContain("Office Lunch");
    await acceptInvitation("mock-invite-mock-wallet-office");
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockResolvedValue(ok({ userId: "u9", name: "Boss", email: "boss@example.com", role: "contributor", status: "pending", isYou: false }));
    await inviteMember("64b0000000000000000000e5", "boss@example.com");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/wallets/64b0000000000000000000e5/invitations",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ email: "boss@example.com" }) })
    );
  });

  it("call the real invitations endpoint once the mocks are off", async () => {
    fetchMock.mockResolvedValue(ok([]));

    expect(await getInvitations()).toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/invitations", expect.anything());
  });
});
