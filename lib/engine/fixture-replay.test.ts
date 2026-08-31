import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { rankFinishedPlayers } from "@/lib/game/score-level";
import {
  countRecordedBonusChoiceEvents,
  replayFixture,
  sheetSnapshot,
  type FixtureFile,
} from "./fixture-replay";
import { colorScores, scoreFoxes, scoreSheet } from "./scoring";

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "fixture-4p-seed20260831-v2.json",
);

const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as FixtureFile;

describe("golden-master fixture replay", () => {
  it("records 13 bonusChoices sequences across the transcript", () => {
    expect(countRecordedBonusChoiceEvents(fixture)).toBe(13);
  });

  it("replays the 4-player seed fixture through the reducer", () => {
    const game = replayFixture(fixture);

    expect(game.phase).toBe("finished");
    expect(game.round).toBe(fixture.rounds + 1);

    for (const expected of fixture.expected) {
      const player = game.players[expected.player]!;
      const snapshot = sheetSnapshot(player.sheet);
      const scores = colorScores(player.sheet);
      const foxScore = scoreFoxes(player.sheet);
      const total = scoreSheet(player.sheet);

      expect(snapshot.yellowGrid, `P${expected.player} yellow`).toEqual(
        expected.yellowGrid,
      );
      expect(snapshot.blue, `P${expected.player} blue`).toEqual(
        [...expected.blue].sort((a, b) => a - b),
      );
      expect(snapshot.green).toBe(expected.green);
      expect(snapshot.orange).toEqual(expected.orange);
      expect(snapshot.purple).toEqual(expected.purple);
      expect(snapshot.foxes).toBe(expected.foxes);
      expect(snapshot.rerollsUnlocked).toBe(expected.rerollsUnlocked);
      expect(snapshot.plusOneUnlocked).toBe(expected.plusOneUnlocked);
      expect(scores).toEqual(expected.areaScores);
      expect(foxScore).toBe(expected.foxScore);
      expect(total).toBe(expected.total);
    }

    const results = rankFinishedPlayers(
      game.players.map((player) => ({
        id: player.id,
        name: player.name,
        total: scoreSheet(player.sheet),
        colors: { ...colorScores(player.sheet), foxes: player.sheet.foxes },
      })),
    );

    expect(results.map((entry) => entry.name)).toEqual(["P3", "P2", "P0", "P1"]);
    expect(results.map((entry) => entry.total)).toEqual([103, 74, 72, 54]);
    expect(results.map((entry) => entry.rank)).toEqual([1, 2, 3, 4]);
  });
});
