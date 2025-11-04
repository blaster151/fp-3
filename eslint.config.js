import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname } from "path";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const fp3Plugin = require("./eslint-plugin-fp-3");

const recommendedRules = fp3Plugin?.configs?.recommended?.rules ?? {};

export default [
  // Ignore patterns (replaces .eslintignore in flat config)
  {
    ignores: [
      "dist/**",
      "**/*.d.ts",
      "node_modules/**",
      "coverage/**",
      "**/*.tsbuildinfo",
      "**/*.log",
    ],
  },
  // Configuration for TypeScript files
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: ["./tsconfig.eslint.json"],
        tsconfigRootDir: __dirname,
        ecmaVersion: 2022,
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "fp-3": fp3Plugin,
    },
    rules: {
      ...recommendedRules,
      "@typescript-eslint/no-floating-promises": ["warn", {
        ignoreVoid: true,
        ignoreIIFE: true,
      }],
      "@typescript-eslint/no-misused-promises": ["error", {
        checksVoidReturn: {
          arguments: false,
        },
      }],
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      }],
    },
  },
  // Configuration for JavaScript files - no TypeScript parser
  {
    files: ["**/*.js", "**/*.cjs", "**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    plugins: {
      "fp-3": fp3Plugin,
    },
    rules: {
      // Disable rules that require TypeScript type information
      "fp-3/no-json-stringify-on-json": "off",
      "fp-3/oracle-result-shape": "off",
    },
  },
  // Configuration for test files
  {
    files: ["**/*.spec.ts", "**/*.test.ts"],
    rules: {
      // Disable promise rules that flag test framework assertions
    },
  },
];
