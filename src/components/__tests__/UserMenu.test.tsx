// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { UserMenu } from "@/components/UserMenu";

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
  it("renders user name, avatar fallback, and is not a clickable link", async () => {
    mockApi();
    mount();

    expect(await screen.findByText("Alex")).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("does not render dropdown menu items (Profile, Log out, Delete account)", async () => {
    mockApi();
    mount();

    await screen.findByText("Alex");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.queryByText("Delete account")).not.toBeInTheDocument();
  });
});
