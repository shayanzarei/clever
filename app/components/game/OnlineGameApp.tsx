"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useOnlineGame } from "@/app/hooks/useOnlineGame";
import { GameBoard } from "@/app/components/game/GameBoard";
import { OnlineLobby } from "@/app/components/game/OnlineLobby";

type OnlineGameAppProps = {
  code: string;
};

export function OnlineGameApp({ code }: OnlineGameAppProps) {
  const router = useRouter();
  const {
    snapshot,
    game,
    playerId,
    error,
    loading,
    syncing,
    lobbyAction,
    dispatch,
    roll,
    startGame,
    setPlayerCount,
    updateDisplayName,
    deleteGameSession,
    clearError,
  } = useOnlineGame(code);

  async function handleDeleteRoom() {
    const deleted = await deleteGameSession();
    if (deleted) {
      router.push("/");
    }
  }

  if (loading) {
    return (
      <div className="app-game flex min-h-0 flex-1 items-center justify-center overflow-y-auto py-8 text-sm text-zinc-600">
        Connecting to room…
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="app-game flex min-h-0 flex-1 flex-col items-center gap-4 overflow-y-auto py-8 pb-safe">
        <p className="text-sm text-red-700">{error ?? "Could not load room"}</p>
        <Link href="/" className="text-sm text-zinc-600 hover:text-zinc-900">
          ← Back to menu
        </Link>
      </div>
    );
  }

  if (snapshot.status === "lobby" || !game) {
    return (
      <div className="app-game flex min-h-0 flex-1 flex-col items-center gap-4 overflow-y-auto py-4 pb-safe">
        <OnlineLobby
          code={snapshot.code}
          playerCount={snapshot.playerCount}
          members={snapshot.members}
          playerId={playerId}
          onStart={() => void startGame()}
          onPlayerCountChange={(count) => void setPlayerCount(count)}
          onDisplayNameChange={(name) => void updateDisplayName(name)}
          onDeleteRoom={() => void handleDeleteRoom()}
          starting={lobbyAction === "start"}
          updatingCount={lobbyAction === "count"}
          updatingName={lobbyAction === "name"}
          deleting={lobbyAction === "delete"}
        />
        {error && <p className="text-sm text-red-700">{error}</p>}
      </div>
    );
  }

  return (
    <div className="app-shell--play flex min-h-0 flex-1 flex-col">
      <GameBoard
        game={game}
        error={error}
        dispatch={(action) => void dispatch(action)}
        roll={roll}
        clearError={clearError}
        myPlayerId={playerId}
        syncing={syncing}
      />
    </div>
  );
}
