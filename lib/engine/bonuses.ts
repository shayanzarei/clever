import type { ColorArea, Effect } from "./types";

/** Official score-sheet bonus layout (Schmidt Spiele / 999 Games). */

export const YELLOW_DIAGONAL_CELLS = [0, 5, 10, 15] as const;

/** Bonus when yellow row 0–3 is completed (left → top). */
export const YELLOW_ROW_BONUSES: readonly Effect[] = [
  { type: "fill_orange", value: 6 },
  { type: "cross_blue_free" },
  { type: "cross_green_bonus" },
  { type: "fill_purple", value: 6 },
];

export const YELLOW_DIAGONAL_BONUS: Effect = { type: "plus_one" };

/** Blue grid row groups (11 boxes). */
export const BLUE_ROWS = [
  [0, 1, 2, 3],
  [4, 5, 6, 7],
  [8, 9, 10],
] as const;

/** Blue grid column groups. Column 3 has only two cells on the sheet. */
export const BLUE_COLUMNS = [
  [0, 4, 8],
  [1, 5, 9],
  [2, 6, 10],
  [3, 7],
] as const;

export const BLUE_ROW_BONUSES: readonly Effect[] = [
  { type: "cross_yellow_free" },
  { type: "cross_green_bonus" },
  { type: "fox" },
];

export const BLUE_COLUMN_BONUSES: readonly Effect[] = [
  { type: "fill_orange", value: 5 },
  { type: "fill_purple", value: 6 },
  { type: "reroll" },
  { type: "cross_yellow_free" },
];

/** Bonus printed under green box at this index when crossed. */
export const GREEN_SLOT_BONUSES: Partial<Record<number, Effect>> = {
  8: { type: "plus_one" },
  9: { type: "cross_blue_free" },
  10: { type: "fill_orange", value: 6 },
};

/** Bonus printed under orange box at this index when filled. */
export const ORANGE_SLOT_BONUSES: Partial<Record<number, Effect>> = {
  5: { type: "plus_one" },
  6: { type: "cross_yellow_free" },
  7: { type: "fill_purple", value: 6 },
};

/** Bonus printed under purple box at this index when filled. */
export const PURPLE_SLOT_BONUSES: Partial<Record<number, Effect>> = {
  0: { type: "cross_yellow_free" },
  1: { type: "cross_blue_free" },
  2: { type: "plus_one" },
  3: { type: "cross_green_bonus" },
  4: { type: "cross_yellow_free" },
  5: { type: "fill_orange", value: 6 },
  6: { type: "plus_one" },
};

export function effectNeedsChoice(effect: Effect): boolean {
  return (
    effect.type === "cross_yellow_free" ||
    effect.type === "cross_blue_free" ||
    effect.type === "round_black_x" ||
    effect.type === "round_black_six"
  );
}

export function crossEffectMatchesPending(
  pending: Effect,
  color: ColorArea,
): boolean {
  if (pending.type === "cross_yellow_free") {
    return color === "yellow";
  }
  if (pending.type === "cross_blue_free") {
    return color === "blue";
  }
  if (pending.type === "round_black_x") {
    return color === "yellow" || color === "blue" || color === "green";
  }
  if (pending.type === "round_black_six") {
    return color === "purple" || color === "orange";
  }
  return false;
}
