import {
  nextGreenIndex,
  nextOrangeIndex,
  nextPurpleIndex,
  lastPurpleValue,
} from "./sheet";
import type { ColorArea, DieValue, Sheet } from "./types";

export type CrossTarget = {
  /** Flat index for yellow (0–15), track index for linear areas. */
  index: number;
};

/** Sum written in the blue area: always blue die + white die (both required). */
export function computeBlueSum(blueDie: DieValue, whiteDie: DieValue): number {
  return blueDie + whiteDie;
}

/**
 * Sheet-level blue legality: sum = blue + white, any uncrossed matching slot.
 * For live dice (tray/slot/pool), use `canCrossBlueFromDice` in `./blue`.
 */

export function isValidDieValue(value: number): value is DieValue {
  return Number.isInteger(value) && value >= 1 && value <= 6;
}

export function canCross(
  sheet: Sheet,
  color: Exclude<ColorArea, "blue">,
  value: number,
): boolean;
export function canCross(
  sheet: Sheet,
  color: "blue",
  blueDie: DieValue,
  whiteDie: DieValue,
): boolean;
export function canCross(
  sheet: Sheet,
  color: ColorArea,
  valueOrBlueDie: number,
  whiteDie?: DieValue,
): boolean {
  if (color === "blue") {
    if (whiteDie === undefined || !isValidDieValue(valueOrBlueDie)) {
      return false;
    }
    return canCrossBlue(sheet, valueOrBlueDie, whiteDie);
  }
  return getCrossTargets(sheet, color, valueOrBlueDie).length > 0;
}

export function getCrossTargets(
  sheet: Sheet,
  color: Exclude<ColorArea, "blue">,
  value: number,
): CrossTarget[];
export function getCrossTargets(
  sheet: Sheet,
  color: "blue",
  blueDie: DieValue,
  whiteDie: DieValue,
): CrossTarget[];
export function getCrossTargets(
  sheet: Sheet,
  color: ColorArea,
  valueOrBlueDie: number,
  whiteDie?: DieValue,
): CrossTarget[] {
  if (color === "blue") {
    if (whiteDie === undefined || !isValidDieValue(valueOrBlueDie)) {
      return [];
    }
    return getBlueCrossTargets(sheet, valueOrBlueDie, whiteDie);
  }

  switch (color) {
    case "yellow":
      return getYellowTargets(sheet, valueOrBlueDie);
    case "green":
      return getGreenTargets(sheet, valueOrBlueDie);
    case "orange":
      return getOrangeTargets(sheet, valueOrBlueDie);
    case "purple":
      return getPurpleTargets(sheet, valueOrBlueDie);
    default: {
      const _exhaustive: never = color;
      return _exhaustive;
    }
  }
}

/** Blue requires both dice; the sum alone is not a valid cross input. */
export function canCrossBlue(
  sheet: Sheet,
  blueDie: DieValue,
  whiteDie: DieValue,
): boolean {
  return getBlueCrossTargets(sheet, blueDie, whiteDie).length > 0;
}

export function getBlueCrossTargets(
  sheet: Sheet,
  blueDie: DieValue,
  whiteDie: DieValue,
): CrossTarget[] {
  const sum = computeBlueSum(blueDie, whiteDie);
  if (sum < 2 || sum > 12) {
    return [];
  }

  const targets: CrossTarget[] = [];
  sheet.blue.boxes.forEach((box, index) => {
    if (!box.crossed && box.sum === sum) {
      targets.push({ index });
    }
  });
  return targets;
}

function getYellowTargets(sheet: Sheet, value: number): CrossTarget[] {
  if (!Number.isInteger(value) || value < 1 || value > 6) {
    return [];
  }

  const targets: CrossTarget[] = [];
  sheet.yellow.grid.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (!cell.crossed && cell.value === value) {
        targets.push({ index: rowIndex * row.length + colIndex });
      }
    });
  });
  return targets;
}

function getGreenTargets(sheet: Sheet, value: number): CrossTarget[] {
  if (!Number.isInteger(value) || value < 1 || value > 6) {
    return [];
  }

  const next = nextGreenIndex(sheet);
  if (next === null) {
    return [];
  }

  const threshold = sheet.green.boxes[next].threshold;
  if (value >= threshold) {
    return [{ index: next }];
  }
  return [];
}

function getOrangeTargets(sheet: Sheet, value: number): CrossTarget[] {
  if (!Number.isInteger(value) || value < 1 || value > 6) {
    return [];
  }

  const next = nextOrangeIndex(sheet);
  if (next === null) {
    return [];
  }

  return [{ index: next }];
}

function getPurpleTargets(sheet: Sheet, value: number): CrossTarget[] {
  if (!Number.isInteger(value) || value < 1 || value > 6) {
    return [];
  }

  const next = nextPurpleIndex(sheet);
  if (next === null) {
    return [];
  }

  if (next === 0) {
    return [{ index: 0 }];
  }

  const previous = lastPurpleValue(sheet);
  if (previous === null) {
    return [{ index: next }];
  }

  // After a 6, any value is allowed (official rule).
  if (previous === 6) {
    return [{ index: next }];
  }

  if (value > previous) {
    return [{ index: next }];
  }

  return [];
}

/** Stored orange pip value after applying the slot multiplier. */
export function orangeRecordedValue(
  sheet: Sheet,
  slotIndex: number,
  dieValue: number,
): number {
  const multiplier = sheet.orange.boxes[slotIndex]?.multiplier ?? 1;
  return dieValue * multiplier;
}
