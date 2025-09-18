"use strict";
/**
 * Disallow JSON.stringify on values typed as Json.
 * Rationale: use canonicalKey(x) or JSON.stringify(toEJsonCanonical(x)).
 *
 * Allows:
 *   JSON.stringify(toEJsonCanonical(x))
 *   canonicalKey(x)
 */

const { ESLintUtils } = require("@typescript-eslint/utils");

const createRule = ESLintUtils.RuleCreator(
  name => `https://example.invalid/rules/${name}`
);

function isJSONstringify(node) {
  // JSON.stringify(...)
  return node.type === "MemberExpression"
    && !node.computed
    && node.object.type === "Identifier"
    && node.object.name === "JSON"
    && node.property.type === "Identifier"
    && node.property.name === "stringify";
}

function isAllowedWrapper(arg) {
  // allow JSON.stringify(toEJsonCanonical(x)) and JSON.stringify(toEJson(x))
  // and canonicalKey(x) calls (handled by callers not using JSON.stringify)
  if (arg && arg.type === "CallExpression" && arg.callee.type === "Identifier") {
    const n = arg.callee.name;
    return n === "toEJsonCanonical" || n === "toEJson";
  }
  return false;
}

function looksLikeJsonType(tsType, checker) {
  // Try hard to detect the alias name 'Json'
  const sym = tsType.getSymbol && tsType.getSymbol();
  if (sym && sym.getName && sym.getName() === "Json") return true;

  // For unions or aliases, inspect apparent type text
  const text = checker.typeToString(tsType);
  // Heuristic: your Json has { un: JsonF<...> }
  if (/\bun:\s*JsonF<.+>/.test(text)) return true;
  if (/\bFix1<'JsonF'>/.test(text)) return true;

  // If it's a union, check its constituents
  if (tsType.isUnion && tsType.isUnion()) {
    return tsType.types.some(t => looksLikeJsonType(t, checker));
  }
  return false;
}

module.exports = createRule({
  name: "no-json-stringify-on-json",
  meta: {
    type: "problem",
    docs: {
      description: "Disallow JSON.stringify on Json; use canonicalKey or toEJsonCanonical.",
      recommended: "error",
    },
    messages: {
      noStringify:
        "Avoid JSON.stringify on values of type Json. Use canonicalKey(x) or JSON.stringify(toEJsonCanonical(x)).",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const services = ESLintUtils.getParserServices(context);
    const checker = services.program.getTypeChecker();

    return {
      CallExpression(node) {
        if (!isJSONstringify(node.callee)) return;
        const [arg] = node.arguments;
        if (!arg) return;
        if (isAllowedWrapper(arg)) return; // JSON.stringify(toEJsonCanonical(x)) is OK

        // Need type of the argument
        const tsNode = services.esTreeNodeToTSNodeMap.get(arg);
        const type = checker.getTypeAtLocation(tsNode);

        if (looksLikeJsonType(type, checker)) {
          context.report({ node, messageId: "noStringify" });
        }
      },
    };
  },
});
