/**
 * Dead choice bonuses (no legal targets) must be discarded so the queue drains.
 * Partially dead multi-area choice bonuses must only offer open targets.
 */
import { describe, expect, it } from "vitest";
import { getSheetCrossOptions } from "@/lib/ui/cross-options";
import {
  applyBlueCross,
  applyGreenCross,
  applyOrangeFill,
  applyYellowCross,
} from "./apply";
import { processAutoChain } from "./effects";
import { reduceWithInvariants as reduce } from "./test-reduce";
import { createEmptySheet } from "./sheet";
import type { Effect, Game, Sheet } from "./types";

function markAllNumberedYellow(sheet: ReturnType<typeof createEmptySheet>) {
  let next = sheet;
  next.yellow.grid.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (!cell.crossed && !cell.preprinted) {
        next = applyYellowCross(next, rowIndex * row.length + colIndex).sheet;
      }
    });
  });
  return next;
}

function crossAllBlue(sheet: ReturnType<typeof createEmptySheet>) {
  let next = sheet;
  for (let index = 0; index < next.blue.boxes.length; index += 1) {
    next = applyBlueCross(next, index).sheet;
  }
  return next;
}

function crossAllGreen(sheet: ReturnType<typeof createEmptySheet>) {
  let next = sheet;
  for (let index = 0; index < next.green.boxes.length; index += 1) {
    next = applyGreenCross(next, index).sheet;
  }
  return next;
}

function drainBonuses(
  sheet: ReturnType<typeof createEmptySheet>,
  pending: readonly Effect[],
) {
  return processAutoChain(sheet, pending);
}

function startGame(): Game {
  return reduce({} as Game, {
    type: "START_GAME",
    playerCount: 2,
    playerNames: ["Alice", "Bob"],
  });
}

function gameWithPending(
  sheet: Sheet,
  effect: Effect,
  playerId = "p1",
): Game {
  const game = startGame();
  return {
    ...game,
    players: [{ ...game.players[0], sheet }, game.players[1]],
    pending: [effect],
    pendingPlayerId: playerId,
    phase: "resolve_pending",
  };
}

function fillAllOrange(sheet: Sheet): Sheet {
  let next = sheet;
  for (let index = 0; index < next.orange.boxes.length; index += 1) {
    next = applyOrangeFill(next, index, 1).sheet;
  }
  return next;
}

describe("dead choice bonuses are discarded", () => {
  it("discards cross_yellow_free when all numbered yellow cells are marked", () => {
    const sheet = markAllNumberedYellow(createEmptySheet());
    expect(sheet.yellow.grid.flat().every((cell) => cell.crossed)).toBe(true);

    const result = drainBonuses(sheet, [{ type: "cross_yellow_free" }]);

    expect(result.pending).toEqual([]);
    expect(result.sheet).toBe(sheet);
  });

  it("discards cross_blue_free when all blue sums are crossed", () => {
    const sheet = crossAllBlue(createEmptySheet());
    expect(sheet.blue.boxes.every((box) => box.crossed)).toBe(true);

    const result = drainBonuses(sheet, [{ type: "cross_blue_free" }]);

    expect(result.pending).toEqual([]);
    expect(result.sheet).toBe(sheet);
  });

  it("discards cross_green_bonus when green is full", () => {
    const sheet = crossAllGreen(createEmptySheet());
    expect(sheet.green.boxes.every((box) => box.crossed)).toBe(true);

    const result = drainBonuses(sheet, [{ type: "cross_green_bonus" }]);

    expect(result.pending).toEqual([]);
    expect(result.sheet).toBe(sheet);
  });

  it("discards round_black_x when yellow, blue, and green are all full", () => {
    let sheet = markAllNumberedYellow(createEmptySheet());
    sheet = crossAllBlue(sheet);
    sheet = crossAllGreen(sheet);

    const result = drainBonuses(sheet, [{ type: "round_black_x" }]);

    expect(result.pending).toEqual([]);
  });
});

describe("dead choice bonuses mid-queue", () => {
  it("discards a dead bonus and still resolves effects queued after it", () => {
    const sheet = markAllNumberedYellow(createEmptySheet());

    const result = drainBonuses(sheet, [
      { type: "cross_yellow_free" },
      { type: "fox" },
      { type: "plus_one" },
    ]);

    expect(result.pending).toEqual([]);
    expect(result.sheet.foxes).toBe(1);
    expect(result.sheet.plusOnes).toBe(1);
  });

  it("discards a dead blue X and still applies a chained orange fill", () => {
    const sheet = crossAllBlue(createEmptySheet());

    const result = drainBonuses(sheet, [
      { type: "cross_blue_free" },
      { type: "fill_orange", value: 5 },
    ]);

    expect(result.pending).toEqual([]);
    expect(result.sheet.orange.boxes[0]?.value).toBe(5);
  });
});

describe("partially dead multi-area choice bonuses", () => {
  it("offers only purple for round_black_six when orange is full", () => {
    const sheet = fillAllOrange(createEmptySheet());
    const game = gameWithPending(sheet, { type: "round_black_six" });

    const options = getSheetCrossOptions(game, "p1");
    expect(options.map((option) => option.color)).toEqual(["purple"]);

    const resolved = reduce(game, {
      type: "CROSS",
      playerId: "p1",
      color: "purple",
      value: 6,
    });

    expect(resolved.pending).toEqual([]);
    expect(resolved.players[0].sheet.purple.boxes[0]?.value).toBe(6);
  });

  it("offers only green for round_black_x when yellow and blue are full", () => {
    let sheet = markAllNumberedYellow(createEmptySheet());
    sheet = crossAllBlue(sheet);
    const game = gameWithPending(sheet, { type: "round_black_x" });

    const options = getSheetCrossOptions(game, "p1");
    expect(options.map((option) => option.color)).toEqual(["green"]);

    const resolved = reduce(game, {
      type: "CROSS",
      playerId: "p1",
      color: "green",
      value: 1,
      targetIndex: 0,
    });

    expect(resolved.pending).toEqual([]);
    expect(resolved.players[0].sheet.green.boxes[0]?.crossed).toBe(true);
  });

  it("does not offer green for round_black_x when green is full", () => {
    let sheet = crossAllGreen(createEmptySheet());
    const game = gameWithPending(sheet, { type: "round_black_x" });

    const options = getSheetCrossOptions(game, "p1");
    expect(options.some((option) => option.color === "green")).toBe(false);
    expect(options.some((option) => option.color === "yellow")).toBe(true);
    expect(options.some((option) => option.color === "blue")).toBe(true);
  });

  it("does not offer yellow for round_black_x when yellow is full", () => {
    const sheet = markAllNumberedYellow(createEmptySheet());
    const game = gameWithPending(sheet, { type: "round_black_x" });

    const options = getSheetCrossOptions(game, "p1");
    expect(options.some((option) => option.color === "yellow")).toBe(false);
    expect(options.some((option) => option.color === "blue")).toBe(true);
    expect(options.some((option) => option.color === "green")).toBe(true);
  });
});
