import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Next 16 ships `eslint-config-next` as native flat config, so it can be spread
 * directly into the ESLint 9 config instead of going through `FlatCompat`
 * (which no longer understands the package's flat exports).
 *
 * The packages use `@repo/config`'s stricter preset instead; only the app needs
 * the Next-specific rules, including the react-hooks rules that matter for the
 * council and bench islands.
 */
const eslintConfig = [
  ...nextVitals,
  ...nextTs,
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
