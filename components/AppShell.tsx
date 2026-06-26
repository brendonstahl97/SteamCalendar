import type { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
  className?: string;
};

export function AppShell({ children, className = "" }: AppShellProps) {
  return (
    <main
      className={`relative min-h-screen bg-background ${className}`}
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-4 pb-24 sm:py-6 md:px-8 md:py-10 lg:pb-10">
        {children}
      </div>
    </main>
  );
}
