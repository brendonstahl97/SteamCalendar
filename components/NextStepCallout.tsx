import { Button } from "@/components/ui/Button";
import type { NextAction } from "@/lib/setup-flow";

type NextStepCalloutProps = {
  description: string;
  nextAction: NextAction | null;
  onAction?: () => void;
  actionDisabled?: boolean;
};

export function NextStepCallout({
  description,
  nextAction,
  onAction,
  actionDisabled = false,
}: NextStepCalloutProps) {
  return (
    <div className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3">
      <p className="text-sm font-medium text-foreground">{description}</p>
      {nextAction && onAction && (
        <Button
          variant="primary"
          fullWidth
          className="mt-3"
          onClick={onAction}
          disabled={actionDisabled}
        >
          {nextAction.label}
        </Button>
      )}
    </div>
  );
}
