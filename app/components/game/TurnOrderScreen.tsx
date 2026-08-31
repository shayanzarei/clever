"use client";

import {
  initials,
  rankLabel,
  seatAccent,
} from "@/lib/game/turn-order";

export type TurnOrderEntry = {
  id: string;
  name: string;
};

type TurnOrderScreenProps = {
  players: TurnOrderEntry[];
  isHost: boolean;
  shuffling?: boolean;
  starting?: boolean;
  onShuffle: () => void;
  onStart: () => void;
};

export function TurnOrderScreen({
  players,
  isHost,
  shuffling = false,
  starting = false,
  onShuffle,
  onStart,
}: TurnOrderScreenProps) {
  return (
    <div className="relative flex min-h-dvh w-full flex-col overflow-hidden bg-ink text-white">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[22rem] w-[22rem] rounded-full border border-dashed border-line/80" />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-10">
        <p className="text-center text-xs font-bold tracking-[0.2em] text-neon-orange uppercase">
          Establishing turn order
        </p>
        <h1 className="mt-3 text-center text-4xl font-extrabold tracking-tight">
          WHO GOES FIRST?
        </h1>

        <ol className="mt-10 flex flex-col gap-3">
          {players.map((player, index) => {
            const accent = seatAccent(index);
            return (
              <li
                key={player.id}
                className="flex items-center gap-3 rounded-2xl border border-line bg-elevated px-4 py-3"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-muted">
                  {index + 1}
                </span>
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold"
                  style={{ borderColor: accent, color: accent }}
                >
                  {initials(player.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{player.name}</p>
                  <p className="text-xs tracking-widest text-muted uppercase">
                    {rankLabel(index)}
                  </p>
                </div>
                <DicePairIcon color={accent} />
              </li>
            );
          })}
        </ol>

        {isHost ? (
          <div className="mt-10 flex flex-col gap-3">
            <button
              type="button"
              disabled={shuffling || starting}
              onClick={onShuffle}
              className="flex h-14 items-center justify-center gap-3 rounded-2xl bg-neon-orange text-sm font-black tracking-wider text-ink uppercase shadow-[0_0_24px_rgba(244,98,19,0.35)] disabled:opacity-50"
            >
              <ShuffleIcon />
              Shuffle again
            </button>
            <button
              type="button"
              disabled={starting || shuffling}
              onClick={onStart}
              className="h-14 rounded-2xl border border-line bg-elevated text-sm font-black tracking-wider uppercase disabled:opacity-50"
            >
              {starting ? "Starting…" : "Ready to start"}
            </button>
          </div>
        ) : (
          <p className="mt-10 text-center text-sm text-neon-orange italic">
            Host is setting the turn order…
          </p>
        )}
      </main>
    </div>
  );
}

function ShuffleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M4 7h4l3 5-3 5H4" />
      <path d="M16 7h4v0l-3 5 3 5h-4" />
      <path d="m18 5 2 2-2 2M18 15l2 2-2 2" />
    </svg>
  );
}

function DicePairIcon({ color }: { color: string }) {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill={color} aria-hidden>
      <rect x="2" y="8" width="11" height="11" rx="2.5" opacity="0.95" />
      <rect x="11" y="3" width="11" height="11" rx="2.5" opacity="0.7" />
    </svg>
  );
}
