"use client";

import { useOnlineGame } from "@/app/hooks/useOnlineGame";
import { GameBoard } from "@/app/components/game/GameBoard";
import { OnlineLobby } from "@/app/components/game/OnlineLobby";

type OnlineGameAppProps = {
  code: string;
};

export function OnlineGameApp({ code }: OnlineGameAppProps) {
  const {
    snapshot,
    game,
    playerId,
    error,
    loading,
    syncing,
    dispatch,
    roll,
    startGame,
    setPlayerCount,
    clearError,
  } = useOnlineGame(code);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-zinc-600">
        Connecting to room…
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm text-red-700">{error ?? "Could not load room"}</p>
      </div>
    );
  }

  if (snapshot.status === "lobby" || !game) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <OnlineLobby
          code={snapshot.code}
          playerCount={snapshot.playerCount}
          members={snapshot.members}
          playerId={playerId}
          onStart={() => void startGame()}
          onPlayerCountChange={(count) => void setPlayerCount(count)}
          starting={syncing}
          updatingCount={syncing}
        />
        {error && <p className="text-sm text-red-700">{error}</p>}
      </div>
    );
  }

  return (
    <GameBoard
      game={game}
      error={error}
      dispatch={(action) => void dispatch(action)}
      roll={roll}
      clearError={clearError}
      myPlayerId={playerId}
      syncing={syncing}
    />
  );
}
