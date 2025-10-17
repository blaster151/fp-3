"use strict";

const { ESLintUtils, AST_NODE_TYPES } = require("@typescript-eslint/utils");

const createRule = ESLintUtils.RuleCreator(
  name => `https://example.invalid/rules/${name}`
);

function isRecordReference(typeNode) {
  if (!typeNode || typeNode.type !== AST_NODE_TYPES.TSTypeReference) return false;
  const typeName = typeNode.typeName;
  if (typeName.type !== AST_NODE_TYPES.Identifier || typeName.name !== "Record") {
    return false;
  }
  const params = typeNode.typeParameters?.params ?? [];
  if (params.length < 2) return false;
  const [first] = params;
  return (
    first.type === AST_NODE_TYPES.TSStringKeyword ||
    (first.type === AST_NODE_TYPES.TSLiteralType && typeof first.literal.value === "string")
  );
}

function getConstraintFromInitializer(init) {
  if (!init) return null;
  if (
    init.type === AST_NODE_TYPES.TSSatisfiesExpression ||
    init.type === AST_NODE_TYPES.TSAsExpression
  ) {
    return init.typeAnnotation;
  }
  return null;
}

function getLiteralFromInitializer(init) {
  if (!init) return null;
  if (
    init.type === AST_NODE_TYPES.TSSatisfiesExpression ||
    init.type === AST_NODE_TYPES.TSAsExpression
  ) {
    return init.expression;
  }
  return init;
}

function isRegistryName(name) {
  return /registry/i.test(name);
}

module.exports = createRule({
  name: "registry-satisfies-record",
  meta: {
    type: "suggestion",
    docs: {
      description: "Require registry exports to use satisfies Record<string, Descriptor>.",
      recommended: "warn",
    },
    schema: [],
    messages: {
      missingConstraint:
        "Exported registry objects should use 'satisfies Record<string, Descriptor>' (or an equivalent type assertion).",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      ExportNamedDeclaration(node) {
        const declaration = node.declaration;
        if (!declaration || declaration.type !== AST_NODE_TYPES.VariableDeclaration) return;

        for (const declarator of declaration.declarations) {
          if (declarator.id.type !== AST_NODE_TYPES.Identifier) continue;
          const name = declarator.id.name;
          if (!isRegistryName(name)) continue;

          const literal = getLiteralFromInitializer(declarator.init);
          if (!literal || literal.type !== AST_NODE_TYPES.ObjectExpression) continue;

          const typeAnnotation =
            declarator.id.typeAnnotation?.typeAnnotation ||
            getConstraintFromInitializer(declarator.init);

          if (!isRecordReference(typeAnnotation)) {
            context.report({ node: declarator.id, messageId: "missingConstraint" });
          }
        }
      },
    };
  },
});
