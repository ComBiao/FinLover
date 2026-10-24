# E7-01b + E7-02 — implementation handoff

Branch: `feat/e7-01b-02-shared-wallet-invitations`, based on E7-01a commit `eecf39e`. Implementation is local, not committed/pushed/merged/deployed by the agent. GitHub merge state was not verified.

## Delivered

- Wallet.isShared, WalletMember with unique `(walletId,userId)` and inbox index; generated ERD.
- Membership port and repository: accepted access only; Owner-only methods remain separate. Shared fixture supports pending/accepted members.
- Shared creation starts at zero and uses authenticated Owner. List/detail return role, memberCount, at most three preview members, and ownerName.
- Owner invitation, invitee inbox, accept and decline; normalized email and exact UI field errors; duplicate/repeated acceptance conflicts.
- Database write locks serialize invitation changes with deletion; rollback and concurrency tests cover duplicate invitations, competing accept/decline, and account deletion races.
- Necessary integration safeguards: membership cleanup on deletion, Owner account deletion conflict with accepted Contributors, preservation of transactions in surviving shared wallets, and Home All excluding shared balances.
- Current transaction handlers remain personal-only through PersonalWalletAccess until E7-11. TransactionRepository receives access ports by constructor injection.
- Fixed empty POST/DELETE streams from the actual Next server incorrectly returning 415. Guard inspects actual non-JSON body bytes, retaining Origin and media-type protections.

API requests/responses/errors and deployment/index guidance: [Shared Wallet API guide](api/shared-wallets.md).

## Verification evidence

| Layer/check | Actual result |
| --- | --- |
| Unit, component and disposable MongoDB integration suite | `npm test`: 56 files, 652 tests passed |
| New shared-wallet DB suite | 18 tests passed; included in full suite |
| HTTP runtime | Production Next server plus disposable MongoDB, four synthetic users, 34 HTTP status assertions passed; membership cleanup and personal transaction regression also asserted |
| Lint | Passed; 2 existing unused-variable warnings in openapi.ts and temp4.test.ts |
| Type-check | Passed |
| Build | Passed after fixing dynamic route signatures and the empty-body runtime guard |
| OpenAPI generate/check | Passed; legacy 9 and v1 25 operations |
| ERD generation | Completed from models |
| Docs generate/check | Passed |
| git diff --check | Passed |
| Deployment / real database migration | Not performed |

HTTP reproduction: `npm run build`, then `node infra-dev/scripts/smoke-shared-wallets.mjs`. The script creates/stops its own MongoDB replica set and overrides MONGODB_URI; no real seed/data is used.

## Remaining scope

E7-07 member management/leave/transfer, E7-06 attribution, E7-10 complete personal transaction read isolation, E7-11/13 shared transaction APIs, and E7-15 shared Home summary remain separate work. The lifecycle safeguards here overlap E7-04/09 but do not constitute sign-off on all acceptance criteria for those issues. Shared transaction writes return 409 during rollout; Home shared summary is not enabled. Existing users without a name display `Unnamed user`; missing users display `Deleted user`.

No backfill is required for old personal wallets: missing isShared is treated as false. Provision the new indexes explicitly if production disables autoIndex; inspect duplicates first. Any live index/backfill operation requires a separate deployment step and has not been run.

## Draft PR description (not posted)

### Issue ID
E7-01b, E7-02

### Description
เพิ่ม Shared Wallet foundation และ API สร้าง/อ่าน wallet, เชิญสมาชิก, inbox, accept/decline โดย pending ยังไม่มีสิทธิ์และการจัดการ wallet ยังคงเป็น Owner-only

ใช้ unique membership index และ UnitOfWork write locks ป้องกันคำเชิญซ้ำและ race กับการลบ พร้อม cleanup ที่จำเป็น รักษา personal APIs และยังไม่เปิด shared transaction/summary ก่อน issue ที่เกี่ยวข้อง

ไฟล์แก้หลัก: Wallet.ts, User.ts, WalletRepository.ts, wallet services/router, UserRepository.ts, composition/index.ts, HTTP policy/mapping, transaction dependency injection, ports, OpenAPI source และเอกสาร/generated artifacts

ไฟล์สร้างหลัก: WalletMember.ts, wallet-membership.ts, invitation repository/service/controller/router, WalletMembershipRepository.ts, WalletPresentationService.ts, PersonalWalletAccess.ts, 4 invitation route entries, shared-wallet-fixture.ts, shared-wallet-invitations-api.test.ts และ smoke-shared-wallets.mjs

Validation: 652 tests / 56 files ผ่าน; HTTP smoke 34 status assertions ผ่านบนผู้ใช้ 4 role และ disposable DB; lint (2 warnings เดิม), type-check, build, API/docs checks และ diff check ผ่าน; regenerate ERD แล้ว ไม่มี deployment หรือ migration ฐานข้อมูลจริง

### Image
N/A — Backend/API change; HTTP and DB evidence above.
