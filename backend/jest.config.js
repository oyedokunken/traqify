/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],
  globalSetup: "<rootDir>/tests/global-setup.ts",
  setupFiles: ["<rootDir>/tests/setup-env.ts"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  // All suites share one database, so files must run serially.
  maxWorkers: 1,
  collectCoverageFrom: ["src/**/*.ts", "!src/index.ts", "!src/config/load-env.ts"],
  coverageDirectory: "coverage",
};
