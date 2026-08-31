import { plusOneActionsRemaining } from "./sheet-actions";
import type { Game, Player } from "./types";
import {
  applyRoundStartActions,
  beginRoundFourBonus,
  isSilverBonusRound,
} from "./round-start";

export function activePlayer(game: Game): Player {
  return game.players[game.activePlayerIndex];
}

export function activePlayerId(game: Game): string {
  return activePlayer(game).id;
}

export function isActivePlayer(game: Game, playerId: string): boolean {
  return activePlayerId(game) === playerId;
}

export function passivePlayerIds(game: Game): string[] {
  return game.players
    .filter((player) => player.id !== activePlayerId(game))
    .map((player) => player.id);
}

export function allPassivesCompleted(game: Game): boolean {
  return passivePlayerIds(game).every((id) =>
    game.passiveCompletedPlayerIds.includes(id),
  );
}

/**
 * Whether this player may act right now. During the passive phase every
 * passive player who has not finished may act at the same time.
 */
export function canPlayerActNow(game: Game, playerId: string): boolean {
  if (game.phase === "finished") {
    return false;
  }

  if (game.pending.length > 0) {
    return game.pendingPlayerId === playerId;
  }

  if (game.phase === "round_bonus_choose") {
    return (
      isActivePlayer(game, playerId) &&
      game.roundBonusPendingPlayerIds.includes(playerId)
    );
  }

  if (game.awaitingCross) {
    return game.awaitingCross.playerId === playerId;
  }

  switch (game.phase) {
    case "active_roll":
    case "active_choose":
    case "active_extra":
      return isActivePlayer(game, playerId);
    case "passive_choose":
      return (
        !isActivePlayer(game, playerId) &&
        !game.passiveCompletedPlayerIds.includes(playerId)
      );
    case "passive_extra":
      // The engine pauses the other passives while an extra die is spent.
      return (
        !isActivePlayer(game, playerId) &&
        !game.passiveCompletedPlayerIds.includes(playerId) &&
        extraDieActionsAvailable(game, playerId) > 0
      );
    default:
      return false;
  }
}

/** Everyone the game is currently waiting on. */
export function playersActingNow(game: Game): string[] {
  return game.players
    .filter((player) => canPlayerActNow(game, player.id))
    .map((player) => player.id);
}

export function clearActiveTurnState(game: Game): Game {
  return {
    ...game,
    activeRollCount: 0,
    awaitingCross: null,
    passiveCompletedPlayerIds: [],
    extraDieUsedIds: [],
    extraDieActionsUsed: {},
    players: game.players.map((player) => ({
      ...player,
      diceSlots: [null, null, null],
      passiveDieId: null,
    })),
  };
}

export function extraDieActionsAvailable(game: Game, playerId: string): number {
  const player = game.players.find((entry) => entry.id === playerId);
  return player ? plusOneActionsRemaining(player.sheet) : 0;
}

/** Extra die is spent at the end of the active turn and/or the passive turn. */
export function canUseExtraDie(game: Game, playerId: string): boolean {
  if (game.pending.length > 0 || game.awaitingCross) {
    return false;
  }
  if (extraDieActionsAvailable(game, playerId) <= 0) {
    return false;
  }

  if (game.phase === "active_extra") {
    return isActivePlayer(game, playerId);
  }

  if (game.phase === "passive_extra" || game.phase === "passive_choose") {
    const player = game.players.find((entry) => entry.id === playerId);
    if (!player || isActivePlayer(game, playerId)) {
      return false;
    }
    if (game.passiveCompletedPlayerIds.includes(playerId)) {
      return false;
    }
    if (game.phase === "passive_choose" && player.passiveDieId) {
      return false;
    }
    return true;
  }

  return false;
}

export function beginRound(
  game: Game,
  options: { applyGrants?: boolean } = {},
): Game {
  const applyGrants = options.applyGrants ?? true;
  let next = applyGrants ? applyRoundStartActions(game, game.round) : game;
  if (isSilverBonusRound(next.round)) {
    next = beginRoundFourBonus(next);
  }
  return next;
}

export function advanceTurn(game: Game): Game {
  const nextActiveIndex = (game.activePlayerIndex + 1) % game.playerCount;
  const roundAdvanced = nextActiveIndex === 0;
  const round = roundAdvanced ? game.round + 1 : game.round;
  const finished = round > game.maxRounds;

  let next: Game = clearActiveTurnState({
    ...game,
    activePlayerIndex: nextActiveIndex,
    round,
    phase: finished ? "finished" : "active_roll",
  });

  if (!finished) {
    next = {
      ...next,
      dice: next.dice.map((die) => ({
        ...die,
        location: "pool" as const,
        slotIndex: undefined,
      })),
    };
    next = beginRound(next, { applyGrants: roundAdvanced });
  }

  return next;
}
