/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',

  // Use babel-jest with our dedicated babel config to transform TS → CJS
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': ['babel-jest', { configFile: './babel.config.jest.js' }],
  },

  // Resolve @/ path alias to ./src/
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Only pick up test files matching this pattern (avoid vitest files in other dirs)
  testMatch: [
    '**/src/app/api/transaction/__tests__/**/*.test.ts',
  ],

  // Coverage settings — produces the table the user expects
  collectCoverageFrom: [
    'src/app/api/transaction/route.ts',
  ],
  coverageReporters: ['text'],
  coverageThreshold: {
    global: {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
  },
};
