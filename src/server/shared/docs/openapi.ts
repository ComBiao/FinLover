import { z } from 'zod';
import {
  legacyTransactionInput,
  legacyTransactionUpdate,
  categoryInput,
  categoryUpdate,
  categoryResponse,
  transactionInput,
  transactionUpdate,
  transactionResponse,
  walletCreateInput,
  walletInvitationInput,
  walletInvitationResponse,
  walletMemberResponse,
  walletMembersResponse,
  transferOwnershipInput,
  sharedWalletResponse,
  sharedTransactionResponse,
  myInvitationsResponse,
  walletUpdate,
  walletResponse,
  walletSavingUpdate,
  homeSummaryResponse,
  transactionSummaryResponse,
  loginSchema,
  registerSchema,
  apiError,
  schedulerInput,
  schedulerResponse,
  schedulerStatusInput,
} from '@/shared/contracts';

const schema = (value: z.ZodType): Record<string, unknown> => {
  const result = z.toJSONSchema(value, { unrepresentable: 'any' });
  delete result.$schema;
  return result;
};
const inputSchema = (value: z.ZodType) => ({ ...schema(value), additionalProperties: true });
const walletSavingConstraint = {
  if: { properties: { isSaving: { const: true } }, required: ['isSaving'] },
  then: { required: ['goalAmount'], properties: { goalAmount: { exclusiveMinimum: 0 } } },
};
/** z.toJSONSchema drops refinements; operation metadata can restate constraints that the generated schema cannot express. */
const requestSchema = (value: z.ZodType, constraint?: Record<string, unknown>) => ({
  ...inputSchema(value),
  ...constraint,
});
const obj = (properties: Record<string, unknown>, required = Object.keys(properties)) => ({ type: 'object', properties, required });
const publicUser = obj({ id: { type: 'string' }, email: { type: 'string', format: 'email' }, name: { type: 'string' }, dataPrivacyConsent: { const: true }, createdAt: { type: 'string', format: 'date-time' } }, ['id', 'email', 'dataPrivacyConsent', 'createdAt']);
const loginUser = obj({ id: { type: 'string' }, email: { type: 'string', format: 'email' } });
const currentUser = obj({ id: { type: 'string' }, email: { type: 'string', format: 'email' }, name: { type: 'string' } }, ['id', 'email']);
const legacyCategory = obj({ _id: { type: 'string' }, userId: { type: 'string' }, name: { type: 'string' }, type: { enum: ['income', 'expense'] }, isSystem: { type: 'boolean' }, createdAt: { type: 'string' }, updatedAt: { type: 'string' }, color: { type: 'string' }, icon: { type: 'string' }, __v: { type: 'integer' } }, ['_id', 'userId', 'name', 'type', 'isSystem', 'createdAt', 'updatedAt']);
const legacyTxResponse = obj({ id: { type: 'string' }, wallet_id: { type: 'string' }, category_id: { type: ['string', 'null'] }, type: { enum: ['income', 'expense'] }, amount: { type: 'number' }, date: { type: 'string', format: 'date' }, title: { type: 'string' }, note: { type: 'string' } }, ['id', 'wallet_id', 'category_id', 'type', 'amount', 'date', 'title']);

const schedulerExample = { walletId: '507f1f77bcf86cd799439011', categoryId: '507f1f77bcf86cd799439012', type: 'expense', amount: 179, title: 'YouTube Premium', note: 'Family plan', startDate: '2026-11-05', frequency: 'monthly', interval: 1, end: { type: 'span', value: 12, unit: 'months' } };
const schedulerResponseExample = { id: '507f1f77bcf86cd799439013', walletId: '507f1f77bcf86cd799439011', categoryId: '507f1f77bcf86cd799439012', type: 'expense', amount: 179, title: 'YouTube Premium', note: 'Family plan', startDate: '2026-11-05', frequency: 'monthly', interval: 1, end: { type: 'endDate', endDate: '2027-11-05' }, status: 'active', createdCount: 0, nextDueDate: '2026-11-05', canManage: true };
const schedulerRules = ' Due dates are calendar dates in Asia/Bangkok, posted by a daily job at 00:00 Bangkok time (17:00 UTC). Only the Creator can read or change a scheduler.';

export const operations = [
  { action: 'listWalletMembers', method: 'get', path: '/wallets/{id}/members', status: 200, errors: [400, 401, 403, 404, 409, 500], versions: ['v1'], description: 'Owner and accepted Contributors can read Owner, accepted members and pending invitations (userId/name/email/role/status). Pending invitees cannot access members. Read-only snapshot.' },
  { action: 'removeWalletMember', method: 'delete', path: '/wallets/{id}/members/{userId}', status: 200, errors: [400, 401, 403, 404, 409, 500], versions: ['v1'], description: 'Owner removes an accepted Contributor or cancels a pending invitation. Removing Owner gives 409; missing member gives 404. Access is revoked, transactions and balance stay unchanged.' },
  { action: 'leaveWallet', method: 'post', path: '/wallets/{id}/leave', status: 200, errors: [400, 401, 403, 404, 409, 500], versions: ['v1'], description: 'Accepted Contributor leaves at any balance. Owner receives 409: transfer first if Contributors remain, otherwise explicitly delete wallet. Transactions are preserved.' },
  { action: 'transferWalletOwnership', method: 'post', path: '/wallets/{id}/transfer-ownership', status: 200, errors: [400, 401, 403, 404, 409, 500], versions: ['v1'], description: 'Owner transfers atomically to an accepted Contributor. Old Owner becomes accepted Contributor, new Owner has no membership row. Owner/name collision gives 409 with full rollback. Response role is relative to caller (contributor).' },
  { action: 'inviteWalletMember', method: 'post', path: '/wallets/{id}/invitations', status: 201, errors: [400, 401, 403, 404, 409, 500], versions: ['v1'], description: 'Owner invites an existing user to a shared wallet. Normalize email; unknown/self email gives 400 with fields.email User not found/Cannot invite yourself. Duplicate pending or accepted membership gives 409. No email delivery or expiration.' },
  { action: 'listInvitations', method: 'get', path: '/invitations', status: 200, errors: [401, 500], versions: ['v1'], description: 'List caller pending invitations newest first; items and total for the notification badge.' },
  { action: 'acceptInvitation', method: 'post', path: '/invitations/{id}/accept', status: 200, errors: [400, 401, 403, 404, 409, 500], versions: ['v1'], description: 'Invitee accepts atomically. Pending gives no access; accepted membership grants wallet reads. Already accepted gives 409; another invitee gives 403.' },
  { action: 'declineInvitation', method: 'post', path: '/invitations/{id}/decline', status: 200, errors: [400, 401, 403, 404, 409, 500], versions: ['v1'], description: 'Invitee silently deletes a pending invitation. Repeated decline gives 404; accepted invitation gives 409. No request body.' },
  { action: 'register', method: 'post', path: '/auth/register', status: 201, errors: [400, 409, 500], public: true, description: 'Create a user with explicit privacy consent. confirmPassword must match password; password is limited to 72 UTF-8 bytes. Never returns passwordHash.' },
  { action: 'login', method: 'post', path: '/auth/login', status: 200, errors: [400, 401, 500], public: true, description: 'Set HttpOnly session_token for seven days. Missing user and wrong password produce the same credentials error. Password is limited to 72 UTF-8 bytes.' },
  { action: 'logout', method: 'post', path: '/auth/logout', status: 200, errors: [], public: true, description: 'Clear the cookie. Idempotent. Does not revoke previously issued JWTs.' },
  { action: 'getCurrentUser', method: 'get', path: '/auth/me', status: 200, errors: [401, 404, 500], versions: ['v1'], description: 'Return the authenticated user (id, email and optional display name). Never returns passwordHash.' },
  { action: 'lookupUser', method: 'get', path: '/users/lookup', status: 200, errors: [400, 401, 500], versions: ['v1'], description: 'Check whether a user exists by email for wallet invitations. Unknown email produces 400 with fields.email User not found; self email produces 400 with Cannot invite yourself.' },
  { action: 'deleteAccount', method: 'delete', path: '/auth/delete-account', status: 200, errors: [401, 404, 409, 500], v1Only: true, cookieOnly: true, description: 'Permanently delete the authenticated user and cascade-delete their wallets, categories and transactions atomically. Owners with accepted Contributors must transfer ownership first (409); pending invitations are cleaned up. Session cookie only: any Authorization header, valid or not, is rejected with 401. No password re-authentication. Clears the session cookie, including when the account is already gone (404).'},
  { action: 'listCategories', method: 'get', path: '/categories', status: 200, errors: [400, 401, 500], versions: ['v1'], description: "List the authenticated user's categories (the system defaults seeded at registration plus custom ones), oldest first, optionally narrowed by type." },
  { action: 'createCategory', method: 'post', path: '/categories', status: 201, errors: [400, 401, 409, 500], description: 'Create an owned custom category. Names are trimmed; duplicates conflict.' },
  { action: 'updateCategory', method: 'put', path: '/categories/{id}', status: 200, errors: [400, 401, 403, 404, 409, 500], description: 'Partial update of an owned non-system category.' },
  { action: 'deleteCategory', method: 'delete', path: '/categories/{id}', status: 200, errors: [400, 401, 403, 404, 500], description: 'Delete an owned non-system category and clear category references atomically. Transactions and wallet balances remain unchanged.' },
  { action: 'createWallet', method: 'post', path: '/wallets', status: 201, errors: [400, 401, 403, 409, 415, 500], versions: ['v1'], description: 'Create a wallet owned by the caller. Names are trimmed and unique per owner; unknown fields are stripped. There is no per-user wallet limit. isShared defaults to false; shared wallets start at zero and the caller is Owner. Shared saving wallets are supported; isShared cannot be changed later.' },
  { action: 'listWallets', method: 'get', path: '/wallets', status: 200, errors: [401, 500], versions: ['v1'], description: "List owned wallets and accepted shared wallets, with the default wallet first. Pending invitations do not grant access. Includes isShared, role, memberCount (Owner plus accepted), up to 3 membersPreview entries and ownerName." },
  { action: 'getWallet', method: 'get', path: '/wallets/{id}', status: 200, errors: [400, 401, 403, 404, 500], versions: ['v1'], description: "Get an accessible wallet by ID. Invalid IDs return 400; missing or foreign personal wallets return 404; inaccessible shared wallets return 403." },
  { action: 'updateWallet', method: 'put', path: '/wallets/{id}', status: 200, errors: [400, 401, 404, 409, 500], versions: ['v1'], description: 'Partially update an owned wallet name or color. Balance, owner, and saving settings are not editable here.' },
  { action: 'updateWalletSaving', method: 'patch', path: '/wallets/{id}/saving', status: 200, errors: [400, 401, 404, 500], versions: ['v1'], requestConstraint: walletSavingConstraint, description: 'Turn Saving Wallet on or off for an owned wallet. Saving on requires goalAmount greater than 0; saving off clears the goal. The balance is never changed.' },
  { action: 'listTransactions', method: 'get', path: '/transaction', status: 200, errors: [400, 401, 500], versions: ['v1'], description: 'List all owned transactions for an optional YYYY-MM month, defaulting to the current month in APPLICATION_TIMEZONE, optionally narrowed by a case-insensitive title/note search. Results are newest first; this monthly endpoint intentionally has no pagination.' },
  { action: 'listSharedWalletTransactions', method: 'get', path: '/wallets/{id}/transactions', status: 200, errors: [400, 401, 403, 404, 500], versions: ['v1'], description: 'List shared wallet transactions for an optional YYYY-MM month, defaulting to the current month in APPLICATION_TIMEZONE. Members only; non-members receive 403. Dual attribution (createdBy and editedBy) included; category is omitted.' },
  { action: 'getTransactionSummary', method: 'get', path: '/transaction/summary', status: 200, errors: [400, 401, 403, 404, 409, 500], versions: ['v1'], description: "Total income, total expense and net balance (income minus expense) of the owned personal transactions dated from..to inclusive, narrowed by the same optional wallet, category, type and case-insensitive title/note search filters as the Transactions page. Choosing the seeded Others also counts that type's transactions without a category. Totals are 0 when nothing matches. from after to, or malformed dates or ids return 400; another user's or a missing wallet or category returns 404." },
  { action: 'createTransaction', method: 'post', path: '/transaction', status: 201, errors: [400, 401, 403, 404, 409, 422, 500], description: 'Create a transaction and adjust wallet balance in one MongoDB transaction. Requires a replica set. For personal wallets, category must belong to the user and match the transaction type. Shared wallet transactions do not allow categoryId (400 if provided) and dual attribution is tracked. Outsiders of shared wallets receive 403. Persisted minimum amount is 0.01.' },
  { action: 'updateTransaction', method: 'put', path: '/transaction/{id}', status: 200, errors: [400, 401, 403, 404, 409, 422, 500], description: 'Replace editable fields of a transaction; reverse old and apply new balance atomically. For personal wallets, only the owner can update. For shared wallets, any accepted member can modify any transaction; moving wallets and specifying a category are not allowed.' },
  { action: 'deleteTransaction', method: 'delete', path: '/transaction/{id}', status: 204, errors: [400, 401, 403, 404, 409, 422, 500], description: 'Delete a transaction and reverse its balance atomically. Legacy success has no body. For personal wallets, only the owner can delete. For shared wallets, any accepted member can delete any transaction.' },
  { action: 'deleteWallet', method: 'delete', path: '/wallets/{id}', status: 204, errors: [400, 401, 404, 500], versions: ['v1'], description: 'Delete an owned wallet and all of its transactions atomically in one UnitOfWork; nothing is deleted if any step fails. For shared wallets, only the owner can delete (contributors receive 403) and all transactions across all authors are removed. Other wallets and their transactions are untouched. Any owned wallet may be deleted, including the default or last wallet. Data cannot be recovered.' },
  { action: 'listSchedulers', method: 'get', path: '/schedulers', status: 200, errors: [400, 401, 500], versions: ['v1'], description: "List the caller's schedulers, upcoming first (completed and cancelled last), optionally filtered by wallet or status. Each item has canManage, true for the Creator." + schedulerRules },
  { action: 'createScheduler', method: 'post', path: '/schedulers', status: 201, errors: [400, 401, 404, 409, 415, 500], versions: ['v1'], description: 'Create a scheduler that posts a transaction every N days, weeks, months or years (interval up to 365 days, 52 weeks, 60 months or 5 years). End: never, after N transactions (1-1000), on an inclusive endDate, or a span in weeks/months/years that the server converts to endDate (the start period counts as the first, so 5 months is 5 monthly runs). categoryId defaults to the Others category of the type. A start date of today posts the first transaction immediately; a past start date is not back-filled and waits for the next cycle; month-end days clamp (31 Jan, 28 Feb, 31 Mar). Balances may go negative. At most 50 active or paused schedulers per user (409).' + schedulerRules },
  { action: 'getScheduler', method: 'get', path: '/schedulers/{id}', status: 200, errors: [400, 401, 404, 500], versions: ['v1'], description: "Get a scheduler by ID. A missing scheduler, or another user's, returns 404." + schedulerRules },
  { action: 'updateScheduler', method: 'put', path: '/schedulers/{id}', status: 200, errors: [400, 401, 404, 409, 415, 500], versions: ['v1'], description: 'Replace the editable fields. Changes apply to future transactions only; past transactions are untouched. Changing the start date, frequency or interval restarts the next due date from today, and an end condition that is already met completes the scheduler. Completed and cancelled schedulers cannot be edited (409).' + schedulerRules },
  { action: 'setSchedulerStatus', method: 'patch', path: '/schedulers/{id}/status', status: 200, errors: [400, 401, 404, 409, 415, 500], versions: ['v1'], description: 'Pause an active scheduler or resume a paused one. Resuming skips everything missed while paused and continues from the next scheduled date on or after today (or completes it if the end is already met). Any other transition returns 409; cancelled is set only by the system.' + schedulerRules },
  { action: 'deleteScheduler', method: 'delete', path: '/schedulers/{id}', status: 204, errors: [400, 401, 404, 500], versions: ['v1'], description: 'Delete a scheduler in any state. Transactions it already created stay in the ledger.' + schedulerRules },
  { action: 'getHomeSummary', method: 'get', path: '/home/summary', status: 200, errors: [400, 401, 404, 409, 500], versions: ['v1'], description: "Home page figures for an optional YYYY-MM month (defaulting to the current month in APPLICATION_TIMEZONE) and either every owned personal wallet (walletId=all, the default) or one accessible wallet. When a shared wallet is selected, totals reflect all members' transactions and topCategories is empty. totalBalance sums the scoped wallets' current balances; hasWallets reports whether the caller owns any wallet; savingGoal shows the selected wallet's progress (percent floored to 0–100) when it is a saving wallet with a goal, otherwise null, and is always null for walletId=all. income and expense total the scoped transactions dated in that month; net is income minus expense with status surplus, overspending or even. topCategories lists up to three expense categories by amount spent (ties by name); expenses without a category count toward the seeded expense Others. An invalid walletId returns 400; another user's or a missing wallet returns 404; non-member access to a shared wallet returns 403." },
] as const;

export function operationsFor(version: 'legacy' | 'v1') {
  return operations.filter(operation => {
    if ('v1Only' in operation && operation.v1Only) return version === 'v1';
    if ('versions' in operation) return operation.versions.some(value => value === version);
    return true; // Operations without versions restriction appear in both
  });
}

export function buildSpec(version: 'legacy' | 'v1') {
  const v1 = version === 'v1';
  const paths: Record<string, Record<string, unknown>> = {};

  for (const operation of operationsFor(version)) {
    const { action, method } = operation;
    const path = (v1 ? '/api/v1' : '/api') + (v1 ? (operation.path.startsWith('/transaction') ? operation.path.replace('/transaction', '/transactions') : operation.path) : operation.path);
    const schedulerBody = action === 'createScheduler' || action === 'updateScheduler' ? schedulerInput : action === 'setSchedulerStatus' ? schedulerStatusInput : undefined;
    const input = schedulerBody ?? (action === 'transferWalletOwnership' ? transferOwnershipInput
      : action === 'register' ? registerSchema
      : action === 'login' ? loginSchema
        : action === 'createCategory' ? categoryInput
          : action === 'updateCategory' ? categoryUpdate
            : action === 'createTransaction' ? (v1 ? transactionInput : legacyTransactionInput)
              : action === 'updateTransaction' ? (v1 ? transactionUpdate : legacyTransactionUpdate)
                : action === 'createWallet' ? walletCreateInput
                  : action === 'inviteWalletMember' ? walletInvitationInput
                  : action === 'updateWallet' ? walletUpdate
                    : action === 'updateWalletSaving' ? walletSavingUpdate
                    : undefined);
    const schedulerData = action === 'listSchedulers' ? { type: 'array', items: schema(schedulerResponse) }
      : action === 'deleteScheduler' ? { type: 'null' }
        : action.endsWith('Scheduler') || action === 'setSchedulerStatus' ? schema(schedulerResponse) : undefined;
    const data = schedulerData ?? (action === 'listWalletMembers' ? schema(walletMembersResponse)
      : action === 'listSharedWalletTransactions' ? { type: 'array', items: schema(sharedTransactionResponse) }
      : action === 'transferWalletOwnership' ? schema(sharedWalletResponse)
      : action === 'removeWalletMember' || action === 'leaveWallet' ? { type: 'null' }
      : action === 'inviteWalletMember' ? schema(walletInvitationResponse)
      : action === 'listInvitations' ? schema(myInvitationsResponse)
      : action === 'acceptInvitation' ? schema(walletMemberResponse)
      : action === 'declineInvitation' ? { type: 'null' }
      : action === 'register' ? obj({ user: publicUser })
      : action === 'login' ? obj({ user: loginUser })
        : action === 'getCurrentUser' ? obj({ user: currentUser })
        : action === 'lookupUser' ? publicUser
        : action === 'logout' || action === 'deleteAccount' ? obj({ success: { const: true } })
          : action === 'listCategories' ? { type: 'array', items: schema(categoryResponse) }
          : action.includes('Category') ? (v1 ? schema(categoryResponse) : legacyCategory)
            : action === 'deleteTransaction' || action === 'deleteWallet' ? { type: 'null' }
              : action === 'createWallet' || action === 'getWallet' || action === 'updateWallet' || action === 'updateWalletSaving' ? schema(walletResponse)
                : action === 'listWallets' ? { type: 'array', items: schema(walletResponse) }
                  : action === 'listTransactions' ? { type: 'array', items: schema(transactionResponse) }
                    : action === 'getHomeSummary' ? schema(homeSummaryResponse)
                      : action === 'getTransactionSummary' ? schema(transactionSummaryResponse)
                    : (v1 ? schema(transactionResponse) : legacyTxResponse));
    const success = v1 ? obj({ status: { const: true }, data }) : action.includes('Category') || action.includes('Transaction') ? obj({ data }) : data;
    const error = v1 ? obj({ status: { const: false }, error: schema(apiError), timestamp: { type: 'string', format: 'date-time' }, path: { type: 'string' } }) : obj({ error: schema(apiError) });
    const status = v1 && operation.status === 204 ? 200 : operation.status;
    const walletExample = { id: '507f1f77bcf86cd799439011', name: 'Main', balance: 1250.5, isDefault: true, color: '#12AB34', isSaving: false, goalAmount: 0, createdAt: '2026-09-27T12:00:00.000Z', updatedAt: '2026-09-27T12:00:00.000Z' };
    const responseExample = action === 'listWallets' ? { status: true, data: [walletExample] }
      : action === 'getWallet' || action === 'updateWallet' || action === 'updateWalletSaving' ? { status: true, data: walletExample }
      : action === 'lookupUser' ? { status: true, data: { id: '507f1f77bcf86cd799439012', email: 'friend@example.com', name: 'Friend User' } }
        : action === 'getTransactionSummary' ? { status: true, data: { totalIncome: 60300, totalExpense: 7495, netBalance: 52805 } }
        : action === 'listSchedulers' ? { status: true, data: [schedulerResponseExample] }
        : action === 'createScheduler' || action === 'getScheduler' || action === 'updateScheduler' || action === 'setSchedulerStatus' ? { status: true, data: schedulerResponseExample }
        : action === 'getHomeSummary' ? { status: true, data: { month: '2026-10', walletId: 'all', balance: { hasWallets: true, totalBalance: 1250.5, savingGoal: null }, income: 30000, expense: 7495, net: { net: 22505, status: 'surplus' }, topCategories: [{ rank: 1, categoryId: '507f1f77bcf86cd799439012', name: 'Food & Drinks', icon: 'Utensils', color: '#F97316', amount: 4200 }] } }
        : undefined;
    const responses: Record<string, unknown> = { [status]: { description: 'Success', ...(status === 204 ? {} : { content: { 'application/json': { schema: success, ...(responseExample ? { example: responseExample } : {}) } } }) } };
    const errors = new Set<number>(operation.errors.map(value => v1 && value === 422 ? 400 : value));
    if (method !== 'get') { errors.add(403); errors.add(415); }
    if (v1) errors.add(500);
    for (const code of errors) responses[code] = { description: ({ 400: 'Invalid JSON, fields, ID, or missing consent', 401: 'Missing, invalid, or expired credentials', 403: 'Forbidden resource, system category, or untrusted/missing Origin for cookie writes', 404: 'Not found or not owned', 409: v1 ? 'Duplicate email, category, wallet name or membership; state conflict, or scheduler limit reached' : 'Duplicate email or category name', 415: 'Body-bearing cookie/browser-auth mutation requires application/json', 422: 'Invalid transaction fields, ID, or category', 500: 'Internal server error' } as Record<number, string>)[code], content: { 'application/json': { schema: error } } };
    const id = '507f1f77bcf86cd799439011';
    const transactionExample = v1 ? { walletId: id, categoryId: null, type: 'expense', amount: 42, date: '2026-09-27', title: 'Lunch', note: 'Lunch' } : { wallet_id: id, category_id: null, type: 'Expense', amount: 42, date: '2026-09-27', title: 'Lunch', note: 'Lunch' };
    const example: Record<string, unknown> = action === 'createScheduler' || action === 'updateScheduler' ? schedulerExample
      : action === 'setSchedulerStatus' ? { action: 'pause' }
      : action === 'transferWalletOwnership' ? { userId: id }
      : action === 'inviteWalletMember' ? { email: 'friend@example.com' }
      : action === 'register' ? { name: 'Test User', email: 'test@example.com', password: 'Password1', confirmPassword: 'Password1', dataPrivacyConsent: true }
      : action === 'login' ? { email: 'test@example.com', password: 'Password1' }
        : action.includes('Category') ? { name: 'Food', type: 'expense', color: '#FF8800', icon: 'Utensils' }
          : action === 'createWallet' ? { name: 'Holiday fund', color: '#3B82F6', isSaving: true, goalAmount: 1200 }
            : action === 'updateWallet' ? { name: 'Holiday fund', color: '#3B82F6' }
              : action === 'updateWalletSaving' ? { isSaving: true, goalAmount: 10000 }
              : transactionExample;
    const authDescription = v1 ? ` Authorization takes precedence over cookie.${method === 'get' ? ' Cookie-authenticated GETs do not require an Origin.' : ' Cookie writes require an Origin in PUBLIC_ORIGINS; missing Origin is rejected.'} Implemented.` : ' Legacy response contract; auth is unified with v1. Cookie writes and login/register/logout require an exact trusted Origin; no Origin is rejected. A valid Bearer on protected APIs does not fall back to cookies.';
    const publicOperation = 'public' in operation;
    const parameters = [
      ...(path.includes('{userId}') ? [{ name: 'userId', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' } }] : []),
      ...(path.includes('{id}') ? [{ name: 'id', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' } }] : []),
      ...(action === 'listCategories' ? [{ name: 'type', in: 'query', required: false, description: 'Only return categories of this type.', schema: { type: 'string', enum: ['income', 'expense'] }, example: 'expense' }] : []),
      ...(action === 'listTransactions' || action === 'listSharedWalletTransactions' ? [{ name: 'month', in: 'query', required: false, schema: { type: 'string', pattern: '^\\d{4}-(0[1-9]|1[0-2])$' }, example: '2026-10' }] : []),
      ...(action === 'listTransactions' ? [{ name: 'search', in: 'query', required: false, description: 'Case-insensitive text matched against title or note (max 100 characters); combines with month.', schema: { type: 'string', maxLength: 100 }, example: 'lunch' }] : []),
      ...(action === 'getTransactionSummary' ? [
        { name: 'from', in: 'query', required: true, description: 'First day of the range (inclusive).', schema: { type: 'string', format: 'date' }, example: '2026-10-01' },
        { name: 'to', in: 'query', required: true, description: 'Last day of the range (inclusive); must not be before from.', schema: { type: 'string', format: 'date' }, example: '2026-10-31' },
        { name: 'walletId', in: 'query', required: false, schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' } },
        { name: 'categoryId', in: 'query', required: false, schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' } },
        { name: 'type', in: 'query', required: false, schema: { type: 'string', enum: ['income', 'expense'] } },
        { name: 'search', in: 'query', required: false, description: 'Case-insensitive text matched against title or note (max 100 characters).', schema: { type: 'string', maxLength: 100 }, example: 'lunch' },
      ] : []),
      ...(action === 'listSchedulers' ? [
        { name: 'walletId', in: 'query', required: false, schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' } },
        { name: 'status', in: 'query', required: false, schema: { type: 'string', enum: ['active', 'paused', 'completed', 'cancelled'] } },
      ] : []),
      ...(action === 'getHomeSummary' ? [{ name: 'month', in: 'query', required: false, schema: { type: 'string', pattern: '^\\d{4}-(0[1-9]|1[0-2])$' }, example: '2026-10' }, { name: 'walletId', in: 'query', required: false, description: 'all (default) or the id of an owned wallet.', schema: { type: 'string', pattern: '^(all|[a-fA-F0-9]{24})$' }, example: 'all' }] : []),
      ...(action === 'lookupUser' ? [{ name: 'email', in: 'query', required: true, schema: { type: 'string', format: 'email' }, example: 'friend@example.com' }] : []),
    ];
    paths[path] ??= {};
    paths[path][method] = {
      operationId: `${version}_${action}`,
      tags: [operation.path.split('/')[1]],
      summary: action,
      description: operation.description + authDescription,
      security: publicOperation ? [] : 'cookieOnly' in operation && operation.cookieOnly ? [{ sessionCookie: [] }] : [{ bearerAuth: [] }, { sessionCookie: [] }],
      ...(parameters.length ? { parameters } : {}),
      ...(input ? { requestBody: { required: true, content: { 'application/json': { schema: requestSchema(input, 'requestConstraint' in operation ? operation.requestConstraint : undefined), example } } } } : {}),
      responses,
    };
  }

  const walletStatus = v1 ? 'Wallet create, list, detail, update, saving-status and delete operations and scheduler (repeating transaction) operations are available on v1.' : 'The legacy API has no wallet operations.';
  const unimplemented = v1 ? 'Monthly transaction reads, the transaction and home summaries, category lists and the current-user endpoint are available; reports are not implemented.' : 'Wallet endpoints, remaining GET lists, reports and the current-user endpoint are not implemented.';
  return {
    openapi: '3.1.0',
    info: { title: `FinLover ${version} API`, version: '1.0.0', description: `Implemented operations only. ${walletStatus} ${unimplemented} UI mock screens are not API integration.` },
    servers: [{ url: '/' }],
    paths,
    components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, sessionCookie: { type: 'apiKey', in: 'cookie', name: 'session_token' } } },
  };
}
