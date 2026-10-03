import { z } from 'zod';
import { legacyTransactionInput, legacyTransactionUpdate, categoryInput, categoryUpdate, categoryResponse, walletSavingUpdate, walletSavingResponse, transactionInput, transactionUpdate, transactionResponse, loginSchema, registerSchema, apiError } from '@/shared/contracts';
const schema = (value: z.ZodType): Record<string, unknown> => {
  const result = z.toJSONSchema(value, { unrepresentable: 'any' });
  delete result.$schema; return result;
};
/** z.toJSONSchema drops refinements; restate the saving rule (goalAmount > 0 when isSaving is true) so the spec matches the handler. */
const requestSchema = (action: string, input: z.ZodType) => action === 'updateWalletSaving'
  ? { ...schema(input), if: { properties: { isSaving: { const: true } }, required: ['isSaving'] }, then: { required: ['goalAmount'], properties: { goalAmount: { exclusiveMinimum: 0 } } } }
  : schema(input);
const obj = (properties: Record<string, unknown>, required = Object.keys(properties)) => ({ type: 'object', properties, required });
const publicUser = obj({ id: { type: 'string' }, email: { type: 'string', format: 'email' }, dataPrivacyConsent: { const: true }, createdAt: { type: 'string', format: 'date-time' } });
const loginUser = obj({ id: { type: 'string' }, email: { type: 'string', format: 'email' } });
const legacyCategory = obj({ _id: { type: 'string' }, userId: { type: 'string' }, name: { type: 'string' }, type: { enum: ['income', 'expense'] }, isSystem: { type: 'boolean' }, createdAt: { type: 'string' }, updatedAt: { type: 'string' }, color: { type: 'string' }, icon: { type: 'string' }, __v: { type: 'integer' } }, ['_id', 'userId', 'name', 'type', 'isSystem', 'createdAt', 'updatedAt']);

const legacyTxResponse = obj({ id: { type: 'string' }, wallet_id: { type: 'string' }, category_id: { type: ['string', 'null'] }, type: { enum: ['income', 'expense'] }, amount: { type: 'number' }, date: { type: 'string', format: 'date' }, note: { type: 'string' } }, ['id', 'wallet_id', 'category_id', 'type', 'amount', 'date']);
export const operations = [
  { action: 'register', method: 'post', path: '/auth/register', status: 201, errors: [400, 409, 500], public: true, description: 'Create a user with explicit privacy consent. confirmPassword must match password; password is limited to 72 UTF-8 bytes. Never returns passwordHash.' },
  { action: 'login', method: 'post', path: '/auth/login', status: 200, errors: [400, 401, 500], public: true, description: 'Set HttpOnly session_token for seven days. Missing user and wrong password produce the same credentials error. Password is limited to 72 UTF-8 bytes.' },
  { action: 'logout', method: 'post', path: '/auth/logout', status: 200, errors: [], public: true, description: 'Clear the cookie. Idempotent. Does not revoke previously issued JWTs.' },
  { action: 'createCategory', method: 'post', path: '/categories', status: 201, errors: [400, 401, 409, 500], description: 'Create an owned custom category. Names are trimmed; duplicates conflict.' },
  { action: 'updateCategory', method: 'put', path: '/categories/{id}', status: 200, errors: [400, 401, 403, 404, 409, 500], description: 'Partial update of an owned non-system category.' },
  { action: 'deleteCategory', method: 'delete', path: '/categories/{id}', status: 200, errors: [400, 401, 403, 404, 500], description: 'Delete an owned non-system category and clear category references atomically. Transactions and wallet balances remain unchanged.' },
  { action: 'createTransaction', method: 'post', path: '/transaction', status: 201, errors: [400, 401, 404, 422, 500], description: 'Create an owned transaction and adjust wallet balance in one MongoDB transaction. Requires a replica set. Category must belong to the user and match the transaction type. Persisted minimum amount is 0.01.' },
  { action: 'updateTransaction', method: 'put', path: '/transaction/{id}', status: 200, errors: [400, 401, 404, 422, 500], description: 'Replace editable fields of an owned transaction; reverse old and apply new balance atomically. wallet cannot be changed by this API.' },
  { action: 'deleteTransaction', method: 'delete', path: '/transaction/{id}', status: 204, errors: [400, 401, 404, 422, 500], description: 'Delete an owned transaction and reverse its balance atomically. Legacy success has no body.' },
  { action: 'updateWalletSaving', method: 'patch', path: '/wallets/{id}/saving', status: 200, errors: [400, 401, 404, 500], v1Only: true, description: 'Turn Saving Wallet on or off for an owned wallet. Saving on requires goalAmount greater than 0; saving off clears the goal. The balance is never changed.' },
] as const;
export const operationsFor = (version: 'legacy' | 'v1') => operations.filter(operation => version === 'v1' || !('v1Only' in operation));
export function buildSpec(version: 'legacy' | 'v1') {
  const v1 = version === 'v1';
  const paths: Record<string, Record<string, unknown>> = {};
  for (const operation of operationsFor(version)) {
    const { action, method } = operation;
    const path = (v1 ? '/api/v1' : '/api') + (v1 ? operation.path.replace('/transaction', '/transactions') : operation.path);
    const input = action === 'register' ? registerSchema : action === 'login' ? loginSchema : action === 'createCategory' ? categoryInput : action === 'updateCategory' ? categoryUpdate : action === 'updateWalletSaving' ? walletSavingUpdate : action === 'createTransaction' ? (v1 ? transactionInput : legacyTransactionInput) : action === 'updateTransaction' ? (v1 ? transactionUpdate : legacyTransactionUpdate) : undefined;
    const data = action === 'register' ? obj({ user: publicUser }) : action === 'login' ? obj({ user: loginUser }) : action === 'logout' ? obj({ success: { const: true } }) : action === 'updateWalletSaving' ? schema(walletSavingResponse) : action.includes('Category') ? (v1 ? schema(categoryResponse) : legacyCategory) : action === 'deleteTransaction' ? { type: 'null' } : (v1 ? schema(transactionResponse) : legacyTxResponse);
    const success = v1 ? obj({ status: { const: true }, data }) : action.includes('Category') || action.includes('Transaction') ? obj({ data }) : data;
    const error = v1 ? obj({ status: { const: false }, error: schema(apiError), timestamp: { type: 'string', format: 'date-time' }, path: { type: 'string' } }) : obj({ error: schema(apiError) });
    const status = v1 && operation.status === 204 ? 200 : operation.status;
    const responses: Record<string, unknown> = { [status]: { description: 'Success', ...(status === 204 ? {} : { content: { 'application/json': { schema: success } } }) } };
    const errors = new Set<number>(operation.errors.map(value => v1 && value === 422 ? 400 : value));
    errors.add(403); errors.add(415);
    if (v1) errors.add(500);
    for (const code of errors) responses[code] = { description: ({ 400: 'Invalid JSON, fields, ID, or missing consent', 401: 'Missing, invalid, or expired credentials', 403: 'System category or untrusted/missing Origin for cookie writes', 404: 'Not found or not owned', 409: 'Duplicate email/category name', 415: 'Body-bearing cookie/browser-auth mutation requires application/json', 422: 'Invalid transaction fields, ID, or category', 500: 'Internal server error' } as Record<number, string>)[code], content: { 'application/json': { schema: error } } };
    const id = '507f1f77bcf86cd799439011';
    const transactionExample = v1 ? { walletId: id, categoryId: null, type: 'expense', amount: 42, date: '2026-09-27', note: 'Lunch' } : { wallet_id: id, category_id: null, type: 'Expense', amount: 42, date: '2026-09-27', note: 'Lunch' };
    const example: Record<string, unknown> = action === 'register' ? { email: 'test@example.com', password: 'Password1', confirmPassword: 'Password1', dataPrivacyConsent: true } : action === 'login' ? { email: 'test@example.com', password: 'Password1' } : action === 'updateWalletSaving' ? { isSaving: true, goalAmount: 10000 } : action.includes('Category') ? { name: 'Food', type: 'expense', color: '#FF8800' } : transactionExample;
    if (action === 'updateTransaction') { delete example.walletId; delete example.wallet_id; }
    const publicOperation = 'public' in operation;
    paths[path] ??= {};
    paths[path][method] = { operationId: `${version}_${action}`, tags: [operation.path.split('/')[1]], summary: action, description: operation.description + (v1 ? ' Authorization takes precedence over cookie. Cookie writes require an Origin in PUBLIC_ORIGINS; missing Origin is rejected. Implemented.' : ' Legacy response contract; auth is unified with v1. Cookie writes and login/register/logout require an exact trusted Origin; no Origin is rejected. A valid Bearer on protected APIs does not fall back to cookies.'), security: publicOperation ? [] : [{ bearerAuth: [] }, { sessionCookie: [] }], ...(path.includes('{id}') ? { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' } }] } : {}), ...(input ? { requestBody: { required: true, content: { 'application/json': { schema: requestSchema(action, input), example } } } } : {}), responses };
  }
  return { openapi: '3.1.0', info: { title: `FinLover ${version} API`, version: '1.0.0', description: 'Implemented operations only. GET lists, reports, wallet reads and current-user endpoints are not implemented. UI mock screens are not API integration.' }, servers: [{ url: '/' }], paths, components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, sessionCookie: { type: 'apiKey', in: 'cookie', name: 'session_token' } } } };
}
