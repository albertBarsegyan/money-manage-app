import {
  calculateBudget,
  type FinanceData,
  type SalaryPeriod,
} from "@/entities/finance";
import { amountLabel, displayDate, EmptyState, Icon } from "./finance-page-shared";

export function SalaryPeriodsPage({
  periods,
  data,
  today,
  onAdd,
  onEdit,
  onDelete,
}: {
  periods: SalaryPeriod[];
  data: FinanceData;
  today: string;
  onAdd: () => void;
  onEdit: (period: SalaryPeriod) => void;
  onDelete: (period: SalaryPeriod) => void;
}) {
  const ordered = [...periods].sort((a, b) => b.startsOn.localeCompare(a.startsOn));
  return (
    <section className="panel table-panel">
      <div className="panel-heading">
        <div>
          <h2>Salary periods</h2>
          <p>Review each pay period’s starting amount, expenses, and remaining balance.</p>
        </div>
        <button className="primary-button" onClick={onAdd}>
          <Icon name="plus" size={16} /> Add salary period
        </button>
      </div>
      {ordered.length ? (
        <div className="salary-period-list">
          {ordered.map((period) => {
            const asOf =
              today < period.startsOn
                ? period.startsOn
                : today >= period.nextSalaryOn
                  ? new Date(Date.parse(`${period.nextSalaryOn}T00:00:00Z`) - 86_400_000)
                      .toISOString()
                      .slice(0, 10)
                  : today;
            const summary = calculateBudget(data, period, asOf);
            const isCurrent = period.startsOn <= today && today < period.nextSalaryOn;
            return (
              <article className="salary-period-card" key={period.id}>
                <div className="salary-period-title">
                  <div>
                    <b>{period.name}</b>
                    <span>
                      {displayDate(period.startsOn)} — {displayDate(period.nextSalaryOn)}
                    </span>
                  </div>
                  {isCurrent && <span className="status-pill received">Current</span>}
                </div>
                <div className="salary-period-metrics">
                  <div>
                    <small>Expected salary</small>
                    <b>
                      {period.expectedSalaryMinor === undefined
                        ? "—"
                        : amountLabel(period.expectedSalaryMinor, period.currency)}
                    </b>
                  </div>
                  <div>
                    <small>Confirmed expenses</small>
                    <b>{amountLabel(summary.confirmedExpensesMinor, period.currency)}</b>
                  </div>
                  <div>
                    <small>Remaining</small>
                    <b>{amountLabel(summary.remainingMinor, period.currency)}</b>
                  </div>
                  <div>
                    <small>Daily budget now</small>
                    <b>
                      {isCurrent
                        ? amountLabel(summary.dailyBaseAllowanceMinor, period.currency)
                        : "—"}
                    </b>
                  </div>
                </div>
                <div className="salary-period-actions">
                  <button onClick={() => onEdit(period)}>Edit</button>
                  <button onClick={() => onDelete(period)}>Delete</button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No salary periods yet"
          text="Add a period with its dates and expected salary to start a budget."
          action="Add salary period"
          onAction={onAdd}
        />
      )}
    </section>
  );
}
