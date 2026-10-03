// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, fireEvent, screen, waitFor, cleanup } from "@testing-library/react";

import { AddTransactionModal } from "../components/AddTransactionModal";
import { useTransactionModal } from "../store/useTransactionModal";
import { ApiClientError } from "@/lib/api/client";
import { MOCK_WALLETS } from "@/mocks/mockWallets";

beforeEach(() => {
  useTransactionModal.setState({
    isOpen: false,
    defaultType: "expense",
    editingTransaction: null,
    deletingTransaction: null,
  });
});
afterEach(() => cleanup());

/** Fills every required field (title, amount, date, wallet) via the real UI. */
async function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Grab ride" } });
  fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "120" } });
  fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-10-03" } });

  fireEvent.click(screen.getByLabelText("Wallet"));
  const option = await screen.findByText(MOCK_WALLETS[0].name);
  fireEvent.click(option);
}

describe("AddTransactionModal — US3-1 async create (Add mode only)", () => {
  it("awaits onAdd, stays open and disabled until it resolves, then closes", async () => {
    let resolveAdd!: () => void;
    const onAdd = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveAdd = resolve;
        })
    );
    useTransactionModal.setState({ isOpen: true, defaultType: "expense", editingTransaction: null });
    render(<AddTransactionModal onAdd={onAdd} />);

    await fillRequiredFields();
    fireEvent.click(screen.getByText("Save transaction"));

    // Pending: onAdd was called, the modal is still open and the submit
    // button is disabled — can't double-submit or dismiss mid-request.
    await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(1));
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Grab ride", amount: 120, walletId: MOCK_WALLETS[0].id })
    );
    expect(screen.getByText("Saving…")).toBeDisabled();
    expect(useTransactionModal.getState().isOpen).toBe(true);

    resolveAdd();
    await waitFor(() => expect(useTransactionModal.getState().isOpen).toBe(false));
  });

  it("shows the server's error and keeps the modal open when onAdd rejects", async () => {
    const onAdd = vi.fn().mockRejectedValue(new ApiClientError("Wallet not found", 404));
    useTransactionModal.setState({ isOpen: true, defaultType: "expense", editingTransaction: null });
    render(<AddTransactionModal onAdd={onAdd} />);

    await fillRequiredFields();
    fireEvent.click(screen.getByText("Save transaction"));

    expect(await screen.findByRole("alert")).toHaveTextContent("Wallet not found");
    expect(useTransactionModal.getState().isOpen).toBe(true);
  });
});
