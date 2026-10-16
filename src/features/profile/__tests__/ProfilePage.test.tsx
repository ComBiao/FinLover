// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProfilePage } from "@/features/profile/components/ProfilePage";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("sonner", () => ({ toast }));

const fetchMock = vi.fn();

function mockApi(logoutResponse?: Response) {
  fetchMock.mockImplementation(async (url: string) => {
    if (String(url).endsWith("/api/v1/auth/me")) {
      return Response.json({
        status: true,
        data: { user: { id: "u1", email: "boss2@gmail.com", name: "boss2" } },
      });
    }
    if (String(url).endsWith("/api/v1/auth/logout")) {
      return logoutResponse ?? Response.json({ status: true, data: null });
    }
    return Response.json({ status: false }, { status: 404 });
  });
}

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
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ProfilePage />
    </QueryClientProvider>
  );
}

describe("ProfilePage", () => {
  it("renders user details correctly", async () => {
    mockApi();
    mount();

    expect(await screen.findByTestId("profile-name")).toHaveTextContent("boss2");
    expect(screen.getByTestId("profile-email")).toHaveTextContent("boss2@gmail.com");
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  describe("logout", () => {
    it("opens logout confirmation dialog, calls logout API, and redirects to /login on confirm", async () => {
      mockApi(Response.json({ status: true, data: null }));
      mount();

      const logoutBtn = await screen.findByRole("button", { name: "Log out" });
      fireEvent.click(logoutBtn);

      expect(await screen.findByRole("heading", { name: "Log out?" })).toBeInTheDocument();
      expect(screen.getByText("Are you sure you want to log out?")).toBeInTheDocument();

      // Click confirm logout button in dialog
      const confirmBtn = screen.getByRole("button", { name: "Log out" });
      fireEvent.click(confirmBtn);

      await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/auth/logout",
        expect.objectContaining({ method: "POST" })
      );
      expect(router.refresh).toHaveBeenCalledOnce();
      expect(toast.success).toHaveBeenCalledWith("Logged out");
    });

    it("displays error toast and stays on the page when logout fails", async () => {
      mockApi(
        Response.json({ status: false, error: { message: "Server error" } }, { status: 500 })
      );
      mount();

      const logoutBtn = await screen.findByRole("button", { name: "Log out" });
      fireEvent.click(logoutBtn);

      const confirmBtn = await screen.findByRole("button", { name: "Log out" });
      fireEvent.click(confirmBtn);

      await waitFor(() => expect(toast.error).toHaveBeenCalled());
      expect(router.replace).not.toHaveBeenCalled();
      expect(router.refresh).not.toHaveBeenCalled();
    });
  });

  describe("delete account", () => {
    it("opens delete confirmation dialog when delete account button is clicked", async () => {
      mockApi();
      mount();

      const deleteBtn = await screen.findByRole("button", { name: "Delete account" });
      fireEvent.click(deleteBtn);

      expect(await screen.findByRole("heading", { name: "Delete your account?" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Delete my account" })).toBeInTheDocument();
    });
  });
});
