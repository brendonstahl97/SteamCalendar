"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function isProvider(value: string | null): value is "steam" | "google" {
  return value === "steam" || value === "google";
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
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="text-sm text-slate-600">You can close this tab.</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <p className="text-sm text-slate-600">Completing sign-in...</p>
    </main>
  );
}

export default function AuthCompletePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center p-6">
          <p className="text-sm text-slate-600">Completing sign-in...</p>
        </main>
      }
    >
      <AuthCompleteInner />
    </Suspense>
  );
}
