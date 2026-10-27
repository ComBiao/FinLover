// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tag, Wallet as WalletIcon } from "lucide-react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RecurringPage } from "../components/RecurringPage";
import type { Wallet } from "@/types/wallet";
import type { Category } from "@/types/category";

const jsonResponse = (payload: unknown, ok = true, status = 200) => ({
  ok,
  status,
  json: vi.fn().mockResolvedValue(payload),
});

const mockWallets: Wallet[] = [
  {
    id: "w-personal-1",
    name: "Main Bank",
    balance: 50000,
    icon: WalletIcon,
    isShared: false,
  },
  {
    id: "w-shared-condo",
    name: "Condo Shared Account",
    balance: 20000,
    icon: WalletIcon,
    isShared: true, // Should be excluded from selector!
  },
];

const mockCategories: Category[] = [
  {
    id: "c-util",
    name: "Utilities",
    type: "expense",
    icon: Tag,
  },
];

const mockBackendRules = [
  {
    id: "rule-netflix",
    walletId: "w-personal-1",
    categoryId: "c-util",
    type: "expense",
    amount: 419,
    title: "Netflix Subscription",
    note: "4K plan",
    startDate: "2026-10-01",
    frequency: "monthly",
    interval: 1,
    end: { type: "never" },
    status: "active",
    createdCount: 1,
    nextDueDate: "2026-11-01",
    canManage: true,
  },
  {
    id: "rule-gym-paused",
    walletId: "w-personal-1",
    categoryId: null,
    type: "expense",
    amount: 1500,
    title: "Fitness First",
    startDate: "2026-05-01",
    frequency: "monthly",
    interval: 1,
    end: { type: "never" },
    status: "paused",
    createdCount: 2,
    nextDueDate: "2026-07-01",
    canManage: true,
  },
];

function renderWithProviders(ui: React.ReactElement, queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe("RecurringPage Integration (Issue #178 Step 3)", () => {
  let queryClient: QueryClient;

  const defaultFetchHandler = (rules: unknown[] = mockBackendRules) => {
    return vi.fn().mockImplementation(async (url: string | URL | Request) => {
      const path = typeof url === "string" ? url : "url" in url ? (url as Request).url : String(url);
      if (path.includes("/api/v1/auth/me")) {
        return jsonResponse({
          status: true,
          data: { user: { id: "u1", name: "Alex Demo", email: "alex@example.com" } },
        });
      }
      if (path.includes("/api/v1/wallets")) {
        return jsonResponse({
          status: true,
          data: mockWallets.map((w) => ({
            id: w.id,
            name: w.name,
            balance: w.balance,
            isShared: w.isShared,
          })),
        });
      }
      if (path.includes("/api/v1/categories")) {
        return jsonResponse({
          status: true,
          data: mockCategories.map((c) => ({
            id: c.id,
            name: c.name,
            type: c.type,
          })),
        });
      }
      if (path.includes("/api/v1/schedulers")) {
        return jsonResponse({ status: true, data: rules });
      }
      return jsonResponse({ status: true, data: null });
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.stubGlobal("fetch", defaultFetchHandler());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders loading skeleton while query is in flight", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/api/v1/schedulers")) {
          return new Promise(() => {}); // never resolves
        }
        return jsonResponse({ status: true, data: [] });
      })
    );

    renderWithProviders(<RecurringPage />, queryClient);

    expect(screen.getByTestId("loading-state")).toBeInTheDocument();
  });

  it("renders error state with retry button when query fails, and clicking retry refetches", async () => {
    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/api/v1/schedulers")) {
        callCount++;
        if (callCount === 1) {
          return jsonResponse({ status: false, error: { message: "Database disconnected" } }, false, 500);
        }
        return jsonResponse({ status: true, data: mockBackendRules });
      }
      if (url.includes("/api/v1/auth/me")) {
        return jsonResponse({ status: true, data: { user: { id: "u1", name: "Alex Demo" } } });
      }
      return jsonResponse({ status: true, data: [] });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<RecurringPage />, queryClient);

    const errorMsg = await screen.findByText("Database disconnected");
    expect(errorMsg).toBeInTheDocument();

    const retryBtn = screen.getByRole("button", { name: /retry/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(callCount).toBeGreaterThanOrEqual(2);
    });
  });

  it("renders empty state when list is empty, with CTA to open Create modal", async () => {
    vi.stubGlobal("fetch", defaultFetchHandler([]));

    renderWithProviders(<RecurringPage />, queryClient);

    expect(await screen.findByText("No recurring transactions found")).toBeInTheDocument();

    const ctaButton = screen.getByRole("button", { name: /create recurring transaction/i });
    expect(ctaButton).toBeInTheDocument();

    fireEvent.click(ctaButton);

    expect(screen.getByText(/New Recurring Expense/i)).toBeInTheDocument();
  });

  it("renders populated rules list accurately with badges and action buttons", async () => {
    renderWithProviders(<RecurringPage />, queryClient);

    // Rows are read inside the desktop table; phones get a card list of the same rules (jsdom renders both).
    const table = within(await screen.findByRole("table"));
    expect(table.getByText("Netflix Subscription")).toBeInTheDocument();
    expect(table.getByText("Fitness First")).toBeInTheDocument();
    expect(table.getByText("Active")).toBeInTheDocument();
    expect(table.getByText("Paused")).toBeInTheDocument();
  });

  it("excludes shared wallets from Create Rule modal (EPIC 4 scope)", async () => {
    renderWithProviders(<RecurringPage />, queryClient);

    const createBtn = await screen.findByRole("button", { name: /create recurring transaction/i });
    fireEvent.click(createBtn);

    // Main Bank (personal) is selected and present in the modal
    expect(screen.getAllByText("Main Bank").length).toBeGreaterThan(0);
    // Condo Shared Account (shared) should be excluded and NOT present anywhere in the modal
    expect(screen.queryByText(/condo shared account/i)).not.toBeInTheDocument();
  });

  it("displays immediate execution notice when start_date is set to today", async () => {
    renderWithProviders(<RecurringPage />, queryClient);

    const createBtn = await screen.findByRole("button", { name: /create recurring transaction/i });
    fireEvent.click(createBtn);

    // Notice that start_date defaults to today
    expect(
      screen.getByText(/Starting today \(Bangkok time\) will immediately post the first transaction to your wallet/i)
    ).toBeInTheDocument();
  });

  it("submitting Create modal calls createScheduler mutation with POST payload", async () => {
    const user = userEvent.setup();
    let postBody: Record<string, unknown> | null = null;

    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === "POST" && url.includes("/api/v1/schedulers")) {
        postBody = JSON.parse(init.body as string);
        return jsonResponse(
          {
            status: true,
            data: {
              id: "new-spotify",
              walletId: postBody?.walletId,
              categoryId: postBody?.categoryId,
              type: postBody?.type,
              amount: postBody?.amount,
              title: postBody?.title,
              startDate: postBody?.startDate,
              frequency: postBody?.frequency,
              interval: postBody?.interval,
              end: postBody?.end,
              status: "active",
              createdCount: 1,
              nextDueDate: "2026-11-24",
              canManage: true,
            },
          },
          true,
          201
        );
      }
      return defaultFetchHandler()(url, init);
    }));

    renderWithProviders(<RecurringPage />, queryClient);

    const openBtn = await screen.findByRole("button", { name: /create recurring transaction/i });
    fireEvent.click(openBtn);

    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, "Spotify Family");

    const amountInput = screen.getByLabelText(/amount/i);
    await user.type(amountInput, "299");

    const saveBtn = screen.getByRole("button", { name: /save recurring rule/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(postBody).toMatchObject({
        title: "Spotify Family",
        amount: 299,
        type: "expense",
      });
    });
  });

  it("triggers pause/resume mutation with status update", async () => {
    let patchUrl = "";
    let patchBody: Record<string, unknown> | null = null;

    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === "PATCH" && url.includes("/api/v1/schedulers")) {
        patchUrl = url;
        patchBody = JSON.parse(init.body as string);
        return jsonResponse({
          status: true,
          data: { ...mockBackendRules[0], status: "paused" },
        });
      }
      return defaultFetchHandler()(url, init);
    }));

    renderWithProviders(<RecurringPage />, queryClient);

    // Find quick-action pause button
    const pauseBtn = within(await screen.findByRole("table")).getByRole("button", { name: "Pause rule" });
    fireEvent.click(pauseBtn);

    await waitFor(() => {
      expect(patchUrl).toBe("/api/v1/schedulers/rule-netflix/status");
      expect(patchBody).toEqual({ action: "pause" });
    });
  });

  it("shows delete confirmation dialog with ledger preservation notice and triggers delete on confirmation", async () => {
    let deleteUrl = "";

    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === "DELETE" && url.includes("/api/v1/schedulers")) {
        deleteUrl = url;
        return jsonResponse({ status: true, data: null });
      }
      return defaultFetchHandler()(url, init);
    }));

    renderWithProviders(<RecurringPage />, queryClient);

    // Open more actions on Netflix row
    const moreButtons = await screen.findAllByRole("button", { name: /more actions/i });
    fireEvent.click(moreButtons[0]);

    const deleteMenuItem = await screen.findByRole("menuitem", { name: /delete rule/i });
    fireEvent.click(deleteMenuItem);

    // Check modal prompt contains ledger preservation text
    expect(
      screen.getByText(/This will stop all future recurring transactions for this rule\. All past recorded transactions in your wallet ledger will be preserved\./i)
    ).toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: /halt & delete rule/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(deleteUrl).toBe("/api/v1/schedulers/rule-netflix");
    });
  });

  it("submitting Edit modal calls updateScheduler mutation with PUT payload", async () => {
    const user = userEvent.setup();
    let putUrl = "";
    let putBody: Record<string, unknown> | null = null;

    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === "PUT" && url.includes("/api/v1/schedulers")) {
        putUrl = url;
        putBody = JSON.parse(init.body as string);
        return jsonResponse({
          status: true,
          data: { ...mockBackendRules[0], ...putBody },
        });
      }
      return defaultFetchHandler()(url, init);
    }));

    renderWithProviders(<RecurringPage />, queryClient);

    const moreButtons = await screen.findAllByRole("button", { name: /more actions/i });
    fireEvent.click(moreButtons[0]);

    const editMenuItem = await screen.findByRole("menuitem", { name: /edit rule/i });
    fireEvent.click(editMenuItem);

    expect(
      screen.getByText(/Changes will only apply to future scheduled occurrences\. Past recorded transactions remain unchanged\./i)
    ).toBeInTheDocument();

    const amountInput = screen.getByLabelText(/future amount/i);
    await user.clear(amountInput);
    await user.type(amountInput, "699");

    const saveBtn = screen.getByRole("button", { name: /save future changes/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(putUrl).toBe("/api/v1/schedulers/rule-netflix");
      expect(putBody).toMatchObject({
        amount: 699,
      });
    });
  });
});
