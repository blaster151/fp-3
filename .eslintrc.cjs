/* eslint-env node */
module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["./tsconfig.eslint.json"], // needed for type-aware rules
    tsconfigRootDir: __dirname,
    ecmaVersion: 2022,
    sourceType: "module",
  },
  plugins: [
    "@typescript-eslint",
    // The flat-config entry point (eslint.config.js) loads the same plugin instance
    // so both ESLint 8 (Next.js today) and ESLint 9 pick up identical settings.
    "fp-3",
  ],
  extends: ["plugin:fp-3/recommended"],
  settings: {},
  overrides: [
    {
      // For JS/MJS files, disable TypeScript-aware rules that require type information
      files: ["**/*.js", "**/*.cjs", "**/*.mjs"],
      parser: "espree", // Use default JS parser instead of TypeScript parser
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        project: null, // Explicitly disable project
      },
      rules: {
        "fp-3/no-json-stringify-on-json": "off", // This rule requires type information
        "fp-3/oracle-result-shape": "off", // This rule requires type information
        "fp-3/registry-path-convention": "off", // Disable all custom rules for JS files
        "fp-3/registry-satisfies-record": "off",
        "fp-3/law-registry-registration": "off",
        "@typescript-eslint/no-floating-promises": "off", // Requires type information
        "@typescript-eslint/no-misused-promises": "off", // Requires type information
      },
    },
    {
      // For test files, disable promise rules that flag test framework assertions
      files: ["**/*.spec.ts", "**/*.test.ts", "**/test/**/*.ts"],
      rules: {
        "@typescript-eslint/no-floating-promises": "off", // Vitest expect() may be thenable
        "@typescript-eslint/no-misused-promises": "off",
      },
    },
  ],
};

