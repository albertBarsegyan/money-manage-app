import type { AccountRecord, ExpenseRecord } from "@/entities/finance";
import { accountName, amountLabel, displayDate, sourceLabel } from "./finance-page-shared";

export function TransactionRows({
  items,
  accounts,
  onEdit,
  onDelete,
  onConfirm,
  onReject,
}: {
  items: ExpenseRecord[];
  accounts: AccountRecord[];
  onEdit?: (item: ExpenseRecord) => void;
  onDelete?: (item: ExpenseRecord) => void;
  onConfirm?: (item: ExpenseRecord) => void;
  onReject?: (item: ExpenseRecord) => void;
}) {
  return (
    <div className="transaction-list">
      {items.map((item) => (
        <div className="transaction-row" key={item.id}>
          <div
            className={`transaction-icon ${item.type === "INCOME" || item.type === "REFUND" ? "tx-income" : item.type === "TRANSFER" ? "tx-bill" : "tx-expense"}`}
          >
            {item.type === "INCOME"
              ? "↙"
              : item.type === "REFUND"
                ? "↶"
                : item.type === "TRANSFER"
                  ? "⇄"
                  : "•"}
          </div>
          <div className="transaction-main">
            <b>{item.description}</b>
            <span>
              {item.type === "TRANSFER" ? "Transfer" : item.category} ·{" "}
              {accountName(accounts, item.accountId)}
              {item.destinationAccountId
                ? ` → ${accountName(accounts, item.destinationAccountId)}`
                : ""}{" "}
              · {displayDate(item.occurredAt)}
            </span>
          </div>
          <span className={`source-tag ${item.source.toLowerCase()}`}>
            {sourceLabel(item.source)}
          </span>
          <div className="transaction-amount-wrap">
            <b
              className={item.type === "INCOME" || item.type === "REFUND" ? "amount-positive" : ""}
            >
              {item.type === "INCOME" || item.type === "REFUND"
                ? "+"
                : item.type === "TRANSFER"
                  ? "↔ "
                  : "−"}
              {amountLabel(item.amountMinor, item.currency)}
            </b>
            {item.status !== "CONFIRMED" && (
              <small className={`tx-status ${item.status.toLowerCase()}`}>
                {item.reviewStatus === "REJECTED"
                  ? "Rejected"
                  : item.status === "PENDING"
                    ? "Pending review"
                    : "Cancelled"}
              </small>
            )}
          </div>
          <div className="row-actions">
            {item.reviewStatus === "PENDING_REVIEW" && (
              <>
                <button onClick={() => onConfirm?.(item)}>Confirm</button>
                <button onClick={() => onReject?.(item)}>Reject</button>
              </>
            )}
            <button onClick={() => onEdit?.(item)}>Edit</button>
            <button onClick={() => onDelete?.(item)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
