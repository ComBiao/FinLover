## Fin Lover — Sprint 1 Backlog

## Sprint 1: Aug 25 – Sep 14, 2026  |  Goal: user accounts, category foundation, and core "add transaction" flow (UI + API + DB) with privacy consent

## Legend: yellow cells = fill in during the sprint (Volunteer initials, Count, daily remaining hours). Day 1 pre-fills from Original Estimate; Status defaults to "To Do".

|  |  |  |  |  |  |  |  |  |  |  | 25 Aug | 26 Aug | 27 Aug | 28 Aug | 29 Aug | 30 Aug | 31 Aug | 01 Sep | 02 Sep | 03 Sep | 04 Sep | 05 Sep | 06 Sep | 07 Sep | 08 Sep | 09 Sep | 10 Sep | 11 Sep | 12 Sep | 13 Sep | 14 Sep |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Sprint | EPIC ID | EPIC Name | User Story ID | User Story | Task | Volunteer | Count | Status | Original Estimate (hrs) | Avg Hrs/Person | Day 1 | Day 2 | Day 3 | Day 4 | Day 5 | Day 6 | Day 7 | Day 8 | Day 9 | Day 10 | Day 11 | Day 12 | Day 13 | Day 14 | Day 15 | Day 16 | Day 17 | Day 18 | Day 19 | Day 20 | Day 21 |
| SPRINT 1 | EPIC 1 | User Authentication & Account Security | US1-1 | As a user, I want to register a new account with my email and password, So that I can securely access my personal finance data. | Design registration form UI | "Boss, Timsum, Guy" | 3 | In Progress | 3 | 1 | 3 | 2 | 2 | 3 | 2.5 | 2 | 2 | 1 | 1 | 1 | 0.5 | 0.5 | 0.5 |  |  |  |  |  |  |  |  |
|  |  |  |  |  | Implement client-side form validation |  |  | To Do | 2 | 0.67 | 2 |  | 1.5 | 1 | 1 | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  | Implement consent checkbox & privacy notice UI (data privacy task) |  |  | In Progress | 1 | 0.34 | 1 | 1 | 1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  | Implement registration API endpoint | "Pat, Yeen, Ikkyu" |  | Done | 3 | 1 | 3 |  | 0 | 0 | 0 |  |  |  |  | 0 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
|  |  |  |  |  | Implement password hashing & secure storage |  |  |  | 2 | 0.67 | 2 |  |  |  |  |  | 1 | 0..5 | 1 | 0.5 |  | 1 | 0 |  |  |  |  |  |  |  |  |
|  |  |  |  |  | Set up User data model & database table |  |  |  | 3 | 1 | 3 | 2 | 1 | 1 | 0.5 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  | Store consent flag & timestamp in database (data privacy task) |  |  |  | 1 | 0.34 | 1 | 1 | 0 | 0 | 0 | 0.5 | 0.5 | 0.5 | 1 | 0.5 | 0.5 | 1 |  |  |  |  |  |  |  |  |  |
|  |  |  | US1-2 | As a registered user, I want to log in with my email and password, So that I can access my personal dashboard. | Design login form UI | "Boss, Timsum, Guy" |  | In Progress | 2 | 0.67 | 2 | 2 | 2 | 2 | 1.5 | 1.5 | 1.5 | 1 |  | 1 |  | 0.5 | 0.5 |  |  |  |  |  |  |  |  |
|  |  |  |  |  | Implement login API (email/username + password) | "Pat, Yeen, Ikkyu" |  | To Do | 3 | 1 | 3 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  | Implement session/token handling |  |  | In Progress |  |  |  | 2 | 2 | 2 | 2 | 2 | 1 | 1 | 1 | 1 | 1 | 1 |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  | Implement login form validation & error handling |  |  | To Do | 2 | 0.67 | 2 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  | US1-3 | As a logged-in user, I want to log out of the system, So that my account stays secure on shared devices. | Implement logout UI control | "Boss, Timsum, Guy" |  | In Progress | 1 | 0.34 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 0.5 | 0.5 | 0.5 |  |  |  |  |  |  |  |  |
|  |  |  |  |  | Implement logout API — invalidate session/token | "Pat, Yeen, Ikkyu" |  | To Do |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  | EPIC 2 | Transaction Management | US2-1 | As a user, I want to add a new income or expense transaction, So that I can track my daily cash flow. | Design "Add Transaction" form UI | "Boss, Timsum, Guy" |  | In Progress | 3 | 1 | 3 | 3 | 3 | 3 | 3 | 3 | 2.5 | 2 | 1.5 | 1 | 0.5 | 0.5 | 0.5 |  |  |  |  |  |  |  |  |
|  |  |  |  |  | Implement add-transaction API | "Bushi, Tul, Ice" |  |  |  |  |  |  |  |  | 1 | 1 | 1 | 1 | 1 |  | 1 |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  | Set up Transaction data model & database table |  |  |  |  |  |  | 1 | 1 | 1 | 0 |  |  |  |  |  |  | 3 |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  | Implement required-field validation (amount, date, type) |  |  |  | 2 | 0.67 | 2 | 2 | 2 | 2 | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 |  |  |  |  |  |  |  |  |  |
|  |  |  | US2-4 | As a user, I want to select a category (default or custom) while adding or editing a transaction, So that my spending is organized consistently. | Implement category dropdown/selector component | "Boss, Timsum, Guy" |  | To Do |  |  |  |  |  |  | 2 | 2 | 1.5 | 1.5 | 1 | 1 |  |  | 0.5 |  |  |  |  |  |  |  |  |
|  |  |  |  |  | Wire selector to categories API & persist selection on transaction | "Bushi, Tul, Ice" |  | In Progress | 1 | 0.34 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |  |  | 1 |  |  |  |  |  |  |  |  |  |  |
|  |  |  | US2-2 | As a user, I want to edit an existing transaction, So that I can correct mistakes in my financial records. | Design "Edit Transaction" form UI | "Boss, Timsum, Guy" |  | To Do | 2 | 0.67 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |  |  |  |  |  |  |  |  |
|  |  |  |  |  | Implement edit-transaction API endpoint | "Bushi, Tul, Ice" |  | In Progress | 3 | 1 | 3 | 3 | 3 | 3 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  | Implement required-field validation (amount, date, type) |  |  |  | 2 | 0.67 | 2 | 2 | 2 | 2 | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | 1 |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  | Update Transaction record in database |  |  |  | 1 | 0.34 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |  |  |  |  |  |  |  |  |  |  |
|  |  |  | US2-3 | As a user, I want to delete a transaction, So that I can remove entries I no longer need. | Design delete confirmation UI | "Boss, Timsum, Guy" |  | To Do |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
|  |  |  |  |  | Implement delete-transaction API endpoint | "Bushi, Tul, Ice" |  | In Progress | 2 | 0.67 | 2 | 2 | 2 | 2 | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 | 0.5 |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  | Remove Transaction record from database |  |  |  | 1 | 0.34 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |  |  |  |  |  |  |  |  |  |
|  | EPIC 3 | Category Management | US3-1 | As a user, I want to create a custom category with a name and type, So that I can classify transactions to match my own habits. | Design "Add Category" form UI | "Boss, Timsum, Guy" |  | To Do | 2 | 0.67 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |  |  |  |  |  |  |  |  |
|  |  |  |  |  | Implement create category API | "Bushi, Tul, Ice" |  | In Progress |  |  |  |  |  |  |  |  |  |  |  |  |  | 3 |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  | Set up Category data model & database table |  |  |  |  |  |  | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  | US3-2 | As a user, I want to view all my categories grouped by type, So that I can see how my transactions are organized. | Design category list UI grouped by type | "Boss, Timsum, Guy" |  | To Do |  |  |  | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |  | 2 | 2 |  |  |  |  |  |  |  |  |
|  |  |  |  |  | Implement get-categories API | "Bushi, Tul, Ice" |  | In Progress |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  | US3-3 | As a user, I want to edit a category's name or details, So that I can keep my categories accurate over time. |  | ​ |  | ​ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  | Implement update-categories API | "Bushi, Tul, Ice" | 2 | In Progress | 2 | 1 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |  |  |  |  |  |  |  |  |  |
|  |  |  | US3-4 | As a user, I want to delete a category I no longer need, So that my category list stays relevant. |  | ​ |  | ​ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  | Implement delete-categories API | "Bushi, Tul, Ice" | 2 | In Progress | 2 | 1 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  | TOTAL WORK REMAINING (hrs) | ​ |  |  |  |  | 67 | 52 | 47.5 | 48 | 37 | 38.5 | 36 | 33 | 33.5 | 31.5 | 31.5 | 35.5 | 11.5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
|  |  |  |  |  | AVG HOUR PER PERSON |  |  |  | 7 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  | Total Original Estimate (hrs): |  |  |  | 63 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  | Sprint 1 Story Points Committed: |  |  |  | 30 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  | Name | Nickname | Tasks Count | Man hour |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  | Boss | 11 | 7.04 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  | Timsum |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  | Supanat Suwannarat | Guy |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  | Pat | 8 | 6.02 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  | Sarus Suanploy | Yeen |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  | Kasidis Chatthong | Ikkyu |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  | Bushi | 12 | 8.04 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  | Tul |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  | Sajakorn Hiranwipas | Ice |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |