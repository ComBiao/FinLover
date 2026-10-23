# Scheduler is a separate entity on a fixed Asia/Bangkok business date

Repeating transactions are modelled as a `Scheduler` collection, not as fields on `Transaction`; the unused `Transaction.recurrence` sub-document is removed. A daily Vercel Cron job (`0 17 * * *` UTC, i.e. 00:00 Asia/Bangkok, Hobby-tier compatible) creates each due Transaction and advances the Scheduler's `nextDueDate` in one UnitOfWork, so retries and overlapping runs cannot duplicate.

Due dates are calendar dates in Asia/Bangkok rather than per-user timezones (per-user midnight needs hourly cron, which the free tier lacks). Generated Transactions do not store a `schedulerId`; idempotency lives on the Scheduler's compare-and-set of `nextDueDate`, at the cost of no per-Scheduler history view. Adding the link later is a small migration.
