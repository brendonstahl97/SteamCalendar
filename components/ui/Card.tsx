import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
  dimmed?: boolean;
  id?: string;
};

export function Card({ children, className = "", dimmed = false, id }: CardProps) {
  return (
    <section
      id={id}
      className={`rounded-2xl border border-border bg-surface p-5 shadow-sm transition-opacity ${
        dimmed ? "opacity-60" : ""
      } ${className}`}
    >
      {children}
    </section>
  );
}
