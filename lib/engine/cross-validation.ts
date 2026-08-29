import { resolveBlueWhiteValues } from "./blue";
import { getDie } from "./dice";
import { canCross, canCrossBlue } from "./legality";
import type { ColorArea, DieState, DieValue, Sheet } from "./types";

export function validateSheetCross(
  sheet: Sheet,
  dice: readonly DieState[],
  color: ColorArea,
  chosenDieId: string,
  options?: {
    value?: number;
    blueDie?: DieValue;
    whiteDie?: DieValue;
  },
): boolean {
  const chosen = getDie(dice, chosenDieId);
  if (!chosen) {
    return false;
  }

  if (color === "blue") {
    const live = resolveBlueWhiteValues(dice);
    if (!live) {
      return false;
    }
    if (chosen.color !== "blue" && chosen.color !== "white") {
      return false;
    }
    const blueDie = options?.blueDie ?? live.blue;
    const whiteDie = options?.whiteDie ?? live.white;
    return canCrossBlue(sheet, blueDie, whiteDie);
  }

  if (chosen.color === "white") {
    return canCross(sheet, color, options?.value ?? chosen.value);
  }

  if (chosen.color !== color) {
    return false;
  }

  return canCross(sheet, color, options?.value ?? chosen.value);
}
