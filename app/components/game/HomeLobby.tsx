"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
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

  if (mode === "create") {
    return (
      <CreateRoomScreen
        displayName={displayName}
        playerCount={playerCount}
        error={error}
        busy={busy}
        onNameChange={setDisplayName}
        onPlayerCountChange={setPlayerCount}
        onBack={() => {
          setError(null);
          setMode("menu");
        }}
        onCreate={() => void handleCreate()}
      />
    );
  }

  if (mode === "join") {
    return (
      <JoinRoomScreen
        joinCode={joinCode}
        joinName={joinName}
        error={error}
        onlineAvailable={onlineAvailable}
        onCodeChange={setJoinCode}
        onNameChange={setJoinName}
        onBack={() => {
          setError(null);
          setMode("menu");
        }}
        onJoin={handleJoin}
      />
    );
  }

  return (
    <div className="relative flex min-h-dvh w-full flex-col overflow-hidden bg-ink text-white">
      <MenuHeader />

      <main className="relative flex flex-1 flex-col items-center justify-center px-5 pt-20 pb-4">
        <div className="pointer-events-none absolute inset-0 z-0 opacity-10">
          <div className="h-full w-full bg-[radial-gradient(#2e283e_1px,transparent_1px)] bg-[length:20px_20px]" />
        </div>
        <div className="pointer-events-none absolute top-1/2 left-1/2 z-0 h-[40%] w-full -translate-x-1/2 -translate-y-1/2 opacity-40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="h-full w-full object-contain"
            src="https://storage.googleapis.com/uxpilot-auth.appspot.com/gen_ca074dba43_e46194c46ced62a4.png"
            alt=""
          />
        </div>

        <div className="relative z-10 w-full max-w-md text-center">
          <h1 className="mb-12 text-6xl font-bold tracking-tighter">
            <span className="bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">
              READY?
            </span>
          </h1>

          {!onlineAvailable && (
            <p className="mb-3 rounded-2xl border border-neon-orange/30 bg-neon-orange/10 px-4 py-3 text-left text-xs text-muted">
              Online play needs Supabase env vars. Copy{" "}
              <code className="text-white/80">.env.local.example</code> and see{" "}
              <code className="text-white/80">supabase/README.md</code>.
            </p>
          )}

          {error && (
            <p className="mb-3 rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-left text-sm text-red-200">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-3 text-left">
            <button
              type="button"
              onClick={onLocal}
              className="group flex items-center gap-5 rounded-3xl border border-line bg-surface px-6 py-5 text-left transition-colors active:bg-elevated"
            >
              <IconWell tone="green">
                <UsersIcon />
              </IconWell>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold">Local Hot-seat</h3>
                <p className="text-[10px] text-muted">Play with friends nearby</p>
              </div>
              <ChevronIcon />
            </button>

            <button
              type="button"
              disabled={!onlineAvailable}
              onClick={() => {
                setError(null);
                setMode("create");
              }}
              className="group flex items-center gap-5 rounded-3xl border border-line bg-surface px-6 py-5 text-left transition-colors enabled:active:bg-elevated disabled:opacity-40"
            >
              <IconWell tone="blue">
                <GlobeIcon />
              </IconWell>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold">Create Online Room</h3>
                <p className="text-[10px] text-muted">Invite remote players</p>
              </div>
              <ChevronIcon />
            </button>

            <button
              type="button"
              disabled={!onlineAvailable}
              onClick={() => {
                setError(null);
                setMode("join");
              }}
              className="group flex items-center gap-5 rounded-3xl border border-line bg-surface px-6 py-5 text-left transition-colors enabled:active:bg-elevated disabled:opacity-40"
            >
              <IconWell tone="purple">
                <KeyIcon />
              </IconWell>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold">Join with Code</h3>
                <p className="text-[10px] text-muted">Enter a room code</p>
              </div>
              <ChevronIcon />
            </button>
          </div>
        </div>
      </main>

      <footer className="p-8 text-center text-[10px] tracking-widest text-muted uppercase opacity-30">
        CLEVER © 2026
      </footer>
    </div>
  );
}

function MenuHeader() {
  return (
    <nav className="fixed top-0 left-0 z-50 flex w-full items-center justify-between px-6 py-6">
      <span className="text-xl font-bold tracking-tight">
        CLEVER
        <span className="text-neon-orange">.</span>
      </span>
      <span className="flex h-10 w-10 items-center justify-center text-muted" aria-hidden>
        <GearIcon />
      </span>
    </nav>
  );
}

function CreateRoomScreen({
  displayName,
  playerCount,
  error,
  busy,
  onNameChange,
  onPlayerCountChange,
  onBack,
  onCreate,
}: {
  displayName: string;
  playerCount: PlayerCount;
  error: string | null;
  busy: boolean;
  onNameChange: (value: string) => void;
  onPlayerCountChange: (count: PlayerCount) => void;
  onBack: () => void;
  onCreate: () => void;
}) {
  return (
    <div className="relative flex min-h-dvh w-full flex-col overflow-x-hidden bg-ink text-white">
      <MenuHeader />

      <main className="relative flex flex-1 flex-col items-center justify-center px-6 pt-24 pb-12">
        <div className="bg-grid pointer-events-none absolute inset-0 z-0 opacity-10" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 z-0 h-[300px] w-full -translate-x-1/2 -translate-y-1/2 rounded-full bg-neon-blue/30 opacity-20 blur-3xl" />

        <form
          className="glass-card relative z-10 w-full max-w-md space-y-8 rounded-[2.5rem] p-8 shadow-2xl"
          onSubmit={(event) => {
            event.preventDefault();
            onCreate();
          }}
        >
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Pretty Clever</h1>
            <p className="mt-2 text-sm text-muted">
              Play locally on one device or online with friends via Supabase Realtime.
            </p>
          </div>

          {error && (
            <p className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          )}

          <label className="block space-y-2">
            <span className="block text-xs font-bold tracking-widest text-muted uppercase">
              Your name
            </span>
            <input
              type="text"
              value={displayName}
              onChange={(event) => onNameChange(event.target.value)}
              className="h-14 w-full rounded-2xl border-2 border-line bg-elevated px-5 text-white placeholder:text-muted/30 focus:border-neon-blue/50 focus:outline-none"
            />
          </label>

          <PlayerCountPicker
            value={playerCount}
            onChange={onPlayerCountChange}
            variant="neon"
          />

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onBack}
              className="h-14 rounded-2xl border-2 border-line bg-surface px-6 font-bold text-white transition-all active:scale-95"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={busy}
              className="h-14 flex-1 rounded-2xl bg-neon-blue text-sm font-black tracking-tight text-ink shadow-[0_0_24px_rgba(19,239,244,0.35)] transition-all active:scale-95 disabled:opacity-50"
            >
              {busy ? "Creating…" : `Create ${playerCount}-player room`}
            </button>
          </div>
        </form>
      </main>

      <footer className="relative z-10 p-10 text-center">
        <p className="text-[10px] font-semibold tracking-[0.2em] text-muted uppercase opacity-40">
          CLEVER © 2026 • Realtime Play
        </p>
      </footer>
    </div>
  );
}

function JoinRoomScreen({
  joinCode,
  joinName,
  error,
  onlineAvailable,
  onCodeChange,
  onNameChange,
  onBack,
  onJoin,
}: {
  joinCode: string;
  joinName: string;
  error: string | null;
  onlineAvailable: boolean;
  onCodeChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onBack: () => void;
  onJoin: () => void;
}) {
  return (
    <div className="relative flex min-h-dvh w-full flex-col overflow-x-hidden bg-ink text-white">
      <MenuHeader />

      <main className="relative flex flex-1 flex-col items-center justify-center px-6 pt-24 pb-12">
        <div className="bg-grid pointer-events-none absolute inset-0 z-0 opacity-10" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 z-0 h-[300px] w-full -translate-x-1/2 -translate-y-1/2 rounded-full bg-neon-purple/30 opacity-20 blur-3xl" />

        <div className="relative z-10 w-full max-w-md space-y-8">
          <div className="space-y-2 text-center">
            <h1 className="text-4xl font-extrabold tracking-tighter">
              <span className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent uppercase">
                Join Room
              </span>
            </h1>
            <p className="px-8 text-sm text-muted">
              Play locally on one device or online with friends via Supabase Realtime.
            </p>
          </div>

          {error && (
            <p className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          )}

          <form
            className="glass-card space-y-8 rounded-[2.5rem] p-8 shadow-2xl"
            onSubmit={(event) => {
              event.preventDefault();
              onJoin();
            }}
          >
            <div className="space-y-6">
              <label className="block space-y-2">
                <span className="ml-1 block text-xs font-bold tracking-widest text-muted uppercase">
                  Room code
                </span>
                <span className="relative block">
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(event) =>
                      onCodeChange(event.target.value.toUpperCase())
                    }
                    maxLength={6}
                    placeholder="e.g. AB12CD"
                    autoComplete="off"
                    className="h-14 w-full rounded-2xl border-2 border-line bg-elevated px-5 font-mono tracking-widest text-white uppercase placeholder:text-muted/30 focus:border-neon-purple/50 focus:outline-none"
                  />
                  <span className="absolute top-1/2 right-4 -translate-y-1/2 text-neon-purple/40">
                    <HashIcon />
                  </span>
                </span>
              </label>

              <label className="block space-y-2">
                <span className="ml-1 block text-xs font-bold tracking-widest text-muted uppercase">
                  Your name
                </span>
                <span className="relative block">
                  <input
                    type="text"
                    value={joinName}
                    onChange={(event) => onNameChange(event.target.value)}
                    className="h-14 w-full rounded-2xl border-2 border-line bg-elevated px-5 text-white placeholder:text-muted/30 focus:border-neon-purple/50 focus:outline-none"
                  />
                  <span className="absolute top-1/2 right-4 -translate-y-1/2 text-neon-purple/40">
                    <AstronautIcon />
                  </span>
                </span>
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onBack}
                className="h-14 rounded-2xl border-2 border-line bg-surface px-6 font-bold text-muted transition-all active:scale-95"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={!onlineAvailable}
                className="h-14 flex-1 rounded-2xl bg-white text-sm font-black tracking-wider text-ink uppercase shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all active:scale-95 disabled:opacity-40"
              >
                Join room
              </button>
            </div>
          </form>

          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neon-green" />
              <span className="text-[10px] font-bold tracking-widest text-muted uppercase">
                Realtime play
              </span>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 p-10 text-center">
        <p className="text-[10px] font-semibold tracking-[0.2em] text-muted uppercase opacity-40">
          CLEVER © 2026 • Realtime Play
        </p>
      </footer>
    </div>
  );
}

function HashIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 9h14M5 15h14M9 4 7 20M17 4l-2 16" />
    </svg>
  );
}

function AstronautIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="9" r="3.2" />
      <path d="M7 20c.6-3.2 2.6-5 5-5s4.4 1.8 5 5" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

function IconWell({
  tone,
  children,
}: {
  tone: "green" | "blue" | "purple";
  children: ReactNode;
}) {
  const tones = {
    green: "border-neon-green/20 bg-neon-green/10 text-neon-green",
    blue: "border-neon-blue/20 bg-neon-blue/10 text-neon-blue",
    purple: "border-neon-purple/20 bg-neon-purple/10 text-neon-purple",
  };

  return (
    <div
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${tones[tone]}`}
    >
      {children}
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg className="h-3 w-3 shrink-0 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg className="h-[1.125rem] w-[1.125rem]" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.14 12.94a7.43 7.43 0 0 0 .05-.94 7.43 7.43 0 0 0-.05-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.2 7.2 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.8a.5.5 0 0 0-.49.42l-.36 2.54c-.58.22-1.13.53-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.48a.5.5 0 0 0 .12.64l2.03 1.58c-.03.31-.05.63-.05.94s.02.63.05.94L2.83 14.16a.5.5 0 0 0-.12.64l1.92 3.32c.13.23.4.32.64.22l2.39-.96c.5.41 1.05.72 1.63.94l.36 2.54c.05.24.25.42.49.42h3.8c.24 0 .44-.18.49-.42l.36-2.54c.58-.22 1.13-.53 1.63-.94l2.39.96c.24.1.51 0 .64-.22l1.92-3.32a.5.5 0 0 0-.12-.64zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="8" r="2.4" />
      <circle cx="15" cy="8" r="2.4" />
      <path d="M4.5 18c.4-2.6 2.6-4 4.5-4s4.1 1.4 4.5 4" />
      <path d="M10.5 18c.4-2.6 2.6-4 4.5-4s4.1 1.4 4.5 4" />
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.6 2.4 4 5.4 4 8.5s-1.4 6.1-4 8.5c-2.6-2.4-4-5.4-4-8.5s1.4-6.1 4-8.5z" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="8" cy="12" r="3.5" />
      <path d="M11.5 12H20v3M16 12v3" />
    </svg>
  );
}
