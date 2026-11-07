import { calculateAccountBalance, type AccountRecord, type FinanceData } from "@/entities/finance";
import { accountTypeLabel, amountLabel, EmptyState, Icon } from "./finance-page-shared";

export function AccountsPage({
  data,
  onAdd,
  onEdit,
  onDelete,
}: {
  data: FinanceData;
  onAdd: () => void;
  onEdit: (item: AccountRecord) => void;
  onDelete: (item: AccountRecord) => void;
}) {
  return (
    <>
      <div className="accounts-header">
        <div>
          <h2>Accounts you entered</h2>
          <p>Balances and account details stay in this session.</p>
        </div>
        <button className="primary-button" onClick={onAdd}>
          <Icon name="plus" size={16} /> Add account
        </button>
      </div>
      {data.accounts.length ? (
        <div className="account-grid">
          {data.accounts.map((account) => (
            <article className="account-card" key={account.id}>
              <div className="account-top">
                <div className="bank-logo">{account.type === "CASH" ? "◌" : "▤"}</div>
                <span className="account-kind">{accountTypeLabel(account.type)}</span>
              </div>
              <h3>{account.name}</h3>
              <div className="account-balance">
                {amountLabel(calculateAccountBalance(data, account.id) || 0, account.currency)}
              </div>
              <div className="account-bottom">
                <span>Session balance</span>
                <span>
                  <button onClick={() => onEdit(account)}>Edit</button>
                  <button onClick={() => onDelete(account)}>Delete</button>
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="panel">
          <EmptyState
            title="No accounts entered"
            text="Add cash or an account you manage. Finora will not connect to a bank in Local-only mode."
            action="Add account"
            onAction={onAdd}
          />
        </div>
      )}
      <p className="account-footnote">
        Balances start from the amount you enter and change with confirmed income, expenses, refunds
        and transfers. No external balances are fetched.
      </p>
    </>
  );
}
