# FinLover — Modular Monolith Implementation Plan (Revised)

Historical plan: wallet route scope below predates issues #71/#72. The v1 GET wallet list/detail endpoints are now implemented; legacy has no wallet operations. Use the current [API guide](api/README.md) and [codebase guide](codebase.md) for the present contract.

สถานะ: **implement และตรวจรับ local แล้ว — ยังไม่ได้ deploy Vercel**  
ปรับล่าสุด: 27 กันยายน 2026  
แนวทางที่แนะนำ: **Next.js application เดียว / Vercel project เดียว / แยก frontend features กับ server layers ใน source**

เอกสารนี้แทนแผน split เดิม ซึ่งเก็บไว้ใน [archive](archive/frontend-backend-split-plan-2026-09-27.md) เพื่ออ้างอิงประวัติ ไม่ใช่คำสั่งให้ implement ต่อ ผู้ใช้อนุมัติให้ทำต่อแล้ว; working tree ถูกย้ายเป็นแอปเดียวตามแผนนี้ พร้อมรวม auth policy และอัปเดต README/codebase/agent notes ผลตรวจจริงดู [refactor-validation.md](refactor-validation.md)

## 1. ข้อสรุปและเหตุผล

เลือก **Modular Monolith + Layered Architecture** คง Next.js, TypeScript strict, Mongoose/MongoDB และ npm แต่ใช้ package.json, Next config, application build และ deployment ชุดเดียว

ความต้องการที่มีจริงคือจัดเจ้าของ business logic, ลดการผูก route กับ database, ทดสอบ services และคุม auth/transactions ให้สม่ำเสมอ ยังไม่มีเหตุผลยืนยันว่าต้องแยก runtime, release cycle, team ownership หรือ scale frontend/backend อิสระ การ split สอง Next.js applications จึงเพิ่ม deployment/proxy/env/build-order มากกว่าประโยชน์ในรอบนี้

แอปเดียวบน Vercelไม่ได้หมายถึง process ถาวรตัวเดียว: handlers อาจรันในหลาย function instances ดังนั้นยังต้องพึ่ง MongoDB transactions ไม่ใช้ in-memory locks หรือ state เพื่อรักษาความถูกต้องของยอดเงิน

## 2. วิเคราะห์ risk และผลของการรวมแอป

| ประเด็น | แผนสองแอป | ข้อเสนอแอปเดียว | สิ่งที่ยังต้องทำ |
| --- | --- | --- | --- |
| Cookie vs Bearer | login ตั้ง cookie แต่ legacy mutations รับ Bearer; v1 มี policy อีกชุด | รวม principal resolver และ mutation policy | การย้าย folder อย่างเดียวไม่แก้ auth split |
| CSRF | ต้องกำหนด origin ผ่าน proxy/หลาย deployment | Browser เรียก relative URL บน origin เดียว | ตรวจ unsafe methods รวม login/register/logout |
| Vercel projects | แบบ conventional monorepo แยก project และ build/deploy settings | Next.js project เดียวที่ root | ตั้ง environment และตรวจ deployment protection |
| Preview URLs | ต้องจับคู่ frontend/backend deployments และ credentials/protection | หน้าเว็บกับ API อยู่ deployment เดียวกัน | ตรวจ Origin ของ deployment/branch aliases อย่างเจาะจง |
| Contracts package | exports ไป dist ต้อง build ก่อน apps/watch ให้ทัน | ย้าย browser-safe schemas เป็น source ภายในแอป | ป้องกัน shared contracts import server-only code |
| Backend direct URL | โครงการ backend มี public endpoint แยกในแบบสอง projects | ไม่มี backend deployment URL แยก | `/api/*` ยังเรียกตรงได้ ต้อง auth และ ownership ทุก endpoint |
| Dockerfiles | dev containers ไม่ใช่คำสั่ง deploy Next แบบปกติบน Vercel | ตัด app Dockerfiles เมื่อยืนยันว่าไม่มี consumer | คง dev compose สำหรับ MongoDB replica setได้ |
| MongoDB hosting | ต้องมี database ภายนอก deployment | ยังต้องมี database ภายนอก เช่น Atlas | รวมแอปไม่แก้ database egress/allowlist |
| Business rules | services/repositories/ports มีประโยชน์ | เก็บไว้ทั้งหมด | อย่าย้าย logic กลับเข้า route หรือ balance hooks |

การประเมิน: สอง projects ทำได้แต่มีความซับซ้อนด้านปฏิบัติการระดับกลาง สำหรับบริบทปัจจุบันแอปเดียวลดส่วนนี้ได้ชัดเจน โดย database networking และ auth ยังเป็นงานจำเป็นเหมือนเดิม

### ข้อเท็จจริง Vercel ที่ต้องแก้จากสมมติฐานเดิม

- “ต้องเป็นสอง Vercel projects เสมอ” ไม่ตรงทั้งหมด: เอกสารปัจจุบันมี **Vercel Services (beta)** ให้หลาย applications อยู่ project/domain เดียว และมี Related Projects ช่วยจับคู่ previews ในรูปแบบหลาย projects แต่ไม่จำเป็นสำหรับ Next.js แอปเดียว [Services](https://vercel.com/kb/guide/vercel-services), [Monorepos](https://vercel.com/docs/monorepos)
- “Vercel ไม่รองรับ Docker เลย” กว้างเกินไป: ปัจจุบันมี container-based Functions; ไม่ได้แปลว่า compose ชุด dev หรือ MongoDB container จะกลายเป็น production database ที่เหมาะสม สำหรับงานนี้เลือก native Next.js deployment จึงไม่ต้องเพิ่ม app Dockerfiles [Docker on Vercel](https://vercel.com/kb/guide/docker)
- Atlas เป็นตัวเลือกแนะนำสำหรับ MongoDB ภายนอก ไม่ใช่ผู้ให้บริการที่ Vercel บังคับเพียงรายเดียว

## 3. โครงสร้างเป้าหมาย

```text
FinLover/
├── package.json / package-lock.json
├── next.config.ts / tsconfig.json / eslint.config.mjs
├── components.json / postcss.config.mjs / vitest.config.ts
├── .env.example / .github/ / .husky/
├── public/
├── infra-dev/
│   ├── compose.yml                 # MongoDB replica set สำหรับ local เท่านั้น
│   └── scripts/                    # commit check, ERD/OpenAPI/docs generation
├── docs/
└── src/
    ├── app/
    │   ├── .../page.tsx             # pages/layouts ประกอบ UI
    │   └── api/**/route.ts          # HTTP methods + thin adapter
    ├── features/                   # auth, categories, transactions, dashboard UI
    ├── components/ui/              # shadcn + shared components ข้างเคียง
    ├── lib/                        # browser-safe utilities/API client
    ├── types/ / mocks/              # frontend-only types/demo fixtures
    ├── shared/contracts/           # HTTP Zod schemas/types; browser-safe
    ├── server/
    │   ├── composition/            # manual DI, exports ของ application services/handlers
    │   ├── modules/
    │   │   ├── auth/
    │   │   ├── users/
    │   │   ├── categories/
    │   │   ├── transactions/
    │   │   └── wallets/
    │   ├── shared/
    │   │   ├── auth/               # credential resolver/session + password/token primitives
    │   │   ├── http/               # auth/CSRF/validation/error/logging adapters
    │   │   ├── kernel/             # AppError/error codes
    │   │   ├── ports/              # cross-module contracts + UnitOfWork
    │   │   ├── config/             # validated server environment
    │   │   └── docs/               # OpenAPI metadata
    │   └── db/                     # models, connection, UnitOfWork, operational migrations
    └── test/                       # frontend/backend test setup แยก environment
```

แต่ละ business module มี controllers, services, repositories, validators, DTOs ตามที่ใช้งานจริง ไม่สร้าง users/wallets endpoints หรือโฟลเดอร์เปล่าเพิ่มเพียงเพื่อให้ครบต้นไม้

API version อยู่ที่ HTTP adapter (`/api/v1/*`) ไม่ต้องผูก business services ทุกตัวไว้ใต้ `modules/v1`: legacy/v1 ใช้ services ชุดเดียว หาก contract ต่างกันให้ map ใน adapter/DTO

## 4. Dependency rules ที่ต้อง enforce

```text
Browser UI → /api/* → HTTP/auth/CSRF/validation adapter
                       → controller → service → repository → MongoDB
                                             ↘ shared ports / UnitOfWork
Browser UI ↔ shared/contracts (ไม่มี server imports)
```

- `src/app/api`: ไม่มี query/business rule; Mongoose/bcrypt handlers ใช้ Node runtime
- Controller: รับ validated input + principal และ map DTO/response; ไม่เข้าถึง repository/model
- Service: ownership, workflow, category compatibility, balance delta; ไม่ import Next/Request/Response หรือกำหนด HTTP status
- Repository: queries/writes/session propagation; ไม่เลือก auth transport หรือตัดสิน business permissions
- Composition: ต่อ dependencies ข้าม modules ผ่าน ports; ไม่ให้ service import implementation ของ module อื่น
- ใส่ `server-only` ที่ production server entry/data access boundaries พร้อม ESLint restrictions ห้าม features/components/client utilities import `@/server/**`; shared contracts ห้าม import server codeเด็ดขาด
- Server Components เรียก server use cases ผ่าน authenticated server entryได้โดยไม่ fetch API ของตัวเอง แต่ต้องใช้ ownership/auth เดียวกัน; round นี้คง client → Route Handler flow ไม่เพิ่ม Server Actions อีกชุดโดยไม่จำเป็น [Next.js BFF guide](https://nextjs.org/docs/app/guides/backend-for-frontend)
- tests แยก node/jsdom ด้วย Vitest projects หรือ per-file environment โดยคงคำสั่ง root เดียว

## 5. Auth ที่ต้อง unify จริง

### 5.1 นโยบายหลัก

**Browser ใช้ HttpOnly session cookie เป็นทางหลักทุก protected API** ไม่เก็บ JWT ใน localStorage และไม่ต้องแปลง cookie เป็น Bearer ฝั่ง browser

เก็บ `session_token`, อายุเดิม, HttpOnly, SameSite=Lax, Path=/, Secure ใน production และ host-only cookie (ไม่ตั้ง Domain กว้าง) เพื่อให้ย้ายโครงสร้างโดยไม่บังคับเปลี่ยน session format/JWT secret พร้อมกัน

Bearer คงไว้เฉพาะ compatibility/API clients ที่มี consumer จริงผ่าน resolver เดียว ไม่ทำมาตรฐาน auth แยกตาม endpoint family:

1. ถ้ามี Authorization ให้ validate header/token นั้น; malformed/expired ห้าม fallback ไป cookie
2. ถ้าไม่มี Authorization ให้ตรวจ session cookie
3. สร้าง `AuthenticatedPrincipal` รูปแบบเดียว เช่น userId และ credential source
4. service รับ principal/userId ที่ผ่านการตรวจแล้ว ไม่รับ token/cookie หรือ NextRequest

การ unify คือ **หนึ่ง verification policy + หนึ่ง principal + browser transport ที่ชัดเจน** ไม่จำเป็นต้องลบ Bearer ทันทีเพื่อให้เหลือ credential format เดียว เมื่อสำรวจแล้วไม่มี external consumer จึงค่อยเสนอเลิก support ใน change แยก

### 5.2 จุดที่ implementation ปัจจุบันยังต้องแก้

- Legacy categories/transaction ยัง Bearer-only แม้ login ตั้ง cookie
- `shared/middleware/versioned.ts` ทำ auth/Origin เฉพาะ v1 และแปลง cookie เป็น synthetic Authorization เพื่อเรียก legacy controller ทำให้ verify ซ้ำ
- Legacy login/register/logout ไม่ได้ใช้ Origin guard ชุดเดียวกับ v1
- v1 ปัจจุบันยอมรับ public login ที่ไม่มี cookie และไม่มี Origin ซึ่งต้องตัดสิน policy browser-auth ให้ชัดก่อนนำไปใช้จริง

แก้เป็น reusable route pipeline แยกจาก envelope version; legacy กับ v1 ใช้ guard เดียว แล้วต่างเฉพาะ schema/DTO/status mapping การเพิ่ม cookie ให้ legacy และบังคับ Origin บน browser-auth เป็น **auth behavior change ที่ระบุชัด** ไม่อ้างว่าทุก contract ไม่เปลี่ยนเลย

### 5.3 CSRF/Origin policy

- GET/HEAD ไม่เปลี่ยนข้อมูล; POST/PUT/PATCH/DELETE ที่ใช้ cookie ต้องผ่าน trusted Origin check ก่อนเข้า service
- login/register/logout ใช้ browser-auth policy ตรวจ Origin ด้วย แม้ยังไม่มี session เพื่อป้องกัน login/logout CSRF; curl/integration tests ส่ง Origin ที่กำหนด ไม่ exempt เพียงเพราะ “ยังไม่มี cookie”
- Reject Origin ที่หายไป, `null`, malformed หรือไม่ตรง trusted origin สำหรับ flow เหล่านี้; เทียบ scheme + hostname + port แบบ exact หลัง parse URL
- Browser JSON mutations ต้องเป็น application/json ตาม contract; SameSite และ Fetch Metadata เป็น defense-in-depth ไม่ใช่เหตุผลตัด Origin check
- Bearer-only API mutations ที่ verify สำเร็จอาจไม่ต้องใช้ CSRF guard เพราะไม่ได้อาศัย ambient cookie; ไม่ยกเว้นเพียงเห็น Authorization header โดยยังไม่ตรวจ credential
- รองรับ client ที่ส่ง Origin ไม่ได้ด้วย explicit CSRF-token flow หากมี use case จริง; ไม่ fallback อนุญาต silently
- Route Handlers ต้องมี guard เอง อย่าเหมารวมว่า protection ของ Server Actions ครอบคลุมทุก `route.ts`
- ทดสอบ cookie-only, Bearer-only, ทั้งสองพร้อมกัน, invalid Bearer + valid cookie, missing/foreign/null Origin และ auth endpoints ทั้ง legacy/v1

### 5.4 Preview trusted origins

Production ใช้ configured canonical origin(s); local ใช้ localhost origin(s) ที่กำหนด; preview ใช้ origin ของ deployment/branch alias ที่ platform metadata และ configuration ยืนยันว่าเป็นของ deployment นี้ ไม่ใช้ wildcard `*.vercel.app` หรือ request Host/Forwarded header ที่ยังไม่ตรวจเป็นแหล่งความเชื่อถือ

ไม่ใส่ production origin ใน preview allowlist โดยอัตโนมัติ และไม่ยอมให้ preview A ส่ง cookie writes ไป preview B หากไม่มีเหตุผลชัดเจน ใช้ URL แบบ relative ใน browser; system env variablesใช้เพื่อกำหนด trusted deployment originsตาม documented availability และ deployment-protection mode ต้องทดลอง deployment/branch/custom-domain aliases จริง [Vercel system variables](https://vercel.com/docs/environment-variables/system-environment-variables)

## 6. Vercel และ database deployment

- Project root = repository root, framework Next.js, `npm ci`, `npm run build`; ไม่ต้อง workspace contracts build/watch หรือ backend URL rewrite
- ใช้ native Vercel runtime; `npm start` เป็น local production rehearsal ไม่ใช่ long-running process ที่ต้องเปิดเองบน Vercel
- คง MongoDB replica set สำหรับ atomic writes; production ใช้ Atlas หรือ MongoDB hosting ที่รองรับ transaction ตามแผน ไม่รัน MongoDB ใน application function/container
- แยก Preview/Production database users, databases และ secrets; preview ห้ามชี้ production data โดยปริยาย
- Cache connection promise ภายในแต่ละ warm instance, reset หลัง failure, จำกัด pool ให้เหมาะกับจำนวน function instances และวาง region ใกล้ database; cache ไม่ใช่ singleton ทั่ว deployment
- Atlas network access ยังเป็นโจทย์แม้เหลือแอปเดียว: Atlas ตรวจ IP access list และ Vercel มี Static IPs สำหรับ Pro/Enterprise; เลือก egress strategy ตาม plan/budget จริงก่อน production ถ้าไม่มี stable egress อย่าเสนอ `0.0.0.0/0` ว่าเป็น default ที่เทียบเท่า restricted access [Atlas access list](https://www.mongodb.com/docs/atlas/security/ip-access-list/), [Vercel Static IPs](https://vercel.com/changelog/static-ips-are-now-available-for-more-secure-connectivity)
- API ยังเป็น public HTTP surface ต้อง authentication, owner isolation และ authorization ของตัวเอง; CORS/rewrite ไม่ได้ทำให้ endpoint private และ Vercel Deployment Protection เป็นคนละชั้นกับ app auth [Deployment Protection](https://vercel.com/docs/deployment-protection)
- ตรวจ packaged Swagger assets, filesystem paths ของ runtime assets, function duration และ connection handling บน preview จริง ไม่ใช้ local build เป็นหลักฐานแทน Vercel deployment

## 7. งานที่เก็บไว้ / ย้าย / ตัดออกจาก working tree ปัจจุบัน

| ปัจจุบัน | การเปลี่ยนตามแผนใหม่ |
| --- | --- |
| `frontend/src`, `frontend/public` | ย้าย UI/features/components/mock assets กลับ root `src/`, `public/`; pages เป็นตัวประกอบ feature |
| `backend/src/app/api` | รวมเข้า root `src/app/api` โดยรักษา legacy/v1 URLs |
| backend modules/shared/db | ย้ายเข้า `src/server`, จัด DI boundaries ให้ครบ; อย่าย้อนกลับไป route ก้อนใหญ่ |
| `packages/contracts/src` | ย้ายเข้า `src/shared/contracts`; เปลี่ยน imports โดยไม่เปลี่ยน schema และไม่ต้อง dist build |
| transaction services / UnitOfWork / tests | เก็บ atomicity, owner isolation, rollback/concurrency coverage; ไม่ใส่ balance hooks กลับ |
| OpenAPI / Swagger / generators | เก็บ 9 operations ต่อ version, DTO/schema mapping, validation/drift checks; แก้ paths และ runtime asset packaging |
| two app manifests/configs/aliases | รวม root package.json/config/lockfile; deduplicate dependencies; build/test/dev commands ชุดเดียว |
| `BACKEND_URL`, proxy rewrites, two-process runner | ถอนหลังยืนยันว่า browser/API อยู่แอปเดียว |
| frontend/backend dev Dockerfiles | ถอนถ้าไม่มี consumer; dev composeเหลือเฉพาะ MongoDB replica set |
| auth helpers / synthetic cookie→Bearer adapter | แทนด้วย principal resolver + policy เดียวก่อน legacy/v1 adapters |
| README, codebase.md/html, AGENT.md, CLAUDE.md, env, CI/Husky | อัปเดตพร้อม implementation และตรวจคำสั่งจาก clean checkout |

ไม่ใช้ `git reset --hard` หรือทิ้ง diff ทั้งหมด เพราะงาน services/tests/atomicity ที่ทำแล้วมีคุณค่า เก็บ mapping และตรวจย้ายเป็นส่วน ๆ ไม่รัน Decimal128 migration ไม่เปลี่ยน DB schema/IDs หรือ major dependency versions

## 8. ลำดับ implementation ใหม่

1. **บันทึก baseline working tree**: inventory ไฟล์/คำสั่ง/tests ที่มีจริง ระบุ known failures และสิ่งที่ยังไม่ได้ตรวจ; อย่าอ้างผลเก่าเป็นผลของ layout ใหม่
2. **รวม deployment unit**: root Next.js app, schemas แบบ shared source, dependencies/config/tests/CI ชุดเดียว; ยืนยัน UI routes และ legacy/v1 routes ยังอยู่ครบ
3. **เก็บ layer boundaries**: server-only production entry, import restrictions, module services/repositories/ports/DI; class ต่อ action เฉพาะ use case จริง
4. **Unify auth/CSRF**: resolver เดียว, cookie หลัก, Bearer compatibility ที่ระบุ, guards ครบ legacy/v1/browser-auth; ทดสอบ endpoint matrix ก่อนเชื่อม UI
5. **Auth integration ขั้นต่ำ**: เชื่อม login/register/logout ที่ตอนนี้ยังจำลอง ให้พิสูจน์ register → login → protected mutation → logout ได้; แยกงานนี้ชัดเจนจาก UI feature completion ไม่เพิ่ม list/report/wallet CRUD โดยอัตโนมัติ
6. **Docs/tooling**: regenerate OpenAPI/ERD/HTML, แก้ README/agent notes/manifests/env/Husky และลบ split-only config หลังตรวจไม่มี consumer
7. **ตรวจรับ local แล้ว preview**: clean install, lint/type-check/tests/build, production start, browser smoke; preview deploy เมื่อได้รับมอบหมายและมี Vercel/Atlas configuration ที่จำเป็น

## 9. Acceptance และสิ่งที่ยังต้องยืนยัน

- แอปเดียว root commands ใช้ได้; ไม่มี build-order ระหว่าง workspaces, cross-project API proxy หรือ server dependencies หลุด client bundle
- Auth verification และ principal เดียวสำหรับ legacy/v1; cookie login ใช้ protected API ได้จริง; invalid Authorization ไม่ fallback
- Origin/CSRF tests ผ่านทุก mutation family รวม login/register/logout; preview origin isolation และ cookie attributes ถูกต้อง
- Legacy response/status regressions ผ่าน ยกเว้น auth policy changes ที่ระบุและมี tests; v1 schema/envelope และ Swagger สอดคล้อง
- Create/update/delete ปรับ balance ครั้งเดียว, rollback และ concurrent writes ผ่าน, category cascade ไม่เปลี่ยน balance
- Docs/HTML/manifests/agent notesตรงโค้ดที่รวมแล้ว; OpenAPI/ERD generators ไม่ต้อง database/secrets
- Local proof กับ Vercel proofรายงานแยก: preview aliases/protection, Atlas connectivity/network policy และ packaged Swagger assets ต้องตรวจบน platform จริง

ข้อเสนอให้เลือกตอน implement: cookie เป็น browser default, Bearer compatibility ผ่าน resolver เดียว, native Next.js deployment, Atlas/managed replica set, local Dockerเฉพาะ database ส่วน account plan/egress network และ preview/prod database credentials ต้องใช้ configuration จริงก่อน deploy ไม่จำเป็นต้องซื้อหรือเปิดบริการใดในงานทบทวนแผนนี้
