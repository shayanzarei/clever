import type { Game } from "@/lib/engine/types";
import { extraDieUsedIdsFor } from "@/lib/engine/extra-die-used";

/**
 * Extra die may pick any of the six dice still in play, including ones the
 * active player already placed and the leftover the passive player just took.
 * A die another player already extra-died is still available.
 */
export function extraDieClickableIds(game: Game, playerId: string): string[] {
  const used = extraDieUsedIdsFor(game, playerId);
  return game.dice
    .filter((die) => die.location !== "consumed")
    .filter((die) => !used.includes(die.id))
    .map((die) => die.id);
}
