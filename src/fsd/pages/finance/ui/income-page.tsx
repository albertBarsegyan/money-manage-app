import type { FinanceData, IncomeRecord } from "@/entities/finance";
import {
  amountLabel,
  displayDate,
  recurrenceLabel,
  sourceLabel,
  EmptyState,
  Icon,
} from "./finance-page-shared";

export function IncomePage({
  data,
  onAdd,
  onEdit,
  onDelete,
  onConfirm,
}: {
  data: FinanceData;
  onAdd: () => void;
  onEdit: (item: IncomeRecord) => void;
  onDelete: (item: IncomeRecord) => void;
  onConfirm: (item: IncomeRecord) => void;
}) {
  const received = data.income.filter((item) => item.status === "RECEIVED");
  const expected = data.income.filter((item) => item.status === "EXPECTED");
  return (
    <>
      <section className="income-summary">
        <div className="sum-card">
          <span>Income received</span>
          <b>
            {received.length
              ? received.map((i) => amountLabel(i.amountMinor, i.currency)).join(" · ")
              : "—"}
          </b>
          <small>Received records only</small>
        </div>
        <div className="sum-card">
          <span>Expected income</span>
          <b>
            {expected.length
              ? expected.map((i) => amountLabel(i.amountMinor, i.currency)).join(" · ")
              : "—"}
          </b>
          <small>Excluded from available spending</small>
        </div>
        <div className="sum-card">
          <span>Recurring sources</span>
          <b>
            {
              data.income.filter(
                (item) =>
                  item.recurrence && item.recurrence !== "ONE_TIME" && item.status !== "CANCELLED",
              ).length
            }
          </b>
          <small>Schedules you have entered</small>
        </div>
      </section>
      <div className="panel table-panel">
        <div className="panel-heading">
          <div>
            <h2>Income records</h2>
            <p>Salary, freelance, business, bonuses and other income.</p>
          </div>
          <button className="primary-button" onClick={onAdd}>
            <Icon name="plus" size={16} /> Add income
          </button>
        </div>
        {data.income.length ? (
          <div className="income-list">
            {[...data.income]
              .sort((a, b) =>
                (b.expectedOn || b.receivedOn || "").localeCompare(
                  a.expectedOn || a.receivedOn || "",
                ),
              )
              .map((item) => (
                <div className="income-entry" key={item.id}>
                  <div className="income-entry-icon">↙</div>
                  <div className="income-entry-main">
                    <b>{item.description}</b>
                    <span>
                      {sourceLabel(item.source)}
                      {item.recurrence ? ` · ${recurrenceLabel(item.recurrence)}` : ""}
                      {item.salaryPeriodId
                        ? ` · ${data.salaryPeriods.find((p) => p.id === item.salaryPeriodId)?.name || "Salary period"}`
                        : ""}
                    </span>
                  </div>
                  <div className="income-entry-date">
                    <small>
                      {item.status === "RECEIVED"
                        ? "Received"
                        : item.status === "EXPECTED"
                          ? "Expected"
                          : "Cancelled"}
                    </small>
                    <span>
                      {item.status === "RECEIVED"
                        ? item.receivedOn
                          ? displayDate(item.receivedOn)
                          : "Date not set"
                        : item.expectedOn
                          ? displayDate(item.expectedOn)
                          : "Date not set"}
                    </span>
                  </div>
                  <div className="income-entry-amount">
                    +{amountLabel(item.amountMinor, item.currency)}
                  </div>
                  <span className={`status-pill ${item.status.toLowerCase()}`}>{item.status}</span>
                  <div className="row-actions">
                    {item.status === "EXPECTED" && (
                      <button onClick={() => onConfirm(item)}>Confirm received</button>
                    )}
                    <button onClick={() => onEdit(item)}>Edit</button>
                    <button onClick={() => onDelete(item)}>Delete</button>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <EmptyState
            title="No income entered yet"
            text="Add a received or expected income record. Expected income will not increase your available budget."
            action="Add income"
            onAction={onAdd}
          />
        )}
      </div>
    </>
  );
}
