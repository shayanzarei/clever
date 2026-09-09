import {
  BLUE_SUMS,
  GREEN_THRESHOLDS,
  ORANGE_MULTIPLIERS,
  TRACK_LENGTH,
  YELLOW_COLS,
  YELLOW_COLUMN_SCORES,
  YELLOW_GRID_LAYOUT,
  YELLOW_ROWS,
} from "./constants";
import type { Sheet } from "./types";

export function createEmptySheet(): Sheet {
  return {
    yellow: {
      grid: YELLOW_GRID_LAYOUT.map((row) =>
        row.map((cell) =>
          cell === "x"
            ? { value: 0, crossed: true, preprinted: true }
            : { value: cell, crossed: false },
        ),
      ),
      columnScored: Array.from({ length: YELLOW_COLS }, () => false),
    },
    blue: {
      boxes: BLUE_SUMS.map((sum) => ({ sum, crossed: false })),
    },
    green: {
      boxes: GREEN_THRESHOLDS.map((threshold) => ({
        threshold,
        crossed: false,
      })),
    },
    orange: {
      boxes: ORANGE_MULTIPLIERS.map((multiplier) => ({
        multiplier,
        value: null,
      })),
    },
    purple: {
      boxes: Array.from({ length: TRACK_LENGTH }, () => ({ value: null })),
    },
    foxes: 0,
    plusOnes: 0,
    plusOnesEarned: 0,
    rerolls: 0,
    rerollsEarned: 0,
    extraDice: 0,
    claims: {
      yellowRows: [false, false, false, false],
      yellowDiagonal: false,
      blueRows: [false, false, false],
      blueColumns: [false, false, false, false],
    },
  };
}

/** Flat index helpers for the 4×4 yellow grid (row-major). */
export function yellowCellCount(): number {
  return YELLOW_ROWS * YELLOW_COLS;
}

export function yellowColumnScore(column: number): number {
  return YELLOW_COLUMN_SCORES[column] ?? 0;
}

export function isYellowColumnComplete(sheet: Sheet, column: number): boolean {
  for (let row = 0; row < YELLOW_ROWS; row += 1) {
    if (!sheet.yellow.grid[row][column].crossed) {
      return false;
    }
  }
  return true;
}

export function nextGreenIndex(sheet: Sheet): number | null {
  const index = sheet.green.boxes.findIndex((box) => !box.crossed);
  return index === -1 ? null : index;
}

export function nextOrangeIndex(sheet: Sheet): number | null {
  const index = sheet.orange.boxes.findIndex((box) => box.value === null);
  return index === -1 ? null : index;
}

export function nextPurpleIndex(sheet: Sheet): number | null {
  const index = sheet.purple.boxes.findIndex((box) => box.value === null);
  return index === -1 ? null : index;
}

export function lastPurpleValue(sheet: Sheet): number | null {
  let last: number | null = null;
  for (const box of sheet.purple.boxes) {
    if (box.value === null) {
      break;
    }
    last = box.value;
  }
  return last;
}

export function countCrossedBlue(sheet: Sheet): number {
  return sheet.blue.boxes.filter((box) => box.crossed).length;
}

export function rightmostGreenIndex(sheet: Sheet): number {
  let last = -1;
  sheet.green.boxes.forEach((box, index) => {
    if (box.crossed) {
      last = index;
    }
  });
  return last;
}
