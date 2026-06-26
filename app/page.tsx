"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { WishlistGameCard } from "@/components/WishlistGameCard";
import { IcsHelpDisclosure } from "@/components/IcsHelpDisclosure";
import { StepBadge } from "@/components/StepBadge";
import { StepProgress } from "@/components/StepProgress";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  getSetupProgress,
  getStepSectionId,
  type SetupStepId,
} from "@/lib/setup-flow";
import {
  readWishlistCache,
  writeWishlistCache,
} from "@/lib/wishlist-client-cache";
import type { WishlistGame } from "@/lib/integrations/types";

type SessionStatus = {
  steamConnected: boolean;
  steamId: string | null;
};

type StreamProgress = {
  total: number;
  processed: number;
  emitted: number;
  failed: number;
};

type AuthCompleteMessage = {
  type: "auth-complete";
  provider: "steam";
  status: "connected" | "error";
};

const AUTH_POPUP_FEATURES = "width=520,height=720";

function isAuthCompleteMessage(data: unknown): data is AuthCompleteMessage {
  if (!data || typeof data !== "object") {
    return false;
  }
  const message = data as Record<string, unknown>;
  return (
    message.type === "auth-complete" &&
    message.provider === "steam" &&
    (message.status === "connected" || message.status === "error")
  );
}

function stepStatusFor(
  steps: ReturnType<typeof getSetupProgress>["steps"],
  id: SetupStepId,
) {
  return steps.find((step) => step.id === id)?.status ?? "locked";
}

export default function Home() {
  const [started, setStarted] = useState(false);
  const hasBootstrapped = useRef(false);
  const streamRef = useRef<EventSource | null>(null);
  const authPopupRef = useRef<Window | null>(null);
  const previousSteamIdRef = useRef<string | null>(null);
  const previousStepRef = useRef<SetupStepId | null>(null);
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [games, setGames] = useState<WishlistGame[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [loadPhase, setLoadPhase] = useState<
    "idle" | "connecting" | "loading" | "loaded" | "error"
  >("idle");
  const [progress, setProgress] = useState<StreamProgress>({
    total: 0,
    processed: 0,
    emitted: 0,
    failed: 0,
  });
  const [warning, setWarning] = useState("");
  const [loadingGames, setLoadingGames] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);

  const closeStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.close();
      streamRef.current = null;
    }
  }, []);

  const hydrateWishlistFromCache = useCallback((steamId: string) => {
    const cached = readWishlistCache(steamId);
    if (!cached) {
      return false;
    }

    setGames(cached.games);
    setSelected(Object.fromEntries(cached.games.map((game) => [game.appId, true])));
    setProgress(cached.progress);
    setFetchedAt(cached.fetchedAt);
    setLoadPhase("loaded");
    setLoadingGames(false);
    return true;
  }, []);

  const resetWishlistState = useCallback(() => {
    setGames([]);
    setSelected({});
    setProgress({ total: 0, processed: 0, emitted: 0, failed: 0 });
    setFetchedAt(null);
    setLoadPhase("idle");
    setLoadingGames(false);
    setWarning("");
  }, []);

  const fetchWishlist = useCallback(() => {
    const steamId = status?.steamId;
    if (!steamId) {
      return;
    }

    setLoadingGames(true);
    setError("");
    setWarning("");
    setGames([]);
    setSelected({});
    setProgress({ total: 0, processed: 0, emitted: 0, failed: 0 });
    setLoadPhase("connecting");

    closeStream();
    const collected: WishlistGame[] = [];
    const source = new EventSource("/api/steam/wishlist/stream");
    streamRef.current = source;

    source.addEventListener("status", () => {
      setLoadPhase("loading");
    });

    source.addEventListener("item", (event) => {
      const item = JSON.parse((event as MessageEvent).data) as WishlistGame;
      if (!collected.some((game) => game.appId === item.appId)) {
        collected.push(item);
      }
      setGames((prev) => {
        const exists = prev.some((game) => game.appId === item.appId);
        if (exists) {
          return prev;
        }
        return [...prev, item];
      });
      setSelected((prev) => ({ ...prev, [item.appId]: true }));
    });

    source.addEventListener("progress", (event) => {
      const next = JSON.parse((event as MessageEvent).data) as StreamProgress;
      setProgress(next);
      setLoadPhase("loading");
    });

    source.addEventListener("done", (event) => {
      const done = JSON.parse((event as MessageEvent).data) as StreamProgress & {
        message?: string;
      };
      const finalProgress = {
        total: done.total ?? 0,
        processed: done.processed ?? 0,
        emitted: done.emitted ?? 0,
        failed: done.failed ?? 0,
      };
      setProgress(finalProgress);
      if ((done.failed ?? 0) > 0 && done.message) {
        setWarning(done.message);
      }
      const fetchedAtMs = Date.now();
      setFetchedAt(fetchedAtMs);
      writeWishlistCache(steamId, {
        version: 1,
        steamId,
        games: collected,
        progress: finalProgress,
        fetchedAt: fetchedAtMs,
      });
      setLoadPhase("loaded");
      setLoadingGames(false);
      closeStream();
    });

    source.addEventListener("error", (event) => {
      let message = "Failed to load wishlist.";
      try {
        const payload = JSON.parse((event as MessageEvent).data) as { message?: string };
        message = payload.message ?? message;
      } catch {
        // no-op
      }
      setError(message);
      setLoadPhase("error");
      setLoadingGames(false);
      closeStream();
    });
  }, [closeStream, status?.steamId]);

  const applySessionStatus = useCallback(
    (data: SessionStatus) => {
      const nextSteamId = data.steamId;
      const previousSteamId = previousSteamIdRef.current;

      if (
        previousSteamId &&
        nextSteamId &&
        previousSteamId !== nextSteamId
      ) {
        resetWishlistState();
      }

      if (!data.steamConnected) {
        resetWishlistState();
      }

      previousSteamIdRef.current = nextSteamId;
      setStatus(data);
    },
    [resetWishlistState],
  );

  const refreshSession = useCallback(async (): Promise<SessionStatus> => {
    const res = await fetch("/api/session", { cache: "no-store" });
    const data = (await res.json()) as SessionStatus;
    applySessionStatus(data);
    return data;
  }, [applySessionStatus]);

  const refreshSessionAndHydrate = useCallback(async () => {
    const data = await refreshSession();
    if (data.steamConnected && data.steamId) {
      hydrateWishlistFromCache(data.steamId);
    }
  }, [hydrateWishlistFromCache, refreshSession]);

  const openAuthPopup = useCallback((url: string) => {
    setError("");
    const popup = window.open(url, "swc-auth", AUTH_POPUP_FEATURES);
    if (!popup) {
      setError("Allow popups for this site to sign in.");
      return;
    }
    authPopupRef.current = popup;
  }, []);

  useEffect(() => {
    if (!started || hasBootstrapped.current) {
      return;
    }
    hasBootstrapped.current = true;
    const timer = window.setTimeout(() => {
      void refreshSessionAndHydrate();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [started, refreshSessionAndHydrate]);

  useEffect(() => {
    function onAuthMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) {
        return;
      }
      if (authPopupRef.current && event.source !== authPopupRef.current) {
        return;
      }
      if (!isAuthCompleteMessage(event.data)) {
        return;
      }

      authPopupRef.current = null;

      if (event.data.status === "connected") {
        setError("");
        void (async () => {
          const data = await refreshSession();
          if (data.steamConnected && data.steamId) {
            hydrateWishlistFromCache(data.steamId);
          }
        })();
        return;
      }

      setError("Steam sign-in failed. Please try again.");
    }

    window.addEventListener("message", onAuthMessage);
    return () => window.removeEventListener("message", onAuthMessage);
  }, [hydrateWishlistFromCache, refreshSession]);

  useEffect(() => () => closeStream(), [closeStream]);

  const selectedGames = useMemo(
    () => games.filter((game) => selected[game.appId]),
    [games, selected],
  );

  const selectedAppIds = useMemo(
    () => selectedGames.map((game) => game.appId),
    [selectedGames],
  );

  const setupProgress = useMemo(
    () =>
      getSetupProgress({
        steamConnected: Boolean(status?.steamConnected),
        loadPhase,
        gamesCount: games.length,
        selectedCount: selectedGames.length,
      }),
    [status?.steamConnected, loadPhase, games.length, selectedGames.length],
  );

  useEffect(() => {
    if (!started) {
      return;
    }
    const current = setupProgress.currentStep;
    if (previousStepRef.current && previousStepRef.current !== current) {
      document
        .getElementById(getStepSectionId(current))
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    previousStepRef.current = current;
  }, [setupProgress.currentStep, started]);

  const downloadIcs = useCallback(async () => {
    if (selectedAppIds.length === 0) {
      return;
    }
    setDownloading(true);
    setError("");
    setResult("");
    try {
      const icsRes = await fetch("/api/ics/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appIds: selectedAppIds }),
      });
      if (!icsRes.ok) {
        const payload = (await icsRes.json()) as { error?: string };
        throw new Error(payload.error ?? "Failed to download .ics file.");
      }
      const text = await icsRes.text();
      const blob = new Blob([text], { type: "text/calendar;charset=utf-8" });
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = "steam-releases.ics";
      a.click();
      URL.revokeObjectURL(href);
      setResult(".ics file downloaded. Import it into your calendar app when ready.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setDownloading(false);
    }
  }, [selectedAppIds]);

  const handleNextAction = useCallback(() => {
    const action = setupProgress.nextAction;
    if (!action) {
      return;
    }
    switch (action.stepId) {
      case "steam":
        openAuthPopup("/api/steam/start");
        break;
      case "fetch":
        fetchWishlist();
        break;
      case "export":
        void downloadIcs();
        break;
      default:
        document
          .getElementById(getStepSectionId(action.stepId))
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [downloadIcs, fetchWishlist, openAuthPopup, setupProgress.nextAction]);

  const allSelected = games.length > 0 && selectedGames.length === games.length;
  const progressPercent =
    progress.total > 0 ? Math.min(100, Math.round((progress.processed / progress.total) * 100)) : 0;
  const hasWishlistData =
    games.length > 0 || loadPhase === "loaded" || fetchedAt !== null;
  const fetchButtonLabel = hasWishlistData
    ? "Re-fetch Wishlist Items"
    : "Get Wishlist Items";
  const isFetching =
    loadingGames || loadPhase === "connecting" || loadPhase === "loading";
  const lastFetchedLabel =
    fetchedAt !== null
      ? `Last fetched: ${new Date(fetchedAt).toLocaleString()}`
      : null;

  const nextActionDisabled = useMemo(() => {
    const action = setupProgress.nextAction;
    if (!action) {
      return true;
    }
    if (action.stepId === "fetch") {
      return isFetching || !status?.steamConnected;
    }
    if (action.stepId === "export") {
      return downloading || selectedGames.length === 0;
    }
    if (action.stepId === "select" && games.length === 0) {
      return true;
    }
    return false;
  }, [
    setupProgress.nextAction,
    isFetching,
    status?.steamConnected,
    downloading,
    selectedGames.length,
    games.length,
  ]);

  const showGameSteps = Boolean(status?.steamConnected);
  const showExportStep = showGameSteps && selectedGames.length > 0;

  return (
    <AppShell>
      <Card className="bg-surface-elevated/80 p-6 md:p-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-4">
            <p className="inline-block rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold tracking-wide text-accent-hover">
              Steam Wishlist to Calendar
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-4xl">
              Turn upcoming wishlisted games into calendar reminders.
            </h1>
            <p className="text-sm leading-relaxed text-muted md:text-base">
              Connect Steam, pick upcoming releases, then add them to your calendar
              one at a time or download everything as a .ics file. No Google account
              connection required.
            </p>
          </div>
          {!started && (
            <Button variant="primary" fullWidth onClick={() => setStarted(true)}>
              Start setup
            </Button>
          )}
        </div>
      </Card>

      {started && (
        <section className="mt-6 space-y-6 md:mt-8 md:space-y-8">
          <div className="sticky top-0 z-10 -mx-4 border-b border-border bg-background/90 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
            <StepProgress steps={setupProgress.steps} />
          </div>

          <Card
            id={getStepSectionId("steam")}
            dimmed={stepStatusFor(setupProgress.steps, "steam") === "locked"}
            className="scroll-mt-32 p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-foreground">1. Connect Steam</h2>
              <StepBadge status={stepStatusFor(setupProgress.steps, "steam")} />
            </div>
            {status?.steamConnected ? (
              <p className="mt-3 text-sm text-muted">
                Connected as Steam ID:{" "}
                <span className="font-mono text-foreground">{status.steamId}</span>
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => openAuthPopup("/api/steam/start")}
                >
                  Sign in with Steam
                </Button>
                <p className="text-xs text-muted">
                  Allow popups if sign-in does not open.
                </p>
              </div>
            )}
          </Card>

          <Card
            id={getStepSectionId("fetch")}
            dimmed={stepStatusFor(setupProgress.steps, "fetch") === "locked"}
            className="scroll-mt-32 p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-foreground">2. Load wishlist</h2>
              <StepBadge status={stepStatusFor(setupProgress.steps, "fetch")} />
            </div>
            <p className="mt-2 text-sm text-muted">
              {loadPhase === "idle" && "Click Get Wishlist Items to load your wishlist."}
              {loadPhase === "connecting" && "Connecting to wishlist stream..."}
              {loadPhase === "loading" &&
                `Loading games: ${progress.processed}/${progress.total} processed`}
              {loadPhase === "loaded" &&
                `Loaded ${games.length} eligible games. Ready to select.`}
              {loadPhase === "error" && "Loading failed. See error below."}
            </p>
            {status?.steamConnected && (
              <Button
                variant="secondary"
                fullWidth
                className="mt-4"
                onClick={() => fetchWishlist()}
                disabled={isFetching}
              >
                {fetchButtonLabel}
              </Button>
            )}
            {lastFetchedLabel && (
              <p className="mt-2 text-xs text-muted">{lastFetchedLabel}</p>
            )}
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-elevated">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted">
              Emitted: {progress.emitted} | Failed details: {progress.failed}
            </p>
          </Card>

          {showGameSteps && (
            <Card
              id={getStepSectionId("select")}
              dimmed={stepStatusFor(setupProgress.steps, "select") === "locked"}
              className="scroll-mt-32 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-foreground">
                  3. Select upcoming wishlist games
                </h2>
                <StepBadge status={stepStatusFor(setupProgress.steps, "select")} />
              </div>

              {games.length > 0 && (
                <p className="mt-3 rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-muted">
                  <span className="font-medium text-foreground">Two options — both optional.</span>{" "}
                  Add games one at a time below, or download all selected in step 4.
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    const next = !allSelected;
                    setSelected(
                      Object.fromEntries(games.map((game) => [game.appId, next])),
                    );
                  }}
                  disabled={
                    games.length === 0 ||
                    stepStatusFor(setupProgress.steps, "select") === "locked"
                  }
                >
                  {allSelected ? "Uncheck all" : "Toggle all"}
                </Button>
              </div>

              {loadingGames && games.length === 0 && (
                <div className="mt-5 grid gap-3">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="h-16 animate-pulse rounded-xl bg-surface-elevated"
                    />
                  ))}
                </div>
              )}

              {!loadingGames && games.length === 0 && loadPhase === "idle" && (
                <p className="mt-4 text-sm text-muted">
                  Fetch your wishlist using the button in step 2.
                </p>
              )}

              {!loadingGames && games.length === 0 && loadPhase === "loaded" && (
                <p className="mt-4 text-sm text-muted">
                  No upcoming unreleased games were found yet.
                </p>
              )}

              {games.length > 0 && (
                <ul className="mt-5 grid min-w-0 gap-3 lg:grid-cols-2">
                  {games.map((game, index) => (
                    <WishlistGameCard
                      key={game.appId}
                      game={game}
                      selected={Boolean(selected[game.appId])}
                      disabled={stepStatusFor(setupProgress.steps, "select") === "locked"}
                      animationDelayMs={Math.min(index * 35, 400)}
                      onToggle={(checked) =>
                        setSelected((prev) => ({
                          ...prev,
                          [game.appId]: checked,
                        }))
                      }
                    />
                  ))}
                </ul>
              )}
            </Card>
          )}

          {showExportStep && (
            <Card
              id={getStepSectionId("export")}
              dimmed={stepStatusFor(setupProgress.steps, "export") === "locked"}
              className="scroll-mt-32 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-foreground">
                  4. Export to your calendar (optional)
                </h2>
                <StepBadge status={stepStatusFor(setupProgress.steps, "export")} />
              </div>

              <p className="mt-3 text-sm text-muted">
                You&apos;re done whenever your calendar looks right. No account connection
                needed — use one option below, both, or neither.
              </p>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-border bg-surface-elevated p-4">
                  <h3 className="text-sm font-semibold text-foreground">One at a time</h3>
                  <p className="mt-2 text-sm text-muted">
                    Use <span className="text-foreground">Add to Google Calendar</span> on each
                    game card above. Opens Google Calendar in a new tab — tap Save for each
                    event.
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-surface-elevated p-4">
                  <h3 className="text-sm font-semibold text-foreground">All selected at once</h3>
                  <p className="mt-2 text-sm text-muted">
                    Download a .ics file for {selectedGames.length} selected game
                    {selectedGames.length === 1 ? "" : "s"}, then import into Google Calendar
                    (Settings → Import &amp; export → Import) or any calendar app.{" "}
                    <IcsHelpDisclosure />
                  </p>
                  <Button
                    variant="primary"
                    fullWidth
                    className="mt-4"
                    onClick={() => void downloadIcs()}
                    disabled={downloading || selectedGames.length === 0}
                  >
                    {downloading ? "Downloading..." : "Download .ics for selected games"}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {warning && <Alert variant="warning">{warning}</Alert>}
          {error && <Alert variant="error">{error}</Alert>}
          {result && <Alert variant="success">{result}</Alert>}
        </section>
      )}

      {started && setupProgress.nextAction && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 p-4 pb-safe backdrop-blur lg:hidden">
          <Button
            variant="primary"
            fullWidth
            onClick={handleNextAction}
            disabled={nextActionDisabled}
          >
            {setupProgress.nextAction.label}
          </Button>
        </div>
      )}
    </AppShell>
  );
}
