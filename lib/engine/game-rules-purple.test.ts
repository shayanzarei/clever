/**
 * Rule: Purple area — left to right without skipping; each value must exceed the
 * previous unless the previous was 6 (then any value); end-game score is the sum
 * of all recorded values.
 */
import { describe, expect, it } from "vitest";
import { applyPurpleFill } from "./apply";
import { canCross, getCrossTargets } from "./legality";
import { reduceWithInvariants as reduce } from "./test-reduce";
import { createEmptySheet, nextPurpleIndex } from "./sheet";
import { scorePurple } from "./scoring";
import { getSheetCrossOptions } from "@/lib/ui/cross-options";
import type { DieFace, Game } from "./types";

function fillPurpleAt(
  sheet: ReturnType<typeof createEmptySheet>,
  index: number,
  value: number,
) {
  return applyPurpleFill(sheet, index, value as 1 | 2 | 3 | 4 | 5 | 6).sheet;
}

function fillPurpleThrough(
  sheet: ReturnType<typeof createEmptySheet>,
  values: readonly number[],
) {
  let next = sheet;
  values.forEach((value, index) => {
    next = fillPurpleAt(next, index, value);
  });
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

function startAndChoosePurple(value = 6): Game {
  const roll = ROLL.map((face) =>
    face.color === "purple" ? { ...face, value } : face,
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
    dieId: "die-purple",
    slotIndex: 0,
  });
  return game;
}

describe("rule: purple track left to right without skipping", () => {
  it("only offers the leftmost empty slot", () => {
    const sheet = createEmptySheet();
    expect(nextPurpleIndex(sheet)).toBe(0);
    expect(getCrossTargets(sheet, "purple", 3)).toEqual([{ index: 0 }]);
  });

  it("advances one slot at a time in order", () => {
    let sheet = fillPurpleAt(createEmptySheet(), 0, 2);
    expect(nextPurpleIndex(sheet)).toBe(1);
    expect(getCrossTargets(sheet, "purple", 5)).toEqual([{ index: 1 }]);
  });

  it("cannot skip ahead even with a high die", () => {
    const sheet = createEmptySheet();
    expect(getCrossTargets(sheet, "purple", 6)).toEqual([{ index: 0 }]);
    expect(getCrossTargets(sheet, "purple", 6).some((t) => t.index > 0)).toBe(
      false,
    );
  });
});

describe("rule: each purple value must exceed the previous", () => {
  it.each([1, 2, 3, 4, 5, 6] as const)(
    "accepts any die value %i in the first slot",
    (value) => {
      expect(canCross(createEmptySheet(), "purple", value)).toBe(true);
    },
  );

  it("requires a strictly higher value after the first slot", () => {
    const sheet = fillPurpleThrough(createEmptySheet(), [4]);
    expect(canCross(sheet, "purple", 4)).toBe(false);
    expect(canCross(sheet, "purple", 3)).toBe(false);
    expect(canCross(sheet, "purple", 5)).toBe(true);
    expect(getCrossTargets(sheet, "purple", 5)).toEqual([{ index: 1 }]);
  });
});

describe("rule: after a 6, any value may follow", () => {
  it("allows any die value 1–6 after a recorded 6", () => {
    const sheet = fillPurpleThrough(createEmptySheet(), [2, 5, 6]);
    for (const value of [1, 2, 3, 4, 5, 6] as const) {
      expect(canCross(sheet, "purple", value)).toBe(true);
    }
  });

  it("matches the rulebook sequence 2 < 5 < 6, then 3", () => {
    let sheet = createEmptySheet();
    sheet = fillPurpleThrough(sheet, [2]);
    expect(canCross(sheet, "purple", 5)).toBe(true);
    sheet = fillPurpleThrough(sheet, [2, 5]);
    expect(canCross(sheet, "purple", 6)).toBe(true);
    sheet = fillPurpleThrough(sheet, [2, 5, 6]);
    expect(canCross(sheet, "purple", 3)).toBe(true);
    expect(getCrossTargets(sheet, "purple", 3)).toEqual([{ index: 3 }]);
  });

  it("still requires increases when the previous value was not 6", () => {
    const sheet = fillPurpleThrough(createEmptySheet(), [2, 5]);
    expect(canCross(sheet, "purple", 5)).toBe(false);
    expect(canCross(sheet, "purple", 6)).toBe(true);
  });
});

describe("rule: end-game purple scoring sums recorded values", () => {
  it("scores 0 on an empty row", () => {
    expect(scorePurple(createEmptySheet())).toBe(0);
  });

  it("sums all recorded values", () => {
    const sheet = fillPurpleThrough(createEmptySheet(), [2, 5, 6, 3]);
    expect(scorePurple(sheet)).toBe(16);
  });

  it("includes partially filled rows", () => {
    const sheet = fillPurpleThrough(createEmptySheet(), [2, 5]);
    expect(scorePurple(sheet)).toBe(7);
  });
});

describe("rule: purple fill through active turn", () => {
  it("records the die face in the leftmost empty slot", () => {
    const game = startAndChoosePurple(6);
    const options = getSheetCrossOptions(game, "p1").filter(
      (option) => option.color === "purple",
    );

    expect(options).toEqual([{ color: "purple", value: 6, targetIndex: 0 }]);

    const crossed = reduce(game, {
      type: "CROSS",
      playerId: "p1",
      color: "purple",
      value: 6,
    });

    expect(crossed.players[0].sheet.purple.boxes[0].value).toBe(6);
    expect(scorePurple(crossed.players[0].sheet)).toBe(6);
  });

  it("rejects a non-increasing purple cross through the reducer", () => {
    const roll = ROLL.map((face) =>
      face.color === "purple" ? { ...face, value: 4 } : face,
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
      dieId: "die-purple",
      slotIndex: 0,
    });
    game = reduce(game, {
      type: "CROSS",
      playerId: "p1",
      color: "purple",
      value: 4,
    });

    game = reduce(game, {
      type: "ROLL",
      values: [
        { color: "green", value: 4 },
        { color: "orange", value: 5 },
      ],
    });
    game = reduce(game, {
      type: "CHOOSE_DIE",
      playerId: "p1",
      dieId: "die-green",
      slotIndex: 1,
    });

    expect(() =>
      reduce(game, {
        type: "CROSS",
        playerId: "p1",
        color: "purple",
        value: 4,
      }),
    ).toThrow("Illegal cross for selected die");
  });
});
