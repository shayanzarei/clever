/**
 * Rule: Yellow area — cross the die value (one cell per die), any order; circle
 * the column star when a column is complete (columns in any order).
 */
import { describe, expect, it } from "vitest";
import { applyYellowCross } from "./apply";
import { YELLOW_GRID_LAYOUT } from "./constants";
import { canCross, getCrossTargets } from "./legality";
import { reduceWithInvariants as reduce } from "./test-reduce";
import { createEmptySheet, isYellowColumnComplete } from "./sheet";
import { scoreYellow } from "./scoring";
import { getSheetCrossOptions } from "@/lib/ui/cross-options";
import type { DieFace, Game } from "./types";

const ROLL: DieFace[] = [
  { color: "yellow", value: 2 },
  { color: "blue", value: 3 },
  { color: "green", value: 4 },
  { color: "orange", value: 5 },
  { color: "purple", value: 6 },
  { color: "white", value: 1 },
];

function startAndChooseYellow(): Game {
  let game = reduce({} as Game, {
    type: "START_GAME",
    playerCount: 2,
    playerNames: ["Alice", "Bob"],
  });
  game = reduce(game, { type: "ROLL", values: ROLL });
  game = reduce(game, {
    type: "CHOOSE_DIE",
    playerId: "p1",
    dieId: "die-yellow",
    slotIndex: 0,
  });
  return game;
}

function crossYellowCell(sheet: ReturnType<typeof createEmptySheet>, index: number) {
  return applyYellowCross(sheet, index).sheet;
}

describe("rule: cross the chosen die value", () => {
  it("offers only open cells matching the yellow die face", () => {
    const game = startAndChooseYellow();
    const options = getSheetCrossOptions(game, "p1");

    expect(options.every((option) => option.color === "yellow")).toBe(true);
    expect(options.every((option) => option.value === 2)).toBe(true);
    for (const option of options) {
      const row = Math.floor(option.targetIndex / 4);
      const col = option.targetIndex % 4;
      expect(game.players[0].sheet.yellow.grid[row][col].value).toBe(2);
    }
  });

  it("marks exactly one cell per yellow cross action", () => {
    const sheet = createEmptySheet();
    const before = sheet.yellow.grid.flat().filter((cell) => cell.crossed).length;
    const after = applyYellowCross(sheet, 4).sheet.yellow.grid
      .flat()
      .filter((cell) => cell.crossed).length;
    expect(after - before).toBe(1);
  });
});

describe("rule: each value appears twice, one cross per die", () => {
  it("has exactly two open cells per pip value on the official layout", () => {
    const sheet = createEmptySheet();
    const counts = new Map<number, number>();
    sheet.yellow.grid.flat().forEach((cell) => {
      if (!cell.crossed && cell.value > 0) {
        counts.set(cell.value, (counts.get(cell.value) ?? 0) + 1);
      }
    });

    for (const row of YELLOW_GRID_LAYOUT) {
      for (const cell of row) {
        if (typeof cell === "number") {
          expect(counts.get(cell)).toBe(2);
        }
      }
    }
  });

  it("allows only one of the two matching cells per die", () => {
    let sheet = createEmptySheet();
    expect(getCrossTargets(sheet, "yellow", 2)).toHaveLength(2);

    sheet = crossYellowCell(sheet, 4);
    expect(getCrossTargets(sheet, "yellow", 2)).toEqual([{ index: 10 }]);
    expect(canCross(sheet, "yellow", 2)).toBe(true);

    sheet = crossYellowCell(sheet, 10);
    expect(canCross(sheet, "yellow", 2)).toBe(false);
  });
});

describe("rule: yellow cells and columns in any order", () => {
  it("permits crossing non-adjacent cells in any sequence", () => {
    let sheet = createEmptySheet();
    sheet = crossYellowCell(sheet, 10);
    sheet = crossYellowCell(sheet, 0);

    expect(sheet.yellow.grid[2][2].crossed).toBe(true);
    expect(sheet.yellow.grid[0][0].crossed).toBe(true);
  });

  it("circles the column star when that column is filled", () => {
    let sheet = createEmptySheet();
    expect(sheet.yellow.columnScored[1]).toBe(false);

    for (let row = 0; row < 4; row += 1) {
      sheet = crossYellowCell(sheet, row * 4 + 1);
    }

    expect(isYellowColumnComplete(sheet, 1)).toBe(true);
    expect(sheet.yellow.columnScored[1]).toBe(true);
    expect(scoreYellow(sheet)).toBe(14);
  });

  it("scores completed columns independently and in any order", () => {
    let sheet = createEmptySheet();

    for (let row = 0; row < 4; row += 1) {
      sheet = crossYellowCell(sheet, row * 4 + 3);
    }
    expect(sheet.yellow.columnScored[3]).toBe(true);
    expect(scoreYellow(sheet)).toBe(20);

    for (let row = 0; row < 4; row += 1) {
      sheet = crossYellowCell(sheet, row * 4);
    }
    expect(sheet.yellow.columnScored[0]).toBe(true);
    expect(scoreYellow(sheet)).toBe(30);
  });
});
