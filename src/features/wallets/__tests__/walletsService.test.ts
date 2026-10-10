import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createWallet,
  deleteWallet,
  getWallets,
  mapWalletRecord,
  updateWallet,
  updateWalletSaving,
} from "../walletsService";

describe("walletsService — mapWalletRecord", () => {
  it("maps regular daily wallet record to frontend Wallet structure", () => {
    const mapped = mapWalletRecord({
      id: "60d5ecb8b5c9c61234567890",
      name: "Main Cash",
      balance: 1500,
      isDefault: true,
      color: "#4A4757",
      isSaving: false,
    });

    expect(mapped.id).toBe("60d5ecb8b5c9c61234567890");
    expect(mapped.name).toBe("Main Cash");
    expect(mapped.balance).toBe(1500);
    expect(mapped.isDefault).toBe(true);
    expect(mapped.color).toBe("#4A4757");
    expect(mapped.isSaving).toBe(false);
    expect(mapped.savingGoal).toBeNull();
    expect(mapped.type).toBe("cash");
    expect(mapped.icon).toBeDefined();
  });

  it("maps saving wallet record with goalAmount to savingGoal", () => {
    const mapped = mapWalletRecord({
      id: "60d5ecb8b5c9c61234567891",
      name: "Emergency Fund",
      balance: 12000,
      isDefault: false,
      color: "#4E9466",
      isSaving: true,
      goalAmount: 30000,
    });

    expect(mapped.isSaving).toBe(true);
    expect(mapped.savingGoal).toBe(30000);
    expect(mapped.goalAmount).toBe(30000);
    expect(mapped.type).toBe("savings");
  });
});

describe("walletsService — API calls", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("getWallets calls GET /api/v1/wallets and returns mapped wallets", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: true,
        data: [
          {
            id: "60d5ecb8b5c9c61234567890",
            name: "Wallet 1",
            balance: 500,
            isDefault: true,
            color: "#4A4757",
            isSaving: false,
          },
        ],
      }),
    });

    const result = await getWallets();
    expect(global.fetch).toHaveBeenCalledWith("/api/v1/wallets", { credentials: "same-origin" });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Wallet 1");
    expect(result[0].balance).toBe(500);
  });

  it("getWallets throws on error response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        status: false,
        error: { message: "Unauthorized" },
      }),
    });

    await expect(getWallets()).rejects.toThrow("Unauthorized");
  });

  it("createWallet sends POST /api/v1/wallets with payload", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: true,
        data: {
          id: "60d5ecb8b5c9c61234567892",
          name: "Trip",
          balance: 0,
          color: "#8B7CF6",
          isSaving: true,
          goalAmount: 10000,
        },
      }),
    });

    const created = await createWallet({
      name: "Trip",
      color: "#8B7CF6",
      isSaving: true,
      goalAmount: 10000,
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/v1/wallets", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Trip",
        color: "#8B7CF6",
        isSaving: true,
        goalAmount: 10000,
      }),
    });
    expect(created.name).toBe("Trip");
    expect(created.isSaving).toBe(true);
    expect(created.savingGoal).toBe(10000);
  });

  it("updateWallet sends PUT /api/v1/wallets/:id with payload", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: true,
        data: {
          id: "60d5ecb8b5c9c61234567892",
          name: "Trip to Tokyo",
          balance: 0,
          color: "#EC4899",
        },
      }),
    });

    const updated = await updateWallet("60d5ecb8b5c9c61234567892", {
      name: "Trip to Tokyo",
      color: "#EC4899",
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/v1/wallets/60d5ecb8b5c9c61234567892", {
      method: "PUT",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Trip to Tokyo", color: "#EC4899" }),
    });
    expect(updated.name).toBe("Trip to Tokyo");
  });

  it("updateWalletSaving sends PATCH /api/v1/wallets/:id/saving", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: true,
        data: {
          id: "60d5ecb8b5c9c61234567892",
          name: "Trip",
          balance: 0,
          isSaving: true,
          goalAmount: 25000,
        },
      }),
    });

    const updated = await updateWalletSaving("60d5ecb8b5c9c61234567892", {
      isSaving: true,
      goalAmount: 25000,
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/v1/wallets/60d5ecb8b5c9c61234567892/saving", {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isSaving: true, goalAmount: 25000 }),
    });
    expect(updated.savingGoal).toBe(25000);
  });

  it("deleteWallet sends DELETE /api/v1/wallets/:id", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: true,
        data: null,
      }),
    });

    await deleteWallet("60d5ecb8b5c9c61234567892");

    expect(global.fetch).toHaveBeenCalledWith("/api/v1/wallets/60d5ecb8b5c9c61234567892", {
      method: "DELETE",
      credentials: "same-origin",
    });
  });
});

