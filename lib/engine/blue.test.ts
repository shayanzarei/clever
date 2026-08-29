import { describe, expect, it } from "vitest";
import {
  canCrossBlueFromDice,
  getBlueCrossTargetsFromDice,
  makeDie,
  resolveBlueWhiteValues,
} from "./blue";
import { canCrossBlue, computeBlueSum, getBlueCrossTargets } from "./legality";
import { createEmptySheet } from "./sheet";
import type { Sheet } from "./types";

function crossBlueSum(sheet: Sheet, sum: number): Sheet {
  const boxes = sheet.blue.boxes.map((box) =>
    box.sum === sum ? { ...box, crossed: true } : box,
  );
  return { ...sheet, blue: { boxes } };
}

describe("resolveBlueWhiteValues", () => {
  it("reads blue and white regardless of location (pool, tray, slot)", () => {
    const dice = [
      makeDie("b", "blue", 3, "pool"),
      makeDie("w", "white", 4, "tray"),
    ];
    expect(resolveBlueWhiteValues(dice)).toEqual({ blue: 3, white: 4 });
  });

  it("reads dice on a player's slot", () => {
    const dice = [
      makeDie("b", "blue", 2, "slot"),
      makeDie("w", "white", 5, "slot"),
    ];
    expect(resolveBlueWhiteValues(dice)).toEqual({ blue: 2, white: 5 });
  });

  it("ignores consumed dice", () => {
    const dice = [
      makeDie("b", "blue", 3, "consumed"),
      makeDie("w", "white", 4, "pool"),
    ];
    expect(resolveBlueWhiteValues(dice)).toBeNull();
  });

  it("returns null when either die is missing", () => {
    expect(resolveBlueWhiteValues([makeDie("b", "blue", 3, "pool")])).toBeNull();
  });
});

describe("canCrossBlueFromDice", () => {
  it("allows crossing when sum slot is open (blue chosen scenario)", () => {
    const dice = [
      makeDie("b", "blue", 3, "pool"),
      makeDie("w", "white", 4, "tray"),
    ];
    expect(canCrossBlueFromDice(createEmptySheet(), dice)).toBe(true);
    expect(getBlueCrossTargetsFromDice(createEmptySheet(), dice)).toEqual([
      { index: 5 },
    ]);
  });

  it("is identical when white is chosen for blue (reverse scenario)", () => {
    const sheet = createEmptySheet();
    const dice = [
      makeDie("b", "blue", 3, "tray"),
      makeDie("w", "white", 4, "pool"),
    ];
    expect(canCrossBlueFromDice(sheet, dice)).toBe(
      canCrossBlue(sheet, 3, 4),
    );
    expect(computeBlueSum(3, 4)).toBe(7);
  });

  it("allows any open sum slot, not left-to-right order", () => {
    const sheet = createEmptySheet();
    const dice = [
      makeDie("b", "blue", 6, "pool"),
      makeDie("w", "white", 6, "pool"),
    ];
    expect(getBlueCrossTargets(sheet, 6, 6)).toEqual([{ index: 10 }]);
    expect(canCrossBlueFromDice(sheet, dice)).toBe(true);

    const crossedLow = crossBlueSum(sheet, 7);
    expect(canCrossBlueFromDice(crossedLow, dice)).toBe(true);
  });

  it("rejects when the computed sum is already crossed", () => {
    const sheet = crossBlueSum(createEmptySheet(), 7);
    const dice = [
      makeDie("b", "blue", 3, "pool"),
      makeDie("w", "white", 4, "tray"),
    ];
    expect(canCrossBlueFromDice(sheet, dice)).toBe(false);
  });
});
