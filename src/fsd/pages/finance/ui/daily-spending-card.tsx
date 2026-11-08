import type { calculateBudget } from "@/entities/finance";
import { amountLabel, currencySymbol } from "./finance-page-shared";

type BudgetSummary = NonNullable<ReturnType<typeof calculateBudget>>;

export function DailySpendingCard({
  summary,
  periodName,
  onDailyExpense,
  onGlobalExpense,
}: {
  summary: BudgetSummary;
  periodName: string;
  onDailyExpense: () => void;
  onGlobalExpense: () => void;
}) {
  const available = summary.availableTodayMinor;
  const allowance = summary.dailyAllowanceMinor;
  const spent = summary.spentTodayMinor;
  const progress =
    allowance > 0
      ? Math.min(100, Math.max(0, Math.round((spent / allowance) * 100)))
      : spent > 0
        ? 100
        : 0;
  const overspent = available < 0;
  const moneyText = (amount: number) => amountLabel(amount, summary.currency);

  return (
    <article className="daily-hero-card" aria-labelledby="daily-spend-heading">
      <div className="card-top">
        <div>
          <p className="daily-hero-eyebrow" id="daily-spend-heading">
            Today&apos;s spending
          </p>
          <h2 className="daily-hero-label">Available to spend today</h2>
        </div>
        <span className="period-chip">{periodName}</span>
      </div>

      <p
        className={`daily-hero-amount${overspent ? " is-over" : ""}`}
        aria-label={`Available to spend today ${moneyText(available)}`}
      >
        <span className="currency-sign" aria-hidden="true">
          {currencySymbol(summary.currency)}
        </span>
        <span>{moneyText(Math.abs(available)).replace(/[^\d,.-]/g, "")}</span>
        {overspent && <span className="over-label">overspent</span>}
      </p>

      <div
        className="daily-spend-progress"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Spent ${progress}% of today's allowance`}
      >
        <i style={{ width: `${progress}%` }} className={overspent ? "is-over" : undefined} />
      </div>
      <div className="daily-spend-progress-meta">
        <span>
          Spent today <b>{moneyText(spent)}</b>
        </span>
        <span>
          {overspent ? "Over by" : "Remaining today"} <b>{moneyText(Math.abs(available))}</b>
        </span>
      </div>

      <dl className="daily-hero-breakdown">
        <div>
          <dt>Daily allowance</dt>
          <dd>{moneyText(allowance)}</dd>
        </div>
        <div>
          <dt>Spent today</dt>
          <dd>{moneyText(spent)}</dd>
        </div>
        <div className="daily-hero-remaining-row">
          <dt>Remaining today</dt>
          <dd>{moneyText(available)}</dd>
        </div>
      </dl>

      <p className="daily-hero-note">
        Today’s allowance is the remaining period budget divided by days left. Daily expenses use
        that allowance; global expenses reduce the period budget immediately. Unspent money stays in
        the period balance and is shared across the days remaining.
      </p>

      <div className="daily-expense-actions">
        <button type="button" className="secondary-button" onClick={onDailyExpense}>
          Add daily expense
        </button>
        <button type="button" className="primary-button" onClick={onGlobalExpense}>
          Add global expense
        </button>
      </div>
    </article>
  );
}
