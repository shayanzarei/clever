/**
 * Rule: Blue area — blue + white sum (white anywhere), symmetric when white is
 * chosen; two blue marks possible in one active turn; any order; end-game scoring
 * by mark count on the scale at top.
 */
import { describe, expect, it } from "vitest";
import {
  canCrossBlueFromDice,
  getBlueCrossTargetsFromDice,
  makeDie,
  resolveBlueWhiteValues,
} from "./blue";
import { BLUE_SCORE_BY_MARKS } from "./constants";
import {
  canCross,
  computeBlueSum,
  getBlueCrossTargets,
} from "./legality";
import { countCrossedBlue } from "./sheet";
import { reduceWithInvariants as reduce } from "./test-reduce";
import { createEmptySheet } from "./sheet";
import { scoreBlue } from "./scoring";
import { getSheetCrossOptions } from "@/lib/ui/cross-options";
import type { DieFace, Game } from "./types";

function crossBlueSum(sheet: ReturnType<typeof createEmptySheet>, sum: number) {
  const boxes = sheet.blue.boxes.map((box) =>
    box.sum === sum ? { ...box, crossed: true } : box,
  );
  return { ...sheet, blue: { boxes } };
}

describe("rule: blue + white sum regardless of location", () => {
  it("adds the live white die when blue is chosen", () => {
    const dice = [
      makeDie("b", "blue", 3, "slot"),
      makeDie("w", "white", 4, "tray"),
      makeDie("g", "green", 6, "pool"),
    ];
    expect(resolveBlueWhiteValues(dice)).toEqual({ blue: 3, white: 4 });
    expect(computeBlueSum(3, 4)).toBe(7);
    expect(getBlueCrossTargetsFromDice(createEmptySheet(), dice)).toEqual([
      { index: 5 },
    ]);
  });

  it("adds the live blue die when white is chosen for blue", () => {
    const dice = [
      makeDie("b", "blue", 5, "tray"),
      makeDie("w", "white", 2, "slot"),
    ];
    expect(canCrossBlueFromDice(createEmptySheet(), dice)).toBe(true);
    expect(getBlueCrossTargetsFromDice(createEmptySheet(), dice)).toEqual([
      { index: 5 },
    ]);
  });

  it("treats blue+white symmetrically", () => {
    const sheet = createEmptySheet();
    expect(canCross(sheet, "blue", 3, 4)).toBe(canCross(sheet, "blue", 4, 3));
  });
});

describe("rule: blue boxes in any order", () => {
  it("allows crossing any open sum slot, not only left to right", () => {
    const sheet = createEmptySheet();
    expect(getBlueCrossTargets(sheet, 6, 6)).toEqual([{ index: 10 }]);

    const crossed = crossBlueSum(sheet, 7);
    expect(getBlueCrossTargets(crossed, 6, 6)).toEqual([{ index: 10 }]);
    expect(canCross(crossed, "blue", 3, 4)).toBe(false);
  });

  it("uses each sum box at most once", () => {
    const sheet = crossBlueSum(createEmptySheet(), 7);
    expect(canCross(sheet, "blue", 3, 4)).toBe(false);
  });
});

describe("rule: end-game blue scoring by mark count", () => {
  it.each(
    BLUE_SCORE_BY_MARKS.map((points, marks) => [marks, points] as const),
  )("scores %i marks as %i points", (marks, points) => {
    const boxes = createEmptySheet().blue.boxes.map((box, index) => ({
      ...box,
      crossed: index < marks,
    }));
    const sheet = { ...createEmptySheet(), blue: { boxes } };
    expect(countCrossedBlue(sheet)).toBe(marks);
    expect(scoreBlue(sheet)).toBe(points);
  });
});

describe("rule: two blue marks in one active turn", () => {
  const ROLL_ONE: DieFace[] = [
    { color: "yellow", value: 6 },
    { color: "blue", value: 3 },
    { color: "green", value: 6 },
    { color: "orange", value: 6 },
    { color: "purple", value: 6 },
    { color: "white", value: 4 },
  ];

  function startGame(): Game {
    return reduce({} as Game, {
      type: "START_GAME",
      playerCount: 2,
      playerNames: ["Alice", "Bob"],
    });
  }

  it("can mark blue on the blue die roll and again on the white die roll", () => {
    let game = startGame();
    game = reduce(game, { type: "ROLL", values: ROLL_ONE });
    game = reduce(game, {
      type: "CHOOSE_DIE",
      playerId: "p1",
      dieId: "die-blue",
      slotIndex: 0,
    });

    const blueOptions = getSheetCrossOptions(game, "p1");
    expect(blueOptions).toEqual([
      { color: "blue", value: 7, targetIndex: 5, blueDie: 3, whiteDie: 4 },
    ]);

    game = reduce(game, {
      type: "CROSS",
      playerId: "p1",
      color: "blue",
      blueDie: 3,
      whiteDie: 4,
      targetIndex: 5,
    });
    expect(countCrossedBlue(game.players[0].sheet)).toBe(1);

    game = reduce(game, {
      type: "ROLL",
      values: [
        { color: "yellow", value: 6 },
        { color: "green", value: 1 },
        { color: "orange", value: 1 },
        { color: "purple", value: 1 },
        { color: "white", value: 6 },
      ],
    });
    game = reduce(game, {
      type: "CHOOSE_DIE",
      playerId: "p1",
      dieId: "die-white",
      slotIndex: 1,
    });

    const whiteBlueOptions = getSheetCrossOptions(game, "p1").filter(
      (option) => option.color === "blue",
    );
    expect(whiteBlueOptions).toEqual([
      { color: "blue", value: 9, targetIndex: 7, blueDie: 3, whiteDie: 6 },
    ]);

    game = reduce(game, {
      type: "CROSS",
      playerId: "p1",
      color: "blue",
      blueDie: 3,
      whiteDie: 6,
      targetIndex: 7,
    });

    expect(countCrossedBlue(game.players[0].sheet)).toBe(2);
    expect(game.activeRollCount).toBe(2);
    expect(scoreBlue(game.players[0].sheet)).toBe(BLUE_SCORE_BY_MARKS[2]);
  });
});
