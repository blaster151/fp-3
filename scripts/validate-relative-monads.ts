#!/usr/bin/env ts-node

declare const process: {
  readonly argv: ReadonlyArray<string>;
  cwd(): string;
  exitCode?: number;
};
import { promises as fs } from "fs";
import { TwoObjectCategory } from "../two-object-cat";
import { virtualizeFiniteCategory } from "../virtual-equipment/adapters";
import {
  describeTrivialRelativeMonad,
  enumerateRelativeMonadOracles,
  RelativeMonadLawRegistry,
  loadPolynomialStreetRegistryEntry,
} from "../relative";
import type { RelativeMonadOracleResult } from "../relative/relative-oracles";

type AggregatedStreetRollupAnalyzerReport = {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly details: string;
  readonly issues?: ReadonlyArray<string>;
};

type AggregatedStreetRollupArtifacts = {
  readonly streetRollups?: {
    readonly holds: boolean;
    readonly pending: boolean;
    readonly details: string;
    readonly extensions: ReadonlyArray<unknown>;
    readonly kleisli: ReadonlyArray<unknown>;
  };
  readonly reports?: {
    readonly yoneda: AggregatedStreetRollupAnalyzerReport;
    readonly yonedaDistributor: AggregatedStreetRollupAnalyzerReport;
    readonly eilenbergMoore: AggregatedStreetRollupAnalyzerReport;
    readonly kleisli: AggregatedStreetRollupAnalyzerReport;
    readonly vcat: AggregatedStreetRollupAnalyzerReport;
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isAggregatedStreetRollupArtifacts = (
  value: unknown,
): value is AggregatedStreetRollupArtifacts =>
  isRecord(value) &&
  ("streetRollups" in value || "reports" in value);

type CliOptions = {
  readonly aggregatedJsonPath?: string;
};

type CliParseResult =
  | { readonly ok: true; readonly options: CliOptions }
  | { readonly ok: false; readonly message: string; readonly exitCode: number };

function usage(): string {
  return [
    "Usage: npm run validate-relative-monads [--aggregated-json <file>]",
    "  --aggregated-json | --json  Write the aggregated Street roll-up entry to the given JSON file.",
    "  --help | -h                  Show this help message.",
  ].join("\n");
}

const parseCliArgs = (argv: ReadonlyArray<string>): CliParseResult => {
  let options: CliOptions = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg) {
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      return { ok: false, message: usage(), exitCode: 0 };
    }
    if (arg === "--aggregated-json" || arg === "--json") {
      const next = argv[index + 1];
      if (!next) {
        return {
          ok: false,
          message: "--aggregated-json flag requires a file path argument",
          exitCode: 1,
        };
      }
      options = { ...options, aggregatedJsonPath: next };
      index += 1;
      continue;
    }
    return { ok: false, message: `Unknown argument: ${arg}`, exitCode: 1 };
  }
  return { ok: true, options };
};

const isAbsolutePath = (filePath: string): boolean =>
  filePath.startsWith("/") || /^[A-Za-z]:[\\/]/.test(filePath);

const resolveOutputPath = (filePath: string, cwd: string): string =>
  isAbsolutePath(filePath)
    ? filePath
    : `${cwd.replace(/[\\/]+$/, "")}/${filePath.replace(/^[\\/]+/, "")}`;

const formatAnalyzerReport = (
  label: string,
  report: AggregatedStreetRollupAnalyzerReport,
): string => {
  const status = report.holds ? "✔" : report.pending ? "⧗" : "✘";
  return `${status} ${label} (pending: ${report.pending ? "yes" : "no"})`;
};

const describeAggregatedStreetRollups = (
  entry: RelativeMonadOracleResult,
): ReadonlyArray<string> => {
  if (!isAggregatedStreetRollupArtifacts(entry.artifacts)) {
    return [];
  }

  const lines: string[] = [];
  lines.push(`  details: ${entry.details}`);
  if (entry.issues?.length) {
    lines.push("  issues:");
    for (const issue of entry.issues) {
      lines.push(`    - ${issue}`);
    }
  }

  if (entry.artifacts?.reports) {
    lines.push("  analyzer verdicts:");
    const { reports } = entry.artifacts;
    lines.push(`    ${formatAnalyzerReport("Yoneda", reports.yoneda)}`);
    lines.push(`    ${formatAnalyzerReport("Yoneda distributor", reports.yonedaDistributor)}`);
    lines.push(`    ${formatAnalyzerReport("Eilenberg–Moore", reports.eilenbergMoore)}`);
    lines.push(`    ${formatAnalyzerReport("Kleisli inclusion", reports.kleisli)}`);
    lines.push(`    ${formatAnalyzerReport("V-Cat", reports.vcat)}`);
  }

  if (entry.artifacts?.streetRollups) {
    const rollups = entry.artifacts.streetRollups;
    lines.push("  street roll-up payload:");
    lines.push(`    pending: ${rollups.pending ? "yes" : "no"}`);
    lines.push(`    extensions captured: ${rollups.extensions.length}`);
    lines.push(`    kleisli captured: ${rollups.kleisli.length}`);
  }

  return lines;
};

export interface ValidateRelativeMonadsRunOptions {
  readonly aggregatedJsonPath?: string;
  readonly log?: (line: string) => void;
  readonly cwd?: string;
  readonly writeFile?: (filePath: string, contents: string) => Promise<void>;
}

export interface ValidateRelativeMonadsRunResult {
  readonly results: ReadonlyArray<RelativeMonadOracleResult>;
  readonly aggregated?: RelativeMonadOracleResult;
}

export const run = async (
  options: ValidateRelativeMonadsRunOptions = {},
): Promise<ValidateRelativeMonadsRunResult> => {
  const log = options.log ?? ((line: string) => console.log(line));
  const cwd = options.cwd ?? process.cwd();
  const writeFile =
    options.writeFile ??
    (async (filePath: string, contents: string) => {
      await fs.writeFile(filePath, contents, "utf8");
    });

  log("validate-relative-monads: loading Street presentations from registry");
  const { harness, report, rollup } = loadPolynomialStreetRegistryEntry();

  log("validate-relative-monads: constructing trivial relative monad");
  const equipment = virtualizeFiniteCategory(TwoObjectCategory);
  const rootObject = TwoObjectCategory.objects[0] ?? "•";
  const trivial = describeTrivialRelativeMonad(equipment, rootObject);

  log("validate-relative-monads: enumerating relative monad oracles");
  const results = enumerateRelativeMonadOracles(trivial, {
    polynomialStreetHarness: harness,
    polynomialStreetReport: report,
    polynomialStreetRollup: rollup,
  });

  const aggregatedPath =
    RelativeMonadLawRegistry.polynomialStreetRollupAggregation.registryPath;
  let aggregatedEntry: RelativeMonadOracleResult | undefined;
  for (const entry of results) {
    log(`- ${entry.registryPath}: pending=${entry.pending} holds=${entry.holds}`);
    if (entry.registryPath === aggregatedPath) {
      aggregatedEntry = entry;
      const summaryLines = describeAggregatedStreetRollups(entry);
      for (const line of summaryLines) {
        log(line);
      }
    }
  }

  if (options.aggregatedJsonPath) {
    if (!aggregatedEntry) {
      throw new Error(
        "Aggregated Street roll-up entry not found in enumeration results.",
      );
    }
    const resolved = resolveOutputPath(options.aggregatedJsonPath, cwd);
    const payload = JSON.stringify(aggregatedEntry, null, 2);
    await writeFile(resolved, `${payload}\n`);
    log(
      `validate-relative-monads: wrote aggregated Street roll-up JSON to ${resolved}`,
    );
  }

  log(
    "validate-relative-monads: aggregated Street roll-up summary surfaced alongside analyzer verdicts.",
  );

  return { results, aggregated: aggregatedEntry };
};

async function main(): Promise<void> {
  const parsed = parseCliArgs(process.argv.slice(2));
  if (!parsed.ok) {
    console.log(parsed.message);
    if (parsed.exitCode !== 0) {
      console.log("");
      console.log(usage());
    }
    process.exitCode = parsed.exitCode;
    return;
  }
  await run(parsed.options);
}

main().catch((error) => {
  console.error("validate-relative-monads: unexpected failure", error);
  process.exitCode = 1;
});
