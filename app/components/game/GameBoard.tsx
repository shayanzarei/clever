"use client";

import { useMemo, useState } from "react";
import { mayUseActiveSlotFallback } from "@/lib/engine/passive";
import {
  activePlayerId,
  canPlayerActNow,
  isActivePlayer,
} from "@/lib/engine/turn";
import type { Action, DieState, Game } from "@/lib/engine/types";
import type { PlayerSeatId } from "@/lib/game/player-seats";
import {
  crossActionFromOption,
  getSheetCrossOptions,
} from "@/lib/ui/cross-options";
import {
  ActionBar,
  rerollValues,
  resolveActingPlayerId,
} from "@/app/components/game/ActionBar";
import { DiceBoard } from "@/app/components/game/DiceBoard";
import { GameHeader } from "@/app/components/game/GameHeader";
import { PlayerSheet } from "@/app/components/game/PlayerSheet";

type GameBoardProps = {
  game: Game;
  error: string | null;
  dispatch: (action: Action) => void;
  roll: () => void;
  clearError: () => void;
  /** When set (online), only this seat may interact. */
  myPlayerId?: PlayerSeatId | null;
  syncing?: boolean;
};

export function GameBoard({
  game,
  error,
  dispatch,
  roll,
  clearError,
  myPlayerId = null,
  syncing = false,
}: GameBoardProps) {
  const [extraDieMode, setExtraDieMode] = useState(false);

  const actingPlayerId = myPlayerId ?? resolveActingPlayerId(game);
  const canAct = Boolean(actingPlayerId && canPlayerActNow(game, actingPlayerId));

  const crossOptions = useMemo(() => {
    if (!actingPlayerId || !canAct) {
      return [];
    }
    return getSheetCrossOptions(game, actingPlayerId);
  }, [game, actingPlayerId, canAct]);

  const clickableDieIds = useMemo(() => {
    if (!actingPlayerId || !canAct) {
      return new Set<string>();
    }
    return new Set(getClickableDice(game, actingPlayerId, extraDieMode));
  }, [game, actingPlayerId, canAct, extraDieMode]);

  const sheetsToShow = useMemo(() => {
    if (myPlayerId) {
      return game.players.filter((player) => player.id === myPlayerId);
    }
    if (actingPlayerId) {
      return game.players.filter((player) => player.id === actingPlayerId);
    }
    return [...game.players];
  }, [game.players, myPlayerId, actingPlayerId]);

  function handleDieClick(die: DieState) {
    if (!actingPlayerId || !canAct) {
      return;
    }

    if (extraDieMode || isExtraDiePickPhase(game)) {
      dispatch({ type: "USE_EXTRA_DIE", playerId: actingPlayerId, dieId: die.id });
      setExtraDieMode(false);
      return;
    }

    if (game.phase === "active_choose" && isActivePlayer(game, actingPlayerId)) {
      const player = game.players.find((entry) => entry.id === actingPlayerId)!;
      const slotIndex = player.diceSlots.findIndex((slot) => slot === null);
      if (slotIndex < 0) {
        return;
      }
      dispatch({
        type: "CHOOSE_DIE",
        playerId: actingPlayerId,
        dieId: die.id,
        slotIndex,
      });
      return;
    }

    if (game.phase === "passive_choose" && !isActivePlayer(game, actingPlayerId)) {
      dispatch({ type: "PASSIVE_TAKE", playerId: actingPlayerId, dieId: die.id });
    }
  }

  return (
    <div className="app-game game-board">
      <div className="game-board__hud">
        <GameHeader game={game} />

        {syncing && (
          <p className="game-board__notice border border-line bg-surface px-3 py-2 text-sm text-muted">
            Syncing…
          </p>
        )}

        {error && (
          <div className="game-board__notice flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            <span>{error}</span>
            <button type="button" className="font-medium underline" onClick={clearError}>
              Dismiss
            </button>
          </div>
        )}

        <div className="game-board__toolbar">
          <DiceBoard
            compact
            dice={game.dice}
            clickableIds={clickableDieIds}
            selectedId={
              game.players.find((player) => player.id === actingPlayerId)?.passiveDieId ??
              null
            }
            onDieClick={clickableDieIds.size > 0 ? handleDieClick : undefined}
          />

          <ActionBar
            game={game}
            myPlayerId={myPlayerId}
            onRoll={roll}
            onReroll={() =>
              dispatch({
                type: "USE_REROLL",
                playerId: activePlayerId(game),
                values: rerollValues(game),
              })
            }
            onSkipExtra={(playerId) =>
              dispatch({ type: "SKIP_EXTRA_DIE", playerId })
            }
            onUndoChoice={(playerId) =>
              dispatch({ type: "UNDO_DIE_CHOICE", playerId })
            }
            onRoundBonus={(playerId, choice) =>
              dispatch({ type: "CHOOSE_ROUND_BONUS", playerId, choice })
            }
            extraDieMode={extraDieMode}
            onToggleExtraDie={() => setExtraDieMode((value) => !value)}
          />
        </div>
      </div>

      <div className="game-board__sheets min-h-0 flex-1">
        {sheetsToShow.map((player) => {
          const isActor = actingPlayerId === player.id && canAct;
          const options = isActor ? crossOptions : [];
          return (
            <PlayerSheet
              key={player.id}
              title={player.name}
              sheet={player.sheet}
              highlight={actingPlayerId === player.id}
              crossOptions={options}
              onCross={(option) =>
                dispatch(crossActionFromOption(player.id, option))
              }
            />
          );
        })}
      </div>
    </div>
  );
}

function getClickableDice(
  game: Game,
  playerId: string,
  extraDieMode: boolean,
): string[] {
  if (extraDieMode || isExtraDiePickPhase(game)) {
    return extraDieTargets(game);
  }

  if (game.phase === "active_choose" && isActivePlayer(game, playerId) && !game.awaitingCross) {
    return game.dice.filter((die) => die.location === "pool").map((die) => die.id);
  }

  if (game.phase === "passive_choose" && !isActivePlayer(game, playerId)) {
    const player = game.players.find((entry) => entry.id === playerId);
    if (!player || player.passiveDieId) {
      return [];
    }

    const ids: string[] = [];
    for (const die of game.dice) {
      if (die.location === "tray") {
        if (!mayUseActiveSlotFallback(game, playerId)) {
          ids.push(die.id);
        }
      } else if (die.location === "slot" && mayUseActiveSlotFallback(game, playerId)) {
        ids.push(die.id);
      }
    }
    return ids;
  }

  return [];
}

function isExtraDiePickPhase(game: Game): boolean {
  return game.phase === "active_extra" || game.phase === "passive_extra";
}

function extraDieTargets(game: Game): string[] {
  return game.dice
    .filter((die) => die.location !== "consumed")
    .filter((die) => !game.extraDieUsedIds.includes(die.id))
    .map((die) => die.id);
}
