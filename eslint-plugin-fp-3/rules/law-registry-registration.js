"use strict";

const { ESLintUtils, AST_NODE_TYPES } = require("@typescript-eslint/utils");

const createRule = ESLintUtils.RuleCreator(
  name => `https://example.invalid/rules/${name}`
);

function isLawfulReference(typeNode) {
  if (!typeNode) return false;
  if (typeNode.type === AST_NODE_TYPES.TSTypeReference) {
    const name = typeNode.typeName;
    if (name.type === AST_NODE_TYPES.Identifier && name.name === "Lawful") {
      return true;
    }
    if (
      name.type === AST_NODE_TYPES.TSQualifiedName &&
      name.right.type === AST_NODE_TYPES.Identifier &&
      name.right.name === "Lawful"
    ) {
      return true;
    }
  }
  return false;
}

function fromInitializer(init) {
  if (!init) return null;
  if (
    init.type === AST_NODE_TYPES.TSSatisfiesExpression ||
    init.type === AST_NODE_TYPES.TSAsExpression
  ) {
    return init.typeAnnotation;
  }
  return null;
}

module.exports = createRule({
  name: "law-registry-registration",
  meta: {
    type: "suggestion",
    docs: {
      description: "Warn when exported Lawful suites are not registered via registerLawful in the same module.",
      recommended: "warn",
    },
    schema: [],
    messages: {
      missingRegistration:
        "Lawful suite '{name}' is exported but never passed to registerLawful within this module.",
    },
  },
  defaultOptions: [],
  create(context) {
    const exportedLawfuls = new Map();
    const registered = new Set();

    function considerDeclarator(declarator) {
      if (declarator.id.type !== AST_NODE_TYPES.Identifier) return;
      const name = declarator.id.name;
      const annotation =
        declarator.id.typeAnnotation?.typeAnnotation || fromInitializer(declarator.init);
      if (!isLawfulReference(annotation)) return;
      exportedLawfuls.set(name, declarator.id);
    }

    function handleCallExpression(node) {
      if (node.callee.type !== AST_NODE_TYPES.Identifier) return;
      if (node.callee.name !== "registerLawful") return;
      const [firstArg] = node.arguments;
      if (!firstArg || firstArg.type !== AST_NODE_TYPES.Identifier) return;
      registered.add(firstArg.name);
    }

    return {
      ExportNamedDeclaration(node) {
        const declaration = node.declaration;
        if (!declaration || declaration.type !== AST_NODE_TYPES.VariableDeclaration) return;
        for (const declarator of declaration.declarations) {
          considerDeclarator(declarator);
        }
      },
      CallExpression(node) {
        handleCallExpression(node);
      },
      "Program:exit"() {
        for (const [name, idNode] of exportedLawfuls.entries()) {
          if (!registered.has(name)) {
            context.report({
              node: idNode,
              messageId: "missingRegistration",
              data: { name },
            });
          }
        }
      },
    };
  },
});
