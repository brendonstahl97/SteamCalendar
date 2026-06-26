import type { ReactNode } from "react";

type AlertVariant = "warning" | "error" | "success";

type AlertProps = {
  variant: AlertVariant;
  children: ReactNode;
};

const variantClasses: Record<AlertVariant, string> = {
  warning: "border-warning/40 bg-warning/10 text-warning",
  error: "border-danger/40 bg-danger/10 text-danger",
  success: "border-success/40 bg-success/10 text-success",
};

export function Alert({ variant, children }: AlertProps) {
  return (
    <p
      className={`rounded-xl border px-4 py-3 text-sm ${variantClasses[variant]}`}
      role="status"
    >
      {children}
    </p>
  );
}
