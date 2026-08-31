type ActionStockProps = {
  plusOnes: number;
  rerolls: number;
  extraDice?: number;
  size?: "sm" | "md";
};

export function ActionStock({
  plusOnes,
  rerolls,
  extraDice = 0,
  size = "md",
}: ActionStockProps) {
  const plusOneTotal = plusOnes + extraDice;

  return (
    <div
      className={["action-stock", size === "sm" ? "action-stock--sm" : ""].join(
        " ",
      )}
      aria-label={`+1 remaining ${plusOneTotal}, rerolls remaining ${rerolls}`}
    >
      <StockItem kind="plus-one" label="+1" count={plusOneTotal} />
      <StockItem kind="reroll" label="Reroll" count={rerolls} />
    </div>
  );
}

function StockItem({
  kind,
  label,
  count,
}: {
  kind: "plus-one" | "reroll";
  label: string;
  count: number;
}) {
  return (
    <span
      className={[
        "action-stock__item",
        `action-stock__item--${kind}`,
        count === 0 ? "action-stock__item--empty" : "",
      ].join(" ")}
      data-token={kind}
      data-count={count}
    >
      <span className="action-stock__label">{label}</span>
      <span className="action-stock__count">{count}</span>
    </span>
  );
}
