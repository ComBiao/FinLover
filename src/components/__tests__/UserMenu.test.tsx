// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { UserMenu } from "@/components/UserMenu";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }));
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

async function openDeleteDialog(onNavigate?: () => void) {
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <UserMenu onNavigate={onNavigate} />
    </QueryClientProvider>
  );
  await user.click(screen.getByRole("button"));
  await user.click(await screen.findByRole("menuitem", { name: "Delete account" }));
  await screen.findByText("Delete your account?");
  return user;
}

const confirmButton = () => screen.getByRole("button", { name: /^(Delete account|Deleting…)$/ });

describe("UserMenu delete account", () => {
  it("asks for confirmation first and does nothing when cancelled", async () => {
    const user = await openDeleteDialog();

    expect(fetchMock).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByText("Delete your account?")).not.toBeInTheDocument());
    expect(fetchMock).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("sends DELETE, then leaves for /login on success", async () => {
    fetchMock.mockResolvedValue(Response.json({ status: true, data: null }));
    const onNavigate = vi.fn();
    const user = await openDeleteDialog(onNavigate);

    await user.click(confirmButton());

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/auth/delete-account",
      expect.objectContaining({ method: "DELETE" })
    );
    expect(router.refresh).toHaveBeenCalled();
    expect(onNavigate).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith("Your account has been deleted");
  });

  it("treats 404 (account already gone) like success", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ status: false, error: { message: "User not found" } }, { status: 404 })
    );
    const user = await openDeleteDialog();

    await user.click(confirmButton());

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("sends an expired session (401) to /login without claiming the account was deleted", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ status: false, error: { message: "Unauthorized" } }, { status: 401 })
    );
    const user = await openDeleteDialog();

    await user.click(confirmButton());

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
    expect(toast.error).toHaveBeenCalledWith("Your session has expired. Please log in again.");
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("keeps the dialog open and stays on the page when the server fails", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ status: false, error: { message: "Boom" } }, { status: 500 })
    );
    const user = await openDeleteDialog();

    await user.click(confirmButton());

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Unable to delete your account. Please try again.")
    );
    expect(router.replace).not.toHaveBeenCalled();
    expect(screen.getByText("Delete your account?")).toBeInTheDocument();
    expect(confirmButton()).toBeEnabled();
  });
});
