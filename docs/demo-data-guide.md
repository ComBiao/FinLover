# FinLover — Comprehensive Demo Data & Feature Demonstration Guide

This guide details the complete demo data and step-by-step presentation script for **FinLover**, covering **Personal Finance Management**, **Recurring Transactions Automation**, and **Multi-User Shared Wallets**.

> **Note on Scope**:
> - **Shared Wallets (EPIC 7)** — **Fully Implemented & Ready for Demo** (Multi-member management, invitation banner, notification bell, attribution, and isolated shared summaries).
> - **Financial Reports & Analytics (EPIC 8)** — Not part of the primary demo user. It has its own demo user, see [section 7](#7-epic-8--reports-demo-user).

---

## 1. Demo User Credentials

| Account Purpose | Email | Password | Name | Initial State & Role in Demo |
| :--- | :--- | :--- | :--- | :--- |
| **Primary Demo User** | `demo@finlover.com` | `Password123` | Alex Demo (FinLover) | **5 Personal Wallets** (฿65,180 combined), **17 Categories**, **31 Personal Txns**, **8 Recurring Rules**.<br>**Owner**: *"Family Living & Bills"* (3 members)<br>**Contributor**: *"Japan Vacation Fund"* (Saving goal 40%)<br>**Pending Invites**: 2 invites waiting in banner & bell! |
| **Partner (Owner & Contributor)** | `partner@finlover.com` | `Password123` | Sarah Partner | **Owner**: *"Japan Vacation Fund"* & *"Weekend Camping Trip"*<br>**Contributor**: *"Family Living & Bills"* (Simulate collaborative logging/editing) |
| **Roommate (Contributor & Owner)** | `roommate@finlover.com` | `Password123` | Bob Roommate | **Contributor**: *"Family Living & Bills"*<br>**Owner**: *"Office Coffee & Snacks"* (Simulate 2nd pending invitation) |
| **Colleague (Pending Invitee)** | `dave@finlover.com` | `Password123` | Dave Colleague | **Pending Invitee** in *"Family Living & Bills"* (Demonstrates pending member state in Owner's Members Dialog) |
| **Disposable User (US1-4 Delete Demo)** | `delete-demo@finlover.com` | `Password123` | Disposable Test User | **1 Personal Wallet**, **1 Transaction** (Safe dedicated account for deletion demo) |

> **Password Note**: `Password123` satisfies all US1-1 complexity constraints ($\ge 1$ uppercase, $\ge 1$ lowercase, $\ge 1$ number, $\ge 8$ characters).

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

### EPIC 2: Home Page Dashboard (Personal & Shared)

| Story ID | Feature & Card | Target State in Demo Data | Backlog AC Reference |
| :--- | :--- | :--- | :--- |
| **US2-1** | **Month Navigation (`‹ Month ›`)** | • Current month: **October 2026** (Full surplus dashboard)<br>• Click `‹`: **September 2026** (Overspending deficit dashboard)<br>• Click `›` twice to **November 2026**: Empty state ($฿0$ totals, friendly empty list) | **US2-1 Scenario 1 & 2** (Past/future navigation and clean empty state handling). |
| **US2-2** | **Total Balance Card** | • When **"All Wallets"** selected: displays combined total balance of **฿65,180.00** (Personal only).<br>• When a saving wallet is selected: shows embedded saving goal progress. | **US2-2 Scenario 1** (Balance display & embedded goal). |
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

### EPIC 4: Recurring Transactions (`/recurring`)

| Story ID | Feature | How to Demo with Seeded Data | Backlog AC Reference |
| :--- | :--- | :--- | :--- |
| **US4-1** | **Create Recurring Rule & Cadence Models** | Click **"Create Recurring Transaction"** $\rightarrow$ fill title, amount, interval & unit (`Day(s)`, `Week(s)`, `Month(s)`, `Year(s)`), start date, and end condition (`Never`, `On Date`, `After Count`). Pre-seeded examples demonstrate weekly (`Weekly Badminton` on Cash), monthly (`Netflix 4K`, `Condo Rental`), quarterly (`Tech Magazine`), and yearly (`Cloud Storage 2TB`) cadences with month-end anchor day clamping. Immediate posting triggers if `startDate === today`. | **US4-1 Scenario 1 & 2** (Cadence models, anchor-day calculation, immediate execution on today's start date). |
| **US4-2** | **Automated Execution & Completion** | Inspect **"Fitness Club 3-Month Trial"**: all 3 occurrences posted (`3 of 3 posted`), status is `Completed`, and `Next Due Date` is `null` / dash (`—`). When the backend cron runs or final occurrence posts, rules cleanly transition to `Completed` without further executions. | **US4-2 Scenario 1 & 2** (Cron execution, count/date completion, overdraft-tolerant execution). |
| **US4-3** | **View & Manage Unified Recurring Rules List** | Navigate to `/recurring`. View unified schedules list displaying category chip, title, amount, wallet tag, frequency badge (`"Every 1 Week"`, `"Every 1 Month"`, `"Every 3 Months"`, `"Every 1 Year"`), next scheduled due date, progress counter (`"2 of 12 posted"`), and status badge (`Active`, `Paused`, `Completed`). | **US4-3 Scenario 1** (Unified list view, responsive badges, loading & empty states). |
| **US4-4** | **Pause & Resume Recurring Rule** | 1. Click **Pause** on an active rule $\rightarrow$ status badge optimistically changes to `Paused`.<br>2. Inspect seeded **"Spotify Family Plan"** (Paused with past due date `2026-09-20`) $\rightarrow$ click **Resume** $\rightarrow$ status reverts to `Active` and `Next Due Date` advances forward to the upcoming cycle without retroactively posting missed occurrences. | **US4-4 Scenario 1 & 2** (Pause halts scheduler; Resume advances overdue cycle without backfill). |
| **US4-5** | **Forward-Only Edit & Safe Delete** | 1. **Edit Rule**: Click `⋮` $\rightarrow$ **Edit Rule** on **"Condo Rental Fee"** $\rightarrow$ update amount from `฿12,000` to `฿12,500` $\rightarrow$ save. Future scheduled runs use the new amount while historical ledger entries in `/transactions` remain untouched at `฿12,000`.<br>2. **Delete Rule**: Click `⋮` $\rightarrow$ **Delete Rule** on **"Netflix 4K Premium"** $\rightarrow$ confirms dialog $\rightarrow$ rule is removed, stopping future executions while all past transactions are preserved.<br>3. **Wallet Cascade**: Deleting wallet **"Old Fund"** under `/wallets` automatically cascade-deletes **"Tech Magazine Quarterly"** rule. | **US4-5 Scenario 1 & 2** (Future-only edits preserve past ledger; safe deletion stops future runs without destroying past transaction history). |

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
| **US6-5** | **Cascade Delete Wallet** | Wallet **"Old Fund"** has **exactly 5 transactions**. Click Delete on **"Old Fund"** $\rightarrow$ shows cascade delete warning $\rightarrow$ confirm $\rightarrow$ wallet and all 5 transactions are deleted atomically! | **US6-5 Scenario 1**: *"wallet named 'Old Fund' with 5 associated transactions ... cascade delete wallet and all its transactions"*. |
| **US6-6** | **Edit Wallet Metadata** | Click Edit on **"Trip to Japan"** $\rightarrow$ rename or pick a different color $\rightarrow$ updates across the UI immediately. | **US6-6 Scenario 1**: *"wallet named 'Travel Fund' ... updates name to 'Trip to Japan' and changes color tag"*. |

---

### EPIC 7: Multi-User Shared Wallets (`/wallets` & `/homepage`)

| Story ID | Feature | How to Demo with Seeded Data | Acceptance Criteria Highlight |
| :--- | :--- | :--- | :--- |
| **US7-1** | **Create Shared Wallet** | On `/wallets`, click **"Create Wallet"** $\rightarrow$ toggle **"Shared Wallet"** checkbox $\rightarrow$ notice that balance is fixed at ฿0.00 (collaborative wallets start at zero). | Creates shared wallet with `isShared: true`, creator becomes immutable Owner. |
| **US7-2** | **Top Invitations Banner** | Navigate to `/wallets` or `/homepage`: top banner shows: *"Sarah Partner invited you to join 'Weekend Camping Trip' as a Contributor"*, with *"1 more invitation waiting in notifications"*. Click **Accept** $\rightarrow$ instantly joins the shared wallet! | Pending invitation display in prominent banner, real-time accept/decline action. |
| **US7-3** | **Notification Bell & Inbox** | Click the **Notification Bell** (with badge `"2"`) in header $\rightarrow$ displays all pending invitations (*Weekend Camping Trip* and *Office Coffee & Snacks*). Shows invitee and wallet details. | Multi-invitation inbox with direct action controls. |
| **US7-4** | **Owner Role & Member Management** | In `/wallets`, switch to the **"Shared"** tab $\rightarrow$ inspect **"Family Living & Bills"** (Role: `Owner`). Click **Members (3)** button $\rightarrow$ shows modal with Owner (Alex), Accepted Contributors (Sarah Partner, Bob Roommate), and Pending invitee (Dave Colleague). Owner can invite new members by email, remove contributors, or transfer ownership. | Complete Owner permissions, member list with role chips, and pending cancellation. |
| **US7-5** | **Contributor Role & Leave Wallet** | In `/wallets` Shared tab, inspect **"Japan Vacation Fund"** (Role: `Contributor`, Owner: Sarah Partner). Click `⋮` menu: only **Members** and **Leave Wallet** are visible (no Delete Wallet or metadata editing!). | Role-based permission enforcement: Contributors cannot delete owned wallets or modify metadata. |
| **US7-6** | **Shared Transactions & Attribution** | Navigate to `/transactions` or `/homepage` $\rightarrow$ switch wallet to **"Family Living & Bills"**: inspect the October 2026 table. See transactions logged by different users: <br>• Alex: *Living Contribution*, *Condo Common Fee*<br>• Sarah: *Costco Bulk Supplies*<br>• Bob: *Organic Market Groceries* (**"Logged by Bob Roommate, edited by Sarah Partner"**)<br>Categories strictly use the 14 shared preset categories. | Attribution shows `createdBy` (with avatar) and `editedBy`, maintaining transparent group ledger. |
| **US7-7** | **Shared Home Summary & Financial Isolation** | On `/homepage`: <br>1. Select **"All Wallets"**: displays **฿65,180.00** (Personal only; shared wallet balances are strictly excluded).<br>2. Select **"Family Living & Bills"**: dashboard re-scopes to show shared balance (฿14,500.00), Oct shared income (฿35,000.00), Oct shared expense (฿20,500.00), top preset categories, and a **"3 members"** button in header. | Clean financial isolation between individual finances and pooled shared budgets. |
| **US7-8** | **Lifecycle & Deletion Safeguards** | If an Owner with active Contributors attempts to delete their account or leave the wallet, the system rejects it with an explicit safety error requiring ownership transfer or explicit wallet deletion first. Contributor account deletion preserves past shared transaction history. | Atomic safeguards prevent orphaned collaborative wallets and corrupted ledgers. |

---

## 3. Seeded Wallets Summary

### Personal Wallets (Owned by Alex Demo)
| Wallet Name | Type / Tag | Color | Balance | Goal Amount | Progress | Associated Txns | Purpose in Demo |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Main Bank** | Standard | `#3B82F6` | **฿33,140.00** | — | — | 17 txns | Main spending & salary account (Oct Surplus + Sep Deficit) |
| **Cash** | Default | `#4A4757` | **฿1,640.00** | — | — | 7 txns | Everyday cash + Badminton weekly sessions (3 posted) + "Not Chosen" demo |
| **Emergency Fund** | Saving | `#10B981` | **฿12,400.00** | ฿20,000.00 | **62%** | 1 txn | US2-7 & US6-3 embedded saving goal demo (62%) |
| **Trip to Japan** | Saving | `#EC4899` | **฿15,000.00** | ฿50,000.00 | **30%** | 1 txn | US6-6 & US6-3 travel savings demo |
| **Old Fund** | Standard | `#8B5CF6` | **฿3,000.00** | — | — | **5 txns** | Dedicated wallet for US6-5 Cascade Deletion demo |
| **Personal Total** | — | — | **฿65,180.00** | — | — | **31 txns** | Displayed when "All Wallets" is selected |

### Shared Wallets (Collaborative Multi-User)
| Wallet Name | User Role | Color | Balance | Goal Amount | Members Count | Active Members | Purpose in Demo |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| **Family Living & Bills** | `Owner` | `#0284C7` | **฿14,500.00** | — | **3 members** (+1 pending) | Alex (Owner), Sarah, Bob (+ Dave pending) | Owner management, attribution demo ("edited by Sarah"), shared home dashboard |
| **Japan Vacation Fund** | `Contributor` | `#EC4899` | **฿24,000.00** | ฿60,000.00 | **2 members** (40% saved) | Sarah (Owner), Alex (Contributor) | Contributor role, shared saving goal progress, "Leave wallet" action |
| **Weekend Camping Trip** | `Invitee` | `#10B981` | **฿0.00** | — | **1 member** (Owner) | Sarah (Owner), Alex (Pending) | Demonstrates Top Invitations Banner with Accept / Decline |
| **Office Coffee & Snacks** | `Invitee` | `#F59E0B` | **฿0.00** | — | **1 member** (Owner) | Bob (Owner), Alex (Pending) | Demonstrates Notification Bell with multiple invitations badge ("2") |

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

---

## 5. Seeded Recurring Rules Summary

| Rule Name | Type | Category | Wallet | Cadence | Next Due Date | End Condition / Progress | Status | Purpose in Demo |
| :--- | :---: | :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| **Weekly Badminton Court** | Expense | Health | Cash | **Every 1 Week** (Tue) | 2026-10-27 | Never / 3 posted | `Active` | Weekly cadence model (3 posted ledger entries on Cash, next due 2026-10-27) |
| **Netflix 4K Premium** | Expense | Entertainment | Main Bank | **Every 1 Month** (Day 15) | 2026-11-15 | Never / 3 posted | `Active` | Indefinite active monthly entertainment expense (US4-1, US4-3) |
| **Condo Rental Fee** | Expense | Essentials | Main Bank | **Every 1 Month** (Day 1) | 2026-11-01 | After 12 / 2 of 12 posted | `Active` | Count-based end condition & future-only edit demo (US4-1, US4-5) |
| **Tech Corp Monthly Salary** | Income | Salary | Main Bank | **Every 1 Month** (Day 1) | 2026-11-01 | Never / 3 posted | `Active` | Regular recurring income automation rule (US4-1, US4-3) |
| **Spotify Family Plan** | Expense | Entertainment | Main Bank | **Every 1 Month** (Day 20) | 2026-09-20 (Overdue) | Never / 2 posted | `Paused` | Paused rule with overdue date for cycle advancement demo (US4-4) |
| **Cloud Storage 2TB** | Expense | Utilities | Main Bank | **Every 1 Year** (Oct 10) | 2027-10-10 | Until 2029-10-10 / 1 posted | `Active` | Yearly interval with date-based end condition (US4-1, US4-3) |
| **Fitness Club 3-Month Trial** | Expense | Health | Main Bank | **Every 1 Month** (Day 1) | — (`null`) | After 3 / 3 of 3 posted | `Completed` | Completed rule with null next due date & stopped scheduler (US4-2) |
| **Tech Magazine Quarterly** | Expense | Shopping | Old Fund | **Every 3 Months** (Day 1) | 2026-12-01 | Never / 1 posted | `Active` | Quarterly interval (3 months); cascade deletion target with `Old Fund` (US6-5) |

---

## 6. Recommended Step-by-Step Presentation Script for Instructor

When presenting to the instructor, follow this narrative order for the smoothest flow:

### Phase 1: Authentication & Overview
1. Open `/login` $\rightarrow$ Log in as `demo@finlover.com` with password `Password123`.
2. Point out the **Home Page Dashboard**:
   - Total Balance: **฿65,180.00** across personal wallets (under default "All wallets" personal view).
   - Switch wallet dropdown to **"Main Bank"** to view monthly cash flow breakdown:
     - October 2026 Surplus: **+฿22,820.00** (Green Surplus badge; Income ฿32,000, Expense ฿9,180).
     - Click `‹` to September 2026: Deficit **-฿4,180.00** (Red Overspending indicator; Income ฿5,000, Expense ฿9,180).
     - Click `›` twice to November 2026: Clean empty state (`0 Transactions`, `฿0.00`).

### Phase 2: Personal Wallets & Embedded Savings Goal
3. On `/homepage`, switch the wallet dropdown to **"Emergency Fund"**:
   - Total Balance card dynamically embeds the savings goal: **฿12,400.00 of ฿20,000.00 · 62%**.
4. Navigate to `/wallets`:
   - Point out the **Personal** tab with 5 wallets.
   - Edit metadata on **"Trip to Japan"** (rename or change color tag).
   - Show cascade deletion on **"Old Fund"** (deleting it confirms deleting 5 transactions and the linked quarterly subscription).

### Phase 3: Multi-User Shared Wallets (The "Wow" Feature)
5. Still on `/wallets`, highlight the **Invitations Banner** at the top:
   - *"Sarah Partner invited you to join 'Weekend Camping Trip' as a Contributor"*.
   - Point to the **Notification Bell** showing badge `"2"` (2 pending invitations).
   - Click **Accept** on the banner $\rightarrow$ the banner disappears and the wallet joins the account!
6. Click the **"Shared"** tab on `/wallets`:
   - Inspect **"Family Living & Bills"**: role is `Owner`, avatar stack shows 3 members.
   - Click **"Members (3)"**: show the dialog listing Alex (Owner), Sarah (Contributor), Bob (Contributor), and Dave (Pending with cancel button).
   - Show the email input field to invite a new member.
   - Inspect **"Japan Vacation Fund"**: role is `Contributor`, showing saving goal progress (**40%**), and the action menu shows **"Leave wallet"** instead of Delete.
7. Switch to `/transactions` or `/homepage`:
   - Select **"Family Living & Bills"** from the wallet dropdown.
   - Point out the transactions logged by different members.
   - Highlight the **Attribution**: *"Logged by Bob Roommate, edited by Sarah Partner"*.
   - Point out that categories use the standardized 14 shared preset categories.

### Phase 4: Recurring Transactions Automation
8. Navigate to `/recurring`:
   - Highlight the unified schedule list:
     - **Weekly**: *Weekly Badminton Court* (`Every 1 Week` on Cash, 3 posted, next due 2026-10-27)
     - **Monthly**: *Netflix 4K Premium* (`Every 1 Month`)
     - **Quarterly**: *Tech Magazine Quarterly* (`Every 3 Months`)
     - **Yearly**: *Cloud Storage 2TB* (`Every 1 Year`)
   - **Pause / Resume Demo**:
     - Find **"Spotify Family Plan"** (Paused, past due date `2026-09-20`).
     - Click **Resume** $\rightarrow$ status changes to `Active` and the next due date jumps forward to the upcoming cycle without backfilling past missed cycles!
   - **Completed State Demo**:
     - Point out **"Fitness Club 3-Month Trial"** (`3 of 3 posted`, status `Completed`, next due date `—`).
   - **Future-Only Edit**:
     - Edit amount on **"Condo Rental Fee"** from `12,000` to `12,500` $\rightarrow$ future runs use the new amount, historical transactions are untouched.

### Phase 5: Account Deletion Safeguard
9. Log out $\rightarrow$ Log in as `delete-demo@finlover.com` / `Password123`.
10. Navigate to `/profile` $\rightarrow$ delete the account with password confirmation.
11. Show that the deletion succeeds, cookies clear, and logging in again rejects the deleted account, while keeping `demo@finlover.com` completely untouched.

---

## 7. EPIC 8 — Reports Demo User

The Reports page (`/reports`) has its own account so the figures above stay unchanged.

| Account Purpose | Email | Password | Name | Initial State |
| :--- | :--- | :--- | :--- | :--- |
| **Reports Demo User** | `reports-demo@finlover.com` | `Password123` | Riley Reports (FinLover) | 3 Wallets (Cash, Bank, Credit Card), 14 default categories, 38 Transactions from July to October 2026 |

```bash
npm run db:seed:reports
```

It only rewrites this one user, so it is safe to run again and does not depend on `npm run db:seed:demo`. Wallet balances are derived from the transactions (wallets store no opening balance), so Cash and Credit Card end up negative; that is intended and is what the negative running-balance case uses. No shared wallet is seeded: create one on `/wallets` to see that the wallet filter leaves it out.

| Story | Filter to set | What you should see |
| :--- | :--- | :--- |
| **US8-1** Filter | Wallets: Cash + Bank only (untick Credit Card), Custom 2026-09-01 to 2026-09-30 | Every section shows only those two wallets: income ฿45,000.00, expenses ฿21,000.00, net +฿24,000.00 (8 transactions) |
| **US8-1** Validation | Custom with the end date before the start date, or untick every wallet | An error ("End date must be on or after the start date" / "Select at least 1 wallet") and the sections keep their previous data |
| **US8-2** Summary cards | All wallets, Custom 2026-09-01 to 2026-09-30 | Total Income ฿45,000.00, Total Expenses ฿30,000.00, Net Cash Flow +฿15,000.00 |
| **US8-2** Empty period | All wallets, February 2027 | All three cards ฿0.00 with "No transactions recorded in this period" |
| **US8-3** Cash flow | All wallets, Custom 2026-07-01 to 2026-09-30 | Weekly is preselected (92 days); Monthly shows Jul ฿28,000 in / ฿33,000 out, Aug ฿33,000 / ฿30,600, Sep ฿45,000 / ฿30,000 |
| **US8-3** Expense-only bucket | All wallets, Custom 2026-09-01 to 2026-09-30, Weekly | The week of 2026-09-07 has expenses ฿8,500 and income ฿0 (no income bar, no error); 2026-09-21 is the same |
| **US8-3** Range too wide | All wallets, Custom 2025-01-01 to 2026-12-31 | Daily is disabled; Weekly or Monthly stays available |
| **US8-4** Category distribution | All wallets, Custom 2026-09-01 to 2026-09-30 | Income: Salary 88.9% / Investment 11.1%. Expenses: Food & Drinks 35.0%, Shopping 23.3%, Utilities 20.0%, Transportation 16.7%, Others 5.0% (the ฿1,500 with no category) |
| **US8-4** No income | All wallets, Custom 2026-08-10 to 2026-08-20 | Expenses ฿7,400.00 as normal; the income side is empty (total ฿0.00, no items), so it shows the empty state "No income transactions for this period" |
| **US8-5** Running balance | All wallets, Custom 2026-10-01 to 2026-10-15, Daily | The line starts at ฿12,400.00 and ends at ฿36,400.00; it stays flat on days without transactions (for example 4 to 5 Oct); the ฿2,000 income on 20 Oct and the ฿700 expense on 22 Oct fall after the range but are part of the current balance it is worked back from |
| **US8-5** Negative balance | Credit Card only, Custom 2026-10-01 to 2026-10-15 | The line stays below zero: opening -฿32,500.00, closing -฿43,400.00 |

There are no transactions before July 2026 or after 22 October 2026, so any range outside that window is an empty period.
