import type { ContinuityWitnessEntry } from "../../src/top/ContinuousMap";
import type {
  MediatorCheckResult,
  UniversalPropertyReport,
} from "../../src/top/limits";
import type { RunnableExample } from "./types";

declare function require(id: string): any;

type LimitsModule = typeof import("../../src/top/limits");
type ContinuousMapModule = typeof import("../../src/top/ContinuousMap");
type SpacesModule = typeof import("../../src/top/Spaces");

type LegDescriptor = { readonly tag: string };

type TaggedFailure = {
  readonly tag: string;
  readonly failure: ContinuityWitnessEntry<number, number>;
};

type ContinuityError = Error & { readonly witness?: { readonly failures: ReadonlyArray<ContinuityWitnessEntry<number, number>> } };

const { coneLeg, coconeLeg, makeMediator, makeUniversalPropertyReport } = require("../../src/top/limits") as LimitsModule;
const { makeContinuousMap, productStructure, pairing } = require("../../src/top/ContinuousMap") as ContinuousMapModule;
const { discreteSpace, sierpinskiStructure } = require("../../src/top/Spaces") as SpacesModule;

const eqNum = (a: number, b: number) => a === b;

function attemptNonContinuous(): TaggedFailure | undefined {
  const source = sierpinskiStructure();
  const target = discreteSpace([0, 1], eqNum);
  try {
    makeContinuousMap<number, number>({
      source,
      target,
      map: (x) => x,
    });
    return undefined;
  } catch (error) {
    const witness = (error as ContinuityError).witness;
    if (!witness || witness.failures.length === 0) {
      return undefined;
    }
    return {
      tag: "π₂",
      failure: witness.failures[0]!,
    };
  }
}

function buildProductReport(): UniversalPropertyReport<string, string, LegDescriptor, { readonly witnessNote: string }> {
  const X = discreteSpace([0, 1], eqNum);
  const Y = discreteSpace([10, 20], eqNum);
  const structure = productStructure(eqNum, eqNum, X, Y);

  const f = makeContinuousMap<number, number>({
    source: X,
    target: X,
    map: (x) => (x === 0 ? 0 : 1),
  });
  const g = makeContinuousMap<number, number>({
    source: X,
    target: Y,
    map: (x) => (x === 0 ? 10 : 20),
  });
  const pair = pairing(f, g, { topology: structure.topology, eq: structure.eq });

  const legs = [
    { leg: coneLeg("π₁", "Top/cont/proj1"), holds: true, metadata: { tag: "Top/cont/proj1" } satisfies LegDescriptor },
    { leg: coneLeg("π₂", "Top/cont/proj2"), holds: true, metadata: { tag: "Top/cont/proj2" } satisfies LegDescriptor },
  ];
  const mediators: ReadonlyArray<MediatorCheckResult<string, { readonly witnessNote: string }>> = [
    {
      mediator: makeMediator("⟨f,g⟩", "Top/cont/pair"),
      holds: true,
      metadata: { witnessNote: pair.witness.witness?.note ?? "" },
    },
  ];
  return makeUniversalPropertyReport({ legs, mediators });
}

function buildFailureReport(taggedFailure: TaggedFailure | undefined): UniversalPropertyReport<string, string, TaggedFailure, TaggedFailure> {
  const legs = [
    taggedFailure
      ? {
          leg: coconeLeg("π₂", taggedFailure.tag),
          holds: false,
          failure: `Non-open preimage ${taggedFailure.failure.preimage.join(",")}`,
          metadata: taggedFailure,
        }
      : { leg: coconeLeg("π₂", "missing"), holds: false, failure: "Continuity witness unavailable." },
  ];
  const mediators = [
    {
      mediator: makeMediator("κ", "Top/cont/copair"),
      holds: false,
      failure: "Mediator fails compatibility with π₂.",
      metadata: taggedFailure,
    },
  ];
  return makeUniversalPropertyReport({ legs, mediators });
}

function describeLeg(entry: {
  readonly leg: { readonly name: string };
  readonly holds: boolean;
  readonly failure?: string;
  readonly metadata?: unknown;
}): string {
  const tag = entry.metadata && typeof entry.metadata === "object" && entry.metadata !== null && "tag" in entry.metadata
    ? (entry.metadata as { readonly tag: string }).tag
    : undefined;
  const status = entry.holds ? "holds" : `fails (${entry.failure ?? "no reason"})`;
  return tag ? `  ${entry.leg.name}: ${status} — tag ${tag}` : `  ${entry.leg.name}: ${status}`;
}

function describeMediator(entry: MediatorCheckResult<string, unknown>): string {
  const prefix = `  ${entry.mediator.name}: ${entry.holds ? "holds" : `fails (${entry.failure ?? "no reason"})`}`;
  if (entry.metadata && typeof entry.metadata === "object" && "witnessNote" in entry.metadata) {
    return `${prefix} — note: ${(entry.metadata as { readonly witnessNote: string }).witnessNote}`;
  }
  if (entry.metadata && typeof entry.metadata === "object" && entry.metadata !== null && "tag" in entry.metadata) {
    return `${prefix} — tag ${(entry.metadata as { readonly tag: string }).tag}`;
  }
  return prefix;
}

function describeReport(
  label: string,
  report: UniversalPropertyReport<string, string, LegDescriptor | TaggedFailure, { readonly witnessNote: string } | TaggedFailure>,
): readonly string[] {
  const legLines = report.legs.map(describeLeg);
  const mediatorLines = report.mediators.map((entry) => describeMediator(entry as MediatorCheckResult<string, unknown>));
  const failures = report.failures.length === 0 ? "none" : report.failures.join("; ");
  return [
    `== ${label} ==`,
    `  holds? ${report.holds}`,
    ...legLines,
    ...mediatorLines,
    `  aggregated failures: ${failures}`,
  ];
}

export const stage083TopUniversalPropertyReports: RunnableExample = {
  id: "083",
  title: "Unified limit and colimit reporters",
  outlineReference: 83,
  summary:
    "Assemble product legs and mediators into universal-property reports, then contrast them with a failure that reuses continuity witness metadata.",
  run: async () => {
    const taggedFailure = attemptNonContinuous();
    const success = buildProductReport();
    const failure = buildFailureReport(taggedFailure);
    const failureReport = failure as UniversalPropertyReport<
      string,
      string,
      LegDescriptor | TaggedFailure,
      { readonly witnessNote: string } | TaggedFailure
    >;
    return {
      logs: [
        ...describeReport("Product universal property", success),
        "",
        ...describeReport("Failure scenario", failureReport),
      ],
    };
  },
};
