import {
  applyBlueCrossBySum,
  applyGreenBonusCross,
  applyOrangeBonusFill,
  applyPassiveBonus,
  applyPurpleBonusFill,
  applyYellowCross,
  type ApplyResult,
} from "./apply";
import { effectNeedsChoice } from "./bonuses";
import type { DieValue, Effect, Sheet } from "./types";

export type ChainResult = {
  sheet: Sheet;
  pending: Effect[];
};

/** Apply one auto-resolving bonus; returns null if it cannot be applied. */
export function applyAutoEffect(
  sheet: Sheet,
  effect: Effect,
): ApplyResult | { sheet: Sheet; triggered: Effect[] } | null {
  switch (effect.type) {
    case "cross_green_bonus": {
      const result = applyGreenBonusCross(sheet);
      return result;
    }
    case "fill_orange": {
      const result = applyOrangeBonusFill(sheet, effect.value);
      return result;
    }
    case "fill_purple": {
      const result = applyPurpleBonusFill(sheet, effect.value);
      return result;
    }
    case "fox":
    case "reroll":
    case "plus_one": {
      const next = applyPassiveBonus(sheet, effect);
      if (!next) {
        return null;
      }
      return { sheet: next, triggered: [] };
    }
    default:
      return null;
  }
}

/** Drain auto-resolvable effects from the front of the queue (depth-first chain). */
export function processAutoChain(
  sheet: Sheet,
  pending: readonly Effect[],
): ChainResult {
  const queue = [...pending];

  while (queue.length > 0 && !effectNeedsChoice(queue[0])) {
    const head = queue.shift()!;
    const outcome = applyAutoEffect(sheet, head);
    if (!outcome) {
      continue;
    }

    if ("event" in outcome) {
      sheet = outcome.sheet;
      queue.unshift(...outcome.triggered);
    } else {
      sheet = outcome.sheet;
      queue.unshift(...outcome.triggered);
    }
  }

  return { sheet, pending: queue };
}

export function applyChoiceYellow(
  sheet: Sheet,
  value: DieValue,
  targetIndex: number,
): ApplyResult | null {
  const row = Math.floor(targetIndex / 4);
  const col = targetIndex % 4;
  const cell = sheet.yellow.grid[row]?.[col];
  if (!cell || cell.crossed || cell.value !== value) {
    return null;
  }
  return applyYellowCross(sheet, targetIndex);
}

export function applyChoiceBlue(
  sheet: Sheet,
  blueDie: DieValue,
  whiteDie: DieValue,
  targetIndex?: number,
): ApplyResult | null {
  return applyBlueCrossBySum(sheet, blueDie, whiteDie, targetIndex);
}
