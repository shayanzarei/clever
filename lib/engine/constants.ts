/** Official score-sheet layout constants (Schmidt Spiele / 999 Games). */

export type DieColor =
  | "yellow"
  | "blue"
  | "green"
  | "orange"
  | "purple"
  | "white";

export const YELLOW_GRID_VALUES: readonly (readonly number[])[] = [
  [2, 3, 4, 5],
  [6, 2, 5, 1],
  [1, 5, 3, 6],
  [4, 5, 6, 1],
] as const;

/** Points circled at the bottom of each completed yellow column. */
export const YELLOW_COLUMN_SCORES = [4, 6, 10, 12] as const;

/** Blue area sums 2–12 in sheet order (11 boxes). */
export const BLUE_SUMS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

/** End-game points indexed by number of crossed blue boxes (0–11). */
export const BLUE_SCORE_BY_MARKS = [
  0, 1, 2, 4, 7, 11, 16, 22, 29, 37, 46, 56,
] as const;

/** Minimum die value required for each green box (left → right). */
export const GREEN_THRESHOLDS = [1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 6] as const;

/** End-game points above each green box when it is the rightmost cross. */
export const GREEN_SCORES = [1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66] as const;

/** Multipliers for each orange box (×1, ×2, or ×3). */
export const ORANGE_MULTIPLIERS = [1, 1, 1, 1, 1, 1, 2, 2, 2, 3, 1] as const;

export const YELLOW_ROWS = 4;
export const YELLOW_COLS = 4;
export const TRACK_LENGTH = 11;

/** Fixed six dice in standard play (one per color). */
export const DICE_COLORS: readonly DieColor[] = [
  "yellow",
  "blue",
  "green",
  "orange",
  "purple",
  "white",
];
