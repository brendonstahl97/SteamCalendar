"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";

function isProvider(value: string | null): value is "steam" {
  return value === "steam";
}

function isStatus(value: string | null): value is "connected" | "error" {
  return value === "connected" || value === "error";
}

function AuthCompleteInner() {
  const searchParams = useSearchParams();
  const provider = searchParams.get("provider");
  const status = searchParams.get("status");
  const valid = isProvider(provider) && isStatus(status);
  const [closeBlocked, setCloseBlocked] = useState(false);

  useEffect(() => {
    if (!valid) {
      return;
    }

    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        { type: "auth-complete", provider, status },
        window.location.origin,
      );
    }

    window.close();
    const timer = window.setTimeout(() => setCloseBlocked(true), 400);
    return () => window.clearTimeout(timer);
  }, [provider, status, valid]);

  if (!valid || closeBlocked) {
    return (
      <AppShell className="flex min-h-screen items-center justify-center">
        <Card className="text-center">
          <p className="text-sm text-muted">You can close this tab.</p>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell className="flex min-h-screen items-center justify-center">
      <Card className="text-center">
        <p className="text-sm text-muted">Completing sign-in...</p>
      </Card>
    </AppShell>
  );
}

export default function AuthCompletePage() {
  return (
    <Suspense
      fallback={
        <AppShell className="flex min-h-screen items-center justify-center">
          <Card className="text-center">
            <p className="text-sm text-muted">Completing sign-in...</p>
          </Card>
        </AppShell>
      }
    >
      <AuthCompleteInner />
    </Suspense>
  );
}
