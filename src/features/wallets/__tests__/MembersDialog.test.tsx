// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

import { ApiClientError } from "@/lib/api/client";
import {
  CONTRIBUTOR_VIEW_MEMBERS,
  JOINED_SHARED_WALLET,
  OWNED_SHARED_WALLET,
  OWNER_VIEW_MEMBERS,
} from "@/test/shared-wallet-fixtures";
import type { Wallet } from "@/types/wallet";
import { MembersDialog } from "../components/MembersDialog";
import * as membersService from "../shared/membersService";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

function renderDialog(wallet: Wallet, onOpenChange = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MembersDialog wallet={wallet} open onOpenChange={onOpenChange} />
    </QueryClientProvider>
  );
  return { onOpenChange };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("MembersDialog — Owner", () => {
  beforeEach(() => {
    vi.spyOn(membersService, "getMembers").mockResolvedValue(OWNER_VIEW_MEMBERS);
  });

  it("lists members with roles, marks the user and shows pending invitations separately", async () => {
    renderDialog(OWNED_SHARED_WALLET);

    expect(await screen.findByText("Housemate Fund · 3 members, 1 pending")).toBeInTheDocument();
    const tul = screen.getByText("Tul").closest("li")!;
    expect(within(tul).getByText("(you)")).toBeInTheDocument();
    expect(within(tul).getByText("Owner")).toBeInTheDocument();
    const guy = screen.getByText("Guy").closest("li")!;
    expect(within(guy).getByText("Contributor")).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "Pending invitations" })).toBeInTheDocument();
    expect(screen.getByText("yeen@example.com")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("offers invite, make-owner and remove, but not leave", async () => {
    renderDialog(OWNED_SHARED_WALLET);

    await screen.findByText("Guy");
    expect(screen.getByLabelText("Invite by email")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Make Guy the Owner" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Ice" })).toBeInTheDocument();
    // Nothing to do to the Owner herself.
    expect(screen.queryByRole("button", { name: /Remove Tul/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Leave wallet" })).not.toBeInTheDocument();
    expect(screen.getByText(/can't leave until you transfer ownership/)).toBeInTheDocument();
  });

  it("invites by email and clears the field on success", async () => {
    const invite = vi.spyOn(membersService, "inviteMember").mockResolvedValue(OWNER_VIEW_MEMBERS[3]);
    renderDialog(OWNED_SHARED_WALLET);

    const input = await screen.findByLabelText("Invite by email");
    fireEvent.change(input, { target: { value: "boss@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Invite" }));

    await waitFor(() => expect(invite).toHaveBeenCalledWith(OWNED_SHARED_WALLET.id, "boss@example.com"));
    await waitFor(() => expect(input).toHaveValue(""));
    expect(toast.success).toHaveBeenCalledWith("Invitation sent to boss@example.com");
  });

  it("shows the server's field error under the invite field", async () => {
    vi.spyOn(membersService, "inviteMember").mockRejectedValue(
      new ApiClientError("User not found", 400, { email: "User not found" })
    );
    renderDialog(OWNED_SHARED_WALLET);

    fireEvent.change(await screen.findByLabelText("Invite by email"), { target: { value: "unknown@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Invite" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("User not found");
  });

  it("validates the address before calling the API", async () => {
    const invite = vi.spyOn(membersService, "inviteMember");
    renderDialog(OWNED_SHARED_WALLET);

    fireEvent.change(await screen.findByLabelText("Invite by email"), { target: { value: "nope" } });
    fireEvent.click(screen.getByRole("button", { name: "Invite" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Enter a valid email address");
    expect(invite).not.toHaveBeenCalled();
  });

  it("asks before removing a member, then removes them", async () => {
    const remove = vi.spyOn(membersService, "removeMember").mockResolvedValue(undefined);
    renderDialog(OWNED_SHARED_WALLET);

    fireEvent.click(await screen.findByRole("button", { name: "Remove Guy" }));

    const confirm = await screen.findByRole("alertdialog");
    expect(within(confirm).getByRole("heading", { name: "Remove Guy?" })).toBeInTheDocument();
    expect(within(confirm).getByText(/Their past transactions stay in the wallet/)).toBeInTheDocument();
    expect(remove).not.toHaveBeenCalled();

    fireEvent.click(within(confirm).getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith(OWNED_SHARED_WALLET.id, "u-guy"));
    expect(toast.success).toHaveBeenCalledWith("Guy removed");
  });

  it("cancels a pending invitation", async () => {
    const remove = vi.spyOn(membersService, "removeMember").mockResolvedValue(undefined);
    renderDialog(OWNED_SHARED_WALLET);

    fireEvent.click(await screen.findByRole("button", { name: "Cancel invitation for yeen@example.com" }));
    const confirm = await screen.findByRole("alertdialog");
    expect(within(confirm).getByRole("heading", { name: "Cancel this invitation?" })).toBeInTheDocument();
    fireEvent.click(within(confirm).getByRole("button", { name: "Cancel invitation" }));

    await waitFor(() => expect(remove).toHaveBeenCalledWith(OWNED_SHARED_WALLET.id, "u-yeen"));
  });

  it("transfers ownership after confirmation", async () => {
    const transfer = vi.spyOn(membersService, "transferOwnership").mockResolvedValue(undefined);
    renderDialog(OWNED_SHARED_WALLET);

    fireEvent.click(await screen.findByRole("button", { name: "Make Ice the Owner" }));
    const confirm = await screen.findByRole("alertdialog");
    expect(within(confirm).getByRole("heading", { name: "Make Ice the Owner?" })).toBeInTheDocument();
    fireEvent.click(within(confirm).getByRole("button", { name: "Transfer" }));

    await waitFor(() => expect(transfer).toHaveBeenCalledWith(OWNED_SHARED_WALLET.id, "u-ice"));
    expect(toast.success).toHaveBeenCalledWith("Ice is now the Owner");
  });

  it("keeps the confirmation open and shows the server's message when it fails", async () => {
    vi.spyOn(membersService, "removeMember").mockRejectedValue(new ApiClientError("Only the owner can remove members", 403));
    renderDialog(OWNED_SHARED_WALLET);

    fireEvent.click(await screen.findByRole("button", { name: "Remove Guy" }));
    const confirm = await screen.findByRole("alertdialog");
    fireEvent.click(within(confirm).getByRole("button", { name: "Remove" }));

    expect(await within(confirm).findByRole("alert")).toHaveTextContent("Only the owner can remove members");
  });
});

describe("MembersDialog — Contributor", () => {
  beforeEach(() => {
    vi.spyOn(membersService, "getMembers").mockResolvedValue(CONTRIBUTOR_VIEW_MEMBERS);
  });

  it("is read-only: no invite field and no member actions", async () => {
    renderDialog(JOINED_SHARED_WALLET);

    expect(await screen.findByText("Bushi")).toBeInTheDocument();
    expect(screen.getByText("Only the Owner can invite or remove members. You can leave at any time.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Invite by email")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Remove / })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /the Owner$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Pending invitations" })).not.toBeInTheDocument();
  });

  it("lets the Contributor leave after confirming, and closes the dialog", async () => {
    const leave = vi.spyOn(membersService, "leaveWallet").mockResolvedValue(undefined);
    const { onOpenChange } = renderDialog(JOINED_SHARED_WALLET);

    fireEvent.click(await screen.findByRole("button", { name: "Leave wallet" }));
    const confirm = await screen.findByRole("alertdialog");
    expect(within(confirm).getByText(/whatever the balance/)).toBeInTheDocument();
    fireEvent.click(within(confirm).getByRole("button", { name: "Leave wallet" }));

    await waitFor(() => expect(leave).toHaveBeenCalledWith(JOINED_SHARED_WALLET.id));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});

describe("MembersDialog — loading and errors", () => {
  it("shows a message when the members cannot be loaded", async () => {
    vi.spyOn(membersService, "getMembers").mockRejectedValue(new ApiClientError("Forbidden", 403));
    renderDialog(OWNED_SHARED_WALLET);

    expect(await screen.findByText("Couldn't load the members. Please try again.")).toBeInTheDocument();
  });
});
