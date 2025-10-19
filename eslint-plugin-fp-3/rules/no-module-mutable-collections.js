"use strict";

const { ESLintUtils, AST_NODE_TYPES, ASTUtils } = require("@typescript-eslint/utils");

const createRule = ESLintUtils.RuleCreator(
  name => `https://example.invalid/rules/${name}`
);

const MUTATING_METHODS = {
  Map: new Set(["set", "delete", "clear"]),
  WeakMap: new Set(["set", "delete"]),
  Array: new Set([
    "push",
    "pop",
    "shift",
    "unshift",
    "splice",
    "sort",
    "reverse",
    "copyWithin",
    "fill",
  ]),
};

function isModuleLevel(node) {
  let current = node.parent;
  while (current) {
    if (
      current.type === AST_NODE_TYPES.FunctionDeclaration ||
      current.type === AST_NODE_TYPES.FunctionExpression ||
      current.type === AST_NODE_TYPES.ArrowFunctionExpression ||
      current.type === AST_NODE_TYPES.BlockStatement ||
      current.type === AST_NODE_TYPES.ClassBody ||
      current.type === AST_NODE_TYPES.MethodDefinition ||
      current.type === AST_NODE_TYPES.TSModuleBlock
    ) {
      return false;
    }
    if (current.type === AST_NODE_TYPES.Program) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function getTrackedType(init) {
  if (!init) return null;
  if (
    init.type === AST_NODE_TYPES.TSAsExpression ||
    init.type === AST_NODE_TYPES.TSSatisfiesExpression ||
    init.type === AST_NODE_TYPES.TSNonNullExpression ||
    init.type === AST_NODE_TYPES.ParenthesizedExpression
  ) {
    return getTrackedType(init.expression);
  }
  if (
    init.type === AST_NODE_TYPES.NewExpression &&
    init.callee.type === AST_NODE_TYPES.Identifier
  ) {
    if (init.callee.name === "Map") {
      return "Map";
    }
    if (init.callee.name === "WeakMap") {
      return "WeakMap";
    }
  }
  if (init.type === AST_NODE_TYPES.ArrayExpression) {
    return "Array";
  }
  return null;
}

function getMemberExpression(node) {
  if (node.type === AST_NODE_TYPES.MemberExpression) {
    return node;
  }
  if (node.type === AST_NODE_TYPES.OptionalMemberExpression) {
    return node;
  }
  return null;
}

function getPropertyName(member) {
  const property = member.property;
  if (member.computed) {
    if (
      property.type === AST_NODE_TYPES.Literal &&
      typeof property.value === "string"
    ) {
      return property.value;
    }
    return null;
  }
  if (property.type === AST_NODE_TYPES.Identifier) {
    return property.name;
  }
  return null;
}

function humanReadableType(type) {
  return type === "Array" ? "array" : type;
}

function getScopeForNode(context, node) {
  if (typeof context.sourceCode?.getScope === "function") {
    const scope = context.sourceCode.getScope(node);
    if (scope) {
      return scope;
    }
  }
  if (context.sourceCode?.scopeManager) {
    const scope = context.sourceCode.scopeManager.acquire(node);
    if (scope) {
      return scope;
    }
  }
  return context.getScope();
}

module.exports = createRule({
  name: "no-module-mutable-collections",
  meta: {
    type: "problem",
    docs: {
      description:
        "Discourage module-level Maps, WeakMaps, or array literals that are mutated after declaration.",
      recommended: "error",
    },
    schema: [],
    messages: {
      avoidMutation:
        "Module-level {{type}} '{{name}}' should not be mutated with '{{method}}()'. Move the mutable state inside a function or use an immutable alternative.",
    },
  },
  defaultOptions: [],
  create(context) {
    const tracked = new Map();

    return {
      VariableDeclarator(node) {
        if (node.id.type !== AST_NODE_TYPES.Identifier) return;
        if (!isModuleLevel(node)) return;
        const trackedType = getTrackedType(node.init);
        if (!trackedType) return;
        const declared = context.getDeclaredVariables(node);
        const variable = declared[0];
        if (!variable) return;
        tracked.set(variable, { name: node.id.name, type: trackedType });
      },
      CallExpression(node) {
        const member = getMemberExpression(node.callee);
        if (!member) return;
        const propertyName = getPropertyName(member);
        if (!propertyName) return;
        const object = member.object;
        if (object.type !== AST_NODE_TYPES.Identifier) return;
        const scope = getScopeForNode(context, node);
        const variable = ASTUtils.findVariable(scope, object.name);
        if (!variable) return;
        const info = tracked.get(variable);
        if (!info) return;
        const allowedMethods = MUTATING_METHODS[info.type];
        if (!allowedMethods || !allowedMethods.has(propertyName)) return;
        context.report({
          node,
          messageId: "avoidMutation",
          data: {
            name: info.name,
            type: humanReadableType(info.type),
            method: propertyName,
          },
        });
      },
    };
  },
});
