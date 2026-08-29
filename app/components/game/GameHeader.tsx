import { scoreSheet } from "@/lib/engine/scoring";
import { activePlayerId } from "@/lib/engine/turn";
import type { Game } from "@/lib/engine/types";

const PHASE_LABELS: Record<Game["phase"], string> = {
  lobby: "Lobby",
  round_bonus_choose: "Round bonus",
  active_roll: "Roll dice",
  active_choose: "Choose a die",
  active_extra: "Extra die",
  passive_choose: "Passive turn",
  passive_extra: "Passive extra die",
  resolve_pending: "Resolve bonus",
  finished: "Game over",
};

type GameHeaderProps = {
  game: Game;
};

export function GameHeader({ game }: GameHeaderProps) {
  const active = game.players.find((player) => player.id === activePlayerId(game));

  return (
    <header className="game-header flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white px-2.5 py-2 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          Round {game.round} / {game.maxRounds}
        </p>
        <h2 className="text-base font-semibold leading-tight text-zinc-900">
          {PHASE_LABELS[game.phase]}
        </h2>
        {active && game.phase !== "finished" && (
          <p className="text-xs text-zinc-600">Active: {active.name}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {game.players.map((player) => (
          <div
            key={player.id}
            className="rounded-lg bg-zinc-50 px-2 py-1 text-xs"
          >
            <p className="font-medium text-zinc-800">{player.name}</p>
            <p className="text-zinc-500">{scoreSheet(player.sheet)} pts</p>
          </div>
        ))}
      </div>
    </header>
  );
}
