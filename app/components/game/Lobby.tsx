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
};

export function Lobby({ onStart }: LobbyProps) {
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
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Pretty Clever
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Local hot-seat for 2–4 players. The engine handles all rules — you supply
          the dice rolls.
        </p>
      </div>

      <PlayerCountPicker value={playerCount} onChange={setPlayerCount} />

      {visibleNames.map((name, index) => (
        <label key={index} className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700">Player {index + 1}</span>
          <input
            className="app-input"
            value={name}
            onChange={(event) => updateName(index, event.target.value)}
          />
        </label>
      ))}

      <button
        type="button"
        className="rounded-lg bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
        onClick={handleStart}
      >
        Start {playerCount}-player game
      </button>
    </div>
  );
}
