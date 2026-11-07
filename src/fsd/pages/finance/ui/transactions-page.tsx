import type { AccountRecord, ExpenseRecord } from "@/entities/finance";
import { Icon, EmptyState } from "./finance-page-shared";
import { TransactionRows } from "./transaction-rows";

export function TransactionsPage({
  items,
  query,
  setQuery,
  onImport,
  onAdd,
  onEdit,
  onDelete,
  onConfirm,
  onReject,
  accounts,
}: {
  items: ExpenseRecord[];
  query: string;
  setQuery: (value: string) => void;
  onImport: (file?: File) => void;
  onAdd: () => void;
  onEdit: (item: ExpenseRecord) => void;
  onDelete: (item: ExpenseRecord) => void;
  onConfirm: (item: ExpenseRecord) => void;
  onReject: (item: ExpenseRecord) => void;
  accounts: AccountRecord[];
}) {
  return (
    <div className="panel table-panel">
      <div className="panel-heading">
        <div>
          <h2>Transactions</h2>
          <p>Confirmed activity affects calculations. Pending entries stay out until reviewed.</p>
        </div>
        <div className="table-tools">
          <label className="search-box">
            <Icon name="search" size={16} />
            <input
              placeholder="Search this session"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="secondary-button import-button">
            <Icon name="download" size={16} /> Import CSV
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => {
                onImport(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
          <button className="primary-button small-primary" onClick={onAdd}>
            <Icon name="plus" size={15} /> Add expense
          </button>
        </div>
      </div>
      {items.length ? (
        <TransactionRows
          items={items}
          accounts={accounts}
          onEdit={onEdit}
          onDelete={onDelete}
          onConfirm={onConfirm}
          onReject={onReject}
        />
      ) : (
        <EmptyState
          title={query ? "No matching transactions" : "No expenses recorded"}
          text={
            query
              ? "Try another search term."
              : "Add an expense or import a statement. Imported rows wait for your review."
          }
          action={query ? undefined : "Add expense"}
          onAction={query ? undefined : onAdd}
        />
      )}
    </div>
  );
}
