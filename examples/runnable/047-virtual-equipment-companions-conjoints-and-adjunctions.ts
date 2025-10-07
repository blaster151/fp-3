import { RunnableExample } from "./types";

declare function require(id: string): any;

const { TwoObjectCategory } = require("../../two-object-cat") as any;
const { virtualizeFiniteCategory } = require("../../virtual-equipment/adapters") as any;
const { companionViaIdentityRestrictions } = require("../../virtual-equipment/companions") as any;
const { conjointViaIdentityRestrictions } = require("../../virtual-equipment/conjoints") as any;
const { summarizeEquipmentOracles } = require("../../virtual-equipment/equipment-oracles") as any;
const { identityProarrow } = require("../../virtual-equipment/virtual-equipment") as any;
const { IndexedFamilies, FieldReal, LanPoset } = require("../../allTS") as any;

type Attempt = {
  readonly available: boolean;
  readonly details: string;
  readonly representability?: { readonly object: unknown };
};

type OracleResult = ReturnType<typeof summarizeEquipmentOracles>;

type SigmaSample = { readonly j: number; readonly x: string };

type Choice = ReadonlyArray<readonly [number, string]>;

function describeCompanion(label: string, attempt: Attempt): string {
  if (attempt.available) {
    const witness = attempt.representability
      ? ` via representable object ${String(attempt.representability.object)}`
      : " without representability witness";
    return `Companion for ${label}: available${witness}. Details: ${attempt.details}`;
  }
  return `Companion for ${label}: unavailable — ${attempt.details}`;
}

function describeConjoint(label: string, attempt: Attempt): string {
  if (attempt.available) {
    const witness = attempt.representability
      ? ` via representable object ${String(attempt.representability.object)}`
      : " without representability witness";
    return `Conjoint for ${label}: available${witness}. Details: ${attempt.details}`;
  }
  return `Conjoint for ${label}: unavailable — ${attempt.details}`;
}

function summariseOracles(summary: OracleResult): readonly string[] {
  const groups = [
    summary.companion.unit,
    summary.companion.counit,
    summary.conjoint.unit,
    summary.conjoint.counit,
    summary.looseMonad.unit,
    summary.looseMonad.multiplication,
    summary.skew.composition,
    summary.maps.representableRight,
    summary.extensions.rightExtension,
    summary.extensions.rightLift,
    summary.extensions.compatibility,
    summary.weighted.cone,
    summary.weighted.cocone,
    summary.weighted.colimitRestriction,
    summary.weighted.limitRestriction,
    summary.weighted.leftExtension,
    summary.density.identity,
    summary.faithfulness.restrictions,
    summary.faithfulness.pointwise,
    summary.faithfulness.leftExtension,
    summary.absolute.colimit,
    summary.absolute.leftExtension,
    summary.absolute.pointwiseLeftLift,
  ];

  const pending = groups.filter((entry: any) => entry.pending);
  const active = groups.filter((entry: any) => entry.holds && !entry.pending);
  const headline = summary.overall
    ? "All registered oracles satisfied."
    : `Coverage pending for ${pending.length} of ${groups.length} equipment oracles.`;

  const preview = pending.slice(0, 3).map((entry: any) => `  • ${entry.registryPath}: ${entry.details}`);
  const successes = active.slice(0, 2).map((entry: any) => `  • ${entry.registryPath}: ${entry.details}`);

  return [
    "== Equipment oracle registry ==",
    headline,
    `Active oracles: ${active.length}`,
    `Pending oracles: ${pending.length}`,
    ...(successes.length > 0 ? ["Representative successes:", ...successes] : []),
    ...(preview.length > 0 ? ["Representative gaps:", ...preview] : []),
  ];
}

function analyseSigmaPiChain(): readonly string[] {
  const Jcar = [0, 1, 2, 3] as const;
  const u = (j: number) => (j < 2 ? 0 : 1);
  const Jfin = { carrier: Jcar as ReadonlyArray<number> };

  const sigmaUnit = IndexedFamilies.unitSigmaEnum(u, Jfin);
  const sigmaCounit = IndexedFamilies.counitSigmaEnum(u, Jfin);
  const sigmaTriangle = IndexedFamilies.sigmaOfUnitEnum(u, Jfin);

  const sigmaElement: SigmaSample = { j: 1, x: "payload" };
  const sigmaIndex = u(sigmaElement.j);
  const throughTriangle = sigmaTriangle(sigmaIndex)(sigmaElement);
  const sigmaReturned = sigmaCounit(sigmaIndex)(throughTriangle);

  const piUnit = IndexedFamilies.unitPiEnum(u, Jfin);
  const piCounit = IndexedFamilies.counitPiEnum(u, Jfin);
  const etaForPi = IndexedFamilies.etaForPiEnum(u, Jfin);
  const piOfEps = IndexedFamilies.PiOfEpsEnum(u, Jfin);

  const piIndex = 0;
  const piPayload = "sections";
  const piChoice: Choice = piUnit(piIndex)(piPayload);
  const pulled = etaForPi(piIndex)(piChoice);
  const stabilised = piOfEps(piIndex)(pulled);
  const fibreWitness = piCounit(1)(piChoice);

  return [
    "== Σ ⊣ u* ⊣ Π adjunction checks ==",
    `σ-unit maps element to tagged fibre: ${JSON.stringify(sigmaUnit(1)("alpha"))}`,
    `Σ triangle round-trip: original=${JSON.stringify(sigmaElement)}, recovered=${JSON.stringify(sigmaReturned)}`,
    `Π-unit creates constant choice: ${JSON.stringify(piChoice)}`,
    `Π triangle stabilises choices: ${JSON.stringify(stabilised)}`,
    `Π counit picks fibre element at j=1 → ${fibreWitness}`,
  ];
}

function analyseVectKanExtension(): readonly string[] {
  const makeComplex = (dimension: number) => ({
    S: FieldReal,
    degrees: [0],
    dim: { 0: dimension },
    d: {},
  });

  const basePoset = {
    objects: ["x", "y"] as const,
    leq: (a: string, b: string) => a === b || (a === "x" && b === "y"),
  };

  const diagram = {
    I: basePoset,
    X: {
      x: makeComplex(1),
      y: makeComplex(2),
    },
    arr: (a: string, b: string) => {
      if (!basePoset.leq(a, b)) {
        return undefined;
      }
      if (a === b) {
        return { S: FieldReal, X: makeComplex(a === "x" ? 1 : 2), Y: makeComplex(a === "x" ? 1 : 2), f: { 0: [[1]] } };
      }
      return { S: FieldReal, X: makeComplex(1), Y: makeComplex(2), f: { 0: [[1], [1]] } };
    },
  };

  const lan = LanPoset(FieldReal)((j: string) => j, basePoset, basePoset)(diagram);
  const lanX = lan.X["x"];
  const lanY = lan.X["y"];
  const universal = lan.arr("x", "y");

  return [
    "== Vect-valued Kan extension ==",
    `Lan(x) dimension in degree 0 → ${lanX?.dim?.[0] ?? 0}`,
    `Lan(y) dimension in degree 0 → ${lanY?.dim?.[0] ?? 0}`,
    universal ? `Universal arrow x→y matrix → ${JSON.stringify(universal.f[0])}` : "Universal arrow x→y missing",
  ];
}

export const stage047VirtualEquipmentCompanionsConjointsAndAdjunctions: RunnableExample = {
  id: "047",
  title: "Virtual equipment companions, conjoints, and adjunctions",
  outlineReference: 47,
  summary:
    "Compute companion and conjoint availability in the two-object equipment, summarise pending virtual-equipment oracles, rebuild Σ ⊣ u* ⊣ Π triangle checks, and run a small Vect-valued Kan extension.",
  async run() {
    const equipment = virtualizeFiniteCategory(TwoObjectCategory);
    const identityCompanion = companionViaIdentityRestrictions(equipment, equipment.tight.identity) as Attempt;

    const constantFunctor = {
      source: equipment.tight.category,
      target: equipment.tight.category,
      onObj: (_: unknown) => "•",
      onMor: (_: unknown) => TwoObjectCategory.id("•"),
    } as const;

    const constantCompanion = companionViaIdentityRestrictions(equipment, constantFunctor) as Attempt;
    const identityConjoint = conjointViaIdentityRestrictions(equipment, equipment.tight.identity) as Attempt;
    const constantConjoint = conjointViaIdentityRestrictions(equipment, constantFunctor) as Attempt;

    const identityLoose = identityProarrow(equipment, "•");
    const looseSummary = `Identity loose arrow witnesses: from=${identityLoose.from} to=${identityLoose.to}`;

    const oracleSummary = summarizeEquipmentOracles();

    const companionSection = [
      "== Companion and conjoint availability ==",
      describeCompanion("identity", identityCompanion),
      describeCompanion("constant-to-•", constantCompanion),
      describeConjoint("identity", identityConjoint),
      describeConjoint("constant-to-•", constantConjoint),
      looseSummary,
    ];

    const sigmaPiSection = analyseSigmaPiChain();
    const kanSection = analyseVectKanExtension();
    const oracleSection = summariseOracles(oracleSummary);

    return { logs: [...companionSection, "", ...oracleSection, "", ...sigmaPiSection, "", ...kanSection] };
  },
};
