import {
  CanonicalPolicy,
  CanonicalizationResult,
  JsonValue,
  canonicalizeJsonWithPolicy,
  hashCanonical,
} from "./json-canonical";
import type { RunnableExample } from "./types";

/**
 * Stage 023 threads canonicalization policies through a set of analytics while
 * demonstrating product algebras.  A single catamorphism computes node counts,
 * maximum depth, and cumulative string payload for each canonical form.  The
 * Reader-like policy layer ensures the configuration is applied consistently
 * across transformations.
 */

// ---------------------------------------------------------------------------
// JSON catamorphism utilities
// ---------------------------------------------------------------------------

type JsonNodeF<A> =
  | { readonly kind: "null" }
  | { readonly kind: "boolean"; readonly value: boolean }
  | { readonly kind: "number"; readonly value: number }
  | { readonly kind: "string"; readonly value: string }
  | { readonly kind: "array"; readonly items: ReadonlyArray<A> }
  | { readonly kind: "object"; readonly entries: ReadonlyArray<{ readonly key: string; readonly value: A }> };

type JsonAlgebra<A> = (node: JsonNodeF<A>) => A;

function foldJson<A>(value: JsonValue, algebra: JsonAlgebra<A>): A {
  if (value === null) {
    return algebra({ kind: "null" });
  }

  if (typeof value === "boolean") {
    return algebra({ kind: "boolean", value });
  }

  if (typeof value === "number") {
    return algebra({ kind: "number", value });
  }

  if (typeof value === "string") {
    return algebra({ kind: "string", value });
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => foldJson(item, algebra));
    return algebra({ kind: "array", items });
  }

  const entries = Object.entries(value).map(([key, child]) => ({ key, value: foldJson(child, algebra) }));
  return algebra({ kind: "object", entries });
}

function mapNode<A, B>(node: JsonNodeF<A>, mapper: (value: A) => B): JsonNodeF<B> {
  switch (node.kind) {
    case "array":
      return { kind: "array", items: node.items.map(mapper) };
    case "object":
      return {
        kind: "object",
        entries: node.entries.map(({ key, value }) => ({ key, value: mapper(value) })),
      };
    default:
      return node as unknown as JsonNodeF<B>;
  }
}

function productAlgebra<A, B>(left: JsonAlgebra<A>, right: JsonAlgebra<B>): JsonAlgebra<{ left: A; right: B }> {
  return (node) => {
    const leftNode = mapNode(node, (child) => child.left);
    const rightNode = mapNode(node, (child) => child.right);
    return {
      left: left(leftNode),
      right: right(rightNode),
    };
  };
}

// ---------------------------------------------------------------------------
// Base algebras
// ---------------------------------------------------------------------------

const nodeCountAlgebra: JsonAlgebra<number> = (node) => {
  switch (node.kind) {
    case "array":
      return 1 + node.items.reduce((total, child) => total + child, 0);
    case "object":
      return 1 + node.entries.reduce((total, entry) => total + entry.value, 0);
    default:
      return 1;
  }
};

const maxDepthAlgebra: JsonAlgebra<number> = (node) => {
  switch (node.kind) {
    case "array":
      return 1 + maxOrZero(node.items);
    case "object":
      return 1 + maxOrZero(node.entries.map((entry) => entry.value));
    default:
      return 1;
  }
};

const stringSpanAlgebra: JsonAlgebra<number> = (node) => {
  switch (node.kind) {
    case "string":
      return node.value.length;
    case "array":
      return node.items.reduce((total, child) => total + child, 0);
    case "object":
      return node.entries.reduce((total, entry) => total + entry.key.length + entry.value, 0);
    default:
      return 0;
  }
};

function maxOrZero(values: ReadonlyArray<number>): number {
  return values.reduce((max, value) => Math.max(max, value), 0);
}

const combinedStatsAlgebra = productAlgebra(
  nodeCountAlgebra,
  productAlgebra(maxDepthAlgebra, stringSpanAlgebra),
);

type CombinedStats = {
  readonly left: number;
  readonly right: {
    readonly left: number;
    readonly right: number;
  };
};

// ---------------------------------------------------------------------------
// Policy-driven analysis
// ---------------------------------------------------------------------------

type PolicyReader<A> = (policy: CanonicalPolicy) => A;

type PolicyAnalysis = {
  readonly policyName: string;
  readonly canonical: JsonValue;
  readonly hash: string;
  readonly stats: { readonly nodes: number; readonly depth: number; readonly stringBytes: number };
  readonly collisions: ReadonlyArray<string>;
  readonly flagsView: string;
  readonly matchesDefault: boolean;
};

function analyzeWithPolicy(
  policyName: string,
  policyOverrides: CanonicalPolicy,
  reference: CanonicalizationResult,
): PolicyReader<PolicyAnalysis> {
  return (environmentPolicy) => {
    const effectivePolicy: CanonicalPolicy = { ...environmentPolicy, ...policyOverrides };
    const result = canonicalizeJsonWithPolicy(sampleDocument, effectivePolicy);
    const stats = foldJson(result.canonical, combinedStatsAlgebra) as CombinedStats;
    const nodes = stats.left;
    const depth = stats.right.left;
    const stringBytes = stats.right.right;
    const hash = hashCanonical(result.canonical);
    const collisions = formatCollisions(result.collisions);
    const flagsView = extractFlags(result.canonical);
    const matchesDefault = JSON.stringify(result.canonical) === JSON.stringify(reference.canonical);

    return {
      policyName,
      canonical: result.canonical,
      hash,
      stats: { nodes, depth, stringBytes },
      collisions,
      flagsView,
      matchesDefault,
    };
  };
}

function formatCollisions(collisions: ReadonlyArray<{ readonly canonicalKey: string; readonly originalKeys: ReadonlyArray<string> }>): ReadonlyArray<string> {
  if (collisions.length === 0) {
    return ["None"];
  }
  return collisions.map((collision) =>
    `${collision.canonicalKey}: ${collision.originalKeys.join(" ⇔ ")}`,
  );
}

function extractFlags(value: JsonValue): string {
  if (value === null || typeof value !== "object") {
    return "(not present)";
  }

  if (Array.isArray(value)) {
    return "(not present)";
  }

  const objectValue = value as { readonly [key: string]: JsonValue };
  const flags = objectValue["flags"];
  if (!Array.isArray(flags)) {
    return "(not present)";
  }

  return JSON.stringify(flags);
}

// ---------------------------------------------------------------------------
// Sample document and policies
// ---------------------------------------------------------------------------

const sampleDocument: JsonValue = {
  region: "NA-West",
  owner: { name: "Delta", team: "Ops" },
  flags: ["Priority", "priority", "Green"],
  metrics: [
    { name: "ok", count: 12 },
    { name: "OK", count: 12 },
    { name: "fail", count: 3 },
  ],
  updates: [
    { phase: "ingest", succeeded: true },
    { phase: "aggregate", succeeded: true },
    { phase: "publish", succeeded: false },
  ],
};

const policyCatalogue: ReadonlyArray<{ readonly name: string; readonly policy: CanonicalPolicy }> = [
  { name: "Default", policy: {} },
  { name: "Case-insensitive keys", policy: { caseInsensitiveKeys: true } },
  { name: "Sorted arrays + case-insensitive", policy: { caseInsensitiveKeys: true, sortArrays: true } },
];

// ---------------------------------------------------------------------------
// Runnable wiring
// ---------------------------------------------------------------------------

export const policyThreadingWithImprovedProductAlgebras: RunnableExample = {
  id: "023",
  title: "Policy threading with improved product algebras",
  outlineReference: 23,
  summary:
    "Threads canonicalization policies through combined analytics computed via a single product algebra fold.",
  async run() {
    const defaultResult = canonicalizeJsonWithPolicy(sampleDocument, {});
    const analyses = policyCatalogue.map((entry) =>
      analyzeWithPolicy(entry.name, entry.policy, defaultResult)(entry.policy),
    );

    const logs = ["== Policy-threaded canonicalization analytics =="];

    for (const analysis of analyses) {
      logs.push(`Policy: ${analysis.policyName}`);
      logs.push(`  Hash: ${analysis.hash}`);
      logs.push(
        `  Stats (nodes/depth/string-bytes): ${analysis.stats.nodes} / ${analysis.stats.depth} / ${analysis.stats.stringBytes}`,
      );
      logs.push(`  Flags: ${analysis.flagsView}`);
      logs.push(`  Collisions: ${analysis.collisions.join(" | ")}`);
      logs.push(`  Matches default canonical form: ${analysis.matchesDefault ? "yes" : "no"}`);
      logs.push("  Canonical form:");
      logs.push(...indent(JSON.stringify(analysis.canonical, null, 2)));
      logs.push("--");
    }

    return { logs };
  },
};

function indent(value: string): ReadonlyArray<string> {
  return value.split("\n").map((line) => `    ${line}`);
}
