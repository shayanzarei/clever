import { reduce as reduceGame } from "./reduce";
import { assertSheetInvariants } from "./sheet-invariants";
import { grantLegacyExtraDie } from "./sheet-actions";
import type { Action, Game, Sheet } from "./types";

export function assertGameSheets(game: Game): void {
  for (const player of game.players) {
    assertSheetInvariants(player.sheet);
  }
}

/** Integration-test helper: reduce then assert every player sheet stays consistent. */
export function reduceWithInvariants(game: Game, action: Action): Game {
  const next = reduceGame(game, action);
  assertGameSheets(next);
  return next;
}

export function sheetWithRerolls(sheet: Sheet, rerolls: number): Sheet {
  return {
    ...sheet,
    rerolls,
    rerollsEarned: Math.max(sheet.rerollsEarned, rerolls),
  };
}

export function sheetWithPlusOnes(sheet: Sheet, plusOnes: number): Sheet {
  return {
    ...sheet,
    plusOnes,
    plusOnesEarned: Math.max(sheet.plusOnesEarned, plusOnes),
  };
}

export function sheetWithLegacyExtraDice(sheet: Sheet, extraDice: number): Sheet {
  let next: Sheet = { ...sheet, plusOnes: 0, extraDice: 0 };
  for (let count = 0; count < extraDice; count += 1) {
    next = grantLegacyExtraDie(next);
  }
  return next;
}
