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
    shuffleTurnOrder,
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
      <div className="flex min-h-dvh flex-1 items-center justify-center bg-ink text-sm text-muted">
        Connecting to room…
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-4 bg-ink">
        <p className="text-sm text-red-300">{error ?? "Could not load room"}</p>
        <Link href="/" className="text-sm text-muted">
          ← Back to menu
        </Link>
      </div>
    );
  }

  if (snapshot.status === "lobby" || !game) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto bg-ink">
        <OnlineLobby
          code={snapshot.code}
          playerCount={snapshot.playerCount}
          members={snapshot.members}
          playerId={playerId}
          onStart={() => void startGame()}
          onShuffle={() => void shuffleTurnOrder()}
          onPlayerCountChange={(count) => void setPlayerCount(count)}
          onDisplayNameChange={(name) => void updateDisplayName(name)}
          onDeleteRoom={() => void handleDeleteRoom()}
          turnOrder={snapshot.turnOrder}
          starting={lobbyAction === "start"}
          shuffling={lobbyAction === "shuffle"}
          updatingCount={lobbyAction === "count"}
          updatingName={lobbyAction === "name"}
          deleting={lobbyAction === "delete"}
        />
        {error && (
          <p className="px-5 pb-6 text-center text-sm text-red-300">{error}</p>
        )}
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
