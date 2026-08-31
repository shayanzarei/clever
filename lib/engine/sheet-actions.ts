import type { Sheet } from "./types";

/** Official +1 is the extra-mark action (saved extraDice still counts). */
export function plusOneActionsRemaining(sheet: Sheet): number {
  return sheet.plusOnes + sheet.extraDice;
}

export function grantPlusOne(sheet: Sheet): Sheet {
  return { ...sheet, plusOnes: sheet.plusOnes + 1 };
}

export function grantReroll(sheet: Sheet): Sheet {
  return { ...sheet, rerolls: sheet.rerolls + 1 };
}

export function grantExtraDie(sheet: Sheet): Sheet {
  return grantPlusOne(sheet);
}

export function consumePlusOne(sheet: Sheet): Sheet {
  if (sheet.plusOnes > 0) {
    return { ...sheet, plusOnes: sheet.plusOnes - 1 };
  }
  if (sheet.extraDice > 0) {
    return { ...sheet, extraDice: sheet.extraDice - 1 };
  }
  throw new Error("No +1 actions remaining");
}

export function consumeReroll(sheet: Sheet): Sheet {
  if (sheet.rerolls <= 0) {
    throw new Error("No reroll actions remaining");
  }
  return { ...sheet, rerolls: sheet.rerolls - 1 };
}

export function consumeExtraDie(sheet: Sheet): Sheet {
  return consumePlusOne(sheet);
}
