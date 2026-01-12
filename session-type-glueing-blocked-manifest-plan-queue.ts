import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export const SESSION_TYPE_GLUEING_BLOCKED_MANIFEST_PLAN_QUEUE_PATH = resolve(
  "session-type-glueing-blocked-manifest-plan-queue.json",
);

const readQueueFile = (): string[] => {
  try {
    const raw = readFileSync(SESSION_TYPE_GLUEING_BLOCKED_MANIFEST_PLAN_QUEUE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
      : [];
  } catch (error) {
    return [];
  }
};

const writeQueueFile = (entries: ReadonlyArray<string>): void => {
  if (entries.length === 0) {
    if (existsSync(SESSION_TYPE_GLUEING_BLOCKED_MANIFEST_PLAN_QUEUE_PATH)) {
      unlinkSync(SESSION_TYPE_GLUEING_BLOCKED_MANIFEST_PLAN_QUEUE_PATH);
    }
    return;
  }
  const resolved = SESSION_TYPE_GLUEING_BLOCKED_MANIFEST_PLAN_QUEUE_PATH;
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
};

const normalizePaths = (paths: Iterable<string>): string[] => {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const path of paths) {
    if (!path) {
      continue;
    }
    const resolved = resolve(path);
    if (seen.has(resolved)) {
      continue;
    }
    seen.add(resolved);
    normalized.push(resolved);
  }
  return normalized;
};

export const peekSessionTypeGlueingBlockedManifestPlanQueue = (): ReadonlyArray<string> => readQueueFile();

export const clearSessionTypeGlueingBlockedManifestPlanQueue = (): void => {
  writeQueueFile([]);
};

const formatBlockedManifestPlanQueueIssue = (paths: ReadonlyArray<string>): string => {
  const label = `blockedManifestPlanQueue.pending=${paths.length}`;
  if (paths.length === 0) {
    return label;
  }
  const sample = paths.slice(0, 3);
  const suffix = paths.length > sample.length ? ", …" : "";
  return `${label} (${sample.join(", ")}${suffix})`;
};

const normalizeBlockedManifestPlanQueueIssuePaths = (
  paths: ReadonlyArray<string>,
): ReadonlyArray<string> => {
  if (paths.length === 0) {
    return [];
  }
  const normalized = Array.from(new Set(paths.filter((path) => typeof path === "string" && path.length > 0)));
  return normalized.length > 0 ? normalized : [];
};

export const collectSessionTypeGlueingBlockedManifestPlanQueueIssuesFromPaths = (
  paths: ReadonlyArray<string>,
): string[] => {
  const normalized = normalizeBlockedManifestPlanQueueIssuePaths(paths);
  if (normalized.length === 0) {
    return [];
  }
  return [formatBlockedManifestPlanQueueIssue(normalized)];
};

export const collectSessionTypeGlueingBlockedManifestPlanQueueIssuesFromQueue = (): string[] =>
  collectSessionTypeGlueingBlockedManifestPlanQueueIssuesFromPaths(
    peekSessionTypeGlueingBlockedManifestPlanQueue(),
  );

export const collectSessionTypeGlueingBlockedManifestPlanQueueIssues = (options?: {
  readonly remaining?: ReadonlyArray<string>;
}): string[] => {
  if (!options?.remaining || options.remaining.length === 0) {
    return [];
  }
  return collectSessionTypeGlueingBlockedManifestPlanQueueIssuesFromPaths(options.remaining);
};

export const enqueueSessionTypeGlueingBlockedManifestPlanQueue = (
  paths: ReadonlyArray<string>,
): ReadonlyArray<string> => {
  if (paths.length === 0) {
    return [];
  }
  const existing = new Set(readQueueFile());
  const normalized = normalizePaths(paths);
  const added: string[] = [];
  for (const entry of normalized) {
    if (existing.has(entry)) {
      continue;
    }
    existing.add(entry);
    added.push(entry);
  }
  if (added.length > 0) {
    writeQueueFile(Array.from(existing));
  }
  return added;
};

export const removeSessionTypeGlueingBlockedManifestPlanQueueEntries = (
  paths: ReadonlyArray<string>,
): ReadonlyArray<string> => {
  if (paths.length === 0) {
    return [];
  }
  const normalized = new Set(normalizePaths(paths));
  const existing = readQueueFile();
  const next = existing.filter((entry) => !normalized.has(entry));
  if (next.length === existing.length) {
    return [];
  }
  writeQueueFile(next);
  return next;
};
