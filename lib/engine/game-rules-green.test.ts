/**
 * Rule: Green area — left to right without skipping; die must meet the next
 * box's minimum threshold; end-game points come from the star above the
 * rightmost crossed box.
 */
import { describe, expect, it } from "vitest";
import { GREEN_SCORES, GREEN_THRESHOLDS } from "./constants";
import { canCross, getCrossTargets } from "./legality";
import { reduceWithInvariants as reduce } from "./test-reduce";
import { createEmptySheet, nextGreenIndex, rightmostGreenIndex } from "./sheet";
import { scoreGreen } from "./scoring";
import { getSheetCrossOptions } from "@/lib/ui/cross-options";
import type { DieFace, Game } from "./types";

function crossGreenAt(sheet: ReturnType<typeof createEmptySheet>, index: number) {
  const boxes = sheet.green.boxes.map((box, i) =>
    i === index ? { ...box, crossed: true } : box,
  );
  return { ...sheet, green: { boxes } };
}

function crossGreenThrough(
  sheet: ReturnType<typeof createEmptySheet>,
  lastIndex: number,
) {
  let next = sheet;
  for (let index = 0; index <= lastIndex; index += 1) {
    next = crossGreenAt(next, index);
  }
  return next;
}

const ROLL: DieFace[] = [
  { color: "yellow", value: 2 },
  { color: "blue", value: 3 },
  { color: "green", value: 4 },
  { color: "orange", value: 5 },
  { color: "purple", value: 6 },
  { color: "white", value: 1 },
];

function startAndChooseGreen(value = 4): Game {
  const roll = ROLL.map((face) =>
    face.color === "green" ? { ...face, value } : face,
  );
  let game = reduce({} as Game, {
    type: "START_GAME",
    playerCount: 2,
    playerNames: ["Alice", "Bob"],
  });
  game = reduce(game, { type: "ROLL", values: roll });
  game = reduce(game, {
    type: "CHOOSE_DIE",
    playerId: "p1",
    dieId: "die-green",
    slotIndex: 0,
  });
  return game;
}

describe("rule: green track left to right without skipping", () => {
  it("only offers the leftmost uncrossed box", () => {
    const sheet = createEmptySheet();
    expect(nextGreenIndex(sheet)).toBe(0);
    expect(getCrossTargets(sheet, "green", 6)).toEqual([{ index: 0 }]);
  });

  it("advances one box at a time in order", () => {
    let sheet = createEmptySheet();
    sheet = crossGreenAt(sheet, 0);
    expect(nextGreenIndex(sheet)).toBe(1);
    expect(getCrossTargets(sheet, "green", 6)).toEqual([{ index: 1 }]);

    sheet = crossGreenAt(sheet, 1);
    expect(nextGreenIndex(sheet)).toBe(2);
    expect(getCrossTargets(sheet, "green", 6)).toEqual([{ index: 2 }]);
  });

  it("cannot skip ahead even with a high die", () => {
    const sheet = createEmptySheet();
    expect(canCross(sheet, "green", 6)).toBe(true);
    expect(getCrossTargets(sheet, "green", 6)).toEqual([{ index: 0 }]);
    expect(getCrossTargets(sheet, "green", 6).some((t) => t.index > 0)).toBe(
      false,
    );
  });
});

describe("rule: minimum die value per next green box", () => {
  it("uses the official threshold under each box", () => {
    const sheet = createEmptySheet();
    expect(sheet.green.boxes.map((box) => box.threshold)).toEqual([
      ...GREEN_THRESHOLDS,
    ]);
  });

  it.each(
    GREEN_THRESHOLDS.map((threshold, index) => [index, threshold] as const),
  )(
    "box %i requires die >= %i",
    (index, threshold) => {
      const sheet = crossGreenThrough(createEmptySheet(), index - 1);
      expect(canCross(sheet, "green", threshold - 1)).toBe(false);
      expect(canCross(sheet, "green", threshold)).toBe(true);
      expect(getCrossTargets(sheet, "green", threshold)).toEqual([
        { index },
      ]);
    },
  );

  it("rejects an illegal green cross through the reducer", () => {
    const roll = ROLL.map((face) =>
      face.color === "green" ? { ...face, value: 1 } : face,
    );
    let game = reduce({} as Game, {
      type: "START_GAME",
      playerCount: 2,
      playerNames: ["Alice", "Bob"],
    });
    game = reduce(game, { type: "ROLL", values: roll });
    game = reduce(game, {
      type: "CHOOSE_DIE",
      playerId: "p1",
      dieId: "die-green",
      slotIndex: 0,
    });
    game = reduce(game, {
      type: "CROSS",
      playerId: "p1",
      color: "green",
      value: 1,
    });
    expect(game.players[0].sheet.green.boxes[0].crossed).toBe(true);

    game = reduce(game, {
      type: "ROLL",
      values: [
        { color: "yellow", value: 2 },
        { color: "blue", value: 3 },
        { color: "orange", value: 5 },
        { color: "purple", value: 6 },
        { color: "white", value: 1 },
      ],
    });
    game = reduce(game, {
      type: "CHOOSE_DIE",
      playerId: "p1",
      dieId: "die-white",
      slotIndex: 1,
    });

    expect(() =>
      reduce(game, {
        type: "CROSS",
        playerId: "p1",
        color: "green",
        value: 1,
      }),
    ).toThrow("Illegal cross for selected die");
  });
});

describe("rule: end-game green scoring from rightmost cross", () => {
  it("scores 0 with no green marks", () => {
    expect(scoreGreen(createEmptySheet())).toBe(0);
    expect(rightmostGreenIndex(createEmptySheet())).toBe(-1);
  });

  it.each(GREEN_SCORES.map((points, index) => [index, points] as const))(
    "rightmost cross at box %i scores %i points",
    (index, points) => {
      const sheet = crossGreenThrough(createEmptySheet(), index);
      expect(rightmostGreenIndex(sheet)).toBe(index);
      expect(scoreGreen(sheet)).toBe(points);
    },
  );

  it("uses the star above the last crossed box, not earlier boxes", () => {
    const sheet = crossGreenThrough(createEmptySheet(), 4);
    expect(scoreGreen(sheet)).toBe(GREEN_SCORES[4]);
    expect(scoreGreen(sheet)).not.toBe(GREEN_SCORES[0]);
  });
});

describe("rule: green cross through active turn", () => {
  it("marks the next green box when the green die meets the threshold", () => {
    const game = startAndChooseGreen(4);
    const options = getSheetCrossOptions(game, "p1").filter(
      (option) => option.color === "green",
    );

    expect(options).toEqual([{ color: "green", value: 4, targetIndex: 0 }]);

    const crossed = reduce(game, {
      type: "CROSS",
      playerId: "p1",
      color: "green",
      value: 4,
    });

    expect(crossed.players[0].sheet.green.boxes[0].crossed).toBe(true);
    expect(scoreGreen(crossed.players[0].sheet)).toBe(GREEN_SCORES[0]);
  });
});
