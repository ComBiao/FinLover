# FinLover — Frontend / Backend Refactor Implementation Plan

สถานะ: **อนุมัติให้ implement แล้ว — กำลังตรวจรับ implementation ใน branch `refactor/project-structure`**  
วันที่: 26 กันยายน 2026  
ปรับแผนล่าสุด: 27 กันยายน 2026 — เพิ่ม Swagger API design / API documentation และข้อกำหนดอัปเดต docs, package.json, AGENT.md, CLAUDE.md ให้ตรงกับ implementation ใหม่

ฐานที่ตรวจ: branch `feat/29-category-api`, commit `2ec4485`

## 1. เป้าหมายและขอบเขต

แยก Frontend และ Backend ให้มี source, dependencies, config, test และคำสั่ง build/run ของตัวเอง โดยยังอยู่ repository เดียวกัน Backend ใช้ **Family A: Web / API Service — Modular + Layered** ตามไฟล์ `How to SE-Finlover.docx.md` ที่ผู้ใช้ให้มา

แผนเดิมจัดทำเพื่อ review; ผู้ใช้อนุมัติให้เริ่ม implementation แล้วเมื่อ 27 กันยายน 2026 และให้ทำต่อหลังการหยุดงานชั่วคราว ไม่รวมการรัน data migration, commit/push หรือ deployment จริง ผลตรวจและข้อจำกัดล่าสุดบันทึกใน [refactor-validation.md](refactor-validation.md)

ผลลัพธ์เป้าหมายหลังอนุมัติ:

- `frontend/`: Next.js สำหรับหน้าเว็บและ UI
- `backend/`: Next.js สำหรับ API แยก process และ deployment ได้
- Backend แบ่ง Router → Controller → Service → Repository พร้อม Manual Constructor Injection
- root ของแต่ละโปรเจกต์เก็บ config; dev tools อยู่ `infra-dev/`; application source อยู่ `src/`
- รักษา URL และ API behavior เดิมระหว่างย้าย และแยกการเปลี่ยน contract เป็นขั้นที่ตรวจสอบได้
- ออกแบบ API contract ด้วย OpenAPI และแสดง API documentation ผ่าน Swagger UI โดยแยก legacy ที่ใช้งานจริงกับ v1 ที่กำลังออกแบบ
- อัปเดตเอกสาร, `package.json` ทุก workspace, `AGENT.md` และ `CLAUDE.md` ให้ตรงกับโครงสร้าง คำสั่ง และ behavior ของเวอร์ชันที่ implement จริง โดยถือเป็นส่วนหนึ่งของงาน refactor ที่ต้องเสร็จก่อนส่งมอบ

ไม่รวมการเติมทุก feature ใน backlog, เปลี่ยนฐานข้อมูล, เปลี่ยนรูปแบบเงิน, ทำ recurring worker หรือออกแบบ UI ใหม่ การเชื่อมหน้าที่ปัจจุบันใช้ mock เข้ากับ API จริงแยกไว้เป็นงานต่อยอดอย่างชัดเจน

## 2. สิ่งที่ตรวจพบจาก checkout ปัจจุบัน

| พื้นที่ | สภาพปัจจุบัน | ผลต่อแผน |
| --- | --- | --- |
| Stack | Next.js, TypeScript strict, Node.js, npm, Mongoose/MongoDB | คง stack หลักไว้ |
| API | `src/app/api/` มี auth, categories และ transaction | แยก transport ออกจาก business logic |
| Services | มี category application/cascade และ wallet cascade ใน `src/lib/services/` | นำกลับมาใช้และแบ่งชั้นให้ชัด |
| Authentication | login ตั้ง `session_token` cookie แต่ categories/transaction อ่าน Bearer | ต้องกำหนด transport ของ auth ก่อนเชื่อม UI จริง |
| Models | `User`, `Wallet`, `Category`, `Transaction`; ownership และ balance logic บางส่วนอยู่ใน hooks | ย้ายแบบรักษาพฤติกรรมก่อนถอน business hooks |
| Frontend | categories/transactions/dashboard หลายส่วนใช้ mock/local state; login hook ยังจำลอง submit | ห้ามรายงานว่าระบบเชื่อม API ครบจากการย้ายโฟลเดอร์ |
| Data shape | UI ใช้ camelCase และ `Date`; transaction API ใช้ `wallet_id`, `category_id`, date string และรับ `Income`/`Expense` | ต้องมี DTO และ frontend mapper แยกกัน |
| Routing | `/` ยังเป็น starter page และ `/dashboard` เป็นอีก route | คงพฤติกรรมของ checkout นี้ ไม่รวม homepage redesign |
| Testing | Vitest ตั้ง jsdom รวม; มี route/model/auth tests | แยก backend node environment และ frontend jsdom |
| CI | lint, Next typegen, type-check, ERD sync, build, secret scan; ยังไม่มีขั้น `npm test` | เพิ่ม tests และตรวจทั้งสองโปรเจกต์ |
| Tools | `scripts/` มี commit validator, ERD generator และ Decimal128 migration | แยก dev tooling กับ operational source |

หลักฐานหลัก: `package.json`, `src/app/api/**/route.ts`, `src/lib/session.ts`, `src/lib/apiAuth.ts`, `src/models/Transaction.ts`, `src/hooks/useLoginForm.ts`, `src/app/transactions/page.tsx`, `.github/workflows/ci.yml`

ข้อมูลนี้มาจากการอ่านโค้ด ยังไม่ได้รัน baseline tests/build หรือทดสอบผ่าน browser ในงานจัดทำแผนนี้

## 3. การตีความมาตรฐานจากไฟล์แนบ

ไฟล์แนบมีรายละเอียด Architecture Families อยู่ในตัวแล้ว จึงไม่จำเป็นต้องรอไฟล์ `01-architecture-families.md` แยกอีก

| ข้อกำหนดในเอกสาร | ข้อเสนอสำหรับ FinLover | สถานะ |
| --- | --- | --- |
| Family A สำหรับ API หลาย domain | auth, users, categories, transactions, wallets | ใช้ตามเอกสาร; users/wallets ไม่จำเป็นต้องมี endpoint ใหม่ |
| Modular + Layered, Manual DI | แบ่ง 4 ชั้น; constructor injection; class ต่อ action | ใช้ตามเอกสาร |
| `modules/v1`, `shared`, `db` | ใช้ใต้ `backend/src/` | ใช้ตามเอกสาร |
| Framework Next.js แต่ตัวอย่างใช้ Hono Context | ใช้ Next Route Handlers และ typed request context ของเรา | ปรับตัวอย่างให้ตรง stack; ไม่เพิ่ม Hono/Express |
| `src/index.ts` เป็น entry | เป็นจุดประกอบ application handlers; HTTP entry จริงคือ `src/app/api/**/route.ts` | ขอรับรองการปรับให้ตรง Next.js; ไม่ใช้ custom server |
| MongoDB แต่ตัวอย่างใช้ Drizzle, table, UUID, snake_case | ใช้ Mongoose models, collections และ ObjectId/field names เดิม | ขอรับรองข้อยกเว้น; ไม่เปลี่ยน schema/ID ระหว่าง refactor |
| Package manager ระบุ Node.js | Node.js เป็น runtime; ใช้ npm ตาม repository | แก้ความหมายในคู่มือใหม่ |
| success/error envelope ใหม่, validation 400 | ใช้กับ `/api/v1/*`; legacy adapter รักษา response/status เดิม | เป็น contract migration แยกขั้น |
| ห้าม import ข้าม module โดยตรง | ใช้ shared ports และ composition root ต่อ dependencies | ใช้ตามหลักแยก module |
| ตัวอย่าง `__test__` | คง `__tests__/*.test.ts(x)` ให้ตรง convention ที่มี | ปรับชื่อโฟลเดอร์เท่านั้น |

`AGENT.md`, `CLAUDE.md`, `docs/codebase.md` ปัจจุบันระบุ single-root/no monorepo แผนนี้เสนอเปลี่ยนเป็น npm workspaces เพื่อรองรับคำขอแยก Frontend/Backend เมื่ออนุมัติแล้วต้องปรับเอกสารเหล่านี้พร้อมกัน ไม่เปลี่ยน convention ในรอบจัดทำแผน

เหตุผลเลือก Family A: ระบบมีหลาย business domain และทำงานผ่าน HTTP endpoints เป็นหลัก Family B ยังไม่จำเป็น แม้ backlog จะมี recurring transactions ก็ไม่ควรสร้าง worker เปล่ารอไว้

## 4. โครงสร้างปลายทางที่เสนอ

```text
FinLover/
├── README.md
├── package.json                 # private; workspaces และคำสั่งรวม
├── package-lock.json            # lockfile เดียว
├── tsconfig.json                # shared compiler options; ไม่กวาดทุก workspace
├── .env.example                 # อธิบาย environment แยกแต่ละ app
├── .gitignore
├── compose.yml                  # infra สำหรับ deployment เมื่อมีการใช้งาน
├── .github/
├── .husky/                      # hook entry เรียก dev scripts
├── infra-dev/
│   ├── compose.yml              # frontend, backend, MongoDB replica set สำหรับ dev
│   ├── scripts/check-commit-msg.js
│   └── scripts/dev.mjs          # เริ่ม/หยุดสอง process และส่งต่อ signals
├── docs/
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   ├── postcss.config.mjs
│   ├── components.json
│   ├── eslint.config.mjs
│   ├── vitest.config.ts
│   ├── .env.example
│   ├── Dockerfile               # production เมื่อจำเป็น
│   ├── infra-dev/Dockerfile     # dev เท่านั้น
│   ├── public/                  # static assets ตาม Next convention
│   └── src/
│       ├── app/                 # pages, layouts, providers, styles
│       ├── features/            # auth, categories, transactions, dashboard
│       ├── components/          # shared UI; ui/ คง shadcn
│       ├── lib/                 # api client, UI utilities
│       ├── mocks/               # fixture/demo ที่ยังจำเป็น
│       └── test/setup.ts
├── backend/
│   ├── README.md
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   ├── eslint.config.mjs
│   ├── vitest.config.ts
│   ├── .env.example
│   ├── Dockerfile               # production เมื่อจำเป็น
│   ├── infra-dev/
│   │   ├── Dockerfile
│   │   └── scripts/generate-erd.ts
│   └── src/
│       ├── index.ts             # application composition; ไม่เปิด HTTP listener เอง
│       ├── app/api/             # thin Next route entry; legacy และ v1
│       ├── modules/
│       │   ├── index.ts
│       │   └── v1/
│       │       ├── index.ts     # ประกอบ dependencies ระหว่าง modules
│       │       ├── auth/
│       │       ├── users/
│       │       ├── categories/
│       │       ├── transactions/
│       │       └── wallets/
│       ├── shared/
│       │   ├── kernel/          # AppError, ERRORS
│       │   ├── middleware/      # auth, validation, errors, request logging
│       │   ├── ports/           # interfaces ที่ใช้ข้าม module/transaction boundary
│       │   ├── config/          # validated environment
│       │   ├── auth/            # password/token primitives
│       │   └── docs/            # OpenAPI
│       ├── db/
│       │   ├── index.ts         # connection lifecycle
│       │   ├── models/          # Mongoose schemas และ persistence constraints
│       │   ├── unit-of-work.ts  # session/transaction implementation
│       │   └── migrations/     # operational source; ไม่รันอัตโนมัติ
│       └── test/setup.ts
└── packages/
    └── contracts/
        ├── package.json
        ├── tsconfig.json
        └── src/                # HTTP types/Zod schemas เท่านั้น
```

ต้นไม้เป็น target map ไม่ใช่คำสั่งสร้างทุก folder ทันที สร้างตามงานที่มีจริง เช่น users เริ่มจาก repository โดยไม่มี router/controller หากยังไม่มี user endpoint

กฎ root/infra-dev/src ใช้กับ **แต่ละ application root**; repository root เป็นตัวจัดการ workspace และ infra รวม เอกสารไม่ถือเป็น application source ส่วน static assets คงใน `frontend/public/` ตาม Next.js

เริ่มจาก dependency versions เดิม ไม่ทำ major upgrade ระหว่างย้าย เลือก ESLint ต่อเนื่องได้ เพราะไฟล์แนบยก `biome.json` เป็นตัวอย่าง config ไม่ได้บังคับเปลี่ยน linter

`packages/contracts` เป็น package ภายใน ไม่เผยแพร่ npm; ทั้งสอง app import ผ่าน package exports เท่านั้น ห้าม import `../backend/src` หรือ `../frontend/src` ใช้ build ของ contracts ก่อน build/type-check apps และทำ watch ใน dev โดยกำหนด exports ไปที่ผล build อย่างสม่ำเสมอ

## 5. Backend architecture และ dependency boundaries

ตัวอย่าง module ที่มี endpoint จริง:

```text
modules/v1/categories/
├── router.ts
├── controllers/CreateCategoryController.ts
├── services/CreateCategoryService.ts
├── repositories/CategoryRepository.ts
├── middlewares/validators/createCategoryValidator.ts
├── dtos/CategoryResponseDTO.ts
└── __tests__/
```

ใช้ class ต่อ action; controller มี `handle(...)`, service มี `execute(...)`; DTO ใช้ static mapping และไม่มี business rule

```text
Next route.ts → module router/wrappers → validator → controller.handle
             → service.execute → repository → db/models → MongoDB
```

- `src/app/api/**/route.ts`: ประกาศ HTTP methods และเชื่อม handler เท่านั้น ใช้ Node runtime สำหรับ Mongoose/bcrypt
- `src/index.ts`: ส่งออก application handlers ที่ประกอบจาก `modules/index.ts`; ไม่มี query/validation/business logic
- `modules/index.ts`: รวม version registries; `modules/v1/index.ts`: composition root ต่อ dependencies ข้าม module
- `router.ts`: รับ dependency ที่ต้องใช้ สร้าง repository → service → controller และห่อ auth/validation/error/logging; ให้ Next file routing เป็นผู้ match URL/method
- Controller: อ่าน validated input/principal แล้วเรียก service; สร้าง response และ cookies ได้ ห้าม import repository/model
- Service: business rules, ownership, workflow; ไม่รู้จัก `NextRequest`, `NextResponse`, `cookies()` หรือ HTTP status ใช้ error code ที่ transport mapper แปลงเป็น status
- Repository: query/write, projection, session propagation; ไม่ตัดสินสิทธิ์หรือคำนวณกฎยอดเงิน
- `db/models`: schema, indexes, persistence constraints; business hooks จะถูกย้ายออกเป็นขั้นหลังมี regression coverage
- Shared ports เช่น `UserLookup`, `WalletAccess`, `TransactionCategoryCleanup`, `UnitOfWork`: เป็นสัญญาข้าม module; composition root ส่ง implementation เข้า service ห้าม service import implementation จาก module อื่น
- `shared/` ไม่เป็นที่รวม business logic ทุก domain และไม่สร้าง generic repository/framework เกินความจำเป็น

ตัวอย่าง auth: `LoginService` รับ `UserLookup` และ token/password dependencies; composition root ใช้ `UserRepository` จาก users มาประกอบ จึงไม่ต้องให้ auth import ภายใน users โดยตรง

ตัวอย่างลบ category: `DeleteCategoryService` ประสาน CategoryRepository และ TransactionCategoryCleanup port ภายใต้ UnitOfWork เดียว โดย transaction repository ทำการ set category เป็น null เท่านั้น

## 6. API, authentication และ data contracts

### 6.1 รักษา endpoints เดิมก่อน

| Legacy URL | Methods ที่มีจริง | Versioned URL ที่เสนอ |
| --- | --- | --- |
| `/api/auth/register` | POST | `/api/v1/auth/register` |
| `/api/auth/login` | POST | `/api/v1/auth/login` |
| `/api/auth/logout` | POST | `/api/v1/auth/logout` |
| `/api/categories` | POST | `/api/v1/categories` |
| `/api/categories/:id` | PUT, DELETE | `/api/v1/categories/:id` |
| `/api/transaction` | POST | `/api/v1/transactions` |
| `/api/transaction/:id` | PUT, DELETE | `/api/v1/transactions/:id` |

Legacy และ v1 ใช้ service ชุดเดียว ต่างกันที่ request/response adapter ไม่มีสำเนา business logic Legacy ต้องคง status, fields และ envelope ที่ client/tests คาดหวัง เช่น transaction validation 422, transaction DELETE 204 ไม่มี body และ category DELETE คืน data

v1 ใช้ `{ status: true, data, meta? }` และ `{ status: false, error, timestamp, path }` ตามเอกสาร เลือก validation 400, unauthenticated 401, forbidden 403, not found 404, duplicate/conflict 409, unexpected 500; อย่าแปลง database error ทุกชนิดเป็น 409 กำหนด DELETE ของ v1 ให้คืน 200 พร้อม success envelope เพื่อไม่ขัดกับ 204 ที่ไม่มี body

GET lists, wallet API, reports API และ current-user API ยังไม่ปรากฏใน route tree ที่ตรวจ จัดเป็น feature/integration เพิ่มเติม ไม่อ้างว่ามีอยู่แล้ว

### 6.2 Auth ระหว่างสอง applications

- dev: frontend port 3000, backend port 3001; browser เรียก relative `/api/*` ผ่าน frontend rewrite ไป backend
- production: เสนอ public origin เดียว โดย reverse proxy ส่ง `/api/*` ไป backend และหน้าเว็บไป frontend; ต้องทดสอบกับ hosting จริงก่อน cutover
- Backend เป็นเจ้าของ session; JWT secret และ database URI อยู่เฉพาะ backend; frontend ไม่ import token signing/verification หรือ model
- Legacy adapter คง Bearer behavior เดิม; เสนอ v1 รองรับ HttpOnly cookie สำหรับ browser และ Bearer สำหรับ API clients
- ถ้ามี Authorization header ให้ตรวจ header นั้นโดยไม่ fallback ไป cookie เมื่อ header invalid เพื่อไม่ทำให้ request ผิด credentials ผ่านเงียบ ๆ
- Cookie คงชื่อ/อายุ 7 วัน, HttpOnly, Secure ใน production, SameSite Lax, Path `/`; login/logout ต้องผ่าน proxy แล้วตั้ง/ลบ cookie ได้จริง
- Cookie-authenticated writes ต้องตรวจ Origin ตาม public-origin allowlist และมี CSRF strategy สำหรับ client ที่ไม่มี Origin; กำหนดและทดสอบก่อนเปิด v1 cookie writes
- ถ้าจำเป็นต้องใช้คนละ public origin ให้แยกตัดสินใจ credentials/CORS/SameSite/Secure และ CSRF ใหม่ ไม่ถือว่า dev rewrite พิสูจน์ deployment แบบนั้นแล้ว
- Logout เดิมลบ cookie แต่ไม่ revoke JWT ที่ออกไปแล้ว คงข้อจำกัดนี้ระหว่าง refactor; token revocation ตาม backlog เป็นงานเปลี่ยน behavior ต่างหาก

### 6.3 DTO และ shared contracts

- เก็บ HTTP request/response schemas ที่ browser ใช้ร่วมได้ใน `packages/contracts/src/`; ไม่มี Mongoose, Next server APIs, secret หรือ business services
- Backend DTO แปลง ObjectId เป็น string และ Date เป็นรูปแบบ wire ที่ระบุ; frontend mapper แปลง wire date เป็น UI `Date` เมื่อจำเป็น
- Legacy adapter รักษา snake_case/title-case input ตามเดิม; เสนอ v1 ใช้ camelCase และ `income | expense` ให้สอดคล้อง UI/model พร้อม explicit mapping
- ทำรายการ field ที่ UI มีแต่ API/model ไม่รองรับ เช่น transaction `title` และ category icon ก่อนเชื่อมข้อมูล ห้ามสร้าง field สมมติหรือทิ้งข้อมูลเงียบ ๆ
- คง amount เป็น representation ปัจจุบัน ไม่มี Decimal128 migration ในงานนี้ สคริปต์เดิมมีเป้าหมายเปลี่ยน Number → Decimal128 แต่ model ที่ตรวจยังเป็น Number จึงต้องทบทวนแยกก่อนใช้งาน

### 6.4 Swagger API design / API documentation

ใช้ **OpenAPI เป็นเอกสาร API contract** และ **Swagger UI เป็นหน้าอ่านเอกสารและทดลองเรียก API** งานนี้รวมทั้งออกแบบ v1 ก่อนเขียน handlers และบันทึก legacy ตาม behavior จริง ไม่ใช่เพียงติดตั้งหน้า Swagger

**แนวทางออกแบบและ source of truth**

- Phase 0 บันทึก legacy จาก routes/tests ตามตาราง 6.1 ให้ครบ 9 operations และร่าง v1 คู่กัน ระบุสถานะ draft/implemented ในคำอธิบายอย่างชัดเจน; GET lists, wallets, reports และ current-user ที่ยังไม่มีไม่อยู่ในรายการ API ที่พร้อมใช้งาน
- ก่อน implement v1 แต่ละ operation ให้ทบทวน method/path, `operationId`, tag, summary, auth, parameters, request body, response/status และ examples ร่วมกับ DTO/schema; ใช้ path parameter รูปแบบ `{id}` ใน OpenAPI
- เก็บ request/response Zod schemas ที่แชร์ได้ใน `packages/contracts/src/`; เก็บ operation metadata, security schemes, examples และตัวประกอบ spec ใน `backend/src/shared/docs/` เพื่อ generate spec จาก schema ชุดเดียว ไม่เขียน validation schema ซ้ำใน YAML
- เลือก generator/validator และ OpenAPI version ที่ทำงานร่วมกับ Zod, Next.js, React และ Swagger UI ของโปรเจกต์ได้ โดยพิสูจน์การแปลง nullable/optional/date/amount ก่อนล็อก dependency versions; ไม่ทำ major upgrade เพื่อเพิ่ม docs
- เก็บ generated artifacts แยกเป็น `docs/api/openapi-legacy.json` และ `docs/api/openapi-v1.json`; ห้ามแก้ artifacts ด้วยมือ เพิ่ม `docs/api/README.md` อธิบาย workflow, auth, examples และการย้าย legacy → v1
- การแก้ API ต้องอัปเดต schemas, operation metadata, generated spec และ contract tests ใน change เดียวกัน; generator ต้องทำงานได้โดยไม่เชื่อม DB หรือใช้ secrets

**เนื้อหาของแต่ละ operation**

- ระบุ required/optional/nullable fields, wire types, enum, validation constraints และตัวอย่าง request/response ที่สอดคล้องกับ handler; ไม่เผย password hash หรือ persistence-only fields
- ระบุ success และ error responses ที่ operation นั้นคืนจริง รวม validation, auth, ownership, not found และ conflict ตามกฎของ operation; ไม่ใส่ทุก status เหมือนกันทุก endpoint
- Legacy ต้องแสดง envelope/status เดิม เช่น transaction validation 422 และ DELETE 204 ไม่มี body; v1 แสดง validation 400 และ DELETE 200 พร้อม envelope ตามหัวข้อ 6.1
- อธิบายผลต่อ wallet balance, category cascade, ownership และข้อจำกัด logout โดยไม่อ้างว่า Swagger schema เพียงอย่างเดียวตรวจ business rules เหล่านี้ได้
- แยก `bearerAuth` กับ `sessionCookie` (`session_token`); operation ที่รับอย่างใดอย่างหนึ่งต้องประกาศแบบ OR และ public operation ไม่บังคับ auth ส่วน legacy ระบุตามพฤติกรรมเดิม พร้อมอธิบายลำดับเลือก Authorization ก่อน cookie และ CSRF ของ v1

**หน้าเอกสารและการทดลองเรียก**

- เสนอ backend route `/api/docs` สำหรับ Swagger UI และ `/api/openapi/legacy.json`, `/api/openapi/v1.json` สำหรับ spec; ทุก path อยู่ใต้ `/api/*` เพื่อผ่าน frontend rewrite/reverse proxy เดิม และต้องมี explicit route ของตัวเอง
- หน้า Swagger เลือก legacy/v1 ได้; ใช้ relative server URL `/` กับ spec paths แบบเต็ม `/api/...` เพื่อเรียกผ่าน origin ที่เปิด docs โดยไม่เติม `/api` ซ้ำหรือ hard-code localhost
- ใช้ Swagger UI บน client boundary ของหน้า docs; business modules ไม่ import UI packages และการเปิด docs/spec ไม่ควรต้องเชื่อม MongoDB
- เอกสาร v1 ที่ยังเป็น draft เปิดอ่านได้แต่ปิดการทดลองเรียก จน handlers ของ spec รุ่นนั้นพร้อม; dev/test ใช้ข้อมูลทดสอบ ส่วน production เริ่มจากอ่านเอกสารอย่างเดียว
- ทดสอบ Bearer ผ่าน Authorize ด้วย test token; สำหรับ cookie ให้ทดสอบ login ผ่าน same-origin แล้วให้ browser ส่ง cookie ตามจริง รวม CSRF checks ไม่สร้างช่องให้อ่าน HttpOnly cookie ด้วย JavaScript ทั้งนี้ Swagger UI มีข้อจำกัดในการกำหนด Cookie header เอง ตาม [Swagger UI limitations](https://swagger.io/docs/open-source-tools/swagger-ui/usage/limitations/)

**สิ่งส่งมอบ:** OpenAPI legacy/v1, Swagger UI ที่เลือก spec ได้, คู่มือ API และคำสั่ง generate/validate/check รวมถึงหลักฐาน contract tests และ browser smoke test หลัง implement

## 7. Frontend structure

- `src/app`: pages/layouts/styles/providers เป็นตัวประกอบหน้า; คง `/`, `/dashboard`, `/transactions`, `/category`, `/login`, `/register`
- `src/features/<feature>`: components/hooks/schemas/mappers/store ที่ใช้เฉพาะ feature; ไม่สร้าง subfolder ที่ยังไม่มีไฟล์
- `src/components/ui`: ย้าย shadcn components เดิมโดยรักษา behavior; ปรับ `components.json` และ aliases
- `src/components`: UI ที่ใช้หลาย feature เช่น Sidebar, selectors, shared auth presentation
- `src/lib/api`: HTTP client และ error mapping กลาง; server data จริงใช้ TanStack Query และ provider ที่เหมาะสม
- Zustand ใช้กับ modal/filter/selection state; local form state ยังอยู่ใน component ได้; ไม่เก็บสำเนา server data ใน store
- ย้าย mocks/fixtures ที่ใช้อยู่ให้หน้าทำงานเท่าเดิมก่อน แล้วค่อยแทนด้วย API เป็นราย feature ในงาน integration
- `lib/transactions.ts` เป็นการ filter/summarize ฝั่ง UI ไม่ควรถูกย้ายไป backend ทั้งไฟล์เพียงเพราะชื่อ lib; ย้าย sentinel ที่ import จาก component ไป feature constant เพื่อลด dependency ย้อนชั้น

## 8. Mapping ของเดิมไปโครงใหม่

| ของเดิม | ปลายทาง / งานที่ต้องทำ |
| --- | --- |
| `src/app/` ยกเว้น api | `frontend/src/app/`; ย้าย CategoryClient และ logic หนักไป features |
| `src/components`, `hooks`, `store` | frontend shared components หรือ feature ที่เป็นเจ้าของ |
| `src/lib/utils.ts`, `transactions.ts`, mocks | frontend lib/features/mocks ตามหน้าที่ |
| `src/types/*` | แยก HTTP contracts กับ frontend-only models/filter types |
| `src/app/api/*` | backend thin legacy routes และ modules/v1 |
| `src/lib/services/*` | module services + repositories; แยก query ออกจากกฎธุรกิจ |
| `src/lib/categoryErrors.ts` | shared AppError/error adapter และ validation; รักษา legacy error mapping |
| `src/lib/auth.ts`, `apiAuth.ts`, `session.ts` | backend shared auth/middleware และ auth module; แยก cookie transport |
| `src/lib/db.ts`, `src/models/*` | backend db/index.ts และ db/models; ทบทวน model registration order |
| Tests เดิม | ย้ายตามโค้ดที่ทดสอบ; เปลี่ยน mocks/import path โดยรักษา assertions |
| `vitest.setup.ts` | frontend/backend src/test/setup.ts ตาม environment |
| `public`, CSS/Tailwind/PostCSS, shadcn config | frontend |
| `scripts/check-commit-msg.js` | root infra-dev/scripts; แก้ Husky และ CI references |
| `scripts/generate-erd.ts` | backend infra-dev/scripts; แก้ model imports และ output ไป root docs/ERD.md อย่างชัดเจน |
| Decimal128 migration script | backend src/db/migrations; ย้ายได้แต่ไม่ execute; เลิกผูก env กับ cwd เดิม |
| `src/models/FinLover.code-workspace` | root `FinLover.code-workspace` หรือคัดออกหลังตรวจการใช้งาน; ไม่อยู่ใน source models |
| README, AGENT, CLAUDE, codebase.md/html | อัปเดตคำสั่ง/paths/architecture ให้ตรงกันเมื่อ implement |
| sprint/backlog markdown | เสนอย้ายเข้า docs พร้อมแก้ links; คงเนื้อหาเดิม |

ตรวจ `.gitignore` ที่มี pattern source transaction types และข้อความ encoding ผิดปกติด้วย อย่าให้ pattern จาก single-root ทำให้ nested build output หลุดเข้า Git หรือซ่อน source ใหม่โดยไม่ตั้งใจ

## 9. ลำดับ implementation หลังอนุมัติ

### Phase 0 — Baseline และยืนยัน design decisions

1. ยืนยันข้อเสนอในหัวข้อ 12 แล้วเปิด branch สำหรับ refactor จากฐานที่ตกลง ไม่ push/merge branch ปัจจุบันอัตโนมัติ
2. บันทึก API contract จากโค้ดและ tests แยกจาก backlog; ทำ baseline lint, typegen, type-check, test, build พร้อมบันทึก failure เดิม
3. ทำ regression coverage ที่ขาดสำหรับ auth headers/cookies, owner isolation, transaction CRUD/balance และ category cascade
4. ตรวจ package engine compatibility และสภาพแวดล้อม Node ที่ทั้ง local/CI/deployment ใช้ก่อนเลือกเวอร์ชันกลาง
5. ออกแบบ OpenAPI legacy/v1 ตามหัวข้อ 6.4 พร้อม examples และ error/auth matrix; review v1 contract ก่อนเริ่ม handlers และแยก draft ออกจาก API ที่พร้อมทดลอง

Exit: มี baseline ที่ทำซ้ำได้และรายการ failure เดิมชัดเจน ไม่เหมารวมว่าทุก failure มาจาก refactor

### Phase 1 — Workspace และแยก applications ทางกายภาพ

1. สร้าง frontend/backend/contracts package roots พร้อม scripts และ lockfile เดียว
2. ย้าย UI และ Next configs ไป frontend; ย้าย API/models/backend helpers ไป backend โดยยังรักษา business behavior
3. ตั้ง `@/*` แยก workspace, environment samples, test configs และ ignore patterns ใหม่
4. ต่อ frontend `/api/*` ไป backend; แยก ports และตรวจ Set-Cookie/Authorization ผ่าน proxy
5. ย้าย dev scripts และแก้ root commands/Husky/CI ขั้นต่ำให้ checkout ใหม่ยังใช้งานได้

Exit: ทั้งสอง app build/start แยกได้; routes เดิมและ API tests ผ่าน; contracts ไม่ดึง server dependencies เข้า frontend

### Phase 2 — จัด Backend เป็น Modular + Layered

1. เพิ่ม AppError/ERRORS, transport wrappers, validated env และ Manual DI
2. ย้าย auth/users → categories → transactions/wallets ตามลำดับ
3. แยก class ต่อ action, repositories ต่อ collection, validators และ DTO โดยรักษา legacy contract
4. ใช้ shared ports สำหรับ cross-module work; ทดสอบ service โดย inject fake repositories ได้
5. แยก business logic จาก route handlers สำเร็จก่อนเริ่มถอน model hooks

Exit: controller ไม่เข้าถึง DB โดยตรง; service ไม่ผูก Next/HTTP; ไม่มี direct cross-module implementation imports นอก composition root

### Phase 3 — ย้าย business hooks และควบคุม transaction boundary

1. ระบุทุก write path ที่กระทบยอดเงิน ทั้ง save/update/delete/cascade และ bulk operations
2. ย้าย ownership/category compatibility และ balance delta calculation เข้า services ให้มีเจ้าของกฎเพียงแห่งเดียว
3. ทำ repository operations รับ transaction context ผ่าน UnitOfWork; ไม่เผย Mongoose session ให้ controller
4. ถอน hook ของแต่ละ operation ใน change เดียวกับ service ที่มาแทน ห้ามเปิดทั้งสองพร้อมกันจน balance ถูกเพิ่ม/ลบซ้ำ
5. ถ้าปรับให้ transaction write + wallet balance เป็น atomic ให้ใช้ MongoDB replica set ทั้ง dev/test/deployment และทดสอบ rollback รวมถึง concurrent writes
6. จำแนก atomicity improvement ว่าเป็น behavior hardening ที่ต้องมี acceptance เพิ่ม ไม่อ้างว่าการย้ายไฟล์แก้ข้อจำกัดเดิมโดยอัตโนมัติ

Exit: create/update/delete เปลี่ยนยอดครั้งเดียว, failure ไม่ทิ้ง partial writes ใน flow ที่เลือกทำ atomic, category deletion คงธุรกรรมและยอดเงินไว้โดย category กลายเป็น null

### Phase 4 — Versioned contracts และจัด Frontend ตาม feature

1. เปิด v1 handlers โดยใช้ services เดียวกับ legacy ตาม OpenAPI design ที่ทบทวนใน Phase 0; เชื่อม DTO/Zod schemas กับ spec generator และ contract tests
2. ย้าย frontend feature logic, providers, UI state และ mappers โดยคงหน้าตา/route behavior
3. เพิ่ม structured logs ที่มี request ID, path, method, status, duration; user/IP ใช้เมื่อมีและเชื่อถือได้จาก proxy configuration
4. ไม่ log passwords, cookies, Authorization, JWT หรือ request body ที่มีข้อมูลการเงิน; production errors ซ่อน internal details
5. เก็บ legacy จนผู้ใช้งานทุกตัวถูกตรวจและย้ายแล้ว; การลบ legacy เป็นงานที่มีรายการ consumer รองรับ
6. เพิ่ม Swagger UI `/api/docs`, spec endpoints และ artifacts legacy/v1 ตามหัวข้อ 6.4; ทดสอบผ่าน frontend proxy และ backend โดยตรง พร้อมเปลี่ยนสถานะ v1 เป็น implemented เมื่อ handlers พร้อม

Exit: legacy regression suite และ v1 contract suite ผ่าน; Swagger แสดง request/response/auth ตรงกับ API และทดลองกับ dev/test ได้; frontend mock/demo เดิมยังทำงานและระบุสถานะตามจริง

### Phase 5 — Infra, CI, docs และ cutover rehearsal

1. Root scripts เสนอ `dev`, `dev:frontend`, `dev:backend`, `build`, `lint`, `type-check`, `test`, `generate-erd`; scripts รวมต้องตรวจ workspace ที่จำเป็นครบ ไม่กลบ missing scripts ด้วยการ skip
2. CI: npm ci → build contracts → lint → typegen ทั้ง Next apps → type-check → tests → ERD sync → build ทั้ง apps; คง commit lint/secret scan
3. ใช้ jsdom สำหรับ frontend; node และ replica-set integration tests สำหรับ backend; test binaries/database setup ต้อง reproducible
4. Dev compose ใช้ replica set และ dev Dockerfiles; production config แยกจาก bind mounts/watch mode และจัด secret จาก environment
5. ERD generator ต้องชี้ root docs ชัดเจนแม้เรียกจาก backend cwd และไม่สร้าง backend/docs โดยเผลอ
6. ตรวจและปรับ docs, package manifests และ agent instructions ตามรายการด้านล่างให้ตรงกับ implementation ที่ส่งมอบ; regenerate ERD ด้วย script เท่านั้น
7. ทดสอบ fresh clone, dev run, production build/start, API proxy และ logout/login ผ่าน browser; deployment จริงทำในขั้นที่ได้รับมอบหมายภายหลัง
8. เพิ่ม root commands `api:generate`, `api:validate`, `api:check` โดยเรียก generator/validator ใน backend; CI หลัง build contracts ต้องตรวจ spec validity, unresolved references, operation coverage และ regenerate แล้วเทียบ artifacts เพื่อจับเอกสารที่ไม่อัปเดต ก่อน build ทั้ง apps
9. เพิ่ม docs/API links และ workflow ใน README/codebase พร้อม `docs/api/README.md`; บันทึกวิธีใช้ Swagger, examples, auth/CSRF และ legacy → v1 mapping

**รายการอัปเดต docs / package.json / agent instructions ที่ต้องส่งมอบ**

อัปเดตไฟล์ที่ได้รับผลกระทบพร้อม implementation ในแต่ละ Phase และตรวจความสอดคล้องทั้งชุดอีกครั้งใน Phase 5 ไม่รอแก้เอกสารทั้งหมดตอนท้าย และไม่คัดลอกโครงสร้างที่เสนอในแผนไปอ้างว่า implement แล้วโดยยังไม่ได้ตรวจโค้ดจริง

| ไฟล์ | สิ่งที่ต้องปรับให้ตรงกับเวอร์ชันใหม่ |
| --- | --- |
| `README.md`, `backend/README.md` และ README ของ workspace ที่มี | prerequisites, fresh install, environment setup, ports/proxy, คำสั่ง dev/build/start/test, Swagger และลิงก์ไปคู่มือที่ใช้งานจริง |
| `docs/codebase.md` และ `docs/codebase.html` | stack, directory tree, ตารางตำแหน่งไฟล์, workspace boundaries, Router → Controller → Service → Repository, Manual DI, conventions, testing และ CI; ทั้งสองรูปแบบต้องมีเนื้อหาตรงกัน |
| เอกสารอื่นที่ได้รับผลกระทบ รวม `docs/api/README.md` และ `.env.example` | แก้ paths, links, ตัวอย่างคำสั่ง, environment variables, auth/API contracts และ workflow; แยก implemented, mock/demo และงานที่ยังไม่ทำให้ชัดเจน; ERD/OpenAPI artifacts อัปเดตผ่าน generator ที่กำหนด |
| root `package.json` | ตั้ง `private`, `workspaces`, runtime requirements และ scripts รวมให้ตรงกับ workspace ที่สร้างจริง รวม dev/build/start/lint/type-check/test/ERD/OpenAPI ตามหน้าที่; เก็บ dependencies สำหรับ tooling ส่วนกลางตามการใช้งานจริง |
| `frontend/package.json`, `backend/package.json`, `packages/contracts/package.json` เมื่อสร้าง | กำหนดชื่อ package, scripts, dependencies/devDependencies และ exports/build outputs ตามหน้าที่จริง; แต่ละ package ประกาศ dependencies ที่ใช้เอง ไม่อาศัยการ hoist โดยบังเอิญ; frontend/contracts ไม่รับ backend-only dependencies |
| root `package-lock.json` | regenerate ผ่าน npm ให้สอดคล้องกับ manifests ทุก workspace และยืนยัน `npm ci` จาก clean checkout ได้ด้วย lockfile เดียว |
| `AGENT.md` และ `CLAUDE.md` | ใช้ชื่อไฟล์จริงใน repository; แก้ข้อกำหนด single-root/no monorepo เป็น npm workspaces, paths, คำสั่ง, source/dev-tool boundaries, layering/DI, API docs, test environments และ CI ให้ตรงกับ implementation; คงกฎ UI/state/commit/PR ที่ยังใช้ได้ และตรวจว่าคำแนะนำร่วมของทั้งสองไฟล์ไม่ขัดกัน |

ตรวจตัวอย่างคำสั่งจาก working directory ที่เอกสารระบุ รวม root และแต่ละ workspace; ตรวจ links/paths และค้นหาข้อความ single-root หรือคำสั่งเก่าที่ตกค้าง โดยแยกเอกสารประวัติออกจากคู่มือใช้งานปัจจุบัน บันทึกผลตรวจจริงและข้อจำกัดที่ยังไม่ได้ทดสอบไว้ตอนส่งมอบ

Exit: ผู้พัฒนาติดตั้งจาก lockfile เดียวและรันตาม README ได้ ทั้งสองแอปแยก secrets/dependencies/build outputs จริง; docs, manifests, AGENT.md และ CLAUDE.md ตรงกับ implementation และไม่มีคำแนะนำปัจจุบันที่ขัดกัน

### งานต่อยอดแยก: เชื่อม UI กับ API ให้ครบ

หลัง structural refactor ให้ประเมินอีกชุด: auth form integration, current-user/session query, GET categories/transactions/wallets, reports และ field gaps เช่น icon/title ใช้ TanStack Query สำหรับ server state และมี loading/error/empty states งานนี้เพิ่ม capability ที่ checkout ปัจจุบันยังไม่มี จึงไม่รวมเงียบ ๆ ในคำว่า refactor

## 10. Acceptance checks ที่ต้องผ่าน

| กลุ่ม | หลักฐานที่ต้องได้หลัง implement |
| --- | --- |
| Structure | Backend source อยู่ src; dev-only scripts อยู่ infra-dev; frontend ไม่ import backend source/model |
| Layering | service tests inject dependencies; ไม่มี HTTP/Next imports ใน services และไม่มี repository imports ใน controllers |
| Legacy compatibility | ตรวจทุก method ในตาราง API รวม error fields/status, invalid JSON, missing/expired token, malformed IDs และ empty DELETE response |
| Authorization | ผู้ใช้ A ไม่อ่าน/แก้/ลบทรัพยากร B; system category protection คงเดิม |
| Transactions | create/update/delete, income↔expense, category null/type mismatch, wallet ownership, balance delta ครั้งเดียว |
| Atomicity | injected write failure และ concurrency tests ยืนยัน rollback/ยอดเงินของ flow ที่ปรับให้ atomic |
| Category cascade | ลบหมวดหมู่แล้ว transaction ยังอยู่ category null และ wallet balance ไม่เปลี่ยน |
| Auth transport | browser login/logout ผ่าน proxy; HttpOnly/secure/path/expiry ถูกต้อง; Bearer ยังใช้ได้; cookie writes ผ่าน CSRF checks |
| Contracts | v1 envelope/schema และ legacy adapter แยกกัน; Date/ObjectId/amount mapping ไม่เปลี่ยนโดยไม่ตั้งใจ |
| API design / documentation | Legacy ครบ 9 operations ตามตาราง 6.1 และ v1 ครบคู่ที่ implement; operationId ไม่ซ้ำ, references resolve ได้, examples ผ่าน schema และไม่แสดง feature ที่ยังไม่มีว่าใช้งานได้ |
| Spec consistency | Generate แบบ deterministic โดยไม่ใช้ DB/secrets; CI ตรวจ artifact drift และ contract tests ตรวจ status/body จาก handlers เทียบ spec รวม error cases และ legacy DELETE 204 ไม่มี body |
| Swagger UI | เปิด docs และทั้งสอง specs ผ่าน proxy/ตรง backend ได้; server URL ไม่ซ้ำ prefix; Bearer และ same-origin cookie/CSRF ผ่าน browser smoke test ใน dev/test; draft และ production ปิดการทดลองเรียกตามแผน |
| Frontend | routes/layout, modal, filters และ mock behavior เดิมไม่เสีย; UI integration ใหม่ทดสอบแยกเมื่อทำ |
| Tooling | fresh install, lint/type-check/tests/build ทั้ง apps, ERD sync, Husky/CI paths ถูกต้อง |
| Docs / manifests / agent instructions | README และคำสั่งตัวอย่างใช้งานได้จาก cwd ที่ระบุ; codebase.md/html เนื้อหาตรงกัน; links/paths/env ตรงกับโค้ด; package.json ทุก workspace และ lockfile สอดคล้องกัน; AGENT.md/CLAUDE.md อธิบาย architecture และ workflow ใหม่ตรงกัน และไม่อ้างงานที่ยังไม่ได้ implement ว่าเสร็จแล้ว |

ทดสอบเฉพาะที่มีผลต่อการย้ายและ behavior สำคัญ ไม่เพิ่ม tests ที่เพียงตรวจว่ามี folder/file ตามต้นไม้ รายงานแยก static checks, integration tests และ browser/deployment proof

## 11. การแบ่ง change และ rollback

แบ่ง PR ตาม Phase 1–5 ให้แต่ละชุด build/test ได้ โดย Phase 3 อาจแบ่งตาม operation ที่ถอน hook อย่างครบวงจร หลีกเลี่ยงย้ายไฟล์ เปลี่ยน schema และเพิ่ม feature ใน change เดียว

ช่วง migration ให้ old deployment และ new deployment ใช้ schema/ID เดิม; backend ใหม่รองรับ legacy URLs จึงสลับ traffic กลับ release ก่อนหน้าได้เมื่อพบปัญหา เก็บ artifact/config เดิมไว้จนผ่าน smoke tests การย้อน code ไม่ย้อนข้อมูลที่ผู้ใช้เขียนไปแล้ว และไม่ใช่เหตุผลให้รัน reverse migration อัตโนมัติ

อย่าเปลี่ยน MongoDB credentials, JWT secret หรือ cookie scope พร้อม cutover โดยไม่จำเป็น เพราะจะทำให้ session/data compatibility ประเมินยากขึ้น

## 12. รายการให้ผู้ใช้ตรวจสอบก่อนเริ่ม implementation

- [x] ใช้ repository เดียว แยก `frontend/`, `backend/`, `packages/contracts/` ด้วย npm workspaces
- [x] คง Next.js ทั้ง frontend และ API backend, TypeScript strict, Node.js, MongoDB/Mongoose
- [x] ยอมรับ Next route.ts เป็น HTTP entry จริง และ `src/index.ts` เป็น application composition entry
- [x] ใช้ Family A, versioned modules, Manual DI และ boundaries ตามหัวข้อ 5
- [x] คง ObjectId/schema/field names ใน DB แทนตัวอย่าง Drizzle/UUID/snake_case ที่ไม่ตรง stack
- [x] คง legacy APIs และเพิ่มมาตรฐาน response/auth ใหม่เฉพาะ v1 พร้อม migration tests
- [x] รวม Swagger API design / API documentation ตามหัวข้อ 6.4: OpenAPI legacy/v1, Swagger UI, spec generation/validation และ CI ตรวจเอกสารตรงกับ API
- [x] รวมการอัปเดต docs, package.json ทุก workspace และ lockfile, AGENT.md และ CLAUDE.md ให้ตรงกับ implementation ใหม่ พร้อมตรวจความสอดคล้องตาม Phase 5 ก่อนส่งมอบ
- [x] ใช้ same-origin API proxy และ backend-owned session ตามหัวข้อ 6
- [x] ถอน business hooks แบบมี regression tests; atomic write changes ต้องมี replica-set prerequisites และ acceptance เพิ่ม
- [x] แยกการเติม APIs/เชื่อม mock UI ทั้งหมด/recurring worker ออกจาก structural refactor

รายการข้างต้นได้รับอนุมัติจากคำขอให้เริ่ม implementation แล้ว เครื่องหมายถูกหมายถึงอนุมัติ scope ไม่ใช่หลักฐานว่าการทดสอบทุกข้อผ่าน ดูผลจริงใน refactor-validation.md

## 13. แหล่งอ้างอิง

- เอกสารมาตรฐานจากผู้ใช้: `/Users/buchi/Downloads/How to SE-Finlover.docx.md` — อ่านครบทั้ง Family A และ Family B
- Checkout และ source paths ในหัวข้อ 2; เอกสารเดิม `AGENT.md`, `CLAUDE.md`, `docs/codebase.md`, `product-backlog.md`
- Next.js docs ที่ติดตั้งใน repository: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`, `src-folder.md` และ `05-config/01-next-config-js/rewrites.md`
- [Next.js Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route): HTTP method exports และ request/response transport
- [Next.js rewrites](https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites): URL proxy สำหรับเชื่อม public path ไป backend
- [npm workspaces](https://docs.npmjs.com/cli/v8/using-npm/workspaces/): จัดการหลาย local packages ผ่าน root package; โครงสร้าง workspace ที่เลือกเป็นข้อเสนอของแผนนี้
- [Swagger UI configuration](https://swagger.io/docs/open-source-tools/swagger-ui/usage/configuration/): การโหลด spec และกำหนดพฤติกรรมหน้าเอกสาร
- [Swagger UI limitations](https://swagger.io/docs/open-source-tools/swagger-ui/usage/limitations/): ข้อจำกัดการกำหนด Cookie header ใน browser
