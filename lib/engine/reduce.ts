import {
  applyBlueCross,
  applyBlueCrossBySum,
  applyGreenCross,
  applyOrangeFill,
  applyPurpleFill,
  applyYellowCross,
} from "./apply";
import { crossEffectMatchesPending, effectNeedsChoice } from "./bonuses";
import {
  isValidChoiceTarget,
  type ChoiceTarget,
} from "./choice-targets";
import { validateSheetCross } from "./cross-validation";
import {
  applyChoiceBlue,
  applyChoiceYellow,
  processAutoChain,
} from "./effects";
import {
  applyRollValues,
  chooseDieToSlot,
  createInitialDice,
  dieFace,
  getDie,
  moveRemainingPoolToTray,
  poolDice,
  returnDieToPool,
  trayedByChoice,
} from "./dice";
import { poolDiceHasLegalCross, validatePassiveTake } from "./passive";
import {
  beginRoundFourBonus,
  roundBonusEffect,
} from "./round-start";
import { consumeExtraDie, consumeReroll } from "./sheet-actions";
import { createEmptySheet } from "./sheet";
import {
  activePlayerId,
  advanceTurn,
  allPassivesCompleted,
  beginRound,
  extraDieActionsAvailable,
  canUseExtraDie,
  isActivePlayer,
} from "./turn";
import type {
  Action,
  ColorArea,
  DieValue,
  Effect,
  Game,
  GamePhase,
  Player,
  Sheet,
} from "./types";

const MAX_ROUNDS: Record<2 | 3 | 4, number> = {
  2: 6,
  3: 5,
  4: 4,
};

function cloneGame(game: Game): Game {
  return JSON.parse(JSON.stringify(game)) as Game;
}

function bump(game: Game, patch: Partial<Game>): Game {
  return { ...game, ...patch, version: game.version + 1 };
}

function getPlayer(game: Game, playerId: string): Player {
  const player = game.players.find((entry) => entry.id === playerId);
  if (!player) {
    throw new Error(`Unknown player: ${playerId}`);
  }
  return player;
}

function updatePlayer(
  game: Game,
  playerId: string,
  patch: Partial<Player>,
): Game {
  return {
    ...game,
    players: game.players.map((player) =>
      player.id === playerId ? { ...player, ...patch } : player,
    ),
  };
}

function updatePlayerSheet(
  game: Game,
  playerId: string,
  sheet: Sheet,
): Game {
  return updatePlayer(game, playerId, { sheet });
}

function settleBonusChain(
  game: Game,
  playerId: string,
  sheet: Sheet,
  pending: Effect[],
  resumePhase: GamePhase,
): Game {
  const processed = processAutoChain(sheet, pending);
  const nextPending = processed.pending;
  const nextPhase =
    nextPending.length > 0 ? "resolve_pending" : resumePhase;

  return bump(updatePlayerSheet(game, playerId, processed.sheet), {
    pending: nextPending,
    pendingPlayerId: nextPending.length > 0 ? playerId : null,
    phase: nextPhase,
  });
}

function resumePhaseAfterCross(game: Game): GamePhase {
  if (game.awaitingCross) {
    if (game.phase === "active_extra" || game.phase === "passive_extra") {
      return game.phase;
    }
    return "active_choose";
  }
  if (game.phase === "passive_choose" || game.phase === "passive_extra") {
    return game.phase;
  }
  return game.phase;
}

function resumeAfterPendingResolution(game: Game): Game {
  if (game.pending.length > 0) {
    return game;
  }

  const activeId = activePlayerId(game);
  const forActive = game.roundBonusPendingPlayerIds.filter(
    (id) => id === activeId,
  );
  const turnUnderway =
    game.activeRollCount > 0 || game.awaitingCross !== null;

  // Another player's leftover silver waits until they become active.
  if (turnUnderway) {
    return forActive.length === game.roundBonusPendingPlayerIds.length
      ? game
      : bump(game, { roundBonusPendingPlayerIds: forActive });
  }

  if (forActive.length > 0) {
    return bump(game, {
      phase: "round_bonus_choose",
      roundBonusPendingPlayerIds: forActive,
    });
  }

  if (game.phase === "resolve_pending") {
    return bump(game, {
      phase: "active_roll",
      roundBonusPendingPlayerIds: [],
    });
  }

  if (game.roundBonusPendingPlayerIds.length > 0) {
    return bump(game, { roundBonusPendingPlayerIds: [] });
  }

  return game;
}

function beginPassivePhase(game: Game): Game {
  return bump(game, {
    phase: "passive_choose",
    passiveCompletedPlayerIds: [],
  });
}

function finishActiveTurn(game: Game): Game {
  let next = bump(
    { ...game, dice: moveRemainingPoolToTray(game.dice) },
    {},
  );

  if (extraDieActionsAvailable(next, activePlayerId(next)) > 0) {
    return bump(next, { phase: "active_extra" });
  }

  return beginPassivePhase(next);
}

function finishActiveChoice(game: Game, playerId: string): Game {
  let next: Game = bump(game, {
    activeRollCount: game.activeRollCount + 1,
    awaitingCross: null,
  });

  const poolLeft = poolDice(next.dice).length > 0;

  if (next.activeRollCount < 3 && poolLeft) {
    return bump(next, { phase: "active_roll" });
  }

  return finishActiveTurn(next);
}

function completePassivePlayer(game: Game, playerId: string): Game {
  const completed = [...game.passiveCompletedPlayerIds, playerId];
  let next = bump(game, { passiveCompletedPlayerIds: completed });

  if (allPassivesCompleted(next)) {
    return bump(advanceTurn(next), {});
  }

  return bump(next, { phase: "passive_choose" });
}

function finishPassiveChoice(game: Game, playerId: string): Game {
  let next = updatePlayer(game, playerId, { passiveDieId: null });

  if (extraDieActionsAvailable(next, playerId) > 0) {
    return bump(next, { phase: "passive_extra" });
  }

  return completePassivePlayer(next, playerId);
}

function finishExtraDieCross(game: Game, playerId: string): Game {
  const dieId = game.awaitingCross?.extraDieId;
  if (!dieId) {
    throw new Error("Missing extra-die selection");
  }

  const player = getPlayer(game, playerId);
  let next = bump(
    updatePlayer(game, playerId, { sheet: consumeExtraDie(player.sheet) }),
    {
      awaitingCross: null,
      extraDieUsedIds: [...game.extraDieUsedIds, dieId],
      extraDieActionsUsed: {
        ...game.extraDieActionsUsed,
        [playerId]: (game.extraDieActionsUsed[playerId] ?? 0) + 1,
      },
    },
  );

  if (extraDieActionsAvailable(next, playerId) > 0) {
    return next;
  }

  if (game.phase === "active_extra") {
    return beginPassivePhase(next);
  }

  return completePassivePlayer(next, playerId);
}

function finishCross(
  game: Game,
  playerId: string,
  sheet: Sheet,
  triggered: Effect[],
): Game {
  const resume = resumePhaseAfterCross(game);
  let next = settleBonusChain(game, playerId, sheet, triggered, resume);

  if (next.pending.length > 0) {
    return next;
  }

  if (next.awaitingCross?.extraDieId && next.awaitingCross.playerId === playerId) {
    return finishExtraDieCross(next, playerId);
  }

  if (
    next.awaitingCross?.slotIndex !== undefined &&
    next.awaitingCross.playerId === playerId
  ) {
    return finishActiveChoice(next, playerId);
  }

  const player = getPlayer(next, playerId);
  if (player.passiveDieId) {
    return finishPassiveChoice(next, playerId);
  }

  return resumeAfterPendingResolution(next);
}

function startGame(action: Extract<Action, { type: "START_GAME" }>): Game {
  if (action.playerNames.length !== action.playerCount) {
    throw new Error("playerNames length must match playerCount");
  }
  if (action.playerIds && action.playerIds.length !== action.playerCount) {
    throw new Error("playerIds length must match playerCount");
  }

  const players: Player[] = action.playerNames.map((name, index) => ({
    id: action.playerIds?.[index] ?? `p${index + 1}`,
    name,
    sheet: createEmptySheet(),
    diceSlots: [null, null, null],
    passiveDieId: null,
  }));

  const game: Game = {
    version: 1,
    id: `game-${Date.now()}`,
    playerCount: action.playerCount,
    players,
    activePlayerIndex: 0,
    round: 1,
    maxRounds: MAX_ROUNDS[action.playerCount],
    phase: "active_roll",
    dice: createInitialDice(),
    pending: [],
    pendingPlayerId: null,
    activeRollCount: 0,
    awaitingCross: null,
    passiveCompletedPlayerIds: [],
    roundBonusPendingPlayerIds: [],
    extraDieUsedIds: [],
    extraDieActionsUsed: {},
  };

  return beginRound(game);
}

function roll(game: Game, action: Extract<Action, { type: "ROLL" }>): Game {
  if (game.awaitingCross) {
    throw new Error("Must complete cross before rolling again");
  }
  if (game.phase !== "active_roll") {
    throw new Error("ROLL is only allowed during active_roll");
  }
  if (game.pending.length > 0) {
    throw new Error("Cannot roll while effects are pending");
  }

  const dice = applyRollValues(game.dice, action.values);

  return bump({ ...game, dice }, { phase: "active_choose" });
}

function chooseDie(
  game: Game,
  action: Extract<Action, { type: "CHOOSE_DIE" }>,
): Game {
  if (!isActivePlayer(game, action.playerId)) {
    throw new Error("Only the active player may choose dice");
  }
  if (game.phase !== "active_choose") {
    throw new Error("CHOOSE_DIE is only allowed during active_choose");
  }
  if (game.pending.length > 0) {
    throw new Error("Cannot choose while effects are pending");
  }
  if (game.awaitingCross) {
    throw new Error("Must complete cross before choosing another die");
  }
  if (action.slotIndex < 0 || action.slotIndex > 2) {
    throw new Error("slotIndex must be 0, 1, or 2");
  }

  const player = getPlayer(game, action.playerId);
  if (player.diceSlots[action.slotIndex]) {
    throw new Error("Dice slot already occupied");
  }

  const chosen = getDie(game.dice, action.dieId);
  if (!chosen || chosen.location !== "pool") {
    throw new Error("Chosen die must be in the pool");
  }

  const trayedDieIds = trayedByChoice(game.dice, action.dieId);
  const dice = chooseDieToSlot(game.dice, action.dieId, action.slotIndex);
  const diceSlots = [...player.diceSlots] as (typeof player.diceSlots)[number][];
  diceSlots[action.slotIndex] = dieFace(chosen);

  return bump(
    updatePlayer({ ...game, dice }, action.playerId, { diceSlots }),
    {
      awaitingCross: {
        playerId: action.playerId,
        slotIndex: action.slotIndex,
        trayedDieIds,
      },
    },
  );
}

function undoDieChoice(
  game: Game,
  action: Extract<Action, { type: "UNDO_DIE_CHOICE" }>,
): Game {
  if (game.pending.length > 0) {
    throw new Error("Cannot undo while effects are pending");
  }

  const player = getPlayer(game, action.playerId);
  const awaiting = game.awaitingCross;

  if (awaiting?.playerId === action.playerId && awaiting.extraDieId) {
    return bump(game, { awaitingCross: null });
  }

  if (awaiting?.playerId === action.playerId && awaiting.slotIndex !== undefined) {
    const slot = awaiting.slotIndex;
    const die = game.dice.find(
      (entry) => entry.location === "slot" && entry.slotIndex === slot,
    );
    if (!die) {
      throw new Error("Chosen die not found on table");
    }

    const dice = returnDieToPool(game.dice, die.id, awaiting.trayedDieIds ?? []);
    const diceSlots = [...player.diceSlots] as (typeof player.diceSlots)[number][];
    diceSlots[slot] = null;

    return bump(updatePlayer({ ...game, dice }, action.playerId, { diceSlots }), {
      awaitingCross: null,
    });
  }

  if (player.passiveDieId) {
    return bump(updatePlayer(game, action.playerId, { passiveDieId: null }), {});
  }

  throw new Error("No die selection to undo");
}

function passiveTake(
  game: Game,
  action: Extract<Action, { type: "PASSIVE_TAKE" }>,
): Game {
  if (game.phase !== "passive_choose") {
    throw new Error("PASSIVE_TAKE is only allowed during passive_choose");
  }
  if (isActivePlayer(game, action.playerId)) {
    throw new Error("Active player cannot take a passive die");
  }
  if (game.passiveCompletedPlayerIds.includes(action.playerId)) {
    throw new Error("Passive player already acted this turn");
  }
  if (game.pending.length > 0) {
    throw new Error("Cannot take while effects are pending");
  }

  const player = getPlayer(game, action.playerId);
  if (player.passiveDieId) {
    throw new Error("Must complete cross before taking another die");
  }

  validatePassiveTake(game, action.playerId, action.dieId);

  return bump(updatePlayer(game, action.playerId, { passiveDieId: action.dieId }), {});
}

function useReroll(
  game: Game,
  action: Extract<Action, { type: "USE_REROLL" }>,
): Game {
  if (!isActivePlayer(game, action.playerId)) {
    throw new Error("Only the active player may reroll");
  }
  if (game.phase !== "active_choose") {
    throw new Error("USE_REROLL is only allowed during active_choose");
  }
  if (game.awaitingCross) {
    throw new Error("Must complete cross before rerolling");
  }
  if (game.pending.length > 0) {
    throw new Error("Cannot reroll while effects are pending");
  }

  const player = getPlayer(game, action.playerId);
  if (player.sheet.rerolls <= 0) {
    throw new Error("No reroll actions remaining");
  }
  if (poolDice(game.dice).length === 0) {
    throw new Error("No pool dice to reroll");
  }

  const dice = applyRollValues(game.dice, action.values);

  return bump(
    updatePlayer({ ...game, dice }, action.playerId, {
      sheet: consumeReroll(player.sheet),
    }),
    {},
  );
}

function usePlusOne(
  game: Game,
  action: Extract<Action, { type: "USE_PLUS_ONE" }>,
): Game {
  return useExtraDie(game, {
    type: "USE_EXTRA_DIE",
    playerId: action.playerId,
    dieId: action.dieId,
  });
}

function useExtraDie(
  game: Game,
  action: Extract<Action, { type: "USE_EXTRA_DIE" }>,
): Game {
  if (!canUseExtraDie(game, action.playerId)) {
    throw new Error("USE_EXTRA_DIE is only allowed at the end of a main or passive turn");
  }
  if (game.extraDieUsedIds.includes(action.dieId)) {
    throw new Error("Die already used for an extra-die action this turn");
  }

  const die = getDie(game.dice, action.dieId);
  if (!die || die.location === "consumed") {
    throw new Error("Extra die must be one of the six dice in play");
  }

  const phase =
    game.phase === "passive_choose" ? "passive_extra" : game.phase;

  return bump(game, {
    phase,
    awaitingCross: {
      playerId: action.playerId,
      extraDieId: action.dieId,
    },
  });
}

function skipRoll(
  game: Game,
  action: Extract<Action, { type: "SKIP_ROLL" }>,
): Game {
  if (!isActivePlayer(game, action.playerId)) {
    throw new Error("Only the active player may skip a roll");
  }
  if (game.phase !== "active_choose") {
    throw new Error("SKIP_ROLL is only allowed during active_choose");
  }
  if (game.awaitingCross) {
    throw new Error("Must complete cross before skipping roll");
  }
  if (game.pending.length > 0) {
    throw new Error("Cannot skip roll while effects are pending");
  }
  if (poolDice(game.dice).length === 0) {
    throw new Error("No pool dice to skip");
  }
  if (poolDiceHasLegalCross(game, action.playerId)) {
    throw new Error("At least one pool die can still be marked");
  }

  return finishActiveChoice(game, action.playerId);
}

function skipExtraDie(
  game: Game,
  action: Extract<Action, { type: "SKIP_EXTRA_DIE" }>,
): Game {
  if (game.phase === "active_extra") {
    if (!isActivePlayer(game, action.playerId)) {
      throw new Error("Only the active player may skip extra dice");
    }
    return beginPassivePhase(game);
  }

  if (game.phase === "passive_extra") {
    if (isActivePlayer(game, action.playerId)) {
      throw new Error("Active player cannot skip passive extra dice");
    }
    return completePassivePlayer(game, action.playerId);
  }

  if (game.phase === "passive_choose") {
    if (isActivePlayer(game, action.playerId)) {
      throw new Error("Active player cannot skip the passive turn");
    }
    const player = getPlayer(game, action.playerId);
    if (player.passiveDieId) {
      throw new Error("Must cross the leftover die before skipping");
    }
    if (extraDieActionsAvailable(game, action.playerId) > 0) {
      return bump(game, { phase: "passive_extra" });
    }
    return completePassivePlayer(game, action.playerId);
  }

  throw new Error("SKIP_EXTRA_DIE is only allowed during extra-die phase");
}

function chooseRoundBonus(
  game: Game,
  action: Extract<Action, { type: "CHOOSE_ROUND_BONUS" }>,
): Game {
  if (game.phase !== "round_bonus_choose") {
    throw new Error("CHOOSE_ROUND_BONUS is only allowed during round_bonus_choose");
  }
  if (!isActivePlayer(game, action.playerId)) {
    throw new Error("Only the active player may choose the silver bonus");
  }
  if (!game.roundBonusPendingPlayerIds.includes(action.playerId)) {
    throw new Error("Round bonus already chosen for this player");
  }
  if (game.pending.length > 0) {
    throw new Error("Resolve pending effects before choosing round bonus");
  }

  const remaining = game.roundBonusPendingPlayerIds.filter(
    (id) => id !== action.playerId,
  );

  return bump(
    {
      ...game,
      roundBonusPendingPlayerIds: remaining,
      pending: [roundBonusEffect(action.choice)],
      pendingPlayerId: action.playerId,
      phase: "resolve_pending",
    },
    {},
  );
}

function crossDuringPending(
  game: Game,
  action: Extract<Action, { type: "CROSS"; color: ColorArea }>,
): Game {
  if (game.pendingPlayerId !== action.playerId) {
    throw new Error("Another player must resolve pending effects");
  }
  const head = game.pending[0];

  if (!crossEffectMatchesPending(head, action.color)) {
    throw new Error(`Expected ${head.type}, got ${action.color} cross`);
  }

  const player = getPlayer(game, action.playerId);
  let result;

  const rejectIllegalChoice = (target: ChoiceTarget) => {
    if (!isValidChoiceTarget(player.sheet, head, target)) {
      throw new Error("Illegal pending cross");
    }
  };

  switch (action.color) {
    case "yellow": {
      const targetIndex =
        action.targetIndex ??
        player.sheet.yellow.grid
          .flatMap((row, rowIndex) =>
            row.map((cell, colIndex) => ({
              cell,
              index: rowIndex * row.length + colIndex,
            })),
          )
          .find(({ cell }) => !cell.crossed && cell.value === action.value)
          ?.index;
      if (targetIndex === undefined) {
        throw new Error("Yellow target required");
      }
      rejectIllegalChoice({
        color: "yellow",
        targetIndex,
        value: action.value,
      });
      result = applyChoiceYellow(
        player.sheet,
        action.value as DieValue,
        targetIndex,
      );
      break;
    }
    case "blue": {
      if (head.type === "cross_blue_free" || head.type === "round_black_x") {
        const index = action.targetIndex;
        if (index === undefined) {
          throw new Error("Blue target required");
        }
        const box = player.sheet.blue.boxes[index];
        if (!box) {
          throw new Error("Blue target required");
        }
        rejectIllegalChoice({
          color: "blue",
          targetIndex: index,
          value: box.sum,
        });
        result = applyBlueCross(player.sheet, index);
        break;
      }
      if (action.blueDie === undefined || action.whiteDie === undefined) {
        throw new Error("Blue and white dice are required");
      }
      result = applyChoiceBlue(
        player.sheet,
        action.blueDie,
        action.whiteDie,
        action.targetIndex,
      );
      break;
    }
    case "green": {
      const index =
        action.targetIndex ??
        player.sheet.green.boxes.findIndex((box) => !box.crossed);
      if (index < 0) {
        throw new Error("No green box available");
      }
      const threshold = player.sheet.green.boxes[index]?.threshold;
      if (threshold === undefined) {
        throw new Error("No green box available");
      }
      rejectIllegalChoice({
        color: "green",
        targetIndex: index,
        value: threshold,
      });
      result = applyGreenCross(player.sheet, index);
      break;
    }
    case "orange": {
      if (action.value !== 6) {
        throw new Error("Round 6-bonus requires value 6 in orange");
      }
      const index =
        action.targetIndex ??
        player.sheet.orange.boxes.findIndex((box) => box.value === null);
      if (index < 0) {
        throw new Error("Illegal pending cross");
      }
      rejectIllegalChoice({
        color: "orange",
        targetIndex: index,
        value: 6,
      });
      result = applyOrangeFill(player.sheet, index, 6);
      break;
    }
    case "purple": {
      if (action.value !== 6) {
        throw new Error("Round 6-bonus requires value 6 in purple");
      }
      const index =
        action.targetIndex ??
        player.sheet.purple.boxes.findIndex((box) => box.value === null);
      if (index < 0) {
        throw new Error("Illegal pending cross");
      }
      rejectIllegalChoice({
        color: "purple",
        targetIndex: index,
        value: 6,
      });
      result = applyPurpleFill(player.sheet, index, 6);
      break;
    }
    default: {
      const _exhaustive: never = action;
      throw new Error(`Unsupported pending cross: ${(_exhaustive as Action).type}`);
    }
  }

  if (!result) {
    throw new Error("Illegal pending cross");
  }

  const queue = [...result.triggered, ...game.pending.slice(1)];
  const processed = processAutoChain(result.sheet, queue);
  return finishCross(game, action.playerId, processed.sheet, processed.pending);
}

function crossNormal(
  game: Game,
  action: Extract<Action, { type: "CROSS" }>,
): Game {
  if (game.pending.length > 0) {
    throw new Error("Must resolve pending effects before crossing");
  }

  const player = getPlayer(game, action.playerId);
  let chosenDieId: string | null = null;

  if (game.awaitingCross?.extraDieId && game.awaitingCross.playerId === action.playerId) {
    chosenDieId = game.awaitingCross.extraDieId;
  } else if (game.awaitingCross?.slotIndex !== undefined && game.awaitingCross.playerId === action.playerId) {
    const slot = game.awaitingCross.slotIndex;
    if (!player.diceSlots[slot]) {
      throw new Error("No die awaiting cross in slot");
    }
    chosenDieId =
      game.dice.find(
        (die) => die.location === "slot" && die.slotIndex === slot,
      )?.id ?? null;
    if (!chosenDieId) {
      throw new Error("Chosen die not found on table");
    }
  } else if (player.passiveDieId) {
    chosenDieId = player.passiveDieId;
  } else {
    throw new Error("No die selected for cross");
  }

  const crossOptions =
    action.color === "blue"
      ? { blueDie: action.blueDie, whiteDie: action.whiteDie }
      : { value: "value" in action ? action.value : undefined };

  if (
    !validateSheetCross(
      player.sheet,
      game.dice,
      action.color,
      chosenDieId,
      crossOptions,
    )
  ) {
    throw new Error("Illegal cross for selected die");
  }

  let result;

  switch (action.color) {
    case "yellow": {
      const targetIndex =
        action.targetIndex ??
        player.sheet.yellow.grid
          .flatMap((row, rowIndex) =>
            row.map((cell, colIndex) => ({
              cell,
              index: rowIndex * row.length + colIndex,
            })),
          )
          .find(({ cell }) => !cell.crossed && cell.value === action.value)
          ?.index;
      if (targetIndex === undefined) {
        throw new Error("Yellow target required");
      }
      result = applyYellowCross(player.sheet, targetIndex);
      break;
    }
    case "blue": {
      if (action.blueDie === undefined || action.whiteDie === undefined) {
        throw new Error("Blue and white dice are required");
      }
      const applied = applyBlueCrossBySum(
        player.sheet,
        action.blueDie,
        action.whiteDie,
        action.targetIndex,
      );
      if (!applied) {
        throw new Error("Illegal blue cross target");
      }
      result = applied;
      break;
    }
    case "green": {
      const index = player.sheet.green.boxes.findIndex((box) => !box.crossed);
      result = applyGreenCross(player.sheet, index);
      break;
    }
    case "orange": {
      const index = player.sheet.orange.boxes.findIndex(
        (box) => box.value === null,
      );
      result = applyOrangeFill(
        player.sheet,
        index,
        action.value as DieValue,
      );
      break;
    }
    case "purple": {
      const index = player.sheet.purple.boxes.findIndex(
        (box) => box.value === null,
      );
      result = applyPurpleFill(
        player.sheet,
        index,
        action.value as DieValue,
      );
      break;
    }
    default: {
      const _exhaustive: never = action;
      throw new Error(`Unsupported cross: ${(_exhaustive as Action).type}`);
    }
  }

  return finishCross(game, action.playerId, result.sheet, result.triggered);
}

/**
 * Pure state reducer — dice values always arrive inside actions.
 */
export function reduce(state: Game, action: Action): Game {
  const game = cloneGame(state);

  switch (action.type) {
    case "START_GAME":
      return startGame(action);
    case "ROLL":
      return roll(game, action);
    case "CHOOSE_DIE":
      return chooseDie(game, action);
    case "PASSIVE_TAKE":
      return passiveTake(game, action);
    case "UNDO_DIE_CHOICE":
      return undoDieChoice(game, action);
    case "USE_REROLL":
      return useReroll(game, action);
    case "USE_PLUS_ONE":
      return usePlusOne(game, action);
    case "USE_EXTRA_DIE":
      return useExtraDie(game, action);
    case "SKIP_EXTRA_DIE":
      return skipExtraDie(game, action);
    case "SKIP_ROLL":
      return skipRoll(game, action);
    case "CHOOSE_ROUND_BONUS":
      return chooseRoundBonus(game, action);
    case "CROSS": {
      if (game.pending.length > 0) {
        if (game.pendingPlayerId !== action.playerId) {
          throw new Error("Another player must resolve pending effects");
        }
        const head = game.pending[0];
        if (effectNeedsChoice(head)) {
          if (!crossEffectMatchesPending(head, action.color)) {
            throw new Error("Must resolve pending effects before crossing");
          }
        }
        return crossDuringPending(game, action);
      }
      return crossNormal(game, action);
    }
    case "END_TURN":
      if (!isActivePlayer(game, action.playerId)) {
        throw new Error("Only active player may end turn");
      }
      return bump(advanceTurn(game), {});
    case "RESOLVE_EFFECT":
      throw new Error("RESOLVE_EFFECT is not implemented; use CROSS");
    default: {
      const _exhaustive: never = action;
      throw new Error(`Unknown action: ${(_exhaustive as Action).type}`);
    }
  }
}

export function drainPending(
  state: Game,
  resolutions: Extract<Action, { type: "CROSS" }>[],
): Game {
  let next = state;
  for (const resolution of resolutions) {
    if (next.pending.length === 0) {
      break;
    }
    next = reduce(next, resolution);
  }
  return next;
}

export { beginRoundFourBonus };
