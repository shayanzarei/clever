"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createOnlineGame } from "@/app/hooks/useOnlineGame";
import { PlayerCountPicker } from "@/app/components/game/PlayerCountPicker";
import { isSupabaseBrowserConfigured } from "@/lib/supabase/client";
import type { PlayerCount } from "@/lib/game/player-seats";

type Mode = "menu" | "create" | "join";

type HomeLobbyProps = {
  onLocal: () => void;
};

export function HomeLobby({ onLocal }: HomeLobbyProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("menu");
  const [displayName, setDisplayName] = useState("Player 1");
  const [playerCount, setPlayerCount] = useState<PlayerCount>(2);
  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("Player 2");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onlineAvailable = isSupabaseBrowserConfigured();

  async function handleCreate() {
    setBusy(true);
    setError(null);
    try {
      const code = await createOnlineGame(
        displayName.trim() || "Player 1",
        playerCount,
      );
      router.push(`/game/${code}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create room");
      setBusy(false);
    }
  }

  function handleJoin() {
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setError("Enter a room code");
      return;
    }
    sessionStorage.setItem(
      `pretty-clever:${code}:joinName`,
      joinName.trim() || "Player 2",
    );
    router.push(`/game/${code}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Pretty Clever
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Play locally on one device or online with friends via Supabase Realtime.
        </p>
      </div>

      {!onlineAvailable && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Online play needs Supabase env vars. Copy{" "}
          <code className="text-xs">.env.local.example</code> and see{" "}
          <code className="text-xs">supabase/README.md</code>.
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      {mode === "menu" && (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            className="rounded-lg bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
            onClick={onLocal}
          >
            Local hot-seat
          </button>
          <button
            type="button"
            disabled={!onlineAvailable}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 enabled:hover:bg-zinc-50 disabled:opacity-50"
            onClick={() => setMode("create")}
          >
            Create online room
          </button>
          <button
            type="button"
            disabled={!onlineAvailable}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 enabled:hover:bg-zinc-50 disabled:opacity-50"
            onClick={() => setMode("join")}
          >
            Join with code
          </button>
        </div>
      )}

      {mode === "create" && (
        <>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700">Your name</span>
            <input
              className="app-input"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </label>
          <PlayerCountPicker value={playerCount} onChange={setPlayerCount} />
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900"
              onClick={() => setMode("menu")}
            >
              Back
            </button>
            <button
              type="button"
              disabled={busy}
              className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              onClick={() => void handleCreate()}
            >
              {busy ? "Creating…" : `Create ${playerCount}-player room`}
            </button>
          </div>
        </>
      )}

      {mode === "join" && (
        <>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700">Room code</span>
            <input
              className="app-input uppercase tracking-widest"
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              maxLength={6}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700">Your name</span>
            <input
              className="app-input"
              value={joinName}
              onChange={(event) => setJoinName(event.target.value)}
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900"
              onClick={() => setMode("menu")}
            >
              Back
            </button>
            <button
              type="button"
              className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
              onClick={handleJoin}
            >
              Join room
            </button>
          </div>
        </>
      )}
    </div>
  );
}
