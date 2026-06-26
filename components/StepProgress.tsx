import type { StepState, StepStatus } from "@/lib/setup-flow";
import { Fragment } from "react";

type StepProgressProps = {
  steps: StepState[];
};

type CircleSize = "sm" | "md" | "lg";

const sizeClasses: Record<CircleSize, string> = {
  sm: "size-6 text-[10px]",
  md: "size-7 sm:size-8 text-xs",
  lg: "size-10 text-sm",
};

function stepCircleClass(status: StepStatus): string {
  switch (status) {
    case "complete":
      return "bg-success text-background";
    case "current":
      return "bg-accent text-white";
    default:
      return "border border-border bg-surface-elevated text-muted";
  }
}

type StepCircleProps = {
  step: StepState;
  size: CircleSize;
  ariaCurrent?: boolean;
};

function StepCircle({ step, size, ariaCurrent = false }: StepCircleProps) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${sizeClasses[size]} ${stepCircleClass(step.status)}`}
      aria-current={ariaCurrent ? "step" : undefined}
    >
      {step.status === "complete" ? "✓" : step.number}
    </span>
  );
}

function MobileConnector({ visible }: { visible: boolean }) {
  if (!visible) {
    return null;
  }
  return <span className="mx-1 h-px w-3 shrink-0 bg-border" aria-hidden />;
}

function MobileFocusedStepper({ steps }: StepProgressProps) {
  const currentIndex = steps.findIndex((step) => step.status === "current");
  const resolvedIndex = currentIndex >= 0 ? currentIndex : steps.length - 1;
  const current = steps[resolvedIndex];
  const before = steps.slice(0, resolvedIndex);
  const after = steps.slice(resolvedIndex + 1);

  return (
    <div className="flex items-center gap-1 sm:hidden">
      <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
        {before.map((step) => (
          <StepCircle key={step.id} step={step} size="sm" />
        ))}
      </div>

      <MobileConnector visible={before.length > 0} />

      <div className="flex shrink-0 flex-col items-center px-1">
        <StepCircle step={current} size="lg" ariaCurrent />
        <p className="mt-1.5 max-w-[9.5rem] text-center text-sm font-semibold leading-tight text-foreground">
          {current.label}
        </p>
        <p className="mt-0.5 text-center text-xs text-muted">
          Step {current.number} of {steps.length}
        </p>
      </div>

      <MobileConnector visible={after.length > 0} />

      <div className="flex min-w-0 flex-1 items-center justify-start gap-1.5">
        {after.map((step) => (
          <StepCircle key={step.id} step={step} size="sm" />
        ))}
      </div>
    </div>
  );
}

function DesktopStepper({ steps }: StepProgressProps) {
  return (
    <div className="hidden sm:block">
      <ol className="flex w-full list-none items-center p-0">
        {steps.map((step, index) => (
          <Fragment key={step.id}>
            {index > 0 && (
              <li
                className={`h-0.5 flex-1 ${
                  steps[index - 1]?.status === "complete" ? "bg-accent" : "bg-border"
                }`}
                aria-hidden
              />
            )}
            <li className="shrink-0 list-none">
              <StepCircle
                step={step}
                size="md"
                ariaCurrent={step.status === "current"}
              />
            </li>
          </Fragment>
        ))}
      </ol>

      <div className="mt-1 flex w-full">
        {steps.map((step, index) => (
          <Fragment key={`${step.id}-label`}>
            {index > 0 && <span className="flex-1" aria-hidden />}
            <span
              className={`size-7 shrink-0 text-center text-[10px] leading-tight sm:size-8 sm:text-xs ${
                step.status === "current" ? "font-semibold text-foreground" : "text-muted"
              }`}
            >
              {step.shortLabel}
            </span>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

export function StepProgress({ steps }: StepProgressProps) {
  const current = steps.find((step) => step.status === "current") ?? steps[steps.length - 1];

  return (
    <nav aria-label="Setup progress" className="w-full">
      <p className="sr-only">
        Step {current.number} of {steps.length}: {current.label}
      </p>
      <MobileFocusedStepper steps={steps} />
      <DesktopStepper steps={steps} />
    </nav>
  );
}
