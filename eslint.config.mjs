import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  { files: ['src/features/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}', 'src/lib/**/*.{ts,tsx}', 'src/types/**/*.{ts,tsx}', 'src/shared/contracts/**/*.{ts,tsx}'], rules: {
    'no-restricted-imports': ['error', { patterns: [{ group: ['@/server', '@/server/**', '**/server/**'], message: 'Client/shared code must not import server implementation.' }] }],
  } },
  { files: ['src/shared/contracts/**/*.{ts,tsx}'], rules: {
    'no-restricted-imports': ['error', { patterns: [{ group: ['@/server/**', '**/server/**', '@/features/**', '@/components/**', 'next/*', 'mongoose', 'bcrypt', 'jsonwebtoken'], message: 'Contracts must remain browser-safe and independent of UI/server frameworks.' }] }],
  } },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Plain Node CommonJS scripts, not part of the app bundle.
    "infra-dev/scripts/check-commit-msg.js",
  ]),
]);

export default eslintConfig;
