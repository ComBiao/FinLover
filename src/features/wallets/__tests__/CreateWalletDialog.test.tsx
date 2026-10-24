// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

import { ApiClientError } from "@/lib/api/client";
import { PERSONAL_WALLET, OWNED_SHARED_WALLET } from "@/test/shared-wallet-fixtures";
import { CreateWalletDialog } from "../components/CreateWalletDialog";
import * as membersService from "../shared/membersService";
import * as walletsService from "../walletsService";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

function renderDialog(onOpenChange = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <CreateWalletDialog open onOpenChange={onOpenChange} />
    </QueryClientProvider>
  );
  return { onOpenChange };
}

const sharedSwitch = () => screen.getByRole("switch", { name: "This is a shared wallet with other people" });
const savingSwitch = () => screen.getByRole("switch", { name: "This is a saving wallet with a goal" });

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("CreateWalletDialog — switches", () => {
  it("uses switches for the saving and shared options, both off by default", () => {
    renderDialog();

    expect(savingSwitch()).toHaveAttribute("aria-checked", "false");
    expect(sharedSwitch()).toHaveAttribute("aria-checked", "false");
    expect(screen.queryByLabelText(/Invite members/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Saving Goal (฿)")).not.toBeInTheDocument();
  });

  it("keeps the colour and the 13 icons of the original dialog", () => {
    renderDialog();

    expect(screen.getAllByRole("button", { name: /^Select color/ })).toHaveLength(10);
    expect(screen.getAllByRole("button", { name: /^Select .* icon$/ })).toHaveLength(13);
  });

  it("shows the goal field only while the saving switch is on", () => {
    renderDialog();

    fireEvent.click(savingSwitch());
    expect(screen.getByLabelText("Saving Goal (฿)")).toBeInTheDocument();

    fireEvent.click(savingSwitch());
    expect(screen.queryByLabelText("Saving Goal (฿)")).not.toBeInTheDocument();
  });

  it("shows the invite field only while the shared switch is on", () => {
    renderDialog();

    fireEvent.click(sharedSwitch());
    expect(screen.getByLabelText(/Invite members/)).toBeInTheDocument();
    expect(screen.getByText(/The wallet starts at ฿0.00 and you are the Owner/)).toBeInTheDocument();

    fireEvent.click(sharedSwitch());
    expect(screen.queryByLabelText(/Invite members/)).not.toBeInTheDocument();
  });
});

describe("CreateWalletDialog — invitations", () => {
  it("turns an email into a removable chip on Enter and ignores duplicates", () => {
    renderDialog();
    fireEvent.click(sharedSwitch());
    const input = screen.getByLabelText(/Invite members/);

    fireEvent.change(input, { target: { value: "Yeen@Example.com " } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.change(input, { target: { value: "yeen@example.com" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(screen.getAllByText("yeen@example.com")).toHaveLength(1);
    expect(input).toHaveValue("");

    fireEvent.click(screen.getByRole("button", { name: "Remove yeen@example.com" }));
    expect(screen.queryByText("yeen@example.com")).not.toBeInTheDocument();
  });

  it("rejects an address that is not an email", () => {
    renderDialog();
    fireEvent.click(sharedSwitch());
    const input = screen.getByLabelText(/Invite members/);

    fireEvent.change(input, { target: { value: "not-an-email" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email address");
  });

  it("creates a shared wallet, then invites each email", async () => {
    const createWallet = vi.spyOn(walletsService, "createWallet").mockResolvedValue(OWNED_SHARED_WALLET);
    const inviteMember = vi.spyOn(membersService, "inviteMember").mockResolvedValue({
      userId: "u1", name: "Yeen", email: "yeen@example.com", role: "contributor", status: "pending", isYou: false,
    });
    const { onOpenChange } = renderDialog();

    fireEvent.change(screen.getByLabelText("Wallet Name"), { target: { value: "Housemate Fund" } });
    fireEvent.click(sharedSwitch());
    const input = screen.getByLabelText(/Invite members/);
    fireEvent.change(input, { target: { value: "yeen@example.com" } });
    fireEvent.keyDown(input, { key: "Enter" });
    // A typed-but-not-added email still counts when the form is submitted.
    fireEvent.change(input, { target: { value: "ice@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Wallet" }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(createWallet).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Housemate Fund", isShared: true, isSaving: false })
    );
    expect(createWallet.mock.calls[0][0]).not.toHaveProperty("inviteEmails");
    expect(inviteMember).toHaveBeenCalledTimes(2);
    expect(inviteMember).toHaveBeenCalledWith(OWNED_SHARED_WALLET.id, "yeen@example.com");
    expect(inviteMember).toHaveBeenCalledWith(OWNED_SHARED_WALLET.id, "ice@example.com");
    expect(toast.success).toHaveBeenCalledWith('Shared wallet "Housemate Fund" created');
  });

  it("keeps the wallet and reports an invitation that fails", async () => {
    vi.spyOn(walletsService, "createWallet").mockResolvedValue(OWNED_SHARED_WALLET);
    vi.spyOn(membersService, "inviteMember").mockRejectedValue(
      new ApiClientError("User not found", 400, { email: "User not found" })
    );
    const { onOpenChange } = renderDialog();

    fireEvent.change(screen.getByLabelText("Wallet Name"), { target: { value: "Housemate Fund" } });
    fireEvent.click(sharedSwitch());
    const input = screen.getByLabelText(/Invite members/);
    fireEvent.change(input, { target: { value: "unknown@example.com" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: "Create Wallet" }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(toast.error).toHaveBeenCalledWith("Couldn't invite unknown@example.com: User not found");
  });

  it("creates a personal wallet without touching invitations when the shared switch is off", async () => {
    const createWallet = vi.spyOn(walletsService, "createWallet").mockResolvedValue(PERSONAL_WALLET);
    const inviteMember = vi.spyOn(membersService, "inviteMember");
    const { onOpenChange } = renderDialog();

    fireEvent.change(screen.getByLabelText("Wallet Name"), { target: { value: "Cash" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Wallet" }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(createWallet).toHaveBeenCalledWith(expect.not.objectContaining({ isShared: true }));
    expect(inviteMember).not.toHaveBeenCalled();
  });
});
