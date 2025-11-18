import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import type { SessionTypeGlueingConsumerDiffSummary } from "./session-type-glueing-consumer";
import type {
  SessionTypeGlueingBlockedManifestPlanEntry,
  SessionTypeGlueingSweepRunSnapshot,
} from "./session-type-glueing-dashboard";
import { normalizeExample8GlueingSpanVariant } from "./session-type-glueing.examples";
import type {
  SessionTypeGlueingSweepConfig,
  SessionTypeGlueingSweepEntry,
} from "./session-type-glueing-sweep";
import { describeSessionTypeGlueingAssignments } from "./session-type-glueing-sweep";

export interface SessionTypeGlueingManifestEntry {
  readonly label: string;
  readonly sessionTypeLiteral: string;
  readonly assignments: Readonly<Record<string, string>>;
  readonly glueingSpan: string;
  readonly source?: string;
}

const cloneAssignments = (assignments: Readonly<Record<string, string>>): Record<string, string> => {
  const entries = Object.entries(assignments);
  entries.sort((left, right) => left[0].localeCompare(right[0]));
  return Object.fromEntries(entries);
};

const manifestEntryKey = (entry: SessionTypeGlueingManifestEntry): string =>
  `${entry.label}|${entry.sessionTypeLiteral}|${entry.glueingSpan}|${describeSessionTypeGlueingAssignments(entry.assignments)}`;

const dedupeManifestEntries = (
  entries: ReadonlyArray<SessionTypeGlueingManifestEntry>,
): SessionTypeGlueingManifestEntry[] => {
  const map = new Map<string, SessionTypeGlueingManifestEntry>();
  for (const entry of entries) {
    const normalized: SessionTypeGlueingManifestEntry = {
      label: entry.label,
      sessionTypeLiteral: entry.sessionTypeLiteral,
      glueingSpan: entry.glueingSpan,
      assignments: cloneAssignments(entry.assignments),
      ...(entry.source ? { source: entry.source } : {}),
    };
    const key = manifestEntryKey(normalized);
    if (!map.has(key)) {
      map.set(key, normalized);
    }
  }
  return Array.from(map.values()).sort((left, right) => manifestEntryKey(left).localeCompare(manifestEntryKey(right)));
};

const configsToManifestEntries = (
  configs: ReadonlyArray<SessionTypeGlueingSweepConfig>,
): SessionTypeGlueingManifestEntry[] =>
  dedupeManifestEntries(
    configs.map((config) => ({
      label: config.label,
      sessionTypeLiteral: config.sessionTypeLiteral,
      assignments: config.assignments,
      glueingSpan: config.glueingSpan,
      ...(config.source ? { source: config.source } : {}),
    })),
  );

export const buildSessionTypeGlueingManifestEntriesFromSnapshots = (
  snapshots: ReadonlyArray<SessionTypeGlueingSweepRunSnapshot>,
): SessionTypeGlueingManifestEntry[] => configsToManifestEntries(snapshots.map((snapshot) => snapshot.config));

export const buildSessionTypeGlueingManifestEntriesFromConfigs = configsToManifestEntries;

export const buildSessionTypeGlueingManifestEntriesFromBlockedManifestPlan = (
  plan: SessionTypeGlueingBlockedManifestPlanEntry,
): SessionTypeGlueingManifestEntry[] =>
  configsToManifestEntries(
    plan.entries.map((entry) => ({
      label: entry.label,
      sessionTypeLiteral: entry.sessionTypeLiteral,
      assignments: entry.assignments,
      glueingSpan: normalizeExample8GlueingSpanVariant(entry.glueingSpan),
      source: plan.sourcePath,
    })),
  );

export const buildSessionTypeGlueingManifestEntriesFromBlockedManifestPlans = (
  plans: ReadonlyArray<SessionTypeGlueingBlockedManifestPlanEntry>,
): SessionTypeGlueingManifestEntry[] =>
  mergeSessionTypeGlueingManifestEntries(
    ...plans.map((plan) => buildSessionTypeGlueingManifestEntriesFromBlockedManifestPlan(plan)),
  );

export const buildSessionTypeGlueingManifestEntriesFromDiffSummary = (
  summary: SessionTypeGlueingConsumerDiffSummary,
  options: {
    requireIssues?: boolean;
    allowedManifestSourcePaths?: ReadonlySet<string>;
  } = {},
): SessionTypeGlueingManifestEntry[] => {
  const requireIssues = options.requireIssues ?? true;
  const allowedManifestSourcePaths = options.allowedManifestSourcePaths;
  const filterManifestSources = !!(allowedManifestSourcePaths && allowedManifestSourcePaths.size > 0);
  const configs: SessionTypeGlueingSweepConfig[] = [];
  for (const entry of summary.entries) {
    if (requireIssues && entry.issues.length === 0) {
      continue;
    }
    if (filterManifestSources) {
      const manifestPath = entry.manifestSource?.path;
      if (manifestPath && !allowedManifestSourcePaths?.has(manifestPath)) {
        continue;
      }
    }
    configs.push(entry.config);
  }
  return configsToManifestEntries(configs);
};

export const mergeSessionTypeGlueingManifestEntries = (
  ...collections: ReadonlyArray<ReadonlyArray<SessionTypeGlueingManifestEntry>>
): SessionTypeGlueingManifestEntry[] => {
  const merged: SessionTypeGlueingManifestEntry[] = [];
  for (const collection of collections) {
    merged.push(...collection);
  }
  return dedupeManifestEntries(merged);
};

export const writeSessionTypeGlueingManifest = (
  path: string,
  entries: ReadonlyArray<SessionTypeGlueingManifestEntry>,
): { path: string; entryCount: number } => {
  const resolved = resolve(path);
  mkdirSync(dirname(resolved), { recursive: true });
  const payload = entries.map((entry) => ({
    label: entry.label,
    sessionTypeLiteral: entry.sessionTypeLiteral,
    glueingSpan: entry.glueingSpan,
    assignments: entry.assignments,
  }));
  writeFileSync(resolved, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return { path: resolved, entryCount: payload.length };
};

const ensureString = (value: unknown, error: string): string => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(error);
  }
  return value;
};

const ensureAssignments = (
  value: unknown,
  error: string,
): Record<string, string> => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(error);
  }
  const assignments: Record<string, string> = {};
  for (const [channel, object] of Object.entries(value)) {
    assignments[ensureString(channel, "Manifest assignment channels must be strings.")] = ensureString(
      object,
      `Manifest assignment for '${channel}' must be a string.`,
    );
  }
  return assignments;
};

export const readSessionTypeGlueingManifestEntriesFromFile = (
  path: string,
): SessionTypeGlueingManifestEntry[] => {
  const resolved = resolve(path);
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(resolved, "utf8"));
  } catch (error) {
    throw new Error(`Failed to read manifest '${resolved}': ${String(error)}`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`Manifest '${resolved}' must contain an array of entries.`);
  }
  return parsed.map((entry, index) => {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`Manifest '${resolved}' entry #${index + 1} must be an object.`);
    }
    const record = entry as Record<string, unknown>;
    const label = ensureString(
      (record["label"] ?? `manifest#${index + 1}`) as unknown,
      `Manifest '${resolved}' entry #${index + 1} is missing a label.`,
    );
    const sessionTypeLiteral = ensureString(
      record["sessionTypeLiteral"],
      `Manifest '${resolved}' entry '${label}' must specify a session-type literal.`,
    );
    const glueingSpan = ensureString(
      record["glueingSpan"],
      `Manifest '${resolved}' entry '${label}' must specify a glueing span variant.`,
    );
    const assignments = ensureAssignments(
      record["assignments"],
      `Manifest '${resolved}' entry '${label}' must provide assignment mappings.`,
    );
    const sourceValue = record["source"];
    return {
      label,
      sessionTypeLiteral,
      glueingSpan,
      assignments,
      ...(typeof sourceValue === "string" && sourceValue.trim() !== ""
        ? { source: sourceValue }
        : {}),
    } satisfies SessionTypeGlueingManifestEntry;
  });
};

export const sessionTypeGlueingManifestEntryToSweepEntry = (
  entry: SessionTypeGlueingManifestEntry,
  options: { source?: string } = {},
): SessionTypeGlueingSweepEntry => ({
  label: entry.label,
  sessionTypeLiteral: entry.sessionTypeLiteral,
  assignments: entry.assignments,
  glueingSpan: entry.glueingSpan,
  source: options.source ?? entry.source ?? "manifest",
});

export const readSessionTypeGlueingSweepEntriesFromManifest = (
  path: string,
  options: { source?: string } = {},
): SessionTypeGlueingSweepEntry[] => {
  const resolved = resolve(path);
  const manifestEntries = readSessionTypeGlueingManifestEntriesFromFile(resolved);
  const source = options.source ?? `manifest:${resolved}`;
  return manifestEntries.map((entry) =>
    sessionTypeGlueingManifestEntryToSweepEntry(entry, { source }),
  );
};
