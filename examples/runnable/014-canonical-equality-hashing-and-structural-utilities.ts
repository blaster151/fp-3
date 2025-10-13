import type { RunnableExample } from "./types";
import type { CanonicalPolicy, JsonValue } from "./json-canonical";
import {
  canonicalKey,
  canonicalizeJson,
  canonicalizeJsonWithPolicy,
  equalsCanonical,
  hashCanonical,
} from "./json-canonical";

function hashCons(values: ReadonlyArray<JsonValue>, policy: CanonicalPolicy): ReadonlyMap<string, JsonValue> {
  return values.reduce<ReadonlyMap<string, JsonValue>>((accumulator, value) => {
    const key = canonicalKey(value, policy);
    if (accumulator.has(key)) {
      return accumulator;
    }
    const canonical = canonicalizeJson(value, policy);
    return new Map([...accumulator.entries(), [key, canonical] as const]);
  }, new Map<string, JsonValue>());
}

function validateCanonicalConsistency(value: JsonValue, policy: CanonicalPolicy): ReadonlyArray<string> {
  const firstPass = canonicalizeJson(value, policy);
  const secondPass = canonicalizeJson(firstPass, policy);
  const keyStable = canonicalKey(value, policy) === canonicalKey(firstPass, policy);
  const idempotent = equalsCanonical(firstPass, secondPass, policy);
  return [
    idempotent ? "Canonicalization is idempotent." : "Canonicalization changed under a second pass.",
    keyStable ? "Canonical key is stable across passes." : "Canonical key changed between passes.",
  ];
}

function describePool(pool: ReadonlyMap<string, JsonValue>): string {
  if (pool.size === 0) {
    return "(empty)";
  }
  const entries = Array.from(pool.entries()).map(
    ([key, value]) => `${key} ↦ ${JSON.stringify(value)}`,
  );
  return entries.join("; ");
}

export const canonicalEqualityHashingAndStructuralUtilities: RunnableExample = {
  id: "014",
  title: "Canonical equality, hashing, and structural utilities",
  outlineReference: 14,
  summary:
    "Canonical equality checks, hash construction, hash-consing pools, and idempotence validations for JSON-derived structures.",
  async run() {
    const equalityPolicy: CanonicalPolicy = { sortArrays: true, caseInsensitiveKeys: false };

    const configA: JsonValue = {
      service: "api",
      flags: ["beta", "search"],
      metadata: { version: 1, region: "us" },
    };

    const configB: JsonValue = {
      metadata: { region: "us", version: 1 },
      flags: ["search", "beta"],
      service: "api",
    };

    const equalityHolds = equalsCanonical(configA, configB, equalityPolicy);

    const dataset: ReadonlyArray<JsonValue> = [
      { user: "ada", tags: ["z", "a"] },
      { tags: ["a", "z"], user: "ada" },
      { user: "grace", tags: ["compilers"] },
    ];

    const pool = hashCons(dataset, equalityPolicy);
    const hashedKeys = dataset.map((value) => ({
      key: canonicalKey(value, equalityPolicy),
      hash: hashCanonical(value, equalityPolicy),
    }));

    const validation = validateCanonicalConsistency(configA, equalityPolicy);
    const datasetCanonical = canonicalizeJsonWithPolicy(dataset, equalityPolicy);
    const policySummary = `Policy: ${equalityPolicy.sortArrays ? "sorted arrays" : "original array order"}`;

    const logs = [
      "== Canonical equality ==",
      `Config A: ${JSON.stringify(configA)}`,
      `Config B: ${JSON.stringify(configB)}`,
      policySummary,
      `Equal under policy: ${equalityHolds ? "yes" : "no"}`,
      "== Canonical hashes ==",
      ...hashedKeys.map((entry, index) =>
        `Dataset[${index}] → key ${entry.key}, hash ${entry.hash}`,
      ),
      "== Hash-consed pool ==",
      `Pool entries (${pool.size} of ${dataset.length} inputs): ${describePool(pool)}`,
      "== Consistency checks ==",
      ...validation,
      `Dataset collisions under policy: ${datasetCanonical.collisions.length}`,
    ];

    return { logs };
  },
};
