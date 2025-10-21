import type { RunnableExample } from "./types";
import {
  defineADT,
  primitiveStrictEqualsWitness,
  witnessFromEquals,
  type ADTValue,
} from "../../src/algebra/adt/adt";
import {
  analyzeADTPolynomialRelativeStreet,
  rollupADTPolynomialRelativeStreet,
  type ADTPolynomialRelativeStreetInput,
} from "../../relative/adt-polynomial-relative";
import { RelativeMonadOracles } from "../../relative/relative-oracles";

const NumericList = defineADT({
  typeName: "RunnableStreetList",
  constructors: [
    { name: "Nil", fields: [] },
    {
      name: "Cons",
      fields: [
        { name: "head", witness: primitiveStrictEqualsWitness<number>() },
        {
          name: "tail",
          witness: witnessFromEquals<unknown>((left, right) => true),
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

export const stage087AdtPolynomialStreetHarness: RunnableExample = {
  id: "087",
  title: "ADT polynomial Street harness diagnostics",
  outlineReference: 87,
  summary:
    "Replay Street-style composites for a numeric list ADT and surface the registry-backed harness/roll-up reports.",
  async run() {
    const streetReport = analyzeADTPolynomialRelativeStreet(streetInput);
    const streetRollup = rollupADTPolynomialRelativeStreet(streetInput, streetReport);
    const harnessOracle = RelativeMonadOracles.polynomialStreetHarness(
      streetInput,
      streetReport,
    );
    const rollupOracle = RelativeMonadOracles.polynomialStreetRollups(
      streetInput,
      streetReport,
    );

    const logs = [
      "== Polynomial Street harness ==",
      `Extension scenarios: ${streetInput.extensions?.length ?? 0}`,
      streetReport.extensionIssues.length === 0
        ? "✔ All extension composites replayed as expected"
        : `✘ Extension issues detected: ${streetReport.extensionIssues.length}`,
      `Kleisli scenarios: ${streetInput.kleisli?.length ?? 0}`,
      streetReport.kleisliIssues.length === 0
        ? "✔ Kleisli composites agree with expectations"
        : `✘ Kleisli issues detected: ${streetReport.kleisliIssues.length}`,
      "== Captured snapshots ==",
      `Extension snapshots: ${streetReport.extensionSnapshots.length}`,
      `Kleisli snapshots: ${streetReport.kleisliSnapshots.length}`,
      "== Registry oracles ==",
      `${harnessOracle.registryPath}: ${harnessOracle.details}`,
      harnessOracle.issues && harnessOracle.issues.length > 0
        ? `Issues: ${harnessOracle.issues.join(" | ")}`
        : "No harness issues reported.",
      `${rollupOracle.registryPath}: ${rollupOracle.details}`,
      rollupOracle.issues && rollupOracle.issues.length > 0
        ? `Roll-up issues: ${rollupOracle.issues.join(" | ")}`
        : `Roll-up pending status: ${rollupOracle.pending ? "pending" : "ready"}`,
      `Persisted extension composites: ${streetRollup.extensions.length}`,
      `Persisted Kleisli composites: ${streetRollup.kleisli.length}`,
    ];

    return { logs };
  },
};
