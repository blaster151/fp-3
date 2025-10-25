import {
  defineADT,
  getADTIndex,
  parameterField,
  primitiveStrictEqualsWitness,
  witnessFromEquals,
  type ADTConstructor,
  type ADTField,
  type ADTValue,
  type RecursiveAlgebraicDataType,
} from "../src/algebra/adt/adt";
import {
  analyzeADTPolynomialRelativeStreet,
  rollupADTPolynomialRelativeStreet,
  type ADTPolynomialRelativeStreetInput,
  type ADTPolynomialRelativeStreetReport,
  type ADTPolynomialRelativeStreetRollup,
} from "./adt-polynomial-relative";

type ConstructorList = ReadonlyArray<
  ADTConstructor<string, readonly ADTField<string, any>[]>
>;

type StreetAdt = RecursiveAlgebraicDataType<string, ConstructorList>;

const defineAnyADT: (
  config: Parameters<typeof defineADT>[0],
) => ReturnType<typeof defineADT> = defineADT as never;

const PolynomialList = defineAnyADT({
  typeName: "PolyStreetList",
  parameters: [{ name: "A" }] as const,
  constructors: [
    {
      name: "Nil",
      fields: [],
      indexes: [
        {
          name: "Length",
          witness: primitiveStrictEqualsWitness<number>(),
          compute: () => 0,
        },
      ],
    },
    {
      name: "Cons",
      fields: [
        parameterField("head", "A"),
        {
          name: "tail",
          witness: witnessFromEquals(() => true),
          recursion: "self",
        },
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

const Numbers = PolynomialList.instantiate({
  A: primitiveStrictEqualsWitness<number>(),
}) as StreetAdt;

type NumbersConstructors = typeof Numbers.constructorsList;
type NumbersValue = ADTValue<NumbersConstructors>;

const { Nil, Cons } = Numbers.constructors;

const samples: ReadonlyArray<NumbersValue> = [
  Nil() as NumbersValue,
  Cons({ head: 1, tail: Nil() }) as NumbersValue,
  Cons({ head: 2, tail: Cons({ head: 3, tail: Nil() }) }) as NumbersValue,
];

const addTenAlgebra = {
  Nil: () => Nil() as NumbersValue,
  Cons: ({ head, tail }: { readonly head: number; readonly tail: NumbersValue }) =>
    Cons({ head: head + 10, tail }) as NumbersValue,
};

const incrementAlgebra = {
  Nil: () => Nil() as NumbersValue,
  Cons: ({ head, tail }: { readonly head: number; readonly tail: NumbersValue }) =>
    Cons({ head: head + 1, tail }) as NumbersValue,
};

const streetInput = {
  adt: Numbers,
  extensions: [
    {
      id: "add-ten",
      algebra: addTenAlgebra,
      witness: witnessFromEquals(Numbers.equals),
      samples,
      expected: (value: NumbersValue) => Numbers.fold(addTenAlgebra)(value),
    },
  ],
  kleisli: [
    {
      id: "add-ten-then-increment",
      first: addTenAlgebra,
      second: incrementAlgebra,
      witness: witnessFromEquals(Numbers.equals),
      samples,
      expected: ({
        value,
        extendFirst,
        extendSecond,
      }: {
        readonly value: NumbersValue;
        readonly extendFirst: (value: NumbersValue) => NumbersValue;
        readonly extendSecond: (value: NumbersValue) => NumbersValue;
      }) => extendSecond(extendFirst(value)),
    },
  ],
} as const satisfies ADTPolynomialRelativeStreetInput<
  typeof PolynomialList.typeName,
  NumbersConstructors
>;

export interface PolynomialStreetRegistryEntry {
  readonly harness: ADTPolynomialRelativeStreetInput<
    typeof PolynomialList.typeName,
    NumbersConstructors
  >;
  readonly report: ADTPolynomialRelativeStreetReport<NumbersConstructors>;
  readonly rollup: ADTPolynomialRelativeStreetRollup<NumbersConstructors>;
}

let cachedEntry: PolynomialStreetRegistryEntry | undefined;

export const loadPolynomialStreetRegistryEntry = (): PolynomialStreetRegistryEntry => {
  if (!cachedEntry) {
    const report = analyzeADTPolynomialRelativeStreet(streetInput);
    const rollup = rollupADTPolynomialRelativeStreet(streetInput, report);
    cachedEntry = {
      harness: streetInput,
      report,
      rollup,
    };
  }
  return cachedEntry;
};

