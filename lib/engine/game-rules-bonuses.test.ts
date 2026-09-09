/**
 * Rule: Bonuses (X-marks, numbered orange/purple fills, field vs line timing,
 * chaining, immediate resolution) and fox end-game scoring.
 */
import { describe, expect, it } from "vitest";
import {
  applyBlueCross,
  applyGreenCross,
  applyOrangeFill,
  applyPurpleFill,
  applyYellowCross,
} from "./apply";
import { processAutoChain } from "./effects";
import { reduceWithInvariants as reduce, assertGameSheets } from "./test-reduce";
import { createEmptySheet } from "./sheet";
import { colorScores, scoreFoxes, scoreSheet } from "./scoring";
import { getSheetCrossOptions } from "@/lib/ui/cross-options";
import type { Effect, Game, Sheet } from "./types";

function crossYellowCell(sheet: Sheet, flatIndex: number): Sheet {
  return applyYellowCross(sheet, flatIndex).sheet;
}

function crossYellowColumn(sheet: Sheet, column: number): Sheet {
  let next = sheet;
  for (let row = 0; row < 4; row += 1) {
    next = crossYellowCell(next, row * 4 + column);
  }
  return next;
}

function crossBlueCount(sheet: Sheet, count: number): Sheet {
  const boxes = sheet.blue.boxes.map((box, index) => ({
    ...box,
    crossed: index < count,
  }));
  return { ...sheet, blue: { boxes } };
}

function crossGreenThrough(sheet: Sheet, lastIndex: number): Sheet {
  let next = sheet;
  for (let index = 0; index <= lastIndex; index += 1) {
    next = applyGreenCross(next, index).sheet;
  }
  return next;
}

function fillOrangeValues(sheet: Sheet, values: number[]): Sheet {
  const boxes = sheet.orange.boxes.map((box, index) => ({
    ...box,
    value: values[index] ?? box.value,
  }));
  return { ...sheet, orange: { boxes } };
}

function fillPurpleValues(sheet: Sheet, values: number[]): Sheet {
  const boxes = sheet.purple.boxes.map((box, index) => ({
    ...box,
    value: values[index] ?? box.value,
  }));
  return { ...sheet, purple: { boxes } };
}

function applyTriggeredBonuses(sheet: Sheet, triggered: readonly Effect[]): Sheet {
  return processAutoChain(sheet, triggered).sheet;
}

function startGame(): Game {
  return reduce({} as Game, {
    type: "START_GAME",
    playerCount: 2,
    playerNames: ["Alice", "Bob"],
  });
}

function crossYellowRow0(sheet: ReturnType<typeof createEmptySheet>) {
  let next = sheet;
  for (const [index, value] of [
    [0, 3],
    [1, 6],
    [2, 5],
  ] as const) {
    next = applyYellowCross(next, index).sheet;
  }
  return next;
}

describe("rule: X-bonus marks a box in the matching color area", () => {
  it("queues a free blue cross when yellow row 0 is completed", () => {
    expect(applyYellowCross(createEmptySheet(), 0).triggered).toEqual([]);
    expect(applyYellowCross(createEmptySheet(), 1).triggered).toEqual([]);

    const completed = applyYellowCross(
      applyYellowCross(createEmptySheet(), 0).sheet,
      1,
    );
    expect(completed.triggered).toEqual([]);

    const final = applyYellowCross(completed.sheet, 2);
    expect(final.triggered).toEqual([{ type: "cross_blue_free" }]);
    expect(final.sheet.claims.yellowRows[0]).toBe(true);
  });

  it("lets a free blue bonus mark any uncrossed sum box", () => {
    let game = startGame();
    let sheet = crossYellowRow0(createEmptySheet());
    game = {
      ...game,
      players: [{ ...game.players[0], sheet }, game.players[1]],
      pending: [{ type: "cross_blue_free" }],
      pendingPlayerId: "p1",
      phase: "resolve_pending",
    };
    assertGameSheets(game);

    const options = getSheetCrossOptions(game, "p1").filter(
      (option) => option.color === "blue",
    );
    expect(options.length).toBeGreaterThan(1);

    game = reduce(game, {
      type: "CROSS",
      playerId: "p1",
      color: "blue",
      targetIndex: 10,
    });

    expect(game.players[0].sheet.blue.boxes[10].crossed).toBe(true);
    expect(game.players[0].sheet.blue.boxes[10].sum).toBe(12);
  });

  it("lets a free yellow bonus mark any open yellow cell", () => {
    let sheet = createEmptySheet();
    for (let index = 0; index < 4; index += 1) {
      sheet = applyOrangeFill(sheet, index, 1).sheet;
    }
    const filled = applyOrangeFill(sheet, 4, 6);
    const queued = processAutoChain(filled.sheet, filled.triggered);

    let game = startGame();
    game = {
      ...game,
      players: [{ ...game.players[0], sheet: queued.sheet }, game.players[1]],
      pending: queued.pending,
      pendingPlayerId: "p1",
      phase: "resolve_pending",
    };
    assertGameSheets(game);

    const options = getSheetCrossOptions(game, "p1").filter(
      (option) => option.color === "yellow",
    );
    expect(options.length).toBeGreaterThan(3);

    game = reduce(game, {
      type: "CROSS",
      playerId: "p1",
      color: "yellow",
      value: 1,
      targetIndex: 5,
    });

    expect(game.players[0].sheet.yellow.grid[1][1].crossed).toBe(true);
  });

  it("auto-marks the next green box for a cross_green_bonus", () => {
    let sheet = createEmptySheet();
    sheet = applyGreenCross(sheet, 0).sheet;

    const chained = processAutoChain(sheet, [{ type: "cross_green_bonus" }]);
    expect(chained.pending).toEqual([]);
    expect(chained.sheet.green.boxes[0].crossed).toBe(true);
    expect(chained.sheet.green.boxes[1].crossed).toBe(true);
    expect(chained.sheet.green.boxes[2].crossed).toBe(false);
  });
});

describe("rule: numbered orange/purple bonuses fill immediately", () => {
  it("auto-fills the next orange slot with the printed value", () => {
    const chained = processAutoChain(createEmptySheet(), [
      { type: "fill_orange", value: 4 },
    ]);
    expect(chained.pending).toEqual([]);
    expect(chained.sheet.orange.boxes[0].value).toBe(4);
    expect(chained.sheet.orange.boxes[1].value).toBeNull();
  });

  it("auto-fills the next purple slot with the printed value", () => {
    const chained = processAutoChain(createEmptySheet(), [
      { type: "fill_purple", value: 6 },
    ]);
    expect(chained.pending).toEqual([]);
    expect(chained.sheet.purple.boxes[0].value).toBe(6);
  });

  it("applies fill_orange immediately when a yellow row completes", () => {
    let sheet = createEmptySheet();
    let triggered: Effect[] = [];
    for (const index of [4, 5, 7] as const) {
      const result = applyYellowCross(sheet, index);
      sheet = result.sheet;
      triggered = result.triggered;
    }
    sheet = applyTriggeredBonuses(sheet, triggered);
    expect(sheet.orange.boxes[0].value).toBe(4);
    expect(sheet.claims.yellowRows[1]).toBe(true);
  });
});

describe("rule: field bonuses vs line/column bonuses", () => {
  it("redeems a field bonus as soon as that field is entered", () => {
    const result = applyGreenCross(createEmptySheet(), 5);
    expect(result.triggered).toEqual([{ type: "cross_blue_free" }]);
    expect(result.sheet.green.boxes[5].crossed).toBe(true);
  });

  it("does not redeem a line bonus until every field in the group is marked", () => {
    let sheet = createEmptySheet();
    expect(applyBlueCross(sheet, 0).triggered).toEqual([]);
    expect(applyBlueCross(sheet, 1).triggered).toEqual([]);

    sheet = applyBlueCross(sheet, 0).sheet;
    sheet = applyBlueCross(sheet, 1).sheet;
    const completed = applyBlueCross(sheet, 2);
    expect(completed.triggered).toEqual([{ type: "fill_orange", value: 5 }]);
    expect(completed.sheet.claims.blueRows[0]).toBe(true);
  });

  it("redeems a blue column bonus only when the full column is crossed", () => {
    let sheet = createEmptySheet();
    sheet = applyBlueCross(sheet, 3).sheet;
    const completed = applyBlueCross(sheet, 7);
    expect(completed.triggered).toEqual([{ type: "reroll" }]);
    expect(completed.sheet.claims.blueColumns[0]).toBe(true);
  });

  it("claims each line or column bonus at most once", () => {
    let sheet = createEmptySheet();
    sheet = applyBlueCross(sheet, 0).sheet;
    sheet = applyBlueCross(sheet, 1).sheet;
    sheet = applyBlueCross(sheet, 2).sheet;
    expect(sheet.claims.blueRows[0]).toBe(true);

    sheet = applyBlueCross(sheet, 0).sheet;
    expect(applyBlueCross(sheet, 1).triggered).toEqual([]);
  });
});

describe("rule: bonuses chain and must be resolved immediately", () => {
  it("chains an auto bonus into a pending choice bonus", () => {
    let sheet = createEmptySheet();
    for (let index = 0; index < 4; index += 1) {
      sheet = applyOrangeFill(sheet, index, 1).sheet;
    }
    const filled = applyOrangeFill(sheet, 4, 6);
    const chained = processAutoChain(filled.sheet, filled.triggered);
    expect(chained.sheet.orange.boxes[4].value).toBe(6);
    expect(chained.pending).toEqual([{ type: "cross_yellow_free" }]);
  });

  it("chains a line bonus into an immediate purple fill", () => {
    let sheet = createEmptySheet();
    sheet = applyBlueCross(sheet, 1).sheet;
    sheet = applyBlueCross(sheet, 9).sheet;
    const completed = applyBlueCross(sheet, 5);
    const chained = processAutoChain(completed.sheet, completed.triggered);
    expect(chained.sheet.purple.boxes[0].value).toBe(6);
    expect(chained.pending).toEqual([]);
  });

  it("blocks rolling while a choice bonus is pending", () => {
    const game = {
      ...startGame(),
      phase: "active_roll" as const,
      pending: [{ type: "cross_blue_free" }],
      pendingPlayerId: "p1",
    };

    expect(() =>
      reduce(game, {
        type: "ROLL",
        values: [
          { color: "yellow", value: 2 },
          { color: "blue", value: 3 },
          { color: "green", value: 4 },
          { color: "orange", value: 5 },
          { color: "purple", value: 6 },
          { color: "white", value: 1 },
        ],
      }),
    ).toThrow("Cannot roll while effects are pending");
  });

  it("activates fox bonuses immediately when triggered", () => {
    const chained = processAutoChain(createEmptySheet(), [{ type: "fox" }]);
    expect(chained.sheet.foxes).toBe(1);
    expect(chained.pending).toEqual([]);
  });

  it("increments foxes when a blue row bonus is earned", () => {
    let sheet = createEmptySheet();
    for (const index of [7, 8, 9, 10] as const) {
      const result = applyBlueCross(sheet, index);
      sheet = applyTriggeredBonuses(result.sheet, result.triggered);
    }
    expect(sheet.foxes).toBe(1);
  });
});

describe("rule: fox end-game scoring", () => {
  it("scores 0 with no foxes", () => {
    expect(scoreFoxes({ ...createEmptySheet(), foxes: 2 })).toBe(0);
  });

  it("scores 0 when any color area still scores 0", () => {
    let sheet = crossYellowColumn(createEmptySheet(), 0);
    sheet = { ...sheet, foxes: 3 };
    expect(scoreFoxes(sheet)).toBe(0);
  });

  it("scores fox count times the lowest color score", () => {
    let sheet = createEmptySheet();
    sheet = crossYellowColumn(sheet, 0);
    sheet = crossBlueCount(sheet, 6);
    sheet = crossGreenThrough(sheet, 0);
    sheet = fillOrangeValues(sheet, [2]);
    sheet = fillPurpleValues(sheet, [3]);
    sheet = { ...sheet, foxes: 2 };

    expect(colorScores(sheet).green).toBe(1);
    expect(scoreFoxes(sheet)).toBe(2);
  });

  it("matches the rulebook example (2 foxes, orange floor 5 → 10)", () => {
    let sheet = createEmptySheet();
    sheet = crossYellowColumn(sheet, 1);
    sheet = crossBlueCount(sheet, 4);
    sheet = crossGreenThrough(sheet, 2);
    sheet = fillOrangeValues(sheet, [5]);
    sheet = fillPurpleValues(sheet, [6]);
    sheet = { ...sheet, foxes: 2 };

    expect(Math.min(...Object.values(colorScores(sheet)))).toBe(5);
    expect(scoreFoxes(sheet)).toBe(10);
    expect(scoreSheet(sheet)).toBeGreaterThan(scoreSheet({ ...sheet, foxes: 0 }));
  });
});
