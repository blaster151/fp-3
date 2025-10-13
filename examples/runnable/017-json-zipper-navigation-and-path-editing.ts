import type { RunnableExample } from "./types";
import { JsonValue } from "./json-canonical";

type ObjectEntry = readonly [string, JsonValue];

type Breadcrumb =
  | {
      readonly kind: "object";
      readonly key: string;
      readonly before: ReadonlyArray<ObjectEntry>;
      readonly after: ReadonlyArray<ObjectEntry>;
    }
  | {
      readonly kind: "array";
      readonly before: ReadonlyArray<JsonValue>;
      readonly after: ReadonlyArray<JsonValue>;
    };

type JsonZipper = {
  readonly focus: JsonValue;
  readonly breadcrumbs: ReadonlyArray<Breadcrumb>;
};

const document: JsonValue = {
  user: {
    name: "Ada Lovelace",
    roles: ["admin", "maintainer"],
    contact: {
      email: "ada@example.com",
      location: { city: "London", timezone: "UTC" },
    },
  },
  activity: [
    { type: "login", at: "2023-10-04T08:15:00Z", metadata: { ip: "127.0.0.1" } },
    { type: "deploy", at: "2023-10-04T09:20:00Z", metadata: { service: "analytics" } },
  ],
};

const isObject = (value: JsonValue): value is { readonly [key: string]: JsonValue } =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const ensureObject = (value: JsonValue): { readonly [key: string]: JsonValue } => {
  if (!isObject(value)) {
    throw new Error("Expected object focus");
  }
  return value;
};

const ensureArray = (value: JsonValue): ReadonlyArray<JsonValue> => {
  if (!Array.isArray(value)) {
    throw new Error("Expected array focus");
  }
  return value;
};

const ensureString = (value: JsonValue): string => {
  if (typeof value !== "string") {
    throw new Error("Expected string focus");
  }
  return value;
};

const zipFromJson = (value: JsonValue): JsonZipper => ({ focus: value, breadcrumbs: [] });

const replaceFocus = (zipper: JsonZipper, value: JsonValue): JsonZipper => ({
  focus: value,
  breadcrumbs: zipper.breadcrumbs,
});

const downField = (zipper: JsonZipper, key: string): JsonZipper => {
  const object = ensureObject(zipper.focus);
  const entries: ObjectEntry[] = Object.entries(object) as ObjectEntry[];
  const index = entries.findIndex(([candidate]) => candidate === key);
  if (index === -1) {
    throw new Error(`Key ${key} not found in object focus`);
  }
  const before = entries.slice(0, index);
  const after = entries.slice(index + 1);
  const entry = entries[index];
  if (entry === undefined) {
    throw new Error(`Invariant violation: entry for key ${key} missing after bounds check`);
  }
  return {
    focus: entry[1],
    breadcrumbs: [
      { kind: "object", key, before, after },
      ...zipper.breadcrumbs,
    ],
  };
};

const downIndex = (zipper: JsonZipper, index: number): JsonZipper => {
  const array = ensureArray(zipper.focus);
  if (index < 0 || index >= array.length) {
    throw new Error(`Index ${index} out of bounds for array focus`);
  }
  const before = array.slice(0, index);
  const after = array.slice(index + 1);
  const element = array[index];
  if (element === undefined) {
    throw new Error(`Invariant violation: array element ${index} missing after bounds check`);
  }
  return {
    focus: element,
    breadcrumbs: [
      { kind: "array", before, after },
      ...zipper.breadcrumbs,
    ],
  };
};

const up = (zipper: JsonZipper): JsonZipper => {
  const [crumb, ...rest] = zipper.breadcrumbs;
  if (!crumb) {
    return zipper;
  }
  if (crumb.kind === "array") {
    const rebuilt = [...crumb.before, zipper.focus, ...crumb.after];
    return { focus: rebuilt, breadcrumbs: rest };
  }
  const rebuiltEntries: ObjectEntry[] = [
    ...crumb.before,
    [crumb.key, zipper.focus],
    ...crumb.after,
  ];
  const rebuiltObject = Object.fromEntries(rebuiltEntries);
  return { focus: rebuiltObject, breadcrumbs: rest };
};

const left = (zipper: JsonZipper): JsonZipper => {
  const [crumb, ...rest] = zipper.breadcrumbs;
  if (!crumb || crumb.kind !== "array" || crumb.before.length === 0) {
    throw new Error("Cannot move left from current position");
  }
  const newFocus = crumb.before[crumb.before.length - 1];
  if (newFocus === undefined) {
    throw new Error("Invariant violation: array breadcrumb missing left element");
  }
  const newBefore = crumb.before.slice(0, -1);
  const newAfter = [zipper.focus, ...crumb.after];
  return {
    focus: newFocus,
    breadcrumbs: [{ kind: "array", before: newBefore, after: newAfter }, ...rest],
  };
};

const right = (zipper: JsonZipper): JsonZipper => {
  const [crumb, ...rest] = zipper.breadcrumbs;
  if (!crumb || crumb.kind !== "array" || crumb.after.length === 0) {
    throw new Error("Cannot move right from current position");
  }
  const [next, ...remainingAfter] = crumb.after;
  if (next === undefined) {
    throw new Error("Invariant violation: array breadcrumb missing right element");
  }
  const newBefore = [...crumb.before, zipper.focus];
  return {
    focus: next,
    breadcrumbs: [{ kind: "array", before: newBefore, after: remainingAfter }, ...rest],
  };
};

const upToRoot = (zipper: JsonZipper): JsonZipper => {
  let current = zipper;
  while (current.breadcrumbs.length > 0) {
    current = up(current);
  }
  return current;
};

const navigatePath = (
  zipper: JsonZipper,
  path: ReadonlyArray<string | number>,
): JsonZipper =>
  path.reduce<JsonZipper>((current, segment) => {
    if (typeof segment === "number") {
      return downIndex(current, segment);
    }
    return downField(current, segment);
  }, zipper);

const modifyAtPath = (
  value: JsonValue,
  path: ReadonlyArray<string | number>,
  updater: (current: JsonValue) => JsonValue,
): JsonValue => {
  const target = navigatePath(zipFromJson(value), path);
  const updated = replaceFocus(target, updater(target.focus));
  return upToRoot(updated).focus;
};

const formatJson = (value: JsonValue): string => JSON.stringify(value);

export const jsonZipperNavigationAndPathEditing: RunnableExample = {
  id: "017",
  title: "JSON zipper navigation and path editing",
  outlineReference: 17,
  summary:
    "Bidirectional traversals edit JSON zippers in place, while path updates reuse the same zipper machinery for focused rewrites.",
  async run() {
    const starting = zipFromJson(document);

    const user = downField(starting, "user");
    const roles = downField(user, "roles");
    const secondRole = downIndex(roles, 1);
    const promoted = replaceFocus(secondRole, "moderator");
    const firstRole = left(promoted);
    const emphasised = replaceFocus(firstRole, `${ensureString(firstRole.focus)}-lead`);
    const rolesUpdated = up(emphasised);
    const userWithRoles = up(rolesUpdated);
    const userObject = ensureObject(userWithRoles.focus);
    const userWithStatus = replaceFocus(userWithRoles, { ...userObject, status: "active" });
    const afterUserUpdate = up(userWithStatus);

    const withMetadataUpdate = modifyAtPath(afterUserUpdate.focus, ["activity", 0, "metadata"], (current) => {
      const metadata = ensureObject(current);
      return { ...metadata, ip: "203.0.113.42", device: "sso" };
    });

    const deploymentTweaked = modifyAtPath(withMetadataUpdate, ["activity", 1, "metadata", "service"], (current) => {
      const serviceName = ensureString(current);
      return `${serviceName}-blue`;
    });

    const logs = [
      "== Starting document ==",
      formatJson(document),
      "== Promote and edit roles via zipper traversal ==",
      formatJson(upToRoot(rolesUpdated).focus),
      "== Add status to user while remaining in focus ==",
      formatJson(upToRoot(afterUserUpdate).focus),
      "== Path-based metadata edits (no re-traversal boilerplate) ==",
      formatJson(withMetadataUpdate),
      "== Final document after chained edits ==",
      JSON.stringify(deploymentTweaked, null, 2),
    ];

    return { logs };
  },
};
