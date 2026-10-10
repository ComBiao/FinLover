// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import LoginPage from "@/features/auth/components/LoginPage";
import RegisterPage from "@/features/auth/components/RegisterPage";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

afterEach(cleanup);

function renderPage(page: React.ReactNode) {
  return render(
    <QueryClientProvider client={new QueryClient()}>{page}</QueryClientProvider>
  );
}

describe("authentication pages", () => {
  it.each([
    ["login", <LoginPage key="login" />],
    ["register", <RegisterPage key="register" />],
  ])("has accessible fields and no Google/dead-link UI on %s", (_name, page) => {
    const { container } = renderPage(page);
    expect(screen.queryByText(/continue with/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /google/i })).not.toBeInTheDocument();
    expect(container.querySelector('a[href="#"]')).toBeNull();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("announces successful registration on /login?registered=1", () => {
    renderPage(<LoginPage registrationSucceeded />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Account created successfully. You can now log in."
    );
  });
});
