"use client";

import { useGameState } from "@/app/hooks/useGameState";
import { GameBoard } from "@/app/components/game/GameBoard";
import { Lobby } from "@/app/components/game/Lobby";

export function GameApp() {
  const { game, error, dispatch, startGame, roll, clearError } = useGameState();

  if (!game) {
    return (
      <div className="app-game min-h-0 flex-1 overflow-y-auto py-4 pb-safe">
        <Lobby onStart={startGame} />
      </div>
    );
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
