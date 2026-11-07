# Finora user guide

Finora helps you track money you enter yourself. This guide follows a typical setup, then explains the numbers you will see.

## Before you start

Finora currently saves records in IndexedDB in this browser profile on this device. There is no sign-in, bank connection, cloud sync, or automatic backup. Use the same browser profile to see your saved records again. Clearing site data or using **Settings → Clear Local Data** removes them.

Finora supports AMD, USD, EUR, and GBP. It keeps currencies separate and does not convert between them. For meaningful totals, use a salary period and records in the same currency.

## Set up your finances

### 1. Configure your salary period

From **Overview**, choose **Configure salary period**, or open **Settings** and add a salary period. Enter:

1. A name, such as “Monthly salary.”
2. **Starts on**, the first day covered by this budget period.
3. **Next salary date**, the day you expect the next pay to arrive.
4. The currency used for this period.
5. Optionally, an expected salary amount and recurrence.

The expected salary amount is for planning only. It does not count as received income or increase your current budget. Finora uses a period when today is on or after its start date and before its next salary date. Update the dates as your pay schedule changes.

### 2. Add accounts if you want to track balances

Open **Accounts → Add account** and enter a name, type, currency, and opening balance. An account is a manually tracked place where your money is held, such as cash, checking, savings, or a credit card.

An account is only a record in Finora. Adding “Checking” does not connect to a bank or fetch a balance. The opening balance is the starting amount you enter. Later, confirmed income and transactions assigned to that account update its displayed balance; transfers move value between the two accounts you select. Pending, cancelled, or rejected transactions do not update the balance.

Accounts are optional. You can record income and spending without assigning an account. Assigning accounts makes the **Accounts** page more useful, but account balances are separate from the salary-period budget calculation.

### 3. Enter income

Open **Income → Add income**. Choose a source, enter a description and amount, and select the currency. Then choose its status:

- **Expected** means you are planning for this income. It appears as expected income but is excluded from available budget and the payday projection.
- **Received** means the money arrived. Enter or confirm its received date. Received income in the current period’s currency and date range contributes to the budget. You can optionally assign it to an account and salary period.
- **Cancelled** keeps a record of income that will not arrive; it is not counted.

When an expected payment arrives, edit it and mark it **Received**. Finora stores recurrence details on the record, but does not connect to a payer or automatically create deposits.

### 4. Record expenses and other activity

Use **Add expense** from the page heading or quick actions, or open **Transactions → Add expense**. Enter the type, description, amount, currency, category, date, and status. Account assignment is optional.

- A **Confirmed** expense affects the current period’s remaining budget and, if assigned, the account balance.
- A **Pending** transaction is not included in calculations until you review and confirm it.
- A **Refund** increases the remaining budget when confirmed.
- **Income** entered as a transaction increases the budget when confirmed. You can also track income from the **Income** page.
- A **Transfer** moves value from one of your accounts to another and is excluded from spending totals.

Use **Transactions** to search your entries, edit them, or confirm/reject pending items. CSV import is available from **Transactions** and **Integrations**. Imported rows wait for your review; check their dates, descriptions, amounts, currencies, and classifications before confirming them.

## Understand the overview

### Remaining this salary period

This is confirmed income for the current salary period, minus confirmed expenses, plus confirmed refunds. Expected income, pending transactions, and transfers are not counted. Records in other currencies are kept separate.

### Today’s budget and carryover

Finora spreads confirmed period income across the days in the salary period to calculate a daily base allowance. Unused allowance from earlier days carries forward; confirmed spending and refunds change what remains available today. The “remaining today” figure is a planning aid based on records you have entered, not a bank balance.

### “Projected at payday”

This is an estimate of what may remain on the next salary date if your average net spending so far continues. Finora starts with the current period’s remaining amount, calculates average daily outflow from confirmed expenses minus confirmed refunds over elapsed days, then applies that average to the days until payday.

For example, if you have 1,800 remaining after 10 elapsed days, and your net confirmed spending averages 120 per day, with 5 days until payday, the projection is 1,800 − (120 × 5) = 1,200 in the period’s currency.

Treat this as a trend estimate, not a promise or bank forecast. It does not include expected salary, unentered purchases, future bills, or any external account activity. At the very start of a period, there may not be enough elapsed activity to estimate future spending, so the projection can initially equal the current remaining amount.

## Other pages

- **Analytics** shows confirmed spending by category and salary-period calculations.
- **Integrations** describes available inputs. In this build, CSV file import is available; bank feeds, wallet history, and Android notification sources are not connected.
- **Settings** lets you manage salary periods, see the active storage mode, and clear local records.

## A simple daily routine

1. Add or update income when it is expected or received.
2. Record expenses as they happen, or import a CSV statement.
3. Review imported and pending transactions; confirm, edit, or reject each one.
4. Check **Overview** for your current-period remaining amount and daily allowance.
5. Use **Projected at payday** as a rough trend estimate, and update your records when dates or amounts change.
