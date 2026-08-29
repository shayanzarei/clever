"use client";

import { Fragment } from "react";
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
  YELLOW_ROW_BONUSES,
} from "@/lib/engine/bonuses";
import { colorScores, scoreSheet } from "@/lib/engine/scoring";
import { rightmostGreenIndex } from "@/lib/engine/sheet";
import type { ColorArea, Effect, Sheet } from "@/lib/engine/types";
import {
  crossOptionKey,
  type SheetCrossOption,
} from "@/lib/ui/cross-options";
import {
  BlueDieHint,
  BonusIcon,
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
  const blueMarks = sheet.blue.boxes.filter((box) => box.crossed).length;

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

        <div className="score-pad__board">
          <div className="score-pad__row score-pad__row--grids">
            <YellowBlock sheet={sheet} isActive={isActive} onCross={handleCross} />
            <BlueBlock
              sheet={sheet}
              blueMarks={blueMarks}
              isActive={isActive}
              onCross={handleCross}
            />
          </div>

          <div className="score-pad__row score-pad__row--tracks">
            <GreenTrack
              sheet={sheet}
              isActive={isActive}
              onCross={handleCross}
            />
            <OrangeTrack sheet={sheet} isActive={isActive} onCross={handleCross} />
            <PurpleTrack sheet={sheet} isActive={isActive} onCross={handleCross} />
          </div>
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
                ["yellow", scores.yellow, "var(--fox-yellow)"],
                ["blue", scores.blue, "var(--fox-blue)"],
                ["green", scores.green, "var(--fox-green)"],
                ["orange", scores.orange, "var(--fox-orange)"],
                ["purple", scores.purple, "var(--fox-purple)"],
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

function ZoneLabel({ children }: { children: string }) {
  return <div className="pad-zone__label">{children}</div>;
}

function ZoneBadge({
  effect,
  claimed = false,
}: {
  effect: Effect;
  claimed?: boolean;
}) {
  return (
    <div className={["pad-zone-badge", claimed ? "pad-zone-badge--claimed" : ""].join(" ")}>
      <BonusIcon effect={effect} claimed={claimed} size="sm" />
    </div>
  );
}

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
      <ZoneLabel>YELLOW</ZoneLabel>
      <div className="pad-yellow__grid">
        {sheet.yellow.grid.flatMap((row, rowIndex) => [
          ...row.map((cell, colIndex) => {
            const index = rowIndex * row.length + colIndex;
            const active = isActive("yellow", index, cell.value);
            return (
              <SheetCell
                key={index}
                color="yellow"
                value={cell.value}
                crossed={cell.crossed}
                preprinted={cell.preprinted}
                active={active}
                disabled={!active || cell.preprinted}
                onClick={
                  active ? () => onCross("yellow", index, cell.value) : undefined
                }
              />
            );
          }),
          <ZoneBadge
            key={`row-bonus-${rowIndex}`}
            effect={YELLOW_ROW_BONUSES[rowIndex]}
            claimed={sheet.claims.yellowRows[rowIndex]}
          />,
        ])}
      </div>
      <div className="pad-yellow__footer">
        {YELLOW_COLUMN_SCORES.map((score, index) => (
          <div
            key={score}
            className={[
              "pad-yellow__col-score",
              sheet.yellow.columnScored[index] ? "pad-yellow__col-score--claimed" : "",
            ].join(" ")}
          >
            {score}
          </div>
        ))}
        <div
          className={[
            "pad-yellow__plus-one",
            sheet.claims.yellowDiagonal ? "pad-yellow__plus-one--claimed" : "",
          ].join(" ")}
          aria-hidden
        >
          +1
        </div>
      </div>
    </section>
  );
}

function BlueBlock({
  sheet,
  blueMarks,
  isActive,
  onCross,
}: {
  sheet: Sheet;
  blueMarks: number;
  isActive: ActiveCheck;
  onCross: CrossHandler;
}) {
  const scale = BLUE_SCORE_BY_MARKS.slice(1);

  return (
    <section className="pad-zone pad-zone--blue">
      <ZoneLabel>BLUE</ZoneLabel>

      <div className="pad-blue__stars">
        {scale.map((score, index) => (
          <div
            key={score}
            className={[
              "pad-blue__star",
              index < blueMarks ? "pad-blue__star--lit" : "",
            ].join(" ")}
          >
            {score}
          </div>
        ))}
      </div>

      <div className="pad-blue__grid">
        {BLUE_ROWS.map((row, rowIndex) => (
          <Fragment key={rowIndex}>
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
            <ZoneBadge
              effect={BLUE_ROW_BONUSES[rowIndex]}
              claimed={sheet.claims.blueRows[rowIndex]}
            />
          </Fragment>
        ))}
      </div>

      <div className="pad-blue__footer">
        {BLUE_COLUMN_BONUSES.map((bonus, colIndex) => (
          <ZoneBadge
            key={colIndex}
            effect={bonus}
            claimed={sheet.claims.blueColumns[colIndex]}
          />
        ))}
        <span aria-hidden />
      </div>
    </section>
  );
}

function GreenTrack({
  sheet,
  isActive,
  onCross,
}: {
  sheet: Sheet;
  isActive: ActiveCheck;
  onCross: CrossHandler;
}) {
  const scoredIndex = rightmostGreenIndex(sheet);

  return (
    <section className="pad-track pad-track--green">
      <ZoneLabel>GREEN</ZoneLabel>
      <div className="pad-track__scale">
        {GREEN_SCORES.map((score, index) => (
          <div
            key={score}
            className={[
              "pad-track__scale-item",
              index <= scoredIndex ? "pad-track__scale-item--lit" : "",
            ].join(" ")}
          >
            {score}
          </div>
        ))}
      </div>
      <div className="pad-track__row">
        {sheet.green.boxes.map((box, index) => {
          const active = isActive("green", index, box.threshold);
          const bonus = GREEN_SLOT_BONUSES[index];
          const clickable = active;
          return (
            <button
              key={index}
              type="button"
              disabled={!clickable}
              onClick={
                clickable
                  ? () => onCross("green", index, box.threshold)
                  : undefined
              }
              className={[
                "pad-track__box",
                box.crossed ? "pad-track__box--crossed" : "",
                active ? "pad-track__box--active" : "",
                clickable ? "pad-track__box--clickable" : "",
              ].join(" ")}
            >
              <span className="pad-track__value">≥{box.threshold}</span>
              {bonus && (
                <span className="pad-track__badge">
                  <BonusIcon effect={bonus} size="sm" claimed={box.crossed} />
                </span>
              )}
            </button>
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
      <ZoneLabel>ORANGE</ZoneLabel>
      <div className="pad-track__row">
        {sheet.orange.boxes.map((box, index) => {
          const crossValue = box.value ?? 6;
          const active = isActive("orange", index, crossValue);
          const bonus = ORANGE_SLOT_BONUSES[index];
          const multiplier = ORANGE_MULTIPLIERS[index];
          const clickable = active;
          return (
            <button
              key={index}
              type="button"
              disabled={!clickable}
              onClick={
                clickable
                  ? () => onCross("orange", index, crossValue)
                  : undefined
              }
              className={[
                "pad-track__box",
                box.value !== null ? "pad-track__box--filled" : "",
                active ? "pad-track__box--active" : "",
                clickable ? "pad-track__box--clickable" : "",
              ].join(" ")}
            >
              {box.value !== null && (
                <span className="pad-track__value">{box.value}</span>
              )}
              {box.value === null && multiplier > 1 && (
                <span className="pad-track__watermark">×{multiplier}</span>
              )}
              {bonus && (
                <span className="pad-track__badge">
                  <BonusIcon
                    effect={bonus}
                    size="sm"
                    claimed={box.value !== null}
                  />
                </span>
              )}
            </button>
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
      <ZoneLabel>PURPLE</ZoneLabel>
      <div className="pad-track__row">
        {sheet.purple.boxes.map((box, index) => {
          const crossValue = box.value ?? 6;
          const active = isActive("purple", index, crossValue);
          const bonus = PURPLE_SLOT_BONUSES[index];
          const clickable = active;
          return (
            <button
              key={index}
              type="button"
              disabled={!clickable}
              onClick={
                clickable
                  ? () => onCross("purple", index, crossValue)
                  : undefined
              }
              className={[
                "pad-track__box",
                box.value !== null ? "pad-track__box--filled" : "",
                active ? "pad-track__box--active" : "",
                clickable ? "pad-track__box--clickable" : "",
              ].join(" ")}
            >
              {box.value !== null && (
                <span className="pad-track__value">{box.value}</span>
              )}
              {index > 0 && <span className="pad-track__connector" aria-hidden />}
              {bonus && (
                <span className="pad-track__badge">
                  <BonusIcon
                    effect={bonus}
                    size="sm"
                    claimed={box.value !== null}
                  />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
