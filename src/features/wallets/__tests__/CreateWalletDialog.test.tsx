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
  it("turns an email into a removable chip on Enter and ignores duplicates", async () => {
    vi.spyOn(membersService, "validateInviteEmail").mockResolvedValue({ id: "u1", email: "yeen@example.com", name: "Yeen" });
    renderDialog();
    fireEvent.click(sharedSwitch());
    const input = screen.getByLabelText(/Invite members/);

    fireEvent.change(input, { target: { value: "Yeen@Example.com " } });
    fireEvent.keyDown(input, { key: "Enter" });
    await screen.findByText("yeen@example.com");

    fireEvent.change(input, { target: { value: "yeen@example.com" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(screen.getAllByText("yeen@example.com")).toHaveLength(1);
    expect(input).toHaveValue("");

    fireEvent.click(screen.getByRole("button", { name: "Remove yeen@example.com" }));
    expect(screen.queryByText("yeen@example.com")).not.toBeInTheDocument();
  });

  it("shows 'User not found' and rejects adding chip when user does not exist", async () => {
    vi.spyOn(membersService, "validateInviteEmail").mockRejectedValue(
      new ApiClientError("User not found", 400, { email: "User not found" })
    );
    renderDialog();
    fireEvent.click(sharedSwitch());
    const input = screen.getByLabelText(/Invite members/);

    fireEvent.change(input, { target: { value: "unknown@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await screen.findByText("User not found");
    expect(screen.getByRole("alert")).toHaveTextContent("User not found");
    expect(screen.queryByText("unknown@example.com")).not.toBeInTheDocument();
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
    vi.spyOn(membersService, "validateInviteEmail").mockImplementation(async (email) => ({ id: "u1", email, name: email }));
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
    await screen.findByText("yeen@example.com");

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

  it("keeps the wallet and reports an invitation that fails during wallet creation", async () => {
    vi.spyOn(membersService, "validateInviteEmail").mockResolvedValue({ id: "u1", email: "known@example.com", name: "Known" });
    vi.spyOn(walletsService, "createWallet").mockResolvedValue(OWNED_SHARED_WALLET);
    vi.spyOn(membersService, "inviteMember").mockRejectedValue(
      new ApiClientError("Already a member or invited", 409, { email: "Already a member or invited" })
    );
    const { onOpenChange } = renderDialog();

    fireEvent.change(screen.getByLabelText("Wallet Name"), { target: { value: "Housemate Fund" } });
    fireEvent.click(sharedSwitch());
    const input = screen.getByLabelText(/Invite members/);
    fireEvent.change(input, { target: { value: "known@example.com" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await screen.findByText("known@example.com");

    fireEvent.click(screen.getByRole("button", { name: "Create Wallet" }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(toast.error).toHaveBeenCalledWith("Couldn't invite known@example.com: Already a member or invited");
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

  it("cancels pending submission and does not create wallet if Cancel is clicked while email validation is pending", async () => {
    let resolveValidation: ((value: { id: string; email: string; name: string }) => void) | undefined;
    const pendingValidation = new Promise<{ id: string; email: string; name: string }>((resolve) => {
      resolveValidation = resolve;
    });
    vi.spyOn(membersService, "validateInviteEmail").mockReturnValue(pendingValidation);
    const createWallet = vi.spyOn(walletsService, "createWallet").mockResolvedValue(OWNED_SHARED_WALLET);

    renderDialog();
    fireEvent.change(screen.getByLabelText("Wallet Name"), { target: { value: "Cancelled Fund" } });
    fireEvent.click(sharedSwitch());
    const input = screen.getByLabelText(/Invite members/);
    fireEvent.change(input, { target: { value: "friend@example.com" } });

    // Submit while email is typed but not added
    fireEvent.click(screen.getByRole("button", { name: "Create Wallet" }));

    // User clicks Cancel while validation is in flight
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    // Now resolve validation
    resolveValidation?.({ id: "u2", email: "friend@example.com", name: "Friend" });

    // Wait a moment and confirm createWallet was never called
    await new Promise((r) => setTimeout(r, 50));
    expect(createWallet).not.toHaveBeenCalled();
  });
});
