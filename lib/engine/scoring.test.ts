import { describe, expect, it } from "vitest";
import {
  BLUE_SCORE_BY_MARKS,
  GREEN_SCORES,
  YELLOW_COLUMN_SCORES,
} from "./constants";
import { createEmptySheet } from "./sheet";
import {
  colorScores,
  scoreBlue,
  scoreFoxes,
  scoreGreen,
  scoreOrange,
  scorePurple,
  scoreYellow,
} from "./scoring";
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

function crossYellowColumn(sheet: Sheet, column: number): Sheet {
  let next = sheet;
  for (let row = 0; row < 4; row += 1) {
    next = crossYellow(next, row * 4 + column);
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
  const boxes = sheet.green.boxes.map((box, index) => ({
    ...box,
    crossed: index <= lastIndex,
  }));
  return { ...sheet, green: { boxes } };
}

function fillOrange(sheet: Sheet, values: number[]): Sheet {
  const boxes = sheet.orange.boxes.map((box, index) => ({
    ...box,
    value: values[index] ?? box.value,
  }));
  return { ...sheet, orange: { boxes } };
}

function fillPurple(sheet: Sheet, values: number[]): Sheet {
  const boxes = sheet.purple.boxes.map((box, index) => ({
    ...box,
    value: values[index] ?? box.value,
  }));
  return { ...sheet, purple: { boxes } };
}

describe("scoreYellow", () => {
  it("scores 0 on an empty sheet", () => {
    expect(scoreYellow(createEmptySheet())).toBe(0);
  });

  it.each([
    [0, 10],
    [1, 14],
    [2, 16],
    [3, 20],
  ] as const)("awards column %i points (%i)", (column, points) => {
    const sheet = crossYellowColumn(createEmptySheet(), column);
    expect(scoreYellow(sheet)).toBe(points);
    expect(YELLOW_COLUMN_SCORES[column]).toBe(points);
  });

  it("sums multiple completed columns", () => {
    let sheet = createEmptySheet();
    sheet = crossYellowColumn(sheet, 0);
    sheet = crossYellowColumn(sheet, 3);
    expect(scoreYellow(sheet)).toBe(10 + 20);
  });

  it("ignores partial columns", () => {
    const sheet = crossYellow(createEmptySheet(), 0);
    expect(scoreYellow(sheet)).toBe(0);
  });
});

describe("scoreBlue", () => {
  it.each(BLUE_SCORE_BY_MARKS.map((points, marks) => [marks, points] as const))(
    "%i marks → %i points",
    (marks, points) => {
      expect(scoreBlue(crossBlueCount(createEmptySheet(), marks))).toBe(points);
    },
  );

  it("matches rulebook examples (4 marks = 7, 9 marks = 37)", () => {
    expect(scoreBlue(crossBlueCount(createEmptySheet(), 4))).toBe(7);
    expect(scoreBlue(crossBlueCount(createEmptySheet(), 9))).toBe(37);
  });
});

describe("scoreGreen", () => {
  it("scores 0 with no crosses", () => {
    expect(scoreGreen(createEmptySheet())).toBe(0);
  });

  it.each(GREEN_SCORES.map((points, index) => [index, points] as const))(
    "rightmost cross at index %i → %i points",
    (index, points) => {
      expect(scoreGreen(crossGreenThrough(createEmptySheet(), index))).toBe(
        points,
      );
    },
  );

  it("matches rulebook example (5th box = 15 points)", () => {
    expect(scoreGreen(crossGreenThrough(createEmptySheet(), 4))).toBe(15);
  });
});

describe("scoreOrange", () => {
  it("scores 0 on an empty row", () => {
    expect(scoreOrange(createEmptySheet())).toBe(0);
  });

  it("sums recorded values including multipliers", () => {
    // Rulebook example: 5 + 2 + 3 + 12 = 22 (12 from 6 on ×2)
    const sheet = fillOrange(createEmptySheet(), [5, 2, 3, 12]);
    expect(scoreOrange(sheet)).toBe(22);
  });

  it("includes ×3 slot values", () => {
    const sheet = fillOrange(createEmptySheet(), [4, 8, 8, 8, 18]);
    expect(scoreOrange(sheet)).toBe(46);
  });
});

describe("scorePurple", () => {
  it("scores 0 on an empty row", () => {
    expect(scorePurple(createEmptySheet())).toBe(0);
  });

  it("matches rulebook example (2+5+6+3 = 16)", () => {
    const sheet = fillPurple(createEmptySheet(), [2, 5, 6, 3]);
    expect(scorePurple(sheet)).toBe(16);
  });
});

describe("scoreFoxes", () => {
  it("scores 0 with no foxes", () => {
    const sheet = { ...createEmptySheet(), foxes: 3 };
    expect(scoreFoxes(sheet)).toBe(0);
  });

  it("multiplies fox count by the lowest color score", () => {
    let sheet = createEmptySheet();
    sheet = crossYellowColumn(sheet, 0); // yellow = 10
    sheet = crossBlueCount(sheet, 6); // blue = 16
    sheet = crossGreenThrough(sheet, 0); // green = 1 ← floor
    sheet = fillOrange(sheet, [2]); // orange = 2
    sheet = fillPurple(sheet, [3]); // purple = 3
    sheet = { ...sheet, foxes: 2 };
    expect(scoreFoxes(sheet)).toBe(2);
    expect(Math.min(...Object.values(colorScores(sheet)))).toBe(1);
  });

  it("scores 0 when any color is still at 0", () => {
    let sheet = crossYellowColumn(createEmptySheet(), 0);
    sheet = { ...sheet, foxes: 4 };
    expect(scoreFoxes(sheet)).toBe(0);
  });

  it("matches rulebook example (orange floor 5, 2 foxes → 10)", () => {
    let sheet = createEmptySheet();
    sheet = crossYellowColumn(sheet, 1); // yellow = 14
    sheet = crossBlueCount(sheet, 4); // blue = 7
    sheet = crossGreenThrough(sheet, 2); // green = 6
    sheet = fillOrange(sheet, [5]); // orange = 5 ← floor
    sheet = fillPurple(sheet, [6]); // purple = 6
    sheet = { ...sheet, foxes: 2 };
    expect(scoreFoxes(sheet)).toBe(10);
    expect(Math.min(...Object.values(colorScores(sheet)))).toBe(5);
  });
});
