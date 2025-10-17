export type JsonValue =
  | null
  | boolean
  | number
  | string
  | ReadonlyArray<JsonValue>
  | { readonly [key: string]: JsonValue };

export interface CanonicalPolicy {
  readonly sortArrays?: boolean;
  readonly caseInsensitiveKeys?: boolean;
}

export interface CollisionReport {
  readonly canonicalKey: string;
  readonly originalKeys: readonly string[];
}

export interface CanonicalizationResult {
  readonly canonical: JsonValue;
  readonly collisions: readonly CollisionReport[];
}

export type EJson =
  | { readonly type: "null" }
  | { readonly type: "boolean"; readonly value: boolean }
  | { readonly type: "number"; readonly value: number }
  | { readonly type: "string"; readonly value: string }
  | { readonly type: "array"; readonly items: readonly EJson[] }
  | { readonly type: "object"; readonly entries: readonly { readonly key: string; readonly value: EJson }[] };

export function canonicalizeJson(value: JsonValue, policy: CanonicalPolicy = {}): JsonValue {
  return canonicalizeJsonWithPolicy(value, policy).canonical;
}

export function canonicalizeJsonWithPolicy(
  value: JsonValue,
  policy: CanonicalPolicy = {},
): CanonicalizationResult {
  const { canonical, collisions } = canonicalizeInternal(value, policy);
  return {
    canonical,
    collisions,
  };
}

export function canonicalKey(value: JsonValue, policy: CanonicalPolicy = {}): string {
  const canonical = canonicalizeJson(value, policy);
  return stringifyCanonical(canonical);
}

export function equalsCanonical(a: JsonValue, b: JsonValue, policy: CanonicalPolicy = {}): boolean {
  return canonicalKey(a, policy) === canonicalKey(b, policy);
}

export function hashCanonical(value: JsonValue, policy: CanonicalPolicy = {}): string {
  const key = canonicalKey(value, policy);
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) | 0;
  }
  const normalized = hash >>> 0;
  return `h${normalized.toString(16).padStart(8, "0")}`;
}

export function toCanonicalEJson(
  value: JsonValue,
  policy: CanonicalPolicy = {},
): { readonly ejson: EJson; readonly collisions: readonly CollisionReport[] } {
  const result = canonicalizeJsonWithPolicy(value, policy);
  return {
    ejson: toEJson(result.canonical),
    collisions: result.collisions,
  };
}

export function fromCanonicalEJson(ejson: EJson): JsonValue {
  switch (ejson.type) {
    case "null":
      return null;
    case "boolean":
      return ejson.value;
    case "number":
      return ejson.value;
    case "string":
      return ejson.value;
    case "array":
      return ejson.items.map(fromCanonicalEJson);
    case "object": {
      const entries = ejson.entries.map(({ key, value }) => [key, fromCanonicalEJson(value)] as const);
      return Object.fromEntries(entries);
    }
    default: {
      const exhaustive: never = ejson;
      return exhaustive;
    }
  }
}

function canonicalizeInternal(
  value: JsonValue,
  policy: CanonicalPolicy,
): { readonly canonical: JsonValue; readonly collisions: readonly CollisionReport[] } {
  if (value === null || typeof value !== "object") {
    return { canonical: value, collisions: [] };
  }

  if (Array.isArray(value)) {
    const processed = value.map((item) => canonicalizeInternal(item, policy));
    const canonicalItems = processed.map((entry) => entry.canonical);
    const collisions = processed.flatMap((entry) => entry.collisions);
    const sortedItems = policy.sortArrays
      ? canonicalItems.toSorted((left, right) =>
          stringifyCanonical(left).localeCompare(stringifyCanonical(right)),
        )
      : canonicalItems;
    return {
      canonical: sortedItems,
      collisions,
    };
  }

  const entries = Object.entries(value).map(([key, raw]) => {
    const normalizedKey = policy.caseInsensitiveKeys ? key.toLowerCase() : key;
    const child = canonicalizeInternal(raw, policy);
    return {
      canonicalKey: normalizedKey,
      originalKey: key,
      canonicalValue: child.canonical,
      collisions: child.collisions,
    };
  });

  const grouped = entries.reduce<ReadonlyArray<{
    readonly canonicalKey: string;
    readonly values: ReadonlyArray<JsonValue>;
    readonly originalKeys: ReadonlyArray<string>;
    readonly collisions: ReadonlyArray<CollisionReport>;
  }>>((acc, entry) => {
    const existingIndex = acc.findIndex((candidate) => candidate.canonicalKey === entry.canonicalKey);
    if (existingIndex === -1) {
      return [
        ...acc,
        {
          canonicalKey: entry.canonicalKey,
          values: [entry.canonicalValue],
          originalKeys: [entry.originalKey],
          collisions: entry.collisions,
        },
      ];
    }

    return acc.map((candidate, index) => {
      if (index !== existingIndex) {
        return candidate;
      }
      return {
        canonicalKey: candidate.canonicalKey,
        values: [...candidate.values, entry.canonicalValue],
        originalKeys: [...candidate.originalKeys, entry.originalKey],
        collisions: [...candidate.collisions, ...entry.collisions],
      };
    });
  }, []);

  const sorted = grouped.toSorted((left, right) => left.canonicalKey.localeCompare(right.canonicalKey));

  const collisions = sorted.flatMap((entry) => {
    if (entry.originalKeys.length > 1) {
      return [
        {
          canonicalKey: entry.canonicalKey,
          originalKeys: entry.originalKeys,
        },
        ...entry.collisions,
      ];
    }
    return entry.collisions;
  });

  const canonicalObject = Object.fromEntries(
    sorted.map((entry) => [entry.canonicalKey, mergeDuplicateValues(entry.values)] as const),
  );

  return {
    canonical: canonicalObject,
    collisions,
  };
}

function mergeDuplicateValues(values: ReadonlyArray<JsonValue>): JsonValue {
  if (values.length <= 1) {
    return values[0] ?? null;
  }
  const ordered = values.toSorted((left, right) =>
    stringifyCanonical(left).localeCompare(stringifyCanonical(right)),
  );
  return ordered;
}

function toEJson(value: JsonValue): EJson {
  if (value === null) {
    return { type: "null" };
  }
  if (typeof value === "boolean") {
    return { type: "boolean", value };
  }
  if (typeof value === "number") {
    return { type: "number", value };
  }
  if (typeof value === "string") {
    return { type: "string", value };
  }
  if (Array.isArray(value)) {
    return { type: "array", items: value.map(toEJson) };
  }
  const entries = Object.entries(value).map(([key, child]) => ({ key, value: toEJson(child) }));
  const sorted = entries.toSorted((left, right) => left.key.localeCompare(right.key));
  return { type: "object", entries: sorted };
}

function stringifyCanonical(value: JsonValue): string {
  if (value === null) {
    return "null";
  }
  if (typeof value === "boolean" || typeof value === "number") {
    return JSON.stringify(value);
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    const items = value.map((item) => stringifyCanonical(item)).join(",");
    return `[${items}]`;
  }
  const entries = Object.entries(value);
  const body = entries
    .map(([key, child]) => `${JSON.stringify(key)}:${stringifyCanonical(child)}`)
    .join(",");
  return `{${body}}`;
}
