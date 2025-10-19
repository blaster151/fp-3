import type { RunnableExample } from "./types";

declare function require(id: string): any;

type CoalgebraLawCounterexample<A> =
  import("../../comonad-k1").CoalgebraLawCounterexample<A>;

type RelativeComoduleReport<Obj, Arr, Payload, Evidence> =
  import("../../relative/relative-comonads").RelativeComoduleReport<
    Obj,
    Arr,
    Payload,
    Evidence
  >;

type RelativeComoduleWitness<Obj, Arr, Payload, Evidence> =
  import("../../relative/relative-comonads").RelativeComoduleWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;

type RelativeComonadData<Obj, Arr, Payload, Evidence> =
  import("../../relative/relative-comonads").RelativeComonadData<
    Obj,
    Arr,
    Payload,
    Evidence
  >;

const toIssueSummary = <A>(report: {
  counterexamples: ReadonlyArray<CoalgebraLawCounterexample<A>>;
}): string[] => {
  if (report.counterexamples.length === 0) {
    return ["All sampled coalgebra laws held."];
  }
  const [first, ...rest] = report.counterexamples;
  const lines = [
    `First counterexample at sample ${String(first.sample)} violates ${first.law}.`,
    `  actual   → ${JSON.stringify(first.actual)}`,
    `  expected → ${JSON.stringify(first.expected)}`,
  ];
  if (rest.length > 0) {
    lines.push(`Additional counterexamples observed: ${rest.length}`);
  }
  return lines;
};

const renderComoduleIssues = <Obj, Arr, Payload, Evidence>(
  label: string,
  report: RelativeComoduleReport<Obj, Arr, Payload, Evidence>,
): string[] => {
  const prefix = `${label} → ${report.holds ? "holds" : "fails"}`;
  if (report.holds) {
    return [prefix, `  details: ${report.details}`];
  }
  const lines = [prefix];
  report.issues.slice(0, 3).forEach((issue, index) => {
    const bullet = index === 0 ? "  issue:" : "        ";
    lines.push(`${bullet} ${issue}`);
  });
  if (report.issues.length > 3) {
    lines.push(`  … ${report.issues.length - 3} more issue(s)`);
  }
  return lines;
};

function breakComodule<Obj, Arr, Payload, Evidence>(
  equipment: any,
  witness: RelativeComoduleWitness<Obj, Arr, Payload, Evidence>,
): RelativeComoduleWitness<Obj, Arr, Payload, Evidence> {
  const {
    identityVerticalBoundary,
  }: typeof import("../../virtual-equipment") = require("../../virtual-equipment");
  return {
    ...witness,
    coaction: {
      ...witness.coaction,
      boundaries: {
        ...witness.coaction.boundaries,
        right: identityVerticalBoundary(
          equipment,
          "★",
          "Broken right boundary to trigger diagnostics",
        ),
      },
    },
  };
}

function describeRelativeLayer<Obj, Arr, Payload, Evidence>(
  equipment: any,
  comonad: RelativeComonadData<Obj, Arr, Payload, Evidence>,
): {
  readonly trivial: RelativeComoduleReport<Obj, Arr, Payload, Evidence>;
  readonly broken: RelativeComoduleReport<Obj, Arr, Payload, Evidence>;
} {
  const relativeModule: typeof import("../../relative/relative-comonads") = require("../../relative/relative-comonads");
  const trivialWitness =
    relativeModule.describeTrivialRelativeComoduleWitness(comonad);
  const trivialReport = relativeModule.analyzeRelativeComodule(trivialWitness);
  const brokenReport = relativeModule.analyzeRelativeComodule(
    breakComodule(equipment, trivialWitness),
  );
  return { trivial: trivialReport, broken: brokenReport };
}

export const stage085ComonadCoalgebraAndRelativeComoduleDiagnostics: RunnableExample =
  {
    id: "085",
    title: "Comonad coalgebra and relative comodule diagnostics",
    outlineReference: 85,
    summary:
      "Runs the Pair coalgebra oracle and the relative comodule analyzer to surface successful witnesses alongside targeted counterexamples.",
    async run() {
      const {
        PairComonad,
        checkCoalgebraLaws,
      }: typeof import("../../comonad-k1") = require("../../comonad-k1");
      const {
        virtualizeFiniteCategory,
      }: typeof import("../../virtual-equipment/adapters") = require("../../virtual-equipment/adapters");
      const {
        TwoObjectCategory,
      }: typeof import("../../two-object-cat") = require("../../two-object-cat");
      const {
        describeTrivialRelativeComonad,
      }: typeof import("../../relative/relative-comonads") = require("../../relative/relative-comonads");

      const parityComonad = PairComonad<number>();
      const eq = (left: unknown, right: unknown) =>
        JSON.stringify(left) === JSON.stringify(right);
      const parityCoalgebra = (n: number) => [n % 2, n] as const;
      const brokenCoalgebra = (n: number) => [n % 2, n + 1] as const;

      const parityReport = checkCoalgebraLaws(parityComonad)(
        parityCoalgebra,
        eq,
        [0, 1, 2, 3, 4, 5],
      );
      const brokenReport = checkCoalgebraLaws(parityComonad)(
        brokenCoalgebra,
        eq,
        [0, 1, 2],
      );

      const equipment = virtualizeFiniteCategory(TwoObjectCategory);
      const trivialComonad = describeTrivialRelativeComonad(equipment, "•");
      const comoduleReports = describeRelativeLayer(equipment, trivialComonad);

      const logs: string[] = [
        "== Pair coalgebra oracle ==",
        `Parity coalgebra holds on samples → ${parityReport.holds}`,
        ...toIssueSummary(parityReport),
        "",
        "Broken coalgebra diagnostics:",
        ...toIssueSummary(brokenReport),
        "",
        "== Relative comodule analyzer ==",
        ...renderComoduleIssues("Trivial comodule", comoduleReports.trivial),
        ...renderComoduleIssues("Broken comodule", comoduleReports.broken),
      ];

      return { logs };
    },
  };
