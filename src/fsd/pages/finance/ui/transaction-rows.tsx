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
    <div className="transaction-list" role="list" aria-label="Transactions">
      {items.map((item) => (
        <div className="transaction-row" key={item.id} role="listitem">
          <div
            className={`transaction-icon ${item.type === "INCOME" || item.type === "REFUND" ? "tx-income" : item.type === "TRANSFER" ? "tx-bill" : "tx-expense"}`}
            aria-hidden="true"
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
                <button
                  type="button"
                  aria-label={`Confirm ${item.description}`}
                  onClick={() => onConfirm?.(item)}
                >
                  Confirm
                </button>
                <button
                  type="button"
                  aria-label={`Reject ${item.description}`}
                  onClick={() => onReject?.(item)}
                >
                  Reject
                </button>
              </>
            )}
            <button
              type="button"
              aria-label={`Edit ${item.description}`}
              onClick={() => onEdit?.(item)}
            >
              Edit
            </button>
            <button
              type="button"
              aria-label={`Delete ${item.description}`}
              onClick={() => onDelete?.(item)}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
