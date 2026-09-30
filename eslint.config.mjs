import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// The recommended Next.js 16 setup (node_modules/next/dist/docs/01-app/
// 03-api-reference/05-config/03-eslint.md). typescript-eslint loads the
// TypeScript 6 API via the "typescript" alias in package.json; `tsc` itself
// is TypeScript 7 (@typescript/native).
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Allow the deliberate "copy without these fields" destructuring
      // (`const { a: _, ...rest } = x`) and _-prefixed placeholders.
      "@typescript-eslint/no-unused-vars": ["warn", { ignoreRestSiblings: true, argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // React Compiler guidance (eslint-plugin-react-hooks 7). Existing
      // effects that reset or load state trip it; kept visible as a warning
      // while they're converted - docs/TECHNICAL_DEBT.md.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "test-results/**", "playwright-report/**"]),
]);

export default eslintConfig;
