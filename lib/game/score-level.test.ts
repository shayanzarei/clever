import { describe, expect, it } from "vitest";
import {
  rankFinishedPlayers,
  scoreLevel,
  scoreLevelRange,
  winnerNames,
} from "./score-level";

describe("scoreLevel", () => {
  it.each([
    [281, "You're So Clever"],
    [280, "Are you Einstein?"],
    [260, "Are you Einstein?"],
    [259, "What a genius!"],
    [240, "What a genius!"],
    [239, "Impressive!"],
    [220, "Impressive!"],
    [219, "Hat's off to you!"],
    [200, "Hat's off to you!"],
    [199, "Great result!"],
    [180, "Great result!"],
    [179, "That was pretty good."],
    [160, "That was pretty good."],
    [159, "Not bad… you could do better."],
    [140, "Not bad… you could do better."],
    [139, "Try harder!"],
    [0, "Try harder!"],
  ] as const)("scores %i as %s", (points, label) => {
    expect(scoreLevel(points).label).toBe(label);
  });

  it("formats display ranges", () => {
    expect(scoreLevelRange(scoreLevel(300))).toBe(">280");
    expect(scoreLevelRange(scoreLevel(270))).toBe("260-280");
    expect(scoreLevelRange(scoreLevel(100))).toBe("<140");
  });
});

describe("rankFinishedPlayers", () => {
  const colors = {
    yellow: 10,
    blue: 7,
    green: 6,
    orange: 5,
    purple: 4,
  };
  const foxes = { foxCount: 0, foxScore: 0 };

  it("orders by score and assigns shared ranks", () => {
    const results = rankFinishedPlayers([
      { id: "p2", name: "Bob", total: 200, colors, ...foxes },
      { id: "p1", name: "Alice", total: 220, colors, ...foxes },
      { id: "p3", name: "Cara", total: 200, colors: { ...colors, yellow: 8 }, ...foxes },
    ]);

    expect(results.map((entry) => entry.name)).toEqual(["Alice", "Bob", "Cara"]);
    expect(results[0]?.rank).toBe(1);
    expect(results[1]?.rank).toBe(2);
    expect(results[2]?.rank).toBe(3);
    expect(winnerNames(results)).toEqual(["Alice"]);
  });

  it("breaks ties using the highest score in any single area", () => {
    const results = rankFinishedPlayers([
      {
        id: "p1",
        name: "Alice",
        total: 65,
        colors: { yellow: 10, blue: 0, green: 0, orange: 0, purple: 55 },
        foxCount: 0,
        foxScore: 0,
      },
      {
        id: "p2",
        name: "Bob",
        total: 65,
        colors: { yellow: 40, blue: 25, green: 0, orange: 0, purple: 0 },
        foxCount: 0,
        foxScore: 0,
      },
    ]);

    expect(winnerNames(results)).toEqual(["Alice"]);
    expect(results[0]?.rank).toBe(1);
    expect(results[1]?.rank).toBe(2);
  });

  it("keeps a tie when totals and best-area scores match", () => {
    const results = rankFinishedPlayers([
      {
        id: "p1",
        name: "Alice",
        total: 65,
        colors: { yellow: 50, blue: 15, green: 0, orange: 0, purple: 0 },
        foxCount: 0,
        foxScore: 0,
      },
      {
        id: "p2",
        name: "Bob",
        total: 65,
        colors: { yellow: 10, blue: 50, green: 5, orange: 0, purple: 0 },
        foxCount: 0,
        foxScore: 0,
      },
    ]);

    expect(results[0]?.rank).toBe(1);
    expect(results[1]?.rank).toBe(1);
    expect(winnerNames(results)).toEqual(["Alice", "Bob"]);
  });

  it("does not prefer any color when breaking ties on best-area score", () => {
    const results = rankFinishedPlayers([
      {
        id: "p1",
        name: "Alice",
        total: 100,
        colors: { yellow: 20, blue: 20, green: 20, orange: 50, purple: 10 },
        foxCount: 0,
        foxScore: 0,
      },
      {
        id: "p2",
        name: "Bob",
        total: 100,
        colors: { yellow: 40, blue: 20, green: 20, orange: 20, purple: 10 },
        foxCount: 0,
        foxScore: 0,
      },
      {
        id: "p3",
        name: "Cara",
        total: 100,
        colors: { yellow: 20, blue: 20, green: 20, orange: 20, purple: 45 },
        foxCount: 0,
        foxScore: 0,
      },
    ]);

    expect(winnerNames(results)).toEqual(["Alice"]);
    expect(results[0]?.rank).toBe(1);
    expect(results[1]?.rank).toBe(2);
    expect(results[2]?.rank).toBe(3);
  });
});
