# FinCheck - Finance Tracker — V1 Specification

## 1. Product Overview

Build a personal finance web application designed primarily for UPI users who receive money/allowances at irregular intervals.

The main problem the application solves is:

> Users do not want to manually record every transaction, but still want to know where their money is going and how long their current funds are likely to last.

The application should automatically import supported transaction emails and turn them into transactions.

The first supported payment provider is **FamApp/FamPay**.

The application should also provide manual transaction entry so the entire system can be tested before email integration is implemented.

---

# 2. Core Product Concept

The application is NOT a monthly-budget tracker.

There is no fixed monthly allowance date and there should be no automatic monthly reset.

Instead, the application operates as a continuous ledger of:

* Money received
* Money spent

Allowances can be received at any time and in any amount.

Example:

* September 1: +₹5,000
* September 8: -₹250
* September 20: +₹3,000
* September 25: -₹500

The application continuously maintains the user's balance.

The system should work regardless of whether the user receives:

* ₹3,000 every 20 days
* ₹5,000 every month
* ₹2,000 multiple times per week
* Irregular amounts at completely irregular intervals

---

# 3. One Job of V1

At any point in time, the application should answer:

> "How much money do I have, how fast am I spending it, and approximately how long will it last?"

The application should make this information available with minimal manual input.

---

# 4. V1 Features

## Feature 1 — Add Allowance / Money Received

The user can manually record money they receive.

An allowance is a positive cash-flow event.

The user must be able to enter:

* Amount
* Date (take current date if left empty by user)
* Optional note

Example:

Amount: ₹5,000
Date: 10 September 2026
Note: Dad

When an allowance is recorded:

`Current Balance = Current Balance + Allowance`

The allowance immediately affects all relevant metrics.

There is NO concept of a fixed monthly allowance.

There is NO automatic monthly reset.

---

# 5. Feature 2 — Manual Transaction Entry

The application must provide manual transaction entry from the beginning.

This is required for testing the application before email integration is implemented.

The user must be able to manually add an expense with:

* Amount
* Date (default = current date)
* Time (default = current time)
* Optional category
* Optional transaction ID
* Optional UTR

Example:

Amount: ₹60
Merchant: SATYAM GOUR
Date: 13 July 2026
Time: 2:09 PM
Transaction ID: FMPIB6149001858
UTR: 619442650013

A manually added transaction must behave exactly like an automatically imported transaction.

It must:

* Decrease the current balance
* Appear in transaction history
* Affect spending averages
* Affect the forecast

Manual transaction entry should remain available after email integration is implemented.

---

# 6. Feature 3 — FamPay Email Transaction Import (do not use in V1 but make v1 such that this can be implemented without making big changes)

The first automatic transaction source should be FamApp/FamPay transaction emails.

The application should eventually connect to the user's email account through proper email authorization such as OAuth.

The application must NOT ask the user for their email password.

The system should identify supported FamPay transaction emails and extract transaction information from them.

Example FamPay email:

Sender:

`no-reply@famapp.in`

Subject:

`Your payment of ₹60.0 is successful`

Example contents:

`You have successfully paid`

`₹60.0`

`to SATYAM GOUR`

`Transaction ID: FMPIB6149001858`

`Date: 02:09 PM IST, 13 July 2026`

`Updated Balance: ₹7.97`

`UTR: 619442650013`

The parser should extract:

* Transaction amount
* Merchant/person
* Transaction date
* Transaction time
* Transaction ID
* UTR, if available

---

# 7. FamPay Updated Balance — DO NOT USE IN V1

The `Updated Balance` field contained in FamPay emails must be completely ignored for V1.

For example:

`Updated Balance: ₹7.97`

must NOT be used to calculate or overwrite the application's current balance.

The application's balance must be calculated exclusively from financial events recorded by the application.

This means:

`Current Balance = Total Logged Allowances - Total Logged Expenses`

The FamPay `Updated Balance` field should not be stored as the source of truth and should not affect any V1 calculation.

---

# 8. Automatic Transaction Processing

When a supported transaction email is detected:

Email
→ Identify transaction
→ Parse transaction data
→ Validate transaction
→ Check for duplicate
→ Create transaction
→ Update balance
→ Recalculate metrics
→ Recalculate forecast

An automatically imported transaction should behave exactly like a manually added transaction.

The system must prevent duplicate transactions.

If the same email is processed multiple times, it must not create multiple transactions.

When available, the transaction ID and/or email ID should be used for duplicate detection.

---

# 9. Transaction Data Model

Each transaction should contain:

* id
* user_id
* amount recieved or sent (MANDATORY)
* merchant
* date
* time
* category
* transaction_id
* utr
* source
* email_id
* created_at

`source` must identify whether the transaction was:

* `manual`
* `email`

The system should be designed so that future transaction sources can be added without changing the core transaction system.

---

# 10. Allowance Data Model

Each allowance/money-in event should contain:

* amount
* date (default = current date)
* note (optional)
* created_at (optional)

Allowances must NOT be tied to a calendar month.

Every allowance is an independent money-in event.

---

# 11. Current Balance

The application should calculate the current balance from its own ledger.

Formula:

`Current Balance = Total Allowances Received - Total Expenses`

Where:

`Total Allowances Received = sum of all logged allowance events`

and:

`Total Expenses = sum of all logged transactions`

Example:

Allowances:

₹5,000
₹3,000

Total money received:

₹8,000

Expenses:

₹500
₹250
₹1,000

Total spent:

₹1,750

Current Balance:

`₹8,000 - ₹1,750 = ₹6,250`

The current balance should update immediately whenever an allowance or transaction is added.

---

# 12. Transaction History

The application should display all recorded financial events.

The user should be able to distinguish between money coming in and money going out.

Transactions should be sorted newest first.

Expense entries should show:

* Amount (sent or recieved)
* Date
* Time 
* Category
* Source

Allowance entries should show:

* Amount
* Date
* Note
* Source

The user should be able to open an entry to see its complete details.

---

# 13. Spending Metrics

The application should maintain multiple spending metrics.

Do NOT rely on only one average.

The primary metrics are:

1. Total Spent
2. Current Balance
3. Lifetime Average Daily Spending
4. Current Allowance-Cycle Average
5. 7-Day Rolling Average
6. Budget/Spending Velocity
7. Estimated Days Until Empty
8. Projected Run-Out Date

---

# 14. Lifetime Average Daily Spending

This measures spending over the entire period for which the application has usable financial data.

Let:

* `E` = total expenses
* `T` = number of days in the tracking period

Then:

`Lifetime Average Daily Spending = E / T`

The tracking period should begin from the first relevant financial event recorded by the user.

This metric should not reset when a new allowance is received.

Example:

Total spending = ₹10,000

Tracking period = 40 days

`₹10,000 / 40 = ₹250/day`

Lifetime average:

`₹250/day`

This metric is useful for understanding long-term spending behavior.

---

# 15. Current Allowance-Cycle Average

Whenever the user receives a new allowance, a new allowance cycle begins.

The application should record:

* Cycle start date
* Allowance amount
* Spending since the cycle began

The cycle does NOT reset the user's overall transaction history.

For the current cycle:

Let:

* `S` = spending since the latest allowance
* `D` = number of days since the latest allowance

Then:

`Cycle Average Daily Spending = S / D`

Example:

Latest allowance:

₹5,000 on September 1

Spending since then:

₹2,000

Days elapsed:

10

Cycle average:

`₹2,000 / 10 = ₹200/day`

This metric helps the user understand their spending behavior since their latest allowance.

---

# 16. 7-Day Rolling Average

The primary spending rate for the run-out forecast should be the user's recent spending behavior.

Calculate the average spending over the most recent 7 days.

Formula:

`7-Day Rolling Average = Total spending during last 7 days / 7`

Days with zero spending MUST be included.

Example:

Last 7 days:

Day 1: ₹100
Day 2: ₹0
Day 3: ₹250
Day 4: ₹50
Day 5: ₹0
Day 6: ₹300
Day 7: ₹100

Total:

`₹800`

7-day average:

`₹800 / 7 = ₹114.29/day`

This average should update whenever a new transaction is recorded and as the calendar moves forward.

---

# 17. Insufficient 7-Day Data

If fewer than 7 days of financial history are available, the application should not pretend that it has a full 7-day history.

Instead:

`Rolling Average = Total spending during available days / Number of available days`

Example:

Only 3 days of data exist:

Day 1: ₹100
Day 2: ₹200
Day 3: ₹0

Average:

`₹300 / 3 = ₹100/day`

Once 7 or more days of data exist, use the standard 7-day rolling average.

---

# 18. Predicted Run-Out Date

The application should estimate when the user's current balance will reach zero based on their recent spending rate.

Primary formula:

`Estimated Days Until Empty = Current Balance / 7-Day Rolling Average`

Then:

`Projected Run-Out Date = Today + Estimated Days Until Empty`

Example:

Current balance:

₹5,000

7-day rolling average:

₹250/day

Calculation:

`₹5,000 / ₹250 = 20 days`

The app should display:

> Your current spending rate suggests your money will last approximately 20 more days.

And:

> Projected run-out date: September 30

The prediction should update automatically whenever the balance or spending rate changes.

---

# 19. Forecast Priority and Fallbacks

The application should use the following hierarchy for forecasting:

### Primary

7-Day Rolling Average

### Fallback

Current Allowance-Cycle Average

### Final fallback

Lifetime Average Daily Spending

If there is not enough data to calculate a meaningful average, the app should display:

> Not enough spending data to predict your run-out date.

Do not display a misleading prediction.

---

# 20. Projected Balance

The application should estimate how much money the user may have after a specified number of future days.

For the main dashboard, show the projected balance at the end of the current allowance cycle.

If:

* Current balance = `B`
* Current allowance cycle remaining days = `D`
* 7-day rolling average = `A`

Then:

`Projected Balance = B - (A × D)`

However, because allowance dates are irregular, the application should NOT assume that the next allowance will arrive on a fixed date.

The app should therefore treat this as a projection rather than a guaranteed month-end balance.

---

# 21. Allowance-Cycle Forecast

The application should also show how the current allowance cycle is performing.

Example:

Latest allowance:

₹5,000

Spent since allowance:

₹2,000

Current balance:

₹3,000

Cycle average:

₹200/day

The dashboard can display:

> At your current cycle spending rate, your latest allowance has approximately 15 days of spending remaining.

This should be treated as an informational metric.

---

# 22. Spending Velocity / Budget Health

The app should show whether the user's recent spending rate is increasing or decreasing.

For V1, this should remain simple.

Compare:

`7-Day Rolling Average`

against:

`Current Allowance-Cycle Average`

Possible interpretation:

* Rolling average < cycle average → recent spending is slowing down
* Rolling average ≈ cycle average → spending is relatively stable
* Rolling average > cycle average → recent spending is increasing

Do not implement complex financial scoring or machine learning in V1.

---

# 23. Dashboard

The dashboard should prioritize the information the user cares about most.

Main information:

### Current Balance

Example:

`₹6,970`

### 7-Day Average Spending

Example:

`₹257/day`

### Estimated Days Until Empty

Example:

`27 days`

### Projected Run-Out Date

Example:

`October 7`

### Total Spent

Example:

`₹3,030`

Additional useful information:

### Current Allowance

Example:

`₹5,000 received September 1`

### Current Cycle Spending

Example:

`₹2,030`

### Cycle Average

Example:

`₹169/day`

### Lifetime Average

Example:

`₹220/day`

---

# 24. Transaction Notification

When a new transaction is automatically detected, the application should show an in-app notification.

Example:

> ₹280 spent at SATYAM GOUR
> Current balance: ₹6,690

The notification should use the application's calculated balance.

It must NOT use FamPay's `Updated Balance`.

True background push notifications may be implemented later if required.

For V1, an in-app notification is sufficient.

---

# 25. Categories

Basic transaction categories may be supported in V1.

Possible categories:

* Food
* Transport
* Shopping
* Entertainment
* Education
* Bills
* Other

Category assignment can initially be manual.

Automatic AI categorization is NOT required for V1.

The architecture should allow automatic categorization to be added later.

---

# 26. Screens

## Dashboard

Main screen.

Displays:

* Current balance
* Total spent
* 7-day average
* Cycle average
* Lifetime average
* Estimated days until empty
* Projected run-out date
* Recent transactions
* Recent allowance

Actions:

* Add Expense
* Add Allowance
* View Transactions

---

## Transactions

Displays all expenses and financial activity.

Actions:

* Add Expense
* Add Allowance
* View transaction details
* Edit manually entered transaction
* Delete manually entered transaction

---

## Add Expense

Fields:

* Amount
* Merchant/person
* Date
* Time
* Category
* Transaction ID
* UTR

Button:

`Add Expense`

---

## Add Allowance

Fields:

* Amount
* Date
* Note

Button:

`Add Allowance`

---

## Transaction Details

Display:

* Merchant/person
* Amount
* Date
* Time
* Category
* Transaction ID
* UTR
* Source

---

## Allowance Details

Display:

* Amount
* Date
* Note
* Spending since allowance
* Current cycle average

---

## Settings

V1 settings should remain minimal.

Include:

* Email connection
* Notification preferences
* Account/logout

---

# 27. Email Integration

The email integration should be separated from the financial calculation system.

Architecture:

`Email Provider`
→ `Email Fetcher`
→ `FamPay Parser`
→ `Transaction Validator`
→ `Duplicate Checker`
→ `Transaction Database`
→ `Balance Calculation`
→ `Analytics`
→ `Forecast`

The core financial system should not care whether a transaction came from:

* Manual entry
* FamPay email
* Another provider in the future

All sources should produce the same standard transaction object.

---

# 28. Security and Privacy

The application handles financial information.

Important rules:

* Never ask users for bank passwords.
* Never ask users for email passwords.
* Use proper OAuth/authorization for email access.
* Only request the minimum email access required.
* Do not expose transaction information publicly.
* Do not log sensitive email contents unnecessarily.
* Do not store entire emails if only specific transaction fields are required.
* Financial information should belong only to the authenticated user.

Security should take priority over convenience.

---

# 29. Platform

Build the application as a responsive web application.

It should work on:

* Desktop browsers
* Mobile browsers

Do NOT build native Android or iOS applications for V1.

The interface should be responsive because the intended user may primarily use the app on their phone.

---

# 30. UI/UX

The interface should be:

* Minimal
* Modern
* Clean
* Fast
* Easy to understand
* Finance-focused without looking like a traditional banking application

The most important number on the dashboard should be the current balance.

The second most important information should be:

> "How long will my money last?"

Use cards/sections for financial metrics.

Support:

* Light mode
* Dark mode

Use a modern sans-serif font.

Avoid excessive charts and unnecessary visual complexity.

A simple spending graph may be added if it helps communicate the 7-day spending trend, but charts are secondary to the numerical metrics.

---

# 31. Data Architecture

Minimum entities:

## User

* id
* email
* name
* created_at

## Allowance

* id
* user_id
* amount
* date
* note
* created_at

## Transaction

* id
* user_id
* amount
* merchant
* date
* time
* category
* transaction_id
* utr
* source
* email_id
* created_at
* updated_at

The system should use persistent storage/database rather than relying on browser-only state.

---

# 32. Important Balance Rule

The application's calculated balance is the source of truth for V1.

Formula:

`Current Balance = Sum of all Allowances - Sum of all Transactions`

Every allowance increases balance.

Every expense decreases balance.

Nothing else modifies the balance.

FamPay's `Updated Balance` must NOT modify the balance.

---

# 33. Important Forecast Rule

The forecast is based on the application's transaction history.

Primary:

`Current Balance / 7-Day Rolling Average`

The forecast should NOT use FamPay's reported balance.

The forecast should NOT assume:

* A monthly allowance
* A fixed allowance date
* A fixed income
* A guaranteed future allowance

The app only knows what has already been logged.

---

# 34. V1 Non-Goals

Do NOT build the following in V1:

* Direct bank account integration
* Direct UPI API integration
* Native Android app
* Native iOS app
* Credit card tracking
* Investment tracking
* Loans
* Cryptocurrency
* Multiple bank account synchronization
* Family/shared accounts
* Social features
* Payments from the app
* AI financial advisor
* Machine-learning predictions
* AI-generated financial recommendations
* Complex budgeting system
* Automatic AI categorization
* Complex recurring-payment detection
* Automatic income detection other than supported allowance entry
* Support for every bank/payment provider
* Fixed monthly budgeting

These may be considered later.

---

# 35. Development Order

Build the application incrementally.

## Phase 1 — UI

Create:

* Dashboard
* Transactions
* Add Expense
* Add Allowance
* Transaction Details
* Allowance Details
* Settings

Use mock data initially.

---

## Phase 2 — Database

Implement persistent storage for:

* Users
* Allowances
* Transactions

---

## Phase 3 — Financial Ledger

Implement:

`Balance = Allowances - Expenses`

Verify that every financial event updates the balance correctly.

---

## Phase 4 — Manual Transactions

Implement manual expense entry.

Verify that manual transactions update:

* Current balance
* Total spent
* Cycle spending
* Lifetime average
* 7-day average
* Forecast

---

## Phase 5 — Allowance Cycles

Implement allowance events and current-cycle tracking.

Verify that adding a new allowance:

* Increases balance
* Starts a new allowance cycle
* Does NOT erase previous transaction history
* Does NOT reset lifetime metrics
* Immediately recalculates forecasts

---

## Phase 6 — Analytics

Implement:

* Total spent
* Lifetime average
* Current-cycle average
* 7-day rolling average
* Spending velocity
* Estimated days until empty
* Projected run-out date

Test edge cases thoroughly.

---

## Phase 7 — Email Integration

Implement email authorization.

Initially support only FamApp/FamPay.

Parse:

* Amount
* Merchant/person
* Date
* Time
* Transaction ID
* UTR

Ignore:

* Updated Balance

---

## Phase 8 — Duplicate Detection

Ensure that processing the same email multiple times cannot create duplicate transactions.

---

## Phase 9 — Notifications

Implement an in-app notification whenever a new automatic transaction is imported.

---

# 36. Testing Requirements

The application must be tested with scenarios including:

### Scenario 1 — No transactions

Balance should equal total allowances.

Forecast should state that there is insufficient spending data.

### Scenario 2 — One allowance and one expense

Verify balance and transaction history.

### Scenario 3 — Multiple allowances

Verify that all allowances accumulate correctly.

### Scenario 4 — New allowance after spending

Verify that:

* Balance increases
* New allowance cycle begins
* Previous history remains
* Lifetime average remains intact

### Scenario 5 — Zero-spending days

Zero-spending days must be included in rolling-average calculations.

### Scenario 6 — Duplicate email

Processing the same FamPay email twice must create only one transaction.

### Scenario 7 — Very large transaction

Verify that the forecast updates correctly without creating errors.

### Scenario 8 — Zero spending average

Never divide by zero.

Display an appropriate "insufficient data" message.

### Scenario 9 — Negative balance

If expenses exceed logged allowances, the application should allow the negative balance to be represented rather than silently setting it to zero.

Example:

`₹1,000 allowance - ₹1,200 spending = -₹200`

Display this clearly.

---

# 37. V1 Success Criteria

The MVP is complete when a user can:

1. Create an account.
2. Add an allowance at any date and for any amount.
3. Add an expense manually.
4. See their calculated current balance.
5. View their complete transaction history.
6. See total spending.
7. See lifetime average daily spending.
8. See current allowance-cycle average spending.
9. See their 7-day rolling average.
10. See their estimated days until their money runs out.
11. See their projected run-out date.
12. Add another allowance at any time.
13. Have the new allowance immediately increase their balance.
14. Have all metrics automatically recalculate after the new allowance.
15. Connect an email account through proper authorization.
16. Detect a supported FamPay transaction email.
17. Extract the transaction amount, merchant, date, time, transaction ID and UTR.
18. Automatically create the transaction.
19. Prevent duplicate transactions.
20. Ignore FamPay's `Updated Balance`.
21. Use only the application's own logged allowances and expenses to calculate current balance and forecasts.

The MVP should prioritize:

**Correctness > reliability > simplicity > number of features.**

Do not add features outside this specification unless explicitly instructed.
