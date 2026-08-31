/**
 * Bonus-chain iteration guard in processAutoChain (always active, including production).
 */
import { afterEach, describe, expect, it } from "vitest";
import { applyGreenCross, applyPurpleFill } from "./apply";
import {
  applyAutoEffect,
  BONUS_CHAIN_ITERATION_LIMIT,
  chainAutoEffectRunner,
  processAutoChain,
} from "./effects";
import { createEmptySheet } from "./sheet";
import type { Sheet } from "./types";

afterEach(() => {
  chainAutoEffectRunner.run = applyAutoEffect;
});

function sheetForPurpleEightCascade(): Sheet {
  let sheet = createEmptySheet();
  for (let index = 0; index < 8; index += 1) {
    sheet = applyGreenCross(sheet, index).sheet;
  }
  const purpleValues = [2, 3, 4, 5, 6, 6, 6, 6] as const;
  for (let index = 0; index < purpleValues.length; index += 1) {
    sheet = applyPurpleFill(sheet, index, purpleValues[index]!).sheet;
  }
  return sheet;
}

describe("processAutoChain iteration guard", () => {
  it("throws when a malformed effect re-enqueues itself", () => {
    const looping = { type: "fox" as const };
    chainAutoEffectRunner.run = (sheet) => ({
      sheet: { ...sheet, foxes: sheet.foxes + 1 },
      triggered: [looping],
    });

    expect(() => processAutoChain(createEmptySheet(), [looping])).toThrow(
      new RegExp(`Bonus chain exceeded ${BONUS_CHAIN_ITERATION_LIMIT}`),
    );
  });

  it("completes the deepest real bonus cascade without tripping the guard", () => {
    const sheet = sheetForPurpleEightCascade();
    const triggered = applyPurpleFill(sheet, 8, 6).triggered;

    expect(triggered).toEqual([{ type: "cross_green_bonus" }]);

    const result = processAutoChain(sheet, triggered);

    expect(result.pending).toEqual([]);
    expect(result.sheet.green.boxes[8]?.crossed).toBe(true);
    expect(result.sheet.green.boxes[9]?.crossed).toBe(true);
    expect(result.sheet.purple.boxes[8]?.value).toBe(6);
    expect(result.sheet.rerolls).toBe(1);
    expect(result.sheet.rerollsEarned).toBe(1);
  });

  it("chains purple slot 9 fill_orange into orange", () => {
    let sheet = createEmptySheet();
    const purpleValues = [2, 3, 4, 5, 6, 6, 6, 6, 6] as const;
    for (let index = 0; index < purpleValues.length; index += 1) {
      sheet = applyPurpleFill(sheet, index, purpleValues[index]!).sheet;
    }

    const filled = applyPurpleFill(sheet, 9, 6);
    expect(filled.triggered).toEqual([{ type: "fill_orange", value: 6 }]);

    const result = processAutoChain(filled.sheet, filled.triggered);

    expect(result.pending).toEqual([]);
    expect(result.sheet.orange.boxes[0]?.value).toBe(6);
    expect(result.sheet.purple.boxes[9]?.value).toBe(6);
  });
});
