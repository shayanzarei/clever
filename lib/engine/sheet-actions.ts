import type { Sheet } from "./types";

export function grantPlusOne(sheet: Sheet): Sheet {
  return { ...sheet, plusOnes: sheet.plusOnes + 1 };
}

export function grantReroll(sheet: Sheet): Sheet {
  return { ...sheet, rerolls: sheet.rerolls + 1 };
}

export function grantExtraDie(sheet: Sheet): Sheet {
  return { ...sheet, extraDice: sheet.extraDice + 1 };
}

export function consumePlusOne(sheet: Sheet): Sheet {
  if (sheet.plusOnes <= 0) {
    throw new Error("No +1 actions remaining");
  }
  return { ...sheet, plusOnes: sheet.plusOnes - 1 };
}

export function consumeReroll(sheet: Sheet): Sheet {
  if (sheet.rerolls <= 0) {
    throw new Error("No reroll actions remaining");
  }
  return { ...sheet, rerolls: sheet.rerolls - 1 };
}

export function consumeExtraDie(sheet: Sheet): Sheet {
  if (sheet.extraDice <= 0) {
    throw new Error("No extra-die actions remaining");
  }
  return { ...sheet, extraDice: sheet.extraDice - 1 };
}
