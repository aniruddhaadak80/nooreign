import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Next 15 still ships `eslint-config-next` in the legacy eslintrc shape
 * (`{ extends: [...] }`), and `next lint` is deprecated in favour of the plain
 * ESLint CLI. `FlatCompat` is the supported bridge: it lets the app keep
 * Next's rule set — including the react-hooks rules that matter for the council
 * and bench islands — inside a flat config that ESLint 9 can run directly.
 *
 * The packages use `@repo/config`'s stricter preset instead; only the app needs
 * the Next-specific rules.
 */
const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "tests/e2e/**",
      "node_modules/**",
    ],
  },
  {
    rules: {
      // The product is data-dense and the data tables are the point; a fixed
      // line length generates more noise than it prevents here.
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
];

export default eslintConfig;
