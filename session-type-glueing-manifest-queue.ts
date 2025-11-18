import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export const SESSION_TYPE_GLUEING_MANIFEST_QUEUE_PATH = resolve(
  "session-type-glueing-manifest-queue.json",
);

const readQueueFile = (): string[] => {
  try {
    const raw = readFileSync(SESSION_TYPE_GLUEING_MANIFEST_QUEUE_PATH, "utf8");
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
    if (existsSync(SESSION_TYPE_GLUEING_MANIFEST_QUEUE_PATH)) {
      unlinkSync(SESSION_TYPE_GLUEING_MANIFEST_QUEUE_PATH);
    }
    return;
  }
  const resolved = SESSION_TYPE_GLUEING_MANIFEST_QUEUE_PATH;
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

export const peekSessionTypeGlueingManifestQueue = (): string[] => readQueueFile();

export const clearSessionTypeGlueingManifestQueue = (): void => {
  writeQueueFile([]);
};

export const enqueueSessionTypeGlueingManifestQueue = (
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

export const consumeSessionTypeGlueingManifestQueue = (): ReadonlyArray<string> => {
  const entries = readQueueFile();
  if (entries.length > 0) {
    writeQueueFile([]);
  }
  return entries;
};
