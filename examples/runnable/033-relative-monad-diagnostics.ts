import { RunnableExample } from "./types";

declare function require(id: string): any;

type OracleResult = {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly registryPath: string;
  readonly details: string;
  readonly issues?: ReadonlyArray<string>;
};

type Summary = {
  readonly label: string;
  readonly total: number;
  readonly active: number;
  readonly pending: number;
  readonly failing: ReadonlyArray<OracleResult>;
  readonly highlights: ReadonlyArray<string>;
  readonly pendingDetails: ReadonlyArray<string>;
};

type SimpleAnalysis = {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
};

const success = (details: string): SimpleAnalysis => ({ holds: true, issues: [], details });

function makeSkewMonoidBridgeInput(report: any, data: any) {
  return {
    relative: data,
    monoid: {
      object: data.looseCell.from,
      looseCell: data.looseCell,
      multiplication: data.extension,
      unit: data.unit,
    },
    monoidShape: success(
      "Identity loose monoid reuses the relative monad's unit and extension 2-cells.",
    ),
    representability: report,
    leftExtensions: {
      existence: success("Identity left extension exists by definition."),
      preservation: success("Identity extension functor preserves its own pointwise lifts."),
      absolute: success("Identity left extension is j-absolute with trivial comparison cells."),
      density: success("Identity tight 1-cell is dense via the equipment's identity restrictions."),
      rightUnit: success("Right unit of the identity companion is invertible on the nose."),
    },
  };
}

function summarise(label: string, results: ReadonlyArray<OracleResult>): Summary {
  const total = results.length;
  const active = results.filter((result) => result.holds && !result.pending);
  const pending = results.filter((result) => result.pending);
  const failing = results.filter((result) => !result.holds && !result.pending);

  const highlights = active.slice(0, 3).map((result) => `${result.registryPath} — ${result.details}`);
  const pendingDetails = pending
    .slice(0, 3)
    .map((result) => `${result.registryPath} — ${result.details}`);

  return {
    label,
    total,
    active: active.length,
    pending: pending.length,
    failing,
    highlights,
    pendingDetails,
  };
}

function renderSummary(summary: Summary): readonly string[] {
  const header = `== ${summary.label} ==`;
  const lines = [
    header,
    `Total oracles: ${summary.total}`,
    `✔ Active: ${summary.active}`,
    `⏳ Pending: ${summary.pending}`,
    `✘ Failing: ${summary.failing.length}`,
  ];

  if (summary.highlights.length > 0) {
    lines.push("Highlighted successes:");
    summary.highlights.forEach((detail) => {
      lines.push(`  • ${detail}`);
    });
  }

  if (summary.pendingDetails.length > 0) {
    lines.push("Pending coverage:");
    summary.pendingDetails.forEach((detail) => {
      lines.push(`  • ${detail}`);
    });
  }

  if (summary.failing.length > 0) {
    lines.push("Failure diagnostics:");
    summary.failing.forEach((result) => {
      lines.push(`  • ${result.registryPath}: ${result.details}`);
      if (result.issues && result.issues.length > 0) {
        result.issues.forEach((issue) => lines.push(`      - ${issue}`));
      }
    });
  }

  return lines;
}

function runRelativeMonadDiagnostics() {
  const virtualEquipmentAdapters: any = require("../../virtual-equipment/adapters");
  const twoObjectModule: any = require("../../two-object-cat");
  const relativeMonads: any = require("../../relative/relative-monads");
  const relativeOracles: any = require("../../relative/relative-oracles");
  const relativeAlgebras: any = require("../../relative/relative-algebras");
  const relativeAlgebraOracles: any = require("../../relative/relative-algebra-oracles");

  const equipment = virtualEquipmentAdapters.virtualizeFiniteCategory(twoObjectModule.TwoObjectCategory);
  const trivial = relativeMonads.describeTrivialRelativeMonad(equipment, "•");
  const leftRestriction = equipment.restrictions.left(trivial.root.tight, trivial.looseCell);
  if (!leftRestriction || !leftRestriction.representability) {
    throw new Error("Expected identity restriction to produce a representability witness.");
  }

  const representabilityReport = relativeMonads.analyzeRelativeMonadRepresentability(
    trivial,
    leftRestriction.representability,
  );
  const skewInput = makeSkewMonoidBridgeInput(representabilityReport, trivial);

  const monadOracles = relativeOracles.enumerateRelativeMonadOracles(trivial, {
    representabilityWitness: leftRestriction.representability,
    skewMonoidBridgeInput: skewInput,
  }) as ReadonlyArray<OracleResult>;

  const kleisli = relativeAlgebras.describeTrivialRelativeKleisli(trivial);
  const eilenbergMoore = relativeAlgebras.describeTrivialRelativeEilenbergMoore(trivial);
  const algebraOracles = relativeAlgebraOracles.enumerateRelativeAlgebraOracles(
    kleisli,
    eilenbergMoore,
  ) as ReadonlyArray<OracleResult>;

  const summaries = [
    summarise("Relative monad registry", monadOracles),
    summarise("Relative algebra & opalgebra registry", algebraOracles),
  ];

  const logs = summaries.flatMap((summary, index) => {
    const rendered = renderSummary(summary);
    return index === summaries.length - 1 ? rendered : [...rendered, ""];
  });

  return { logs };
}

export const stage033RelativeMonadDiagnostics: RunnableExample = {
  id: "033",
  title: "Relative monad diagnostics",
  outlineReference: 33,
  summary:
    "Enumerates the relative monad, algebra, and opalgebra oracle registries using the trivial two-object example to surface active, pending, and failing entries.",
  async run() {
    return runRelativeMonadDiagnostics();
  },
};
