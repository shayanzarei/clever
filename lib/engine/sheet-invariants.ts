import { YELLOW_PREPRINTED_INDICES, YELLOW_COLS, YELLOW_ROWS } from "./constants";
import {
  countCrossedBlue,
  nextOrangeIndex,
  nextPurpleIndex,
  rightmostGreenIndex,
} from "./sheet";
import { plusOneActionsRemaining } from "./sheet-actions";
import type { Sheet } from "./types";

function invariantFailure(message: string, sheet: Sheet): never {
  throw new Error(`Sheet invariant violated: ${message}\n${JSON.stringify(sheet)}`);
}

/** Dev/test-only: throws when sheet representation invariants are broken. */
export function assertSheetInvariants(sheet: Sheet): void {
  const greenMarked = sheet.green.boxes.filter((box) => box.crossed).length;
  const rightmostGreen = rightmostGreenIndex(sheet);
  if (rightmostGreen < 0) {
    if (greenMarked !== 0) {
      invariantFailure(
        `green mark count ${greenMarked} must be 0 when no green box is crossed`,
        sheet,
      );
    }
  } else if (greenMarked !== rightmostGreen + 1) {
    invariantFailure(
      `green mark count ${greenMarked} must equal rightmost index + 1 (${rightmostGreen + 1})`,
      sheet,
    );
  } else {
    for (let index = 0; index <= rightmostGreen; index += 1) {
      if (!sheet.green.boxes[index]?.crossed) {
        invariantFailure(`green box ${index} must be crossed (gap before ${rightmostGreen})`, sheet);
      }
    }
  }

  const orangeWritten = sheet.orange.boxes.filter((box) => box.value !== null).length;
  const orangeNext = nextOrangeIndex(sheet);
  const expectedOrangeWritten =
    orangeNext === null ? sheet.orange.boxes.length : orangeNext;
  if (orangeWritten !== expectedOrangeWritten) {
    invariantFailure(
      `orange written count ${orangeWritten} must equal next orange index ${expectedOrangeWritten}`,
      sheet,
    );
  }

  const purpleWritten = sheet.purple.boxes.filter((box) => box.value !== null).length;
  const purpleNext = nextPurpleIndex(sheet);
  const expectedPurpleWritten =
    purpleNext === null ? sheet.purple.boxes.length : purpleNext;
  if (purpleWritten !== expectedPurpleWritten) {
    invariantFailure(
      `purple written count ${purpleWritten} must equal next purple index ${expectedPurpleWritten}`,
      sheet,
    );
  }

  let previousPurple: number | null = null;
  for (const box of sheet.purple.boxes) {
    if (box.value === null) {
      break;
    }
    if (
      previousPurple !== null &&
      !(box.value > previousPurple || previousPurple === 6)
    ) {
      invariantFailure(
        `purple value ${box.value} must be > ${previousPurple} unless previous is 6`,
        sheet,
      );
    }
    previousPurple = box.value;
  }

  const crossedSums = new Set(
    sheet.blue.boxes.filter((box) => box.crossed).map((box) => box.sum),
  );
  const blueMarked = countCrossedBlue(sheet);
  if (crossedSums.size !== blueMarked) {
    invariantFailure(
      `blue marked count ${blueMarked} must equal unique crossed sums ${crossedSums.size}`,
      sheet,
    );
  }

  for (let row = 0; row < YELLOW_ROWS; row += 1) {
    for (let column = 0; column < YELLOW_COLS; column += 1) {
      const flatIndex = row * YELLOW_COLS + column;
      const cell = sheet.yellow.grid[row]?.[column];
      if (!cell) {
        invariantFailure(`missing yellow cell at ${flatIndex}`, sheet);
      }
      const isPreprinted = YELLOW_PREPRINTED_INDICES.includes(
        flatIndex as (typeof YELLOW_PREPRINTED_INDICES)[number],
      );
      if (isPreprinted) {
        if (!cell.preprinted || !cell.crossed) {
          invariantFailure(
            `pre-printed yellow cell ${flatIndex} must stay crossed and preprinted`,
            sheet,
          );
        }
      } else if (cell.preprinted) {
        invariantFailure(
          `numbered yellow cell ${flatIndex} must not be marked pre-printed`,
          sheet,
        );
      }
    }
  }

  if (sheet.foxes < 0) {
    invariantFailure(`foxes ${sheet.foxes} must be >= 0`, sheet);
  }
  if (sheet.rerollsEarned < 0) {
    invariantFailure(`rerollsEarned ${sheet.rerollsEarned} must be >= 0`, sheet);
  }
  if (sheet.plusOnesEarned < 0) {
    invariantFailure(`plusOnesEarned ${sheet.plusOnesEarned} must be >= 0`, sheet);
  }
  if (sheet.rerolls > sheet.rerollsEarned) {
    invariantFailure(
      `rerolls remaining ${sheet.rerolls} must be <= rerollsEarned ${sheet.rerollsEarned}`,
      sheet,
    );
  }
  if (sheet.plusOnes > sheet.plusOnesEarned) {
    invariantFailure(
      `plusOnes remaining ${sheet.plusOnes} must be <= plusOnesEarned ${sheet.plusOnesEarned}`,
      sheet,
    );
  }
  if (plusOneActionsRemaining(sheet) > sheet.plusOnesEarned) {
    invariantFailure(
      `plus-one actions remaining ${plusOneActionsRemaining(sheet)} must be <= plusOnesEarned ${sheet.plusOnesEarned}`,
      sheet,
    );
  }
}
