import { canCrossBlue, getBlueCrossTargets } from "./legality";
import type { DieState, DieValue, Sheet } from "./types";

/**
 * Blue area rules (999 Games / Schmidt Spiele):
 * - Boxes may be crossed in any order (like yellow).
 * - Picking the blue die: add the white die's value (wherever white is).
 * - Picking the white die for blue: add the blue die's value (wherever blue is).
 * - You always mark blue + white; never a single die alone.
 */
export type BlueWhiteValues = {
  blue: DieValue;
  white: DieValue;
};

/** Active blue and white faces from current dice, regardless of location. */
export function resolveBlueWhiteValues(
  dice: readonly DieState[],
): BlueWhiteValues | null {
  const blue = dice.find(
    (die) => die.color === "blue" && die.location !== "consumed",
  );
  const white = dice.find(
    (die) => die.color === "white" && die.location !== "consumed",
  );

  if (!blue || !white) {
    return null;
  }

  return { blue: blue.value, white: white.value };
}

/**
 * Whether the player may cross a blue box given live dice on the table.
 * Symmetric: choosing blue or white for the blue area uses the same sum.
 */
export function canCrossBlueFromDice(
  sheet: Sheet,
  dice: readonly DieState[],
): boolean {
  const values = resolveBlueWhiteValues(dice);
  if (!values) {
    return false;
  }
  return canCrossBlue(sheet, values.blue, values.white);
}

export function getBlueCrossTargetsFromDice(
  sheet: Sheet,
  dice: readonly DieState[],
) {
  const values = resolveBlueWhiteValues(dice);
  if (!values) {
    return [];
  }
  return getBlueCrossTargets(sheet, values.blue, values.white);
}

export function makeDie(
  id: string,
  color: DieState["color"],
  value: DieValue,
  location: DieState["location"],
): DieState {
  return { id, color, value, location };
}
