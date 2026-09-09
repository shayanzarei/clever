import { crossEffectMatchesPending, effectNeedsChoice } from "./bonuses";
import {
  nextGreenIndex,
  nextOrangeIndex,
  nextPurpleIndex,
} from "./sheet";
import type { ColorArea, Effect, Sheet } from "./types";

export type ChoiceTarget = {
  color: ColorArea;
  targetIndex: number;
  value: number;
};

/** Every legal resolution for a pending choice bonus on this sheet. */
export function getChoiceTargets(sheet: Sheet, effect: Effect): ChoiceTarget[] {
  if (!effectNeedsChoice(effect)) {
    return [];
  }

  const targets: ChoiceTarget[] = [];

  if (effect.type === "cross_yellow_free" || effect.type === "round_black_x") {
    sheet.yellow.grid.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (!cell.crossed && !cell.preprinted) {
          targets.push({
            color: "yellow",
            targetIndex: rowIndex * row.length + colIndex,
            value: cell.value,
          });
        }
      });
    });
  }

  if (effect.type === "cross_blue_free" || effect.type === "round_black_x") {
    sheet.blue.boxes.forEach((box, index) => {
      if (!box.crossed) {
        targets.push({
          color: "blue",
          targetIndex: index,
          value: box.sum,
        });
      }
    });
  }

  if (effect.type === "round_black_x") {
    const next = nextGreenIndex(sheet);
    if (next !== null) {
      targets.push({
        color: "green",
        targetIndex: next,
        value: sheet.green.boxes[next]!.threshold,
      });
    }
  }

  if (effect.type === "round_black_six") {
    const purpleNext = nextPurpleIndex(sheet);
    if (purpleNext !== null) {
      targets.push({
        color: "purple",
        targetIndex: purpleNext,
        value: 6,
      });
    }
    const orangeNext = nextOrangeIndex(sheet);
    if (orangeNext !== null) {
      targets.push({
        color: "orange",
        targetIndex: orangeNext,
        value: 6,
      });
    }
  }

  return targets;
}

export function isValidChoiceTarget(
  sheet: Sheet,
  effect: Effect,
  target: ChoiceTarget,
): boolean {
  if (!effectNeedsChoice(effect)) {
    return false;
  }
  if (!crossEffectMatchesPending(effect, target.color)) {
    return false;
  }

  return getChoiceTargets(sheet, effect).some(
    (candidate) =>
      candidate.color === target.color &&
      candidate.targetIndex === target.targetIndex &&
      candidate.value === target.value,
  );
}
