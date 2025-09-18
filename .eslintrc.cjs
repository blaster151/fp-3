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
    // Reference the local plugin by path using ESLint's "plugins" resolution:
    // If using ESLint <9, it resolves node_modules only. Add NODE_PATH=.
    // Easiest: use the "plugin:" prefix via 'eslint-plugin-tinyfp' symlink in node_modules
    // or use ESLint flat config. Simpler: require() in overrides (see below).
    "tinyfp"
  ],
  settings: {},
  rules: {
    "tinyfp/no-json-stringify-on-json": "error"
  },
};
