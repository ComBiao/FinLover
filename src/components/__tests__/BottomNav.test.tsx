// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BottomNav } from "@/components/BottomNav";

let pathname = "/homepage";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

const fetchMock = vi.fn();

beforeEach(() => {
  pathname = "/homepage";
  fetchMock.mockImplementation(async (url: string) =>
    String(url).endsWith("/api/v1/auth/me")
      ? Response.json({ status: true, data: { user: { id: "u1", email: "alex@example.com", name: "Alex" } } })
      : Response.json({ status: false }, { status: 404 })
  );
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function mount() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <BottomNav />
    </QueryClientProvider>
  );
}

describe("BottomNav", () => {
  it("links the four main destinations and marks the current one", () => {
    pathname = "/wallets";
    mount();

    const nav = screen.getByRole("navigation", { name: "Mobile" });
    const hrefs = within(nav)
      .getAllByRole("link")
      .map((link) => [link.textContent, link.getAttribute("href")]);
    expect(hrefs).toEqual([
      ["Home", "/homepage"],
      ["Transactions", "/transactions"],
      ["Wallets", "/wallets"],
      ["Recurring", "/recurring"],
    ]);
    expect(within(nav).getByRole("link", { name: "Wallets" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("opens a More sheet with Category, Reports and Account", async () => {
    mount();

    await userEvent.click(screen.getByRole("button", { name: "More" }));

    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).getByRole("link", { name: "Category" })).toHaveAttribute("href", "/category");
    expect(within(sheet).getByRole("link", { name: "Reports" })).toHaveAttribute("href", "/reports");
    const account = within(sheet).getByRole("link", { name: /Account/ });
    expect(account).toHaveAttribute("href", "/profile");
    expect(await within(sheet).findByText("Alex")).toBeInTheDocument();
  });

  it("highlights More while on a page that lives inside it", () => {
    pathname = "/category";
    mount();

    expect(screen.getByRole("button", { name: "More" }).className).toContain("text-success");
    expect(screen.getByRole("link", { name: "Home" }).className).not.toContain("text-success");
  });
});
