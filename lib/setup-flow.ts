export type SetupStepId = "steam" | "fetch" | "select" | "export";

export type LoadPhase = "idle" | "connecting" | "loading" | "loaded" | "error";

export type StepStatus = "complete" | "current" | "locked";

export type StepState = {
  id: SetupStepId;
  number: number;
  label: string;
  shortLabel: string;
  status: StepStatus;
};

export type NextAction = {
  label: string;
  stepId: SetupStepId;
  description: string;
};

export type SetupProgressInput = {
  steamConnected: boolean;
  loadPhase: LoadPhase;
  gamesCount: number;
  selectedCount: number;
};

const STEP_DEFINITIONS: Array<{
  id: SetupStepId;
  number: number;
  label: string;
  shortLabel: string;
}> = [
  { id: "steam", number: 1, label: "Connect Steam", shortLabel: "Steam" },
  { id: "fetch", number: 2, label: "Load wishlist", shortLabel: "Load" },
  { id: "select", number: 3, label: "Select games", shortLabel: "Select" },
  { id: "export", number: 4, label: "Export calendar", shortLabel: "Export" },
];

function isStepComplete(id: SetupStepId, input: SetupProgressInput): boolean {
  switch (id) {
    case "steam":
      return input.steamConnected;
    case "fetch":
      return input.loadPhase === "loaded";
    case "select":
      return input.gamesCount > 0 && input.selectedCount > 0;
    case "export":
      return false;
    default:
      return false;
  }
}

function getCurrentStepId(input: SetupProgressInput): SetupStepId {
  if (!input.steamConnected) {
    return "steam";
  }
  if (input.loadPhase !== "loaded") {
    return "fetch";
  }
  if (input.gamesCount === 0 || input.selectedCount === 0) {
    return "select";
  }
  return "export";
}

function buildNextAction(input: SetupProgressInput, currentStep: SetupStepId): NextAction | null {
  switch (currentStep) {
    case "steam":
      return {
        stepId: "steam",
        label: "Sign in with Steam",
        description: "Next: connect your Steam account to load your wishlist.",
      };
    case "fetch":
      return {
        stepId: "fetch",
        label: input.loadPhase === "loaded" ? "Re-fetch Wishlist Items" : "Get Wishlist Items",
        description: "Next: fetch upcoming games from your Steam wishlist.",
      };
    case "select":
      return {
        stepId: "select",
        label: "Review game selection",
        description:
          input.gamesCount === 0
            ? "Next: load your wishlist to see eligible games."
            : "Next: select games and add them to your calendar — one at a time or all at once in step 4.",
      };
    case "export":
      return {
        stepId: "export",
        label: "Download .ics file",
        description:
          "Optional: download all selected games as a .ics file, or use Add to Google Calendar on each game card above.",
      };
    default:
      return null;
  }
}

export function getSetupProgress(input: SetupProgressInput): {
  currentStep: SetupStepId;
  steps: StepState[];
  nextAction: NextAction | null;
} {
  const currentStep = getCurrentStepId(input);
  const currentIndex = STEP_DEFINITIONS.findIndex((step) => step.id === currentStep);

  const steps: StepState[] = STEP_DEFINITIONS.map((step, index) => {
    const complete = isStepComplete(step.id, input);
    let status: StepStatus = "locked";
    if (complete) {
      status = "complete";
    } else if (index === currentIndex) {
      status = "current";
    } else if (index < currentIndex) {
      status = "complete";
    }
    return { ...step, status };
  });

  return {
    currentStep,
    steps,
    nextAction: buildNextAction(input, currentStep),
  };
}

export function getStepSectionId(stepId: SetupStepId): string {
  return `step-${stepId}`;
}
