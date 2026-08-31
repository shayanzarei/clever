"use client";

import { useState } from "react";
import { useGameState } from "@/app/hooks/useGameState";
import { GameBoard } from "@/app/components/game/GameBoard";
import { Lobby } from "@/app/components/game/Lobby";
import { TurnOrderScreen } from "@/app/components/game/TurnOrderScreen";
import { shuffleSeats } from "@/lib/game/turn-order";
import type { PlayerCount } from "@/lib/game/player-seats";

export function GameApp({ onLeave }: { onLeave?: () => void }) {
  const { game, error, dispatch, startGame, roll, clearError } = useGameState();
  const [draft, setDraft] = useState<{
    playerCount: PlayerCount;
    names: string[];
  } | null>(null);

  if (!game && !draft) {
    return (
      <Lobby
        onStart={(playerCount, names) => {
          setDraft({ playerCount, names: shuffleSeats(names) });
        }}
        onBack={onLeave ?? (() => undefined)}
      />
    );
  }

  if (!game && draft) {
    return (
      <TurnOrderScreen
        players={draft.names.map((name, index) => ({
          id: `local-${index}`,
          name,
        }))}
        isHost
        onShuffle={() =>
          setDraft((current) =>
            current ? { ...current, names: shuffleSeats(current.names) } : current,
          )
        }
        onStart={() => startGame(draft.playerCount, draft.names)}
      />
    );
  }

  if (!game) {
    return null;
  }

  return (
    <div className="app-shell--play flex min-h-0 flex-1 flex-col">
      <GameBoard
        game={game}
        error={error}
        dispatch={dispatch}
        roll={roll}
        clearError={clearError}
      />
    </div>
  );
}
