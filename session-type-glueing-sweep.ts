import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  DEFAULT_SESSION_TYPE_CHANNEL,
  DEFAULT_SESSION_TYPE_LITERAL,
  DEFAULT_SESSION_TYPE_OBJECT,
} from "./session-type-glueing-cli";
import {
  normalizeExample8GlueingSpanVariant,
  type Example8GlueingSpanVariant,
} from "./session-type-glueing.examples";
import type {
  SessionTypeGlueingSweepRecord,
  SessionTypeGlueingSweepRunSnapshot,
} from "./session-type-glueing-dashboard";

export interface SessionTypeGlueingSweepEntry {
  readonly label?: string;
  readonly sessionTypeLiteral?: string;
  readonly assignments?: Readonly<Record<string, string>>;
  readonly glueingSpan?: string;
  readonly source?: string;
}

export interface SessionTypeGlueingSweepConfig {
  readonly label: string;
  readonly sessionTypeLiteral: string;
  readonly assignments: Readonly<Record<string, string>>;
  readonly glueingSpan: Example8GlueingSpanVariant;
  readonly source: string;
}

const ensureNonEmptyString = (value: string, errorMessage: string): string => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(errorMessage);
  }
  return trimmed;
};

const parseAssignmentLiteral = (value: string): [string, string] => {
  const separator = value.includes("=") ? "=" : value.includes(":") ? ":" : undefined;
  if (!separator) {
    throw new Error(
      `Assignment '${value}' must provide a channel and kernel object using '=' or ':'.`,
    );
  }
  const [rawChannel, rawObject] = value.split(separator, 2);
  if (!rawChannel || !rawObject) {
    throw new Error(`Assignment '${value}' must specify both a channel and a kernel object.`);
  }
  const channel = ensureNonEmptyString(rawChannel, `Assignment '${value}' has an empty channel name.`);
  const object = ensureNonEmptyString(rawObject, `Assignment '${value}' has an empty kernel object.`);
  return [channel, object];
};

const mergeAssignments = (
  target: Map<string, string>,
  assignments?: Readonly<Record<string, string>>,
): void => {
  if (!assignments) {
    return;
  }
  for (const [channel, object] of Object.entries(assignments)) {
    target.set(
      ensureNonEmptyString(channel, "Assignment channel names must be non-empty."),
      ensureNonEmptyString(object, `Assignment value for '${channel}' must be non-empty.`),
    );
  }
};

export const parseSessionTypeGlueingSweepValue = (
  raw: string,
  source: string,
): SessionTypeGlueingSweepEntry => {
  const entryAssignments = new Map<string, string>();
  let sessionTypeLiteral: string | undefined;
  let glueingSpan: string | undefined;
  let label: string | undefined;

  for (const segment of raw.split(";")) {
    const trimmed = segment.trim();
    if (!trimmed) {
      continue;
    }
    const separatorIndex = trimmed.indexOf(":");
    if (separatorIndex === -1) {
      throw new Error(`Sweep token '${trimmed}' must be of the form key:value.`);
    }
    const key = trimmed
      .slice(0, separatorIndex)
      .trim()
      .toLowerCase();
    const value = trimmed.slice(separatorIndex + 1).trim();
    switch (key) {
      case "session-type":
        sessionTypeLiteral = ensureNonEmptyString(value, "Session-type literal must be non-empty.");
        break;
      case "glueing-span":
        glueingSpan = ensureNonEmptyString(value, "Glueing span variant must be non-empty.");
        break;
      case "label":
        label = ensureNonEmptyString(value, "Sweep labels must be non-empty.");
        break;
      case "assignment": {
        const [channel, object] = parseAssignmentLiteral(value);
        entryAssignments.set(channel, object);
        break;
      }
      case "assignment-json": {
        let parsed: unknown;
        try {
          parsed = JSON.parse(value);
        } catch (error) {
          throw new Error(`Failed to parse assignment JSON '${value}': ${String(error)}`);
        }
        if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("Assignment JSON must be an object mapping channel names to kernel objects.");
        }
        mergeAssignments(entryAssignments, parsed as Record<string, string>);
        break;
      }
      default:
        throw new Error(`Unknown sweep token key '${key}' in '${segment}'.`);
    }
  }

  return {
    ...(label ? { label } : {}),
    ...(sessionTypeLiteral ? { sessionTypeLiteral } : {}),
    ...(glueingSpan ? { glueingSpan } : {}),
    ...(entryAssignments.size > 0 ? { assignments: Object.fromEntries(entryAssignments) } : {}),
    source,
  };
};

interface NormalizeOptions {
  readonly index: number;
  readonly labelPrefix?: string;
  readonly source?: string;
}

export const normalizeSessionTypeGlueingSweepEntry = (
  entry: SessionTypeGlueingSweepEntry,
  options: NormalizeOptions,
): SessionTypeGlueingSweepConfig => {
  const labelPrefix = options.labelPrefix ?? "sweep";
  const fallbackLabel = `${labelPrefix}-${options.index + 1}`;
  const label = entry.label?.trim().length ? entry.label.trim() : fallbackLabel;
  const sessionTypeLiteral = entry.sessionTypeLiteral?.trim().length
    ? entry.sessionTypeLiteral.trim()
    : DEFAULT_SESSION_TYPE_LITERAL;
  const assignments = new Map<string, string>();
  mergeAssignments(assignments, entry.assignments);
  if (assignments.size === 0) {
    assignments.set(DEFAULT_SESSION_TYPE_CHANNEL, DEFAULT_SESSION_TYPE_OBJECT);
  }
  const glueingSpan = normalizeExample8GlueingSpanVariant(entry.glueingSpan);
  const sortedAssignments = Array.from(assignments.entries()).sort((first, second) =>
    first[0].localeCompare(second[0]),
  );
  return {
    label,
    sessionTypeLiteral,
    assignments: Object.fromEntries(sortedAssignments),
    glueingSpan,
    source: entry.source ?? options.source ?? fallbackLabel,
  };
};

export const describeSessionTypeGlueingAssignments = (
  assignments: Readonly<Record<string, string>>,
): string => {
  const channels = Object.keys(assignments).sort((left, right) => left.localeCompare(right));
  const pairs = channels.map((channel) => [channel, assignments[channel]] as [string, string]);
  return JSON.stringify(pairs);
};

const buildEntryFromRecord = (
  resolved: string,
  index: number,
  config: SessionTypeGlueingSweepRunSnapshot["config"],
): SessionTypeGlueingSweepEntry => ({
  ...(config.label ? { label: config.label } : {}),
  ...(config.sessionTypeLiteral ? { sessionTypeLiteral: config.sessionTypeLiteral } : {}),
  ...(config.glueingSpan ? { glueingSpan: config.glueingSpan } : {}),
  ...(config.assignments ? { assignments: config.assignments } : {}),
  source: `${resolved}#run-${index + 1}`,
});

const buildEntryFromObject = (
  resolved: string,
  index: number,
  value: Record<string, unknown>,
): SessionTypeGlueingSweepEntry => {
  const labelValue = value["label"];
  const sessionTypeValue = value["sessionType"] ?? value["sessionTypeLiteral"];
  const glueingSpanValue = value["glueingSpan"];
  const assignmentsValue = value["assignments"];
  if (assignmentsValue && typeof assignmentsValue === "object" && !Array.isArray(assignmentsValue)) {
    const assignmentRecord: Record<string, string> = {};
    for (const [channel, object] of Object.entries(assignmentsValue as Record<string, unknown>)) {
      if (typeof object !== "string") {
        throw new Error(
          `Sweep entry ${index + 1} in '${resolved}' has a non-string assignment for channel '${channel}'.`,
        );
      }
      assignmentRecord[channel] = object;
    }
    if (Object.keys(assignmentRecord).length > 0) {
      return {
        ...(typeof labelValue === "string" && labelValue.trim().length > 0 ? { label: labelValue } : {}),
        ...(typeof sessionTypeValue === "string" && sessionTypeValue.trim().length > 0
          ? { sessionTypeLiteral: sessionTypeValue }
          : {}),
        ...(typeof glueingSpanValue === "string" && glueingSpanValue.trim().length > 0
          ? { glueingSpan: glueingSpanValue }
          : {}),
        assignments: assignmentRecord,
        source: `${resolved}#${index + 1}`,
      } satisfies SessionTypeGlueingSweepEntry;
    }
  }
  return {
    ...(typeof labelValue === "string" && labelValue.trim().length > 0 ? { label: labelValue } : {}),
    ...(typeof sessionTypeValue === "string" && sessionTypeValue.trim().length > 0
      ? { sessionTypeLiteral: sessionTypeValue }
      : {}),
    ...(typeof glueingSpanValue === "string" && glueingSpanValue.trim().length > 0
      ? { glueingSpan: glueingSpanValue }
      : {}),
    source: `${resolved}#${index + 1}`,
  } satisfies SessionTypeGlueingSweepEntry;
};

export const readSessionTypeGlueingSweepEntriesFromFile = (path: string): SessionTypeGlueingSweepEntry[] => {
  const resolved = resolve(path);
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(resolved, "utf8"));
  } catch (error) {
    throw new Error(`Failed to parse sweep file '${path}': ${String(error)}`);
  }
  if (Array.isArray(parsed)) {
    return parsed.map((value, index) => {
      if (value === null || typeof value !== "object" || Array.isArray(value)) {
        throw new Error(`Sweep entry ${index + 1} in '${path}' must be an object.`);
      }
      return buildEntryFromObject(resolved, index, value as Record<string, unknown>);
    });
  }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && Array.isArray((parsed as any).runs)) {
    return (parsed as SessionTypeGlueingSweepRecord).runs.map((run, index) =>
      buildEntryFromRecord(resolved, index, (run as SessionTypeGlueingSweepRunSnapshot).config),
    );
  }
  throw new Error(`Sweep file '${path}' must contain an array of configurations or a recorded sweep payload.`);
};
