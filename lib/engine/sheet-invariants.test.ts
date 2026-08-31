import { describe, expect, it } from "vitest";
import { createEmptySheet } from "./sheet";
import { assertSheetInvariants } from "./sheet-invariants";
import type { Sheet } from "./types";

describe("assertSheetInvariants", () => {
  it("accepts an empty sheet", () => {
    expect(() => assertSheetInvariants(createEmptySheet())).not.toThrow();
  });

  it("rejects a gap in green marks", () => {
    const sheet: Sheet = {
      ...createEmptySheet(),
      green: {
        boxes: createEmptySheet().green.boxes.map((box, index) => ({
          ...box,
          crossed: index === 2,
        })),
      },
    };

    expect(() => assertSheetInvariants(sheet)).toThrow(
      /green mark count 1 must equal rightmost index \+ 1 \(3\)/,
    );
  });

  it("rejects duplicate blue sum marks", () => {
    const base = createEmptySheet();
    const sheet: Sheet = {
      ...base,
      blue: {
        boxes: [
          { sum: 5, crossed: true },
          { sum: 5, crossed: true },
          ...base.blue.boxes.slice(2),
        ],
      },
    };

    expect(() => assertSheetInvariants(sheet)).toThrow(
      /blue marked count 2 must equal unique crossed sums 1/,
    );
  });

  it("rejects spent actions exceeding earned totals", () => {
    const sheet: Sheet = {
      ...createEmptySheet(),
      rerolls: 2,
      rerollsEarned: 1,
    };

    expect(() => assertSheetInvariants(sheet)).toThrow(
      /rerolls remaining 2 must be <= rerollsEarned 1/,
    );
  });
});
