import { poolDice } from "@/lib/engine/dice";
import type { Game } from "@/lib/engine/types";
import type { ClientAction } from "@/lib/game/client-action";
import type { RollHistoryEntry } from "@/lib/game/roll-history";
import { rollPoolDiceSecure } from "@/lib/server/secure-roll";

export type { RollHistoryEntry } from "@/lib/game/roll-history";

function hasOwn(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export function parseClientAction(raw: unknown): ClientAction {
  if (!raw || typeof raw !== "object") {
    throw new Error("action must be an object");
  }

  const action = raw as Record<string, unknown>;
  const type = action.type;

  if (type === "ROLL") {
    if (hasOwn(action, "values")) {
      throw new Error("ROLL must not include client-supplied values");
    }
    return { type: "ROLL" };
  }

  if (type === "USE_REROLL") {
    if (hasOwn(action, "values")) {
      throw new Error("USE_REROLL must not include client-supplied values");
    }
    if (typeof action.playerId !== "string" || action.playerId.length === 0) {
      throw new Error("USE_REROLL requires playerId");
    }
    return { type: "USE_REROLL", playerId: action.playerId };
  }

  return action as ClientAction;
}

export function toEngineAction(game: Game, action: ClientAction): Action {
  if (action.type === "ROLL") {
    return {
      type: "ROLL",
      values: rollPoolDiceSecure(poolDice(game.dice)),
    };
  }

  if (action.type === "USE_REROLL") {
    return {
      type: "USE_REROLL",
      playerId: action.playerId,
      values: rollPoolDiceSecure(poolDice(game.dice)),
    };
  }

  return action;
}

export function rollHistoryEntry(
  clientAction: ClientAction,
  engineAction: Action,
  gameVersion: number,
): RollHistoryEntry | null {
  if (engineAction.type !== "ROLL" && engineAction.type !== "USE_REROLL") {
    return null;
  }

  return {
    action: engineAction.type,
    playerId:
      clientAction.type === "USE_REROLL" ? clientAction.playerId : undefined,
    values: engineAction.values,
    gameVersion,
  };
}
