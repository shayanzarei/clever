"use client";

import { useGameState } from "@/app/hooks/useGameState";
import { GameBoard } from "@/app/components/game/GameBoard";
import { Lobby } from "@/app/components/game/Lobby";

export function GameApp() {
  const { game, error, dispatch, startGame, roll, clearError } = useGameState();

  if (!game) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Lobby onStart={startGame} />
      </div>
    );
  }

  return (
    <GameBoard
      game={game}
      error={error}
      dispatch={dispatch}
      roll={roll}
      clearError={clearError}
    />
  );
}
