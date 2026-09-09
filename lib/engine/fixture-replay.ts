import { resolveBlueWhiteValues } from "./blue";
import { poolDice } from "./dice";
import { choiceBonusHasTargets, processAutoChain } from "./effects";
import { reduce } from "./reduce";
import { assertSheetInvariants } from "./sheet-invariants";
import { activePlayerId, playersActingNow } from "./turn";
import type {
  Action,
  ColorArea,
  DieFace,
  DieValue,
  Effect,
  Game,
  Sheet,
} from "./types";

export type FixtureRoll = Partial<
  Record<"yellow" | "blue" | "green" | "orange" | "purple" | "white", number>
>;

export type FixtureBonusChoice =
  | {
      effect: "yellowX";
      target: [number, number];
      cellValue?: number;
    }
  | {
      effect: "blueX";
      target: number;
    }
  | {
      effect: "greenX";
      target: number;
    }
  | {
      effect: "orange";
      target: number;
      value: number;
    }
  | {
      effect: "purple";
      target: number;
      value: number;
    }
  | {
      effect: "discarded";
      target: null;
      note?: string;
    };

export type FixturePick = {
  pick: number;
  roll: FixtureRoll;
  chosen: { color: string; value: number } | null;
  placed: { area: string; detail: number | [number, number] | null } | null;
  reason?: string;
  bonusChoices?: FixtureBonusChoice[];
};

export type FixturePassive = {
  player: number;
  source: "platter" | "activePad";
  chosen: { color: string; value: number };
  placed: { area: string; detail: number | [number, number] | null };
  bonusChoices?: FixtureBonusChoice[];
};

export type FixtureTurn = {
  event: "turn";
  round: number;
  activePlayer: number;
  picks: FixturePick[];
  passive: FixturePassive[];
};

export type FixtureRoundStart = {
  event: "roundStart";
  round: number;
  bonusApplied: {
    player: number;
    bonus: string;
    area?: string;
    bonusChoices?: FixtureBonusChoice[];
  }[];
};

export type FixtureExpectedPlayer = {
  player: number;
  yellowGrid: boolean[][];
  blue: number[];
  green: number;
  orange: number[];
  purple: number[];
  foxes: number;
  rerollsUnlocked: number;
  plusOneUnlocked: number;
  areaScores: Record<ColorArea, number>;
  foxScore: number;
  total: number;
};

export type FixtureFile = {
  seed: number;
  players: number;
  rounds: number;
  transcript: (FixtureRoundStart | FixtureTurn)[];
  expected: FixtureExpectedPlayer[];
};

const CHOICE_BONUS_EFFECTS = new Set(["yellowX", "blueX", "discarded"]);

export function playerId(index: number): string {
  return `p${index + 1}`;
}

/** Non-empty bonusChoices arrays across the transcript (picks, passives, round-4 freeX). */
export function countRecordedBonusChoiceEvents(fixture: FixtureFile): number {
  let count = 0;
  for (const entry of fixture.transcript) {
    if (entry.event === "roundStart") {
      for (const bonus of entry.bonusApplied) {
        if ((bonus.bonusChoices ?? []).length > 0) {
          count += 1;
        }
      }
      continue;
    }
    for (const pick of entry.picks) {
      if ((pick.bonusChoices ?? []).length > 0) {
        count += 1;
      }
    }
    for (const passive of entry.passive) {
      if ((passive.bonusChoices ?? []).length > 0) {
        count += 1;
      }
    }
  }
  return count;
}

function assertAndReduce(game: Game, action: Action): Game {
  const next = reduce(game, action);
  for (const player of next.players) {
    assertSheetInvariants(player.sheet);
  }
  return next;
}

function rollFaces(roll: FixtureRoll): DieFace[] {
  const order = [
    "yellow",
    "blue",
    "green",
    "orange",
    "purple",
    "white",
  ] as const;
  return order
    .filter((color) => roll[color] !== undefined)
    .map((color) => ({
      color,
      value: roll[color]! as DieValue,
    }));
}

function firstOpenSlot(game: Game, playerIdValue: string): number {
  const player = game.players.find((entry) => entry.id === playerIdValue)!;
  const index = player.diceSlots.findIndex((slot) => slot === null);
  if (index < 0) {
    throw new Error(`No open die slot for ${playerIdValue}`);
  }
  return index;
}

function playerSheet(game: Game, playerIdValue: string): Sheet {
  return game.players.find((entry) => entry.id === playerIdValue)!.sheet;
}

function updatePlayerSheet(
  game: Game,
  playerIdValue: string,
  sheet: Sheet,
): Game {
  return {
    ...game,
    players: game.players.map((player) =>
      player.id === playerIdValue ? { ...player, sheet } : player,
    ),
  };
}

function pendingMatchesChoice(
  pending: Effect,
  recorded: FixtureBonusChoice,
): boolean {
  if (recorded.effect === "discarded") {
    return (
      pending.type === "cross_yellow_free" ||
      pending.type === "cross_blue_free" ||
      pending.type === "round_black_x" ||
      pending.type === "round_black_six"
    );
  }
  if (recorded.effect === "yellowX") {
    return pending.type === "cross_yellow_free" || pending.type === "round_black_x";
  }
  if (recorded.effect === "blueX") {
    return pending.type === "cross_blue_free" || pending.type === "round_black_x";
  }
  return false;
}

function assertRecordedAutoBonus(
  game: Game,
  playerIdValue: string,
  recorded: FixtureBonusChoice,
): void {
  const sheet = playerSheet(game, playerIdValue);

  if (recorded.effect === "greenX") {
    if (!sheet.green.boxes[recorded.target]?.crossed) {
      throw new Error(
        `Expected green box ${recorded.target} crossed for ${playerIdValue}`,
      );
    }
    return;
  }

  if (recorded.effect === "orange") {
    if (sheet.orange.boxes[recorded.target]?.value !== recorded.value) {
      throw new Error(
        `Expected orange box ${recorded.target} value ${recorded.value} for ${playerIdValue}`,
      );
    }
    return;
  }

  if (recorded.effect === "purple") {
    if (sheet.purple.boxes[recorded.target]?.value !== recorded.value) {
      throw new Error(
        `Expected purple box ${recorded.target} value ${recorded.value} for ${playerIdValue}`,
      );
    }
    return;
  }

  throw new Error(`Unexpected auto-recorded bonus effect ${recorded.effect}`);
}

function applyRecordedChoiceBonus(
  game: Game,
  recorded: FixtureBonusChoice,
): Game {
  const pendingPlayer = game.pendingPlayerId;
  if (!pendingPlayer) {
    throw new Error("Pending queue without pendingPlayerId");
  }
  const head = game.pending[0];
  if (!head) {
    throw new Error("Missing pending effect for recorded bonus choice");
  }
  if (!pendingMatchesChoice(head, recorded)) {
    throw new Error(
      `Pending ${head.type} does not match recorded ${recorded.effect}`,
    );
  }

  if (recorded.effect === "discarded") {
    const sheet = playerSheet(game, pendingPlayer);
    if (choiceBonusHasTargets(sheet, head)) {
      throw new Error(
        `Expected dead ${head.type} but legal targets remain (${recorded.note ?? "no note"})`,
      );
    }
    const processed = processAutoChain(sheet, game.pending);
    return {
      ...updatePlayerSheet(game, pendingPlayer, processed.sheet),
      pending: processed.pending,
      pendingPlayerId:
        processed.pending.length > 0 ? pendingPlayer : null,
      phase:
        processed.pending.length > 0
          ? "resolve_pending"
          : game.phase === "resolve_pending"
            ? "active_roll"
            : game.phase,
    };
  }

  if (recorded.effect === "yellowX") {
    const [row, col] = recorded.target;
    const targetIndex = row * 4 + col;
    const cell = playerSheet(game, pendingPlayer).yellow.grid[row]?.[col];
    if (!cell) {
      throw new Error(`Yellow target [${row}, ${col}] not found`);
    }
    if (recorded.cellValue !== undefined && cell.value !== recorded.cellValue) {
      throw new Error(
        `Yellow [${row}, ${col}] cellValue mismatch: expected ${recorded.cellValue}, got ${cell.value}`,
      );
    }
    return assertAndReduce(game, {
      type: "CROSS",
      playerId: pendingPlayer,
      color: "yellow",
      value: cell.value,
      targetIndex,
    });
  }

  if (recorded.effect === "blueX") {
    const sum = recorded.target;
    const index = playerSheet(game, pendingPlayer).blue.boxes.findIndex(
      (box) => box.sum === sum,
    );
    if (index < 0) {
      throw new Error(`Blue sum ${sum} not found for ${pendingPlayer}`);
    }
    return assertAndReduce(game, {
      type: "CROSS",
      playerId: pendingPlayer,
      color: "blue",
      targetIndex: index,
    });
  }

  throw new Error(`Unsupported recorded choice effect ${recorded.effect}`);
}

function settleRecordedBonuses(
  game: Game,
  actorId: string,
  bonusChoices: FixtureBonusChoice[],
): Game {
  let next = game;
  let index = 0;

  while (index < bonusChoices.length || next.pending.length > 0) {
    if (next.pending.length > 0) {
      const recorded = bonusChoices[index];
      if (!recorded) {
        throw new Error(
          `Missing recorded bonus choice for pending ${next.pending[0]!.type}`,
        );
      }
      if (!CHOICE_BONUS_EFFECTS.has(recorded.effect)) {
        throw new Error(
          `Expected choice bonus for pending ${next.pending[0]!.type}, got ${recorded.effect}`,
        );
      }
      index += 1;
      next = applyRecordedChoiceBonus(next, recorded);
      continue;
    }

    const recorded = bonusChoices[index];
    if (!recorded) {
      break;
    }
    index += 1;
    assertRecordedAutoBonus(next, actorId, recorded);
  }

  if (index !== bonusChoices.length) {
    throw new Error(
      `Unused recorded bonus choices: ${bonusChoices.length - index} remaining`,
    );
  }
  if (next.pending.length > 0) {
    throw new Error(
      `Unresolved pending effects after bonus choices: ${next.pending.map((effect) => effect.type).join(", ")}`,
    );
  }

  return next;
}

function crossFromPlacement(
  game: Game,
  playerIdValue: string,
  chosen: { color: string; value: number },
  placed: { area: string; detail: number | [number, number] | null },
): Game {
  const area = placed.area as ColorArea;

  if (area === "yellow") {
    const [row, col] = placed.detail as [number, number];
    return assertAndReduce(game, {
      type: "CROSS",
      playerId: playerIdValue,
      color: "yellow",
      value: chosen.value,
      targetIndex: row * 4 + col,
    });
  }

  if (area === "blue") {
    const sum = placed.detail as number;
    const index = game.players
      .find((entry) => entry.id === playerIdValue)!
      .sheet.blue.boxes.findIndex((box) => box.sum === sum);
    if (index < 0) {
      throw new Error(`Blue sum ${sum} not found for ${playerIdValue}`);
    }
    const live = resolveBlueWhiteValues(game.dice);
    if (!live) {
      throw new Error("Blue cross requires live blue and white dice");
    }
    return assertAndReduce(game, {
      type: "CROSS",
      playerId: playerIdValue,
      color: "blue",
      blueDie: live.blue,
      whiteDie: live.white,
      targetIndex: index,
    });
  }

  if (area === "green") {
    const index = game.players
      .find((entry) => entry.id === playerIdValue)!
      .sheet.green.boxes.findIndex((box) => !box.crossed);
    return assertAndReduce(game, {
      type: "CROSS",
      playerId: playerIdValue,
      color: "green",
      value: chosen.value,
      targetIndex: index,
    });
  }

  if (area === "orange" || area === "purple") {
    return assertAndReduce(game, {
      type: "CROSS",
      playerId: playerIdValue,
      color: area,
      value: placed.detail as number,
    });
  }

  throw new Error(`Unsupported placement area ${placed.area}`);
}

function skipExtraPhases(game: Game): Game {
  let next = game;
  for (let guard = 0; guard < 16; guard += 1) {
    if (next.phase !== "active_extra" && next.phase !== "passive_extra") {
      return next;
    }
    const actors = playersActingNow(next);
    if (actors.length === 0) {
      return next;
    }
    next = assertAndReduce(next, {
      type: "SKIP_EXTRA_DIE",
      playerId: actors[0]!,
    });
  }
  throw new Error("Extra-die skip guard tripped");
}

function applyRecordedRoundFourBonus(
  game: Game,
  playerIndex: number,
  bonusChoices: FixtureBonusChoice[],
): Game {
  const id = playerId(playerIndex);
  let next: Game = {
    ...game,
    pending: [{ type: "round_black_x" }],
    pendingPlayerId: id,
    phase: "resolve_pending",
    roundBonusPendingPlayerIds: [],
  };
  next = settleRecordedBonuses(next, id, bonusChoices);
  if (next.pending.length > 0) {
    throw new Error(
      `Round-4 bonus for player ${playerIndex} left pending ${next.pending[0]!.type}`,
    );
  }
  return {
    ...next,
    phase: "active_roll",
    pendingPlayerId: null,
    roundBonusPendingPlayerIds: [],
  };
}

function skipRoundBonusIfPending(game: Game): Game {
  if (game.phase !== "round_bonus_choose") {
    return game;
  }
  return {
    ...game,
    phase: "active_roll",
    roundBonusPendingPlayerIds: [],
  };
}

function replayPick(
  game: Game,
  activeIndex: number,
  pick: FixturePick,
): Game {
  const id = playerId(activeIndex);
  const bonusChoices = pick.bonusChoices ?? [];

  if (pick.chosen === null) {
    if (pick.reason === "no dice left") {
      return game;
    }
    if (pick.reason === "no legal placement - pick burned") {
      let next = assertAndReduce(game, { type: "ROLL", values: rollFaces(pick.roll) });
      next = assertAndReduce(next, { type: "SKIP_ROLL", playerId: id });
      return next;
    }
    throw new Error(`Unhandled null pick reason: ${pick.reason ?? "unknown"}`);
  }

  let next = assertAndReduce(game, { type: "ROLL", values: rollFaces(pick.roll) });
  next = assertAndReduce(next, {
    type: "CHOOSE_DIE",
    playerId: id,
    dieId: `die-${pick.chosen.color}`,
    slotIndex: firstOpenSlot(next, id),
  });
  next = crossFromPlacement(next, id, pick.chosen, pick.placed!);
  return settleRecordedBonuses(next, id, bonusChoices);
}

function replayPassive(game: Game, passive: FixturePassive): Game {
  const id = playerId(passive.player);
  const bonusChoices = passive.bonusChoices ?? [];
  let next = assertAndReduce(game, {
    type: "PASSIVE_TAKE",
    playerId: id,
    dieId: `die-${passive.chosen.color}`,
  });
  next = crossFromPlacement(next, id, passive.chosen, passive.placed);
  next = settleRecordedBonuses(next, id, bonusChoices);
  next = skipExtraPhases(next);
  return next;
}

export function replayFixture(fixture: FixtureFile): Game {
  let game = assertAndReduce({} as Game, {
    type: "START_GAME",
    playerCount: 4,
    playerNames: ["P0", "P1", "P2", "P3"],
    playerIds: ["p1", "p2", "p3", "p4"],
  });

  for (const entry of fixture.transcript) {
    if (entry.event === "roundStart") {
      if (entry.round === 4) {
        // The fixture records every player's free-X choice on roundStart and the
        // generator applies them all before the first round-4 turn (not when each
        // player becomes active, as the live engine does).
        for (const bonus of entry.bonusApplied) {
          game = applyRecordedRoundFourBonus(
            game,
            bonus.player,
            bonus.bonusChoices ?? [],
          );
        }
      }
      continue;
    }

    const turn = entry;
    const activeIndex = turn.activePlayer;
    if (playerId(activeIndex) !== activePlayerId(game)) {
      throw new Error(
        `Active player mismatch: expected ${playerId(activeIndex)}, got ${activePlayerId(game)}`,
      );
    }

    game = skipRoundBonusIfPending(game);

    for (const pick of turn.picks) {
      if (pick.chosen === null && pick.reason === "no dice left") {
        if (poolDice(game.dice).length === 0) {
          break;
        }
      }
      if (game.phase !== "active_roll" && game.phase !== "active_choose") {
        if (pick.chosen === null && pick.reason === "no dice left") {
          break;
        }
        throw new Error(
          `Round ${turn.round} player ${turn.activePlayer} pick ${pick.pick}: expected active_roll/choose, got ${game.phase}`,
        );
      }
      try {
        game = replayPick(game, activeIndex, pick);
      } catch (error) {
        throw new Error(
          `Round ${turn.round} player ${turn.activePlayer} pick ${pick.pick}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    game = skipExtraPhases(game);

    if (game.phase !== "passive_choose") {
      throw new Error(`Expected passive_choose after active turn, got ${game.phase}`);
    }

    for (const passive of turn.passive) {
      game = replayPassive(game, passive);
    }
  }

  return game;
}

export function sheetSnapshot(sheet: Sheet) {
  return {
    yellowGrid: sheet.yellow.grid.map((row) =>
      row.map((cell) => (cell.preprinted ? false : cell.crossed)),
    ),
    blue: sheet.blue.boxes
      .filter((box) => box.crossed)
      .map((box) => box.sum)
      .sort((left, right) => left - right),
    green: sheet.green.boxes.filter((box) => box.crossed).length,
    orange: sheet.orange.boxes
      .filter((box) => box.value !== null)
      .map((box) => box.value!),
    purple: sheet.purple.boxes
      .filter((box) => box.value !== null)
      .map((box) => box.value!),
    foxes: sheet.foxes,
    rerollsUnlocked: sheet.rerollsEarned,
    plusOneUnlocked: sheet.plusOnesEarned,
  };
}
