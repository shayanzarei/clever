import { DICE_COLORS } from "./constants";
import type { DieFace, DieLocation, DieState, DieValue } from "./types";

export function createInitialDice(): DieState[] {
  return DICE_COLORS.map((color) => ({
    id: `die-${color}`,
    color,
    value: 1 as DieValue,
    location: "pool" as const,
  }));
}

export function getDie(dice: readonly DieState[], dieId: string): DieState | undefined {
  return dice.find((die) => die.id === dieId);
}

export function poolDice(dice: readonly DieState[]): DieState[] {
  return dice.filter((die) => die.location === "pool");
}

export function trayDice(dice: readonly DieState[]): DieState[] {
  return dice.filter((die) => die.location === "tray");
}

export function resetDiceToPool(dice: readonly DieState[]): DieState[] {
  return dice.map((die) => ({
    ...die,
    location: "pool" as const,
    slotIndex: undefined,
  }));
}

/** Apply rolled faces to pool dice (matched by color). */
export function applyRollValues(
  dice: readonly DieState[],
  values: readonly DieFace[],
): DieState[] {
  const pool = poolDice(dice);
  if (values.length !== pool.length) {
    throw new Error(
      `ROLL must include ${pool.length} dice values, got ${values.length}`,
    );
  }

  const valueByColor = new Map(values.map((face) => [face.color, face.value]));

  return dice.map((die) => {
    if (die.location !== "pool") {
      return die;
    }
    const value = valueByColor.get(die.color);
    if (value === undefined) {
      throw new Error(`ROLL missing value for ${die.color} die`);
    }
    return { ...die, value };
  });
}

export function chooseDieToSlot(
  dice: readonly DieState[],
  dieId: string,
  slotIndex: number,
): DieState[] {
  const chosen = getDie(dice, dieId);
  if (!chosen || chosen.location !== "pool") {
    throw new Error("Chosen die must be in the pool");
  }

  return dice.map((die) => {
    if (die.id === dieId) {
      return { ...die, location: "slot" as const, slotIndex };
    }
    if (die.location === "pool" && die.value < chosen.value) {
      return { ...die, location: "tray" as const, slotIndex: undefined };
    }
    return die;
  });
}

export function moveRemainingPoolToTray(dice: readonly DieState[]): DieState[] {
  return dice.map((die) =>
    die.location === "pool"
      ? { ...die, location: "tray" as const, slotIndex: undefined }
      : die,
  );
}

export function consumeSlottedDice(dice: readonly DieState[]): DieState[] {
  return dice.map((die) =>
    die.location === "slot"
      ? { ...die, location: "consumed" as const, slotIndex: undefined }
      : die,
  );
}

export function applyPlusOneToDie(
  dice: readonly DieState[],
  dieId: string,
  allowedLocations: readonly DieLocation[] = ["pool"],
): DieState[] {
  return dice.map((die) => {
    if (die.id !== dieId) {
      return die;
    }
    if (!allowedLocations.includes(die.location)) {
      throw new Error(
        `+1 may only be applied to ${allowedLocations.join(" or ")} dice`,
      );
    }
    if (die.value >= 6) {
      throw new Error("Cannot raise a die above 6");
    }
    return { ...die, value: (die.value + 1) as DieValue };
  });
}

export function slottedDieIds(dice: readonly DieState[]): string[] {
  return dice.filter((die) => die.location === "slot").map((die) => die.id);
}

export function dieFace(die: DieState): DieFace {
  return { color: die.color, value: die.value };
}
