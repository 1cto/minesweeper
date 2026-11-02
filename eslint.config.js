import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "dist-e2e", "playwright-report", "test-results"] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
  {
    files: ["*.{js,ts}", "e2e/**/*.ts", "scripts/**/*.mjs"],
    languageOptions: { globals: globals.node },
  },
  prettier,
  {
    // Prettier wraps code at 100 columns but leaves comments as they are, so this holds comments
    // to the same width. Code lines are Prettier's to judge.
    rules: { "max-len": ["error", { code: Infinity, comments: 100, ignoreUrls: true }] },
  },
);
