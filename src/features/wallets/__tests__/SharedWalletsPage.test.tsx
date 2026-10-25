// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

import {
  CONTRIBUTOR_VIEW_MEMBERS,
  INVITATIONS,
  JOINED_SHARED_WALLET,
  OWNED_SHARED_WALLET,
  OWNER_VIEW_MEMBERS,
  PERSONAL_WALLET,
} from "@/test/shared-wallet-fixtures";
import { WalletManagementPage } from "../components/WalletManagementPage";
import * as invitationsService from "../shared/invitationsService";
import * as membersService from "../shared/membersService";
import { useActiveWallet } from "../store/useActiveWallet";
import * as walletsService from "../walletsService";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

const queryClientRef: { current: QueryClient | null } = { current: null };

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClientRef.current = queryClient;
  return render(
    <QueryClientProvider client={queryClient}>
      <WalletManagementPage />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useActiveWallet.setState({ activeWalletId: "all" });
  vi.spyOn(walletsService, "getWallets").mockResolvedValue([
    PERSONAL_WALLET,
    OWNED_SHARED_WALLET,
    JOINED_SHARED_WALLET,
  ]);
  vi.spyOn(invitationsService, "getInvitations").mockResolvedValue([]);
  vi.spyOn(membersService, "getMembers").mockImplementation(async (walletId) =>
    walletId === OWNED_SHARED_WALLET.id ? OWNER_VIEW_MEMBERS : CONTRIBUTOR_VIEW_MEMBERS
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** Switches the page to its Shared tab and returns the shared wallets section. */
async function openSharedTab() {
  fireEvent.click(await screen.findByRole("tab", { name: /Shared/ }));
  return screen.findByRole("region", { name: "Shared wallets" });
}

describe("Wallets page — Personal / Shared toggle", () => {
  it("starts on Personal and shows only personal wallets", async () => {
    renderPage();

    expect(await screen.findByText("Main Cash")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Personal/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /Shared/ })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("heading", { name: "Your Wallets" })).toBeInTheDocument();
    expect(screen.queryByText("Housemate Fund")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Shared wallets" })).not.toBeInTheDocument();
  });

  it("counts each side on its tab", async () => {
    renderPage();

    expect(await screen.findByRole("tab", { name: "Personal 1" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Shared 2" })).toBeInTheDocument();
  });

  it("totals only personal wallets while Personal is showing", async () => {
    renderPage();

    await screen.findByText("Main Cash");
    // Main Cash (฿5,000) is the whole total: once as the total, once on its own card.
    expect(screen.getAllByText("฿5,000")).toHaveLength(2);
    expect(screen.queryByText("฿14,891")).not.toBeInTheDocument();
    expect(screen.getByText("Across 1 wallet")).toBeInTheDocument();
    expect(screen.getByText("Total Wallets")).toBeInTheDocument();
    expect(screen.getByText("1 wallet recorded")).toBeInTheDocument();
    expect(screen.queryByText("Shared wallets", { selector: "[data-slot=badge]" })).not.toBeInTheDocument();
  });

  it("switches the totals to the shared wallets and says so", async () => {
    renderPage();

    const section = await openSharedTab();

    expect(screen.getByRole("tab", { name: /Shared/ })).toHaveAttribute("aria-selected", "true");
    // 9,391 + 5,500; the personal ฿5,000 is gone.
    expect(screen.getByText("฿14,891")).toBeInTheDocument();
    expect(screen.queryByText("฿5,000")).not.toBeInTheDocument();
    expect(screen.getByText("Shared wallets", { selector: "[data-slot=badge]" })).toBeInTheDocument();
    expect(screen.getByText("Across 2 shared wallets · pooled with other members")).toBeInTheDocument();
    expect(screen.getByText("Shared with other people")).toBeInTheDocument();
    expect(within(section).getByRole("heading", { name: "Shared Wallets" })).toBeInTheDocument();
    expect(within(section).getByText("Housemate Fund")).toBeInTheDocument();
    expect(within(section).getByText("Japan Trip 2027")).toBeInTheDocument();
    expect(screen.queryByText("Main Cash")).not.toBeInTheDocument();
    expect(screen.getByText("2 shared wallets")).toBeInTheDocument();
  });

  it("switches back to the personal totals", async () => {
    renderPage();

    await openSharedTab();
    fireEvent.click(screen.getByRole("tab", { name: /Personal/ }));

    expect(await screen.findByText("Main Cash")).toBeInTheDocument();
    expect(screen.getAllByText("฿5,000")).toHaveLength(2);
    expect(screen.queryByText("Housemate Fund")).not.toBeInTheDocument();
  });

  it("shows no toggle when the user has no shared wallets", async () => {
    vi.spyOn(walletsService, "getWallets").mockResolvedValue([PERSONAL_WALLET]);
    renderPage();

    await screen.findByText("Main Cash");
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.getByText("Across 1 wallet")).toBeInTheDocument();
    expect(screen.getByText("Active accounts")).toBeInTheDocument();
  });

  it("goes back to Personal when the last shared wallet disappears", async () => {
    const getWallets = vi.spyOn(walletsService, "getWallets");
    renderPage();
    await openSharedTab();

    getWallets.mockResolvedValue([PERSONAL_WALLET]);
    await act(async () => {
      await queryClientRef.current?.invalidateQueries({ queryKey: ["wallets"] });
    });

    expect(await screen.findByText("Main Cash")).toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  });

  it("opens Create Wallet with the shared switch on while viewing Shared, off while viewing Personal", async () => {
    renderPage();

    await screen.findByText("Main Cash");
    fireEvent.click(screen.getByRole("button", { name: "Create Wallet" }));
    expect(await screen.findByRole("switch", { name: "This is a shared wallet with other people" })).toHaveAttribute(
      "aria-checked",
      "false"
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Create Wallet" })).not.toBeInTheDocument());

    await openSharedTab();
    fireEvent.click(screen.getByRole("button", { name: "Create Wallet" }));
    expect(await screen.findByRole("switch", { name: "This is a shared wallet with other people" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
  });
});

describe("Wallets page — wallet names", () => {
  it("clicking a personal wallet's name selects it and goes to Home", async () => {
    renderPage();

    const link = await screen.findByRole("link", { name: "Main Cash" });
    expect(link).toHaveAttribute("href", "/homepage");
    link.addEventListener("click", (event) => event.preventDefault()); // jsdom can't navigate
    fireEvent.click(link);

    expect(useActiveWallet.getState().activeWalletId).toBe(PERSONAL_WALLET.id);
  });

  it("clicking a shared wallet's name selects it and goes to Home", async () => {
    renderPage();
    await openSharedTab();

    const link = await screen.findByRole("link", { name: "Housemate Fund" });
    expect(link).toHaveAttribute("href", "/homepage");
    link.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(link);

    expect(useActiveWallet.getState().activeWalletId).toBe(OWNED_SHARED_WALLET.id);
  });
});

describe("Wallets page — shared wallet cards", () => {
  it("badges each shared card with the user's role and shows the member count", async () => {
    renderPage();
    const section = await openSharedTab();

    expect(within(section).getAllByText("Shared")).toHaveLength(2);
    expect(within(section).getByText("Owner")).toBeInTheDocument();
    expect(within(section).getByText("Contributor")).toBeInTheDocument();
    expect(within(section).getByRole("button", { name: "Members, 3 people" })).toHaveTextContent("3");
    expect(within(section).getByRole("button", { name: "Members, 4 people" })).toHaveTextContent("4");
    expect(within(section).getByText("Owner: Bushi")).toBeInTheDocument();
    expect(within(section).getByText("Tul, Guy, Ice")).toBeInTheDocument();
  });

  it("gives the Owner's card Edit, Members, Saving Goal and Delete", async () => {
    renderPage();
    const section = await openSharedTab();

    fireEvent.click(within(section).getAllByRole("button", { name: "Wallet actions" })[0]);

    const items = (await screen.findAllByRole("menuitem")).map((item) => item.textContent);
    expect(items).toEqual(["Edit", "Members", "Saving Goal Settings", "Delete Wallet"]);
  });

  it("gives a Contributor's card only Members and Leave wallet", async () => {
    renderPage();
    const section = await openSharedTab();

    fireEvent.click(within(section).getAllByRole("button", { name: "Wallet actions" })[1]);

    const items = (await screen.findAllByRole("menuitem")).map((item) => item.textContent);
    expect(items).toEqual(["Members", "Leave wallet"]);
  });

  it("opens the Members dialog from the people button", async () => {
    renderPage();
    await openSharedTab();

    fireEvent.click(await screen.findByRole("button", { name: "Members, 3 people" }));

    expect(await screen.findByRole("heading", { name: "Members" })).toBeInTheDocument();
    expect(await screen.findByText("Housemate Fund · 3 members, 1 pending")).toBeInTheDocument();
  });

  it("confirms before a Contributor leaves, then leaves", async () => {
    const leave = vi.spyOn(membersService, "leaveWallet").mockResolvedValue(undefined);
    renderPage();
    const section = await openSharedTab();

    fireEvent.click(within(section).getAllByRole("button", { name: "Wallet actions" })[1]);
    fireEvent.click(await screen.findByRole("menuitem", { name: "Leave wallet" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByRole("heading", { name: "Leave “Japan Trip 2027”?" })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Leave wallet" }));

    await waitFor(() => expect(leave).toHaveBeenCalledWith(JOINED_SHARED_WALLET.id));
    expect(toast.success).toHaveBeenCalledWith('You left "Japan Trip 2027"');
  });

  it("warns that every member's transactions go when the Owner deletes the wallet", async () => {
    renderPage();
    const section = await openSharedTab();

    fireEvent.click(within(section).getAllByRole("button", { name: "Wallet actions" })[0]);
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete Wallet" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/Every transaction from all 3 members will be permanently deleted/)).toBeInTheDocument();
    // Same confirmation as Epic 6: no password field.
    expect(within(dialog).queryByLabelText(/password/i)).not.toBeInTheDocument();
  });
});

describe("Wallets page — invitations", () => {
  beforeEach(() => {
    vi.spyOn(invitationsService, "getInvitations").mockResolvedValue(INVITATIONS);
  });

  it("shows the newest invitation in a banner and counts the rest", async () => {
    renderPage();

    const banner = await screen.findByRole("region", { name: "Wallet invitation" });
    expect(banner).toHaveTextContent("Yeen invited you to join “Office Lunch” as a Contributor");
    expect(banner).toHaveTextContent("1 more invitation waiting in notifications");
  });

  it("accepts an invitation from the banner", async () => {
    const accept = vi.spyOn(invitationsService, "acceptInvitation").mockResolvedValue(undefined);
    renderPage();

    const banner = await screen.findByRole("region", { name: "Wallet invitation" });
    fireEvent.click(within(banner).getByRole("button", { name: "Accept invitation to Office Lunch" }));

    await waitFor(() => expect(accept).toHaveBeenCalledWith("invite-1"));
    expect(toast.success).toHaveBeenCalledWith('You joined "Office Lunch"');
  });

  it("declines an invitation from the banner", async () => {
    const decline = vi.spyOn(invitationsService, "declineInvitation").mockResolvedValue(undefined);
    renderPage();

    const banner = await screen.findByRole("region", { name: "Wallet invitation" });
    fireEvent.click(within(banner).getByRole("button", { name: "Decline invitation to Office Lunch" }));

    await waitFor(() => expect(decline).toHaveBeenCalledWith("invite-1"));
  });

  it("puts the pending count on the bell and lists every invitation in its popover", async () => {
    renderPage();

    const bell = await screen.findByRole("button", { name: "Notifications, 2 pending invitations" });
    expect(bell).toHaveTextContent("2");

    fireEvent.click(bell);
    expect(await screen.findByText("Invitations")).toBeInTheDocument();
    expect(screen.getByText("2 pending")).toBeInTheDocument();
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("2 days ago")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Accept invitation to/ })).toHaveLength(3); // banner + 2 in the popover
  });

  it("shows no banner and a plain bell without invitations", async () => {
    vi.spyOn(invitationsService, "getInvitations").mockResolvedValue([]);
    renderPage();

    expect(await screen.findByRole("button", { name: "Notifications" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Wallet invitation" })).not.toBeInTheDocument();
  });
});
