// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WalletMultiSelect, walletSummaryLabel, type WalletOption } from "@/features/reports/components/WalletMultiSelect";

const PERSONAL: WalletOption[] = [
  { id: "w1", name: "Cash" },
  { id: "w2", name: "Bank" },
];
const WITH_SHARED: WalletOption[] = [...PERSONAL, { id: "s1", name: "Trip", isShared: true }];

describe("walletSummaryLabel", () => {
  it("names the selection", () => {
    expect(walletSummaryLabel([], [])).toBe("No wallets");
    expect(walletSummaryLabel(PERSONAL, [])).toBe("Select wallets");
    expect(walletSummaryLabel(PERSONAL, ["w1", "w2"])).toBe("All wallets (2)");
    expect(walletSummaryLabel(PERSONAL, ["w2"])).toBe("Bank");
  });

  it("tells all personal wallets from all wallets once a shared wallet exists", () => {
    expect(walletSummaryLabel(WITH_SHARED, ["w1", "w2"])).toBe("All personal wallets (2)");
    expect(walletSummaryLabel(WITH_SHARED, ["w1", "w2", "s1"])).toBe("All wallets (3)");
    expect(walletSummaryLabel(WITH_SHARED, ["w1", "s1"])).toBe("Cash, Trip");
    expect(walletSummaryLabel(WITH_SHARED, ["s1"])).toBe("Trip");
  });
});

describe("WalletMultiSelect", () => {
  afterEach(() => cleanup());

  it("lists wallets without group headings when there is no shared wallet", () => {
    render(<WalletMultiSelect wallets={PERSONAL} selectedIds={["w1", "w2"]} onChange={() => {}} onSelectAll={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Wallets" }));

    expect(screen.getByRole("checkbox", { name: "Cash" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Personal" })).not.toBeInTheDocument();
  });

  it("groups personal and shared wallets and keeps the picked ids in list order", () => {
    const onChange = vi.fn();
    render(<WalletMultiSelect wallets={WITH_SHARED} selectedIds={["w2"]} onChange={onChange} onSelectAll={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Wallets" }));

    expect(screen.getByRole("heading", { name: "Personal" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Shared" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: "Trip" }));
    expect(onChange).toHaveBeenCalledWith(["w2", "s1"]);
  });
});
