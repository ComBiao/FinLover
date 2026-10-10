import { beforeEach, describe, expect, it } from "vitest";

import { useBalanceVisibility } from "../store/useBalanceVisibility";

describe("useBalanceVisibility (#78)", () => {
  beforeEach(() => {
    useBalanceVisibility.setState({ isVisible: true });
  });

  it("defaults to visible", () => {
    expect(useBalanceVisibility.getState().isVisible).toBe(true);
  });

  it("toggles visibility", () => {
    useBalanceVisibility.getState().toggle();
    expect(useBalanceVisibility.getState().isVisible).toBe(false);

    useBalanceVisibility.getState().toggle();
    expect(useBalanceVisibility.getState().isVisible).toBe(true);
  });

  it("can hide and show explicitly", () => {
    useBalanceVisibility.getState().hide();
    expect(useBalanceVisibility.getState().isVisible).toBe(false);

    useBalanceVisibility.getState().show();
    expect(useBalanceVisibility.getState().isVisible).toBe(true);
  });

  it("reverts back to hidden when onError is called", () => {
    useBalanceVisibility.getState().show();
    expect(useBalanceVisibility.getState().isVisible).toBe(true);

    useBalanceVisibility.getState().onError();
    expect(useBalanceVisibility.getState().isVisible).toBe(false);
  });
});

