import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ getSessionUser: vi.fn() }));
const navigation = vi.hoisted(() => ({ redirect: vi.fn() }));

vi.mock("@/server/shared/auth/session", () => ({
  getSessionUser: auth.getSessionUser,
}));
vi.mock("next/navigation", () => ({ redirect: navigation.redirect }));
vi.mock("@/components/Sidebar", () => ({ Sidebar: () => null }));

import Home from "@/app/page";
import LoginRoute from "@/app/login/page";
import RegisterRoute from "@/app/register/page";
import { ProtectedLayout } from "@/app/_components/ProtectedLayout";

describe("server-side auth routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigation.redirect.mockImplementation((path: string) => {
      throw new Error(`redirect:${path}`);
    });
  });

  it("redirects / to /login without a loop", () => {
    expect(() => Home()).toThrow("redirect:/login");
    expect(navigation.redirect).toHaveBeenCalledOnce();
  });

  it("redirects missing, expired, or tampered sessions away from private UI", async () => {
    auth.getSessionUser.mockResolvedValue(null);
    await expect(ProtectedLayout({ children: <div>private</div> })).rejects.toThrow(
      "redirect:/login"
    );
  });

  it("renders private UI when the verified session is valid", async () => {
    auth.getSessionUser.mockResolvedValue({ sub: "user-id" });
    const result = await ProtectedLayout({ children: <div>private</div> });
    expect(result).toBeTruthy();
    expect(navigation.redirect).not.toHaveBeenCalled();
  });

  it.each([
    ["login", () => LoginRoute({ searchParams: Promise.resolve({}) })],
    ["register", () => RegisterRoute()],
  ])("redirects an authenticated user away from %s", async (_route, renderRoute) => {
    auth.getSessionUser.mockResolvedValue({ sub: "user-id" });
    await expect(renderRoute()).rejects.toThrow("redirect:/homepage");
    expect(navigation.redirect).toHaveBeenCalledOnce();
  });

  it("does not redirect an unauthenticated user between public auth routes", async () => {
    auth.getSessionUser.mockResolvedValue(null);
    await expect(
      LoginRoute({ searchParams: Promise.resolve({ registered: "1" }) })
    ).resolves.toBeTruthy();
    await expect(RegisterRoute()).resolves.toBeTruthy();
    expect(navigation.redirect).not.toHaveBeenCalled();
  });
});
