# Epic 7 — Shared Wallet contract (E7-01a)

E7-01a contracts plus **E7-01b/02 implemented**: shared create, accessible wallet list/detail, invitation create/inbox/accept/decline, membership model/index/port and test fixture. Generated OpenAPI lists implemented operations only. The endpoint table below also describes future target operations; E7-07/11/13/15 routes are not enabled here.

Import schemas and inferred types from `@/shared/contracts`. Create/list/detail emit sharing metadata; `sharedWalletResponse` requires it. Existing update/saving responses retain the rollout-compatible optional metadata schema. Creation adopts walletCreateInput; isShared defaults to false. Future shared transaction responses use sharedTransactionResponse, not personal transactionResponse.

### Rollout boundaries and integration safeguards

- Membership-aware WalletRepository.exists/adjust are available for E7-11. Current transaction handlers and repository rechecks use PersonalWalletAccess, rejecting shared operations with 409 instead of enabling incomplete category/attribution behavior. Personal APIs remain operational.
- Home All excludes shared wallets. Selected owned shared Home summary returns 409 until E7-15; the old owned-only summary still returns 404 for non-owned wallets. E7-15 will introduce shared membership-aware summary access. Personal transaction read isolation for pre-existing shared rows remains E7-10; this release cannot create shared transactions through the API.
- Existing Owner-only wallet deletion cleans memberships together with its transaction cascade. Account deletion blocks Owner with accepted Contributors, removes pending invitations, and preserves shared transactions in surviving wallets. These necessary lifecycle safeguards do not mark all E7-04/E7-09 acceptance criteria complete.
- Wallet/user membershipVersion counters are internal concurrency fields, never response data. Invite/accept/decline acquire a real wallet write in UnitOfWork; user locks serialize invites/shared creation with account deletion. Future remove/transfer/shared writes must use the same wallet lock discipline.
- Existing accounts without a display name use **Unnamed user**; missing accounts use **Deleted user**. Card preview never includes email.
- No frontend changes, notification delivery, recurring behavior, transfer or leave endpoints are included.

### Database rollout (not executed against a real database)

No backfill is required for correctness: missing isShared reads as false; internal counters start at zero and $inc creates them on first use. Before production enablement, provision WalletMember indexes `(walletId,userId)` unique and `(userId,status,createdAt)` for inbox queries; inspect any existing collection for duplicate pairs before building the unique index. Mongoose auto-indexing initializes these in local/test environments. If production disables autoIndex, index creation is an explicit deployment operation. Optional backfill may set isShared=false only where absent, in a separately approved maintenance step. This change never runs a migration on installation/build/startup.

### Verification

Run `npm test -- src/server/__tests__/shared-wallet-invitations-api.test.ts` for disposable-replica-set tests. After `npm run build`, run `node infra-dev/scripts/smoke-shared-wallets.mjs` for real HTTP tests with four synthetic users and an automatically stopped disposable MongoDB. The smoke runner overrides MONGODB_URI and never accesses the configured application database.

## Data and decisions

- Owner is Wallet.userId. WalletMember stores pending/accepted Contributors, unique by walletId/userId. Pending confers no wallet access.
- Wallet metadata: isShared, role (`owner`/`contributor`), memberCount, membersPreview (up to 3 `{id,name}`), ownerName. Count and previews include Owner plus accepted members, exclude pending. Preview order: Owner first, accepted members by createdAt then id.
- Members: `{userId,name,email,role,status}`. Owner is always accepted; pending entries appear in the same members array, not duplicated in a second invitations collection.
- Invitations: `{id,walletId,walletName,invitedByName,createdAt}`. Inbox `{items,total}` contains all pending invitations for caller; total equals items.length. No expiry or email notification. Decline deletes silently.
- Shared wallet starts at 0. Saving may coexist with shared. isShared is immutable after creation. Owner alone edits name/color/icon/saving settings.
- Only Owner invites/removes/transfers/deletes. Accepted members create/edit/delete transactions of any author. Leaving/removal keeps transactions and balances unchanged.
- Transfer target must be accepted. Old Owner becomes accepted Contributor; new Owner's membership row is removed. Transfer and owner/name unique conflict handling are atomic.
- Owner with accepted Contributors cannot leave or delete account (409). Pending-only does not block account deletion. Owner leave always returns 409 directing callers to transfer or explicitly DELETE wallet; leave never silently deletes it.
- Shared transaction request rejects categoryId even when null. Persist categoryId=null; omit categoryId in shared response. Schema selection must use persisted wallet/access, not client-supplied role/isShared. Preserve field presence through HTTP adapters until validation.
- Transaction.userId remains author. updatedBy is latest editor, including when author edits again; emit editedBy only when latest editor differs from author. Missing author/editor account uses `Deleted user`, retaining its id. An existing account without a display name uses Unnamed user, not Deleted user.
- Transactions cannot move wallets through the API. Personal responses remain compatible and omit attribution.
- Shared summary keeps current Home shape, sums every author, topCategories=[]. Home All and personal transaction list/summary exclude all shared wallets, including caller-authored rows.
- Contributor account deletion retains shared transactions/balance. Owner without Contributors deletes owned wallets and pending invitations. Wallet deletion cascades every author's transactions and memberships in one UnitOfWork, with no password.

## Endpoints (target, all paths prefixed /api/v1)

Responses use `{status:true,data:...}`. Errors use `{status:false,error:{code,message,fields?},timestamp,path}`. All routes require authenticated principal. Cookie mutations retain trusted Origin and JSON policy; delete-account remains cookie-only.

| Method/path | Request | data / success | Permission / domain errors |
| --- | --- | --- | --- |
| POST /wallets | walletCreateInput | Wallet / 201 | Caller becomes Owner; duplicate name 409 |
| GET /wallets | none | Wallet[] / 200 | Owned personal plus owned/accepted shared; no pending |
| GET /wallets/{id} | none | Wallet / 200 | Owner/accepted |
| POST /wallets/{id}/invitations | walletInvitationInput `{email}` | walletInvitationResponse / 201 | Owner; unknown/self email 400; duplicate pending/accepted 409 |
| GET /invitations | none | myInvitationsResponse / 200 | Only caller's pending invitations |
| POST /invitations/{id}/accept | no body | walletMemberResponse / 200 | Invitee only; already accepted 409 |
| POST /invitations/{id}/decline | no body | null / 200 | Invitee only; accepted state 409; deleted/missing 404 |
| GET /wallets/{id}/members | none | walletMembersResponse / 200 | Owner/accepted; includes pending |
| DELETE /wallets/{id}/members/{userId} | no body | null / 200 | Owner; removes accepted or cancels pending; cannot remove Owner (409) |
| POST /wallets/{id}/leave | no body | null / 200 | Accepted Contributor; Owner 409 |
| POST /wallets/{id}/transfer-ownership | transferOwnershipInput `{userId}` | sharedWalletResponse / 200 | Owner; non-accepted target/state conflict or new owner name collision 409 |
| DELETE /wallets/{id} | no body | null / 200 | Owner; Contributor 403 |
| GET /wallets/{id}/transactions?month=YYYY-MM | transactionMonthQuery | SharedTransactionResponse[] / 200 | Owner/accepted; default month and UTC date boundaries follow existing convention |
| POST /transactions | sharedTransactionInput for shared wallet | sharedTransactionResponse / 201 | Owner/accepted |
| PUT /transactions/{id} | sharedTransactionUpdate for shared wallet | sharedTransactionResponse / 200 | Owner/accepted, any author |
| DELETE /transactions/{id} | no body | null / 200 | Owner/accepted, any author |
| GET /home/summary?month=YYYY-MM&walletId=id | homeSummaryQuery | sharedHomeSummaryResponse / 200 | Owner/accepted |
| DELETE /auth/delete-account | no body | `{success:true}` / 200 | Cookie-only; Owner with Contributors 409 |

Malformed input/ids → 400; unauthenticated → 401; existing shared resource without access or another invitee's invitation → 403; nonexistent resource → 404; duplicate/state conflict → 409. Preserve existing foreign-personal 404 behavior. Repeating decline/remove/delete after deletion returns 404. Unauthorized transaction modification message: `Only the member of the wallet can modify this transaction`.

Invitation email validation uses code VALIDATION_ERROR with fields.email exactly `User not found` or `Cannot invite yourself`. Ownership, access, uniqueness, attribution equality and count consistency are service responsibilities, not proven by structural schema validation.

## Frontend examples

Create (implemented): `{"name":"Trip","isShared":true}`. Invite: `{"email":"friend@example.com"}`. Transfer: `{"userId":"507f1f77bcf86cd799439012"}`.

Shared transaction request (after E7-11):

```json
{"walletId":"507f1f77bcf86cd799439011","type":"expense","amount":42,"date":"2026-10-23","title":"Lunch"}
```

Shared transaction response data:

```json
{"id":"507f1f77bcf86cd799439013","walletId":"507f1f77bcf86cd799439011","type":"expense","amount":42,"date":"2026-10-23","title":"Lunch","createdBy":{"id":"507f1f77bcf86cd799439012","name":"Alex"}}
```

## Implementation dependencies

E7-01a precedes adoption of these schemas. E7-01b supplies membership and access ports; E7-06 supplies attribution; E7-11 requires both, then E7-13 and E7-15 follow E7-11. Preserve owner-only repository methods; add separate access operations. Recheck permissions in database transactions and serialize access changes with transaction writes. No production migration has been executed.
