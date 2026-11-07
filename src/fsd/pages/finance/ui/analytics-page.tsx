import { calculateBudget, type FinanceData } from "@/entities/finance";
import { amountLabel, daysLabel, EmptyState, Fact } from "./finance-page-shared";

export function AnalyticsPage({
  data,
  summary,
  onSalary,
}: {
  data: FinanceData;
  summary: ReturnType<typeof calculateBudget> | undefined;
  onSalary: () => void;
}) {
  return (
    <div className="analytics-grid">
      <section className="panel analytics-panel">
        <div className="panel-heading">
          <div>
            <h2>Spending by category</h2>
            <p>Confirmed expenses in the active salary period</p>
          </div>
        </div>
        {!summary ? (
          <EmptyState
            title="No salary period configured"
            text="Configure your pay dates before viewing period analytics."
            action="Configure salary period"
            onAction={onSalary}
          />
        ) : summary.categoryTotals.length ? (
          <div className="category-chart">
            {summary.categoryTotals.map((item) => (
              <div className="category-bar" key={item.category}>
                <div>
                  <b>{item.category}</b>
                  <span>{amountLabel(item.amountMinor, summary.currency)}</span>
                </div>
                <i
                  style={{
                    width: `${Math.max(2, (item.amountMinor / Math.max(1, summary.categoryTotals[0].amountMinor)) * 100)}%`,
                  }}
                />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No confirmed spending yet"
            text="Your category chart will use confirmed expenses from this period."
          />
        )}
      </section>
      <section className="panel analytics-panel">
        <div className="panel-heading">
          <div>
            <h2>Salary period</h2>
            <p>Current period calculations</p>
          </div>
        </div>
        {summary && data.salaryPeriods.length ? (
          <div className="analytics-facts">
            <Fact label="Days until salary" value={daysLabel(summary.daysUntilSalary)} />
            <Fact
              label="Confirmed expenses"
              value={amountLabel(summary.confirmedExpensesMinor, summary.currency)}
            />
            <Fact label="Refunds" value={amountLabel(summary.refundsMinor, summary.currency)} />
            <Fact
              label="Projected at payday"
              value={amountLabel(summary.projectedRemainingMinor, summary.currency)}
            />
          </div>
        ) : (
          <EmptyState
            title="No period activity available"
            text="Enter a salary period and confirmed income to calculate projections."
            action="Configure salary period"
            onAction={onSalary}
          />
        )}
      </section>
    </div>
  );
}
