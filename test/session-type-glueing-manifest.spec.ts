import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import type { SessionTypeGlueingConsumerDiffSummary } from "../session-type-glueing-consumer";
import type { SessionTypeGlueingSweepRunSnapshot } from "../session-type-glueing-dashboard";
import {
  buildSessionTypeGlueingManifestEntriesFromDiffSummary,
  buildSessionTypeGlueingManifestEntriesFromSnapshots,
  mergeSessionTypeGlueingManifestEntries,
  readSessionTypeGlueingManifestEntriesFromFile,
  readSessionTypeGlueingSweepEntriesFromManifest,
  sessionTypeGlueingManifestEntryToSweepEntry,
  writeSessionTypeGlueingManifest,
} from "../session-type-glueing-manifest";

const makeSnapshot = (
  label: string,
  assignments: Readonly<Record<string, string>> = { Y: "•" },
): SessionTypeGlueingSweepRunSnapshot => ({
  config: {
    label,
    sessionTypeLiteral: "Y",
    assignments,
    glueingSpan: "identity",
    source: label,
  },
  sessionMetadata: [],
  glueingMetadata: [],
  alignmentMetadata: [],
  alignmentNotes: [],
});

describe("session-type glueing manifest helpers", () => {
  it("dedupes manifest entries from snapshots", () => {
    const entries = buildSessionTypeGlueingManifestEntriesFromSnapshots([
      makeSnapshot("alpha"),
      makeSnapshot("alpha", { Y: "•" }),
      makeSnapshot("beta", { Y: "★" }),
    ]);
    expect(entries).toHaveLength(2);
    expect(entries[0]?.label).toBe("alpha");
    expect(entries[1]?.label).toBe("beta");
  });

  it("builds manifest entries from diff summaries with issue filtering", () => {
    const summary: SessionTypeGlueingConsumerDiffSummary = {
      schemaVersion: 1,
      totalRuns: 2,
      mismatchedRuns: 1,
      entries: [
        {
          config: {
            label: "issue",
            sessionTypeLiteral: "G₀",
            assignments: { Y: "★" },
            glueingSpan: "left-nontrivial",
            source: "record#1",
          },
          recorded: makeSnapshot("issue"),
          recomputed: {
            config: {
              label: "issue",
              sessionTypeLiteral: "G₀",
              assignments: { Y: "★" },
              glueingSpan: "left-nontrivial",
              source: "record#1",
            },
            sessionMetadata: [],
            glueingMetadata: [],
            alignmentMetadata: [],
            alignmentNotes: [],
            runnerHolds: false,
            runnerMismatches: 1,
          },
          alignmentMetadataDiff: { missing: [], unexpected: [] },
          alignmentNotesDiff: { missing: [], unexpected: [] },
          issues: ["runner.mismatches=1"],
        },
        {
          config: {
            label: "clean",
            sessionTypeLiteral: "Y",
            assignments: { Y: "•" },
            glueingSpan: "identity",
            source: "record#2",
          },
          recorded: makeSnapshot("clean"),
          recomputed: {
            config: {
              label: "clean",
              sessionTypeLiteral: "Y",
              assignments: { Y: "•" },
              glueingSpan: "identity",
              source: "record#2",
            },
            sessionMetadata: [],
            glueingMetadata: [],
            alignmentMetadata: [],
            alignmentNotes: [],
            runnerHolds: true,
            runnerMismatches: 0,
          },
          alignmentMetadataDiff: { missing: [], unexpected: [] },
          alignmentNotesDiff: { missing: [], unexpected: [] },
          issues: [],
        },
      ],
      sourceCoverageTotals: { manifestInputs: 0, blockedPlans: 0, total: 0 },
    };
    const entries = buildSessionTypeGlueingManifestEntriesFromDiffSummary(summary);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.label).toBe("issue");
  });

  it("filters diff-derived entries by manifest source paths", () => {
    const summary: SessionTypeGlueingConsumerDiffSummary = {
      schemaVersion: 1,
      totalRuns: 2,
      mismatchedRuns: 2,
      entries: [
        {
          config: {
            label: "from-allowed",
            sessionTypeLiteral: "Y",
            assignments: { Y: "•" },
            glueingSpan: "identity",
            source: "manifest:/tmp/allowed.json",
          },
          recorded: makeSnapshot("from-allowed"),
          recomputed: {
            config: {
              label: "from-allowed",
              sessionTypeLiteral: "Y",
              assignments: { Y: "•" },
              glueingSpan: "identity",
              source: "manifest:/tmp/allowed.json",
            },
            sessionMetadata: [],
            glueingMetadata: [],
            alignmentMetadata: [],
            alignmentNotes: [],
            runnerHolds: true,
            runnerMismatches: 0,
          },
          alignmentMetadataDiff: { missing: [], unexpected: [] },
          alignmentNotesDiff: { missing: [], unexpected: [] },
          issues: ["alignmentMetadata missing=1 unexpected=0"],
          manifestSource: { path: "/tmp/allowed.json" },
        },
        {
          config: {
            label: "from-blocked",
            sessionTypeLiteral: "Y",
            assignments: { Y: "•" },
            glueingSpan: "identity",
            source: "manifest:/tmp/blocked.json",
          },
          recorded: makeSnapshot("from-blocked"),
          recomputed: {
            config: {
              label: "from-blocked",
              sessionTypeLiteral: "Y",
              assignments: { Y: "•" },
              glueingSpan: "identity",
              source: "manifest:/tmp/blocked.json",
            },
            sessionMetadata: [],
            glueingMetadata: [],
            alignmentMetadata: [],
            alignmentNotes: [],
            runnerHolds: true,
            runnerMismatches: 0,
          },
          alignmentMetadataDiff: { missing: [], unexpected: [] },
          alignmentNotesDiff: { missing: [], unexpected: [] },
          issues: ["alignmentMetadata missing=1 unexpected=0"],
          manifestSource: { path: "/tmp/blocked.json" },
        },
      ],
      sourceCoverageTotals: { manifestInputs: 0, blockedPlans: 0, total: 0 },
    };
    const entries = buildSessionTypeGlueingManifestEntriesFromDiffSummary(summary, {
      allowedManifestSourcePaths: new Set(["/tmp/allowed.json"]),
    });
    expect(entries).toHaveLength(1);
    expect(entries[0]?.label).toBe("from-allowed");
  });

  it("writes manifest payloads for downstream sweeps", () => {
    const dir = mkdtempSync(join(tmpdir(), "manifest-test-"));
    const path = join(dir, "manifest.json");
    const entries = mergeSessionTypeGlueingManifestEntries(
      buildSessionTypeGlueingManifestEntriesFromSnapshots([makeSnapshot("alpha"), makeSnapshot("beta", { Z: "★" })]),
    );
    const result = writeSessionTypeGlueingManifest(path, entries);
    expect(result.entryCount).toBe(2);
    const parsed = JSON.parse(readFileSync(result.path, "utf8")) as Array<Record<string, unknown>>;
    expect(parsed).toHaveLength(2);
    expect(parsed[0]?.["assignments"]).toEqual({ Y: "•" });
  });

  it("reads manifest entries from disk", () => {
    const dir = mkdtempSync(join(tmpdir(), "manifest-read-"));
    const path = join(dir, "manifest.json");
    const payload = [
      {
        label: "alpha",
        sessionTypeLiteral: "Y",
        assignments: { Y: "•" },
        glueingSpan: "identity",
      },
    ];
    writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    const entries = readSessionTypeGlueingManifestEntriesFromFile(path);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.label).toBe("alpha");
  });

  it("converts manifest entries into sweep entries", () => {
    const entry = {
      label: "beta",
      sessionTypeLiteral: "G₀Y",
      assignments: { Y: "★" },
      glueingSpan: "left-nontrivial",
      source: "manual",
    } as const;
    const sweepEntry = sessionTypeGlueingManifestEntryToSweepEntry(entry);
    expect(sweepEntry.label).toBe("beta");
    expect(sweepEntry.source).toBe("manual");
  });

  it("reads sweep entries from manifest files", () => {
    const dir = mkdtempSync(join(tmpdir(), "manifest-sweep-"));
    const path = join(dir, "manifest.json");
    writeFileSync(
      path,
      `${
        JSON.stringify(
          [
            {
              label: "gamma",
              sessionTypeLiteral: "Y",
              assignments: { Y: "•" },
              glueingSpan: "identity",
            },
          ],
          null,
          2,
        )
      }\n`,
      "utf8",
    );
    const entries = readSessionTypeGlueingSweepEntriesFromManifest(path);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.source).toContain("manifest:");
  });
});
