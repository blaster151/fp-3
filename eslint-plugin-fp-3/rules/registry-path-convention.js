"use strict";

const { ESLintUtils } = require("@typescript-eslint/utils");

const createRule = ESLintUtils.RuleCreator(
  name => `https://example.invalid/rules/${name}`
);

const PATH_REGEX = /^[a-z][a-zA-Z0-9]*(?:\.[A-Za-z0-9_-]+)+$/;

function isRegistryKey(node) {
  if (node.type === "Identifier") {
    return node.name === "registryPath";
  }
  if (node.type === "Literal") {
    return node.value === "registryPath";
  }
  return false;
}

module.exports = createRule({
  name: "registry-path-convention",
  meta: {
    type: "problem",
    docs: {
      description: "Enforce dot-delimited registryPath strings with subsystem prefixes.",
      recommended: "error",
    },
    schema: [],
    messages: {
      requireString: "registryPath must be a string literal using dot notation (e.g. subsystem.entry).",
      requirePrefix: "registryPath values must begin with a lowercase subsystem prefix followed by a dot (e.g. relativeMonad.).",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      Property(node) {
        if (!isRegistryKey(node.key) || node.computed) return;
        const value = node.value;
        if (value.type !== "Literal" || typeof value.value !== "string") {
          context.report({ node: value, messageId: "requireString" });
          return;
        }

        if (!PATH_REGEX.test(value.value)) {
          context.report({ node: value, messageId: "requirePrefix" });
        }
      },
    };
  },
});
