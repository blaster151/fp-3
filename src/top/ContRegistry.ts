import type { ContinuousMap, ContinuityWitnessEntry, ContinuityWitnessPayload } from "./ContinuousMap";

export type ContEntry<A, B> = {
  readonly tag: string;
  readonly morphism: ContinuousMap<A, B>;
};

const entries: ContEntry<any, any>[] = [];

export function registerCont<A, B>(entry: ContEntry<A, B>): void {
  entries.push(entry);
}

export function clearCont(): void {
  entries.length = 0;
}

export function allCont(): ReadonlyArray<ContEntry<any, any>> {
  return entries.slice();
}

export type ContReportEntry = {
  readonly tag: string;
  readonly holds: boolean;
  readonly verified: boolean;
  readonly failures: ReadonlyArray<ContinuityWitnessEntry<any, any>>;
  readonly witness?: ContinuityWitnessPayload<any, any>;
};

export type ContSummary = {
  readonly total: number;
  readonly passes: number;
  readonly failures: number;
  readonly failingTags: ReadonlyArray<string>;
};

export function runContAll(): ReadonlyArray<ContReportEntry> {
  return entries.map((entry) => {
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
}

export function summarizeCont(report: ReadonlyArray<ContReportEntry> = runContAll()): ContSummary {
  const failing = report.filter((entry) => !entry.holds || !entry.verified);
  return {
    total: report.length,
    passes: report.length - failing.length,
    failures: failing.length,
    failingTags: failing.map((entry) => entry.tag),
  };
}

export function contReportToJson(report: ReadonlyArray<ContReportEntry> = runContAll()): string {
  const summary = summarizeCont(report);
  return JSON.stringify({ summary, report }, null, 2);
}

export function contReportToMarkdown(report: ReadonlyArray<ContReportEntry> = runContAll()): string {
  const header = "| Tag | Holds | Verified | Failures | Witness note |";
  const separator = "| --- | --- | --- | --- | --- |";
  const rows = report.map((entry) => {
    const failureCount = entry.failures.length;
    const note = entry.witness?.note ?? "";
    return `| ${entry.tag} | ${entry.holds ? "✅" : "❌"} | ${entry.verified ? "✅" : "❌"} | ${failureCount} | ${note} |`;
  });
  const summary = summarizeCont(report);
  const footer = `\nTotal: ${summary.total}, Passes: ${summary.passes}, Failures: ${summary.failures}`;
  return [header, separator, ...rows].join("\n") + footer;
}
