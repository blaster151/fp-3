import type { RunnableExample } from "./types";
import type {
  CanonicalPolicy,
  CanonicalizationResult,
  CollisionReport,
  JsonValue,
} from "./json-canonical";
import {
  canonicalKey,
  canonicalizeJson,
  canonicalizeJsonWithPolicy,
  toCanonicalEJson,
  fromCanonicalEJson,
} from "./json-canonical";

type JsonFold<A> = {
  readonly init: A;
  readonly combine: (accumulator: A, value: JsonValue) => A;
};

function foldJson<A>(value: JsonValue, fold: JsonFold<A>): A {
  const traverse = (current: JsonValue, accumulator: A): A => {
    const next = fold.combine(accumulator, current);
    if (current === null || typeof current !== "object") {
      return next;
    }
    if (Array.isArray(current)) {
      return current.reduce((acc, item) => traverse(item, acc), next);
    }
    return Object.values(current).reduce((acc, item) => traverse(item, acc), next);
  };
  return traverse(value, fold.init);
}

function productFold<A, B>(left: JsonFold<A>, right: JsonFold<B>): JsonFold<readonly [A, B]> {
  return {
    init: [left.init, right.init] as const,
    combine: (accumulator, value) => [
      left.combine(accumulator[0], value),
      right.combine(accumulator[1], value),
    ] as const,
  };
}

function describeCollisions(collisions: ReadonlyArray<CollisionReport>): string {
  if (collisions.length === 0) {
    return "None";
  }
  return collisions
    .map((collision) =>
      `${collision.canonicalKey}: ${collision.originalKeys.join(" → ")}`,
    )
    .join("; ");
}

function formatJson(value: JsonValue): string {
  return JSON.stringify(value);
}

function describePolicy(policy: CanonicalPolicy): string {
  const parts: ReadonlyArray<string> = [
    policy.sortArrays ? "sort arrays" : "preserve array order",
    policy.caseInsensitiveKeys ? "case-insensitive keys" : "case-sensitive keys",
  ];
  return parts.join(", ");
}

export const canonicalizationAndExtendedEjsonPolicies: RunnableExample = {
  id: "013",
  title: "Canonicalization and extended EJSON policies",
  outlineReference: 13,
  summary:
    "Configurable canonicalization, collision reporting, canonical EJSON round-trips, and product-algebra analytics over JSON.",
  async run() {
    const messy: JsonValue = {
      Name: "Ada",
      name: "ADA",
      tags: ["z", "a", "m"],
      metrics: { views: 3, Views: 4 },
      nested: { list: [1, { inner: "value" }, 2] },
      active: true,
    };

    const defaultCanonical = canonicalizeJson(messy);

    const extendedPolicy: CanonicalPolicy = { sortArrays: true, caseInsensitiveKeys: true };
    const policyResult: CanonicalizationResult = canonicalizeJsonWithPolicy(messy, extendedPolicy);

    const ejsonResult = toCanonicalEJson(messy, extendedPolicy);
    const roundTrip = fromCanonicalEJson(ejsonResult.ejson);

    const numberSumFold: JsonFold<number> = {
      init: 0,
      combine: (accumulator, value) => (typeof value === "number" ? accumulator + value : accumulator),
    };

    const uniqueStringsFold: JsonFold<ReadonlyArray<string>> = {
      init: [],
      combine: (accumulator, value) => {
        if (typeof value !== "string") {
          return accumulator;
        }
        return accumulator.includes(value) ? accumulator : [...accumulator, value];
      },
    };

    const combinedFold = productFold(numberSumFold, uniqueStringsFold);
    const [sumOfNumbers, stringsEncountered] = foldJson(policyResult.canonical, combinedFold);
    const sortedStrings = stringsEncountered.toSorted();

    const logs = [
      "== Baseline canonicalization ==",
      `Original input: ${formatJson(messy)}`,
      `Default canonical form: ${formatJson(defaultCanonical)}`,
      "== Extended policy canonicalization ==",
      `Policy: ${describePolicy(extendedPolicy)}`,
      `Canonical form: ${formatJson(policyResult.canonical)}`,
      `Collisions: ${describeCollisions(policyResult.collisions)}`,
      "== Canonical EJSON serialization ==",
      `Canonical EJSON: ${JSON.stringify(ejsonResult.ejson)}`,
      `Round-tripped JSON: ${formatJson(roundTrip)}`,
      "== Product algebra analytics ==",
      `Sum of all numeric leaves: ${sumOfNumbers.toString()}`,
      `Unique string leaves: ${sortedStrings.join(", ") || "(none)"}`,
      `Canonical keys for strings: ${sortedStrings.map((value) => canonicalKey(value)).join(", ")}`,
    ];

    return { logs };
  },
};
