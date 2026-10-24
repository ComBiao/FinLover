import { defineConfig } from 'vitest/config';
import path from 'node:path';
export default defineConfig({
  test: { exclude: ['**/node_modules/**', 'tests/e2e/**'], environment: 'node', setupFiles: ['./src/test/setup.ts'], globals: true, env: { JWT_SECRET: 'test-secret-key-for-vitest', PUBLIC_ORIGINS: 'http://localhost,http://localhost:3000', NEXT_PUBLIC_SHARED_WALLET_MOCKS: 'false' } },
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
});
