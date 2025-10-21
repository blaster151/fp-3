import type { RunnableExample } from "./types";
import { TwoObjectCategory } from "../../two-object-cat";
import { virtualizeFiniteCategory } from "../../virtual-equipment/adapters";
import {
  analyzeADTPolynomialRelativeStreet,
  buildADTPolynomialRelativeStreetEnrichedBundle,
  rollupADTPolynomialRelativeStreet,
  type ADTPolynomialRelativeStreetInput,
} from "../../relative/adt-polynomial-relative";
import { RelativeMonadOracles } from "../../relative/relative-oracles";
import {
  analyzeRelativeEnrichedYoneda,
  describeRelativeEnrichedMonadWitness,
  describeRelativeEnrichedYonedaWitness,
  describeTrivialRelativeMonad,
} from "../../relative/relative-monads";
import {
  defineADT,
  getADTIndex,
  higherOrderParameterField,
  parameterField,
  primitiveStrictEqualsWitness,
  witnessFromEquals,
  type ADTFoldAlgebra,
  type ADTValue,
  type TypeWitness,
} from "../../src/algebra/adt/adt";

const deriveArrayWitness = (
  witness: TypeWitness<unknown>,
): TypeWitness<ReadonlyArray<unknown>> =>
  witnessFromEquals((left: ReadonlyArray<unknown>, right: ReadonlyArray<unknown>) =>
    left.length === right.length &&
    left.every((value, index) => witness.equals(value, right[index])),
  );

const makeHigherOrderStreetHarness = () => {
  const defineAnyADT: any = defineADT;

  const HistoryList = defineAnyADT({
    typeName: "RunnableEnrichedHistoryList",
    parameters: [{ name: "A" }] as const,
    constructors: [
      {
        name: "Empty",
        fields: [],
        indexes: [
          {
            name: "Length",
            witness: primitiveStrictEqualsWitness<number>(),
            compute: () => 0,
          },
          {
            name: "UniqueItems",
            witness: primitiveStrictEqualsWitness<number>(),
            compute: () => 0,
          },
        ],
      },
      {
        name: "Node",
        fields: [
          parameterField("head", "A"),
          {
            name: "tail",
            witness: witnessFromEquals(() => true),
            recursion: "self",
          },
          higherOrderParameterField(
            "history",
            "A",
            ({ parameterWitness }) => deriveArrayWitness(parameterWitness),
            {
              description: "History of values from the current head through the tail.",
              dependencies: ["head"],
            },
          ),
        ],
        indexes: [
          {
            name: "Length",
            witness: primitiveStrictEqualsWitness<number>(),
            compute: (fields: { readonly history: ReadonlyArray<unknown> }) =>
              fields.history.length,
          },
          {
            name: "UniqueItems",
            witness: primitiveStrictEqualsWitness<number>(),
            compute: (fields: { readonly history: ReadonlyArray<unknown> }) =>
              new Set(fields.history).size,
          },
        ],
      },
    ] as const,
  });

  const numbers = HistoryList.instantiate({
    A: primitiveStrictEqualsWitness<number>(),
  });

  type Constructors = typeof numbers.constructorsList;
  type Value = ADTValue<Constructors>;

  const { Empty, Node } = numbers.constructors;

  const readHistory = (value: Value): ReadonlyArray<number> =>
    ((value as { readonly history?: ReadonlyArray<number> }).history ?? []) as ReadonlyArray<number>;

  const makeNode = (head: number, tail: Value): Value =>
    Node({
      head,
      tail,
      history: [head, ...readHistory(tail)],
    });

  const sample0 = Empty();
  const sample1 = makeNode(1, sample0);
  const sample2 = makeNode(2, sample1);
  const sample3 = makeNode(3, sample2);
  const samples: ReadonlyArray<Value> = [sample0, sample1, sample2, sample3];

  const identity: ADTFoldAlgebra<Constructors, Value> = {
    Empty: () => Empty(),
    Node: (fields) => {
      const { head, tail, history } = fields as {
        readonly head: number;
        readonly tail: Value;
        readonly history: ReadonlyArray<number>;
      };
      return Node({ head, tail, history });
    },
  };

  const streetInput: ADTPolynomialRelativeStreetInput<typeof numbers.typeName, Constructors> = {
    adt: numbers,
    extensions: [
      {
        id: "identity-history",
        algebra: identity,
        witness: witnessFromEquals(numbers.equals),
        samples,
        expected: (value: Value) => numbers.fold(identity)(value),
      },
    ],
    kleisli: [
      {
        id: "identity-history-kleisli",
        first: identity,
        second: identity,
        witness: witnessFromEquals(numbers.equals),
        samples,
        expected: ({ value, extendFirst, extendSecond }) =>
          extendFirst(extendSecond(value)),
      },
    ],
  } as const;

  return { adt: numbers, streetInput, extractHistory: readHistory } as const;
};

const makeTrivialData = () => {
  const equipment = virtualizeFiniteCategory(TwoObjectCategory);
  const trivial = describeTrivialRelativeMonad(equipment, "•");
  return { equipment, trivial } as const;
};

export const stage089AdtPolynomialEnrichedHigherOrder: RunnableExample = {
  id: "089",
  title: "ADT higher-order Street roll-up bundle",
  outlineReference: 89,
  summary:
    "Replay Street roll-ups for a higher-order indexed ADT and feed the persisted composites into enriched Yoneda diagnostics.",
  async run() {
    const { adt, streetInput, extractHistory } = makeHigherOrderStreetHarness();
    const streetReport = analyzeADTPolynomialRelativeStreet(streetInput);
    const streetRollup = rollupADTPolynomialRelativeStreet(streetInput, streetReport);
    const bundle = buildADTPolynomialRelativeStreetEnrichedBundle(
      streetInput,
      streetReport,
      streetRollup,
    );

    const introspection = adt.introspect();
    type Constructor = (typeof introspection.constructors)[number];
    const nodeConstructor = introspection.constructors.find(
      (ctor: Constructor) => ctor.name === "Node",
    );
    const historyField = nodeConstructor?.fields.find(
      (field: Constructor["fields"][number]) => field.name === "history",
    );
    const indexes = introspection.indexes.Node ?? [];

    const rollupExtension = bundle.rollup.extensions[0];
    const rollupSample = rollupExtension
      ? rollupExtension.samples[rollupExtension.samples.length - 1]
      : undefined;
    const history = rollupSample ? extractHistory(rollupSample.value) : [];

    const { trivial } = makeTrivialData();
    const enriched = describeRelativeEnrichedMonadWitness(trivial);
    const yonedaWitness = describeRelativeEnrichedYonedaWitness(enriched);
    const yonedaReport = analyzeRelativeEnrichedYoneda(yonedaWitness, bundle.options.yoneda);

    const bundleOracle = RelativeMonadOracles.polynomialStreetEnrichedAdapters(
      streetInput,
      streetReport,
      streetRollup,
    );

    const rollupOracle = RelativeMonadOracles.polynomialStreetRollups(
      streetInput,
      streetReport,
    );

    const logs = [
      "== Higher-order ADT introspection ==",
      `History field depends on parameter: ${historyField?.higherOrder?.parameter ?? "unknown"}`,
      `History metadata description: ${historyField?.higherOrder?.description ?? "n/a"}`,
      `History metadata dependencies: ${(historyField?.higherOrder?.dependencies ?? []).join(", ") || "none"}`,
      `Node indexes available: ${indexes
        .map((index: (typeof indexes)[number]) => index.name)
        .join(", ") || "none"}`,
      "== Street harness ==",
      streetReport.details,
      `Street roll-up pending: ${streetRollup.pending}`,
      `Roll-up issues: ${(streetRollup.issues ?? []).join(" | ") || "none"}`,
      rollupSample
        ? `Sample length index: ${getADTIndex(rollupSample.value, "Length")}, history length: ${history.length}`
        : "Sample length index: n/a",
      rollupSample
        ? `Sample unique index: ${getADTIndex(rollupSample.value, "UniqueItems")}, unique history: ${new Set(history).size}`
        : "Sample unique index: n/a",
      "== Enriched Yoneda replay ==",
      yonedaReport.details,
      `Yoneda reused Street roll-ups: ${yonedaReport.streetRollups === bundle.rollup}`,
      `Yoneda pending: ${yonedaReport.pending}`,
      "== Registry oracles ==",
      bundleOracle.details,
      rollupOracle.details,
    ];

    return { logs };
  },
};
