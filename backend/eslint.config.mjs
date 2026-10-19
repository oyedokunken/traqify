import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  { ignores: ["dist/**", "coverage/**", "node_modules/**", "prisma/migrations/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node } },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true }],
      // Raised to "error" in the hygiene phase, once the existing casts are removed.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    files: ["**/*.js", "**/*.cjs"],
    languageOptions: { globals: { ...globals.node, module: "writable" } },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    files: ["tests/**/*.ts"],
    languageOptions: { globals: { ...globals.jest } },
  }
);
