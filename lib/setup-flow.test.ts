import { describe, expect, it } from "vitest";
import { getSetupProgress } from "@/lib/setup-flow";

const base = {
  steamConnected: false,
  loadPhase: "idle" as const,
  gamesCount: 0,
  selectedCount: 0,
};

describe("getSetupProgress", () => {
  it("starts at steam when not connected", () => {
    const progress = getSetupProgress(base);
    expect(progress.currentStep).toBe("steam");
    expect(progress.nextAction?.label).toBe("Sign in with Steam");
  });

  it("moves to fetch after steam connects", () => {
    const progress = getSetupProgress({ ...base, steamConnected: true });
    expect(progress.currentStep).toBe("fetch");
    expect(progress.nextAction?.label).toBe("Get Wishlist Items");
  });

  it("moves to select after wishlist loads", () => {
    const progress = getSetupProgress({
      ...base,
      steamConnected: true,
      loadPhase: "loaded",
      gamesCount: 2,
      selectedCount: 0,
    });
    expect(progress.currentStep).toBe("select");
  });

  it("moves to export when games are selected", () => {
    const progress = getSetupProgress({
      ...base,
      steamConnected: true,
      loadPhase: "loaded",
      gamesCount: 2,
      selectedCount: 2,
    });
    expect(progress.currentStep).toBe("export");
    expect(progress.nextAction?.label).toBe("Download .ics file");
  });

  it("never marks export step as complete", () => {
    const progress = getSetupProgress({
      ...base,
      steamConnected: true,
      loadPhase: "loaded",
      gamesCount: 2,
      selectedCount: 2,
    });
    const exportStep = progress.steps.find((step) => step.id === "export");
    expect(exportStep?.status).toBe("current");
  });
});
