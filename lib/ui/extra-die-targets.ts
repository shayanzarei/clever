import type { Game } from "@/lib/engine/types";

/**
 * Extra die may pick any of the six dice still in play, including ones the
 * active player already placed and the leftover the passive player just took.
 */
export function extraDieClickableIds(game: Game): string[] {
  return game.dice
    .filter((die) => die.location !== "consumed")
    .filter((die) => !game.extraDieUsedIds.includes(die.id))
    .map((die) => die.id);
}
