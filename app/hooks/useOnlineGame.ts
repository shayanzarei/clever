"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { poolDice } from "@/lib/engine/dice";
import type { Action, Game } from "@/lib/engine/types";
import { getClientId, getStoredPlayerId, storePlayerId } from "@/lib/client/session";
import { getSupabaseBrowserClient, isSupabaseBrowserConfigured } from "@/lib/supabase/client";
import type { GameSnapshot } from "@/lib/supabase/types";
import type { PlayerCount, PlayerSeatId } from "@/lib/game/player-seats";
import { isPlayerCount } from "@/lib/game/player-seats";
import { rollPoolDice } from "@/lib/ui/rolls";

type OnlineGameState = {
  snapshot: GameSnapshot | null;
  playerId: PlayerSeatId | null;
  error: string | null;
  loading: boolean;
  syncing: boolean;
};

export function useOnlineGame(code: string) {
  const normalizedCode = code.trim().toUpperCase();
  const clientIdRef = useRef<string>("");
  const [state, setState] = useState<OnlineGameState>({
    snapshot: null,
    playerId: null,
    error: null,
    loading: true,
    syncing: false,
  });

  const applySnapshot = useCallback((snapshot: GameSnapshot) => {
    setState((current) => ({
      ...current,
      snapshot,
      error: null,
      loading: false,
      syncing: false,
    }));
  }, []);

  const ensureMembership = useCallback(async () => {
    const clientId = getClientId();
    clientIdRef.current = clientId;

    const storedPlayerId = getStoredPlayerId(normalizedCode);
    if (storedPlayerId) {
      const response = await fetch(`/api/games/${normalizedCode}`);
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Could not load game");
      }
      const snapshot = (await response.json()) as GameSnapshot;
      applySnapshot(snapshot);
      setState((current) => ({ ...current, playerId: storedPlayerId }));
      return;
    }

    const joinName =
      typeof window !== "undefined"
        ? sessionStorage.getItem(`pretty-clever:${normalizedCode}:joinName`)
        : null;

    const response = await fetch(`/api/games/${normalizedCode}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        displayName: joinName ?? "Player 2",
      }),
    });

    const payload = (await response.json()) as {
      snapshot?: GameSnapshot;
      playerId?: PlayerSeatId;
      error?: string;
    };

    if (!response.ok || !payload.snapshot || !payload.playerId) {
      throw new Error(payload.error ?? "Could not join game");
    }

    storePlayerId(normalizedCode, payload.playerId);
    applySnapshot(payload.snapshot);
    setState((current) => ({ ...current, playerId: payload.playerId ?? null }));
  }, [applySnapshot, normalizedCode]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        await ensureMembership();
      } catch (cause) {
        if (!cancelled) {
          setState((current) => ({
            ...current,
            error: cause instanceof Error ? cause.message : "Could not connect",
            loading: false,
          }));
        }
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [ensureMembership]);

  useEffect(() => {
    if (!state.snapshot?.id || !isSupabaseBrowserConfigured()) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const gameId = state.snapshot.id;

    async function refreshSnapshot() {
      const response = await fetch(`/api/games/${normalizedCode}`);
      if (!response.ok) {
        return;
      }
      const snapshot = (await response.json()) as GameSnapshot;
      applySnapshot(snapshot);
    }

    const gameChannel = supabase
      .channel(`game:${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          const row = payload.new as {
            status: GameSnapshot["status"];
            state: GameSnapshot["state"];
            version: number;
            player_count?: number;
          };
          setState((current) => ({
            ...current,
            snapshot: current.snapshot
              ? {
                  ...current.snapshot,
                  status: row.status,
                  state: row.state,
                  version: row.version,
                  playerCount:
                    row.player_count && isPlayerCount(row.player_count)
                      ? row.player_count
                      : current.snapshot.playerCount,
                }
              : current.snapshot,
            syncing: false,
          }));
        },
      )
      .subscribe();

    const membersChannel = supabase
      .channel(`members:${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_members",
          filter: `game_id=eq.${gameId}`,
        },
        () => {
          void refreshSnapshot();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(gameChannel);
      void supabase.removeChannel(membersChannel);
    };
  }, [applySnapshot, normalizedCode, state.snapshot?.id]);

  const clearError = useCallback(() => {
    setState((current) => ({ ...current, error: null }));
  }, []);

  const dispatch = useCallback(
    async (action: Action) => {
      const snapshot = state.snapshot;
      if (!snapshot?.state) {
        return;
      }

      setState((current) => ({ ...current, syncing: true, error: null }));

      const response = await fetch(`/api/games/${normalizedCode}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clientIdRef.current || getClientId(),
          action,
          expectedVersion: snapshot.state.version,
        }),
      });

      const payload = (await response.json()) as GameSnapshot & {
        error?: string;
        code?: string;
        snapshot?: GameSnapshot;
      };

      if (!response.ok) {
        const conflict = payload.snapshot ?? (payload.id ? payload : null);
        if (conflict?.id) {
          applySnapshot(conflict);
        }
        setState((current) => ({
          ...current,
          error: payload.error ?? "Action failed",
          syncing: false,
        }));
        return;
      }

      applySnapshot(payload);
    },
    [applySnapshot, normalizedCode, state.snapshot],
  );

  const roll = useCallback(() => {
    const game = state.snapshot?.state;
    if (!game) {
      return;
    }
    void dispatch({
      type: "ROLL",
      values: rollPoolDice(poolDice(game.dice)),
    });
  }, [dispatch, state.snapshot?.state]);

  const startGame = useCallback(async () => {
    setState((current) => ({ ...current, syncing: true, error: null }));
    const response = await fetch(`/api/games/${normalizedCode}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: clientIdRef.current || getClientId() }),
    });

    const payload = (await response.json()) as GameSnapshot & { error?: string };

    if (!response.ok) {
      setState((current) => ({
        ...current,
        error: payload.error ?? "Could not start game",
        syncing: false,
      }));
      return;
    }

    applySnapshot(payload);
  }, [applySnapshot, normalizedCode]);

  const setPlayerCount = useCallback(
    async (playerCount: PlayerCount) => {
      setState((current) => ({ ...current, syncing: true, error: null }));
      const response = await fetch(`/api/games/${normalizedCode}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clientIdRef.current || getClientId(),
          playerCount,
        }),
      });

      const payload = (await response.json()) as GameSnapshot & { error?: string };

      if (!response.ok) {
        setState((current) => ({
          ...current,
          error: payload.error ?? "Could not update player count",
          syncing: false,
        }));
        return;
      }

      applySnapshot(payload);
    },
    [applySnapshot, normalizedCode],
  );

  const game: Game | null = state.snapshot?.state ?? null;

  return {
    snapshot: state.snapshot,
    game,
    playerId: state.playerId,
    error: state.error,
    loading: state.loading,
    syncing: state.syncing,
    dispatch,
    roll,
    startGame,
    setPlayerCount,
    clearError,
  };
}

export async function createOnlineGame(
  displayName: string,
  playerCount: PlayerCount = 2,
): Promise<string> {
  const response = await fetch("/api/games", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ displayName, clientId: getClientId(), playerCount }),
  });

  const payload = (await response.json()) as {
    snapshot?: GameSnapshot;
    playerId?: PlayerSeatId;
    error?: string;
  };

  if (!response.ok || !payload.snapshot?.code || !payload.playerId) {
    throw new Error(payload.error ?? "Could not create game");
  }

  storePlayerId(payload.snapshot.code, payload.playerId);
  return payload.snapshot.code;
}
