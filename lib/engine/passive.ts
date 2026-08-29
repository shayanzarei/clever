import { resolveBlueWhiteValues } from "./blue";
import { getDie, trayDice } from "./dice";
import { canCross, canCrossBlue } from "./legality";
import { activePlayer } from "./turn";
import type { ColorArea, DieState, Game, Sheet } from "./types";

const PASSIVE_COLORS: readonly Exclude<ColorArea, "blue">[] = [
  "yellow",
  "green",
  "orange",
  "purple",
];

/** Whether the die enables at least one legal sheet mark for this player. */
export function dieHasLegalCross(
  sheet: Sheet,
  dice: readonly DieState[],
  dieId: string,
): boolean {
  const die = getDie(dice, dieId);
  if (!die) {
    return false;
  }

  if (die.color === "blue" || die.color === "white") {
    const live = resolveBlueWhiteValues(dice);
    if (live && canCrossBlue(sheet, live.blue, live.white)) {
      return true;
    }
  }

  if (die.color === "white") {
    return PASSIVE_COLORS.some((color) => canCross(sheet, color, die.value));
  }

  if (die.color === "yellow") {
    return canCross(sheet, "yellow", die.value);
  }
  if (die.color === "green") {
    return canCross(sheet, "green", die.value);
  }
  if (die.color === "orange") {
    return canCross(sheet, "orange", die.value);
  }
  if (die.color === "purple") {
    return canCross(sheet, "purple", die.value);
  }

  return false;
}

/** True when the tray holds a die this passive player can legally use. */
export function trayHasUsableDie(game: Game, playerId: string): boolean {
  const player = game.players.find((entry) => entry.id === playerId);
  if (!player) {
    return false;
  }
  return trayDice(game.dice).some((die) =>
    dieHasLegalCross(player.sheet, game.dice, die.id),
  );
}

/** Passive may borrow an active-player slot die only when the tray is unusable. */
export function mayUseActiveSlotFallback(game: Game, playerId: string): boolean {
  const tray = trayDice(game.dice);
  if (tray.length === 0) {
    return true;
  }
  return !trayHasUsableDie(game, playerId);
}

export function isActivePlayerSlotDie(game: Game, dieId: string): boolean {
  const die = getDie(game.dice, dieId);
  if (!die || die.location !== "slot" || die.slotIndex === undefined) {
    return false;
  }
  const active = activePlayer(game);
  return active.diceSlots[die.slotIndex] !== null;
}

export function validatePassiveTake(game: Game, playerId: string, dieId: string): void {
  const die = getDie(game.dice, dieId);
  if (!die) {
    throw new Error("Unknown die");
  }

  if (die.location === "tray") {
    if (mayUseActiveSlotFallback(game, playerId)) {
      throw new Error(
        "Tray dice are unusable; take a die from the active player's slots instead",
      );
    }
    return;
  }

  if (die.location === "slot" && isActivePlayerSlotDie(game, dieId)) {
    if (!mayUseActiveSlotFallback(game, playerId)) {
      throw new Error("Must take a usable die from the tray before using active slots");
    }
    return;
  }

  throw new Error("Passive players must choose a die from the tray or active slots");
}

/** +1 may target a die the passive could take, or the die already selected. */
export function validatePassivePlusOneTarget(
  game: Game,
  playerId: string,
  dieId: string,
): void {
  const player = game.players.find((entry) => entry.id === playerId);
  if (!player) {
    throw new Error(`Unknown player: ${playerId}`);
  }

  const die = getDie(game.dice, dieId);
  if (!die) {
    throw new Error("Unknown die");
  }
  if (die.location === "pool") {
    throw new Error("+1 may only be applied to tray or slot dice");
  }

  if (player.passiveDieId) {
    if (player.passiveDieId !== dieId) {
      throw new Error("Must +1 the die you already selected");
    }
    return;
  }

  validatePassiveTake(game, playerId, dieId);
}
