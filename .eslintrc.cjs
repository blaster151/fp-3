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
};
