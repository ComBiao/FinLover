import { beforeEach, describe, expect, it } from "vitest";

import { ApiClientError } from "@/lib/api/client";
import {
  mockAcceptInvitation,
  mockCreateTransaction,
  mockCreateWallet,
  mockDeclineInvitation,
  mockDeleteTransaction,
  mockDeleteWallet,
  mockHomeSummary,
  mockInviteMember,
  mockLeaveWallet,
  mockListInvitations,
  mockListMembers,
  mockListTransactions,
  mockListWallets,
  mockRemoveMember,
  mockSetSaving,
  mockTransferOwnership,
  mockUpdateTransaction,
  resetMockStore,
} from "../mock/sharedWalletMockStore";

const HOUSEMATE = "mock-wallet-housemate"; // the signed-in user is the Owner
const JAPAN = "mock-wallet-japan"; // the signed-in user is a Contributor
const OFFICE = "mock-wallet-office"; // only invited

const thisMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

async function rejection(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error as ApiClientError;
  }
  throw new Error("expected the call to reject");
}

beforeEach(() => resetMockStore({ meName: "Tul" }));

describe("shared wallet mock store — wallets", () => {
  it("lists only the wallets the user has joined, with role and member info", async () => {
    const wallets = await mockListWallets();

    expect(wallets.map((wallet) => wallet.name)).toEqual(["Housemate Fund", "Japan Trip 2027"]);
    const housemate = wallets[0];
    expect(housemate).toMatchObject({ isShared: true, role: "owner", memberCount: 3, ownerName: "Tul" });
    expect((housemate.members ?? []).map((member) => member.name)).toEqual(["Tul", "Guy", "Ice"]);
    expect(wallets[1]).toMatchObject({ role: "contributor", ownerName: "Bushi", memberCount: 4 });
  });

  it("derives the balance from the wallet's transactions", async () => {
    const [housemate] = await mockListWallets();
    // 6000 + 6000 income, 350 + 1420 + 599 + 240 expense
    expect(housemate.balance).toBe(12000 - 2609);
  });

  it("creates a shared wallet owned by the user, starting at 0", async () => {
    const created = await mockCreateWallet({ name: "Trip", color: "#3B82F6", icon: "Plane" });

    expect(created).toMatchObject({ name: "Trip", balance: 0, role: "owner", memberCount: 1, isShared: true });
    expect((await mockListWallets()).map((wallet) => wallet.name)).toContain("Trip");
  });

  it("only the owner may change the saving goal or delete the wallet", async () => {
    expect((await rejection(mockSetSaving(JAPAN, { isSaving: false }))).status).toBe(403);
    expect((await rejection(mockDeleteWallet(JAPAN))).status).toBe(403);

    await mockSetSaving(HOUSEMATE, { isSaving: true, goalAmount: 5000 });
    await mockDeleteWallet(HOUSEMATE);
    expect((await mockListWallets()).map((wallet) => wallet.id)).not.toContain(HOUSEMATE);
  });
});

describe("shared wallet mock store — members", () => {
  it("lists the owner first and pending invitations last", async () => {
    const members = await mockListMembers(HOUSEMATE);

    expect(members.map((member) => [member.name, member.role, member.status])).toEqual([
      ["Tul", "owner", "accepted"],
      ["Guy", "contributor", "accepted"],
      ["Ice", "contributor", "accepted"],
      ["Yeen", "contributor", "pending"],
    ]);
    expect(members[0].isYou).toBe(true);
  });

  it("invites a registered user as a pending Contributor", async () => {
    const member = await mockInviteMember(HOUSEMATE, " Nook@Example.com ");

    expect(member).toMatchObject({ name: "Nook", status: "pending", role: "contributor" });
    expect((await mockListMembers(HOUSEMATE)).some((row) => row.name === "Nook")).toBe(true);
  });

  it("rejects an unknown email, the user's own email and a duplicate", async () => {
    const unknown = await rejection(mockInviteMember(HOUSEMATE, "unknown@example.com"));
    expect(unknown).toMatchObject({ status: 400, message: "User not found", fields: { email: "User not found" } });

    const self = await rejection(mockInviteMember(HOUSEMATE, "you@example.com"));
    expect(self).toMatchObject({ status: 400, fields: { email: "Cannot invite yourself" } });

    expect((await rejection(mockInviteMember(HOUSEMATE, "guy@example.com"))).status).toBe(409);
    expect((await rejection(mockInviteMember(HOUSEMATE, "yeen@example.com"))).status).toBe(409);
  });

  it("a Contributor cannot invite or remove members", async () => {
    expect((await rejection(mockInviteMember(JAPAN, "boss@example.com"))).status).toBe(403);
    expect((await rejection(mockRemoveMember(JAPAN, "mock-user-nook"))).status).toBe(403);
  });

  it("removing a member keeps their past transactions", async () => {
    await mockRemoveMember(HOUSEMATE, "mock-user-guy");

    const members = await mockListMembers(HOUSEMATE);
    expect(members.map((member) => member.name)).not.toContain("Guy");
    const rows = await mockListTransactions(HOUSEMATE, thisMonth());
    expect(rows.some((row) => row.createdBy.name === "Guy")).toBe(true);
  });

  it("cancels a pending invitation by removing it", async () => {
    await mockRemoveMember(HOUSEMATE, "mock-user-yeen");
    expect((await mockListMembers(HOUSEMATE)).some((member) => member.status === "pending")).toBe(false);
  });

  it("the owner cannot be removed", async () => {
    expect((await rejection(mockRemoveMember(HOUSEMATE, "mock-user-me"))).status).toBe(400);
  });

  it("a Contributor can leave at any time", async () => {
    await mockLeaveWallet(JAPAN);
    expect((await mockListWallets()).map((wallet) => wallet.id)).not.toContain(JAPAN);
  });

  it("the Owner must transfer ownership before leaving while others remain", async () => {
    expect((await rejection(mockLeaveWallet(HOUSEMATE))).status).toBe(409);

    await mockTransferOwnership(HOUSEMATE, "mock-user-guy");
    const [housemate] = await mockListWallets();
    expect(housemate).toMatchObject({ role: "contributor", ownerName: "Guy" });

    await mockLeaveWallet(HOUSEMATE);
    expect((await mockListWallets()).map((wallet) => wallet.id)).not.toContain(HOUSEMATE);
  });

  it("ownership can only go to an accepted Contributor", async () => {
    expect((await rejection(mockTransferOwnership(HOUSEMATE, "mock-user-yeen"))).status).toBe(400);
    expect((await rejection(mockTransferOwnership(JAPAN, "mock-user-guy"))).status).toBe(403);
  });
});

describe("shared wallet mock store — invitations", () => {
  it("lists the invitations addressed to the user, newest first", async () => {
    const invitations = await mockListInvitations();

    expect(invitations.map((invitation) => [invitation.walletName, invitation.invitedByName])).toEqual([
      ["Office Lunch", "Yeen"],
      ["Weekend Trip", "Bushi"],
    ]);
  });

  it("accepting joins the wallet as a Contributor", async () => {
    const [invitation] = await mockListInvitations();
    await mockAcceptInvitation(invitation.id);

    expect((await mockListInvitations()).map((row) => row.walletName)).toEqual(["Weekend Trip"]);
    const joined = (await mockListWallets()).find((wallet) => wallet.id === OFFICE);
    expect(joined).toMatchObject({ role: "contributor", memberCount: 2 });
  });

  it("declining removes the invitation without joining", async () => {
    const [invitation] = await mockListInvitations();
    await mockDeclineInvitation(invitation.id);

    expect((await mockListInvitations()).map((row) => row.walletName)).toEqual(["Weekend Trip"]);
    expect((await mockListWallets()).map((wallet) => wallet.id)).not.toContain(OFFICE);
  });

  it("an unknown invitation is a 404", async () => {
    expect((await rejection(mockAcceptInvitation("mock-invite-nope"))).status).toBe(404);
  });
});

describe("shared wallet mock store — transactions", () => {
  it("lists a month's rows newest first, with who logged and who edited them", async () => {
    const rows = await mockListTransactions(HOUSEMATE, thisMonth());

    expect(rows.map((row) => row.title)).toEqual([
      "Groceries",
      "Electricity bill",
      "Rent share",
      "Internet",
      "Rent share",
      "Cleaning supplies",
    ]);
    expect(rows[1]).toMatchObject({
      createdBy: { name: "Tul", isYou: true },
      editedBy: { name: "Guy", isYou: false },
      categoryId: null,
    });
    expect(rows[0].editedBy).toBeUndefined();
  });

  it("only members can read or record transactions", async () => {
    expect((await rejection(mockListTransactions(OFFICE, thisMonth()))).status).toBe(403);
    expect(
      (await rejection(mockCreateTransaction({ walletId: OFFICE, type: "expense", amount: 10, date: `${thisMonth()}-01`, title: "x" }))).status
    ).toBe(403);
  });

  it("records a transaction under the user's name and moves the balance", async () => {
    const before = (await mockListWallets())[0].balance;
    const created = await mockCreateTransaction({
      walletId: HOUSEMATE,
      type: "expense",
      amount: 350,
      date: `${thisMonth()}-02`,
      title: "Coffee",
    });

    expect(created.createdBy).toMatchObject({ name: "Tul", isYou: true });
    expect((await mockListWallets())[0].balance).toBe(before - 350);
  });

  it("rejects a category on a shared wallet", async () => {
    const error = await rejection(
      mockCreateTransaction({ walletId: HOUSEMATE, type: "expense", amount: 10, date: `${thisMonth()}-02`, title: "x", categoryId: "c1" })
    );
    expect(error.status).toBe(400);
  });

  it("any member may edit a row; the editor shows only when it is not the author", async () => {
    // "Groceries" was logged by Guy; the signed-in user (Tul) edits it.
    const [groceries] = await mockListTransactions(HOUSEMATE, thisMonth());
    const edited = await mockUpdateTransaction(groceries.id, {
      type: "expense",
      amount: 400,
      date: groceries.date,
      title: groceries.title,
    });
    expect(edited).toMatchObject({ amount: 400, createdBy: { name: "Guy" }, editedBy: { name: "Tul", isYou: true } });

    // Editing a row the user logged herself clears "edited by".
    const own = (await mockListTransactions(HOUSEMATE, thisMonth())).find((row) => row.title === "Electricity bill")!;
    const ownEdited = await mockUpdateTransaction(own.id, { type: "expense", amount: 1500, date: own.date, title: own.title });
    expect(ownEdited.editedBy).toBeUndefined();
  });

  it("deleting a row returns its amount to the balance", async () => {
    const before = (await mockListWallets())[0].balance;
    const [groceries] = await mockListTransactions(HOUSEMATE, thisMonth());
    await mockDeleteTransaction(groceries.id);

    expect((await mockListWallets())[0].balance).toBe(before + 350);
  });
});

describe("shared wallet mock store — home summary", () => {
  it("totals the month across every member and has no top categories", async () => {
    const summary = await mockHomeSummary(thisMonth(), HOUSEMATE);

    expect(summary).toMatchObject({
      walletId: HOUSEMATE,
      income: 12000,
      expense: 2609,
      net: { net: 9391, status: "surplus" },
      topCategories: [],
    });
    expect(summary.balance).toMatchObject({ hasWallets: true, totalBalance: 9391, savingGoal: null });
  });

  it("reports progress for a saving wallet", async () => {
    const summary = await mockHomeSummary(thisMonth(), JAPAN);

    expect(summary.balance.savingGoal).toMatchObject({ goal: 60000, current: 5500, reached: false });
  });

  it("is members only", async () => {
    expect((await rejection(mockHomeSummary(thisMonth(), OFFICE))).status).toBe(403);
  });
});
