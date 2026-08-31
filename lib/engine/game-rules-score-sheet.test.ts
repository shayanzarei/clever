/**
 * Rule: The score sheet has 5 colored areas. Green, orange, and purple are filled
 * left-to-right in order; yellow and blue accept matching values anywhere. White
 * is wild for yellow/green/orange/purple or pairs with blue for a sum.
 */
import { describe, expect, it } from "vitest";
import { applyOrangeFill, applyPurpleFill, applyYellowCross } from "./apply";
import { canCross, getCrossTargets } from "./legality";
import { dieHasLegalCross } from "./passive";
import { createEmptySheet } from "./sheet";
import type { ColorArea, DieState, Sheet } from "./types";

const COLOR_AREAS: ColorArea[] = ["yellow", "blue", "green", "orange", "purple"];

function crossGreenAt(sheet: Sheet, index: number): Sheet {
  const boxes = sheet.green.boxes.map((box, i) =>
    i === index ? { ...box, crossed: true } : box,
  );
  return { ...sheet, green: { boxes } };
}

function fillOrangeThrough(sheet: Sheet, count: number): Sheet {
  const boxes = sheet.orange.boxes.map((box, index) =>
    index < count ? { ...box, value: 3 * box.multiplier } : box,
  );
  return { ...sheet, orange: { boxes } };
}

function fillPurpleThrough(sheet: Sheet, values: number[]): Sheet {
  const boxes = sheet.purple.boxes.map((box, index) => ({
    ...box,
    value: values[index] ?? box.value,
  }));
  return { ...sheet, purple: { boxes } };
}

function makeDie(
  id: string,
  color: DieState["color"],
  value: DieState["value"],
  location: DieState["location"] = "pool",
): DieState {
  return { id, color, value, location };
}

describe("rule: five colored score areas", () => {
  it("initializes all five color areas on every sheet", () => {
    const sheet = createEmptySheet();
    for (const color of COLOR_AREAS) {
      expect(sheet[color]).toBeDefined();
    }
    expect(sheet.yellow.grid.length).toBeGreaterThan(0);
    expect(sheet.blue.boxes.length).toBeGreaterThan(0);
    expect(sheet.green.boxes.length).toBeGreaterThan(0);
    expect(sheet.orange.boxes.length).toBeGreaterThan(0);
    expect(sheet.purple.boxes.length).toBeGreaterThan(0);
  });
});

describe("rule: yellow and blue accept matching values anywhere", () => {
  it("lets yellow crosses target any open cell with the die value", () => {
    const sheet = createEmptySheet();
    const targets = getCrossTargets(sheet, "yellow", 3);
    expect(targets.length).toBeGreaterThan(1);
    for (const { index } of targets) {
      const row = Math.floor(index / 4);
      const col = index % 4;
      expect(sheet.yellow.grid[row][col].value).toBe(3);
    }
  });

  it("lets blue crosses target any open sum box matching blue + white", () => {
    const sheet = createEmptySheet();
    expect(getCrossTargets(sheet, "blue", 2, 4)).toEqual([{ index: 4 }]);
    expect(getCrossTargets(sheet, "blue", 6, 6)).toEqual([{ index: 10 }]);
  });
});

describe("rule: green, orange, and purple fill left to right", () => {
  it("only allows the next green box from the left", () => {
    let sheet = createEmptySheet();
    expect(getCrossTargets(sheet, "green", 2)).toEqual([{ index: 0 }]);

    sheet = crossGreenAt(sheet, 0);
    expect(getCrossTargets(sheet, "green", 2)).toEqual([{ index: 1 }]);
    expect(canCross(sheet, "green", 1)).toBe(false);
  });

  it("only allows the leftmost empty orange slot", () => {
    let sheet = createEmptySheet();
    expect(getCrossTargets(sheet, "orange", 5)).toEqual([{ index: 0 }]);

    sheet = fillOrangeThrough(sheet, 1);
    expect(getCrossTargets(sheet, "orange", 4)).toEqual([{ index: 1 }]);
  });

  it("only allows the leftmost empty purple slot", () => {
    let sheet = createEmptySheet();
    expect(getCrossTargets(sheet, "purple", 2)).toEqual([{ index: 0 }]);

    sheet = fillPurpleThrough(sheet, [2]);
    expect(getCrossTargets(sheet, "purple", 4)).toEqual([{ index: 1 }]);
    expect(canCross(sheet, "purple", 2)).toBe(false);
  });
});

describe("rule: one mark per die action", () => {
  it("marks exactly one yellow cell per cross", () => {
    const sheet = createEmptySheet();
    const before = sheet.yellow.grid.flat().filter((cell) => cell.crossed).length;
    const result = applyYellowCross(sheet, 0);
    const after = result.sheet.yellow.grid.flat().filter((cell) => cell.crossed).length;
    expect(after - before).toBe(1);
  });

  it("writes exactly one orange number per fill", () => {
    const sheet = createEmptySheet();
    const result = applyOrangeFill(sheet, 0, 5);
    expect(result.sheet.orange.boxes[0].value).toBe(5);
    expect(result.sheet.orange.boxes[1].value).toBeNull();
  });

  it("writes exactly one purple number per fill", () => {
    const sheet = createEmptySheet();
    const result = applyPurpleFill(sheet, 0, 4);
    expect(result.sheet.purple.boxes[0].value).toBe(4);
    expect(result.sheet.purple.boxes[1].value).toBeNull();
  });
});

describe("rule: white die is wild", () => {
  const dice: DieState[] = [
    makeDie("die-white", "white", 3, "slot"),
    makeDie("die-blue", "blue", 4, "pool"),
  ];

  it("can be used as yellow, green, orange, or purple by face value", () => {
    const sheet = createEmptySheet();
    expect(dieHasLegalCross(sheet, dice, "die-white")).toBe(true);
    expect(canCross(sheet, "yellow", 3)).toBe(true);
    expect(canCross(sheet, "green", 3)).toBe(true);
    expect(canCross(sheet, "orange", 3)).toBe(true);
    expect(canCross(sheet, "purple", 3)).toBe(true);
  });

  it("can pair with the blue die to mark a blue sum", () => {
    const sheet = createEmptySheet();
    expect(canCross(sheet, "blue", 4, 3)).toBe(true);
    expect(dieHasLegalCross(sheet, dice, "die-white")).toBe(true);
  });
});
