import {
  calculateBudget,
  type FinanceData,
  type IncomeRecord,
  type SalaryPeriod,
} from "@/entities/finance";
import type { View } from "./finance.types";
import {
  amountLabel,
  currencySymbol,
  daysLabel,
  displayDate,
  sourceLabel,
  Icon,
  EmptyState,
} from "./finance-page-shared";
import { TransactionRows } from "./transaction-rows";

export function Overview({
  data,
  summary,
  activeSalary,
  expectedIncome,
  onIncome,
  onExpense,
  onSalary,
  onView,
}: {
  data: FinanceData;
  summary: ReturnType<typeof calculateBudget> | undefined;
  activeSalary: SalaryPeriod | undefined;
  expectedIncome: IncomeRecord[];
  onIncome: () => void;
  onExpense: () => void;
  onSalary: () => void;
  onView: (view: View) => void;
}) {
  const recent = [...data.expenses]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, 5);
  return (
    <>
      {activeSalary && summary ? (
        <section className="overview-grid">
          <div className="balance-card">
            <div className="card-top">
              <span>Remaining this salary period</span>
              <span className="period-chip">{activeSalary.name}</span>
            </div>
            <div className="balance-value">
              <span className="currency-sign">{currencySymbol(summary.currency)}</span>
              {amountLabel(Math.abs(summary.remainingMinor), summary.currency).replace(
                /[^\d,.-]/g,
                "",
              )}
              {summary.remainingMinor < 0 && <span className="over-label">over budget</span>}
            </div>
            <div className="balance-foot">
              <span>
                {summary.daysUntilSalary
                  ? `${daysLabel(summary.daysUntilSalary)} until next salary`
                  : "Salary date is today"}
              </span>
              <span>{summary.periodProgress}% of period</span>
            </div>
            <div className="period-progress">
              <i style={{ width: `${summary.periodProgress}%` }} />
            </div>
            <div className="budget-breakdown">
              <span>
                Confirmed income{" "}
                <b>{amountLabel(summary.confirmedIncomeMinor, summary.currency)}</b>
              </span>
              <span>
                Confirmed expenses{" "}
                <b>{amountLabel(summary.confirmedExpensesMinor, summary.currency)}</b>
              </span>
              <span>
                Refunds <b>{amountLabel(summary.refundsMinor, summary.currency)}</b>
              </span>
            </div>
          </div>
          <div className="side-stats">
            <div className="stat-card daily-budget-card">
              <div className="stat-top">
                <span>Today&apos;s budget</span>
                <span className="stat-icon mint">↘</span>
              </div>
              <div className="daily-budget-breakdown">
                <div className="daily-budget-row">
                  <span>Daily base allowance</span>
                  <b>{amountLabel(summary.dailyBaseAllowanceMinor, summary.currency)}</b>
                </div>
                <div className="daily-budget-row">
                  <span>Previous accumulated carryover</span>
                  <b>{amountLabel(summary.previousCarryoverMinor, summary.currency)}</b>
                </div>
                <div className="daily-budget-row daily-budget-total">
                  <span>Total available today</span>
                  <b>{amountLabel(summary.availableTodayMinor, summary.currency)}</b>
                </div>
                <div className="daily-budget-row">
                  <span>Net spending today</span>
                  <b>{amountLabel(summary.spentTodayMinor, summary.currency)}</b>
                </div>
                <div className="daily-budget-row daily-budget-remaining">
                  <span>Remaining today</span>
                  <b>{amountLabel(summary.remainingTodayMinor, summary.currency)}</b>
                </div>
              </div>
              <small>Today&apos;s unused amount or overspending carries forward at day end.</small>
            </div>
            <div className="stat-card">
              <div className="stat-top">
                <span>Projected at payday</span>
                <span className="stat-icon lilac">⌁</span>
              </div>
              <b>{amountLabel(summary.projectedRemainingMinor, summary.currency)}</b>
              <small>Based on confirmed period activity</small>
            </div>
          </div>
        </section>
      ) : (
        <section className="setup-card">
          <div className="setup-symbol">◷</div>
          <div>
            <div className="eyebrow">START WITH YOUR OWN NUMBERS</div>
            <h2>Set up a salary period</h2>
            <p>
              Add your salary dates and currency to calculate your safe daily spending. Nothing is
              filled in for you.
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
        <button className="quick-action" onClick={onExpense}>
          <span className="quick-icon purple">
            <Icon name="plus" />
          </span>
          <span>
            <b>Log an expense</b>
            <small>Add a purchase or bill</small>
          </span>
          <Icon name="chevron" size={16} />
        </button>
        <button className="quick-action" onClick={onIncome}>
          <span className="quick-icon green">↙</span>
          <span>
            <b>Add income</b>
            <small>Salary and other income</small>
          </span>
          <Icon name="chevron" size={16} />
        </button>
        <button className="quick-action" onClick={() => onView("Accounts")}>
          <span className="quick-icon blue">
            <Icon name="wallet" />
          </span>
          <span>
            <b>Add an account</b>
            <small>Track your own accounts</small>
          </span>
          <Icon name="chevron" size={16} />
        </button>
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
            <TransactionRows items={recent} accounts={data.accounts} />
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
                <div className="income-symbol">↙</div>
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
          <span className="note-star">✳</span>
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
