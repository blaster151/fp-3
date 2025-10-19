import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname } from "path";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const tsParser = require("@typescript-eslint/parser");
const fp3Plugin = require("./eslint-plugin-fp-3");
const functionalPlugin = require("./eslint-plugin-functional");

const recommendedRules = fp3Plugin?.configs?.recommended?.rules ?? {};

export default [
  {
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
      "fp-3": fp3Plugin,
      functional: functionalPlugin,
    },
    rules: {
      ...recommendedRules,
      "functional/no-let": ["error", { allowLoopIndices: true }],
      "functional/no-var": ["error", { allowLoopIndices: true }],
      "functional/immutable-data": [
        "error",
        {
          moduleExports: {
            disallowSet: true,
            disallowPush: true,
            disallowLengthReset: true,
          },
        },
      ],
    },
  },
];
