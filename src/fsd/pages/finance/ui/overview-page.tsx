import {
  calculateBudget,
  type FinanceData,
  type ExpenseBudgetMode,
  type ExpenseRecord,
  type IncomeRecord,
  type SalaryPeriod,
} from "@/entities/finance";
import type { View } from "./finance.types";
import {
  amountLabel,
  daysLabel,
  displayDate,
  sourceLabel,
  Icon,
  EmptyState,
} from "./finance-page-shared";
import { TransactionRows } from "./transaction-rows";
import { DailySpendingCard } from "./daily-spending-card";

export function Overview({
  data,
  summary,
  activeSalary,
  expectedIncome,
  onIncome,
  onExpense,
  onSalary,
  onView,
  onEditExpense,
  onDeleteExpense,
  onConfirmExpense,
  onRejectExpense,
}: {
  data: FinanceData;
  summary: ReturnType<typeof calculateBudget> | undefined;
  activeSalary: SalaryPeriod | undefined;
  expectedIncome: IncomeRecord[];
  onIncome: () => void;
  onExpense: (mode?: ExpenseBudgetMode) => void;
  onSalary: () => void;
  onView: (view: View) => void;
  onEditExpense: (item: ExpenseRecord) => void;
  onDeleteExpense: (item: ExpenseRecord) => void;
  onConfirmExpense: (item: ExpenseRecord) => void;
  onRejectExpense: (item: ExpenseRecord) => void;
}) {
  const recent = [...data.expenses]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, 5);
  return (
    <>
      {activeSalary && summary ? (
        <section className="overview-grid" aria-label="Spending overview">
          <DailySpendingCard
            summary={summary}
            periodName={activeSalary.name}
            onDailyExpense={() => onExpense("DAILY")}
            onGlobalExpense={() => onExpense("GLOBAL")}
          />
          <div className="side-stats period-side-stats">
            <div className="stat-card">
              <div className="stat-top">
                <span>Remaining this period</span>
                <span className="stat-icon mint" aria-hidden="true">
                  ↘
                </span>
              </div>
              <b
                aria-label={`Remaining period budget ${amountLabel(summary.remainingMinor, summary.currency)}`}
              >
                {amountLabel(summary.remainingMinor, summary.currency)}
              </b>
              <small>
                {summary.daysUntilSalary
                  ? `${daysLabel(summary.daysUntilSalary)} until ${displayDate(activeSalary.nextSalaryOn)}`
                  : "Salary date is today"}
              </small>
              <div
                className="period-progress period-progress-light"
                role="progressbar"
                aria-valuenow={summary.periodProgress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${summary.periodProgress}% of salary period elapsed`}
              >
                <i style={{ width: `${summary.periodProgress}%` }} />
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-top">
                <span>Projected at payday</span>
                <span className="stat-icon lilac" aria-hidden="true">
                  ⌁
                </span>
              </div>
              <b>{amountLabel(summary.projectedRemainingMinor, summary.currency)}</b>
              <small>Based on confirmed period activity</small>
            </div>
            <div className="stat-card period-breakdown-card">
              <div className="stat-top">
                <span>Period breakdown</span>
                <span className="period-chip">{activeSalary.name}</span>
              </div>
              <div className="period-breakdown-list">
                <div>
                  <span>Salary and confirmed income</span>
                  <b>{amountLabel(summary.confirmedIncomeMinor, summary.currency)}</b>
                </div>
                <div>
                  <span>Confirmed expenses</span>
                  <b>{amountLabel(summary.confirmedExpensesMinor, summary.currency)}</b>
                </div>
                <div>
                  <span>Refunds</span>
                  <b>{amountLabel(summary.refundsMinor, summary.currency)}</b>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="setup-card">
          <div className="setup-symbol" aria-hidden="true">
            ◷
          </div>
          <div>
            <div className="eyebrow">START WITH YOUR OWN NUMBERS</div>
            <h2>Set up a salary period</h2>
            <p>
              Add your expected salary and pay dates to set a starting budget. Confirmed expenses
              then reduce it and update how much you can spend today.
            </p>
            <button className="primary-button" onClick={onSalary}>
              <Icon name="plus" size={16} /> Configure salary period
            </button>
          </div>
        </section>
      )}
      <section className="quick-actions">
        <div>
          <div className="eyebrow">QUICK ACTIONS</div>
          <h2>Manage your money</h2>
        </div>
        <div className="quick-action-list">
          <button className="quick-action" onClick={() => onExpense("DAILY")}>
            <span className="quick-icon purple" aria-hidden="true">
              <Icon name="plus" />
            </span>
            <span>
              <b>Log a daily expense</b>
              <small>Uses today’s spending allowance</small>
            </span>
            <Icon name="chevron" size={16} />
          </button>
          <button className="quick-action" onClick={() => onExpense("GLOBAL")}>
            <span className="quick-icon blue" aria-hidden="true">
              <Icon name="plus" />
            </span>
            <span>
              <b>Log a global expense</b>
              <small>Recalculates the period budget</small>
            </span>
            <Icon name="chevron" size={16} />
          </button>
          <button className="quick-action" onClick={onIncome}>
            <span className="quick-icon green" aria-hidden="true">
              ↙
            </span>
            <span>
              <b>Add income</b>
              <small>Salary and other income</small>
            </span>
            <Icon name="chevron" size={16} />
          </button>
        </div>
      </section>
      <section className="lower-grid">
        <div className="panel recent-panel">
          <div className="panel-heading">
            <div>
              <h2>Recent activity</h2>
              <p>Transactions stored on this device</p>
            </div>
            <button className="text-link" onClick={() => onView("Transactions")}>
              View transactions <Icon name="chevron" size={14} />
            </button>
          </div>
          {recent.length ? (
            <TransactionRows
              items={recent}
              accounts={data.accounts}
              onEdit={onEditExpense}
              onDelete={onDeleteExpense}
              onConfirm={onConfirmExpense}
              onReject={onRejectExpense}
            />
          ) : (
            <EmptyState
              title="No financial activity yet"
              text="When you add a transaction, it will appear here."
              action="Add an expense"
              onAction={onExpense}
            />
          )}
        </div>
        <div className="panel income-panel">
          <div className="panel-heading">
            <div>
              <h2>Expected income</h2>
              <p>Not counted until you confirm receipt</p>
            </div>
            <button className="circle-add" onClick={onIncome} aria-label="Add income">
              <Icon name="plus" size={16} />
            </button>
          </div>
          {expectedIncome.length ? (
            expectedIncome.slice(0, 4).map((item) => (
              <div className="upcoming-row" key={item.id}>
                <div className="income-symbol" aria-hidden="true">
                  ↙
                </div>
                <div className="upcoming-copy">
                  <b>{item.description}</b>
                  <span>
                    {sourceLabel(item.source)} ·{" "}
                    {item.expectedOn ? displayDate(item.expectedOn) : "Date not set"}
                  </span>
                </div>
                <b className="upcoming-amount">+{amountLabel(item.amountMinor, item.currency)}</b>
              </div>
            ))
          ) : (
            <EmptyState
              title="No expected income"
              text="Add an expected salary or other income to plan ahead."
              action="Add income"
              onAction={onIncome}
            />
          )}
          <button className="income-link" onClick={() => onView("Income")}>
            Manage income <Icon name="chevron" size={14} />
          </button>
        </div>
      </section>
      {summary && (
        <section className="period-note">
          <span className="note-star" aria-hidden="true">
            ✳
          </span>
          <span>
            <b>Pending transactions do not affect your budget.</b> Confirm a transaction after
            reviewing it.
          </span>
          <button onClick={() => onView("Transactions")}>
            Review activity <Icon name="chevron" size={14} />
          </button>
        </section>
      )}
    </>
  );
}
