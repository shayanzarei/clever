import {
  BLUE_SCORE_BY_MARKS,
  GREEN_SCORES,
  YELLOW_COLUMN_SCORES,
} from "./constants";
import {
  countCrossedBlue,
  isYellowColumnComplete,
  rightmostGreenIndex,
} from "./sheet";
import type { Sheet } from "./types";

/** Sum of column scores for every fully crossed yellow column. */
export function scoreYellow(sheet: Sheet): number {
  let total = 0;
  for (let column = 0; column < YELLOW_COLUMN_SCORES.length; column += 1) {
    if (isYellowColumnComplete(sheet, column)) {
      total += YELLOW_COLUMN_SCORES[column];
    }
  }
  return total;
}

/** Lookup end-game points from the number of crossed blue boxes. */
export function scoreBlue(sheet: Sheet): number {
  const marks = countCrossedBlue(sheet);
  return BLUE_SCORE_BY_MARKS[marks] ?? 0;
}

/** Points above the rightmost crossed green threshold box. */
export function scoreGreen(sheet: Sheet): number {
  const index = rightmostGreenIndex(sheet);
  if (index < 0) {
    return 0;
  }
  return GREEN_SCORES[index] ?? 0;
}

/** Sum of all recorded orange values (multipliers already applied). */
export function scoreOrange(sheet: Sheet): number {
  return sheet.orange.boxes.reduce(
    (sum, box) => sum + (box.value ?? 0),
    0,
  );
}

/** Sum of all recorded purple values. */
export function scorePurple(sheet: Sheet): number {
  return sheet.purple.boxes.reduce(
    (sum, box) => sum + (box.value ?? 0),
    0,
  );
}

/**
 * Each fox is worth the player's lowest color score.
 * If any color scores 0, every fox is worth 0.
 */
export function scoreFoxes(sheet: Sheet): number {
  if (sheet.foxes === 0) {
    return 0;
  }

  const colorScores = [
    scoreYellow(sheet),
    scoreBlue(sheet),
    scoreGreen(sheet),
    scoreOrange(sheet),
    scorePurple(sheet),
  ];

  const floor = Math.min(...colorScores);
  if (floor === 0) {
    return 0;
  }

  return sheet.foxes * floor;
}

export function scoreSheet(sheet: Sheet): number {
  return (
    scoreYellow(sheet) +
    scoreBlue(sheet) +
    scoreGreen(sheet) +
    scoreOrange(sheet) +
    scorePurple(sheet) +
    scoreFoxes(sheet)
  );
}

export function colorScores(sheet: Sheet): Record<
  "yellow" | "blue" | "green" | "orange" | "purple",
  number
> {
  return {
    yellow: scoreYellow(sheet),
    blue: scoreBlue(sheet),
    green: scoreGreen(sheet),
    orange: scoreOrange(sheet),
    purple: scorePurple(sheet),
  };
}
