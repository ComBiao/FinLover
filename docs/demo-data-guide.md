# FinLover — Sprint 2 Demo Data & Feature Demonstration Guide

This guide details the demo user data created for **FinLover Sprint 2**, perfectly aligned with [`backlog(sprint2).md`](./backlog(sprint2).md).

> **Excluded Scope**:
> - **Shared Wallets (EPIC 7)** — Backlogged to future sprints.
> - **Financial Reports & Analytics (EPIC 8)** — Backlogged to future sprints.

---

## 1. Demo User Credentials

| Account Purpose | Email | Password | Name | Initial State |
| :--- | :--- | :--- | :--- | :--- |
| **Primary Demo User** | `demo@finlover.com` | `Password123` | Alex Demo (FinLover) | 5 Wallets, 17 Categories, 28 Transactions |
| **Disposable User (US1-4 Delete Demo)** | `delete-demo@finlover.com` | `Password123` | Disposable Test User | 1 Wallet, 1 Transaction (Safe for deletion demo) |

> **Password Note**: `Password123` satisfies all US1-1 complexity constraints (at least 1 uppercase letter, 1 lowercase letter, 1 number, and $\ge 8$ characters).

### Quick Seeder Command
To reset or re-seed the demo database at any time:
```bash
npm run db:seed:demo
```

---

## 2. Feature-by-Feature Demonstration Matrix

### EPIC 1: User Authentication & Account Security

| Story ID | Feature | How to Demo with Seeded Data | Acceptance Criteria Highlight |
| :--- | :--- | :--- | :--- |
| **US1-1** | **Registration** | Navigate to `/register`. Register a new test account using a valid email, strong password (`Test1234`), and accept the Privacy Policy. | Enforces password complexity, matching passwords, and records PDPA data privacy consent. |
| **US1-2** | **Login** | Log in with `demo@finlover.com` / `Password123`. | Issues secure session cookie, redirects directly to `/homepage`. |
| **US1-3** | **Logout** | Click user avatar menu in top header $\rightarrow$ click **"Log out"**. | Clears session cookie, redirects back to `/login`, prevents back-navigation to protected routes. |
| **US1-4** | **Account Deletion** | Log in as `delete-demo@finlover.com` $\rightarrow$ navigate to `/profile` $\rightarrow$ scroll to **Delete Account** $\rightarrow$ enter password `Password123` $\rightarrow$ confirm. | Permanently cascades deletion to user records, wallets, categories, and transactions; redirects to `/login`. Keeps primary `demo@finlover.com` safe! |

---

### EPIC 2: Home Page Dashboard

All dashboard metrics are populated with the exact figures specified in the Sprint 2 backlog acceptance scenarios:

| Story ID | Feature & Card | Target State in Demo Data | Backlog AC Reference |
| :--- | :--- | :--- | :--- |
| **US2-1** | **Month Navigation (`‹ Month ›`)** | • Current month: **October 2026** (Full surplus dashboard)<br>• Click `‹`: **September 2026** (Overspending deficit dashboard)<br>• Click `›` twice to **November 2026**: Empty state ($฿0$ totals, friendly empty list) | **US2-1 Scenario 1 & 2** (Past/future navigation and clean empty state handling). |
| **US2-2** | **Total Balance Card** | • When **"All Wallets"** selected: displays combined total balance of **฿66,380.00**.<br>• When a saving wallet is selected: shows embedded saving goal progress. | **US2-2 Scenario 1** (Balance display & embedded goal). |
| **US2-3** | **Income This Month** | For **October 2026** (on `Main Bank`): displays exactly **฿32,000.00** (Salary ฿30,000 + Bonus ฿2,000). | **US2-3 Scenario 1**: *"recorded income transactions in the selected month totaling ฿32,000"*. |
| **US2-4** | **Spent This Month** | For **October 2026** (on `Main Bank`): displays exactly **฿9,180.00**. | **US2-4 Scenario 1**: *"recorded expense transactions in the selected month totaling ฿9,180"*. |
| **US2-5** | **Net Balance (`ยอดคงเหลือ`)** | • **October 2026 (Surplus)**: $32,000 - 9,180 =$ **`+฿22,820.00`** in bold green.<br>• **September 2026 (Deficit)**: $5,000 - 9,180 =$ **`-฿4,180.00`** in bold red with overspending indicator. | **US2-5 Scenario 1 (+฿22,820)** and **Scenario 2 (-฿4,180 overspending)**. |
| **US2-6** | **Top Categories Breakdown** | Displays October expenses ranked from highest to lowest:<br>1. **Food & Drinks**: **฿3,240.00**<br>2. **Shopping**: **฿2,860.00**<br>3. **Utilities**: **฿1,900.00**<br>4. **Transportation**: **฿1,180.00** | **US2-6 Scenario 1**: *"Food & drink ฿3,240, Shopping ฿2,860, Transport ฿1,180"*. |
| **US2-7** | **Embedded Savings Goal Progress** | Switch wallet dropdown to **"Emergency Fund"**:<br>• Balance: **฿12,400.00**<br>• Goal: **฿20,000.00**<br>• Progress: **62%** (`฿12,400 of ฿20,000 · 62%`) embedded inside Total Balance card.<br>• Switch to "Main Bank" or "All Wallets" $\rightarrow$ saving goal section automatically hides. | **US2-7 Scenario 1**: *"Emergency fund with goal ฿20,000 and balance ฿12,400 · 62%"*. |
| **US2-8** | **Monthly Transactions Table** | Displays October 2026 transactions sorted newest first with category chip, wallet tag, date, amount, and `⋮` actions (Edit/Delete). Immediate balance recalculation on edit/delete. | **US2-8 Scenario 1 & 2**. |
| **US2-9** | **Quick-Add Transaction Form** | Tap `+` button on home page $\rightarrow$ enter amount `180`, description `Grab, coffee...`, category `Food & Drinks`, and save $\rightarrow$ instantly updates totals. | **US2-9 Scenario 1 & 2**. |

---

### EPIC 3: Transaction Management (`/transactions`)

| Story ID | Feature | How to Demo with Seeded Data | Backlog AC Reference |
| :--- | :--- | :--- | :--- |
| **US3-1** | **Add Transaction** | Click "+ Add Transaction", fill amount, type, category, wallet, and title. An existing August transaction (`2026-08-25`, Expense `500.00`, `Food & Drinks`) is pre-seeded from US3-1 AC1. | **US3-1 Scenario 1**. |
| **US3-2** | **Edit Transaction** | Click `⋮` on any transaction $\rightarrow$ **Edit** $\rightarrow$ change amount (e.g. ฿500 to ฿550) $\rightarrow$ save $\rightarrow$ balance recalculates immediately. | **US3-2 Scenario 1**. |
| **US3-3** | **Search by Title/Note** | In search bar, type **"coffee"**: immediately filters to: <br>• *Specialty Drip Coffee* (฿180)<br>• *Morning Iced Coffee* (฿65)<br>• *AeroPress Coffee Beans* (฿1,000)<br>• *Cold Brew Coffee Beans* (฿350) | **US3-3 Scenario 4**: *"types 'coffee' into search field ... display only transactions whose title or note contains 'coffee'"*. |
| **US3-3** | **Filter by Category & Wallet** | Filter by wallet (`Cash`, `Main Bank`, `Emergency Fund`) or category (`Food & Drinks`, `Shopping`) $\rightarrow$ list updates instantly. Click **"Clear Filters"** to reset. | **US3-3 Scenario 1 & 2**. |
| **US3-4** | **Delete Transaction** | Click `⋮` $\rightarrow$ **Delete** $\rightarrow$ confirms deletion dialog $\rightarrow$ transaction removed and wallet balance atomically recalculated. | **US3-4 Scenario 1**. |
| **US3-5** | **"Not Chosen" Category Fallback** | Look at the transaction **"ATM Service Fee"** ($฿20.00$ on `Cash` wallet) $\rightarrow$ displayed as **"Not Chosen"** because it was submitted without a category. | **US3-5 Scenario 2**: *"category of the transaction as 'Not Chosen'"*. |
| **US3-6** | **Filter-Aware Summary Cards** | Change filters (e.g. filter by "Shopping") $\rightarrow$ Summary cards at the top of `/transactions` dynamically recalculate totals for only that filter. | **US3-6 Scenario 1**. |

---

### EPIC 5: Category Management (`/category`)

| Story ID | Feature | How to Demo with Seeded Data | Backlog AC Reference |
| :--- | :--- | :--- | :--- |
| **US5-6** | **System Default Categories** | View categories list: 14 pre-seeded system default categories (Food & Drinks, Transportation, Salary, Bonus, etc.) marked as system. Deletion/editing is prevented by backend guards. | **US5-6 Scenario 1 & 2**. |
| **US5-1** | **Create Custom Category** | Custom category **"Pet Supplies"** is pre-seeded (Expense, icon `HeartPulse`). Users can also create new custom categories with custom icons. | **US5-1 Scenario 1**: *"category with name 'Pet Supplies' and type 'Expense'"*. |
| **US5-2** | **Grouped Categories View** | Categories are clearly separated into **"Income"** and **"Expense"** groups. | **US5-2 Scenario 1 & 2**. |
| **US5-3** | **Edit Custom Category** | Click Edit on custom category **"Pet Supplies"** $\rightarrow$ rename or change icon $\rightarrow$ updates successfully. | **US5-3 Scenario 1**. |
| **US5-4** | **Safe Delete & Reassignment** | Click Delete on custom category **"Coffee & Cafe"**: system shows warning that transactions are linked $\rightarrow$ confirm deletion $\rightarrow$ linked transaction (*AeroPress Coffee Beans*) automatically reassigns to **"Not Chosen"**! | **US5-4 Scenario 2**: *"category has existing transactions linked ... requires confirmation and reassignment to 'Not Chosen'"*. |
| **US5-5** | **Category Icon Library** | All categories display icons from the curated icon library (`Utensils`, `Car`, `Home`, `HeartPulse`, `Briefcase`, etc.). | **US5-5 Scenario 1**. |

---

### EPIC 6: Multiple Wallets (`/wallets`)

| Story ID | Feature | How to Demo with Seeded Data | Backlog AC Reference |
| :--- | :--- | :--- | :--- |
| **US6-1** | **Create Wallet** | Click **"Create Wallet"** modal $\rightarrow$ enter name, color, and optional saving goal. | **US6-1 Scenario 1**. |
| **US6-2** | **Switch Active Wallet** | Use wallet dropdown in navbar or home page $\rightarrow$ switches active view and context. | **US6-2 Scenario 1**. |
| **US6-3** | **Saving Wallet & Target Goal** | **"Emergency Fund"** (Goal ฿20,000) and **"Trip to Japan"** (Goal ฿50,000) show saving badges, target goals, and progress bars. | **US6-3 Scenario 1**. |
| **US6-4** | **Hide Balance Eye Toggle** | Click the eye icon toggle (`Eye` / `EyeOff`) on any balance card $\rightarrow$ masks digits with `••••••` across all balances. | **US6-4 Scenario 1**. |
| **US6-5** | **Cascade Delete Wallet** | Wallet **"Old Fund"** has **exactly 5 transactions**. Click Delete on **"Old Fund"** $\rightarrow$ shows cascade delete warning $\rightarrow$ confirm $\rightarrow$ wallet and all 5 transactions are deleted atomically! | **US6-5 Scenario 1**: *"wallet named 'Old Fund' with 5 associated transactions ... cascade delete wallet and all its transactions"*. |
| **US6-6** | **Edit Wallet Metadata** | Click Edit on **"Trip to Japan"** $\rightarrow$ rename or pick a different color $\rightarrow$ updates across the UI immediately. | **US6-6 Scenario 1**: *"wallet named 'Travel Fund' ... updates name to 'Trip to Japan' and changes color tag"*. |

---

## 3. Seeded Wallets Summary

| Wallet Name | Type / Tag | Color | Balance | Goal Amount | Progress | Associated Txns | Purpose in Demo |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Main Bank** | Standard | `#3B82F6` | **฿33,140.00** | — | — | 14 txns | Main spending & salary account (Oct Surplus + Sep Deficit) |
| **Cash** | Default | `#4A4757` | **฿2,840.00** | — | — | 4 txns | Everyday cash + "Not Chosen" category transaction demo |
| **Emergency Fund** | Saving | `#10B981` | **฿12,400.00** | ฿20,000.00 | **62%** | 1 txn | US2-7 & US6-3 embedded saving goal demo (62%) |
| **Trip to Japan** | Saving | `#EC4899` | **฿15,000.00** | ฿50,000.00 | **30%** | 1 txn | US6-6 & US6-3 travel savings demo |
| **Old Fund** | Standard | `#8B5CF6` | **฿3,000.00** | — | — | **5 txns** | Dedicated wallet for US6-5 Cascade Deletion demo |
| **Combined** | — | — | **฿66,380.00** | — | — | **25 txns** | Displayed when "All Wallets" is selected |

---

## 4. Seeded Month-by-Month Breakdown

### October 2026 (Active Month — Surplus Dashboard)
- **Income**: **฿32,000.00**
  - Monthly Salary: ฿30,000.00
  - Performance Bonus: ฿2,000.00
- **Expenses**: **฿9,180.00**
  - Food & Drinks: ฿3,240.00 (Supermarket ฿2,240, Specialty Drip Coffee ฿180, Team Dinner ฿820)
  - Shopping: ฿2,860.00 (Uniqlo Autumn Clothing)
  - Utilities: ฿1,900.00 (Condo Electricity ฿1,200, Fiber Internet ฿700)
  - Transportation: ฿1,180.00 (BTS Transit ฿680, Airport Taxi ฿500)
- **Net Balance (`ยอดคงเหลือ`)**: **`+฿22,820.00`** (Green Surplus badge)

### September 2026 (Previous Month — Overspending Deficit Dashboard)
- **Income**: **฿5,000.00** (Freelance Web Design Contract)
- **Expenses**: **฿9,180.00** (UltraSharp Monitor ฿4,500, Seafood Buffet ฿3,000, AeroPress Coffee Beans ฿1,000, Train Commute ฿680)
- **Net Balance (`ยอดคงเหลือ`)**: **`-฿4,180.00`** (Red Overspending badge)

### August 2026 (Sprint 1 Month)
- Opening funding: ฿15,000.00
- Sprint 1 Lunch Meeting (`2026-08-25`): ฿500.00 (Food & Drinks)

### November 2026 (Future Month)
- **0 Transactions**, **฿0.00 Totals**, clean empty-state placeholder (US2-1 Scenario 2).

