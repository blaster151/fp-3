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
      description: "Disallow var declarations in favour of block scoped bindings.",
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
      unexpectedVar:
        "Avoid var declarations; prefer const (or an allowed loop-scoped let) for loop indices.",
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
        if (node.kind !== "var") {
          return;
        }

        if (options.allowLoopIndices && isLoopInitializer(node)) {
          return;
        }

        context.report({
          node,
          messageId: "unexpectedVar",
        });
      },
    };
  },
};
