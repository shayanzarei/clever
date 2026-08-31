/**
 * Rule: Orange area — left to right without skipping; any die value accepted;
 * multiply die by slot multiplier and record; end-game score is the sum of
 * all recorded values.
 */
import { describe, expect, it } from "vitest";
import { applyOrangeFill } from "./apply";
import { ORANGE_MULTIPLIERS } from "./constants";
import {
  canCross,
  getCrossTargets,
  orangeRecordedValue,
} from "./legality";
import { reduceWithInvariants as reduce } from "./test-reduce";
import { createEmptySheet, nextOrangeIndex } from "./sheet";
import { scoreOrange } from "./scoring";
import { getSheetCrossOptions } from "@/lib/ui/cross-options";
import type { DieFace, Game } from "./types";

function fillOrangeAt(
  sheet: ReturnType<typeof createEmptySheet>,
  index: number,
  dieValue: number,
) {
  return applyOrangeFill(sheet, index, dieValue as 1 | 2 | 3 | 4 | 5 | 6).sheet;
}

function fillOrangeThrough(
  sheet: ReturnType<typeof createEmptySheet>,
  lastIndex: number,
  dieValue = 1,
) {
  let next = sheet;
  for (let index = 0; index <= lastIndex; index += 1) {
    next = fillOrangeAt(next, index, dieValue);
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

function startAndChooseOrange(value = 5): Game {
  const roll = ROLL.map((face) =>
    face.color === "orange" ? { ...face, value } : face,
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
    dieId: "die-orange",
    slotIndex: 0,
  });
  return game;
}

describe("rule: orange track left to right without skipping", () => {
  it("only offers the leftmost empty slot", () => {
    const sheet = createEmptySheet();
    expect(nextOrangeIndex(sheet)).toBe(0);
    expect(getCrossTargets(sheet, "orange", 6)).toEqual([{ index: 0 }]);
  });

  it("advances one slot at a time in order", () => {
    let sheet = createEmptySheet();
    sheet = fillOrangeAt(sheet, 0, 2);
    expect(nextOrangeIndex(sheet)).toBe(1);
    expect(getCrossTargets(sheet, "orange", 4)).toEqual([{ index: 1 }]);
  });

  it("cannot skip ahead even with a high die", () => {
    const sheet = createEmptySheet();
    expect(getCrossTargets(sheet, "orange", 6)).toEqual([{ index: 0 }]);
    expect(getCrossTargets(sheet, "orange", 6).some((t) => t.index > 0)).toBe(
      false,
    );
  });
});

describe("rule: no die-value restrictions on orange", () => {
  it.each([1, 2, 3, 4, 5, 6] as const)(
    "accepts die value %i on the next open slot",
    (value) => {
      expect(canCross(createEmptySheet(), "orange", value)).toBe(true);
    },
  );
});

describe("rule: multiply die by slot multiplier when recording", () => {
  it("stores the official multipliers on each slot", () => {
    const sheet = createEmptySheet();
    expect(sheet.orange.boxes.map((box) => box.multiplier)).toEqual([
      ...ORANGE_MULTIPLIERS,
    ]);
  });

  it.each(
    ORANGE_MULTIPLIERS.map((multiplier, index) => [index, multiplier] as const),
  )("slot %i records die × %i", (index, multiplier) => {
    const sheet = fillOrangeThrough(createEmptySheet(), index - 1);
    expect(orangeRecordedValue(sheet, index, 6)).toBe(6 * multiplier);
    expect(fillOrangeAt(sheet, index, 6).orange.boxes[index].value).toBe(
      6 * multiplier,
    );
  });

  it("matches rulebook examples (6 on ×2 → 12, 6 on ×3 → 18)", () => {
    const sheet = createEmptySheet();
    expect(orangeRecordedValue(sheet, 3, 6)).toBe(12);
    expect(orangeRecordedValue(sheet, 10, 6)).toBe(18);
  });
});

describe("rule: end-game orange scoring sums recorded values", () => {
  it("scores 0 on an empty row", () => {
    expect(scoreOrange(createEmptySheet())).toBe(0);
  });

  it("sums all recorded values with multipliers already applied", () => {
    const sheet = fillOrangeAt(
      fillOrangeAt(
        fillOrangeAt(fillOrangeAt(createEmptySheet(), 0, 5), 1, 2),
        2,
        3,
      ),
      3,
      6,
    );
    expect(sheet.orange.boxes.map((box) => box.value)).toEqual([
      5,
      2,
      3,
      12,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
    expect(scoreOrange(sheet)).toBe(22);
  });

  it("includes partially filled rows", () => {
    const sheet = fillOrangeAt(fillOrangeAt(createEmptySheet(), 0, 4), 1, 3);
    expect(scoreOrange(sheet)).toBe(7);
  });
});

describe("rule: orange fill through active turn", () => {
  it("records die × multiplier in the leftmost empty slot", () => {
    const game = startAndChooseOrange(5);
    const options = getSheetCrossOptions(game, "p1").filter(
      (option) => option.color === "orange",
    );

    expect(options).toEqual([{ color: "orange", value: 5, targetIndex: 0 }]);

    const crossed = reduce(game, {
      type: "CROSS",
      playerId: "p1",
      color: "orange",
      value: 5,
    });

    expect(crossed.players[0].sheet.orange.boxes[0].value).toBe(5);
    expect(scoreOrange(crossed.players[0].sheet)).toBe(5);
  });
});
