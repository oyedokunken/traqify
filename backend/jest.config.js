/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],
  globalSetup: "<rootDir>/tests/global-setup.ts",
  setupFiles: ["<rootDir>/tests/setup-env.ts"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  // Requests hit a real database, and slower machines (CI runners, containers) need headroom over the 5s default.
  testTimeout: 30000,
  // All suites share one database, so files must run serially.
  maxWorkers: 1,
  collectCoverageFrom: ["src/**/*.ts", "!src/index.ts", "!src/config/load-env.ts"],
  coverageDirectory: "coverage",
};
