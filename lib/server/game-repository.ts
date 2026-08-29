import { activePlayerId } from "@/lib/engine/turn";
import { reduce } from "@/lib/engine/reduce";
import type { Action, Game } from "@/lib/engine/types";
import {
  defaultDisplayName,
  isPlayerCount,
  nextAvailableSeat,
  seatsForCount,
  type PlayerCount,
  type PlayerSeatId,
} from "@/lib/game/player-seats";
import { createAdminClient } from "@/lib/supabase/server";
import type { GameMemberRow, GameRow, GameSnapshot } from "@/lib/supabase/types";
import { generateGameCode } from "@/lib/server/game-code";

export class GameRepositoryError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly snapshot?: GameSnapshot,
  ) {
    super(message);
    this.name = "GameRepositoryError";
  }
}

function normalizePlayerCount(value: number | null | undefined): PlayerCount {
  if (value && isPlayerCount(value)) {
    return value;
  }
  return 2;
}

function mapSnapshot(row: GameRow, members: GameMemberRow[]): GameSnapshot {
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    playerCount: normalizePlayerCount(row.player_count),
    state: row.state,
    version: row.version,
    members,
  };
}

async function fetchMembers(gameId: string): Promise<GameMemberRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("game_members")
    .select("*")
    .eq("game_id", gameId)
    .order("joined_at", { ascending: true });

  if (error) {
    throw new GameRepositoryError(error.message, 500);
  }

  return (data ?? []) as GameMemberRow[];
}

async function fetchGameByCode(code: string): Promise<GameRow> {
  const supabase = createAdminClient();
  const normalized = code.trim().toUpperCase();
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("code", normalized)
    .maybeSingle();

  if (error) {
    throw new GameRepositoryError(error.message, 500);
  }

  if (!data) {
    throw new GameRepositoryError("Game not found", 404, "NOT_FOUND");
  }

  return data as GameRow;
}

export async function getGameSnapshot(code: string): Promise<GameSnapshot> {
  const row = await fetchGameByCode(code);
  const members = await fetchMembers(row.id);
  return mapSnapshot(row, members);
}

export async function createGame(
  displayName: string,
  clientId: string,
  playerCount: PlayerCount = 2,
): Promise<{ snapshot: GameSnapshot; playerId: PlayerSeatId }> {
  const supabase = createAdminClient();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateGameCode();
    const { data: game, error: gameError } = await supabase
      .from("games")
      .insert({
        code,
        status: "lobby",
        player_count: playerCount,
        state: null,
        version: 0,
      })
      .select("*")
      .single();

    if (gameError) {
      if (gameError.code === "23505") {
        continue;
      }
      throw new GameRepositoryError(gameError.message, 500);
    }

    const { error: memberError } = await supabase.from("game_members").insert({
      game_id: game.id,
      player_id: "p1",
      display_name: displayName.trim() || defaultDisplayName("p1"),
      client_id: clientId,
    });

    if (memberError) {
      await supabase.from("games").delete().eq("id", game.id);
      throw new GameRepositoryError(memberError.message, 500);
    }

    const members = await fetchMembers(game.id);
    return {
      snapshot: mapSnapshot(game as GameRow, members),
      playerId: "p1",
    };
  }

  throw new GameRepositoryError("Could not allocate a room code", 500);
}

export async function joinGame(
  code: string,
  displayName: string,
  clientId: string,
): Promise<{ snapshot: GameSnapshot; playerId: PlayerSeatId }> {
  const row = await fetchGameByCode(code);
  const members = await fetchMembers(row.id);
  const maxCount = normalizePlayerCount(row.player_count);

  const existing = members.find((member) => member.client_id === clientId);
  if (existing) {
    return {
      snapshot: mapSnapshot(row, members),
      playerId: existing.player_id,
    };
  }

  if (row.status !== "lobby") {
    throw new GameRepositoryError("Game already started", 409, "GAME_STARTED");
  }

  if (members.length >= maxCount) {
    throw new GameRepositoryError("Game is full", 409, "GAME_FULL");
  }

  const taken = new Set(members.map((member) => member.player_id));
  const playerId = nextAvailableSeat(taken, maxCount);
  if (!playerId) {
    throw new GameRepositoryError("Game is full", 409, "GAME_FULL");
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("game_members").insert({
    game_id: row.id,
    player_id: playerId,
    display_name: displayName.trim() || defaultDisplayName(playerId),
    client_id: clientId,
  });

  if (error) {
    throw new GameRepositoryError(error.message, 500);
  }

  const nextMembers = await fetchMembers(row.id);
  return {
    snapshot: mapSnapshot(row, nextMembers),
    playerId,
  };
}

export async function updateGamePlayerCount(
  code: string,
  clientId: string,
  playerCount: PlayerCount,
): Promise<GameSnapshot> {
  const row = await fetchGameByCode(code);
  const members = await fetchMembers(row.id);
  const host = members.find((member) => member.player_id === "p1");

  if (!host || host.client_id !== clientId) {
    throw new GameRepositoryError("Only the host can change player count", 403, "FORBIDDEN");
  }

  if (row.status !== "lobby") {
    throw new GameRepositoryError("Game already started", 409, "GAME_STARTED");
  }

  if (members.length > playerCount) {
    throw new GameRepositoryError(
      "Cannot reduce seats below the number of joined players",
      409,
      "TOO_FEW_SEATS",
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("games")
    .update({ player_count: playerCount })
    .eq("id", row.id)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new GameRepositoryError(error.message, 500);
  }

  if (!data) {
    throw new GameRepositoryError("Could not update player count", 500);
  }

  return mapSnapshot(data as GameRow, members);
}

export async function startGame(
  code: string,
  clientId: string,
): Promise<GameSnapshot> {
  const row = await fetchGameByCode(code);
  const members = await fetchMembers(row.id);
  const host = members.find((member) => member.player_id === "p1");
  const playerCount = normalizePlayerCount(row.player_count);

  if (!host || host.client_id !== clientId) {
    throw new GameRepositoryError("Only the host can start the game", 403, "FORBIDDEN");
  }

  if (row.status !== "lobby") {
    throw new GameRepositoryError("Game already started", 409, "GAME_STARTED");
  }

  if (members.length < 2) {
    throw new GameRepositoryError("Need at least 2 players", 409, "NEED_PLAYER");
  }

  if (members.length !== playerCount) {
    throw new GameRepositoryError(
      `Waiting for ${playerCount - members.length} more player${playerCount - members.length === 1 ? "" : "s"}`,
      409,
      "NEED_PLAYERS",
    );
  }

  const names = seatsForCount(playerCount).map((seat) => {
    const member = members.find((entry) => entry.player_id === seat);
    return member?.display_name ?? defaultDisplayName(seat);
  });

  const nextState = reduce({} as Game, {
    type: "START_GAME",
    playerCount,
    playerNames: names,
  });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("games")
    .update({
      status: "playing",
      state: nextState,
      version: nextState.version,
    })
    .eq("id", row.id)
    .eq("version", row.version)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new GameRepositoryError(error.message, 500);
  }

  if (!data) {
    throw new GameRepositoryError("Could not start game", 409, "VERSION_CONFLICT");
  }

  return mapSnapshot(data as GameRow, members);
}

export async function updateMemberDisplayName(
  code: string,
  clientId: string,
  displayName: string,
): Promise<GameSnapshot> {
  const row = await fetchGameByCode(code);
  const members = await fetchMembers(row.id);
  const member = members.find((entry) => entry.client_id === clientId);

  if (!member) {
    throw new GameRepositoryError("You are not in this game", 403, "FORBIDDEN");
  }

  if (row.status !== "lobby") {
    throw new GameRepositoryError("Game already started", 409, "GAME_STARTED");
  }

  const nextName = displayName.trim() || defaultDisplayName(member.player_id);
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("game_members")
    .update({ display_name: nextName })
    .eq("id", member.id);

  if (error) {
    throw new GameRepositoryError(error.message, 500);
  }

  const nextMembers = await fetchMembers(row.id);
  return mapSnapshot(row, nextMembers);
}

export async function deleteGame(code: string, clientId: string): Promise<void> {
  const row = await fetchGameByCode(code);
  const members = await fetchMembers(row.id);
  const host = members.find((member) => member.player_id === "p1");

  if (!host || host.client_id !== clientId) {
    throw new GameRepositoryError("Only the host can delete the room", 403, "FORBIDDEN");
  }

  if (row.status !== "lobby") {
    throw new GameRepositoryError("Game already started", 409, "GAME_STARTED");
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("games").delete().eq("id", row.id);

  if (error) {
    throw new GameRepositoryError(error.message, 500);
  }
}

function assertMemberCanAct(
  game: Game,
  member: GameMemberRow,
  action: Action,
): void {
  if (action.type === "ROLL") {
    if (member.player_id !== activePlayerId(game)) {
      throw new GameRepositoryError("Not your turn to roll", 403, "FORBIDDEN");
    }
    return;
  }

  if ("playerId" in action) {
    if (action.playerId !== member.player_id) {
      throw new GameRepositoryError("Not your seat", 403, "FORBIDDEN");
    }
  }
}

export async function applyGameAction(
  code: string,
  clientId: string,
  action: Action,
  expectedVersion: number,
): Promise<GameSnapshot> {
  const row = await fetchGameByCode(code);
  const members = await fetchMembers(row.id);
  const member = members.find((entry) => entry.client_id === clientId);

  if (!member) {
    throw new GameRepositoryError("You are not in this game", 403, "FORBIDDEN");
  }

  if (row.status !== "playing" || !row.state) {
    throw new GameRepositoryError("Game is not in progress", 409, "NOT_PLAYING");
  }

  if (row.version !== expectedVersion) {
    throw new GameRepositoryError("State changed — refresh and retry", 409, "VERSION_CONFLICT", {
      id: row.id,
      code: row.code,
      status: row.status,
      playerCount: normalizePlayerCount(row.player_count),
      state: row.state,
      version: row.version,
      members,
    });
  }

  assertMemberCanAct(row.state, member, action);

  let nextState: Game;
  try {
    nextState = reduce(row.state, action);
  } catch (cause) {
    throw new GameRepositoryError(
      cause instanceof Error ? cause.message : "Invalid action",
      400,
      "INVALID_ACTION",
    );
  }

  const nextStatus = nextState.phase === "finished" ? "finished" : "playing";
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("games")
    .update({
      status: nextStatus,
      state: nextState,
      version: nextState.version,
    })
    .eq("id", row.id)
    .eq("version", expectedVersion)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new GameRepositoryError(error.message, 500);
  }

  if (!data) {
    const latest = await fetchGameByCode(code);
    const latestMembers = await fetchMembers(latest.id);
    throw new GameRepositoryError("State changed — refresh and retry", 409, "VERSION_CONFLICT", {
      id: latest.id,
      code: latest.code,
      status: latest.status,
      playerCount: normalizePlayerCount(latest.player_count),
      state: latest.state,
      version: latest.version,
      members: latestMembers,
    });
  }

  return mapSnapshot(data as GameRow, members);
}
