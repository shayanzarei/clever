import { describe, expect, it } from "vitest";
import { YELLOW_GRID_VALUES } from "./constants";
import { canCross, computeBlueSum, getBlueCrossTargets, getCrossTargets, orangeRecordedValue } from "./legality";
import { createEmptySheet } from "./sheet";
import type { Sheet } from "./types";

function crossYellow(sheet: Sheet, flatIndex: number): Sheet {
  const row = Math.floor(flatIndex / 4);
  const col = flatIndex % 4;
  const grid = sheet.yellow.grid.map((r, ri) =>
    r.map((cell, ci) =>
      ri === row && ci === col ? { ...cell, crossed: true } : cell,
    ),
  );
  return { ...sheet, yellow: { ...sheet.yellow, grid } };
}

function crossBlueSum(sheet: Sheet, sum: number): Sheet {
  const boxes = sheet.blue.boxes.map((box) =>
    box.sum === sum ? { ...box, crossed: true } : box,
  );
  return { ...sheet, blue: { boxes } };
}

function crossGreenAt(sheet: Sheet, index: number): Sheet {
  const boxes = sheet.green.boxes.map((box, i) =>
    i === index ? { ...box, crossed: true } : box,
  );
  return { ...sheet, green: { boxes } };
}

function fillOrangeThrough(sheet: Sheet, count: number, dieValue = 3): Sheet {
  const boxes = sheet.orange.boxes.map((box, index) => {
    if (index >= count) {
      return box;
    }
    const multiplier = box.multiplier;
    return { ...box, value: dieValue * multiplier };
  });
  return { ...sheet, orange: { boxes } };
}

function fillPurpleThrough(
  sheet: Sheet,
  values: number[],
): Sheet {
  const boxes = sheet.purple.boxes.map((box, index) => ({
    ...box,
    value: values[index] ?? box.value,
  }));
  return { ...sheet, purple: { boxes } };
}

describe("canCross yellow", () => {
  it("allows crossing any uncrossed cell matching the die value", () => {
    const sheet = createEmptySheet();
    expect(canCross(sheet, "yellow", 2)).toBe(true);
    expect(getCrossTargets(sheet, "yellow", 2)).toHaveLength(2);
  });

  it("rejects values with no matching open cell", () => {
    let sheet = createEmptySheet();
    // Cross both cells showing 2 (flat indices 0 and 5).
    sheet = crossYellow(sheet, 0);
    sheet = crossYellow(sheet, 5);
    expect(canCross(sheet, "yellow", 2)).toBe(false);
  });

  it("rejects out-of-range values", () => {
    expect(canCross(createEmptySheet(), "yellow", 0)).toBe(false);
    expect(canCross(createEmptySheet(), "yellow", 7)).toBe(false);
  });

  it("maps flat indices to the official grid layout", () => {
    const sheet = createEmptySheet();
    const targets = getCrossTargets(sheet, "yellow", 5);
    for (const { index } of targets) {
      const row = Math.floor(index / 4);
      const col = index % 4;
      expect(YELLOW_GRID_VALUES[row][col]).toBe(5);
    }
  });
});

describe("canCross blue", () => {
  it("requires blue die + white die to compute the sum", () => {
    expect(canCross(createEmptySheet(), "blue", 3, 4)).toBe(true);
    expect(getCrossTargets(createEmptySheet(), "blue", 3, 4)).toEqual([
      { index: 5 },
    ]);
    expect(computeBlueSum(3, 4)).toBe(7);
  });

  it("rejects a bare sum without both dice", () => {
    // @ts-expect-error blue requires two dice, not a precomputed sum
    expect(canCross(createEmptySheet(), "blue", 7)).toBe(false);
  });

  it("is symmetric — order of dice does not matter for the sum", () => {
    const sheet = createEmptySheet();
    expect(canCross(sheet, "blue", 3, 4)).toBe(true);
    expect(canCross(sheet, "blue", 4, 3)).toBe(true);
  });

  it("rejects sums outside 2–12 from two d6", () => {
    expect(canCross(createEmptySheet(), "blue", 0 as 1, 1)).toBe(false);
  });

  it("rejects an already-used sum", () => {
    const sheet = crossBlueSum(createEmptySheet(), 7);
    expect(canCross(sheet, "blue", 3, 4)).toBe(false);
  });

  it("sum 2 requires both dice showing 1 (cannot use a single die)", () => {
    expect(canCross(createEmptySheet(), "blue", 1, 1)).toBe(true);
    expect(getBlueCrossTargets(createEmptySheet(), 1, 1)).toEqual([
      { index: 0 },
    ]);
  });

  it("each sum slot is usable only once", () => {
    expect(getBlueCrossTargets(createEmptySheet(), 6, 6)).toEqual([
      { index: 10 },
    ]);
    expect(canCross(crossBlueSum(createEmptySheet(), 12), "blue", 6, 6)).toBe(
      false,
    );
  });
});

describe("canCross green", () => {
  it("requires die >= threshold of the next open box", () => {
    const sheet = createEmptySheet();
    expect(canCross(sheet, "green", 1)).toBe(true);
    expect(canCross(sheet, "green", 0)).toBe(false);
  });

  it("enforces ascending thresholds left to right", () => {
    let sheet = createEmptySheet();
    sheet = crossGreenAt(sheet, 0);
    expect(canCross(sheet, "green", 1)).toBe(false);
    expect(canCross(sheet, "green", 2)).toBe(true);
    expect(getCrossTargets(sheet, "green", 2)).toEqual([{ index: 1 }]);
  });

  it("rejects when the track is full", () => {
    let sheet = createEmptySheet();
    for (let i = 0; i < 11; i += 1) {
      sheet = crossGreenAt(sheet, i);
    }
    expect(canCross(sheet, "green", 6)).toBe(false);
  });

  it("allows die 6 on the final >6 box", () => {
    let sheet = createEmptySheet();
    for (let i = 0; i < 10; i += 1) {
      sheet = crossGreenAt(sheet, i);
    }
    expect(canCross(sheet, "green", 6)).toBe(true);
    expect(canCross(sheet, "green", 5)).toBe(false);
  });
});

describe("canCross orange", () => {
  it("only permits the leftmost empty slot", () => {
    const sheet = createEmptySheet();
    expect(canCross(sheet, "orange", 6)).toBe(true);
    expect(getCrossTargets(sheet, "orange", 1)).toEqual([{ index: 0 }]);
  });

  it("rejects when a prior slot is skipped", () => {
    let sheet = createEmptySheet();
    sheet = fillOrangeThrough(sheet, 1);
    expect(canCross(sheet, "orange", 4)).toBe(true);
    expect(getCrossTargets(sheet, "orange", 4)).toEqual([{ index: 1 }]);
  });

  it("accepts any pip value 1–6 on the next slot", () => {
    const sheet = createEmptySheet();
    for (const value of [1, 2, 3, 4, 5, 6]) {
      expect(canCross(sheet, "orange", value)).toBe(true);
    }
  });

  it("records multiplied values for scoring", () => {
    const sheet = createEmptySheet();
    expect(orangeRecordedValue(sheet, 6, 6)).toBe(12);
    expect(orangeRecordedValue(sheet, 9, 6)).toBe(18);
  });
});

describe("canCross purple", () => {
  it("allows any value in the first box", () => {
    expect(canCross(createEmptySheet(), "purple", 6)).toBe(true);
    expect(canCross(createEmptySheet(), "purple", 1)).toBe(true);
  });

  it("requires strictly increasing values after the first box", () => {
    let sheet = fillPurpleThrough(createEmptySheet(), [2]);
    expect(canCross(sheet, "purple", 2)).toBe(false);
    expect(canCross(sheet, "purple", 3)).toBe(true);
    expect(getCrossTargets(sheet, "purple", 3)).toEqual([{ index: 1 }]);
  });

  it("resets the chain after a recorded 6 (official rule)", () => {
    let sheet = fillPurpleThrough(createEmptySheet(), [2, 5, 6]);
    expect(canCross(sheet, "purple", 2)).toBe(true);
    expect(canCross(sheet, "purple", 1)).toBe(true);
    expect(getCrossTargets(sheet, "purple", 3)).toEqual([{ index: 3 }]);
  });

  it("rejects equal or lower values when previous was not 6", () => {
    const sheet = fillPurpleThrough(createEmptySheet(), [4]);
    expect(canCross(sheet, "purple", 4)).toBe(false);
    expect(canCross(sheet, "purple", 3)).toBe(false);
    expect(canCross(sheet, "purple", 5)).toBe(true);
  });

  it("matches rulebook sequence 2 < 5 < 6 < 3", () => {
    let sheet = createEmptySheet();
    expect(canCross(sheet, "purple", 2)).toBe(true);
    sheet = fillPurpleThrough(sheet, [2]);
    expect(canCross(sheet, "purple", 5)).toBe(true);
    sheet = fillPurpleThrough(sheet, [2, 5]);
    expect(canCross(sheet, "purple", 6)).toBe(true);
    sheet = fillPurpleThrough(sheet, [2, 5, 6]);
    expect(canCross(sheet, "purple", 3)).toBe(true);
  });
});
