import type { RunnableExample } from "./types";
import { TwoObjectCategory } from "../../two-object-cat";
import { virtualizeFiniteCategory } from "../../virtual-equipment/adapters";
import {
  analyzeADTPolynomialRelativeStreet,
  buildADTPolynomialRelativeStreetEnrichedBundle,
  rollupADTPolynomialRelativeStreet,
  type ADTPolynomialRelativeStreetInput,
} from "../../relative/adt-polynomial-relative";
import {
  analyzeRelativeEnrichedStreetRollups,
  describeRelativeEnrichedEilenbergMooreAlgebraWitness,
  describeRelativeEnrichedKleisliInclusionWitness,
  describeRelativeEnrichedMonadWitness,
  describeRelativeEnrichedVCatMonadWitness,
  describeRelativeEnrichedYonedaDistributorWitness,
  describeRelativeEnrichedYonedaWitness,
  describeTrivialRelativeMonad,
} from "../../relative/relative-monads";
import { RelativeMonadOracles } from "../../relative/relative-oracles";
import {
  defineADT,
  primitiveStrictEqualsWitness,
  witnessFromEquals,
  type ADTValue,
} from "../../src/algebra/adt/adt";

const NumericList = defineADT({
  typeName: "AggregatedStreetList",
  constructors: [
    { name: "Nil", fields: [] },
    {
      name: "Cons",
      fields: [
        { name: "head", witness: primitiveStrictEqualsWitness<number>() },
        {
          name: "tail",
          witness: witnessFromEquals<unknown>(() => true),
          recursion: "self",
        },
      ],
    },
  ] as const,
});

type ListConstructors = typeof NumericList.constructorsList;
type ListValue = ADTValue<ListConstructors>;

const { Nil, Cons } = NumericList.constructors;

const samples: ReadonlyArray<ListValue> = [
  Nil(),
  Cons({ head: 1, tail: Nil() }),
  Cons({ head: 2, tail: Cons({ head: 1, tail: Nil() }) }),
];

const identityAlgebra = {
  Nil: () => Nil(),
  Cons: ({ head, tail }: { readonly head: number; readonly tail: ListValue }) =>
    Cons({ head, tail }),
};

const appendZeroAlgebra = {
  Nil: () => Cons({ head: 0, tail: Nil() }),
  Cons: ({ head, tail }: { readonly head: number; readonly tail: ListValue }) =>
    Cons({ head, tail }),
};

const doubleAlgebra = {
  Nil: () => Nil(),
  Cons: ({ head, tail }: { readonly head: number; readonly tail: ListValue }) =>
    Cons({ head: head * 2, tail }),
};

const streetInput: ADTPolynomialRelativeStreetInput<
  typeof NumericList.typeName,
  ListConstructors
> = {
  adt: NumericList,
  extensions: [
    {
      id: "identity-extension",
      algebra: identityAlgebra,
      witness: witnessFromEquals(NumericList.equals),
      samples,
      expected: (value: ListValue) => value,
    },
  ],
  kleisli: [
    {
      id: "append-zero-then-double",
      first: doubleAlgebra,
      second: appendZeroAlgebra,
      witness: witnessFromEquals(NumericList.equals),
      samples,
      expected: ({ value, extendFirst, extendSecond }) =>
        extendFirst(extendSecond(value)),
    },
  ],
};

const makeTrivialWitnesses = () => {
  const equipment = virtualizeFiniteCategory(TwoObjectCategory);
  const trivial = describeTrivialRelativeMonad(equipment, "•");
  const enriched = describeRelativeEnrichedMonadWitness(trivial);
  const yoneda = describeRelativeEnrichedYonedaWitness(enriched);
  return {
    trivial,
    enriched,
    witnesses: {
      yoneda,
      yonedaDistributor: describeRelativeEnrichedYonedaDistributorWitness(yoneda),
      eilenbergMoore: describeRelativeEnrichedEilenbergMooreAlgebraWitness(enriched),
      kleisli: describeRelativeEnrichedKleisliInclusionWitness(enriched),
      vcat: describeRelativeEnrichedVCatMonadWitness(enriched),
    },
  } as const;
};

export const stage090AdtPolynomialEnrichedStreetRollups: RunnableExample = {
  id: "090",
  title: "Aggregated enriched Street roll-up analysis",
  outlineReference: 90,
  summary:
    "Aggregate Street roll-ups for a list ADT and run all enriched analyzers with the shared diagnostics payload.",
  async run() {
    const streetReport = analyzeADTPolynomialRelativeStreet(streetInput);
    const streetRollup = rollupADTPolynomialRelativeStreet(streetInput, streetReport);
    const bundle = buildADTPolynomialRelativeStreetEnrichedBundle(
      streetInput,
      streetReport,
      streetRollup,
    );

    const { trivial, enriched, witnesses } = makeTrivialWitnesses();

    const aggregated = RelativeMonadOracles.polynomialStreetRollupAggregation(
      trivial,
      streetInput,
      streetReport,
      streetRollup,
      {
        enrichedWitness: enriched,
        yonedaWitness: witnesses.yoneda,
        yonedaDistributorWitness: witnesses.yonedaDistributor,
        enrichedEilenbergMooreWitness: witnesses.eilenbergMoore,
        enrichedKleisliWitness: witnesses.kleisli,
        enrichedVCatWitness: witnesses.vcat,
      },
    );

    const analysis = analyzeRelativeEnrichedStreetRollups(
      witnesses,
      bundle.options,
    );

    const analyzerSummaries = (
      [
        { label: "Yoneda", report: analysis.reports.yoneda },
        { label: "Yoneda distributor", report: analysis.reports.yonedaDistributor },
        { label: "Eilenberg–Moore", report: analysis.reports.eilenbergMoore },
        { label: "Kleisli inclusion", report: analysis.reports.kleisli },
        { label: "V-Cat", report: analysis.reports.vcat },
      ] as const
    ).map(({ label, report }) =>
      `${report.holds ? "✔" : report.pending ? "⧗" : "✘"} ${label} (pending: ${
        report.pending ? "yes" : "no"
      })`,
    );

    const pendingSummary = aggregated.pending
      ? "⧗ Some enriched analyzers are pending on Street roll-ups."
      : aggregated.holds
        ? "✔ All enriched analyzers discharged the supplied Street roll-ups."
        : "✘ Aggregated Street roll-up analysis reported issues.";

    const aggregatedIssues = aggregated.issues ?? [];

    const logs = [
      "== Aggregated Street roll-ups ==",
      aggregated.details,
      pendingSummary,
      ...(aggregatedIssues.length > 0
        ? ["Issues:", ...aggregatedIssues.map((issue) => `   - ${issue}`)]
        : []),
      "== Analyzer statuses ==",
      ...analyzerSummaries,
      "== Captured Street roll-up artifacts ==",
      `Extension scenarios: ${streetInput.extensions?.length ?? 0}`,
      `Extension roll-ups: ${bundle.rollup.extensions.length}`,
      `Kleisli scenarios: ${streetInput.kleisli?.length ?? 0}`,
      `Kleisli roll-ups: ${bundle.rollup.kleisli.length}`,
    ];

    return {
      logs,
      metadata: {
        pending: analysis.pending,
        issues: analysis.issues,
        streetRollupPending: analysis.streetRollups?.pending ?? false,
        aggregatedPending: aggregated.pending,
        aggregatedIssues: aggregatedIssues,
      },
    };
  },
};
