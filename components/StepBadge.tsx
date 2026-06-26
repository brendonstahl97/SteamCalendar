import type { StepStatus } from "@/lib/setup-flow";

const badgeStyles: Record<StepStatus, string> = {
  complete: "bg-success/20 text-success",
  current: "bg-accent/20 text-accent-hover",
  locked: "bg-surface-elevated text-muted",
};

const badgeLabels: Record<StepStatus, string> = {
  complete: "Done",
  current: "Current",
  locked: "Locked",
};

type StepBadgeProps = {
  status: StepStatus;
};

export function StepBadge({ status }: StepBadgeProps) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeStyles[status]}`}
    >
      {badgeLabels[status]}
    </span>
  );
}
