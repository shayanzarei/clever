/**
 * Engine authority for choice-bonus target legality (server-safe; no UI).
 */
import { describe, expect, it } from "vitest";
import { YELLOW_PREPRINTED_INDICES } from "./constants";
import {
  applyBlueCross,
  applyGreenCross,
  applyOrangeFill,
  applyYellowCross,
} from "./apply";
import { isValidChoiceTarget } from "./choice-targets";
import { reduceWithInvariants as reduce } from "./test-reduce";
import { createEmptySheet } from "./sheet";
import type { Game, Sheet } from "./types";

function startGame(): Game {
  return reduce({} as Game, {
    type: "START_GAME",
    playerCount: 2,
    playerNames: ["Alice", "Bob"],
  });
}

function gameWithPending(
  sheet: Sheet,
  effect:
    | { type: "cross_yellow_free" }
    | { type: "cross_blue_free" }
    | { type: "round_black_x" }
    | { type: "round_black_six" },
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

function crossAllGreen(sheet: Sheet): Sheet {
  let next = sheet;
  for (let index = 0; index < next.green.boxes.length; index += 1) {
    next = applyGreenCross(next, index).sheet;
  }
  return next;
}

function expectRejectedCross(game: Game, action: Parameters<typeof reduce>[1]) {
  const before = {
    pending: [...game.pending],
    sheet: game.players[0].sheet,
  };
  expect(() => reduce(game, action)).toThrow("Illegal pending cross");
  expect(game.pending).toEqual(before.pending);
  expect(game.players[0].sheet).toEqual(before.sheet);
}

describe("choice target validation in reduce", () => {
  describe("cross_yellow_free", () => {
    it("rejects an already-marked cell", () => {
      const crossed = applyYellowCross(createEmptySheet(), 0).sheet;
      const game = gameWithPending(crossed, { type: "cross_yellow_free" });

      expectRejectedCross(game, {
        type: "CROSS",
        playerId: "p1",
        color: "yellow",
        value: 3,
        targetIndex: 0,
      });
    });

    it("rejects a pre-printed X cell", () => {
      const game = gameWithPending(createEmptySheet(), {
        type: "cross_yellow_free",
      });

      for (const targetIndex of YELLOW_PREPRINTED_INDICES) {
        expectRejectedCross(game, {
          type: "CROSS",
          playerId: "p1",
          color: "yellow",
          value: 0,
          targetIndex,
        });
      }
    });

    it("accepts a valid open cell and clears pending", () => {
      const game = gameWithPending(createEmptySheet(), {
        type: "cross_yellow_free",
      });

      const resolved = reduce(game, {
        type: "CROSS",
        playerId: "p1",
        color: "yellow",
        value: 3,
        targetIndex: 0,
      });

      expect(resolved.pending).toEqual([]);
      expect(resolved.players[0].sheet.yellow.grid[0][0].crossed).toBe(true);
    });
  });

  describe("cross_blue_free", () => {
    it("rejects an already-crossed sum box", () => {
      const sheet = applyBlueCross(createEmptySheet(), 5).sheet;
      const game = gameWithPending(sheet, { type: "cross_blue_free" });

      expectRejectedCross(game, {
        type: "CROSS",
        playerId: "p1",
        color: "blue",
        targetIndex: 5,
      });
    });

    it("accepts an uncrossed sum box and clears pending", () => {
      const game = gameWithPending(createEmptySheet(), {
        type: "cross_blue_free",
      });

      const resolved = reduce(game, {
        type: "CROSS",
        playerId: "p1",
        color: "blue",
        targetIndex: 10,
      });

      expect(resolved.pending).toEqual([]);
      expect(resolved.players[0].sheet.blue.boxes[10]?.crossed).toBe(true);
    });
  });

  describe("round_black_six", () => {
    it("rejects orange when orange is full", () => {
      const sheet = fillAllOrange(createEmptySheet());
      const game = gameWithPending(sheet, { type: "round_black_six" });

      expectRejectedCross(game, {
        type: "CROSS",
        playerId: "p1",
        color: "orange",
        value: 6,
        targetIndex: 0,
      });
    });

    it("accepts purple when orange is full", () => {
      const sheet = fillAllOrange(createEmptySheet());
      const game = gameWithPending(sheet, { type: "round_black_six" });

      const resolved = reduce(game, {
        type: "CROSS",
        playerId: "p1",
        color: "purple",
        value: 6,
      });

      expect(resolved.pending).toEqual([]);
      expect(resolved.players[0].sheet.purple.boxes[0]?.value).toBe(6);
    });
  });

  describe("round_black_x", () => {
    it("rejects green when green is full", () => {
      const sheet = crossAllGreen(createEmptySheet());
      const game = gameWithPending(sheet, { type: "round_black_x" });

      expectRejectedCross(game, {
        type: "CROSS",
        playerId: "p1",
        color: "green",
        value: 1,
        targetIndex: 0,
      });
    });

    it("accepts yellow when green is full", () => {
      const sheet = crossAllGreen(createEmptySheet());
      const game = gameWithPending(sheet, { type: "round_black_x" });

      const resolved = reduce(game, {
        type: "CROSS",
        playerId: "p1",
        color: "yellow",
        value: 3,
        targetIndex: 0,
      });

      expect(resolved.pending).toEqual([]);
      expect(resolved.players[0].sheet.yellow.grid[0][0].crossed).toBe(true);
    });
  });
});

describe("isValidChoiceTarget", () => {
  it("rejects pre-printed yellow cells even if value is wrong", () => {
    const sheet = createEmptySheet();
    expect(
      isValidChoiceTarget(sheet, { type: "cross_yellow_free" }, {
        color: "yellow",
        targetIndex: 3,
        value: 0,
      }),
    ).toBe(false);
  });
});
