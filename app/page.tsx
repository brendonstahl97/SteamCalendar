"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type WishlistGame = {
  appId: number;
  name: string;
  releaseDateText: string;
  releaseDate?: string;
  releaseDateUnix?: number;
  capsuleUrl?: string;
  storeUrl: string;
};

type SessionStatus = {
  steamConnected: boolean;
  steamId: string | null;
  googleConnected: boolean;
  appleConnected: boolean;
};

type StreamProgress = {
  total: number;
  processed: number;
  emitted: number;
  failed: number;
};

const buttonBase =
  "rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50";

export default function Home() {
  const [started, setStarted] = useState(false);
  const hasBootstrapped = useRef(false);
  const streamRef = useRef<EventSource | null>(null);
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
  const [creating, setCreating] = useState(false);
  const [useGoogle, setUseGoogle] = useState(false);
  const [useApple, setUseApple] = useState(false);
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string>("");

  const closeStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.close();
      streamRef.current = null;
    }
  }, []);

  const loadGames = useCallback(async () => {
    setLoadingGames(true);
    setError("");
    setWarning("");
    setGames([]);
    setSelected({});
    setProgress({ total: 0, processed: 0, emitted: 0, failed: 0 });
    setLoadPhase("connecting");

    closeStream();
    const source = new EventSource("/api/steam/wishlist/stream");
    streamRef.current = source;

    source.addEventListener("status", () => {
      setLoadPhase("loading");
    });

    source.addEventListener("item", (event) => {
      const item = JSON.parse((event as MessageEvent).data) as WishlistGame;
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
      setProgress({
        total: done.total ?? 0,
        processed: done.processed ?? 0,
        emitted: done.emitted ?? 0,
        failed: done.failed ?? 0,
      });
      if ((done.failed ?? 0) > 0 && done.message) {
        setWarning(done.message);
      }
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
  }, [closeStream]);

  const refreshSession = useCallback(async () => {
    const res = await fetch("/api/session", { cache: "no-store" });
    const data = (await res.json()) as SessionStatus;
    setStatus(data);
    if (data.steamConnected) {
      await loadGames();
    }
  }, [loadGames]);

  useEffect(() => {
    if (!started || hasBootstrapped.current) {
      return;
    }
    hasBootstrapped.current = true;
    const timer = window.setTimeout(() => {
      void refreshSession();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [started, refreshSession]);

  useEffect(() => () => closeStream(), [closeStream]);

  const selectedGames = useMemo(
    () => games.filter((game) => selected[game.appId]),
    [games, selected],
  );

  async function enableApple() {
    setError("");
    const res = await fetch("/api/apple/connect", { method: "POST" });
    if (!res.ok) {
      setError("Could not enable Apple Calendar export.");
      return;
    }
    await refreshSession();
    setUseApple(true);
  }

  async function createEvents() {
    setCreating(true);
    setError("");
    setResult("");
    try {
      const createRes = await fetch("/api/events/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          games: selectedGames,
          providers: { google: useGoogle, apple: useApple },
        }),
      });
      const createData = (await createRes.json()) as {
        google: { attempted: boolean; created: number; skipped: number; error: string };
        apple: { attempted: boolean; downloadReady: boolean };
      };
      if (!createRes.ok) {
        throw new Error("Failed to create events.");
      }

      let message = "";
      if (createData.google.attempted) {
        message += `Google: created ${createData.google.created}, skipped ${createData.google.skipped}. `;
        if (createData.google.error) {
          message += `${createData.google.error} `;
        }
      }
      if (createData.apple.attempted && createData.apple.downloadReady) {
        const icsRes = await fetch("/api/apple/ics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ games: selectedGames }),
        });
        const text = await icsRes.text();
        const blob = new Blob([text], { type: "text/calendar;charset=utf-8" });
        const href = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = href;
        a.download = "steam-releases.ics";
        a.click();
        URL.revokeObjectURL(href);
        message += "Apple: .ics file downloaded.";
      }
      setResult(message || "No providers selected.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setCreating(false);
    }
  }

  const allSelected = games.length > 0 && selectedGames.length === games.length;
  const progressPercent =
    progress.total > 0 ? Math.min(100, Math.round((progress.processed / progress.total) * 100)) : 0;

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
        <section className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-xl backdrop-blur md:p-10">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl space-y-4">
              <p className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
                Steam Wishlist to Calendar
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-5xl">
                Turn upcoming wishlisted games into calendar reminders automatically.
              </h1>
              <p className="text-sm leading-relaxed text-slate-600 md:text-base">
                Connect Steam, watch wishlist games stream in live, pick what you care
                about, and create release events in Google or Apple Calendar.
              </p>
            </div>
            {!started && (
              <button
                className={`${buttonBase} bg-slate-900 text-white hover:-translate-y-0.5 hover:bg-slate-800`}
                onClick={() => setStarted(true)}
              >
                Start setup
              </button>
            )}
          </div>
        </section>

        {started && (
          <section className="mt-8 grid gap-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">1. Connect Steam</h2>
                {status?.steamConnected ? (
                  <p className="mt-3 text-sm text-slate-600">
                    Connected as Steam ID: <span className="font-mono">{status.steamId}</span>
                  </p>
                ) : (
                  <a
                    href="/api/steam/start"
                    className={`${buttonBase} mt-4 inline-flex bg-blue-600 text-white hover:bg-blue-500`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Sign in with Steam
                  </a>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Live loading status</h2>
                <p className="mt-2 text-sm text-slate-600">
                  {loadPhase === "idle" && "Waiting to load your wishlist."}
                  {loadPhase === "connecting" && "Connecting to wishlist stream..."}
                  {loadPhase === "loading" &&
                    `Loading games: ${progress.processed}/${progress.total} processed`}
                  {loadPhase === "loaded" &&
                    `Loaded ${games.length} eligible games. Ready to select.`}
                  {loadPhase === "error" && "Loading failed. See error below."}
                </p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Emitted: {progress.emitted} | Failed details: {progress.failed}
                </p>
              </div>
            </div>

            {status?.steamConnected && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-slate-900">
                    2. Select upcoming wishlist games
                  </h2>
                  <button
                    type="button"
                    className={`${buttonBase} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
                    onClick={() => {
                      const next = !allSelected;
                      setSelected(
                        Object.fromEntries(games.map((game) => [game.appId, next])),
                      );
                    }}
                    disabled={games.length === 0}
                  >
                    {allSelected ? "Uncheck all" : "Toggle all"}
                  </button>
                </div>

                {loadingGames && games.length === 0 && (
                  <div className="mt-5 grid gap-3">
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="h-16 animate-pulse rounded-xl bg-slate-100"
                      />
                    ))}
                  </div>
                )}

                {!loadingGames && games.length === 0 && (
                  <p className="mt-4 text-sm text-slate-600">
                    No upcoming unreleased games were found yet.
                  </p>
                )}

                {games.length > 0 && (
                  <ul className="mt-5 grid gap-3 md:grid-cols-2">
                    {games.map((game, index) => (
                      <li
                        key={game.appId}
                        className="wishlist-item-enter flex items-start gap-3 rounded-xl border border-slate-200 p-4 shadow-sm"
                        style={{ animationDelay: `${Math.min(index * 35, 400)}ms` }}
                      >
                        <input
                          type="checkbox"
                          className="mt-1 size-4 accent-blue-600"
                          checked={Boolean(selected[game.appId])}
                          onChange={(event) =>
                            setSelected((prev) => ({
                              ...prev,
                              [game.appId]: event.target.checked,
                            }))
                          }
                        />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{game.name}</p>
                          <p className="mt-1 text-xs text-slate-600">
                            Release: {game.releaseDateText}
                          </p>
                          <p className="text-xs text-slate-500">App ID: {game.appId}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {status?.steamConnected && games.length > 0 && (
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">3. Connect calendars</h2>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      className={`${buttonBase} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
                      onClick={() => {
                        setUseGoogle(true);
                        window.open("/api/google/start", "_blank", "noopener,noreferrer");
                      }}
                    >
                      {status.googleConnected ? "Reconnect Google" : "Connect Google"}
                    </button>
                    <button
                      className={`${buttonBase} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
                      onClick={() => void enableApple()}
                    >
                      {status.appleConnected ? "Apple enabled" : "Enable Apple (.ics)"}
                    </button>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-slate-700">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="size-4 accent-blue-600"
                        checked={useGoogle}
                        onChange={(e) => setUseGoogle(e.target.checked)}
                        disabled={!status.googleConnected}
                      />
                      Include Google Calendar
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="size-4 accent-blue-600"
                        checked={useApple}
                        onChange={(e) => setUseApple(e.target.checked)}
                        disabled={!status.appleConnected}
                      />
                      Include Apple Calendar (.ics download)
                    </label>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">4. Create events</h2>
                  <p className="mt-3 text-sm text-slate-600">
                    Selected games: {selectedGames.length}. Providers:{" "}
                    {[useGoogle && "Google", useApple && "Apple"].filter(Boolean).join(", ") ||
                      "none"}
                    .
                  </p>
                  <button
                    className={`${buttonBase} mt-4 bg-emerald-600 text-white hover:bg-emerald-500`}
                    onClick={() => void createEvents()}
                    disabled={creating || selectedGames.length === 0 || (!useGoogle && !useApple)}
                  >
                    {creating ? "Creating events..." : "Create calendar events"}
                  </button>
                </div>
              </div>
            )}

            {warning && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {warning}
              </p>
            )}
            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}
            {result && (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {result}
              </p>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
