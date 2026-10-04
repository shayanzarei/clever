import type { ExtraDieUsedIds, Game } from "./types";

/** Saved games used a shared list; extra die is per player. */
export function extraDieUsedIdsFor(
  game: Pick<Game, "extraDieUsedIds">,
  playerId: string,
): readonly string[] {
  const ids = game.extraDieUsedIds;
  if (Array.isArray(ids)) {
    return [];
  }
  return ids[playerId] ?? [];
}

export function recordExtraDieUsed(
  game: Pick<Game, "extraDieUsedIds">,
  playerId: string,
  dieId: string,
): ExtraDieUsedIds {
  const ids = game.extraDieUsedIds;
  const byPlayer: Record<string, readonly string[]> = Array.isArray(ids)
    ? {}
    : { ...ids };
  return {
    ...byPlayer,
    [playerId]: [...(byPlayer[playerId] ?? []), dieId],
  };
}
