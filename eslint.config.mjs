import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Strict project rules — see AINSTRUCTIONS.md. Type-aware rules require the
  // TypeScript project service, enabled below.
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // 2 & 3: `any` is banned everywhere.
      "@typescript-eslint/no-explicit-any": "error",
      // 3: no @ts-ignore / @ts-expect-error / @ts-nocheck.
      "@typescript-eslint/ban-ts-comment": "error",
      // 4: every function must declare an explicit return type.
      "@typescript-eslint/explicit-function-return-type": "error",
      // 5: no floating promises.
      "@typescript-eslint/no-floating-promises": "error",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
