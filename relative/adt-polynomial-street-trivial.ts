import { TwoObjectCategory } from "../two-object-cat";
import { virtualizeFiniteCategory } from "../virtual-equipment/adapters";
import {
  analyzeADTPolynomialRelativeStreet,
  buildADTPolynomialRelativeStreetEnrichedBundle,
  rollupADTPolynomialRelativeStreet,
  type ADTPolynomialRelativeStreetInput,
} from "./adt-polynomial-relative";
import {
  analyzeRelativeEnrichedStreetRollups,
  describeRelativeEnrichedEilenbergMooreAlgebraWitness,
  describeRelativeEnrichedKleisliInclusionWitness,
  describeRelativeEnrichedMonadWitness,
  describeRelativeEnrichedVCatMonadWitness,
  describeRelativeEnrichedYonedaDistributorWitness,
  describeRelativeEnrichedYonedaWitness,
  describeTrivialRelativeMonad,
} from "./relative-monads";
import { RelativeMonadOracles } from "./relative-oracles";
import {
  defineADT,
  primitiveStrictEqualsWitness,
  witnessFromEquals,
  type ADTValue,
} from "../src/algebra/adt/adt";

const AggregatedStreetList = defineADT({
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

const { Nil, Cons } = AggregatedStreetList.constructors;

type StreetListConstructors = typeof AggregatedStreetList.constructorsList;
type StreetListValue = ADTValue<StreetListConstructors>;

const samples: ReadonlyArray<StreetListValue> = [
  Nil(),
  Cons({ head: 1, tail: Nil() }),
  Cons({ head: 2, tail: Cons({ head: 1, tail: Nil() }) }),
];

const identityAlgebra = {
  Nil: () => Nil(),
  Cons: ({ head, tail }: { readonly head: number; readonly tail: StreetListValue }) =>
    Cons({ head, tail }),
};

const appendZeroAlgebra = {
  Nil: () => Cons({ head: 0, tail: Nil() }),
  Cons: ({ head, tail }: { readonly head: number; readonly tail: StreetListValue }) =>
    Cons({ head, tail }),
};

const doubleAlgebra = {
  Nil: () => Nil(),
  Cons: ({ head, tail }: { readonly head: number; readonly tail: StreetListValue }) =>
    Cons({ head: head * 2, tail }),
};

export const aggregatedStreetInput: ADTPolynomialRelativeStreetInput<
  typeof AggregatedStreetList.typeName,
  StreetListConstructors
> = {
  adt: AggregatedStreetList,
  extensions: [
    {
      id: "identity-extension",
      algebra: identityAlgebra,
      witness: witnessFromEquals(AggregatedStreetList.equals),
      samples,
      expected: (value: StreetListValue) => value,
    },
  ],
  kleisli: [
    {
      id: "append-zero-then-double",
      first: doubleAlgebra,
      second: appendZeroAlgebra,
      witness: witnessFromEquals(AggregatedStreetList.equals),
      samples,
      expected: ({ value, extendFirst, extendSecond }) =>
        extendFirst(extendSecond(value)),
    },
  ],
};

export const createTrivialAggregatedStreetWitnesses = () => {
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

export const buildTrivialAggregatedStreetArtifacts = () => {
  const streetReport = analyzeADTPolynomialRelativeStreet(aggregatedStreetInput);
  const streetRollup = rollupADTPolynomialRelativeStreet(
    aggregatedStreetInput,
    streetReport,
  );
  const bundle = buildADTPolynomialRelativeStreetEnrichedBundle(
    aggregatedStreetInput,
    streetReport,
    streetRollup,
  );

  const { trivial, enriched, witnesses } = createTrivialAggregatedStreetWitnesses();

  const aggregated = RelativeMonadOracles.polynomialStreetRollupAggregation(
    trivial,
    aggregatedStreetInput,
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

  const analysis = analyzeRelativeEnrichedStreetRollups(witnesses, bundle.options);

  return {
    streetInput: aggregatedStreetInput,
    streetReport,
    streetRollup,
    bundle,
    analysis,
    aggregated,
    trivial,
    enriched,
    witnesses,
  } as const;
};

export type TrivialAggregatedStreetArtifacts = ReturnType<
  typeof buildTrivialAggregatedStreetArtifacts
>;
