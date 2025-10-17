"use strict";

const ts = require("typescript");
const { ESLintUtils } = require("@typescript-eslint/utils");

const createRule = ESLintUtils.RuleCreator(
  name => `https://example.invalid/rules/${name}`
);

const ORACLE_NAME_PATTERN = /^(check|analyze|test)[A-Z0-9_].*/;

function getConstituentTypes(type) {
  if (type.isUnion?.()) {
    return type.types;
  }
  if ((type.getFlags() & ts.TypeFlags.Union) !== 0 && Array.isArray(type.types)) {
    return type.types;
  }
  return null;
}

function unwrapPromise(type, checker) {
  const promised = checker.getPromisedTypeOfPromise(type);
  return promised ?? type;
}

function isBooleanLike(type) {
  const constituents = getConstituentTypes(type);
  if (constituents) {
    return constituents.every(isBooleanLike);
  }
  const flags = type.getFlags();
  return (flags & (ts.TypeFlags.BooleanLike | ts.TypeFlags.Boolean | ts.TypeFlags.BooleanLiteral)) !== 0;
}

function isStringLike(type) {
  const constituents = getConstituentTypes(type);
  if (constituents) {
    return constituents.every(isStringLike);
  }
  const flags = type.getFlags();
  return (flags & (ts.TypeFlags.StringLike | ts.TypeFlags.String | ts.TypeFlags.StringLiteral)) !== 0;
}

function getPropertyType(type, name, checker, fallbackNode) {
  const constituents = getConstituentTypes(type);
  if (constituents) {
    const constituentResults = constituents.map(t => getPropertyType(t, name, checker, fallbackNode));
    if (constituentResults.some(result => result === null)) {
      return null;
    }
    return constituentResults[0];
  }

  const symbol = type.getProperty(name);
  if (!symbol) return null;
  const declaration = symbol.valueDeclaration || symbol.declarations?.[0] || fallbackNode;
  return checker.getTypeOfSymbolAtLocation(symbol, declaration);
}

function getReturnType(tsNode, checker) {
  if (ts.isFunctionLike(tsNode)) {
    const signature = checker.getSignatureFromDeclaration(tsNode);
    if (signature) {
      return checker.getReturnTypeOfSignature(signature);
    }
  }

  const type = checker.getTypeAtLocation(tsNode);
  const signatures = type.getCallSignatures();
  if (signatures.length === 0) {
    return null;
  }
  return checker.getReturnTypeOfSignature(signatures[0]);
}

function shouldCheckName(name) {
  return ORACLE_NAME_PATTERN.test(name);
}

module.exports = createRule({
  name: "oracle-result-shape",
  meta: {
    type: "problem",
    docs: {
      description:
        "Ensure exported oracle functions expose { holds: boolean, details: string } in their return type.",
      recommended: "error",
    },
    schema: [],
    messages: {
      missingHolds:
        "Exported oracle functions must return an object type containing a boolean 'holds' field.",
      missingDetails:
        "Exported oracle functions must return an object type containing a string 'details' field.",
    },
  },
  defaultOptions: [],
  create(context) {
    const services = ESLintUtils.getParserServices(context);
    const checker = services.program.getTypeChecker();

    function checkFunctionLike(node, nameNode, name) {
      if (!name || !shouldCheckName(name)) return;

      const tsNode = services.esTreeNodeToTSNodeMap.get(node);
      const returnType = getReturnType(tsNode, checker);
      if (!returnType) return;

      const effectiveType = unwrapPromise(returnType, checker);
      const holdsType = getPropertyType(effectiveType, "holds", checker, tsNode);
      if (!holdsType || !isBooleanLike(holdsType)) {
        context.report({ node: nameNode, messageId: "missingHolds" });
        return;
      }

      const detailsType = getPropertyType(effectiveType, "details", checker, tsNode);
      if (!detailsType || !isStringLike(detailsType)) {
        context.report({ node: nameNode, messageId: "missingDetails" });
      }
    }

    function extractName(id) {
      if (id && id.type === "Identifier") {
        return id.name;
      }
      return null;
    }

    return {
      ExportNamedDeclaration(node) {
        const declaration = node.declaration;
        if (!declaration) return;

        if (declaration.type === "FunctionDeclaration") {
          const name = declaration.id ? declaration.id.name : null;
          checkFunctionLike(declaration, declaration.id ?? declaration, name);
        } else if (declaration.type === "VariableDeclaration") {
          for (const declarator of declaration.declarations) {
            if (!declarator.init) continue;
            const name = extractName(declarator.id);
            if (!name) continue;

            if (
              declarator.init.type === "ArrowFunctionExpression" ||
              declarator.init.type === "FunctionExpression"
            ) {
              checkFunctionLike(declarator.init, declarator.id, name);
            }
          }
        }
      },
    };
  },
});
