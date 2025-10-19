"use strict";

const DEFAULT_OPTIONS = {
  allowLoopIndices: false,
};

function isLoopInitializer(node) {
  const parent = node.parent;
  if (!parent) {
    return false;
  }

  if (parent.type === "ForStatement" && parent.init === node) {
    return true;
  }

  if (parent.type === "ForInStatement" && parent.left === node) {
    return true;
  }

  if (parent.type === "ForOfStatement" && parent.left === node) {
    return true;
  }

  return false;
}

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow let declarations in favour of immutable bindings.",
      recommended: false,
    },
    schema: [
      {
        type: "object",
        properties: {
          allowLoopIndices: {
            type: "boolean",
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      unexpectedLet:
        "Use const bindings instead of let to preserve immutability (loop indices can be allowed explicitly).",
    },
  },
  create(context) {
    const options = Object.assign(
      {},
      DEFAULT_OPTIONS,
      context.options && context.options[0] ? context.options[0] : {},
    );

    return {
      VariableDeclaration(node) {
        if (node.kind !== "let") {
          return;
        }

        if (options.allowLoopIndices && isLoopInitializer(node)) {
          return;
        }

        context.report({
          node,
          messageId: "unexpectedLet",
        });
      },
    };
  },
};
