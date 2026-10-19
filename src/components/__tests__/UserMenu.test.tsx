// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { UserMenu } from "@/components/UserMenu";

const navigation = vi.hoisted(() => ({ pathname: "/homepage" }));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));

const fetchMock = vi.fn();

function mockApi() {
  fetchMock.mockImplementation(async (url: string) =>
    String(url).endsWith("/api/v1/auth/me")
      ? Response.json({ status: true, data: { user: { id: "u1", email: "alex@example.com", name: "Alex" } } })
      : Response.json({ status: false }, { status: 404 })
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  navigation.pathname = "/homepage";
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function mount(onNavigate?: () => void) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <UserMenu onNavigate={onNavigate} />
    </QueryClientProvider>
  );
}

describe("UserMenu", () => {
  it("renders user name, avatar fallback, links to /profile, and calls onNavigate on click", async () => {
    mockApi();
    const onNavigate = vi.fn();
    mount(onNavigate);

    const link = await screen.findByRole("link", { name: /alex/i });
    expect(link).toHaveAttribute("href", "/profile");
    expect(screen.getByText("A")).toBeInTheDocument();

    fireEvent.click(link);
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it("does not render dropdown menu items (Profile, Log out, Delete account)", async () => {
    mockApi();
    mount();

    const link = await screen.findByRole("link", { name: /alex/i });
    fireEvent.click(link);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.queryByText("Delete account")).not.toBeInTheDocument();
  });

  it("marks itself as the current page on /profile (#165)", async () => {
    mockApi();
    navigation.pathname = "/profile";
    mount();

    expect(await screen.findByRole("link", { name: /alex/i })).toHaveAttribute("aria-current", "page");
  });

  it("is not marked current on other pages", async () => {
    mockApi();
    mount();

    expect(await screen.findByRole("link", { name: /alex/i })).not.toHaveAttribute("aria-current");
  });
});
