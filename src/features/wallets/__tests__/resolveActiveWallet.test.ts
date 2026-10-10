import { describe, expect, it } from "vitest";

import {
  resolveActiveWalletId,
  selectWallet,
  type WalletRef,
} from "../resolveActiveWallet";

describe("resolveActiveWalletId", () => {
  const sampleWallets: WalletRef[] = [
    { id: "wallet-1", isDefault: false },
    { id: "wallet-2", isDefault: true },
    { id: "wallet-3", isDefault: false },
  ];

  it("returns stored id when it exists in the user's wallets", () => {
    expect(resolveActiveWalletId("wallet-1", sampleWallets)).toBe("wallet-1");
    expect(resolveActiveWalletId("wallet-2", sampleWallets)).toBe("wallet-2");
    expect(resolveActiveWalletId("wallet-3", sampleWallets)).toBe("wallet-3");
  });

  it("falls back to the default wallet when the stored id was deleted / does not exist", () => {
    expect(resolveActiveWalletId("deleted-wallet", sampleWallets)).toBe("wallet-2");
  });

  it("falls back to the default wallet when storedId is null or undefined", () => {
    expect(resolveActiveWalletId(null, sampleWallets)).toBe("wallet-2");
    expect(resolveActiveWalletId(undefined, sampleWallets)).toBe("wallet-2");
  });

  it("falls back to the first wallet when the stored id is invalid and no wallet has isDefault", () => {
    const noDefaultWallets: WalletRef[] = [
      { id: "wallet-first", isDefault: false },
      { id: "wallet-second", isDefault: false },
    ];
    expect(resolveActiveWalletId("deleted-wallet", noDefaultWallets)).toBe("wallet-first");
    expect(resolveActiveWalletId(null, noDefaultWallets)).toBe("wallet-first");
  });

  it("returns null if the user has no wallets", () => {
    expect(resolveActiveWalletId("any-id", [])).toBeNull();
    expect(resolveActiveWalletId(null, [])).toBeNull();
  });

  it("preserves stored id while wallets are loading (undefined)", () => {
    expect(resolveActiveWalletId("saved-id", undefined)).toBe("saved-id");
    expect(resolveActiveWalletId(null, undefined)).toBeNull();
  });
});

describe("selectWallet", () => {
  const sampleWallets: WalletRef[] = [
    { id: "wallet-1" },
    { id: "wallet-2" },
  ];

  it("accepts selecting an existing/owned wallet", () => {
    const result = selectWallet("wallet-2", "wallet-1", sampleWallets);
    expect(result).toEqual({ selectedId: "wallet-2", accepted: true });
  });

  it("rejects selecting a non-existent or unauthorized wallet, keeping current wallet selected", () => {
    const result = selectWallet("unauthorized-wallet", "wallet-1", sampleWallets);
    expect(result).toEqual({ selectedId: "wallet-1", accepted: false });
  });

  it("rejects selection when availableWallets is undefined, keeping current wallet selected", () => {
    const result = selectWallet("wallet-1", "current-wallet", undefined);
    expect(result).toEqual({ selectedId: "current-wallet", accepted: false });
  });
});

