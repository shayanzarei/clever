import {
  BLUE_COLUMN_BONUSES,
  BLUE_COLUMNS,
  BLUE_ROW_BONUSES,
  BLUE_ROWS,
  GREEN_SLOT_BONUSES,
  ORANGE_SLOT_BONUSES,
  PURPLE_SLOT_BONUSES,
  YELLOW_DIAGONAL_BONUS,
  YELLOW_DIAGONAL_CELLS,
  YELLOW_ROW_BONUSES,
} from "./bonuses";
import { computeBlueSum, orangeRecordedValue } from "./legality";
import {
  isYellowColumnComplete,
  nextGreenIndex,
  nextOrangeIndex,
  nextPurpleIndex,
} from "./sheet";
import { grantPlusOne, grantReroll } from "./sheet-actions";
import type { DieValue, Effect, Sheet } from "./types";

export type ApplyEvent =
  | { kind: "yellow_cross"; index: number }
  | { kind: "blue_cross"; index: number }
  | { kind: "green_cross"; index: number; bonus?: boolean }
  | { kind: "orange_fill"; index: number }
  | { kind: "purple_fill"; index: number };

export type ApplyResult = {
  sheet: Sheet;
  event: ApplyEvent;
  triggered: Effect[];
};

function yellowRowOf(flatIndex: number): number {
  return Math.floor(flatIndex / 4);
}

function yellowColOf(flatIndex: number): number {
  return flatIndex % 4;
}

function isYellowRowComplete(sheet: Sheet, row: number): boolean {
  for (let col = 0; col < 4; col += 1) {
    if (!sheet.yellow.grid[row][col].crossed) {
      return false;
    }
  }
  return true;
}

function isYellowDiagonalComplete(sheet: Sheet): boolean {
  return YELLOW_DIAGONAL_CELLS.every((index) => {
    const row = Math.floor(index / 4);
    const col = index % 4;
    return sheet.yellow.grid[row][col].crossed;
  });
}

function isBlueGroupComplete(
  sheet: Sheet,
  indices: readonly number[],
): boolean {
  return indices.every((index) => sheet.blue.boxes[index].crossed);
}

function markYellowColumnScored(sheet: Sheet, column: number): Sheet {
  if (!isYellowColumnComplete(sheet, column)) {
    return sheet;
  }
  const columnScored = [...sheet.yellow.columnScored];
  columnScored[column] = true;
  return { ...sheet, yellow: { ...sheet.yellow, columnScored } };
}

export function detectBonuses(sheet: Sheet, event: ApplyEvent): Effect[] {
  const triggered: Effect[] = [];

  switch (event.kind) {
    case "yellow_cross": {
      const row = yellowRowOf(event.index);
      if (isYellowRowComplete(sheet, row) && !sheet.claims.yellowRows[row]) {
        triggered.push(YELLOW_ROW_BONUSES[row]);
      }
      if (isYellowDiagonalComplete(sheet) && !sheet.claims.yellowDiagonal) {
        triggered.push(YELLOW_DIAGONAL_BONUS);
      }
      break;
    }
    case "blue_cross": {
      for (let row = 0; row < BLUE_ROWS.length; row += 1) {
        if (
          (BLUE_ROWS[row] as readonly number[]).includes(event.index) &&
          isBlueGroupComplete(sheet, BLUE_ROWS[row]) &&
          !sheet.claims.blueRows[row]
        ) {
          triggered.push(BLUE_ROW_BONUSES[row]);
        }
      }
      for (let col = 0; col < BLUE_COLUMNS.length; col += 1) {
        if (
          (BLUE_COLUMNS[col] as readonly number[]).includes(event.index) &&
          isBlueGroupComplete(sheet, BLUE_COLUMNS[col]) &&
          !sheet.claims.blueColumns[col]
        ) {
          triggered.push(BLUE_COLUMN_BONUSES[col]);
        }
      }
      break;
    }
    case "green_cross": {
      const bonus = GREEN_SLOT_BONUSES[event.index];
      if (bonus) {
        triggered.push(bonus);
      }
      break;
    }
    case "orange_fill": {
      const bonus = ORANGE_SLOT_BONUSES[event.index];
      if (bonus) {
        triggered.push(bonus);
      }
      break;
    }
    case "purple_fill": {
      const bonus = PURPLE_SLOT_BONUSES[event.index];
      if (bonus) {
        triggered.push(bonus);
      }
      break;
    }
    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }

  return triggered;
}

export function claimLineBonuses(sheet: Sheet, event: ApplyEvent): Sheet {
  let next = sheet;

  if (event.kind === "yellow_cross") {
    const row = yellowRowOf(event.index);
    if (isYellowRowComplete(next, row) && !next.claims.yellowRows[row]) {
      const yellowRows = [...next.claims.yellowRows];
      yellowRows[row] = true;
      next = { ...next, claims: { ...next.claims, yellowRows } };
    }
    if (isYellowDiagonalComplete(next) && !next.claims.yellowDiagonal) {
      next = {
        ...next,
        claims: { ...next.claims, yellowDiagonal: true },
      };
    }
    const col = yellowColOf(event.index);
    next = markYellowColumnScored(next, col);
    return next;
  }

  if (event.kind === "blue_cross") {
    const blueRows = [...next.claims.blueRows];
    const blueColumns = [...next.claims.blueColumns];
    for (let row = 0; row < BLUE_ROWS.length; row += 1) {
      if (
        (BLUE_ROWS[row] as readonly number[]).includes(event.index) &&
        isBlueGroupComplete(next, BLUE_ROWS[row])
      ) {
        blueRows[row] = true;
      }
    }
    for (let col = 0; col < BLUE_COLUMNS.length; col += 1) {
      if (
        (BLUE_COLUMNS[col] as readonly number[]).includes(event.index) &&
        isBlueGroupComplete(next, BLUE_COLUMNS[col])
      ) {
        blueColumns[col] = true;
      }
    }
    return {
      ...next,
      claims: { ...next.claims, blueRows, blueColumns },
    };
  }

  return next;
}

export function applyYellowCross(
  sheet: Sheet,
  flatIndex: number,
): ApplyResult {
  const row = Math.floor(flatIndex / 4);
  const col = flatIndex % 4;
  const grid = sheet.yellow.grid.map((gridRow, rowIndex) =>
    gridRow.map((cell, colIndex) =>
      rowIndex === row && colIndex === col
        ? { ...cell, crossed: true }
        : cell,
    ),
  );
  let next: Sheet = { ...sheet, yellow: { ...sheet.yellow, grid } };
  const triggered = detectBonuses(next, {
    kind: "yellow_cross",
    index: flatIndex,
  });
  next = claimLineBonuses(next, { kind: "yellow_cross", index: flatIndex });
  return {
    sheet: next,
    event: { kind: "yellow_cross", index: flatIndex },
    triggered,
  };
}

export function applyBlueCross(sheet: Sheet, index: number): ApplyResult {
  const boxes = sheet.blue.boxes.map((box, boxIndex) =>
    boxIndex === index ? { ...box, crossed: true } : box,
  );
  let next: Sheet = { ...sheet, blue: { boxes } };
  const triggered = detectBonuses(next, { kind: "blue_cross", index });
  next = claimLineBonuses(next, { kind: "blue_cross", index });
  return {
    sheet: next,
    event: { kind: "blue_cross", index },
    triggered,
  };
}

export function applyGreenCross(
  sheet: Sheet,
  index: number,
  options: { bonus?: boolean } = {},
): ApplyResult {
  const boxes = sheet.green.boxes.map((box, boxIndex) =>
    boxIndex === index ? { ...box, crossed: true } : box,
  );
  const next: Sheet = { ...sheet, green: { boxes } };
  const event: ApplyEvent = {
    kind: "green_cross",
    index,
    bonus: options.bonus,
  };
  const triggered = detectBonuses(next, event);
  return { sheet: next, event, triggered };
}

export function applyOrangeFill(
  sheet: Sheet,
  index: number,
  dieValue: DieValue,
): ApplyResult {
  const boxes = sheet.orange.boxes.map((box, boxIndex) =>
    boxIndex === index
      ? { ...box, value: orangeRecordedValue(sheet, index, dieValue) }
      : box,
  );
  const next: Sheet = { ...sheet, orange: { boxes } };
  const event: ApplyEvent = { kind: "orange_fill", index };
  const triggered = detectBonuses(next, event);
  return { sheet: next, event, triggered };
}

export function applyPurpleFill(
  sheet: Sheet,
  index: number,
  value: DieValue,
): ApplyResult {
  const boxes = sheet.purple.boxes.map((box, boxIndex) =>
    boxIndex === index ? { ...box, value } : box,
  );
  const next: Sheet = { ...sheet, purple: { boxes } };
  const event: ApplyEvent = { kind: "purple_fill", index };
  const triggered = detectBonuses(next, event);
  return { sheet: next, event, triggered };
}

export function applyGreenBonusCross(sheet: Sheet): ApplyResult | null {
  const index = nextGreenIndex(sheet);
  if (index === null) {
    return null;
  }
  return applyGreenCross(sheet, index, { bonus: true });
}

export function applyOrangeBonusFill(
  sheet: Sheet,
  value: DieValue,
): ApplyResult | null {
  const index = nextOrangeIndex(sheet);
  if (index === null) {
    return null;
  }
  return applyOrangeFill(sheet, index, value);
}

export function applyPurpleBonusFill(
  sheet: Sheet,
  value: DieValue,
): ApplyResult | null {
  const index = nextPurpleIndex(sheet);
  if (index === null) {
    return null;
  }
  return applyPurpleFill(sheet, index, value);
}

export function applyBlueCrossBySum(
  sheet: Sheet,
  blueDie: DieValue,
  whiteDie: DieValue,
  targetIndex?: number,
): ApplyResult | null {
  const sum = computeBlueSum(blueDie, whiteDie);
  const index =
    targetIndex ??
    sheet.blue.boxes.findIndex((box) => !box.crossed && box.sum === sum);
  if (index < 0 || sheet.blue.boxes[index].sum !== sum) {
    return null;
  }
  return applyBlueCross(sheet, index);
}

export function applyPassiveBonus(sheet: Sheet, effect: Effect): Sheet | null {
  switch (effect.type) {
    case "fox":
      return { ...sheet, foxes: sheet.foxes + 1 };
    case "reroll":
      return grantReroll(sheet);
    case "plus_one":
      return grantPlusOne(sheet);
    default:
      return null;
  }
}
