"use strict";

const DEFAULT_OPTIONS = {
  moduleExports: {
    disallowSet: true,
    disallowPush: true,
    disallowLengthReset: true,
  },
};

function collectPatternIdentifiers(pattern, handleIdentifier) {
  switch (pattern.type) {
    case "Identifier":
      handleIdentifier(pattern.name);
      break;
    case "ObjectPattern":
      for (const property of pattern.properties) {
        if (property.type === "Property") {
          collectPatternIdentifiers(property.value, handleIdentifier);
        } else if (property.type === "RestElement") {
          collectPatternIdentifiers(property.argument, handleIdentifier);
        }
      }
      break;
    case "ArrayPattern":
      for (const element of pattern.elements) {
        if (element) {
          collectPatternIdentifiers(element, handleIdentifier);
        }
      }
      break;
    case "AssignmentPattern":
      collectPatternIdentifiers(pattern.left, handleIdentifier);
      break;
    case "RestElement":
      collectPatternIdentifiers(pattern.argument, handleIdentifier);
      break;
    default:
      break;
  }
}

function isModuleScope(context) {
  const ancestors = context.getAncestors();
  for (let index = ancestors.length - 1; index >= 0; index -= 1) {
    const ancestor = ancestors[index];
    switch (ancestor.type) {
      case "FunctionDeclaration":
      case "FunctionExpression":
      case "ArrowFunctionExpression":
      case "ClassDeclaration":
      case "ClassExpression":
      case "MethodDefinition":
      case "StaticBlock":
        return false;
      default:
        break;
    }
  }
  return true;
}

function normalizeOptions(rawOptions) {
  const base = JSON.parse(JSON.stringify(DEFAULT_OPTIONS));
  if (!rawOptions || typeof rawOptions !== "object") {
    return base;
  }

  if (rawOptions.moduleExports && typeof rawOptions.moduleExports === "object") {
    const target = rawOptions.moduleExports;
    for (const key of ["disallowSet", "disallowPush", "disallowLengthReset"]) {
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        base.moduleExports[key] = Boolean(target[key]);
      }
    }
  }

  return base;
}

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Prevent module-scope mutations of exported bindings via set, push, or length resets.",
      recommended: false,
    },
    schema: [
      {
        type: "object",
        properties: {
          moduleExports: {
            type: "object",
            properties: {
              disallowSet: { type: "boolean" },
              disallowPush: { type: "boolean" },
              disallowLengthReset: { type: "boolean" },
            },
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      mutationCall:
        "Avoid mutating exported binding '{{name}}' with .{{method}}() at module scope.",
      lengthReset:
        "Avoid resetting the length of exported binding '{{name}}' at module scope.",
    },
  },
  create(context) {
    const options = normalizeOptions(context.options && context.options[0]);
    const exportedBindings = new Set();
    const pendingMutations = [];

    function recordExportedIdentifier(name) {
      if (typeof name === "string" && name.length > 0) {
        exportedBindings.add(name);
      }
    }

    return {
      ExportNamedDeclaration(node) {
        if (node.declaration && node.declaration.type === "VariableDeclaration") {
          for (const declarator of node.declaration.declarations) {
            collectPatternIdentifiers(declarator.id, recordExportedIdentifier);
          }
        }

        if (!node.source) {
          for (const specifier of node.specifiers) {
            if (specifier.type === "ExportSpecifier" && specifier.local.type === "Identifier") {
              recordExportedIdentifier(specifier.local.name);
            }
          }
        }
      },
      ExportDefaultDeclaration(node) {
        if (node.declaration && node.declaration.type === "Identifier") {
          recordExportedIdentifier(node.declaration.name);
        }
      },
      CallExpression(node) {
        if (!isModuleScope(context)) {
          return;
        }

        if (!options.moduleExports.disallowSet && !options.moduleExports.disallowPush) {
          return;
        }

        const callee = node.callee;
        if (
          callee &&
          callee.type === "MemberExpression" &&
          !callee.computed &&
          callee.property.type === "Identifier" &&
          callee.object.type === "Identifier"
        ) {
          const method = callee.property.name;
          if (
            (method === "set" && options.moduleExports.disallowSet) ||
            (method === "push" && options.moduleExports.disallowPush)
          ) {
            pendingMutations.push({
              type: "method",
              method,
              name: callee.object.name,
              node,
            });
          }
        }
      },
      AssignmentExpression(node) {
        if (!options.moduleExports.disallowLengthReset) {
          return;
        }

        if (!isModuleScope(context)) {
          return;
        }

        const left = node.left;
        if (
          left.type === "MemberExpression" &&
          !left.computed &&
          left.property.type === "Identifier" &&
          left.property.name === "length" &&
          left.object.type === "Identifier" &&
          node.right &&
          node.right.type === "Literal" &&
          node.right.value === 0
        ) {
          pendingMutations.push({
            type: "length",
            name: left.object.name,
            node,
          });
        }
      },
      "Program:exit"() {
        for (const mutation of pendingMutations) {
          if (!exportedBindings.has(mutation.name)) {
            continue;
          }

          if (mutation.type === "method") {
            context.report({
              node: mutation.node,
              messageId: "mutationCall",
              data: {
                name: mutation.name,
                method: mutation.method,
              },
            });
          } else if (mutation.type === "length") {
            context.report({
              node: mutation.node,
              messageId: "lengthReset",
              data: {
                name: mutation.name,
              },
            });
          }
        }
      },
    };
  },
};
