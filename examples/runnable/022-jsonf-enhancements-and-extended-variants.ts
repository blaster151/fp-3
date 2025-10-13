import type { RunnableExample } from "./types";
import { JsonValue } from "./json-canonical";

/**
 * Stage 022 rebuilds the JSONF constructors that power the extended JSON
 * walkthrough.  The functor includes enriched variants—dates, decimals,
 * binaries, regular expressions, and mathematical sets—in addition to the
 * standard JSON shapes.  A single catamorphism produces aggregate statistics
 * (node count, depth, and cumulative string payload) while the tagged encoder
 * renders a JSON representation suitable for debugging or transport.
 */

// ---------------------------------------------------------------------------
// JSONF functor and helpers
// ---------------------------------------------------------------------------

type JsonF<A> =
  | { readonly kind: "null" }
  | { readonly kind: "boolean"; readonly value: boolean }
  | { readonly kind: "number"; readonly value: number }
  | { readonly kind: "string"; readonly value: string }
  | { readonly kind: "date"; readonly iso: string }
  | { readonly kind: "decimal"; readonly digits: string }
  | { readonly kind: "binary"; readonly base16: string }
  | { readonly kind: "regex"; readonly pattern: string; readonly flags: string }
  | { readonly kind: "array"; readonly items: ReadonlyArray<A> }
  | { readonly kind: "set"; readonly items: ReadonlyArray<A> }
  | { readonly kind: "object"; readonly entries: ReadonlyArray<{ readonly key: string; readonly value: A }> };

interface JsonNode {
  readonly node: JsonF<JsonNode>;
}

function node(node: JsonF<JsonNode>): JsonNode {
  return { node };
}

function jsonNull(): JsonNode {
  return node({ kind: "null" });
}

function jsonBoolean(value: boolean): JsonNode {
  return node({ kind: "boolean", value });
}

function jsonNumber(value: number): JsonNode {
  return node({ kind: "number", value });
}

function jsonString(value: string): JsonNode {
  return node({ kind: "string", value });
}

function jsonDate(iso: string): JsonNode {
  return node({ kind: "date", iso });
}

function jsonDecimal(digits: string): JsonNode {
  return node({ kind: "decimal", digits });
}

function jsonBinary(base16: string): JsonNode {
  return node({ kind: "binary", base16 });
}

function jsonRegex(pattern: string, flags: string): JsonNode {
  return node({ kind: "regex", pattern, flags });
}

function jsonArray(items: ReadonlyArray<JsonNode>): JsonNode {
  return node({ kind: "array", items });
}

function jsonSet(items: ReadonlyArray<JsonNode>): JsonNode {
  return node({ kind: "set", items });
}

function jsonObject(entries: ReadonlyArray<readonly [string, JsonNode]>): JsonNode {
  return node({
    kind: "object",
    entries: entries.map(([key, value]) => ({ key, value })),
  });
}

// ---------------------------------------------------------------------------
// Catamorphism utilities
// ---------------------------------------------------------------------------

function mapJsonF<A, B>(json: JsonF<A>, mapper: (value: A) => B): JsonF<B> {
  switch (json.kind) {
    case "array":
    case "set":
      return { ...json, items: json.items.map(mapper) };
    case "object":
      return {
        kind: "object",
        entries: json.entries.map(({ key, value }) => ({ key, value: mapper(value) })),
      };
    default:
      return json as unknown as JsonF<B>;
  }
}

function foldJsonF<A>(root: JsonNode, algebra: (node: JsonF<A>) => A): A {
  const recurse = (current: JsonNode): A => {
    const mapped = mapJsonF(current.node, recurse);
    return algebra(mapped);
  };
  return recurse(root);
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

type JsonFStatistics = {
  readonly nodes: number;
  readonly maxDepth: number;
  readonly stringBytes: number;
  readonly constructors: ReadonlyArray<string>;
};

function aggregateStatistics(node: JsonF<JsonFStatistics>): JsonFStatistics {
  const childStats = collectChildren(node);
  const nodes = 1 + childStats.nodes;
  const maxDepth = 1 + childStats.maxDepth;
  const stringBytes = childStringContribution(node) + childStats.stringBytes;
  const constructors = unique([...childStats.constructors, node.kind]);
  return { nodes, maxDepth, stringBytes, constructors };
}

type CollectedChildStats = {
  readonly nodes: number;
  readonly maxDepth: number;
  readonly stringBytes: number;
  readonly constructors: ReadonlyArray<string>;
};

function collectChildren(node: JsonF<JsonFStatistics>): CollectedChildStats {
  if (node.kind === "array" || node.kind === "set") {
    return summarizeArray(node.items);
  }

  if (node.kind === "object") {
    const summary = summarizeArray(node.entries.map((entry) => entry.value));
    const keyBytes = node.entries.reduce((total, entry) => total + entry.key.length, 0);
    return {
      nodes: summary.nodes,
      maxDepth: summary.maxDepth,
      stringBytes: summary.stringBytes + keyBytes,
      constructors: summary.constructors,
    };
  }

  return { nodes: 0, maxDepth: 0, stringBytes: 0, constructors: [] };
}

function summarizeArray(items: ReadonlyArray<JsonFStatistics>): CollectedChildStats {
  const nodes = items.reduce((total, entry) => total + entry.nodes, 0);
  const maxDepth = items.reduce((depth, entry) => Math.max(depth, entry.maxDepth), 0);
  const stringBytes = items.reduce((total, entry) => total + entry.stringBytes, 0);
  const constructors = unique(items.flatMap((entry) => entry.constructors));
  return { nodes, maxDepth, stringBytes, constructors };
}

function childStringContribution(node: JsonF<JsonFStatistics>): number {
  switch (node.kind) {
    case "string":
      return node.value.length;
    case "date":
      return node.iso.length;
    case "decimal":
      return node.digits.length;
    case "binary":
      return node.base16.length;
    case "regex":
      return node.pattern.length + node.flags.length;
    default:
      return 0;
  }
}

function unique(values: ReadonlyArray<string>): ReadonlyArray<string> {
  return Array.from(new Set(values)).sort();
}

// ---------------------------------------------------------------------------
// Tagged JSON encoder
// ---------------------------------------------------------------------------

function toTaggedJson(root: JsonNode): JsonValue {
  const encode = (current: JsonNode): JsonValue => {
    switch (current.node.kind) {
      case "null":
        return null;
      case "boolean":
        return current.node.value;
      case "number":
        return current.node.value;
      case "string":
        return current.node.value;
      case "date":
        return { $type: "date", value: current.node.iso };
      case "decimal":
        return { $type: "decimal", digits: current.node.digits };
      case "binary":
        return { $type: "binary", base16: current.node.base16 };
      case "regex":
        return { $type: "regex", pattern: current.node.pattern, flags: current.node.flags };
      case "array":
        return current.node.items.map(encode);
      case "set":
        return { $type: "set", items: current.node.items.map(encode) };
      case "object":
        return Object.fromEntries(current.node.entries.map(({ key, value }) => [key, encode(value)]));
      default: {
        const exhaustive: never = current.node;
        return exhaustive;
      }
    }
  };
  return encode(root);
}

// ---------------------------------------------------------------------------
// Set inspection helpers
// ---------------------------------------------------------------------------

function describeSet(node: JsonNode): { readonly original: ReadonlyArray<string>; readonly unique: ReadonlyArray<string> } {
  if (node.node.kind !== "set") {
    return { original: [], unique: [] };
  }

  const serialized = node.node.items.map((item) => renderTag( toTaggedJson(item) ));
  const uniqueValues = unique(serialized);
  return { original: serialized, unique: uniqueValues };
}

function renderTag(value: JsonValue): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

// ---------------------------------------------------------------------------
// Sample document
// ---------------------------------------------------------------------------

const auditTrailTags = jsonSet([
  jsonString("finance"),
  jsonString("Finance"),
  jsonString("ops"),
  jsonString("ops"),
]);

const auditTrail = jsonObject([
  ["timestamp", jsonDate("2024-05-01T12:30:00Z")],
  ["actor", jsonObject([["id", jsonString("user-174")], ["active", jsonBoolean(true)]])],
  ["payload", jsonBinary("7b226576656e74223a20227061796d656e74227d")],
  ["amount", jsonDecimal("1234.5600")],
  ["validator", jsonRegex("^PAY-[0-9]+$", "i")],
  ["tags", auditTrailTags],
  [
    "events",
    jsonArray([
      jsonObject([
        ["kind", jsonString("authorize")],
        ["success", jsonBoolean(true)],
        ["at", jsonDate("2024-05-01T12:30:00Z")],
      ]),
      jsonObject([
        ["kind", jsonString("settle")],
        ["success", jsonBoolean(true)],
        ["at", jsonDate("2024-05-02T08:15:00Z")],
        ["meta", jsonObject([["retries", jsonNumber(1)]])],
      ]),
    ]),
  ],
]);

// ---------------------------------------------------------------------------
// Runnable wiring
// ---------------------------------------------------------------------------

export const jsonfEnhancementsAndExtendedVariants: RunnableExample = {
  id: "022",
  title: "JSONF enhancements and extended variants",
  outlineReference: 22,
  summary:
    "Extended JSONF constructors with aggregated statistics and tagged JSON rendering for debugging and transport.",
  async run() {
    const stats = foldJsonF(auditTrail, aggregateStatistics);
    const tagged = toTaggedJson(auditTrail);
    const setSummary = describeSet(auditTrailTags);

    const logs = [
      "== Extended JSONF statistics ==",
      `Constructors encountered: ${stats.constructors.join(", ")}`,
      `Total nodes: ${stats.nodes}`,
      `Maximum depth: ${stats.maxDepth}`,
      `String payload (characters): ${stats.stringBytes}`,
      "== Tagged JSON encoding ==",
      ...indent(JSON.stringify(tagged, null, 2)),
      "== Set normalisation ==",
      `Original entries: ${setSummary.original.join(", ")}`,
      `Unique entries: ${setSummary.unique.join(", ")}`,
    ];

    return { logs };
  },
};

function indent(value: string): ReadonlyArray<string> {
  return value.split("\n").map((line) => `  ${line}`);
}
