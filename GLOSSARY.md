# FinLover

A personal expense tracker where users record income and expenses against wallets.

## Language

**Wallet**:
A user's account of money whose balance changes as Transactions are recorded. A balance may go negative.

**Transaction**:
A single dated income or expense recorded against a Wallet. It is the only thing that changes a balance.
_Avoid_: Occurrence, recurrence transaction

## Scheduling

**Scheduler**:
A user-defined plan that creates Transactions automatically on a repeating schedule (e.g. YouTube Premium every month). It is not a Transaction and holds no balance itself.
_Avoid_: Recurring rule, recurrence, recurring transaction

**Creator**:
The user who made a Scheduler. Only the Creator can edit, pause, resume or delete it.

**Frequency**:
How often a Scheduler repeats: every N days, every week, every month, or every year.

**End condition**:
When a Scheduler stops: never, after N Transactions, on a specific date, or after a span of time (weeks, months or years, for the week/month/year frequencies).

**Completed**:
A Scheduler state reached when its End condition is met. A Completed Scheduler can no longer be edited, only deleted.

**Cancelled**:
A Scheduler state set by the system when its Creator loses access to the target Wallet. It is permanent: the Scheduler stays visible but never runs again, even if the Creator regains access.

**Paused**:
A Scheduler state in which no Transactions are created. Dates passed while paused are skipped, never back-filled, on resume.
