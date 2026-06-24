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

    const hasOpener = Boolean(window.opener);
    const openerClosed = hasOpener ? window.opener!.closed : null;
    let postMessageSent = false;

    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        { type: "auth-complete", provider, status },
        window.location.origin,
      );
      postMessageSent = true;
    }

    // #region agent log
    fetch("http://127.0.0.1:7540/ingest/1d6d0161-91f9-4885-a416-bb26b4b152ed", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9f44b2" },
      body: JSON.stringify({
        sessionId: "9f44b2",
        hypothesisId: "A",
        location: "app/auth/complete/page.tsx:useEffect",
        message: "auth-complete-page",
        data: {
          provider,
          status,
          valid,
          hasOpener,
          openerClosed,
          postMessageSent,
          origin: window.location.origin,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

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
