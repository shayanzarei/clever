import { scoreSheet } from "@/lib/engine/scoring";
import { activePlayerId } from "@/lib/engine/turn";
import type { Game } from "@/lib/engine/types";
import { ActionStock } from "@/app/components/game/ActionStock";

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
    <header className="game-header rounded-2xl border border-line bg-surface px-3 py-2">
      <div>
        <p className="text-[10px] font-bold tracking-widest text-muted uppercase">
          Round {game.round} / {game.maxRounds}
        </p>
        <h2 className="text-base font-semibold leading-tight text-white">
          {PHASE_LABELS[game.phase]}
        </h2>
        {active && game.phase !== "finished" && (
          <p className="text-xs text-muted">Active: {active.name}</p>
        )}
      </div>

      <div className="game-header__players">
        {game.players.map((player) => (
          <div
            key={player.id}
            className={[
              "player-chip",
              player.id === active?.id ? "player-chip--active" : "",
            ].join(" ")}
          >
            <div className="player-chip__meta">
              <p className="player-chip__name">{player.name}</p>
              <p className="player-chip__pts">{scoreSheet(player.sheet)} pts</p>
            </div>
            <ActionStock
              plusOnes={player.sheet.plusOnes}
              rerolls={player.sheet.rerolls}
              extraDice={player.sheet.extraDice}
              size="sm"
            />
          </div>
        ))}
      </div>
    </header>
  );
}
