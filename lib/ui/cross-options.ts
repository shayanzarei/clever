import { resolveBlueWhiteValues } from "@/lib/engine/blue";
import { getDie } from "@/lib/engine/dice";
import { getCrossTargets } from "@/lib/engine/legality";
import { nextGreenIndex } from "@/lib/engine/sheet";
import type {
  Action,
  ColorArea,
  DieValue,
  Game,
  Sheet,
} from "@/lib/engine/types";

export type SheetCrossOption = {
  color: ColorArea;
  value: number;
  targetIndex: number;
  blueDie?: DieValue;
  whiteDie?: DieValue;
};

function pendingCrossOptions(
  game: Game,
  playerId: string,
  sheet: Sheet,
): SheetCrossOption[] {
  const head = game.pending[0];
  if (!head || game.pendingPlayerId !== playerId) {
    return [];
  }

  const options: SheetCrossOption[] = [];

  if (head.type === "cross_yellow_free" || head.type === "round_black_x") {
    sheet.yellow.grid.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (!cell.crossed) {
          options.push({
            color: "yellow",
            value: cell.value,
            targetIndex: rowIndex * row.length + colIndex,
          });
        }
      });
    });
  }

  if (
    head.type === "cross_blue_free" ||
    head.type === "round_black_x"
  ) {
    const live = resolveBlueWhiteValues(game.dice);
    if (live) {
      for (const target of getCrossTargets(
        sheet,
        "blue",
        live.blue,
        live.white,
      )) {
        options.push({
          color: "blue",
          value: live.blue + live.white,
          targetIndex: target.index,
          blueDie: live.blue,
          whiteDie: live.white,
        });
      }
    }
  }

  if (head.type === "round_black_x") {
    const next = nextGreenIndex(sheet);
    if (next !== null) {
      options.push({
        color: "green",
        value: sheet.green.boxes[next].threshold,
        targetIndex: next,
      });
    }
  }

  if (head.type === "round_black_six") {
    const purpleNext = sheet.purple.boxes.findIndex((box) => box.value === null);
    if (purpleNext >= 0) {
      options.push({ color: "purple", value: 6, targetIndex: purpleNext });
    }
    const orangeNext = sheet.orange.boxes.findIndex((box) => box.value === null);
    if (orangeNext >= 0) {
      options.push({ color: "orange", value: 6, targetIndex: orangeNext });
    }
  }

  return options;
}

function chosenDieCrossOptions(
  game: Game,
  sheet: Sheet,
  dieId: string,
): SheetCrossOption[] {
  const die = getDie(game.dice, dieId);
  if (!die) {
    return [];
  }

  const options: SheetCrossOption[] = [];
  const colors: ColorArea[] =
    die.color === "white"
      ? ["yellow", "blue", "green", "orange", "purple"]
      : die.color === "blue"
        ? ["blue"]
        : ([die.color] as ColorArea[]);

  for (const color of colors) {
    if (color === "blue") {
      const live = resolveBlueWhiteValues(game.dice);
      if (!live) {
        continue;
      }
      for (const target of getCrossTargets(
        sheet,
        "blue",
        live.blue,
        live.white,
      )) {
        options.push({
          color: "blue",
          value: live.blue + live.white,
          targetIndex: target.index,
          blueDie: live.blue,
          whiteDie: live.white,
        });
      }
      continue;
    }

    for (const target of getCrossTargets(sheet, color, die.value)) {
      options.push({
        color,
        value: die.value,
        targetIndex: target.index,
      });
    }
  }

  return options;
}

export function getSheetCrossOptions(
  game: Game,
  playerId: string,
): SheetCrossOption[] {
  if (game.pending.length > 0 && game.pendingPlayerId === playerId) {
    const player = game.players.find((entry) => entry.id === playerId);
    if (!player) {
      return [];
    }
    return pendingCrossOptions(game, playerId, player.sheet);
  }

  const player = game.players.find((entry) => entry.id === playerId);
  if (!player) {
    return [];
  }

  if (game.awaitingCross?.playerId === playerId) {
    const dieId =
      game.awaitingCross.extraDieId ??
      game.dice.find(
        (die) =>
          die.location === "slot" &&
          die.slotIndex === game.awaitingCross?.slotIndex,
      )?.id;
    if (dieId) {
      return chosenDieCrossOptions(game, player.sheet, dieId);
    }
  }

  if (player.passiveDieId) {
    return chosenDieCrossOptions(game, player.sheet, player.passiveDieId);
  }

  return [];
}

/**
 * A die can only ever offer one option per box, so the die face is deliberately
 * left out of the key: the sheet knows the box it draws, not the roll.
 */
export function crossOptionKey(
  option: Pick<SheetCrossOption, "color" | "targetIndex">,
): string {
  return `${option.color}:${option.targetIndex}`;
}

export function crossActionFromOption(
  playerId: string,
  option: SheetCrossOption,
): Extract<Action, { type: "CROSS" }> {
  if (option.color === "blue") {
    return {
      type: "CROSS",
      playerId,
      color: "blue",
      blueDie: option.blueDie!,
      whiteDie: option.whiteDie!,
      targetIndex: option.targetIndex,
    };
  }

  return {
    type: "CROSS",
    playerId,
    color: option.color,
    value: option.value,
    targetIndex: option.targetIndex,
  };
}
