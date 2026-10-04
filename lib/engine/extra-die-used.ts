import type { ExtraDieUsedIds, Game } from "./types";

function extraDieUsedByPlayer(
  ids: ExtraDieUsedIds,
): Readonly<Record<string, readonly string[]>> {
  if (Array.isArray(ids)) {
    return {};
  }
  return ids as Readonly<Record<string, readonly string[]>>;
}

/** Saved games used a shared list; extra die is per player. */
export function extraDieUsedIdsFor(
  game: Pick<Game, "extraDieUsedIds">,
  playerId: string,
): readonly string[] {
  return extraDieUsedByPlayer(game.extraDieUsedIds)[playerId] ?? [];
}

export function recordExtraDieUsed(
  game: Pick<Game, "extraDieUsedIds">,
  playerId: string,
  dieId: string,
): ExtraDieUsedIds {
  const byPlayer = { ...extraDieUsedByPlayer(game.extraDieUsedIds) };
  return {
    ...byPlayer,
    [playerId]: [...(byPlayer[playerId] ?? []), dieId],
  };
}
