import type {
  ADTConstructor,
  ADTField,
  ADTFoldAlgebra,
  ADTPolynomialValue,
  ADTUnfoldCoalgebra,
  ADTValue,
  RecursiveAlgebraicDataType,
  TypeWitness,
} from "../src/algebra/adt/adt";
import type {
  RelativeEnrichedEilenbergMooreAlgebraOptions,
  RelativeEnrichedKleisliInclusionOptions,
  RelativeEnrichedStreetRollupOptions,
  RelativeEnrichedVCatMonadOptions,
  RelativeEnrichedYonedaDistributorOptions,
  RelativeEnrichedYonedaOptions,
} from "./relative-monads";

export interface ADTPolynomialRelativeMonadValueIssue<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
> {
  readonly value: ADTValue<Constructors>;
  readonly expected: ADTValue<Constructors>;
  readonly actual: ADTValue<Constructors>;
  readonly details: string;
}

export interface ADTPolynomialRelativeMonadFoldIssue<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
  Result,
> {
  readonly value: ADTValue<Constructors>;
  readonly expected: Result;
  readonly actual: Result;
  readonly details: string;
}

export interface ADTPolynomialRelativeMonadUnfoldIssue<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
  Seed,
> {
  readonly seed: Seed;
  readonly expected: ADTValue<Constructors>;
  readonly actual: ADTValue<Constructors>;
  readonly details: string;
}

export interface ADTPolynomialRelativeMonadReport<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
  FoldResult,
  Seed,
> {
  readonly holds: boolean;
  readonly valueIssues: ReadonlyArray<
    ADTPolynomialRelativeMonadValueIssue<Constructors>
  >;
  readonly foldIssues: ReadonlyArray<
    ADTPolynomialRelativeMonadFoldIssue<Constructors, FoldResult>
  >;
  readonly unfoldIssues: ReadonlyArray<
    ADTPolynomialRelativeMonadUnfoldIssue<Constructors, Seed>
  >;
  readonly details: string;
}

type ConstructorName<Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>> =
  Constructors[number]["name"] & string;

type FieldsByConstructor<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
> = ReadonlyMap<ConstructorName<Constructors>, Constructors[number]["fields"]>;

const buildFieldsByConstructor = <
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
>(
  constructors: Constructors,
): FieldsByConstructor<Constructors> => {
  const entries: Array<[
    ConstructorName<Constructors>,
    Constructors[number]["fields"],
  ]> = [];
  for (const ctor of constructors) {
    entries.push([ctor.name as ConstructorName<Constructors>, ctor.fields]);
  }
  return new Map(entries);
};

const replayFoldViaPolynomial = <
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
  Result,
>(
  adt: RecursiveAlgebraicDataType<string, Constructors>,
  fieldsByConstructor: FieldsByConstructor<Constructors>,
  algebra: ADTFoldAlgebra<Constructors, Result>,
) => {
  const folder = (value: ADTValue<Constructors>): Result => {
    const projected = adt.polynomial.project(value);
    const mapped = adt.polynomial.mapPositions(projected, folder);
    const tag = mapped.tag as ConstructorName<Constructors>;
    const handler = algebra[tag];
    if (typeof handler !== "function") {
      throw new Error(
        `Polynomial fold replay missing algebra handler for constructor ${String(tag)}`,
      );
    }
    const constructorFields = fieldsByConstructor.get(tag);
    if (!constructorFields) {
      throw new Error(
        `Polynomial fold replay encountered unknown constructor ${String(tag)}`,
      );
    }
    const accumulated: Record<string, unknown> = {};
    for (const field of constructorFields) {
      accumulated[field.name] = mapped.fields[field.name];
    }
    return handler(accumulated as never);
  };

  return folder;
};

const replayUnfoldViaPolynomial = <
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
  Seed,
>(
  adt: RecursiveAlgebraicDataType<string, Constructors>,
  fieldsByConstructor: FieldsByConstructor<Constructors>,
  coalgebra: ADTUnfoldCoalgebra<Constructors, Seed>,
) => {
  const buildValue = (seed: Seed): ADTValue<Constructors> => {
    const step = coalgebra(seed);
    if (!step || typeof step !== "object") {
      throw new Error(
        "Polynomial unfold replay expects coalgebra to return {_tag, fields} records.",
      );
    }

    const tag = step._tag as ConstructorName<Constructors>;
    const constructorFields = fieldsByConstructor.get(tag);
    if (!constructorFields) {
      throw new Error(
        `Polynomial unfold replay encountered unknown constructor ${String(tag)}`,
      );
    }

    const provided = step.fields as Record<string, unknown>;
    const accumulated: Record<string, unknown> = {};
    for (const field of constructorFields) {
      if (!(field.name in provided)) {
        throw new Error(
          `Polynomial unfold replay missing field ${String(field.name)} for constructor ${String(tag)}`,
        );
      }

      const payload = provided[field.name];
      if (field.recursion === "self") {
        accumulated[field.name] = buildValue(payload as Seed);
      } else {
        accumulated[field.name] = payload;
      }
    }

    const variant = {
      tag,
      fields: accumulated,
    } as unknown as ADTPolynomialValue<Constructors, ADTValue<Constructors>>;
    return adt.polynomial.embed(variant, (value) => value);
  };

  return buildValue;
};

const flattenPolynomial = <
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
>(
  adt: RecursiveAlgebraicDataType<string, Constructors>,
  nested: ADTPolynomialValue<
    Constructors,
    ADTPolynomialValue<Constructors, ADTValue<Constructors>>
  >,
) =>
  adt.polynomial.mapPositions(nested, (inner) =>
    adt.polynomial.embed(inner, (value) => value),
  );

const variantToValue = <
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
>(
  adt: RecursiveAlgebraicDataType<string, Constructors>,
  variant: ADTPolynomialValue<Constructors, ADTValue<Constructors>>,
) => adt.polynomial.embed(variant, (value) => value);

export interface ADTPolynomialRelativeMonadInput<
  TypeName extends string,
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
  FoldResult,
  Seed,
> {
  readonly adt: RecursiveAlgebraicDataType<TypeName, Constructors>;
  readonly values: ReadonlyArray<ADTValue<Constructors>>;
  readonly fold?: {
    readonly algebra: ADTFoldAlgebra<Constructors, FoldResult>;
    readonly witness: TypeWitness<FoldResult>;
    readonly values?: ReadonlyArray<ADTValue<Constructors>>;
  };
  readonly unfold?: {
    readonly seeds: ReadonlyArray<Seed>;
    readonly coalgebra: ADTUnfoldCoalgebra<Constructors, Seed>;
  };
}

export const analyzeADTPolynomialRelativeMonad = <
  TypeName extends string,
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
  FoldResult,
  Seed,
>(
  input: ADTPolynomialRelativeMonadInput<
    TypeName,
    Constructors,
    FoldResult,
    Seed
  >,
): ADTPolynomialRelativeMonadReport<Constructors, FoldResult, Seed> => {
  const { adt, values } = input;
  const fieldsByConstructor = buildFieldsByConstructor(adt.constructorsList);

  const valueIssues: Array<
    ADTPolynomialRelativeMonadValueIssue<Constructors>
  > = [];
  for (const value of values) {
    try {
      const projected = adt.polynomial.project(value);
      const nested = adt.polynomial.mapPositions(projected, (child) =>
        adt.polynomial.project(child),
      );
      const flattened = flattenPolynomial(adt, nested);
      const flattenValue = variantToValue(adt, flattened);
      if (!adt.equals(value, flattenValue)) {
        valueIssues.push({
          value,
          expected: value,
          actual: flattenValue,
          details:
            "Flattening the polynomial container after projecting recursion did not reproduce the original value.",
        });
      }
    } catch (error) {
      valueIssues.push({
        value,
        expected: value,
        actual: value,
        details:
          error instanceof Error ? error.message : String(error ?? "Unknown error"),
      });
    }
  }

  const foldIssues: Array<
    ADTPolynomialRelativeMonadFoldIssue<Constructors, FoldResult>
  > = [];
  if (input.fold) {
    const { algebra, witness, values: foldValues } = input.fold;
    const effectiveValues = foldValues ?? values;
    const replayed = replayFoldViaPolynomial(adt, fieldsByConstructor, algebra);
    const derive = adt.fold(algebra);
    for (const value of effectiveValues) {
      let expected: FoldResult | undefined;
      let actual: FoldResult | undefined;
      let expectedError: unknown;
      let actualError: unknown;

      try {
        expected = derive(value);
      } catch (error) {
        expectedError = error;
      }

      try {
        actual = replayed(value);
      } catch (error) {
        actualError = error;
      }

      if (expectedError || actualError) {
        foldIssues.push({
          value,
          expected: expected ?? (undefined as unknown as FoldResult),
          actual: actual ?? (undefined as unknown as FoldResult),
          details: [expectedError, actualError]
            .filter(Boolean)
            .map((issue) =>
              issue instanceof Error ? issue.message : String(issue ?? "Unknown error"),
            )
            .join("; ") ||
            "Polynomial fold replay raised an exception.",
        });
        continue;
      }

      if (!witness.equals(expected as FoldResult, actual as FoldResult)) {
        foldIssues.push({
          value,
          expected: expected as FoldResult,
          actual: actual as FoldResult,
          details:
            "Polynomial container replay of the catamorphism disagreed with defineADT.fold.",
        });
      }
    }
  }

  const unfoldIssues: Array<
    ADTPolynomialRelativeMonadUnfoldIssue<Constructors, Seed>
  > = [];
  if (input.unfold) {
    const { seeds, coalgebra } = input.unfold;
    const replayed = replayUnfoldViaPolynomial(
      adt,
      fieldsByConstructor,
      coalgebra,
    );
    const derive = adt.unfold(coalgebra);
    for (const seed of seeds) {
      let expected: ADTValue<Constructors> | undefined;
      let actual: ADTValue<Constructors> | undefined;
      let expectedError: unknown;
      let actualError: unknown;

      try {
        expected = derive(seed);
      } catch (error) {
        expectedError = error;
      }

      try {
        actual = replayed(seed);
      } catch (error) {
        actualError = error;
      }

      if (expectedError || actualError) {
        unfoldIssues.push({
          seed,
          expected: expected ?? (undefined as unknown as ADTValue<Constructors>),
          actual: actual ?? (undefined as unknown as ADTValue<Constructors>),
          details: [expectedError, actualError]
            .filter(Boolean)
            .map((issue) =>
              issue instanceof Error ? issue.message : String(issue ?? "Unknown error"),
            )
            .join("; ") ||
            "Polynomial unfold replay raised an exception.",
        });
        continue;
      }

      if (!adt.equals(expected as ADTValue<Constructors>, actual as ADTValue<Constructors>)) {
        unfoldIssues.push({
          seed,
          expected: expected as ADTValue<Constructors>,
          actual: actual as ADTValue<Constructors>,
          details:
            "Polynomial container replay of the anamorphism disagreed with defineADT.unfold.",
        });
      }
    }
  }

  const holds =
    valueIssues.length === 0 &&
    foldIssues.length === 0 &&
    unfoldIssues.length === 0;

  const details = holds
    ? "Polynomial container bridge recreates unit, multiplication, folds, and unfolds for the supplied ADT samples."
    : "Polynomial container bridge uncovered discrepancies; inspect issues for details.";

  return {
    holds,
    valueIssues,
    foldIssues,
    unfoldIssues,
    details,
  };
};

export interface ADTPolynomialRelativeStreetExtensionScenario<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
> {
  readonly id: string;
  readonly algebra: ADTFoldAlgebra<Constructors, ADTValue<Constructors>>;
  readonly witness: TypeWitness<ADTValue<Constructors>>;
  readonly samples: ReadonlyArray<ADTValue<Constructors>>;
  readonly expected: (value: ADTValue<Constructors>) => ADTValue<Constructors>;
}

export interface ADTPolynomialRelativeStreetKleisliScenario<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
> {
  readonly id: string;
  readonly first: ADTFoldAlgebra<Constructors, ADTValue<Constructors>>;
  readonly second: ADTFoldAlgebra<Constructors, ADTValue<Constructors>>;
  readonly witness: TypeWitness<ADTValue<Constructors>>;
  readonly samples: ReadonlyArray<ADTValue<Constructors>>;
  readonly expected: (input: {
    readonly value: ADTValue<Constructors>;
    readonly extendFirst: (value: ADTValue<Constructors>) => ADTValue<Constructors>;
    readonly extendSecond: (value: ADTValue<Constructors>) => ADTValue<Constructors>;
  }) => ADTValue<Constructors>;
}

export interface ADTPolynomialRelativeStreetExtensionIssue<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
> {
  readonly scenarioId: string;
  readonly value: ADTValue<Constructors>;
  readonly expected: ADTValue<Constructors>;
  readonly actual: ADTValue<Constructors>;
  readonly details: string;
}

export interface ADTPolynomialRelativeStreetKleisliIssue<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
> {
  readonly scenarioId: string;
  readonly value: ADTValue<Constructors>;
  readonly expected: ADTValue<Constructors>;
  readonly actual: ADTValue<Constructors>;
  readonly details: string;
}

export interface ADTPolynomialRelativeStreetExtensionSnapshot<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
> {
  readonly scenarioId: string;
  readonly value: ADTValue<Constructors>;
  readonly result: ADTValue<Constructors>;
}

export interface ADTPolynomialRelativeStreetKleisliSnapshot<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
> {
  readonly scenarioId: string;
  readonly value: ADTValue<Constructors>;
  readonly intermediate: ADTValue<Constructors>;
  readonly result: ADTValue<Constructors>;
}

export interface ADTPolynomialRelativeStreetReport<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
> {
  readonly holds: boolean;
  readonly extensionIssues: ReadonlyArray<
    ADTPolynomialRelativeStreetExtensionIssue<Constructors>
  >;
  readonly kleisliIssues: ReadonlyArray<
    ADTPolynomialRelativeStreetKleisliIssue<Constructors>
  >;
  readonly details: string;
  readonly extensionSnapshots: ReadonlyArray<
    ADTPolynomialRelativeStreetExtensionSnapshot<Constructors>
  >;
  readonly kleisliSnapshots: ReadonlyArray<
    ADTPolynomialRelativeStreetKleisliSnapshot<Constructors>
  >;
}

export interface ADTPolynomialRelativeStreetInput<
  TypeName extends string,
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
> {
  readonly adt: RecursiveAlgebraicDataType<TypeName, Constructors>;
  readonly extensions?: ReadonlyArray<
    ADTPolynomialRelativeStreetExtensionScenario<Constructors>
  >;
  readonly kleisli?: ReadonlyArray<
    ADTPolynomialRelativeStreetKleisliScenario<Constructors>
  >;
}

export const analyzeADTPolynomialRelativeStreet = <
  TypeName extends string,
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
>(
  input: ADTPolynomialRelativeStreetInput<TypeName, Constructors>,
): ADTPolynomialRelativeStreetReport<Constructors> => {
  const { adt } = input;
  const fieldsByConstructor = buildFieldsByConstructor(adt.constructorsList);

  const extensionIssues: Array<
    ADTPolynomialRelativeStreetExtensionIssue<Constructors>
  > = [];
  const extensionSnapshots: Array<
    ADTPolynomialRelativeStreetExtensionSnapshot<Constructors>
  > = [];

  for (const scenario of input.extensions ?? []) {
    const extend = replayFoldViaPolynomial(adt, fieldsByConstructor, scenario.algebra);
    for (const value of scenario.samples) {
      let actual: ADTValue<Constructors> | undefined;
      let expected: ADTValue<Constructors> | undefined;
      let actualError: unknown;
      let expectedError: unknown;

      try {
        actual = extend(value);
      } catch (error) {
        actualError = error;
      }

      try {
        expected = scenario.expected(value);
      } catch (error) {
        expectedError = error;
      }

      if (actualError || expectedError) {
        extensionIssues.push({
          scenarioId: scenario.id,
          value,
          expected: expected ?? (undefined as unknown as ADTValue<Constructors>),
          actual: actual ?? (undefined as unknown as ADTValue<Constructors>),
          details: [actualError, expectedError]
            .filter(Boolean)
            .map((issue) =>
              issue instanceof Error ? issue.message : String(issue ?? "Unknown error"),
            )
            .join("; ") ||
            `Extension scenario ${scenario.id} raised an exception when replaying Street composites.`,
        });
        continue;
      }

      const matches = scenario.witness.equals(
        expected as ADTValue<Constructors>,
        actual as ADTValue<Constructors>,
      );

      if (!matches) {
        extensionIssues.push({
          scenarioId: scenario.id,
          value,
          expected: expected as ADTValue<Constructors>,
          actual: actual as ADTValue<Constructors>,
          details: `Extension scenario ${scenario.id} disagreed with the supplied expectation.`,
        });
      }

      if (
        !actualError &&
        !expectedError &&
        actual &&
        matches
      ) {
        extensionSnapshots.push({
          scenarioId: scenario.id,
          value,
          result: actual,
        });
      }
    }
  }

  const kleisliIssues: Array<
    ADTPolynomialRelativeStreetKleisliIssue<Constructors>
  > = [];
  const kleisliSnapshots: Array<
    ADTPolynomialRelativeStreetKleisliSnapshot<Constructors>
  > = [];

  for (const scenario of input.kleisli ?? []) {
    const extendFirst = replayFoldViaPolynomial(adt, fieldsByConstructor, scenario.first);
    const extendSecond = replayFoldViaPolynomial(adt, fieldsByConstructor, scenario.second);

    for (const value of scenario.samples) {
      let actual: ADTValue<Constructors> | undefined;
      let expected: ADTValue<Constructors> | undefined;
      let actualError: unknown;
      let expectedError: unknown;
      let intermediate: ADTValue<Constructors> | undefined;

      try {
        intermediate = extendSecond(value);
        actual = extendFirst(intermediate);
      } catch (error) {
        actualError = error;
      }

      try {
        expected = scenario.expected({
          value,
          extendFirst,
          extendSecond,
        });
      } catch (error) {
        expectedError = error;
      }

      if (actualError || expectedError) {
        kleisliIssues.push({
          scenarioId: scenario.id,
          value,
          expected: expected ?? (undefined as unknown as ADTValue<Constructors>),
          actual: actual ?? (undefined as unknown as ADTValue<Constructors>),
          details: [actualError, expectedError]
            .filter(Boolean)
            .map((issue) =>
              issue instanceof Error ? issue.message : String(issue ?? "Unknown error"),
            )
            .join("; ") ||
            `Kleisli scenario ${scenario.id} raised an exception when replaying Street composites.`,
        });
        continue;
      }

      const matches = scenario.witness.equals(
        expected as ADTValue<Constructors>,
        actual as ADTValue<Constructors>,
      );

      if (!matches) {
        kleisliIssues.push({
          scenarioId: scenario.id,
          value,
          expected: expected as ADTValue<Constructors>,
          actual: actual as ADTValue<Constructors>,
          details: `Kleisli scenario ${scenario.id} disagreed with the supplied expectation.`,
        });
      }

      if (
        !actualError &&
        !expectedError &&
        actual &&
        intermediate &&
        matches
      ) {
        kleisliSnapshots.push({
          scenarioId: scenario.id,
          value,
          intermediate,
          result: actual,
        });
      }
    }
  }

  const holds = extensionIssues.length === 0 && kleisliIssues.length === 0;
  const details = holds
    ? "Polynomial Street harness agrees with supplied extension and Kleisli scenarios."
    : "Polynomial Street harness uncovered discrepancies; inspect issues for details.";

  return {
    holds,
    extensionIssues,
    kleisliIssues,
    details,
    extensionSnapshots,
    kleisliSnapshots,
  };
};

export interface ADTPolynomialRelativeStreetExtensionRollupSample<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
> {
  readonly value: ADTValue<Constructors>;
  readonly streetResult: ADTValue<Constructors>;
  readonly replayedResult?: ADTValue<Constructors>;
  readonly matchesReplayedResult?: boolean;
  readonly expectedResult?: ADTValue<Constructors>;
  readonly matchesExpectedResult?: boolean;
}

export interface ADTPolynomialRelativeStreetExtensionRollup<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
> {
  readonly scenarioId: string;
  readonly samples: ReadonlyArray<
    ADTPolynomialRelativeStreetExtensionRollupSample<Constructors>
  >;
}

export interface ADTPolynomialRelativeStreetKleisliRollupSample<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
> {
  readonly value: ADTValue<Constructors>;
  readonly streetIntermediate: ADTValue<Constructors>;
  readonly streetResult: ADTValue<Constructors>;
  readonly replayedIntermediate?: ADTValue<Constructors>;
  readonly matchesReplayedIntermediate?: boolean;
  readonly replayedResult?: ADTValue<Constructors>;
  readonly matchesReplayedResult?: boolean;
  readonly expectedResult?: ADTValue<Constructors>;
  readonly matchesExpectedResult?: boolean;
}

export interface ADTPolynomialRelativeStreetKleisliRollup<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
> {
  readonly scenarioId: string;
  readonly samples: ReadonlyArray<
    ADTPolynomialRelativeStreetKleisliRollupSample<Constructors>
  >;
}

export interface ADTPolynomialRelativeStreetRollup<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly extensions: ReadonlyArray<
    ADTPolynomialRelativeStreetExtensionRollup<Constructors>
  >;
  readonly kleisli: ReadonlyArray<
    ADTPolynomialRelativeStreetKleisliRollup<Constructors>
  >;
}

const groupExtensionSnapshots = <
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
>(
  snapshots: ReadonlyArray<ADTPolynomialRelativeStreetExtensionSnapshot<Constructors>>,
) => {
  const grouped = new Map<
    string,
    Array<ADTPolynomialRelativeStreetExtensionSnapshot<Constructors>>
  >();
  for (const snapshot of snapshots) {
    const existing = grouped.get(snapshot.scenarioId);
    if (existing) {
      existing.push(snapshot);
    } else {
      grouped.set(snapshot.scenarioId, [snapshot]);
    }
  }
  return grouped;
};

const groupKleisliSnapshots = <
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
>(
  snapshots: ReadonlyArray<ADTPolynomialRelativeStreetKleisliSnapshot<Constructors>>,
) => {
  const grouped = new Map<
    string,
    Array<ADTPolynomialRelativeStreetKleisliSnapshot<Constructors>>
  >();
  for (const snapshot of snapshots) {
    const existing = grouped.get(snapshot.scenarioId);
    if (existing) {
      existing.push(snapshot);
    } else {
      grouped.set(snapshot.scenarioId, [snapshot]);
    }
  }
  return grouped;
};

export const rollupADTPolynomialRelativeStreet = <
  TypeName extends string,
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
>(
  input: ADTPolynomialRelativeStreetInput<TypeName, Constructors>,
  report: ADTPolynomialRelativeStreetReport<Constructors>,
): ADTPolynomialRelativeStreetRollup<Constructors> => {
  const { adt } = input;
  const issues: string[] = [];

  if (!report.holds) {
    for (const issue of report.extensionIssues) {
      issues.push(
        `Street harness extension issue (${issue.scenarioId}): ${issue.details}`,
      );
    }
    for (const issue of report.kleisliIssues) {
      issues.push(
        `Street harness Kleisli issue (${issue.scenarioId}): ${issue.details}`,
      );
    }
    if (issues.length === 0) {
      issues.push(
        "Street harness reported discrepancies; enriched roll-ups are pending.",
      );
    }
    return {
      holds: false,
      pending: true,
      issues,
      details: `Street harness issues prevent producing enriched roll-ups: ${issues.join(
        "; ",
      )}`,
      extensions: [],
      kleisli: [],
    };
  }

  const fieldsByConstructor = buildFieldsByConstructor(adt.constructorsList);
  const extensionGroups = groupExtensionSnapshots(report.extensionSnapshots);
  const kleisliGroups = groupKleisliSnapshots(report.kleisliSnapshots);

  let pending = false;
  const extensions: Array<
    ADTPolynomialRelativeStreetExtensionRollup<Constructors>
  > = [];

  for (const scenario of input.extensions ?? []) {
    const extend = replayFoldViaPolynomial(adt, fieldsByConstructor, scenario.algebra);
    const groupedSnapshots = extensionGroups.get(scenario.id) ?? [];

    if (groupedSnapshots.length !== scenario.samples.length) {
      pending = true;
      issues.push(
        `Extension scenario ${scenario.id} produced ${groupedSnapshots.length} snapshots for ${scenario.samples.length} samples.`,
      );
    }

    const samples: Array<
      ADTPolynomialRelativeStreetExtensionRollupSample<Constructors>
    > = [];

    for (let index = 0; index < scenario.samples.length; index += 1) {
      const value = scenario.samples[index];
      const snapshot = groupedSnapshots[index];

      if (value === undefined) {
        pending = true;
        issues.push(
          `Extension scenario ${scenario.id} missing Street sample for index ${index}.`,
        );
        continue;
      }

      if (!snapshot) {
        pending = true;
        issues.push(
          `Extension scenario ${scenario.id} missing Street snapshot for sample index ${index}.`,
        );
        continue;
      }

      if (!adt.equals(snapshot.value, value)) {
        issues.push(
          `Extension scenario ${scenario.id} Street snapshot value disagrees with the recorded sample at index ${index}.`,
        );
      }

      let replayedResult: ADTValue<Constructors> | undefined;
      let expectedResult: ADTValue<Constructors> | undefined;

      try {
        replayedResult = extend(value);
      } catch (error) {
        pending = true;
        issues.push(
          `Extension scenario ${scenario.id} failed to replay the Street composite: ${error instanceof Error ? error.message : String(
            error,
          )}.`,
        );
      }

      try {
        expectedResult = scenario.expected(value);
      } catch (error) {
        pending = true;
        issues.push(
          `Extension scenario ${scenario.id} failed to evaluate the expected composite: ${error instanceof Error ? error.message : String(
            error,
          )}.`,
        );
      }

      const matchesReplayedResult =
        replayedResult === undefined
          ? undefined
          : adt.equals(replayedResult, snapshot.result);
      const matchesExpectedResult =
        expectedResult === undefined
          ? undefined
          : scenario.witness.equals(expectedResult, snapshot.result);

      if (matchesReplayedResult === false) {
        issues.push(
          `Extension scenario ${scenario.id} Street snapshot diverged from the replayed fold result.`,
        );
      }

      if (matchesExpectedResult === false) {
        issues.push(
          `Extension scenario ${scenario.id} Street snapshot disagreed with the supplied expectation.`,
        );
      }

      samples.push({
        value,
        streetResult: snapshot.result,
        ...(replayedResult !== undefined && { replayedResult }),
        ...(matchesReplayedResult !== undefined && {
          matchesReplayedResult,
        }),
        ...(expectedResult !== undefined && { expectedResult }),
        ...(matchesExpectedResult !== undefined && {
          matchesExpectedResult,
        }),
      });
    }

    extensions.push({
      scenarioId: scenario.id,
      samples,
    });
  }

  const kleisli: Array<
    ADTPolynomialRelativeStreetKleisliRollup<Constructors>
  > = [];

  for (const scenario of input.kleisli ?? []) {
    const extendFirst = replayFoldViaPolynomial(
      adt,
      fieldsByConstructor,
      scenario.first,
    );
    const extendSecond = replayFoldViaPolynomial(
      adt,
      fieldsByConstructor,
      scenario.second,
    );
    const groupedSnapshots = kleisliGroups.get(scenario.id) ?? [];

    if (groupedSnapshots.length !== scenario.samples.length) {
      pending = true;
      issues.push(
        `Kleisli scenario ${scenario.id} produced ${groupedSnapshots.length} snapshots for ${scenario.samples.length} samples.`,
      );
    }

    const samples: Array<
      ADTPolynomialRelativeStreetKleisliRollupSample<Constructors>
    > = [];

    for (let index = 0; index < scenario.samples.length; index += 1) {
      const value = scenario.samples[index];
      const snapshot = groupedSnapshots[index];

      if (value === undefined) {
        pending = true;
        issues.push(
          `Kleisli scenario ${scenario.id} missing Street sample for index ${index}.`,
        );
        continue;
      }

      if (!snapshot) {
        pending = true;
        issues.push(
          `Kleisli scenario ${scenario.id} missing Street snapshot for sample index ${index}.`,
        );
        continue;
      }

      if (!adt.equals(snapshot.value, value)) {
        issues.push(
          `Kleisli scenario ${scenario.id} Street snapshot value disagrees with the recorded sample at index ${index}.`,
        );
      }

      let replayedIntermediate: ADTValue<Constructors> | undefined;
      let replayedResult: ADTValue<Constructors> | undefined;
      let expectedResult: ADTValue<Constructors> | undefined;

      try {
        replayedIntermediate = extendSecond(value);
        replayedResult = extendFirst(replayedIntermediate);
      } catch (error) {
        pending = true;
        issues.push(
          `Kleisli scenario ${scenario.id} failed to replay the Street composites: ${error instanceof Error ? error.message : String(
            error,
          )}.`,
        );
      }

      try {
        expectedResult = scenario.expected({
          value,
          extendFirst,
          extendSecond,
        });
      } catch (error) {
        pending = true;
        issues.push(
          `Kleisli scenario ${scenario.id} failed to evaluate the expected composite: ${error instanceof Error ? error.message : String(
            error,
          )}.`,
        );
      }

      const matchesReplayedIntermediate =
        replayedIntermediate === undefined
          ? undefined
          : adt.equals(replayedIntermediate, snapshot.intermediate);
      const matchesReplayedResult =
        replayedResult === undefined
          ? undefined
          : adt.equals(replayedResult, snapshot.result);
      const matchesExpectedResult =
        expectedResult === undefined
          ? undefined
          : scenario.witness.equals(expectedResult, snapshot.result);

      if (matchesReplayedIntermediate === false) {
        issues.push(
          `Kleisli scenario ${scenario.id} Street intermediate disagreed with the replayed second extension.`,
        );
      }

      if (matchesReplayedResult === false) {
        issues.push(
          `Kleisli scenario ${scenario.id} Street result disagreed with the replayed first extension.`,
        );
      }

      if (matchesExpectedResult === false) {
        issues.push(
          `Kleisli scenario ${scenario.id} Street result disagreed with the supplied expectation.`,
        );
      }

      samples.push({
        value,
        streetIntermediate: snapshot.intermediate,
        streetResult: snapshot.result,
        ...(replayedIntermediate !== undefined && { replayedIntermediate }),
        ...(matchesReplayedIntermediate !== undefined && {
          matchesReplayedIntermediate,
        }),
        ...(replayedResult !== undefined && { replayedResult }),
        ...(matchesReplayedResult !== undefined && {
          matchesReplayedResult,
        }),
        ...(expectedResult !== undefined && { expectedResult }),
        ...(matchesExpectedResult !== undefined && {
          matchesExpectedResult,
        }),
      });
    }

    kleisli.push({
      scenarioId: scenario.id,
      samples,
    });
  }

  const holds = issues.length === 0 && !pending;
  const details = holds
    ? "Street harness roll-ups reproduce extension and Kleisli composites for enriched adapters."
    : `Street roll-up evaluation uncovered issues: ${issues.join("; ")}`;

  return {
    holds,
    pending,
    issues,
    details,
    extensions,
    kleisli,
  };
};

export type ADTPolynomialRelativeStreetEnrichedOptions<
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>
> = RelativeEnrichedStreetRollupOptions<
  ADTPolynomialRelativeStreetRollup<Constructors>
>;

export interface ADTPolynomialRelativeStreetEnrichedBundle<
  TypeName extends string,
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>
> {
  readonly report: ADTPolynomialRelativeStreetReport<Constructors>;
  readonly rollup: ADTPolynomialRelativeStreetRollup<Constructors>;
  readonly options: ADTPolynomialRelativeStreetEnrichedOptions<Constructors>;
}

export const buildADTPolynomialRelativeStreetEnrichedBundle = <
  TypeName extends string,
  Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
>(
  input: ADTPolynomialRelativeStreetInput<TypeName, Constructors>,
  reportOverride?: ADTPolynomialRelativeStreetReport<Constructors>,
  rollupOverride?: ADTPolynomialRelativeStreetRollup<Constructors>,
): ADTPolynomialRelativeStreetEnrichedBundle<TypeName, Constructors> => {
  const report = reportOverride ?? analyzeADTPolynomialRelativeStreet(input);
  const rollup = rollupOverride ?? rollupADTPolynomialRelativeStreet(input, report);
  const options: ADTPolynomialRelativeStreetEnrichedOptions<Constructors> = {
    yoneda: { streetRollups: rollup },
    yonedaDistributor: { streetRollups: rollup },
    eilenbergMoore: { streetRollups: rollup },
    kleisli: { streetRollups: rollup },
    vcat: { streetRollups: rollup },
  };

  return {
    report,
    rollup,
    options,
  };
};

