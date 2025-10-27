import type { ContinuousMap, ContinuityWitnessEntry, ContinuityWitnessPayload } from "./ContinuousMap";

export type ContEntry<A, B> = {
  readonly tag: string;
  readonly morphism: ContinuousMap<A, B>;
};

export type ContReportEntry = {
  readonly tag: string;
  readonly holds: boolean;
  readonly verified: boolean;
  readonly failures: ReadonlyArray<ContinuityWitnessEntry<unknown, unknown>>;
  readonly witness?: ContinuityWitnessPayload<unknown, unknown>;
};

export type ContSummary = {
  readonly total: number;
  readonly passes: number;
  readonly failures: number;
  readonly failingTags: ReadonlyArray<string>;
};

export type ContRegistry = {
  readonly register: <A, B>(entry: ContEntry<A, B>) => void;
  readonly clear: () => void;
  readonly all: () => ReadonlyArray<ContEntry<unknown, unknown>>;
  readonly runAll: () => ReadonlyArray<ContReportEntry>;
  readonly summarize: (report?: ReadonlyArray<ContReportEntry>) => ContSummary;
  readonly toJson: (report?: ReadonlyArray<ContReportEntry>) => string;
  readonly toMarkdown: (report?: ReadonlyArray<ContReportEntry>) => string;
};

export function createContRegistry(): ContRegistry {
  const entries: ContEntry<unknown, unknown>[] = [];

  const widenEntry = <A, B>(entry: ContEntry<A, B>): ContEntry<unknown, unknown> => ({
    tag: entry.tag,
    morphism: entry.morphism as unknown as ContinuousMap<unknown, unknown>,
  });

  const register = <A, B>(entry: ContEntry<A, B>): void => {
    entries.push(widenEntry(entry));
  };

  const clear = (): void => {
    entries.length = 0;
  };

  const all = (): ReadonlyArray<ContEntry<unknown, unknown>> => entries.slice();

  const runAll = (): ReadonlyArray<ContReportEntry> => {
    return all().map((entry) => {
      const certificate = entry.morphism.witness;
      const verified = certificate.verify();
      return {
        tag: entry.tag,
        holds: certificate.holds,
        verified,
        failures: certificate.failures,
        ...(certificate.witness ? { witness: certificate.witness } : {}),
      };
    });
  };

  const summarize = (report: ReadonlyArray<ContReportEntry> = runAll()): ContSummary => {
    const failing = report.filter((entry) => !entry.holds || !entry.verified);
    return {
      total: report.length,
      passes: report.length - failing.length,
      failures: failing.length,
      failingTags: failing.map((entry) => entry.tag),
    };
  };

  const toJson = (report: ReadonlyArray<ContReportEntry> = runAll()): string => {
    const summary = summarize(report);
    return JSON.stringify({ summary, report }, null, 2);
  };

  const toMarkdown = (report: ReadonlyArray<ContReportEntry> = runAll()): string => {
    const header = "| Tag | Holds | Verified | Failures | Witness note |";
    const separator = "| --- | --- | --- | --- | --- |";
    const rows = report.map((entry) => {
      const failureCount = entry.failures.length;
      const note = entry.witness?.note ?? "";
      return `| ${entry.tag} | ${entry.holds ? "✅" : "❌"} | ${entry.verified ? "✅" : "❌"} | ${failureCount} | ${note} |`;
    });
    const summary = summarize(report);
    const footer = `\nTotal: ${summary.total}, Passes: ${summary.passes}, Failures: ${summary.failures}`;
    return [header, separator, ...rows].join("\n") + footer;
  };

  return {
    register,
    clear,
    all,
    runAll,
    summarize,
    toJson,
    toMarkdown,
  };
}

export type { ContReportEntry as ContRegistryEntry, ContSummary as ContRegistrySummary };
