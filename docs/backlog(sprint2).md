# Fin Lover — Comprehensive Product Backlog Specification

> **Target System**: Google Antigravity Agentic Development Environment (`Antigravity IDE` / `Antigravity CLI`)
> **Document Purpose**: Single-source-of-truth backlog specification for autonomous coding agents, detailing requirements, BDD acceptance criteria, sprint task execution, and system architecture.
> **Source Artifact**: [Backlog_FinLover (Google Sheets)](https://docs.google.com/spreadsheets/d/1NQlj5eAsOgyXtMamtfTY19KaFiTQDN9zSSv8yPdxx7I/edit?gid=1656414388#gid=1656414388)

## 1. Project Overview & Operational Context

| Metadata Attribute | Specification |
| :--- | :--- |
| **Project Name** | **Fin Lover** — Personal Finance Management Web Application |
| **Academic Context** | 2110423 Software Engineering Team Project (Chulalongkorn University) |
| **Total Product Backlog** | **132 Story Points** across **8 Epics** (42 User Stories) |
| **Sprint 1 Commitment** | 30.0 Story Points (84.25 Estimated Man-Hours) — *Completed Aug 25 – Sep 14, 2026* |
| **Sprint 2 Commitment** | 47.0 Story Points (124.0 Estimated Man-Hours) — *Active Sep 15 – Oct 19, 2026* |
| **Future Backlog Scope** | 55.0 Story Points (Epics 4, 7, 8) |
| **Primary Currency** | Thai Baht (THB / ฿) |
| **Architecture Model** | Client-Server Architecture (RESTful API backend + Single-Page Application frontend) |

### 1.1 Antigravity Agent Operational Directives
When operating in this codebase, Antigravity agents must enforce the following project standards:

1. **Strict End-to-End API Integration (Eliminate Mocks)**:
   - Sprint 1 created UI components and backend endpoints in silos. Frontend forms originally simulated delays using `setTimeout()` without dispatching HTTP requests.
   - **Agent Mandate**: Remove all mock timers and local-only state mutations. Every UI action must connect directly to real REST endpoints with proper error handling and HTTP status code validation.
2. **BDD Acceptance Criteria Adherence**:
   - Every implementation must strictly satisfy both the positive (happy path) and negative (validation/error path) criteria specified in the Gherkin scenarios.
3. **Transactional Integrity & Atomic Recalculations**:
   - Any mutation (creation, edit, deletion, recurring auto-post) to a transaction must automatically recalculate wallet balances, monthly summaries, and report metrics without requiring a full page refresh.
4. **Safe Cascading & Deletion Governance**:
   - Deleting a **Wallet** cascade-deletes all associated transactions after an explicit user confirmation.
   - Deleting a **Custom Category** reassigns associated transactions to `"Not Chosen"` after an impact warning.
   - **System Default Categories** are permanent and cannot be deleted by users.
5. **Data Privacy Compliance (PDPA/GDPR Baseline)**:
   - Registration requires explicit consent agreement recorded with a timestamp in the database.
   - Account deletion requires password re-authentication and must permanently erase all associated personal and financial data.

## 2. Team Governance & Review Architecture

The engineering team is organized into three cross-functional pods with strict peer review gatekeepers:

| Team Pod | Primary Scope | Pod Members | Focus Epics |
| :--- | :--- | :--- | :--- |
| **Team A** | UI / Frontend Architecture & Design Systems | Boss (Boonnapod), Timsum, Guy (Supanat) | All Epics (UI layer) |
| **Team B** | Authentication API, User Security & Database | Pat (Supawich), Yeen (Sarus), Ikkyu (Kasidis) | EPIC 1, Core Security |
| **Team C** | Financial Core APIs (Transactions, Categories, Wallets, DB) | Bushi (Kasidit), Tul (Thanachot), Ice (Sajakorn) | EPIC 2, 3, 5, 6 |

**Reviewer Protocol**: All Pull Requests require sign-off from designated cross-pod reviewers before merging. Frontend code from Team A is reviewed by backend engineers (Teams B & C), while API/Database contracts are reviewed across teams to prevent integration regressions.

## 3. Sprint Delivery Roadmap & Velocity

### 3.1 Sprint 1 Review (Aug 25 – Sep 14, 2026)
- **Goal**: User accounts, category foundation, core transaction creation, and privacy consent baseline.
- **Commitment**: 30 Story Points (84.25 estimated hours).
- **Key Outcome & Integration Debt**: UI forms and API endpoints were developed in parallel but never integrated (e.g., Register form called `setTimeout()` instead of `POST /api/auth/register`; Add Transaction modified local array state without awaiting `POST /api/transaction`). All integration wiring was carried over into Sprint 2.

### 3.2 Sprint 2 Active Scope (Sep 15 – Oct 19, 2026)
- **Goal**: Complete end-to-end integration wiring, deliver full Home Dashboard rework, implement Multiple Wallets, add Account Deletion, and enhance Categories with icons and system defaults.
- **Commitment**: 47 Story Points (124.0 estimated hours across 35 calendar days).
- **Work Breakdown**:
  1. **Carry-Over Integration (12 Stories)**: Wire frontend forms to backend APIs for Auth (US1-1, US1-2, US1-3), Transactions (US3-1, US3-2, US3-3, US3-4, US3-5), and Categories (US5-1, US5-2, US5-3, US5-4).
  2. **Security & Account Lifecycle**: US1-4 (Account Deletion with password confirmation).
  3. **Home Dashboard Overhaul (9 Stories)**: US2-1 through US2-9 (Month navigation `< Month >`, Total Balance card, Income card, Expense card, Net Balance 'ยอดคงเหลือ' card, Top Categories card, Embedded Savings Goal progress, Monthly Transactions table with edit/delete, Quick-Add form).
  4. **Multiple Wallets Engine (6 Stories)**: US6-1 through US6-6 (Create wallet, switch active wallet, saving wallet toggle & goal, hide balance eye-icon toggle, cascade delete wallet, edit wallet metadata).
  5. **Transaction & Category Enhancements**: US3-6 (Filter-aware summary cards), US3-3 Search Addition, US5-5 (Icon library), US5-6 (Default category seeding).

### 3.3 Future Sprints (Backlog Scope — 55 Story Points)
- **EPIC 4: Recurring Transactions (17 SP)** — US4-1 to US4-5 (Automated scheduling engine, calendar view, rule management).
- **EPIC 7: Shared Wallets (8 SP)** — US7-1 to US7-2 (Multi-user wallet collaboration, email invitations, RBAC).
- **EPIC 8: Financial Reports & Analytics (14 SP)** — US8-1 to US8-4 (Position summaries, monthly comparison charts, category distribution pie charts, custom temporal filters).

## 4. Master Product Backlog Index (132 Story Points)

| Story ID | Epic ID | Epic Name | Page / Target | Estimate (SP) | Sprint Phase |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **US1-1** | EPIC 1 | User Authentication & Account Security | Register page | 5.0 | Sprint 2 (Carry-Over Integration) |
| **US1-2** | EPIC 1 | User Authentication & Account Security | Login page | 5.0 | Sprint 2 (Carry-Over Integration) |
| **US1-3** | EPIC 1 | User Authentication & Account Security | Account menu (Logout) | 2.0 | Sprint 2 (Carry-Over Integration) |
| **US1-4** | EPIC 1 | User Authentication & Account Security | Account Settings | 2.0 | Sprint 2 (Active Scope) |
| **US2-1** | EPIC 2 | Home Page Dashboard | Home page | 2.0 | Sprint 2 (Active Scope) |
| **US2-2** | EPIC 2 | Home Page Dashboard | Home page | 3.0 | Sprint 2 (Active Scope) |
| **US2-3** | EPIC 2 | Home Page Dashboard | Home page | 2.0 | Sprint 2 (Active Scope) |
| **US2-4** | EPIC 2 | Home Page Dashboard | Home page | 2.0 | Sprint 2 (Active Scope) |
| **US2-5** | EPIC 2 | Home Page Dashboard | Home page | 2.0 | Sprint 2 (Active Scope) |
| **US2-6** | EPIC 2 | Home Page Dashboard | Home page | 2.0 | Sprint 2 (Active Scope) |
| **US2-7** | EPIC 2 | Home Page Dashboard | Home page | 2.0 | Sprint 2 (Active Scope) |
| **US2-8** | EPIC 2 | Home Page Dashboard | Home page | 3.0 | Sprint 2 (Active Scope) |
| **US2-9** | EPIC 2 | Home Page Dashboard | Home page | 3.0 | Sprint 2 (Active Scope) |
| **US3-1** | EPIC 3 | Transaction Management | Transactions page | 5.0 | Sprint 2 (Carry-Over Integration) |
| **US3-2** | EPIC 3 | Transaction Management | Transactions page | 3.0 | Sprint 2 (Carry-Over Integration) |
| **US3-3** | EPIC 3 | Transaction Management | Transactions page | 8.0 | Sprint 2 (Carry-Over Integration) |
| **US3-4** | EPIC 3 | Transaction Management | Transactions page | 2.0 | Sprint 2 (Carry-Over Integration) |
| **US3-5** | EPIC 3 | Transaction Management | Transactions page | 3.0 | Sprint 2 (Carry-Over Integration) |
| **US3-6** | EPIC 3 | Transaction Management | Transactions page | 3.0 | Sprint 2 (Active Scope) |
| **US4-1** | EPIC 4 | Recurring Transactions | Transactions page (Recurring section) | 5.0 | Product Backlog (Future Sprint) |
| **US4-2** | EPIC 4 | Recurring Transactions | Transactions page (Recurring section) | 3.0 | Product Backlog (Future Sprint) |
| **US4-3** | EPIC 4 | Recurring Transactions | Transactions page (Recurring section) | 3.0 | Product Backlog (Future Sprint) |
| **US4-4** | EPIC 4 | Recurring Transactions | Transactions page (Recurring section) | 3.0 | Product Backlog (Future Sprint) |
| **US4-5** | EPIC 4 | Recurring Transactions | Transactions page (Recurring section) | 3.0 | Product Backlog (Future Sprint) |
| **US5-1** | EPIC 5 | Category Management | Category page | 3.0 | Sprint 2 (Carry-Over Integration) |
| **US5-2** | EPIC 5 | Category Management | Category page | 3.0 | Sprint 2 (Carry-Over Integration) |
| **US5-3** | EPIC 5 | Category Management | Category page | 2.0 | Sprint 2 (Carry-Over Integration) |
| **US5-4** | EPIC 5 | Category Management | Category page | 5.0 | Sprint 2 (Carry-Over Integration) |
| **US5-5** | EPIC 5 | Category Management | Category page | 2.0 | Sprint 2 (Active Scope) |
| **US5-6** | EPIC 5 | Category Management | Category page | 2.0 | Sprint 2 (Active Scope) |
| **US6-1** | EPIC 6 | Multiple Wallets | Wallet page | 5.0 | Sprint 2 (Active Scope) |
| **US6-2** | EPIC 6 | Multiple Wallets | Wallet page | 2.0 | Sprint 2 (Active Scope) |
| **US6-3** | EPIC 6 | Multiple Wallets | Wallet page | 3.0 | Sprint 2 (Active Scope) |
| **US6-4** | EPIC 6 | Multiple Wallets | Wallet page | 2.0 | Sprint 2 (Active Scope) |
| **US6-5** | EPIC 6 | Multiple Wallets | Wallet page | 3.0 | Sprint 2 (Active Scope) |
| **US6-6** | EPIC 6 | Multiple Wallets | Wallet page | 2.0 | Sprint 2 (Active Scope) |
| **US7-1** | EPIC 7 | Shared Wallets | Wallet page | 5.0 | Product Backlog (Future Sprint) |
| **US7-2** | EPIC 7 | Shared Wallets | Wallet page | 3.0 | Product Backlog (Future Sprint) |
| **US8-1** | EPIC 8 | Financial Reports & Analytics Dashboard | Report page | 5.0 | Product Backlog (Future Sprint) |
| **US8-2** | EPIC 8 | Financial Reports & Analytics Dashboard | Report page | 3.0 | Product Backlog (Future Sprint) |
| **US8-3** | EPIC 8 | Financial Reports & Analytics Dashboard | Report page | 3.0 | Product Backlog (Future Sprint) |
| **US8-4** | EPIC 8 | Financial Reports & Analytics Dashboard | Report page | 3.0 | Product Backlog (Future Sprint) |
| **TOTAL** | — | **8 Epics (42 User Stories)** | — | **132.0** | — |

## 5. Comprehensive Epic & User Story Specifications

### EPIC 1: User Authentication & Account Security (14.0 Story Points)

**Epic Description**: User registration, authentication, credential validation, session token lifecycle, data privacy consent recording, and permanent account deletion.

#### US1-1 — Register page [5.0 SP]

- **Epic**: EPIC 1 (User Authentication & Account Security)
- **Target Page / Component**: `Register page`
- **Estimate**: **5.0 Story Points**
- **Delivery Lifecycle**: **Sprint 2 (Carry-Over Integration)**
- **Traceability / Engineering Notes**: Ref: FR 2.1 platform baseline; Data Privacy requirement (course note)

**User Story Statement**:
> As a user, I want to register a new account with my email and password, So that I can securely access my personal finance data.

**Acceptance Criteria (Gherkin BDD)**:

**Scenario 1**:
- **Given** the user is on the registration page and provides valid inputs: - Username with at least 2 characters, - Email with correct email format that is not previously registered, - Password containing at least 1 uppercase letter, 1 lowercase letter, and 1 number, - Matching confirm password, - Checked privacy policy agreement checkbox, 
- **When** the user attempts to register a new account, 
- **Then** the system should create the account, record the consent choice, and allow the action.

**Scenario 2**:
- **Given** the user is on the registration page, 
- **When** the user attempts to register with incomplete or invalid input (e.g., invalid email format like "user@example", mismatched password confirmation, or without accepting the data collection consent), 
- **Then** the system should display an appropriate error message and not create the account.

**Sprint 2 Engineering Tasks**:

| Task Description | Assignee (Volunteer) | Reviewer | Hours | Status |
| :--- | :--- | :--- | :---: | :---: |
| Wire Register form to POST /api/auth/register (remove mock setTimeout) | Yeen, Guy, Boss | Tul | 2.0h | To Do |
| Re-test register end-to-end with real API | Tul, Timsum | - | 1.0h | To Do |

---

#### US1-2 — Login page [5.0 SP]

- **Epic**: EPIC 1 (User Authentication & Account Security)
- **Target Page / Component**: `Login page`
- **Estimate**: **5.0 Story Points**
- **Delivery Lifecycle**: **Sprint 2 (Carry-Over Integration)**
- **Traceability / Engineering Notes**: Ref: baseline auth (not explicit in FR doc, required for a multi-user system)

**User Story Statement**:
> As a registered user, I want to log in with my email and password, So that I can access my personal dashboard.

**Acceptance Criteria (Gherkin BDD)**:

**Scenario 1**:
- **Given** a registered account with email "user@example.com" and password "Passw0rd!", 
- **When** the user attempts to log in with those exact credentials, 
- **Then** the system should allow the action and grant access to the dashboard.

**Scenario 2**:
- **Given** the user input is incomplete or invalid, e.g., email "user@example.com" with an incorrect password "wrongpass", 
- **When** the user attempts to log in, 
- **Then** the system should display an appropriate error message ("Invalid email or password") without revealing which field was wrong.

**Sprint 2 Engineering Tasks**:

| Task Description | Assignee (Volunteer) | Reviewer | Hours | Status |
| :--- | :--- | :--- | :---: | :---: |
| Wire Login form to POST /api/auth/login | Yeen, Guy, Boss | Timsum | 2.0h | To Do |
| Re-test login end-to-end with real API | Tul, Timsum | - | 1.0h | To Do |

---

#### US1-3 — Account menu (Logout) [2.0 SP]

- **Epic**: EPIC 1 (User Authentication & Account Security)
- **Target Page / Component**: `Account menu (Logout)`
- **Estimate**: **2.0 Story Points**
- **Delivery Lifecycle**: **Sprint 2 (Carry-Over Integration)**
- **Traceability / Engineering Notes**: Security requirement

**User Story Statement**:
> As a logged-in user, I want to log out of the system, So that my account stays secure on shared devices.

**Acceptance Criteria (Gherkin BDD)**:

**Scenario 1**:
- **Given** the user is logged in with an active session, 
- **When** the user attempts to log out, 
- **Then** the system should allow the action, invalidate the session/token, and redirect to the login page.

**Scenario 2**:
- **Given** the user's session token has already expired or been invalidated, 
- **When** the user attempts to access a protected page, 
- **Then** the system should display an appropriate message ("Session expired, please log in again") and redirect to the login page.

**Sprint 2 Engineering Tasks**:

| Task Description | Assignee (Volunteer) | Reviewer | Hours | Status |
| :--- | :--- | :--- | :---: | :---: |
| Wire Logout button to POST /api/auth/logout | Yeen, Guy, Boss | Pat | 1.0h | To Do |
| Re-test logout end-to-end with real API | Tul, Timsum | - | 1.0h | To Do |

---

#### US1-4 — Account Settings [2.0 SP]

- **Epic**: EPIC 1 (User Authentication & Account Security)
- **Target Page / Component**: `Account Settings`
- **Estimate**: **2.0 Story Points**
- **Delivery Lifecycle**: **Sprint 2 (Active Scope)**

**User Story Statement**:
> As a logged-in user, I want to delete my account, So that I can permanently remove my personal and financial data from the system.

**Acceptance Criteria (Gherkin BDD)**:

**Scenario 1**:
- **Given** the user is logged in and on the "Delete Account" confirmation page, 
- **When** the user re-enters their current password "Passw0rd!" and confirms the deletion, 
- **Then** the system should allow the action, permanently delete the user's account and associated personal data, invalidate the session, and redirect to the login/landing page.

**Scenario 2**:
- **Given** the user is logged in and on the "Delete Account" confirmation page, 
- **When** the user attempts to confirm deletion with an incorrect password (e.g. "wrongpass") or without re-entering the password field, 
- **Then** the system should display an appropriate error message ("Incorrect password, account not deleted") and not delete the account.

**Sprint 2 Engineering Tasks**:

| Task Description | Assignee (Volunteer) | Reviewer | Hours | Status |
| :--- | :--- | :--- | :---: | :---: |
| Design delete-account confirmation UI (password re-entry) | Yeen, Guy, Boss | Ice | 2.0h | To Do |
| Implement delete-account API (verify password, cascade delete user data) | Bushi, Ikkyu | Yeen | 3.0h | To Do |
| Invalidate session & redirect on successful deletion | Bushi, Ikkyu | Boss | 1.0h | To Do |
| Test delete-account functionality (valid & invalid password) | Tul, Timsum | - | 1.0h | To Do |

---

### EPIC 2: Home Page Dashboard (21.0 Story Points)

**Epic Description**: Central dashboard providing monthly overview, dynamic month navigation, total balance, monthly income/expense/net balance cards, top category spending breakdown, embedded savings goal progress, in-place monthly transaction management, and quick-add actions.

#### US2-1 — Home page [2.0 SP]

- **Epic**: EPIC 2 (Home Page Dashboard)
- **Target Page / Component**: `Home page`
- **Estimate**: **2.0 Story Points**
- **Delivery Lifecycle**: **Sprint 2 (Active Scope)**
- **Traceability / Engineering Notes**: Ref: Sprint 2 meeting note (13 Sep 2026) — Home page month navigation

**User Story Statement**:
> As a user, I want to navigate between months using previous/next buttons or a month picker on my home page, So that I can quickly review transactions from any month without opening the full reports page.

**Acceptance Criteria (Gherkin BDD)**:

**Scenario 1**:
- **Given** the user is on the home page currently viewing "September 2026", 
- **When** the user clicks the previous-month arrow, 
- **Then** the system should allow the action and update the page to show transactions and wallet totals for "August 2026".

**Scenario 2**:
- **Given** the user is on the home page, 
- **When** the user navigates to any month (past or future) using the previous/next buttons (‹ ›) or the month picker and the selected month has no recorded transactions, 
- **Then** the system should allow the action, display the selected month, and show an appropriate empty state (e.g., ฿0 totals and an empty transaction list) without any errors.

**Sprint 2 Engineering Tasks**:

| Task Description | Assignee (Volunteer) | Reviewer | Hours | Status |
| :--- | :--- | :--- | :---: | :---: |
| Implement get-total-balance API (aggregate across wallets; return savingGoal if saving wallet with goal) | Pat, Ice | Guy | 2.0h | To Do |
| Wire Total Balance card to API (include embedded saving goal progress) | Yeen, Guy, Boss | Ikkyu | 1.0h | To Do |
| Test Total Balance card (current balance, saving goal embedded, empty state) | Tul, Timsum | - | 1.0h | To Do |

---

#### US2-2 — Home page [3.0 SP]

- **Epic**: EPIC 2 (Home Page Dashboard)
- **Target Page / Component**: `Home page`
- **Estimate**: **3.0 Story Points**
- **Delivery Lifecycle**: **Sprint 2 (Active Scope)**
- **Traceability / Engineering Notes**: Ref: dashboard mockup — Home page "Total Balance" card

**User Story Statement**:
> As a user, I want to see my current total balance on my home page, and see my saving goal progress in the same card if a saving wallet with a goal is selected, So that I can immediately know my overall financial position when I open the app.

**Acceptance Criteria (Gherkin BDD)**:

**Scenario 1**:
- **Given** the user is on the home page, 
- **When** the user views the Total Balance card, 
- **Then** the system should display only the current balance (without monthly percentage change comparison); if a saving wallet with a set goal is selected, the system should also display its saving goal progress (current balance, target goal, and percentage) within the same card.

**Scenario 2**:
- **Given** the user has no wallets set up yet, 
- **When** the user opens the home page, 
- **Then** the system should display an appropriate empty-state message (e.g., "Create a wallet to see your balance") instead of showing ฿0.00 or an error.

**Sprint 2 Engineering Tasks**:

| Task Description | Assignee (Volunteer) | Reviewer | Hours | Status |
| :--- | :--- | :--- | :---: | :---: |
| Implement get-income-this-month API (total income only, no recent items) | Bushi, Ikkyu | Yeen | 2.0h | To Do |
| Wire Income card to API | Yeen, Guy, Boss | Bushi | 1.0h | To Do |
| Test Income this month card (no income case) | Tul, Timsum | - | 1.0h | To Do |

---

#### US2-3 — Home page [2.0 SP]

- **Epic**: EPIC 2 (Home Page Dashboard)
- **Target Page / Component**: `Home page`
- **Estimate**: **2.0 Story Points**
- **Delivery Lifecycle**: **Sprint 2 (Active Scope)**
- **Traceability / Engineering Notes**: Ref: dashboard mockup — Home page "Income this month" card

**User Story Statement**:
> As a user, I want to see my total income for the current month on my home page, So that I can quickly track how much I've earned this month.

**Acceptance Criteria (Gherkin BDD)**:

**Scenario 1**:
- **Given** the user has recorded income transactions in the selected month totaling "฿32,000", 
- **When** the user views the home page, 
- **Then** the system should allow the action and display only the total income amount ("฿32,000") labeled for that month, without displaying recent income transaction items.

**Scenario 2**:
- **Given** the user has no income transactions recorded this month, 
- **When** the user opens the home page, 
- **Then** the system should display "฿0" and an appropriate message instead of leaving the card blank.

**Sprint 2 Engineering Tasks**:

| Task Description | Assignee (Volunteer) | Reviewer | Hours | Status |
| :--- | :--- | :--- | :---: | :---: |
| Implement get-expense-this-month API (total expense only, no % comparison) | Bushi, Ikkyu | Boss | 2.0h | To Do |
| Wire Spent card to API | Yeen, Guy, Boss | Ikkyu | 1.0h | To Do |
| Test Spent this month card (no expense case) | Tul, Timsum | - | 1.0h | To Do |

---

#### US2-4 — Home page [2.0 SP]

- **Epic**: EPIC 2 (Home Page Dashboard)
- **Target Page / Component**: `Home page`
- **Estimate**: **2.0 Story Points**
- **Delivery Lifecycle**: **Sprint 2 (Active Scope)**
- **Traceability / Engineering Notes**: Ref: dashboard mockup — Home page "Spent this month" card

**User Story Statement**:
> As a user, I want to see my total spending for the current month on my home page, So that I can monitor how much I've spent so far.

**Acceptance Criteria (Gherkin BDD)**:

**Scenario 1**:
- **Given** the user has recorded expense transactions in the selected month totaling "฿9,180", 
- **When** the user views the home page, 
- **Then** the system should allow the action and display only the total expense amount ("฿9,180") labeled for that month, without displaying any percentage comparison to last month.

**Scenario 2**:
- **Given** the user has no expense transactions recorded this month, 
- **When** the user opens the home page, 
- **Then** the system should display "฿0" and an appropriate message rather than an error or blank card.

**Sprint 2 Engineering Tasks**:

| Task Description | Assignee (Volunteer) | Reviewer | Hours | Status |
| :--- | :--- | :--- | :---: | :---: |
| Replace the existing SpendingTrendChart component with a Net Balance card (spec changed after it was built) | Tul, Timsum, Guy, Boss | Bushi | 2.0h | To Do |
| Implement get-net-this-month API (income minus expense) | Bushi, Ikkyu | Guy | 1.0h | To Do |
| Wire Net card to API | Yeen, Guy, Boss | Ikkyu | 1.0h | To Do |
| Test Net card (surplus and overspend cases) | Tul, Timsum | - | 1.0h | To Do |

---

#### US2-5 — Home page [2.0 SP]

- **Epic**: EPIC 2 (Home Page Dashboard)
- **Target Page / Component**: `Home page`
- **Estimate**: **2.0 Story Points**
- **Delivery Lifecycle**: **Sprint 2 (Active Scope)**
- **Traceability / Engineering Notes**: Ref: Sprint 2 meeting note — "ยอดคงเหลือ" (net this month); replaces the Spending trend chart on the home page; kept alongside the separate Total Balance card (US2-2)

**User Story Statement**:
> As a user, I want to see my net income minus expenses for the current month on my home page, So that I can tell at a glance whether I'm saving or overspending this month.

**Acceptance Criteria (Gherkin BDD)**:

**Scenario 1**:
- **Given** the user's income this month is "฿32,000" and expenses this month are "฿9,180", 
- **When** the user opens the home page, 
- **Then** the system should allow the action and display the net amount as "+฿22,820" (income minus expenses) clearly marked as a positive surplus.

**Scenario 2**:
- **Given** the user's expenses this month exceed their income (e.g., income "฿5,000" and expenses "฿9,180"), 
- **When** the user opens the home page, 
- **Then** the system should display the net amount as a negative value (e.g., "-฿4,180") clearly marked in a way that signals overspending.

**Sprint 2 Engineering Tasks**:

| Task Description | Assignee (Volunteer) | Reviewer | Hours | Status |
| :--- | :--- | :--- | :---: | :---: |
| Implement get-top-categories-this-month API | Bushi, Ikkyu | Tul | 2.0h | To Do |
| Wire category breakdown list to API | Yeen, Guy, Boss | Bushi | 1.0h | To Do |
| Test category breakdown (empty state) | Tul, Timsum | - | 1.0h | To Do |

---

#### US2-6 — Home page [2.0 SP]

- **Epic**: EPIC 2 (Home Page Dashboard)
- **Target Page / Component**: `Home page`
- **Estimate**: **2.0 Story Points**
- **Delivery Lifecycle**: **Sprint 2 (Active Scope)**
- **Traceability / Engineering Notes**: Ref: dashboard mockup — Home page "Category breakdown" card (simplified; the full breakdown chart remains on the Report page per US8-3)

**User Story Statement**:
> As a user, I want to see a short list of my top spending categories for the current month on my home page, So that I can quickly notice where most of my money is going without opening the full report.

**Acceptance Criteria (Gherkin BDD)**:

**Scenario 1**:
- **Given** the user has expenses this month across multiple categories (e.g., "Food & drink" ฿3,240, "Transport" ฿1,180, "Shopping" ฿2,860), 
- **When** the user opens the home page, 
- **Then** the system should allow the action and display the top categories with their amounts, sorted from highest to lowest spend.

**Scenario 2**:
- **Given** the user has no expense transactions this month, 
- **When** the user opens the home page, 
- **Then** the system should display an appropriate empty-state message instead of an empty or broken list.

**Sprint 2 Engineering Tasks**:

| Task Description | Assignee (Volunteer) | Reviewer | Hours | Status |
| :--- | :--- | :--- | :---: | :---: |
| Implement get-savings-goal-progress in summary API (embedded with total balance) | Pat, Ice | Timsum | 2.0h | To Do |
| Wire embedded Savings Goal UI inside Total Balance card (show only for saving wallet with goal) | Yeen, Guy, Boss | Ikkyu | 1.0h | To Do |
| Test embedded Savings Goal in Total Balance card (saving wallet with goal vs standard/all wallets) | Tul, Timsum | - | 1.0h | To Do |

---

#### US2-7 — Home page [2.0 SP]

- **Epic**: EPIC 2 (Home Page Dashboard)
- **Target Page / Component**: `Home page`
- **Estimate**: **2.0 Story Points**
- **Delivery Lifecycle**: **Sprint 2 (Active Scope)**
- **Traceability / Engineering Notes**: Ref: dashboard mockup — Home page "Savings goal" card; relates to US6-3 (mark wallet as Saving Wallet)

**User Story Statement**:
> As a user, I want to see my savings goal progress embedded inside the Total Balance card when I select a saving wallet with a goal, So that I can track my savings progress without needing a separate standalone card.

**Acceptance Criteria (Gherkin BDD)**:

**Scenario 1**:
- **Given** the user selects a saving wallet that has a designated savings goal (e.g., "Emergency fund" with goal "฿20,000" and balance "฿12,400"), 
- **When** the user opens the home page, 
- **Then** the system should display the savings goal progress bar and details ("฿12,400 of ฿20,000 · 62%") directly embedded within the Total Balance card.

**Scenario 2**:
- **Given** the user selects "All wallets", a standard wallet, or a saving wallet with no goal set, 
- **When** the user opens the home page, 
- **Then** the system should hide the savings goal section inside the Total Balance card and should not display any standalone savings goal card.

**Sprint 2 Engineering Tasks**:

| Task Description | Assignee (Volunteer) | Reviewer | Hours | Status |
| :--- | :--- | :--- | :---: | :---: |
| Integrate shared Transactions table component into Home page with Edit and Delete actions | Tul, Timsum, Guy, Boss | Bushi | 1.0h | To Do |
| Implement get-transactions-by-month API | Bushi, Ikkyu | Pat | 2.0h | To Do |
| Wire home transaction table to PATCH/DELETE APIs and refresh home totals/balance on change | Yeen, Guy, Boss | Ikkyu | 1.0h | To Do |
| Test home transaction table (view, edit, delete, empty month state) | Tul, Timsum | - | 1.0h | To Do |

---

#### US2-8 — Home page [3.0 SP]

- **Epic**: EPIC 2 (Home Page Dashboard)
- **Target Page / Component**: `Home page`
- **Estimate**: **3.0 Story Points**
- **Delivery Lifecycle**: **Sprint 2 (Active Scope)**
- **Traceability / Engineering Notes**: Ref: Sprint 2 meeting note — Home page shows all transactions for the selected month (replaces the "Recent transactions" card from the mockup)

**User Story Statement**:
> As a user, I want to view, edit, and delete transactions for the selected month directly from the home page using the same table component as the Transactions page, So that I can manage my monthly records conveniently without switching pages.

**Acceptance Criteria (Gherkin BDD)**:

**Scenario 1**:
- **Given** the user is on the home page for a selected month with recorded transactions, 
- **When** the user views the transaction section, 
- **Then** the system should render transactions using the shared Transactions table component (sorted by date newest first, with category chip, wallet tag, date, amount, and an action menu ⋮ for Edit and Delete).

**Scenario 2**:
- **Given** the user clicks Edit or Delete on a transaction row in the home page table, 
- **When** the user modifies details or confirms deletion, 
- **Then** the system should allow the action, update or remove the transaction, and immediately update the wallet balance and home page summary totals without requiring a full page refresh.

**Sprint 2 Engineering Tasks**:

| Task Description | Assignee (Volunteer) | Reviewer | Hours | Status |
| :--- | :--- | :--- | :---: | :---: |
| Design month-navigator UI (< Month > and 12-month calendar picker) | Tul, Timsum, Guy, Boss | Bushi | 1.0h | To Do |
| Implement month-navigation state/query handling for past and future months | Yeen, Guy, Boss | Ice | 2.0h | To Do |
| Support navigating to any month (‹ › / picker) and render empty state when no data exists | Yeen, Guy, Boss | Ikkyu | 1.0h | To Do |
| Test month navigation across any month and empty state handling | Tul, Timsum | - | 1.0h | To Do |

---

#### US2-9 — Home page [3.0 SP]

- **Epic**: EPIC 2 (Home Page Dashboard)
- **Target Page / Component**: `Home page`
- **Estimate**: **3.0 Story Points**
- **Delivery Lifecycle**: **Sprint 2 (Active Scope)**
- **Traceability / Engineering Notes**: Ref: dashboard mockup — Home page quick-add transaction form (Expense/Income toggle, amount, category, date)

**User Story Statement**:
> As a user, I want to quickly add a new transaction directly from my home page, So that I can log spending or income without navigating to a separate page.

**Acceptance Criteria (Gherkin BDD)**:

**Scenario 1**:
- **Given** the user is on the home page, 
- **When** the user taps the "+" button, selects "Expense", enters an amount of "180", a description "Grab, coffee...", a category, and today's date, 
- **Then** the system should allow the action, save the transaction, and immediately reflect it in the current month's transaction list and updated totals.

**Scenario 2**:
- **Given** the user opens the quick-add form on the home page, 
- **When** the user attempts to submit without entering an amount (leaving the amount field empty or ฿0), 
- **Then** the system should display an appropriate error message and not save the transaction.

**Sprint 2 Engineering Tasks**:

| Task Description | Assignee (Volunteer) | Reviewer | Hours | Status |
| :--- | :--- | :--- | :---: | :---: |
| Implement quick-add wired to existing add-transaction API | Bushi, Ikkyu | Yeen | 1.0h | To Do |
| Refresh home totals & list after quick-add | Yeen, Guy, Boss | Tul | 1.0h | To Do |
| Test quick-add (valid and empty-amount cases) | Tul, Timsum | - | 1.0h | To Do |

---

### EPIC 3: Transaction Management (24.0 Story Points)

**Epic Description**: Core CRUD capabilities for income and expense transactions, multi-criteria filtering (category, wallet, date range, type), full-text search, category assignment, and filter-aware financial summary metrics.

#### US3-1 — Transactions page [5.0 SP]

- **Epic**: EPIC 3 (Transaction Management)
- **Target Page / Component**: `Transactions page`
- **Estimate**: **5.0 Story Points**
- **Delivery Lifecycle**: **Sprint 2 (Carry-Over Integration)**
- **Traceability / Engineering Notes**: Ref: FR 1.1 Add Transaction

**User Story Statement**:
> As a user, I want to add a new income or expense transaction, So that I can track my daily cash flow.

**Acceptance Criteria (Gherkin BDD)**:

**Scenario 1**:
- **Given** the user is on the "Add Transaction" page, 
- **When** the user attempts to add a transaction with amount "500.00", date "2026-08-25", type "Expense", and category "Food", 
- **Then** the system should allow the action, save the transaction, and update the account balance.

**Scenario 2**:
- **Given** the user is on the "Add Transaction" page, 
- **When** the user attempts to add a transaction with incomplete or invalid input (e.g., negative amount like "-500" or an empty required date field), 
- **Then** the system should display an appropriate error message and not save the transaction.

**Sprint 2 Engineering Tasks**:

| Task Description | Assignee (Volunteer) | Reviewer | Hours | Status |
| :--- | :--- | :--- | :---: | :---: |
| Wire Add Transaction form to POST /api/transaction | Yeen, Guy, Boss | Bushi | 2.0h | To Do |
| Re-test add transaction end-to-end with real API | Guy, Timsum | - | 1.0h | To Do |

---

#### US3-2 — Transactions page [3.0 SP]

- **Epic**: EPIC 3 (Transaction Management)
- **Target Page / Component**: `Transactions page`
- **Estimate**: **3.0 Story Points**
- **Delivery Lifecycle**: **Sprint 2 (Carry-Over Integration)**
- **Traceability / Engineering Notes**: Ref: FR 1.1 Edit Transaction

**User Story Statement**:
> As a user, I want to edit an existing transaction, So that I can correct mistakes in my financial records.

**Acceptance Criteria (Gherkin BDD)**:

**Scenario 1**:
- **Given** an existing transaction owned by the user with amount "500.00", 
- **When** the user attempts to update the amount to "550.00", 
- **Then** the system should allow the action, update the record, and recalculate the balance.

**Scenario 2**:
- **Given** the user amout input is invalid, e.g., amount "-500" (negative) or an empty date field, type 
- **When** the user attempts to edit a transaction, 
- **Then** the system should display an appropriate error message and not edit the transaction.

**Sprint 2 Engineering Tasks**:

| Task Description | Assignee (Volunteer) | Reviewer | Hours | Status |
| :--- | :--- | :--- | :---: | :---: |
| Wire Edit Transaction form to PUT /api/transaction/:id | Yeen, Guy, Boss | Ikkyu | 2.0h | To Do |
| Re-test edit transaction end-to-end with real API | Guy, Timsum | - | 1.0h | To Do |

---

#### US3-3 — Transactions page [8.0 SP]

- **Epic**: EPIC 3 (Transaction Management)
- **Target Page / Component**: `Transactions page`
- **Estimate**: **8.0 Story Points**
- **Delivery Lifecycle**: **Sprint 2 (Carry-Over Integration)**

**User Story Statement**:
> As a registered user, I want to view my transaction history and filter them by various criteria, So that I can track and analyze my spending habits efficiently.

**Acceptance Criteria (Gherkin BDD)**:

**Scenario 1**:
- **Given** the user is on the transaction history page: - System displays transactions sorted by date (newest first) - System displays filters for Category, Wallet, Date Range, and Type (Income/Expense) 
- **When** the user selects one or multiple valid filter criteria (e.g., specific Category, Wallet, Date Range, or Type) 
- **Then** the system should immediately update the list to show only transactions that match all selected criteria.

**Scenario 2**:
- **Given** the user is on the transaction history page with applied filters, 
- **When** the user clicks the "Clear Filters" button, 
- **Then** the system should reset all filter criteria to default and display all transactions.

**Scenario 3**:
- **Given** the user applies filters that do not match any existing transactions, 
- **When** the filtered list is updated, 
- **Then** the system should display an empty state message (e.g., "No transactions found matching your criteria") and present an option to clear filters.

**Scenario 4**:
- **Given** the user types "coffee" into the "Search by title or note" field on the Transactions page, 
- **When** the search is applied, 
- **Then** the system should allow the action and display only transactions whose title or note contains "coffee" (case-insensitive), combined with any other active filters.

**Sprint 2 Engineering Tasks**:

| Task Description | Assignee (Volunteer) | Reviewer | Hours | Status |
| :--- | :--- | :--- | :---: | :---: |
| Wire transaction list/filters to GET /api/transaction | Yeen, Guy, Boss | Bushi | 2.0h | To Do |
| Re-test view/filter history end-to-end with real API | Guy, Timsum | - | 1.0h | To Do |
| Design search input UI on Transactions page | Tul, Timsum, Guy, Boss | Bushi | 1.0h | To Do |
| Implement search-by-title-or-note API parameter | Bushi, Ikkyu | Guy | 2.0h | To Do |
| Wire search box combined with existing filters | Yeen, Guy, Boss | Ikkyu | 1.0h | To Do |
| Test search (case-insensitive, combined with filters) | Guy, Timsum | - | 1.0h | To Do |

---

#### US3-4 — Transactions page [2.0 SP]

- **Epic**: EPIC 3 (Transaction Management)
- **Target Page / Component**: `Transactions page`
- **Estimate**: **2.0 Story Points**
- **Delivery Lifecycle**: **Sprint 2 (Carry-Over Integration)**
- **Traceability / Engineering Notes**: Ref: FR 1.1 Delete Transaction (auto-recalculate)

**User Story Statement**:
> As a user, I want to delete a transaction, So that I can remove entries I no longer need.

**Acceptance Criteria (Gherkin BDD)**:

**Scenario 1**:
- **Given** an existing transaction with ID "TXN-1001" owned by the user, 
- **When** the user attempts to delete it and confirms the action, 
- **Then** the system should allow the action, remove the transaction, and automatically recalculate the balance and reports.

**Scenario 2**:
- **Given** an existing transaction with ID "TXN-1001" is not owned by the user, 
- **When** the user attempts to delete it and confirms the action, 
- **Then** the system should display an appropriate error message and not delete the transaction.

**Sprint 2 Engineering Tasks**:

| Task Description | Assignee (Volunteer) | Reviewer | Hours | Status |
| :--- | :--- | :--- | :---: | :---: |
| Wire Delete Transaction to DELETE /api/transactions/:id | Yeen, Guy, Boss | Ikkyu | 1.0h | To Do |
| Re-test delete transaction end-to-end with real API | Guy, Timsum | - | 1.0h | To Do |

---

#### US3-5 — Transactions page [3.0 SP]

- **Epic**: EPIC 3 (Transaction Management)
- **Target Page / Component**: `Transactions page`
- **Estimate**: **3.0 Story Points**
- **Delivery Lifecycle**: **Sprint 2 (Carry-Over Integration)**
- **Traceability / Engineering Notes**: Ref: FR 1.2 Category Selection

**User Story Statement**:
> As a user, I want to select a category (default or custom) while adding or editing a transaction, So that my spending is organized consistently.

**Acceptance Criteria (Gherkin BDD)**:

**Scenario 1**:
- **Given** the transaction form is open with categories available, 
- **When** the user attempts to select an existing category "Groceries" from the dropdown, 
- **Then** the system should allow the action and attach that category to the transaction.

**Scenario 2**:
- **Given** the user input is incomplete, e.g., no category selected, 
- **When** the user attempts to submit the transaction, 
- **Then** the system should put the category of the transaction as "Not Chosen".

**Sprint 2 Engineering Tasks**:

| Task Description | Assignee (Volunteer) | Reviewer | Hours | Status |
| :--- | :--- | :--- | :---: | :---: |
| Wire Category selector to GET /api/categories | Yeen, Guy, Boss | Bushi | 1.0h | To Do |
| Re-test category selection end-to-end with real API | Guy, Timsum | - | 1.0h | To Do |

---

#### US3-6 — Transactions page [3.0 SP]

- **Epic**: EPIC 3 (Transaction Management)
- **Target Page / Component**: `Transactions page`
- **Estimate**: **3.0 Story Points**
- **Delivery Lifecycle**: **Sprint 2 (Active Scope)**
- **Traceability / Engineering Notes**: Ref: Transactions page mockup — Total Income/Expense/Net Balance summary cards

**User Story Statement**:
> As a user, I want to see Total Income, Total Expense, and Net Balance summary cards on the Transactions page that reflect my currently applied filters, So that I can understand my financial totals for exactly the set of transactions I'm viewing.

**Acceptance Criteria (Gherkin BDD)**:

**Scenario 1**:
- **Given** the user has applied a filter (e.g., "This Month") on the Transactions page, 
- **When** the filtered results include income of "฿60,300" and expenses of "฿7,495", 
- **Then** the system should allow the action and display "Total Income: ฿60,300", "Total Expense: ฿7,495", and "Net Balance: ฿52,805" recalculated to match only the filtered transactions.

**Scenario 2**:
- **Given** the user's applied filters match no transactions, 
- **When** the summary cards are displayed, 
- **Then** the system should show ฿0 for all three cards rather than stale totals from a previous filter or an error.

**Sprint 2 Engineering Tasks**:

| Task Description | Assignee (Volunteer) | Reviewer | Hours | Status |
| :--- | :--- | :--- | :---: | :---: |
| Design filter-aware summary cards for Transactions page | Tul, Timsum, Guy, Boss | Bushi | 2.0h | To Do |
| Implement filter-aware summary aggregation API | Bushi, Ikkyu | Boss | 2.0h | To Do |
| Wire summary cards to active filters | Yeen, Guy, Boss | Ikkyu | 1.0h | To Do |
| Test summary cards recalculate on filter change | Guy, Timsum | - | 1.0h | To Do |

---

### EPIC 4: Recurring Transactions (17.0 Story Points)

**Epic Description**: Scheduled automated recurring transactions (weekly/monthly), automated posting engine, calendar and list views of upcoming occurrences, and rule update/delete semantics preserving historical ledger entries.

#### US4-1 — Transactions page (Recurring section) [5.0 SP]

- **Epic**: EPIC 4 (Recurring Transactions)
- **Target Page / Component**: `Transactions page (Recurring section)`
- **Estimate**: **5.0 Story Points**
- **Delivery Lifecycle**: **Product Backlog (Future Sprint)**
- **Traceability / Engineering Notes**: Ref: FR 1.3 Recurring Transactions

**User Story Statement**:
> As a user, I want to set up a recurring transaction on a weekly or monthly schedule, So that I don't have to manually re-enter regular income or expenses.

**Acceptance Criteria (Gherkin BDD)**:

**Scenario 1**:
- **Given** the user is creating a transaction, 
- **When** the user attempts to enable "Recurring" with frequency "Monthly" and a valid start date "2026-09-01", 
- **Then** the system should allow the action, save the recurrence rule, and schedule future entries.

**Scenario 2**:
- **Given** the user input is invalid, e.g., a frequency value outside {Weekly, Monthly} or a start date in the past such as "2020-01-01", 
- **When** the user attempts to set up a recurring transaction, 
- **Then** the system should display an appropriate error message and not save the rule.

---

#### US4-2 — Transactions page (Recurring section) [3.0 SP]

- **Epic**: EPIC 4 (Recurring Transactions)
- **Target Page / Component**: `Transactions page (Recurring section)`
- **Estimate**: **3.0 Story Points**
- **Delivery Lifecycle**: **Product Backlog (Future Sprint)**
- **Traceability / Engineering Notes**: Ref: FR 1.3 Automatic posting

**User Story Statement**:
> As a user, I want to the system to automatically post my recurring transactions on schedule, So that my records stay current without manual effort.

**Acceptance Criteria (Gherkin BDD)**:

**Scenario 1**:
- **Given** a recurring rule set to "Monthly" starting "2026-09-01", 
- **When** the scheduled date arrives, 
- **Then** the system should allow the action, automatically create a new transaction entry matching the rule, and update the balance.

**Scenario 2**:
- **Given** a recurring rule whose parent transaction has since been deleted, 
- **When** the scheduled date arrives, 
- **Then** the system should not generate a new entry and should log the skipped occurrence as an appropriate message.

---

#### US4-3 — Transactions page (Recurring section) [3.0 SP]

- **Epic**: EPIC 4 (Recurring Transactions)
- **Target Page / Component**: `Transactions page (Recurring section)`
- **Estimate**: **3.0 Story Points**
- **Delivery Lifecycle**: **Product Backlog (Future Sprint)**

**User Story Statement**:
> As a user, I want to view my all recurring transactions as a list, So that I can know what recurring transactions I have and when it will triggered

**Acceptance Criteria (Gherkin BDD)**:

**Scenario 1**:
- **Given** the user have active recurring transactions (e.g. "Rent" — Monthly, starting "2026-09-01"), 
- **When** the user attempts to view the recurring transactions calendar, 
- **Then** the system should allow the action and display each recurring transaction's upcoming scheduled occurrences correctly marked on their respective dates.

**Scenario 2**:
- **Given** the user has no active recurring transactions set up, 
- **When** the user attempts to view the recurring transactions calendar, 
- **Then** the system should display an appropriate empty-state message instead of an empty or broken calendar view.

---

#### US4-4 — Transactions page (Recurring section) [3.0 SP]

- **Epic**: EPIC 4 (Recurring Transactions)
- **Target Page / Component**: `Transactions page (Recurring section)`
- **Estimate**: **3.0 Story Points**
- **Delivery Lifecycle**: **Product Backlog (Future Sprint)**
- **Traceability / Engineering Notes**: Ref: Sprint 2 meeting note (13 Sep 2026) — Recurrence transaction page (Read)

**User Story Statement**:
> As a user, I want to view a list of all my recurring transaction rules, So that I can review and manage them in one place.

**Acceptance Criteria (Gherkin BDD)**:

**Scenario 1**:
- **Given** the user has at least one active recurring rule (e.g., "Rent" — Monthly, starting "2026-09-01"), 
- **When** the user opens the Recurring Transactions page, 
- **Then** the system should allow the action and display all active recurring rules with their type, amount, frequency, and next occurrence date.

**Scenario 2**:
- **Given** the user has no recurring rules set up, 
- **When** the user opens the Recurring Transactions page, 
- **Then** the system should display an appropriate empty-state message instead of an empty or broken list.

---

#### US4-5 — Transactions page (Recurring section) [3.0 SP]

- **Epic**: EPIC 4 (Recurring Transactions)
- **Target Page / Component**: `Transactions page (Recurring section)`
- **Estimate**: **3.0 Story Points**
- **Delivery Lifecycle**: **Product Backlog (Future Sprint)**
- **Traceability / Engineering Notes**: Ref: Sprint 2 meeting note (13 Sep 2026) — Recurrence transaction page (Update/Delete semantics)

**User Story Statement**:
> As a user, I want to edit or delete a recurring transaction rule, So that I can update or stop future automatic entries without losing past records.

**Acceptance Criteria (Gherkin BDD)**:

**Scenario 1**:
- **Given** an existing recurring rule set to "Monthly" with amount "1000.00", 
- **When** the user updates the amount to "1200.00" and saves, 
- **Then** the system should allow the action, update the rule, and apply the new amount starting from the next scheduled occurrence only.

**Scenario 2**:
- **Given** an existing recurring rule that has already generated 3 past transactions in the wallet, 
- **When** the user deletes the rule, 
- **Then** the system should stop future scheduled occurrences but must not delete the 3 transactions already recorded in the wallet.

---

### EPIC 5: Category Management (17.0 Story Points)

**Epic Description**: System default and user custom categories, type grouping (income/expense), category editing, safe deletion with impact warnings and transaction reassignment to "Not Chosen", and icon library customization.

#### US5-1 — Category page [3.0 SP]

- **Epic**: EPIC 5 (Category Management)
- **Target Page / Component**: `Category page`
- **Estimate**: **3.0 Story Points**
- **Delivery Lifecycle**: **Sprint 2 (Carry-Over Integration)**
- **Traceability / Engineering Notes**: Ref: FR 2.1 Create

**User Story Statement**:
> As a user, I want to create a custom category with a name and type, So that I can classify transactions to match my own habits.

**Acceptance Criteria (Gherkin BDD)**:

**Scenario 1**:
- **Given** the user is on "Add Category", 
- **When** the user attempts to create a category with name "Pet Supplies" and type "Expense" and icon, 
- **Then** the system should allow the action and make the category available for selection.

**Scenario 2**:
- **Given** the user input is incomplete or invalid, e.g., a duplicate name "Food"/"Expense" that already exists or a blank name, 
- **When** the user attempts to create a category, 
- **Then** the system should display an appropriate error message and not create the category.

**Sprint 2 Engineering Tasks**:

| Task Description | Assignee (Volunteer) | Reviewer | Hours | Status |
| :--- | :--- | :--- | :---: | :---: |
| Wire Create Category form to POST /api/categories | Yeen, Guy, Boss | Ice | 2.0h | To Do |
| Re-test create category end-to-end with real API | Pat | - | 1.0h | To Do |

---

#### US5-2 — Category page [3.0 SP]

- **Epic**: EPIC 5 (Category Management)
- **Target Page / Component**: `Category page`
- **Estimate**: **3.0 Story Points**
- **Delivery Lifecycle**: **Sprint 2 (Carry-Over Integration)**

**User Story Statement**:
> As a user, I want to view all my categories grouped by type for specific month, So that I can see how my transactions are organized.

**Acceptance Criteria (Gherkin BDD)**:

**Scenario 1**:
- **Given** the user has both default and custom categories set up across types (e.g. "Food", "Transport" as Expense and "Salary" as Income), 
- **When** the user attempts to view the categories summary, 
- **Then** the system should allow the action and display all categories correctly grouped under their respective type headers ("Income" and "Expense") for only that month.

**Scenario 2**:
- **Given** the user has only default categories with no custom categories created, 
- **When** the user attempts to view the categories page, 
- **Then** the system should still display the default categories grouped by type correctly, without showing an error or an incorrectly empty group.

**Sprint 2 Engineering Tasks**:

| Task Description | Assignee (Volunteer) | Reviewer | Hours | Status |
| :--- | :--- | :--- | :---: | :---: |
| Wire category list to GET /api/categories | Yeen, Guy, Boss | Tul | 2.0h | To Do |
| Re-test grouped category view end-to-end with real API | Pat | - | 1.0h | To Do |

---

#### US5-3 — Category page [2.0 SP]

- **Epic**: EPIC 5 (Category Management)
- **Target Page / Component**: `Category page`
- **Estimate**: **2.0 Story Points**
- **Delivery Lifecycle**: **Sprint 2 (Carry-Over Integration)**
- **Traceability / Engineering Notes**: Ref: FR 2.1 Update

**User Story Statement**:
> As a user, I want to edit a category's name or details, So that I can keep my categories accurate over time.

**Acceptance Criteria (Gherkin BDD)**:

**Scenario 1**:
- **Given** an existing category that is not a fundamental category (Food, Travel etc.) for example "Coffee", 
- **When** the user attempts to rename it to "Home Brewing", 
- **Then** the system should allow the action and update the category name across all associated transactions and reports.

**Scenario 2**:
- **Given** the user input is invalid, e.g., renaming "Food" to "Transport" which already exists for the same type, 
- **When** the user attempts to edit the category, 
- **Then** the system should display an appropriate error message and not apply the change.

**Sprint 2 Engineering Tasks**:

| Task Description | Assignee (Volunteer) | Reviewer | Hours | Status |
| :--- | :--- | :--- | :---: | :---: |
| Wire Edit Category form to PUT /api/categories/:id | Yeen, Guy, Boss | Timsum | 1.0h | To Do |
| Re-test edit category end-to-end with real API | Pat | - | 1.0h | To Do |

---

#### US5-4 — Category page [5.0 SP]

- **Epic**: EPIC 5 (Category Management)
- **Target Page / Component**: `Category page`
- **Estimate**: **5.0 Story Points**
- **Delivery Lifecycle**: **Sprint 2 (Carry-Over Integration)**
- **Traceability / Engineering Notes**: Ref: FR 2.1 Delete (impact check)

**User Story Statement**:
> As a user, I want to delete a category I no longer need, So that my category list stays relevant.

**Acceptance Criteria (Gherkin BDD)**:

**Scenario 1**:
- **Given** a category that is not a fundamental category e.g. "Misc", 
- **When** the user attempts to delete it, 
- **Then** the system should allow the action and remove the category immediately.

**Scenario 2**:
- **Given** the category that is not fundamental category has existing transactions linked to it, e.g., category "Coffee" used by 12 transactions, 
- **When** the user attempts to delete it, 
- **Then** the system should display an appropriate warning of the impact and require confirmation and reassignment of said category to "Not Chosen" before deleting.

**Sprint 2 Engineering Tasks**:

| Task Description | Assignee (Volunteer) | Reviewer | Hours | Status |
| :--- | :--- | :--- | :---: | :---: |
| Wire Delete Category to DELETE /api/categories/:id | Yeen, Guy, Boss | Pat | 1.0h | To Do |
| Re-test delete category end-to-end with real API | Pat | - | 1.0h | To Do |

---

#### US5-5 — Category page [2.0 SP]

- **Epic**: EPIC 5 (Category Management)
- **Target Page / Component**: `Category page`
- **Estimate**: **2.0 Story Points**
- **Delivery Lifecycle**: **Sprint 2 (Active Scope)**
- **Traceability / Engineering Notes**: Ref: FR 2.2 Category Icons

**User Story Statement**:
> As a user, I want to assign an icon to a category from an icon library, So that I can visually identify categories quickly.

**Acceptance Criteria (Gherkin BDD)**:

**Scenario 1**:
- **Given** the user is creating or editing a category, 
- **When** the user selects the icon "Piggy Bank" from the icon library, 
- **Then** the system should allow the action and display that icon next to the category everywhere it appears.

**Scenario 2**:
- **Given** the user is creating a category, 
- **When** the user attempts to save without selecting any icon from the library, 
- **Then** the system should automatically apply a default fallback icon rather than leaving the category without an icon or throwing an error.

**Sprint 2 Engineering Tasks**:

| Task Description | Assignee (Volunteer) | Reviewer | Hours | Status |
| :--- | :--- | :--- | :---: | :---: |
| Implement icon-library data & category-icon field | Bushi, Ikkyu | Timsum | 2.0h | To Do |
| Wire icon selection to category save | Yeen, Guy, Boss | Pat | 1.0h | To Do |
| Test icon assignment (default fallback icon case) | Pat | - | 1.0h | To Do |

---

#### US5-6 — Category page [2.0 SP]

- **Epic**: EPIC 5 (Category Management)
- **Target Page / Component**: `Category page`
- **Estimate**: **2.0 Story Points**
- **Delivery Lifecycle**: **Sprint 2 (Active Scope)**
- **Traceability / Engineering Notes**: Ref: Sprint 2 meeting note — default/system categories for both income and expense

**User Story Statement**:
> As a user, I want the system to provide default categories for both income and expense types, So that I can start tracking transactions immediately without setting up categories myself.

**Acceptance Criteria (Gherkin BDD)**:

**Scenario 1**:
- **Given** a new user has just registered and has no custom categories yet, 
- **When** the user opens the category list, 
- **Then** the system should display pre-seeded default categories for both "Income" (e.g., "Salary", "Bonus") and "Expense" (e.g., "Food", "Transport", "Shopping") types.

**Scenario 2**:
- **Given** the user attempts to delete one of the default categories, 
- **When** the user selects a default category like "Food" and chooses delete, 
- **Then** the system should reject the action and display a message explaining that default categories cannot be deleted (only hidden or have their transactions reassigned).

**Sprint 2 Engineering Tasks**:

| Task Description | Assignee (Volunteer) | Reviewer | Hours | Status |
| :--- | :--- | :--- | :---: | :---: |
| Seed default categories for both Income and Expense types | Bushi, Ikkyu | Ice | 2.0h | To Do |
| Prevent deletion of default categories (backend guard) | Bushi, Ikkyu | Yeen | 1.0h | To Do |
| Test default categories exist on new account & cannot be deleted | Pat | - | 1.0h | To Do |

---

### EPIC 6: Multiple Wallets (17.0 Story Points)

**Epic Description**: Multi-account management allowing creation of dedicated wallets, wallet switching, saving wallet designation with target goals, balance privacy masking (eye toggle), cascade deletion, and color/metadata customization.

#### US6-1 — Wallet page [5.0 SP]

- **Epic**: EPIC 6 (Multiple Wallets)
- **Target Page / Component**: `Wallet page`
- **Estimate**: **5.0 Story Points**
- **Delivery Lifecycle**: **Sprint 2 (Active Scope)**

**User Story Statement**:
> As a user, I want to create a new wallet with a custom name, and optional settings (Saving / Hide Balance), So that I can organize my money according to my preferences.

**Acceptance Criteria (Gherkin BDD)**:

**Scenario 1**:
- **Given** the user is on the "Create Wallet" page, 
- **When** the user enters valid inputs (e.g., wallet name "Travel Fund" and toggles saving/hide balance as desired), 
- **Then** the system should create the wallet, assign the user as owner, apply the selected settings, and display it in the wallet list.

**Scenario 2**:
- **Given** the user is on the "Create Wallet" page, 
- **When** the user attempts to create a wallet with invalid inputs (e.g., empty wallet name), 
- **Then** the system should display an appropriate error message and not create the wallet.

**Sprint 2 Engineering Tasks**:

| Task Description | Assignee (Volunteer) | Reviewer | Hours | Status |
| :--- | :--- | :--- | :---: | :---: |
| Review/adjust existing WalletSelector-adjacent UI for the create-wallet flow (model & partial UI already exist) | Tul, Timsum | Boss | 1.0h | To Do |
| Build the missing api/wallet route.ts (GET/POST/PUT/DELETE) — model & service already exist, route file does not | Pat, Ice | Bushi | 3.0h | To Do |
| Implement wallet-creation validation (name required, non-negative balance) | Pat, Ice | Tul | 1.0h | To Do |
| Test create wallet (valid & invalid input) | Tul, Timsum | - | 1.0h | To Do |

---

#### US6-2 — Wallet page [2.0 SP]

- **Epic**: EPIC 6 (Multiple Wallets)
- **Target Page / Component**: `Wallet page`
- **Estimate**: **2.0 Story Points**
- **Delivery Lifecycle**: **Sprint 2 (Active Scope)**

**User Story Statement**:
> As a user, I want to view details of each wallet, So that I can view and record transactions for the specific wallet I selected.

**Acceptance Criteria (Gherkin BDD)**:

**Scenario 1**:
- **Given** the user has access to multiple wallets, 
- **When** the user selects a wallet from the wallet selector list, 
- **Then** the system should switch the active context to that wallet, displaying its specific balance and transaction history.

**Scenario 2**:
- **Given** the user is on the app dashboard, 
- **When** the user attempts to access or switch to a non-existent wallet ID or a wallet they do not have permission to view, 
- **Then** the system should reject the request and remain on the current wallet.

**Sprint 2 Engineering Tasks**:

| Task Description | Assignee (Volunteer) | Reviewer | Hours | Status |
| :--- | :--- | :--- | :---: | :---: |
| Implement switch-active-wallet API/state | Pat, Ice | Timsum | 2.0h | To Do |
| Wire wallet switch to update balance/history views | Yeen, Guy, Boss | Pat | 1.0h | To Do |
| Test switch wallet (invalid/unauthorized wallet id) | Tul, Timsum | - | 1.0h | To Do |

---

#### US6-3 — Wallet page [3.0 SP]

- **Epic**: EPIC 6 (Multiple Wallets)
- **Target Page / Component**: `Wallet page`
- **Estimate**: **3.0 Story Points**
- **Delivery Lifecycle**: **Sprint 2 (Active Scope)**

**User Story Statement**:
> As a user, I want to mark a wallet as a "Saving Wallet", So that I can distinguish my savings from my daily spending wallets.

**Acceptance Criteria (Gherkin BDD)**:

**Scenario 1**:
- **Given** the user is the owner/editor of the wallet on the "Wallet Settings" page, 
- **When** the user toggles the "Is Saving Wallet" setting (ON or OFF) and set goal saving and saves, 
- **Then** the system should update the setting and reflect the "Saving" tag on the wallet view.

**Scenario 2**:
- **Given** the user is viewing the wallet settings, 
- **When** a user without editing permissions (e.g., a "Viewer" in a shared wallet) attempts to change the saving status, 
- **Then** the system should block the action and display a permission error message.

**Sprint 2 Engineering Tasks**:

| Task Description | Assignee (Volunteer) | Reviewer | Hours | Status |
| :--- | :--- | :--- | :---: | :---: |
| Design Saving-Wallet toggle + goal input UI | Tul, Timsum | Ice | 1.0h | To Do |
| Implement update-saving-status API (goal amount) | Pat, Ice | Yeen | 2.0h | To Do |
| Enforce permission check (editor/owner only) | Pat, Ice | Boss | 1.0h | To Do |
| Test saving toggle (permission-denied case) | Tul, Timsum | - | 1.0h | To Do |

---

#### US6-4 — Wallet page [2.0 SP]

- **Epic**: EPIC 6 (Multiple Wallets)
- **Target Page / Component**: `Wallet page`
- **Estimate**: **2.0 Story Points**
- **Delivery Lifecycle**: **Sprint 2 (Active Scope)**

**User Story Statement**:
> As a user, I want to hide or reveal my wallet balance with an eye icon toggle, So that I can keep my financial information private in public settings.

**Acceptance Criteria (Gherkin BDD)**:

**Scenario 1**:
- **Given** the user is viewing a wallet dashboard or wallet list, 
- **When** the user clicks the "Hide Balance" toggle button, 
- **Then** the system should mask the balance digits (e.g., displaying ••••••) immediately.

**Scenario 2**:
- **Given** the user is viewing the wallet, 
- **When** an unexpected rendering error or unauthenticated state occurs while toggling privacy settings, 
- **Then** the system should safely fallback to masking the balance by default until re-authenticated.

**Sprint 2 Engineering Tasks**:

| Task Description | Assignee (Volunteer) | Reviewer | Hours | Status |
| :--- | :--- | :--- | :---: | :---: |
| Design hide-balance eye-icon toggle UI | Tul, Timsum | Guy | 1.0h | To Do |
| Implement balance-masking state (client-side + fallback) | Pat, Ice | Tul | 2.0h | To Do |
| Test hide-balance toggle (fallback-to-masked on error) | Tul, Timsum | - | 1.0h | To Do |

---

#### US6-5 — Wallet page [3.0 SP]

- **Epic**: EPIC 6 (Multiple Wallets)
- **Target Page / Component**: `Wallet page`
- **Estimate**: **3.0 Story Points**
- **Delivery Lifecycle**: **Sprint 2 (Active Scope)**
- **Traceability / Engineering Notes**: Ref: Sprint 2 meeting note (13 Sep 2026) — Wallet page (cascade delete, confirm)

**User Story Statement**:
> As a wallet owner, I want to delete a wallet I no longer need, So that I can keep my wallet list relevant.

**Acceptance Criteria (Gherkin BDD)**:

**Scenario 1**:
- **Given** the user is the owner of a wallet named "Old Fund" with 5 associated transactions, 
- **When** the user attempts to delete the wallet and confirms the cascade-delete warning, 
- **Then** the system should allow the action, delete the wallet, and delete all transactions associated with that wallet.

**Scenario 2**:
- **Given** the user is a non-owner member of a shared wallet (e.g., a "Contributor"), 
- **When** the user attempts to delete the wallet, 
- **Then** the system should reject the action and display a permission error message.

**Sprint 2 Engineering Tasks**:

| Task Description | Assignee (Volunteer) | Reviewer | Hours | Status |
| :--- | :--- | :--- | :---: | :---: |
| Design delete-wallet confirmation UI (cascade-delete warning) | Tul, Timsum | Pat | 1.0h | To Do |
| Implement delete-wallet API (cascade delete transactions) | Pat, Ice | Timsum | 2.0h | To Do |
| Enforce owner-only permission check | Pat, Ice | Yeen | 1.0h | To Do |
| Test delete wallet (non-owner permission-denied case) | Tul, Timsum | - | 1.0h | To Do |

---

#### US6-6 — Wallet page [2.0 SP]

- **Epic**: EPIC 6 (Multiple Wallets)
- **Target Page / Component**: `Wallet page`
- **Estimate**: **2.0 Story Points**
- **Delivery Lifecycle**: **Sprint 2 (Active Scope)**
- **Traceability / Engineering Notes**: Ref: Sprint 2 meeting note (13 Sep 2026) — Wallet schema fields (color, name, balance, type)

**User Story Statement**:
> As a wallet owner, I want to edit my wallet's name, and color So that I can keep my wallet information accurate.

**Acceptance Criteria (Gherkin BDD)**:

**Scenario 1**:
- **Given** the user is the owner of a wallet named "Travel Fund", 
- **When** the user updates the name to "Trip to Japan" and changes its color tag, 
- **Then** the system should allow the action and reflect the updated name and color everywhere the wallet is displayed.

**Scenario 2**:
- **Given** the user attempts to edit wallet details, 
- **When** the user submits a blank wallet name, 
- **Then** the system should display an appropriate error message and not apply the change.

**Sprint 2 Engineering Tasks**:

| Task Description | Assignee (Volunteer) | Reviewer | Hours | Status |
| :--- | :--- | :--- | :---: | :---: |
| Design edit-wallet form UI (name, color, balance) | Tul, Timsum | Ice | 1.0h | To Do |
| Implement update-wallet API | Pat, Ice | Boss | 2.0h | To Do |
| Implement blank-name validation | Pat, Ice | Guy | 1.0h | To Do |
| Test edit wallet (blank name case) | Tul, Timsum | - | 1.0h | To Do |

---

### EPIC 7: Shared Wallets (8.0 Story Points)

**Epic Description**: Collaborative multi-user wallet sharing, email-based invitation flows, role-based access control (Owner, Contributor, Viewer), member permission management, and member removal safeguards.

#### US7-1 — Wallet page [5.0 SP]

- **Epic**: EPIC 7 (Shared Wallets)
- **Target Page / Component**: `Wallet page`
- **Estimate**: **5.0 Story Points**
- **Delivery Lifecycle**: **Product Backlog (Future Sprint)**

**User Story Statement**:
> As a wallet owner, I want to invite other users to my wallet via email and assign them roles, So that we can manage expenses together in a shared wallet.

**Acceptance Criteria (Gherkin BDD)**:

**Scenario 1**:
- **Given** the user is the owner of the wallet, 
- **When** the user enters a valid registered user's email address and selects a role (e.g., "Contributor"), 
- **Then** the system should send an invitation and grant access to the shared wallet upon acceptance.

**Scenario 2**:
- **Given** the user is on the "Invite Member" modal, 
- **When** the user inputs an invalid email format, an unregistered email, or tries to invite members without owner rights, 
- **Then** the system should display an appropriate error message and not send the invite.

---

#### US7-2 — Wallet page [3.0 SP]

- **Epic**: EPIC 7 (Shared Wallets)
- **Target Page / Component**: `Wallet page`
- **Estimate**: **3.0 Story Points**
- **Delivery Lifecycle**: **Product Backlog (Future Sprint)**

**User Story Statement**:
> As a wallet owner, I want to change member roles or remove members from a shared wallet, So that I can control access and permissions for my shared funds.

**Acceptance Criteria (Gherkin BDD)**:

**Scenario 1**:
- **Given** the user is the owner of the shared wallet, 
- **When** the user edits a member's role or removes a member from the wallet member list, 
- **Then** the system should update permissions immediately or revoke the removed user's access.

**Scenario 2**:
- **Given** the user is a non-owner member or attempts to remove the sole owner, 
- **When** the user attempts to modify member permissions or remove users, 
- **Then** the system should reject the operation and show an access denied message.

---

### EPIC 8: Financial Reports & Analytics Dashboard (14.0 Story Points)

**Epic Description**: In-depth financial position analytics, real-time balance aggregations, month-over-month income vs. expense comparison charts, spending distribution pie charts, and flexible temporal range filters.

#### US8-1 — Report page [5.0 SP]

- **Epic**: EPIC 8 (Financial Reports & Analytics Dashboard)
- **Target Page / Component**: `Report page`
- **Estimate**: **5.0 Story Points**
- **Delivery Lifecycle**: **Product Backlog (Future Sprint)**
- **Traceability / Engineering Notes**: Ref: FR 3.1 Financial Position Summary (real-time)

**User Story Statement**:
> As a user, I want to view a Report page summary of my total income, total expenses, and net balance for my selected wallet (or an aggregated view of all my wallets), So that I can quickly understand my financial position in context.

**Acceptance Criteria (Gherkin BDD)**:

**Scenario 1**:
- **Given** the user has recorded transactions within the selected period, 
- **When** the user attempts to view the dashboard, 
- **Then** the system should allow the action and display accurate totals for income, expenses, and net balance updated in real time.

**Scenario 2**:
- **Given** the user has no transactions recorded for the selected period, 
- **When** the user attempts to view the dashboard, 
- **Then** the system should display that there is no transaction in that time period.

---

#### US8-2 — Report page [3.0 SP]

- **Epic**: EPIC 8 (Financial Reports & Analytics Dashboard)
- **Target Page / Component**: `Report page`
- **Estimate**: **3.0 Story Points**
- **Delivery Lifecycle**: **Product Backlog (Future Sprint)**
- **Traceability / Engineering Notes**: Ref: FR 3.2 Comparison Charts

**User Story Statement**:
> As a user, I want to view, on the Report page, a monthly comparison chart of my income versus expenses for each month, So that I can track how my cash flow changes month over month.

**Acceptance Criteria (Gherkin BDD)**:

**Scenario 1**:
- **Given** the user has transactions across multiple periods, 
- **When** the user attempts to view the comparison chart, 
- **Then** the system should allow the action and render a bar or line chart correctly plotting income against expenses per period.

**Scenario 2**:
- **Given** the user input period contains only expense transactions and no income transactions, 
- **When** the user attempts to view the chart, 
- **Then** the system should render the income series as zero rather than omitting the chart or throwing an error.

---

#### US8-3 — Report page [3.0 SP]

- **Epic**: EPIC 8 (Financial Reports & Analytics Dashboard)
- **Target Page / Component**: `Report page`
- **Estimate**: **3.0 Story Points**
- **Delivery Lifecycle**: **Product Backlog (Future Sprint)**
- **Traceability / Engineering Notes**: Ref: FR 3.2 Distribution Charts

**User Story Statement**:
> As a user, I want to see, on the Report page, a pie chart showing my spending distribution by category, So that I can identify where most of my money goes.

**Acceptance Criteria (Gherkin BDD)**:

**Scenario 1**:
- **Given** the user has expense transactions across 1 or more categories, 
- **When** the user attempts to view the distribution chart, 
- **Then** the system should allow the action and render a pie chart whose category percentages sum to 100%.

**Scenario 2**:
- **Given** the user has no expense transactions in the selected period, 
- **When** the user attempts to view the distribution chart, 
- **Then** the system should display an appropriate empty-state message instead of an incorrectly rendered chart.

---

#### US8-4 — Report page [3.0 SP]

- **Epic**: EPIC 8 (Financial Reports & Analytics Dashboard)
- **Target Page / Component**: `Report page`
- **Estimate**: **3.0 Story Points**
- **Delivery Lifecycle**: **Product Backlog (Future Sprint)**
- **Traceability / Engineering Notes**: Ref: FR 3.3 Time Period Filtering

**User Story Statement**:
> As a user, I want to filter my Report page financial reports by weekly, monthly, annual, or a custom date range, So that I can analyze specific periods.

**Acceptance Criteria (Gherkin BDD)**:

**Scenario 1**:
- **Given** the user selects "Custom Range" with start date "2026-08-01" and end date "2026-08-31", 
- **When** the user attempts to apply the filter, 
- **Then** the system should allow the action and display only transactions and totals within that exact range including the start and end date.

**Scenario 2**:
- **Given** the user input is invalid, e.g., an end date earlier than the start date such as start "2026-08-31" and end "2026-08-01", 
- **When** the user attempts to apply the filter, 
- **Then** the system should display an appropriate error message and not apply the range.

---

## 6. Technical Architecture & Implementation Contracts for Antigravity

This section summarizes the concrete architectural patterns, API endpoints, schema entities, and business logic contracts required to build and verify Fin Lover.

### 6.1 REST API Specification Contract

```http
# Authentication & User Lifecycle (EPIC 1)
POST   /api/auth/register          # Register user (validates email, password complexity, consent flag)
POST   /api/auth/login             # Authenticate credentials, issue session token/cookie
POST   /api/auth/logout            # Invalidate session/token
DELETE /api/users/me               # Permanently delete user account and all personal financial records

# Wallets Engine (EPIC 6 & 7)
GET    /api/wallets                # List all user wallets (include balance, type, color, saving goal)
POST   /api/wallets                # Create new wallet (name, color, initialBalance, isSaving, targetGoal)
GET    /api/wallets/:id            # Get wallet details
PUT    /api/wallets/:id            # Update wallet metadata (name, color, saving goal settings)
DELETE /api/wallets/:id            # Cascade delete wallet and all its transactions (owner only)
POST   /api/wallets/:id/invite     # Invite member to shared wallet by email (Owner only, US7-1)
PUT    /api/wallets/:id/members/:userId # Update member role (Contributor, Viewer) or remove member (US7-2)

# Transactions & Summary Engine (EPIC 2 & 3)
GET    /api/transactions           # Query transactions (filters: walletId, month, categoryId, type, search)
POST   /api/transactions           # Create transaction (amount, date, type, categoryId, walletId, note)
GET    /api/transactions/:id       # Get single transaction
PUT    /api/transactions/:id       # Update transaction (recalculates balances)
DELETE /api/transactions/:id       # Delete transaction (recalculates balances)
GET    /api/transactions/summary   # Filter-aware summary metrics (totalIncome, totalExpense, netBalance)

# Dashboard Aggregations (EPIC 2)
GET    /api/dashboard/summary      # Home page monthly metrics (totalBalance, incomeThisMonth, expenseThisMonth, netThisMonth, savingsGoalProgress)
GET    /api/dashboard/top-categories # Top expense categories sorted by spend for the selected month

# Categories Management (EPIC 5)
GET    /api/categories             # List categories grouped by type (Income, Expense); includes default & custom
POST   /api/categories             # Create custom category (name, type, icon)
PUT    /api/categories/:id         # Update custom category (cannot edit default categories)
DELETE /api/categories/:id         # Delete custom category (warns & reassigns existing txns to 'Not Chosen')

# Recurring Transactions Engine (EPIC 4 - Future Scope)
GET    /api/recurring-rules        # List active recurring transaction rules
POST   /api/recurring-rules        # Create rule (frequency: Weekly/Monthly, startDate, amount, categoryId)
PUT    /api/recurring-rules/:id    # Update rule (applies to next scheduled occurrence only)
DELETE /api/recurring-rules/:id    # Delete rule (cancels future runs without deleting past recorded txns)

# Financial Reports & Analytics (EPIC 8 - Future Scope)
GET    /api/reports/position       # Financial position summary across wallets
GET    /api/reports/comparison     # Monthly income vs expense comparison series
GET    /api/reports/distribution   # Category expense distribution (pie chart percentages)
```

### 6.2 Relational Data Model Schema

```typescript
interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  consentGiven: boolean;
  consentTimestamp: Date;
  createdAt: Date;
}

interface Wallet {
  id: string;
  ownerId: string;
  name: string;
  color: string;           // Hex or palette identifier
  currentBalance: number;  // Atomic balance
  isSavingWallet: boolean; // US6-3
  targetGoal?: number;     // Savings goal amount in THB
  isBalanceHidden: boolean;// Privacy toggle (US6-4)
  createdAt: Date;
}

interface Category {
  id: string;
  userId?: string;         // null for system default categories (US5-6)
  name: string;
  type: 'INCOME' | 'EXPENSE';
  icon: string;            // Icon identifier from library (US5-5)
  isDefault: boolean;      // True for permanent system categories
}

interface Transaction {
  id: string;
  userId: string;
  walletId: string;
  categoryId: string;      // Links to Category or fallback 'Not Chosen'
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  date: string;            // YYYY-MM-DD
  note?: string;
  recurringRuleId?: string;// Links to recurring schedule if auto-posted
  createdAt: Date;
}

interface RecurringRule {
  id: string;
  userId: string;
  walletId: string;
  categoryId: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  frequency: 'WEEKLY' | 'MONTHLY';
  startDate: string;
  nextOccurrence: string;
  isActive: boolean;
}

interface WalletMember {
  id: string;
  walletId: string;
  userId: string;
  role: 'OWNER' | 'CONTRIBUTOR' | 'VIEWER';
  status: 'PENDING' | 'ACCEPTED';
}
```

### 6.3 State Management & UI Component Mapping

| Component | Route / Location | Associated Stories | Primary Data Contracts |
| :--- | :--- | :--- | :--- |
| `RegisterForm` | `/register` | US1-1 | Form validation, password regex, consent checkbox, `POST /api/auth/register` |
| `LoginForm` | `/login` | US1-2 | Credential inputs, generic error message on failure, `POST /api/auth/login` |
| `AccountSettings` | `/settings` | US1-3, US1-4 | Logout token invalidation, password re-entry confirmation for account deletion |
| `HomeDashboard` | `/` | US2-1 to US2-9 | Month navigator (`< Month >`), Total Balance card with embedded savings goal progress, Income/Expense/Net cards, Top Categories list, Monthly transaction table, Quick-Add modal |
| `TransactionsTable` | Shared (`/` & `/transactions`) | US2-8, US3-1 to US3-6 | Shared table component, date descending sort, category chip, wallet tag, action menu (Edit/Delete), multi-filter panel, title/note search input, filter-aware summary cards |
| `CategoryManager` | `/categories` | US5-1 to US5-6 | Grouped list by Income/Expense, icon picker, custom category creation/editing, delete with re-assign to 'Not Chosen' dialog, default category protection |
| `WalletManager` | `/wallets` | US6-1 to US6-6, US7-1 to US7-2 | Wallet switcher dropdown, Create Wallet modal, Saving Wallet toggle with goal input, eye-icon balance mask, cascade delete dialog, member invite modal, RBAC controls |
| `RecurringManager` | `/recurring` | US4-1 to US4-5 | Active recurring rules list, calendar view with scheduled markers, weekly/monthly rule creator, update future instances only |
| `AnalyticsDashboard` | `/reports` | US8-1 to US8-4 | Total financial position card, monthly comparison bar/line chart, spending distribution pie chart, custom date range picker |

### 6.4 Verification Checklist for Antigravity Agents
- [ ] **No Mocks**: Search codebase for `setTimeout` used as API simulations in frontend forms (`Register`, `Login`, `AddTransaction`, `AddCategory`) and ensure all forms invoke real API handlers.
- [ ] **Auth Token Expiration**: Verify protected route redirect to `/login` when token expires (US1-3 Scenario 2).
- [ ] **Cascade Deletion**: Verify deleting a wallet removes all associated transactions and updates aggregate totals (US6-5 Scenario 1).
- [ ] **Default Category Immutability**: Verify UI disables/rejects deletion of default categories (US5-6 Scenario 2).
- [ ] **Empty State Handling**: Verify every page displays a friendly empty state message (฿0 or 'No transactions') rather than broken UI or uncaught exceptions.
- [ ] **Balance Synchronization**: Verify adding, updating, or deleting a transaction updates the active wallet balance and home page summary cards instantaneously.
