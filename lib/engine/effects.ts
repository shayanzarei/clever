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
import { getChoiceTargets } from "./choice-targets";
import type { DieValue, Effect, Sheet } from "./types";

/** Whether a choice bonus still has at least one legal resolution on this sheet. */
export function choiceBonusHasTargets(sheet: Sheet, effect: Effect): boolean {
  if (!effectNeedsChoice(effect)) {
    return true;
  }
  return getChoiceTargets(sheet, effect).length > 0;
}

export type ChainResult = {
  sheet: Sheet;
  pending: Effect[];
};

/** Hard bound on bonus-chain depth; throws instead of silently truncating a runaway queue. */
export const BONUS_CHAIN_ITERATION_LIMIT = 200;

function assertBonusChainBounded(
  iterations: number,
  queue: readonly Effect[],
  sheet: Sheet,
): void {
  if (iterations > BONUS_CHAIN_ITERATION_LIMIT) {
    throw new Error(
      `Bonus chain exceeded ${BONUS_CHAIN_ITERATION_LIMIT} iterations (likely queue bug). ` +
        `pending=${JSON.stringify(queue)} sheet=${JSON.stringify(sheet)}`,
    );
  }
}

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

/** Indirection so chain-guard tests can substitute a looping auto-effect without touching the reducer. */
export const chainAutoEffectRunner = {
  run: applyAutoEffect,
};

/** Drain auto-resolvable effects from the front of the queue (depth-first chain). */
export function processAutoChain(
  sheet: Sheet,
  pending: readonly Effect[],
): ChainResult {
  const queue = [...pending];
  let iterations = 0;

  while (queue.length > 0) {
    iterations += 1;
    assertBonusChainBounded(iterations, queue, sheet);

    const head = queue[0]!;

    if (effectNeedsChoice(head)) {
      if (!choiceBonusHasTargets(sheet, head)) {
        queue.shift();
        continue;
      }
      break;
    }

    const effect = queue.shift()!;
    const outcome = chainAutoEffectRunner.run(sheet, effect);
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
