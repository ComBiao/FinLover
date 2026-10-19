// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Sidebar } from "@/components/Sidebar";

vi.mock("next/navigation", () => ({ usePathname: () => "/profile" }));

const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
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

describe("Sidebar — profile link (#165)", () => {
  it("links to /profile only through the user badge", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <Sidebar />
      </QueryClientProvider>
    );

    const nav = screen.getByRole("navigation", { name: "Main" });
    const badge = await within(nav).findByRole("link", { name: /alex/i });
    const profileLinks = within(nav)
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href") === "/profile");

    expect(profileLinks).toEqual([badge]);
    expect(within(nav).queryByRole("link", { name: "Account" })).not.toBeInTheDocument();
  });
});
