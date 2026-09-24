import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __dirname = dirname(fileURLToPath(import.meta.url));

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // "next/typescript" is intentionally omitted for now: its type-aware
  // rules depend on typescript-eslint, which does not yet support
  // TypeScript 7.0 (this project's pinned version) - see the tracking
  // issue linked in typescript-eslint's own runtime error. Re-add it once
  // that support lands, or if the project deliberately moves to a 6.x
  // TypeScript line - do not silently change the TypeScript version to
  // work around this.
  ...compat.extends("next/core-web-vitals"),
  {
    ignores: [".next/**", "node_modules/**", "test-results/**", "playwright-report/**"],
  },
];

export default eslintConfig;
