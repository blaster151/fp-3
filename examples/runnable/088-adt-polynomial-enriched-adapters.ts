import type { RunnableExample } from "./types";
import { TwoObjectCategory, type TwoArrow, type TwoObject } from "../../two-object-cat";
import { virtualizeFiniteCategory } from "../../virtual-equipment/adapters";
import { type LooseMonoidData } from "../../virtual-equipment";
import {
  analyzeADTPolynomialRelativeStreet,
  buildADTPolynomialRelativeStreetEnrichedBundle,
  rollupADTPolynomialRelativeStreet,
  type ADTPolynomialRelativeStreetInput,
} from "../../relative/adt-polynomial-relative";
import {
  RelativeMonadOracles,
  enumerateRelativeMonadOracles,
} from "../../relative/relative-oracles";
import {
  analyzeRelativeEnrichedEilenbergMooreAlgebra,
  analyzeRelativeEnrichedKleisliInclusion,
  analyzeRelativeEnrichedVCatMonad,
  analyzeRelativeEnrichedYoneda,
  analyzeRelativeEnrichedYonedaDistributor,
  describeRelativeEnrichedEilenbergMooreAlgebraWitness,
  describeRelativeEnrichedKleisliInclusionWitness,
  describeRelativeEnrichedMonadWitness,
  describeRelativeEnrichedVCatMonadWitness,
  describeRelativeEnrichedYonedaDistributorWitness,
  describeRelativeEnrichedYonedaWitness,
  describeRelativeSetEnrichedMonadWitness,
  describeTrivialRelativeMonad,
  analyzeRelativeMonadRepresentability,
  analyzeRelativeMonadSkewMonoidBridge,
  analyzeRelativeSetEnrichedMonad,
  type RelativeMonadData,
  type RelativeMonadSkewMonoidBridgeInput,
} from "../../relative/relative-monads";
import {
  defineADT,
  getADTIndex,
  parameterField,
  primitiveStrictEqualsWitness,
  witnessFromEquals,
  type ADTFoldAlgebra,
  type ADTValue,
} from "../../src/algebra/adt/adt";

const makeStreetHarness = () => {
  const defineAnyADT: any = defineADT;
  const List = defineAnyADT({
    typeName: "RunnableEnrichedList",
    parameters: [{ name: "A" }] as const,
    constructors: [
      { name: "Nil", fields: [], indexes: [] },
      {
        name: "Cons",
        fields: [
          parameterField("head", "A"),
          { name: "tail", witness: witnessFromEquals(() => true), recursion: "self" },
        ],
        indexes: [
          {
            name: "Length",
            witness: primitiveStrictEqualsWitness<number>(),
            compute: (fields: { readonly tail: unknown }) =>
              Number(getADTIndex(fields.tail as never, "Length")) + 1,
          },
        ],
      },
    ] as const,
  });

  const numbers = List.instantiate({
    A: primitiveStrictEqualsWitness<number>(),
  });

  type Constructors = typeof numbers.constructorsList;
  type Value = ADTValue<Constructors>;

  const { Nil, Cons } = numbers.constructors;
  const samples: ReadonlyArray<Value> = [
    Nil(),
    Cons({ head: 1, tail: Nil() }),
    Cons({ head: 2, tail: Cons({ head: 1, tail: Nil() }) }),
  ];

  const addOne = {
    Nil: () => Nil(),
    Cons: (fields) => {
      const { head, tail } = fields as {
        readonly head: number;
        readonly tail: Value;
      };
      return Cons({ head: head + 1, tail });
    },
  } satisfies ADTFoldAlgebra<Constructors, Value>;

  const appendZero = {
    Nil: () => Cons({ head: 0, tail: Nil() }),
    Cons: (fields) => {
      const { head, tail } = fields as {
        readonly head: number;
        readonly tail: Value;
      };
      return Cons({ head, tail });
    },
  } satisfies ADTFoldAlgebra<Constructors, Value>;

  const streetInput: ADTPolynomialRelativeStreetInput<typeof numbers.typeName, Constructors> = {
    adt: numbers,
    extensions: [
      {
        id: "increment",
        algebra: addOne,
        witness: witnessFromEquals(numbers.equals),
        samples,
        expected: (value: Value) => numbers.fold(addOne)(value),
      },
    ],
    kleisli: [
      {
        id: "append-zero-then-increment",
        first: addOne,
        second: appendZero,
        witness: witnessFromEquals(numbers.equals),
        samples,
        expected: ({ value, extendFirst, extendSecond }) => extendFirst(extendSecond(value)),
      },
    ],
  } as const;

  return { numbers, streetInput } as const;
};

const makeTrivialData = () => {
  const equipment = virtualizeFiniteCategory(TwoObjectCategory);
  const trivial = describeTrivialRelativeMonad(equipment, "•");
  return { equipment, trivial } as const;
};

const successAnalysis = (details: string) => ({
  holds: true as const,
  issues: [] as ReadonlyArray<string>,
  details,
});

const obtainRepresentabilityWitness = () => {
  const { equipment, trivial } = makeTrivialData();
  const restriction = equipment.restrictions.left(
    trivial.root.tight,
    trivial.looseCell,
  );
  if (!restriction?.representability) {
    throw new Error(
      "Expected the identity loose arrow to produce a representability witness.",
    );
  }
  return { equipment, trivial, witness: restriction.representability } as const;
};

type RelativeParams = ReturnType<typeof makeTrivialData>["trivial"] extends RelativeMonadData<
  infer Obj,
  infer Arr,
  infer Payload,
  infer Evidence
>
  ? [Obj, Arr, Payload, Evidence]
  : never;

const makeSkewMonoidBridgeInput = () => {
  const { equipment, trivial } = makeTrivialData();
  const { witness } = obtainRepresentabilityWitness();

  const monoid: LooseMonoidData<
    RelativeParams[0],
    RelativeParams[1],
    RelativeParams[2],
    RelativeParams[3]
  > = {
    object: trivial.looseCell.from,
    looseCell: trivial.looseCell,
    multiplication: trivial.extension,
    unit: trivial.unit,
  };

  const input: RelativeMonadSkewMonoidBridgeInput<
    RelativeParams[0],
    RelativeParams[1],
    RelativeParams[2],
    RelativeParams[3]
  > = {
    relative: trivial,
    monoid,
    monoidShape: successAnalysis(
      "Identity loose monoid uses the relative monad's unit/extension data.",
    ),
    representability: analyzeRelativeMonadRepresentability(trivial, witness),
    leftExtensions: {
      existence: successAnalysis("Identity left extension exists by definition."),
      preservation: successAnalysis(
        "Identity extension functor preserves its own left extensions.",
      ),
      absolute: successAnalysis(
        "Identity left extension is j-absolute with trivial comparison cells.",
      ),
      density: successAnalysis("Identity tight 1-cell is dense via identity restrictions."),
      rightUnit: successAnalysis(
        "Right unit for the identity companion is invertible on the nose.",
      ),
    },
  };

  return { equipment, trivial, input } as const;
};

export const stage088AdtPolynomialEnrichedAdapters: RunnableExample = {
  id: "088",
  title: "ADT polynomial enriched adapter bundle",
  outlineReference: 88,
  summary:
    "Bundle Street harness diagnostics into enriched adapter options and replay the skew monoid bridge alongside the ADT analysis.",
  async run() {
    const { streetInput } = makeStreetHarness();
    const streetReport = analyzeADTPolynomialRelativeStreet(streetInput);
    const streetRollup = rollupADTPolynomialRelativeStreet(streetInput, streetReport);
    const bundle = buildADTPolynomialRelativeStreetEnrichedBundle(
      streetInput,
      streetReport,
      streetRollup,
    );

    const { equipment, trivial, input: skewInput } = makeSkewMonoidBridgeInput();
    const enriched = describeRelativeEnrichedMonadWitness(trivial);

    const yoneda = describeRelativeEnrichedYonedaWitness(enriched);
    const yonedaDistributor = describeRelativeEnrichedYonedaDistributorWitness(yoneda);
    const kleisli = describeRelativeEnrichedKleisliInclusionWitness(enriched);
    const eilenberg = describeRelativeEnrichedEilenbergMooreAlgebraWitness(enriched);
    const vcat = describeRelativeEnrichedVCatMonadWitness(enriched);
    const setEnriched = describeRelativeSetEnrichedMonadWitness(enriched);

    const yonedaReport = analyzeRelativeEnrichedYoneda(yoneda, bundle.options.yoneda);
    const yonedaDistributorReport = analyzeRelativeEnrichedYonedaDistributor(
      yonedaDistributor,
      bundle.options.yonedaDistributor,
    );
    const kleisliReport = analyzeRelativeEnrichedKleisliInclusion(
      kleisli,
      bundle.options.kleisli,
    );
    const eilenbergReport = analyzeRelativeEnrichedEilenbergMooreAlgebra(
      eilenberg,
      bundle.options.eilenbergMoore,
    );
    const vcatReport = analyzeRelativeEnrichedVCatMonad(vcat, bundle.options.vcat);
    const skewReport = analyzeRelativeMonadSkewMonoidBridge(skewInput);
    const setEnrichedReport = analyzeRelativeSetEnrichedMonad(setEnriched);

    const enumeration = enumerateRelativeMonadOracles(trivial, {
      polynomialStreetHarness: streetInput,
      polynomialStreetReport: streetReport,
      polynomialStreetRollup: streetRollup,
      skewMonoidBridgeInput: skewInput,
    });

    const harnessOracle = RelativeMonadOracles.polynomialStreetHarness(
      streetInput,
      streetReport,
    );
    const rollupOracle = RelativeMonadOracles.polynomialStreetRollups(
      streetInput,
      streetReport,
    );
    const bundleOracle = RelativeMonadOracles.polynomialStreetEnrichedAdapters(
      streetInput,
      streetReport,
      streetRollup,
    );
    const skewOracle = RelativeMonadOracles.skewMonoidBridge(skewInput);

    const logs = [
      "== Polynomial Street harness ==",
      harnessOracle.details,
      `Issues: ${(harnessOracle.issues ?? []).join(" | ") || "none"}`,
      "== Street roll-up bundle ==",
      rollupOracle.details,
      `Pending: ${rollupOracle.pending}`,
      "== Enriched adapter bundle ==",
      bundleOracle.details,
      `Adapters included: ${Object.keys(bundleOracle.artifacts as Record<string, unknown>).join(", ")}`,
      `Yoneda street roll-ups reused: ${yonedaReport.streetRollups === bundle.rollup}`,
      `Yoneda distributor pending: ${yonedaDistributorReport.pending}`,
      `Kleisli inclusion pending: ${kleisliReport.pending}`,
      `Eilenberg–Moore pending: ${eilenbergReport.pending}`,
      `V-cat pending: ${vcatReport.pending}`,
      "== Skew monoid bridge ==",
      skewOracle.details,
      skewReport.details,
      `Bridge issues: ${(skewOracle.issues ?? []).join(" | ") || "none"}`,
      "== Enumeration snapshot ==",
      ...enumeration.map(
        (entry) => `${entry.registryPath}: pending=${entry.pending} holds=${entry.holds}`,
      ),
      "== Set-enriched replay ==",
      setEnrichedReport.details,
    ];

    return { logs };
  },
};
