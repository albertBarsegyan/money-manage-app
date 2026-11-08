import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import boundaries from "eslint-plugin-boundaries";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    plugins: { boundaries },
    settings: {
      "boundaries/elements": [
        { type: "app", pattern: "src/app/**" },
        { type: "routes", pattern: "src/routes/**" },
        { type: "page", pattern: "src/fsd/pages/**" },
        { type: "widget", pattern: "src/widgets/**" },
        { type: "feature", pattern: "src/features/**" },
        { type: "entity", pattern: "src/entities/**" },
        { type: "shared", pattern: "src/shared/**" },
        { type: "native", pattern: "src/lib/native/**" },
      ],
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          policies: [
            {
              from: { element: { type: "app" } },
              allow: {
                to: {
                  element: {
                    types: ["routes", "page", "widget", "feature", "entity", "shared", "native"],
                  },
                },
              },
            },
            {
              from: { element: { type: "routes" } },
              allow: { to: { element: { types: ["page", "shared"] } } },
            },
            {
              from: { element: { type: "page" } },
              allow: {
                to: { element: { types: ["widget", "feature", "entity", "shared", "native"] } },
              },
            },
            {
              from: { element: { type: "widget" } },
              allow: { to: { element: { types: ["feature", "entity", "shared"] } } },
            },
            {
              from: { element: { type: "feature" } },
              allow: { to: { element: { types: ["entity", "shared"] } } },
            },
            {
              from: { element: { type: "entity" } },
              allow: { to: { element: { type: "shared" } } },
            },
            {
              from: { element: { type: "shared" } },
              allow: { to: { element: { type: "shared" } } },
            },
          ],
        },
      ],
    },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  // Keep Prettier formatting errors inside ESLint and turn off conflicting style rules.
  prettierRecommended,
]);

export default eslintConfig;
