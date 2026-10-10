// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { UserMenu } from "@/components/UserMenu";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("sonner", () => ({ toast }));

const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function mount() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <UserMenu />
    </QueryClientProvider>
  );
}

describe("logout", () => {
  it("clears client state and returns to login only after the API succeeds", async () => {
    fetchMock.mockResolvedValue(Response.json({ status: true, data: null }));
    mount();
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(await screen.findByText("Log out"));
    fireEvent.click(await screen.findByRole("button", { name: "Log out" }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/auth/logout",
      expect.objectContaining({ method: "POST", credentials: "same-origin" })
    );
    expect(router.refresh).toHaveBeenCalledOnce();
  });

  it("reports a failed logout and keeps the user on the current page", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ status: false, error: { message: "Request failed" } }, { status: 500 })
    );
    mount();
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(await screen.findByText("Log out"));
    fireEvent.click(await screen.findByRole("button", { name: "Log out" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(router.replace).not.toHaveBeenCalled();
    expect(router.refresh).not.toHaveBeenCalled();
  });
});
