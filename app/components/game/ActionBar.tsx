import { poolDice } from "@/lib/engine/dice";
import {
  activePlayerId,
  canPlayerActNow,
  extraDieActionsAvailable,
  isActivePlayer,
  playersActingNow,
} from "@/lib/engine/turn";
import type { Game } from "@/lib/engine/types";
import type { PlayerSeatId } from "@/lib/game/player-seats";
import { rollPoolDice } from "@/lib/ui/rolls";

type ActionBarProps = {
  game: Game;
  /** When set (online), only this seat sees action controls. */
  myPlayerId?: PlayerSeatId | null;
  onRoll: () => void;
  onReroll: () => void;
  onSkipExtra: (playerId: string) => void;
  onUndoChoice: (playerId: string) => void;
  onRoundBonus: (playerId: string, choice: "black_x" | "black_six") => void;
  plusOneMode: boolean;
  onTogglePlusOne: () => void;
  extraDieMode: boolean;
  onToggleExtraDie: () => void;
};

export function ActionBar({
  game,
  myPlayerId = null,
  onRoll,
  onReroll,
  onSkipExtra,
  onUndoChoice,
  onRoundBonus,
  plusOneMode,
  onTogglePlusOne,
  extraDieMode,
  onToggleExtraDie,
}: ActionBarProps) {
  const activeId = activePlayerId(game);
  const active = game.players.find((player) => player.id === activeId);
  const viewingPlayerId = myPlayerId ?? resolveActingPlayerId(game);
  const canAct = Boolean(
    viewingPlayerId && canPlayerActNow(game, viewingPlayerId),
  );
  const canRoll = canAct && (!myPlayerId || myPlayerId === activeId);
  const actingNow = playersActingNow(game);
  const waitingOn = game.players.filter(
    (player) => player.id !== viewingPlayerId && actingNow.includes(player.id),
  );

  return (
    <section className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
      {game.phase === "active_roll" && canRoll && (
        <button
          type="button"
          className="touch-target rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white"
          onClick={onRoll}
        >
          Roll {poolDice(game.dice).length} dice
        </button>
      )}

      {game.phase === "active_choose" &&
        canAct &&
        active &&
        !game.awaitingCross &&
        active.sheet.rerolls > 0 && (
          <button
            type="button"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            onClick={onReroll}
          >
            Reroll (↻ {active.sheet.rerolls})
          </button>
        )}

      {canAct && canUsePlusOne(game, viewingPlayerId) && (
        <button
          type="button"
          className={[
            "rounded-lg border px-3 py-2 text-sm",
            plusOneMode ? "border-amber-500 bg-amber-50" : "border-zinc-300",
          ].join(" ")}
          onClick={onTogglePlusOne}
        >
          +1 mode
        </button>
      )}

      {canAct &&
        (game.phase === "active_extra" || game.phase === "passive_extra") &&
        viewingPlayerId &&
        extraDieActionsAvailable(game, viewingPlayerId) > 0 && (
          <>
            <button
              type="button"
              className={[
                "rounded-lg border px-3 py-2 text-sm",
                extraDieMode ? "border-amber-500 bg-amber-50" : "border-zinc-300",
              ].join(" ")}
              onClick={onToggleExtraDie}
            >
              Extra die
            </button>
            <button
              type="button"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              onClick={() => viewingPlayerId && onSkipExtra(viewingPlayerId)}
            >
              Skip extra dice
            </button>
          </>
        )}

      {game.phase === "round_bonus_choose" &&
        game.roundBonusPendingPlayerIds
          .filter((playerId) => !myPlayerId || playerId === myPlayerId)
          .map((playerId) => {
          const player = game.players.find((entry) => entry.id === playerId);
          return (
            <div key={playerId} className="flex flex-wrap gap-2">
              <span className="self-center text-sm text-zinc-600">
                {player?.name} round 4:
              </span>
              <button
                type="button"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                onClick={() => onRoundBonus(playerId, "black_x")}
              >
                Black X
              </button>
              <button
                type="button"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                onClick={() => onRoundBonus(playerId, "black_six")}
              >
                Black 6
              </button>
            </div>
          );
        })}

      {canAct && canUndoChoice(game, viewingPlayerId) && (
        <button
          type="button"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          onClick={() => viewingPlayerId && onUndoChoice(viewingPlayerId)}
        >
          Undo pick
        </button>
      )}

      {canAct && game.awaitingCross && (
        <p className="text-sm text-amber-800">Click a highlighted sheet cell to cross.</p>
      )}

      {canAct && game.pending.length > 0 && game.pendingPlayerId && (
        <p className="text-sm text-amber-800">
          Resolve pending bonus on{" "}
          {game.players.find((player) => player.id === game.pendingPlayerId)?.name}
          &apos;s sheet.
        </p>
      )}

      {!canAct && game.phase !== "finished" && waitingOn.length > 0 && (
        <ThinkingNotice names={waitingOn.map((player) => player.name)} />
      )}

      {game.phase === "finished" && (
        <p className="text-sm font-medium text-zinc-800">Game finished — check scores above.</p>
      )}
    </section>
  );
}

function resolveActingPlayerId(game: Game): string | null {
  if (game.pendingPlayerId) {
    return game.pendingPlayerId;
  }
  if (game.phase === "passive_choose" || game.phase === "passive_extra") {
    const passive = game.players.find(
      (player) =>
        !isActivePlayer(game, player.id) &&
        !game.passiveCompletedPlayerIds.includes(player.id),
    );
    return passive?.id ?? null;
  }
  if (game.awaitingCross) {
    return game.awaitingCross.playerId;
  }
  return activePlayerId(game);
}

function ThinkingNotice({ names }: { names: string[] }) {
  const label =
    names.length === 1
      ? `${names[0]} is thinking…`
      : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]} are thinking…`;

  return (
    <p className="flex items-center gap-2 text-sm text-zinc-600" aria-live="polite">
      <span className="thinking-dots" aria-hidden>
        <span />
        <span />
        <span />
      </span>
      {label}
    </p>
  );
}

function canUndoChoice(game: Game, playerId: string | null): boolean {
  if (!playerId || game.pending.length > 0) {
    return false;
  }
  if (game.awaitingCross) {
    return game.awaitingCross.playerId === playerId;
  }
  const player = game.players.find((entry) => entry.id === playerId);
  return Boolean(player?.passiveDieId);
}

function canUsePlusOne(game: Game, playerId: string | null): boolean {
  if (!playerId) {
    return false;
  }
  const player = game.players.find((entry) => entry.id === playerId);
  if (!player || player.sheet.plusOnes <= 0) {
    return false;
  }
  if (isActivePlayer(game, playerId)) {
    return game.phase === "active_choose" && !game.awaitingCross;
  }
  return (
    game.phase === "passive_choose" &&
    !game.passiveCompletedPlayerIds.includes(playerId)
  );
}

export function rerollValues(game: Game) {
  return rollPoolDice(poolDice(game.dice));
}

export { resolveActingPlayerId };
