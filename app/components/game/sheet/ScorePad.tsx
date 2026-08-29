"use client";

import {
  BLUE_SCORE_BY_MARKS,
  GREEN_SCORES,
  ORANGE_MULTIPLIERS,
  YELLOW_COLUMN_SCORES,
} from "@/lib/engine/constants";
import {
  BLUE_ROW_BONUSES,
  BLUE_COLUMN_BONUSES,
  BLUE_ROWS,
  GREEN_SLOT_BONUSES,
  ORANGE_SLOT_BONUSES,
  PURPLE_SLOT_BONUSES,
  YELLOW_DIAGONAL_BONUS,
  YELLOW_DIAGONAL_CELLS,
  YELLOW_ROW_BONUSES,
} from "@/lib/engine/bonuses";
import { colorScores, scoreSheet } from "@/lib/engine/scoring";
import { rightmostGreenIndex } from "@/lib/engine/sheet";
import type { ColorArea, Sheet } from "@/lib/engine/types";
import {
  crossOptionKey,
  type SheetCrossOption,
} from "@/lib/ui/cross-options";
import {
  BlueDieHint,
  BonusIcon,
  ColumnSeal,
  StarBadge,
  TrackArrow,
  TrackSeparator,
} from "@/app/components/game/sheet/PadIcons";
import { SheetCell } from "@/app/components/game/sheet/SheetCell";
import "./score-pad.css";

type ScorePadProps = {
  sheet: Sheet;
  title: string;
  highlight?: boolean;
  crossOptions?: SheetCrossOption[];
  onCross?: (option: SheetCrossOption) => void;
};

export function ScorePad({
  sheet,
  title,
  highlight = false,
  crossOptions = [],
  onCross,
}: ScorePadProps) {
  const optionSet = new Set(crossOptions.map(crossOptionKey));
  const scores = colorScores(sheet);
  const greenHighlight = rightmostGreenIndex(sheet);

  function isActive(color: ColorArea, targetIndex: number, value: number): boolean {
    return optionSet.has(crossOptionKey({ color, targetIndex, value }));
  }

  function handleCross(color: ColorArea, targetIndex: number, value: number) {
    const option = crossOptions.find(
      (entry) =>
        entry.color === color &&
        entry.targetIndex === targetIndex &&
        entry.value === value,
    );
    if (option) {
      onCross?.(option);
    }
  }

  return (
    <div className={["score-pad", highlight ? "score-pad--highlight" : ""].join(" ")}>
      <div className="score-pad__paper">
        <header className="score-pad__header">
          <h3 className="score-pad__title">{title}</h3>
          <span className="score-pad__total">{scoreSheet(sheet)} pts</span>
        </header>

        <div className="score-pad__top">
          <YellowBlock sheet={sheet} isActive={isActive} onCross={handleCross} />
          <BlueBlock sheet={sheet} isActive={isActive} onCross={handleCross} />
        </div>

        <div className="score-pad__tracks">
          <GreenTrack
            sheet={sheet}
            greenHighlight={greenHighlight}
            isActive={isActive}
            onCross={handleCross}
          />
          <OrangeTrack sheet={sheet} isActive={isActive} onCross={handleCross} />
          <PurpleTrack sheet={sheet} isActive={isActive} onCross={handleCross} />
        </div>

        <footer className="score-pad__footer">
          <div className="score-pad__actions">
            <span className="score-pad__action-chip">🦊 {sheet.foxes}</span>
            <span className="score-pad__action-chip">+1 ×{sheet.plusOnes}</span>
            <span className="score-pad__action-chip">↻ ×{sheet.rerolls}</span>
            <span className="score-pad__action-chip">＋die ×{sheet.extraDice}</span>
          </div>
          <div className="score-pad__color-scores">
            {(
              [
                ["yellow", scores.yellow, "#f7e047"],
                ["blue", scores.blue, "#5b9bd5"],
                ["green", scores.green, "#6fbf73"],
                ["orange", scores.orange, "#f4a261"],
                ["purple", scores.purple, "#b185db"],
              ] as const
            ).map(([name, value, dot]) => (
              <span key={name} className="score-pad__color-score">
                <span className="score-pad__color-dot" style={{ background: dot }} />
                {value}
              </span>
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
}

type CrossHandler = (color: ColorArea, targetIndex: number, value: number) => void;
type ActiveCheck = (color: ColorArea, targetIndex: number, value: number) => boolean;

function YellowBlock({
  sheet,
  isActive,
  onCross,
}: {
  sheet: Sheet;
  isActive: ActiveCheck;
  onCross: CrossHandler;
}) {
  return (
    <section className="pad-zone pad-zone--yellow">
      <div className="pad-yellow-layout">
        <div className="pad-yellow-grid-wrap">
          <div className="pad-yellow-grid">
            {sheet.yellow.grid.flatMap((row, rowIndex) =>
              row.map((cell, colIndex) => {
                const index = rowIndex * row.length + colIndex;
                const active = isActive("yellow", index, cell.value);
                return (
                  <SheetCell
                    key={index}
                    color="yellow"
                    value={cell.value}
                    crossed={cell.crossed}
                    active={active}
                    disabled={!active}
                    diagonal={(YELLOW_DIAGONAL_CELLS as readonly number[]).includes(
                      index,
                    )}
                    onClick={
                      active
                        ? () => onCross("yellow", index, cell.value)
                        : undefined
                    }
                  />
                );
              }),
            )}
          </div>
          <div className="pad-yellow-cols">
            {YELLOW_COLUMN_SCORES.map((score, index) => (
              <ColumnSeal
                key={score}
                value={score}
                claimed={sheet.yellow.columnScored[index]}
              />
            ))}
          </div>
          <div className="pad-yellow-diagonal">
            <span className="pad-arrow">↘</span>
            <BonusIcon
              effect={YELLOW_DIAGONAL_BONUS}
              claimed={sheet.claims.yellowDiagonal}
            />
          </div>
        </div>
        <div className="pad-yellow-rows">
          {YELLOW_ROW_BONUSES.map((bonus, rowIndex) => (
            <div key={rowIndex} className="pad-yellow-row-bonus">
              <span className="pad-arrow">→</span>
              <BonusIcon
                effect={bonus}
                claimed={sheet.claims.yellowRows[rowIndex]}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BlueBlock({
  sheet,
  isActive,
  onCross,
}: {
  sheet: Sheet;
  isActive: ActiveCheck;
  onCross: CrossHandler;
}) {
  return (
    <section className="pad-zone pad-zone--blue">
      <div className="pad-blue-scale">
        <div className="pad-blue-scale__stars">
          {BLUE_SCORE_BY_MARKS.slice(1).map((score, index) => (
            <StarBadge key={index} value={score} tone="blue" />
          ))}
        </div>
        <div className="pad-blue-scale__counts">
          {BLUE_SCORE_BY_MARKS.slice(1).map((_, index) => (
            <span key={index}>{index + 1}</span>
          ))}
        </div>
      </div>
      <div className="pad-blue-body">
        <div className="pad-blue-grid">
          {BLUE_ROWS.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className={[
                "pad-blue-row",
                rowIndex === 2 ? "pad-blue-row--offset" : "",
              ].join(" ")}
            >
              {rowIndex === 0 && <BlueDieHint />}
              {row.map((index) => {
                const box = sheet.blue.boxes[index];
                const active = isActive("blue", index, box.sum);
                return (
                  <SheetCell
                    key={index}
                    color="blue"
                    value={box.sum}
                    crossed={box.crossed}
                    active={active}
                    disabled={!active}
                    onClick={
                      active ? () => onCross("blue", index, box.sum) : undefined
                    }
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="pad-blue-row-bonuses">
          {BLUE_ROW_BONUSES.map((bonus, rowIndex) => (
            <div key={rowIndex} className="pad-yellow-row-bonus">
              <span className="pad-arrow">→</span>
              <BonusIcon
                effect={bonus}
                claimed={sheet.claims.blueRows[rowIndex]}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="pad-blue-cols">
        {BLUE_COLUMN_BONUSES.map((bonus, colIndex) => (
          <div key={colIndex} className="pad-blue-col-bonus">
            <span className="pad-arrow">↓</span>
            <BonusIcon
              effect={bonus}
              claimed={sheet.claims.blueColumns[colIndex]}
              size="sm"
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function GreenTrack({
  sheet,
  greenHighlight,
  isActive,
  onCross,
}: {
  sheet: Sheet;
  greenHighlight: number;
  isActive: ActiveCheck;
  onCross: CrossHandler;
}) {
  return (
    <section className="pad-track pad-track--green">
      <div className="pad-track__inner">
        <TrackArrow tone="green" />
        {sheet.green.boxes.map((box, index) => {
          const active = isActive("green", index, box.threshold);
          const bonus = GREEN_SLOT_BONUSES[index];
          return (
            <div key={index} className="pad-track__slot">
              <StarBadge
                value={GREEN_SCORES[index]}
                tone="green"
                claimed={index === greenHighlight && box.crossed}
              />
              <SheetCell
                color="green"
                prefix="≥"
                value={box.threshold}
                crossed={box.crossed}
                active={active}
                disabled={!active}
                onClick={
                  active
                    ? () => onCross("green", index, box.threshold)
                    : undefined
                }
              />
              {bonus && (
                <BonusIcon
                  effect={bonus}
                  size="sm"
                  claimed={box.crossed}
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function OrangeTrack({
  sheet,
  isActive,
  onCross,
}: {
  sheet: Sheet;
  isActive: ActiveCheck;
  onCross: CrossHandler;
}) {
  return (
    <section className="pad-track pad-track--orange">
      <div className="pad-track__inner">
        <TrackArrow tone="orange" />
        {sheet.orange.boxes.map((box, index) => {
          const crossValue = box.value ?? 6;
          const active = isActive("orange", index, crossValue);
          const bonus = ORANGE_SLOT_BONUSES[index];
          const multiplier = ORANGE_MULTIPLIERS[index];
          return (
            <div key={index} className="pad-track__slot">
              <SheetCell
                color="orange"
                value={box.value ?? ""}
                watermark={box.value === null ? `×${multiplier}` : undefined}
                filled={box.value !== null}
                active={active}
                disabled={!active}
                onClick={
                  active
                    ? () => onCross("orange", index, crossValue)
                    : undefined
                }
              />
              {bonus && (
                <BonusIcon
                  effect={bonus}
                  size="sm"
                  claimed={box.value !== null}
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PurpleTrack({
  sheet,
  isActive,
  onCross,
}: {
  sheet: Sheet;
  isActive: ActiveCheck;
  onCross: CrossHandler;
}) {
  return (
    <section className="pad-track pad-track--purple">
      <div className="pad-track__inner">
        <TrackArrow tone="purple" />
        {sheet.purple.boxes.flatMap((box, index) => {
          const crossValue = box.value ?? 6;
          const active = isActive("purple", index, crossValue);
          const bonus = PURPLE_SLOT_BONUSES[index];
          const slot = (
            <div key={`slot-${index}`} className="pad-track__slot">
              <SheetCell
                color="purple"
                value={box.value ?? ""}
                filled={box.value !== null}
                active={active}
                disabled={!active}
                onClick={
                  active
                    ? () => onCross("purple", index, crossValue)
                    : undefined
                }
              />
              {bonus && (
                <BonusIcon
                  effect={bonus}
                  size="sm"
                  claimed={box.value !== null}
                />
              )}
            </div>
          );
          if (index === 0) {
            return [slot];
          }
          return [
            <TrackSeparator key={`sep-${index}`} tone="purple" />,
            slot,
          ];
        })}
      </div>
    </section>
  );
}
