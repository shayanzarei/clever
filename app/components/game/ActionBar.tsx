import { resolveBlueWhiteValues } from "@/lib/engine/blue";
import { poolDice } from "@/lib/engine/dice";
import { canSkipActiveRoll } from "@/lib/engine/passive";
import {
  activePlayerId,
  canPlayerActNow,
  canUseExtraDie,
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
  onSkipRoll: (playerId: string) => void;
  onUndoChoice: (playerId: string) => void;
  onRoundBonus: (playerId: string, choice: "black_x" | "black_six") => void;
  extraDieMode: boolean;
  onToggleExtraDie: () => void;
};

export function ActionBar({
  game,
  myPlayerId = null,
  onRoll,
  onReroll,
  onSkipExtra,
  onSkipRoll,
  onUndoChoice,
  onRoundBonus,
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
    <section className="action-bar no-scrollbar flex min-h-[3.25rem] items-center gap-2 overflow-x-auto rounded-2xl border border-line bg-surface px-3 py-2">
      {game.phase === "active_roll" && canRoll && (
        <button
          type="button"
          className="touch-target rounded-xl bg-neon-blue px-4 py-2.5 text-sm font-black tracking-tight text-ink"
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
          <button type="button" className="hud-btn" onClick={onReroll}>
            Reroll ×{active.sheet.rerolls}
          </button>
        )}

      {game.phase === "active_choose" &&
        canAct &&
        viewingPlayerId &&
        isActivePlayer(game, viewingPlayerId) &&
        !game.awaitingCross &&
        canSkipActiveRoll(game, viewingPlayerId) && (
          <button
            type="button"
            className="hud-btn"
            onClick={() => onSkipRoll(viewingPlayerId)}
          >
            Pass roll
          </button>
        )}

      {canAct &&
        viewingPlayerId &&
        game.phase === "passive_choose" &&
        canUseExtraDie(game, viewingPlayerId) && (
          <button
            type="button"
            className={["hud-btn", extraDieMode ? "hud-btn--on" : ""].join(" ")}
            onClick={onToggleExtraDie}
          >
            {`+1 ×${extraDieActionsAvailable(game, viewingPlayerId)}`}
          </button>
        )}

      {canAct &&
        viewingPlayerId &&
        (game.phase === "active_extra" || game.phase === "passive_extra") && (
          <>
            <p className="text-sm text-neon-yellow">
              +1 — click any die to score an extra mark.
            </p>
            <button
              type="button"
              className="hud-btn"
              onClick={() => onSkipExtra(viewingPlayerId)}
            >
              Skip +1
            </button>
          </>
        )}

      {canAct &&
        viewingPlayerId &&
        game.phase === "passive_choose" &&
        !game.players.find((player) => player.id === viewingPlayerId)
          ?.passiveDieId && (
          <button
            type="button"
            className="hud-btn"
            onClick={() => onSkipExtra(viewingPlayerId)}
          >
            Skip leftover
          </button>
        )}

      {canAct && extraDieMode && (
        <p className="text-sm text-neon-yellow">
          +1 — click any die to score an extra mark.
        </p>
      )}

      {game.phase === "round_bonus_choose" &&
        game.roundBonusPendingPlayerIds
          .filter((playerId) => !myPlayerId || playerId === myPlayerId)
          .map((playerId) => {
          const player = game.players.find((entry) => entry.id === playerId);
          return (
            <div key={playerId} className="flex flex-wrap gap-2">
              <span className="self-center text-sm text-muted">
                {player?.name}: silver X or 6, then finish your turn
              </span>
              <button
                type="button"
                className="hud-btn"
                onClick={() => onRoundBonus(playerId, "black_x")}
              >
                Black X
              </button>
              <button
                type="button"
                className="hud-btn"
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
          className="hud-btn"
          onClick={() => viewingPlayerId && onUndoChoice(viewingPlayerId)}
        >
          Undo pick
        </button>
      )}

      {canAct &&
        game.pending.length === 0 &&
        (game.awaitingCross || pickedDie(game, viewingPlayerId)) && (
        <p className="text-sm text-neon-orange">
          {selectionHint(game, viewingPlayerId)}
        </p>
      )}

      {canAct && game.pending.length > 0 && game.pendingPlayerId && (
        <p className="text-sm text-neon-orange">
          {pendingBonusHint(game)}
        </p>
      )}

      {!canAct && game.phase !== "finished" && waitingOn.length > 0 && (
        <ThinkingNotice names={waitingOn.map((player) => player.name)} />
      )}

      {game.phase === "finished" && (
        <p className="text-sm font-medium text-white">Game finished — check scores above.</p>
      )}
    </section>
  );
}

function resolveActingPlayerId(game: Game): string | null {
  if (game.pendingPlayerId) {
    return game.pendingPlayerId;
  }
  if (game.phase === "round_bonus_choose") {
    return game.roundBonusPendingPlayerIds[0] ?? activePlayerId(game);
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

function pickedDie(game: Game, playerId: string | null) {
  if (!playerId) {
    return null;
  }
  if (game.awaitingCross?.playerId === playerId) {
    const { extraDieId, slotIndex } = game.awaitingCross;
    if (extraDieId) {
      return game.dice.find((die) => die.id === extraDieId) ?? null;
    }
    return (
      game.dice.find(
        (die) => die.location === "slot" && die.slotIndex === slotIndex,
      ) ?? null
    );
  }
  const passiveDieId = game.players.find(
    (player) => player.id === playerId,
  )?.passiveDieId;
  return game.dice.find((die) => die.id === passiveDieId) ?? null;
}

/**
 * Blue is always blue + white, so naming the sum avoids the pick looking
 * like it highlighted the wrong box.
 */
function selectionHint(game: Game, playerId: string | null): string {
  const die = pickedDie(game, playerId);
  if (!die) {
    return "Click a highlighted sheet cell to cross.";
  }

  const base = `Picked ${die.color} ${die.value}.`;
  if (die.color === "blue" || die.color === "white") {
    const values = resolveBlueWhiteValues(game.dice);
    if (values) {
      return `${base} Blue marks ${values.blue} + ${values.white} = ${
        values.blue + values.white
      }. Click a highlighted box.`;
    }
  }
  return `${base} Click a highlighted box.`;
}

function pendingBonusHint(game: Game): string {
  const head = game.pending[0];
  const name = game.players.find(
    (player) => player.id === game.pendingPlayerId,
  )?.name;
  if (head?.type === "cross_blue_free") {
    return "Free blue X — click any open blue box.";
  }
  if (head?.type === "cross_yellow_free") {
    return "Free yellow X — click any open yellow box.";
  }
  if (head?.type === "round_black_x") {
    return "Black X — click any open yellow, blue, or next green box.";
  }
  if (head?.type === "round_black_six") {
    return "Black 6 — click the next orange or purple box.";
  }
  return `Resolve pending bonus on ${name}'s sheet.`;
}

function ThinkingNotice({ names }: { names: string[] }) {
  const label =
    names.length === 1
      ? `${names[0]} is thinking…`
      : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]} are thinking…`;

  return (
    <p className="flex items-center gap-2 text-sm text-muted" aria-live="polite">
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

export function rerollValues(game: Game) {
  return rollPoolDice(poolDice(game.dice));
}

export { resolveActingPlayerId };
