import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { reduce } from "@/lib/engine/reduce";
import { getSheetCrossOptions } from "@/lib/ui/cross-options";
import { ScorePad } from "@/app/components/game/sheet/ScorePad";
import type { DieFace, Game } from "@/lib/engine/types";

const ROLL: DieFace[] = [
  { color: "yellow", value: 2 },
  { color: "blue", value: 3 },
  { color: "green", value: 4 },
  { color: "orange", value: 5 },
  { color: "purple", value: 6 },
  { color: "white", value: 1 },
];

function pickDie(dieId: string): Game {
  const started = reduce({} as Game, {
    type: "START_GAME",
    playerCount: 2,
    playerNames: ["Alice", "Bob"],
  });
  const rolled = reduce(started, { type: "ROLL", values: ROLL });
  return reduce(rolled, {
    type: "CHOOSE_DIE",
    playerId: "p1",
    dieId,
    slotIndex: 0,
  });
}

function renderPad(game: Game): string {
  return renderToStaticMarkup(
    <ScorePad
      sheet={game.players[0].sheet}
      title="Alice"
      crossOptions={getSheetCrossOptions(game, "p1")}
      onCross={() => {}}
    />,
  );
}

/** Buttons React rendered without the `disabled` attribute. */
function enabledCells(html: string): number {
  const cells = html.match(/<button[^>]*pad-cell--active[^>]*>/g) ?? [];
  return cells.filter((tag) => !tag.includes("disabled")).length;
}

describe("score pad interactivity", () => {
  it.each([
    ["die-yellow", 2],
    ["die-blue", 1],
    ["die-white", 3],
  ])("leaves every offered %s cell clickable", (dieId, expected) => {
    const game = pickDie(dieId);
    const html = renderPad(game);

    expect(enabledCells(html)).toBe(expected);
  });

  it("offers the blue+white sum rather than the blue face", () => {
    const game = pickDie("die-blue");
    const [option] = getSheetCrossOptions(game, "p1");

    expect(option).toMatchObject({ color: "blue", value: 4, targetIndex: 2 });
  });

  it("shows remaining +1 and reroll counts on the pad", () => {
    const game = pickDie("die-yellow");
    const html = renderPad(game);

    expect(html).toContain('data-token="plus-one"');
    expect(html).toContain('data-count="1"');
    expect(html).toContain('data-token="reroll"');
    expect(html).not.toContain('data-token="extra-die"');
  });
});
