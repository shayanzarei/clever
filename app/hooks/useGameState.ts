"use client";

import { useCallback, useState } from "react";
import { poolDice } from "@/lib/engine/dice";
import { reduce } from "@/lib/engine/reduce";
import type { Action, Game } from "@/lib/engine/types";
import { rollPoolDice } from "@/lib/ui/rolls";

export function useGameState() {
  const [game, setGame] = useState<Game | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dispatch = useCallback((action: Action) => {
    setGame((current) => {
      if (!current) {
        return current;
      }
      try {
        setError(null);
        return reduce(current, action);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Action failed");
        return current;
      }
    });
  }, []);

  const startGame = useCallback((playerCount: 2 | 3 | 4, playerNames: string[]) => {
    setError(null);
    setGame(
      reduce({} as Game, {
        type: "START_GAME",
        playerCount,
        playerNames,
      }),
    );
  }, []);

  const roll = useCallback(() => {
    setGame((current) => {
      if (!current) {
        return current;
      }
      try {
        setError(null);
        return reduce(current, {
          type: "ROLL",
          values: rollPoolDice(poolDice(current.dice)),
        });
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Roll failed");
        return current;
      }
    });
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { game, error, dispatch, startGame, roll, clearError };
}
