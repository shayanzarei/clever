import { describe, expect, it } from "vitest";
import { reduce } from "@/lib/engine/reduce";
import { activePlayerId } from "@/lib/engine/turn";
import type { Game } from "@/lib/engine/types";
import { isLobbyTurnOrderState, shuffleSeats } from "./turn-order";

describe("turn order", () => {
  it("keeps every item after a shuffle", () => {
    const seats = ["p1", "p2", "p3", "p4"] as const;
    const shuffled = shuffleSeats(seats);
    expect([...shuffled].sort()).toEqual([...seats]);
  });

  it("starts the engine with the shuffled seat ids", () => {
    const game = reduce({} as Game, {
      type: "START_GAME",
      playerCount: 3,
      playerNames: ["Cara", "Alice", "Bob"],
      playerIds: ["p3", "p1", "p2"],
    });

    expect(game.players.map((player) => player.id)).toEqual(["p3", "p1", "p2"]);
    expect(activePlayerId(game)).toBe("p3");
  });

  it("recognizes a lobby turn-order payload", () => {
    expect(isLobbyTurnOrderState({ kind: "turn_order", seats: ["p2", "p1"] })).toBe(
      true,
    );
    expect(isLobbyTurnOrderState({ foxes: 0 })).toBe(false);
  });
});
