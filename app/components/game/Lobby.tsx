"use client";

import { useMemo, useState } from "react";
import { PlayerCountPicker } from "@/app/components/game/PlayerCountPicker";
import {
  defaultDisplayName,
  seatsForCount,
  type PlayerCount,
  type PlayerSeatId,
} from "@/lib/game/player-seats";

type LobbyProps = {
  onStart: (playerCount: PlayerCount, names: string[]) => void;
  onBack: () => void;
};

export function Lobby({ onStart, onBack }: LobbyProps) {
  const [playerCount, setPlayerCount] = useState<PlayerCount>(2);
  const [names, setNames] = useState(["Player 1", "Player 2", "Player 3", "Player 4"]);

  const visibleNames = useMemo(() => names.slice(0, playerCount), [names, playerCount]);

  function updateName(index: number, value: string) {
    setNames((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  }

  function handleStart() {
    const resolved = visibleNames.map((name, index) => {
      const seat = seatsForCount(playerCount)[index] as PlayerSeatId;
      return name.trim() || defaultDisplayName(seat);
    });
    onStart(playerCount, resolved);
  }

  return (
    <div className="relative flex min-h-dvh w-full flex-col overflow-x-hidden bg-ink text-white">
      <nav className="fixed top-0 left-0 z-50 flex w-full items-center justify-between px-6 py-6">
        <span className="text-xl font-bold tracking-tight">
          CLEVER<span className="text-neon-orange">.</span>
        </span>
      </nav>

      <main className="relative flex flex-1 flex-col items-center justify-center px-6 pt-24 pb-12">
        <div className="bg-grid pointer-events-none absolute inset-0 z-0 opacity-10" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 z-0 h-[300px] w-full -translate-x-1/2 -translate-y-1/2 rounded-full bg-neon-green/20 opacity-20 blur-3xl" />

        <form
          className="glass-card relative z-10 w-full max-w-md space-y-6 rounded-[2.5rem] p-8 shadow-2xl"
          onSubmit={(event) => {
            event.preventDefault();
            handleStart();
          }}
        >
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Pretty Clever</h1>
            <p className="mt-3 rounded-2xl border border-dashed border-white/70 px-4 py-3 text-sm text-white">
              Local hot-seat for 2–4 players. The engine handles all rules — you supply
              the dice rolls.
            </p>
          </div>

          <PlayerCountPicker value={playerCount} onChange={setPlayerCount} variant="neon" />

          {visibleNames.map((name, index) => (
            <label key={index} className="block space-y-2">
              <span className="block text-xs font-bold tracking-widest text-muted uppercase">
                Player {index + 1}
              </span>
              <input
                type="text"
                value={name}
                onChange={(event) => updateName(index, event.target.value)}
                className="h-14 w-full rounded-2xl border-2 border-line bg-elevated px-5 text-white placeholder:text-muted/30 focus:border-neon-blue/50 focus:outline-none"
              />
            </label>
          ))}

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
              className="h-14 flex-1 rounded-2xl bg-neon-blue text-sm font-black tracking-tight text-ink shadow-[0_0_24px_rgba(19,239,244,0.35)] transition-all active:scale-95"
            >
              Start {playerCount}-player game
            </button>
          </div>
        </form>
      </main>

      <footer className="relative z-10 p-10 text-center">
        <p className="text-[10px] font-semibold tracking-[0.2em] text-muted uppercase opacity-40">
          CLEVER © 2026
        </p>
      </footer>
    </div>
  );
}
