import type { IndexedElement } from "../chu-space";
import {
  type Coproduct,
  getCarrierSemantics,
  semanticsAwareEquals,
  type SetHom,
  type SetObj,
} from "../set-cat";
import type {
  CoproductInteractionLawResult,
  FunctorInteractionLaw,
  InteractionLawCurryingSummary,
  InteractionLawFiberDiscrepancy,
  LaxMonoidalDualComparisonResult,
  ProductInteractionLawResult,
} from "../functor-interaction-law";
import {
  deriveInteractionLawCurrying,
  laxMonoidalDualComparison,
} from "../functor-interaction-law";

const DEFAULT_SAMPLE_LIMIT = 64;

const enumerateCarrier = <T>(carrier: SetObj<T>): ReadonlyArray<T> => {
  const semantics = getCarrierSemantics(carrier);
  if (semantics?.iterate) {
    return Array.from(semantics.iterate());
  }
  return Array.from(carrier);
};

const structuralValueEquals = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) {
    return true;
  }
  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((value, index) => structuralValueEquals(value, right[index]))
    );
  }
  if (left && right && typeof left === "object" && typeof right === "object") {
    const leftKeys = Object.keys(left as Record<string, unknown>);
    const rightKeys = Object.keys(right as Record<string, unknown>);
    if (leftKeys.length !== rightKeys.length) {
      return false;
    }
    return leftKeys.every((key) =>
      structuralValueEquals(
        (left as Record<string, unknown>)[key],
        (right as Record<string, unknown>)[key],
      ),
    );
  }
  return false;
};

const structuralCoproductEquals = <A, B>(
  left: Coproduct<A, B>,
  right: Coproduct<A, B>,
): boolean => left.tag === right.tag && Object.is(left.value, right.value);

const normalizedSampleLimit = (limit: number | undefined): number =>
  limit === undefined || limit < 0 ? DEFAULT_SAMPLE_LIMIT : limit;

export interface InteractionLawProductUniversalPropertyOptions {
  readonly sampleLimit?: number;
}

export interface InteractionLawStretchingOptions {
  readonly sampleLimit?: number;
}

export interface InteractionLawStretchingSample<
  Obj,
  LeftPrime,
  RightPrime,
  Left,
  Right,
  Value,
> {
  readonly object: Obj;
  readonly stretchedPrimal: IndexedElement<Obj, LeftPrime>;
  readonly stretchedDual: IndexedElement<Obj, RightPrime>;
  readonly basePrimal: IndexedElement<Obj, Left>;
  readonly baseDual: IndexedElement<Obj, Right>;
  readonly stretchedValue: Value;
  readonly baseValue: Value;
  readonly matches: boolean;
}

export interface InteractionLawStretchingResult<
  Obj,
  Arr,
  Left,
  Right,
  Value,
  LeftPrime,
  RightPrime,
> {
  readonly base: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>;
  readonly stretched: FunctorInteractionLaw<
    Obj,
    Arr,
    LeftPrime,
    RightPrime,
    Value
  >;
  readonly samples: ReadonlyArray<
    InteractionLawStretchingSample<Obj, LeftPrime, RightPrime, Left, Right, Value>
  >;
  readonly mismatches: ReadonlyArray<
    InteractionLawStretchingSample<Obj, LeftPrime, RightPrime, Left, Right, Value>
  >;
  readonly truncated: boolean;
  readonly holds: boolean;
  readonly details: ReadonlyArray<string>;
}

export interface InteractionLawProductProjectionSample<
  Obj,
  LeftPair,
  RightPair,
  ValuePair,
  FactorLeft,
  FactorRight,
  FactorValue,
> {
  readonly object: Obj;
  readonly productPrimal: IndexedElement<Obj, LeftPair>;
  readonly productDual: IndexedElement<Obj, RightPair>;
  readonly factorPrimal: IndexedElement<Obj, FactorLeft>;
  readonly factorDual: IndexedElement<Obj, FactorRight>;
  readonly productValue: ValuePair;
  readonly projectedValue: FactorValue;
  readonly factorValue: FactorValue;
  readonly matches: boolean;
}

export interface InteractionLawProductProjectionCheck<
  Obj,
  LeftPair,
  RightPair,
  ValuePair,
  FactorLeft,
  FactorRight,
  FactorValue,
> {
  readonly projection: "first" | "second";
  readonly samples: ReadonlyArray<
    InteractionLawProductProjectionSample<
      Obj,
      LeftPair,
      RightPair,
      ValuePair,
      FactorLeft,
      FactorRight,
      FactorValue
    >
  >;
  readonly checkedPairs: number;
  readonly truncated: boolean;
  readonly holds: boolean;
  readonly details: ReadonlyArray<string>;
}

export interface InteractionLawProductUniversalPropertyResult<
  Obj,
  Arr,
  Left0,
  Right0,
  Value0,
  Left1,
  Right1,
  Value1,
> {
  readonly product: ProductInteractionLawResult<
    Obj,
    Arr,
    Left0,
    Right0,
    Value0,
    Left1,
    Right1,
    Value1
  >;
  readonly first: InteractionLawProductProjectionCheck<
    Obj,
    readonly [Left0, Left1],
    readonly [Right0, Right1],
    readonly [Value0, Value1],
    Left0,
    Right0,
    Value0
  >;
  readonly second: InteractionLawProductProjectionCheck<
    Obj,
    readonly [Left0, Left1],
    readonly [Right0, Right1],
    readonly [Value0, Value1],
    Left1,
    Right1,
    Value1
  >;
  readonly holds: boolean;
  readonly details: ReadonlyArray<string>;
}

export interface InteractionLawStretchingWitness<Obj, LeftPrime, RightPrime, Left, Right> {
  readonly mapLeft: (object: Obj, element: LeftPrime) => Left;
  readonly mapRight: (object: Obj, element: RightPrime) => Right;
}

export const checkInteractionLawStretching = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
  LeftPrime,
  RightPrime,
>(
  base: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  stretched: FunctorInteractionLaw<Obj, Arr, LeftPrime, RightPrime, Value>,
  witness: InteractionLawStretchingWitness<Obj, LeftPrime, RightPrime, Left, Right>,
  options?: InteractionLawStretchingOptions,
): InteractionLawStretchingResult<Obj, Arr, Left, Right, Value, LeftPrime, RightPrime> => {
  const details: string[] = [];
  const sampleLimit = normalizedSampleLimit(options?.sampleLimit);

  if (base.kernel !== stretched.kernel) {
    details.push("Stretching comparison requires laws over the same promonoidal kernel.");
  }

  const equals = semanticsAwareEquals(stretched.dualizing);
  const samples: InteractionLawStretchingSample<
    Obj,
    LeftPrime,
    RightPrime,
    Left,
    Right,
    Value
  >[] = [];
  const mismatches: InteractionLawStretchingSample<
    Obj,
    LeftPrime,
    RightPrime,
    Left,
    Right,
    Value
  >[] = [];

  let truncated = false;

  const primals = enumerateCarrier(stretched.primalCarrier);
  const duals = enumerateCarrier(stretched.dualCarrier);

  outer: for (const stretchedPrimal of primals) {
    for (const stretchedDual of duals) {
      if (samples.length >= sampleLimit) {
        truncated = true;
        break outer;
      }

      const basePrimal: IndexedElement<Obj, Left> = {
        object: stretchedPrimal.object,
        element: witness.mapLeft(stretchedPrimal.object, stretchedPrimal.element),
      };
      const baseDual: IndexedElement<Obj, Right> = {
        object: stretchedDual.object,
        element: witness.mapRight(stretchedDual.object, stretchedDual.element),
      };

      const stretchedValue = stretched.evaluate(stretchedPrimal, stretchedDual);
      const baseValue = base.evaluate(basePrimal, baseDual);
      const matches = equals
        ? equals(stretchedValue, baseValue)
        : Object.is(stretchedValue, baseValue);

      const sample: InteractionLawStretchingSample<
        Obj,
        LeftPrime,
        RightPrime,
        Left,
        Right,
        Value
      > = {
        object: stretchedPrimal.object,
        stretchedPrimal,
        stretchedDual,
        basePrimal,
        baseDual,
        stretchedValue,
        baseValue,
        matches,
      };

      samples.push(sample);
      if (!matches) {
        mismatches.push(sample);
        details.push(
          `Mismatch detected for ${String(sample.object)} with mapped witnesses; stretched value ${String(sample.stretchedValue)} differs from base value ${String(sample.baseValue)}.`,
        );
      }
    }
  }

  const holds = details.length === 0;

  if (truncated) {
    details.push(
      `Sample limit of ${sampleLimit} reached while comparing stretched interaction law evaluations.`,
    );
  }

  return {
    base,
    stretched,
    samples,
    mismatches,
    truncated,
    holds,
    details,
  };
};

export interface InteractionLawCCCPresentationFiberDiagnostics<Obj> {
  readonly object: Obj;
  readonly diagnostics: ReadonlyArray<string>;
}

export interface InteractionLawCCCPresentationResult<
  Obj,
  Arr,
  Left,
  Right,
  Value,
> {
  readonly law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>;
  readonly summary: InteractionLawCurryingSummary<Obj, Arr, Left, Right, Value>;
  readonly doubleTranspose: {
    readonly consistent: boolean;
    readonly discrepancies: ReadonlyArray<
      InteractionLawFiberDiscrepancy<Obj, Left, Right, Value>
    >;
  };
  readonly hatEvaluation: {
    readonly consistent: boolean;
    readonly discrepancies: ReadonlyArray<
      InteractionLawFiberDiscrepancy<Obj, Left, Right, Value>
    >;
  };
  readonly finalTransformation: {
    readonly implemented: boolean;
    readonly fibers: ReadonlyArray<
      InteractionLawCCCPresentationFiberDiagnostics<Obj>
    >;
  };
  readonly holds: boolean;
  readonly details: ReadonlyArray<string>;
}

const buildCCCDetails = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
>(
  summary: InteractionLawCurryingSummary<Obj, Arr, Left, Right, Value>,
): ReadonlyArray<string> => {
  const details: string[] = [];

  if (!summary.doubleTransposeConsistent) {
    details.push(
      `Double transpose mismatch detected for ${summary.discrepancies.length} fiber(s).`,
    );
  }

  if (!summary.hatEvaluationConsistent) {
    details.push(
      `φ̂ evaluation mismatch detected for ${summary.hatEvaluationDiscrepancies.length} fiber(s).`,
    );
  }

  for (const [object, fiber] of summary.fibers) {
    if (!fiber.finalTransformation.implemented) {
      details.push(`Final transformation for ${String(object)} not fully implemented.`);
    }
    for (const diagnostic of fiber.finalTransformation.diagnostics) {
      details.push(`${String(object)}: ${diagnostic}`);
    }
    for (const component of fiber.finalTransformation.components) {
      for (const diagnostic of component.diagnostics) {
        details.push(
          `δ^${String(object)}_${String(component.parameter)}: ${diagnostic}`,
        );
      }
    }
  }

  return details;
};

const extractFinalTransformationDiagnostics = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
>(
  summary: InteractionLawCurryingSummary<Obj, Arr, Left, Right, Value>,
): InteractionLawCCCPresentationResult<Obj, Arr, Left, Right, Value>["finalTransformation"] => {
  const fibers: Array<InteractionLawCCCPresentationFiberDiagnostics<Obj>> = [];
  let implemented = true;

  for (const [object, fiber] of summary.fibers) {
    fibers.push({
      object,
      diagnostics: [
        ...fiber.finalTransformation.diagnostics,
        ...fiber.finalTransformation.components.flatMap((component) => component.diagnostics),
      ],
    });
    if (!fiber.finalTransformation.implemented) {
      implemented = false;
    }
  }

  return { implemented, fibers };
};

export const checkInteractionLawCCCPresentation = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
): InteractionLawCCCPresentationResult<Obj, Arr, Left, Right, Value> => {
  const summary = deriveInteractionLawCurrying(law);
  const finalTransformation = extractFinalTransformationDiagnostics(summary);
  const details = buildCCCDetails(summary);
  const holds = summary.doubleTransposeConsistent && summary.hatEvaluationConsistent;

  return {
    law,
    summary,
    doubleTranspose: {
      consistent: summary.doubleTransposeConsistent,
      discrepancies: summary.discrepancies,
    },
    hatEvaluation: {
      consistent: summary.hatEvaluationConsistent,
      discrepancies: summary.hatEvaluationDiscrepancies,
    },
    finalTransformation,
    holds,
    details,
  };
};

export const checkInteractionLawProductUniversalProperty = <
  Obj,
  Arr,
  Left0,
  Right0,
  Value0,
  Left1,
  Right1,
  Value1,
>(
  result: ProductInteractionLawResult<Obj, Arr, Left0, Right0, Value0, Left1, Right1, Value1>,
  law0: FunctorInteractionLaw<Obj, Arr, Left0, Right0, Value0>,
  law1: FunctorInteractionLaw<Obj, Arr, Left1, Right1, Value1>,
  options: InteractionLawProductUniversalPropertyOptions = {},
): InteractionLawProductUniversalPropertyResult<
  Obj,
  Arr,
  Left0,
  Right0,
  Value0,
  Left1,
  Right1,
  Value1
> => {
  const { law: productLaw } = result;
  if (productLaw.kernel !== law0.kernel || productLaw.kernel !== law1.kernel) {
    throw new Error("checkInteractionLawProductUniversalProperty: mismatched kernels.");
  }

  const sampleLimit = normalizedSampleLimit(options.sampleLimit);
  const valueFirstProjection = result.projections.value.projections.fst;
  const valueSecondProjection = result.projections.value.projections.snd;

  const analyzeProjection = <FactorLeft, FactorRight, FactorValue>(
    projection: "first" | "second",
    factor: FunctorInteractionLaw<Obj, Arr, FactorLeft, FactorRight, FactorValue>,
    leftProjectionAccessor: (object: Obj) => SetHom<readonly [Left0, Left1], FactorLeft>,
    rightProjectionAccessor: (object: Obj) => SetHom<readonly [Right0, Right1], FactorRight>,
    valueProjection: SetHom<readonly [Value0, Value1], FactorValue>,
  ): InteractionLawProductProjectionCheck<
    Obj,
    readonly [Left0, Left1],
    readonly [Right0, Right1],
    readonly [Value0, Value1],
    FactorLeft,
    FactorRight,
    FactorValue
  > => {
    const samples: Array<
      InteractionLawProductProjectionSample<
        Obj,
        readonly [Left0, Left1],
        readonly [Right0, Right1],
        readonly [Value0, Value1],
        FactorLeft,
        FactorRight,
        FactorValue
      >
    > = [];
    const details: string[] = [];
    let checkedPairs = 0;
    let truncated = false;

    for (const object of productLaw.kernel.base.objects) {
      const productLeftCarrier = productLaw.left.functor.F0(object);
      const productRightCarrier = productLaw.right.functor.F0(object);
      const factorLeftCarrier = factor.left.functor.F0(object);
      const factorRightCarrier = factor.right.functor.F0(object);

      const leftProjection = leftProjectionAccessor(object);
      const rightProjection = rightProjectionAccessor(object);

      if (!Object.is(leftProjection.dom, productLeftCarrier)) {
        details.push(`Left projection for ${String(object)} has unexpected domain.`);
        continue;
      }
      if (!Object.is(leftProjection.cod, factorLeftCarrier)) {
        details.push(`Left projection for ${String(object)} has unexpected codomain.`);
        continue;
      }
      if (!Object.is(rightProjection.dom, productRightCarrier)) {
        details.push(`Right projection for ${String(object)} has unexpected domain.`);
        continue;
      }
      if (!Object.is(rightProjection.cod, factorRightCarrier)) {
        details.push(`Right projection for ${String(object)} has unexpected codomain.`);
        continue;
      }

      const productLeftElements = enumerateCarrier(productLeftCarrier);
      const productRightElements = enumerateCarrier(productRightCarrier);

      outer: for (const leftElement of productLeftElements) {
        for (const rightElement of productRightElements) {
          if (samples.length >= sampleLimit) {
            truncated = true;
            break outer;
          }

          const productPrimal: IndexedElement<Obj, readonly [Left0, Left1]> = {
            object,
            element: leftElement,
          };
          const productDual: IndexedElement<Obj, readonly [Right0, Right1]> = {
            object,
            element: rightElement,
          };

          const factorPrimal: IndexedElement<Obj, FactorLeft> = {
            object,
            element: leftProjection.map(leftElement),
          };
          const factorDual: IndexedElement<Obj, FactorRight> = {
            object,
            element: rightProjection.map(rightElement),
          };

          const productValue = productLaw.evaluate(productPrimal, productDual);
          const projectedValue = valueProjection.map(productValue);
          const factorValue = factor.evaluate(factorPrimal, factorDual);
          const matches = Object.is(factorValue, projectedValue);

          if (!matches) {
            details.push(
              `${projection} projection mismatch on ${String(object)}: expected ${String(
                factorValue,
              )} but obtained ${String(projectedValue)}.`,
            );
          }

          samples.push({
            object,
            productPrimal,
            productDual,
            factorPrimal,
            factorDual,
            productValue,
            projectedValue,
            factorValue,
            matches,
          });
          checkedPairs += 1;
        }
      }
    }

    if (truncated) {
      details.push(`Projection ${projection} truncated after ${samples.length} samples.`);
    }

    const holds = samples.every((sample) => sample.matches);
    return { projection, samples, checkedPairs, truncated, holds, details };
  };

  const first = analyzeProjection(
    "first",
    law0,
    (object) => result.projections.left(object).projections.fst,
    (object) => result.projections.right(object).projections.fst,
    valueFirstProjection,
  );
  const second = analyzeProjection(
    "second",
    law1,
    (object) => result.projections.left(object).projections.snd,
    (object) => result.projections.right(object).projections.snd,
    valueSecondProjection,
  );

  return {
    product: result,
    first,
    second,
    holds: first.holds && second.holds,
    details: [...first.details, ...second.details],
  };
};

export interface InteractionLawCoproductUniversalPropertyOptions {
  readonly sampleLimit?: number;
}

export interface InteractionLawCoproductInjectionSample<
  Obj,
  FactorLeft,
  FactorRight,
  FactorValue,
  LeftCoproduct,
  RightCoproduct,
  ValueCoproduct,
> {
  readonly object: Obj;
  readonly factorPrimal: IndexedElement<Obj, FactorLeft>;
  readonly factorDual: IndexedElement<Obj, FactorRight>;
  readonly injectedPrimal: IndexedElement<Obj, LeftCoproduct>;
  readonly injectedDual: IndexedElement<Obj, RightCoproduct>;
  readonly factorValue: FactorValue;
  readonly injectedValue: ValueCoproduct;
  readonly lawValue: ValueCoproduct;
  readonly matches: boolean;
}

export interface InteractionLawCoproductInjectionCheck<
  Obj,
  FactorLeft,
  FactorRight,
  FactorValue,
  LeftCoproduct,
  RightCoproduct,
  ValueCoproduct,
> {
  readonly injection: "inl" | "inr";
  readonly samples: ReadonlyArray<
    InteractionLawCoproductInjectionSample<
      Obj,
      FactorLeft,
      FactorRight,
      FactorValue,
      LeftCoproduct,
      RightCoproduct,
      ValueCoproduct
    >
  >;
  readonly checkedPairs: number;
  readonly truncated: boolean;
  readonly holds: boolean;
  readonly details: ReadonlyArray<string>;
}

export interface InteractionLawCoproductUniversalPropertyResult<
  Obj,
  Arr,
  Left0,
  Right0,
  Value0,
  Left1,
  Right1,
  Value1,
> {
  readonly coproduct: CoproductInteractionLawResult<
    Obj,
    Arr,
    Left0,
    Right0,
    Value0,
    Left1,
    Right1,
    Value1
  >;
  readonly left: InteractionLawCoproductInjectionCheck<
    Obj,
    Left0,
    Right0,
    Value0,
    Coproduct<Left0, Left1>,
    Coproduct<Right0, Right1>,
    Coproduct<Value0, Value1>
  >;
  readonly right: InteractionLawCoproductInjectionCheck<
    Obj,
    Left1,
    Right1,
    Value1,
    Coproduct<Left0, Left1>,
    Coproduct<Right0, Right1>,
    Coproduct<Value0, Value1>
  >;
  readonly holds: boolean;
  readonly details: ReadonlyArray<string>;
}

export const checkInteractionLawCoproductUniversalProperty = <
  Obj,
  Arr,
  Left0,
  Right0,
  Value0,
  Left1,
  Right1,
  Value1,
>(
  result: CoproductInteractionLawResult<Obj, Arr, Left0, Right0, Value0, Left1, Right1, Value1>,
  law0: FunctorInteractionLaw<Obj, Arr, Left0, Right0, Value0>,
  law1: FunctorInteractionLaw<Obj, Arr, Left1, Right1, Value1>,
  options: InteractionLawCoproductUniversalPropertyOptions = {},
): InteractionLawCoproductUniversalPropertyResult<
  Obj,
  Arr,
  Left0,
  Right0,
  Value0,
  Left1,
  Right1,
  Value1
> => {
  const { law: coproductLaw } = result;
  if (coproductLaw.kernel !== law0.kernel || coproductLaw.kernel !== law1.kernel) {
    throw new Error("checkInteractionLawCoproductUniversalProperty: mismatched kernels.");
  }

  const sampleLimit = normalizedSampleLimit(options.sampleLimit);

  const analyzeInjection = <FactorLeft, FactorRight, FactorValue>(
    injection: "inl" | "inr",
    factor: FunctorInteractionLaw<Obj, Arr, FactorLeft, FactorRight, FactorValue>,
    leftInjectionAccessor: (object: Obj) => SetHom<FactorLeft, Coproduct<Left0, Left1>>,
    rightInjectionAccessor: (object: Obj) => SetHom<FactorRight, Coproduct<Right0, Right1>>,
    valueInjection: SetHom<FactorValue, Coproduct<Value0, Value1>>,
  ): InteractionLawCoproductInjectionCheck<
    Obj,
    FactorLeft,
    FactorRight,
    FactorValue,
    Coproduct<Left0, Left1>,
    Coproduct<Right0, Right1>,
    Coproduct<Value0, Value1>
  > => {
    const samples: Array<
      InteractionLawCoproductInjectionSample<
        Obj,
        FactorLeft,
        FactorRight,
        FactorValue,
        Coproduct<Left0, Left1>,
        Coproduct<Right0, Right1>,
        Coproduct<Value0, Value1>
      >
    > = [];
    const details: string[] = [];
    let checkedPairs = 0;
    let truncated = false;

    for (const object of coproductLaw.kernel.base.objects) {
      const factorLeftCarrier = factor.left.functor.F0(object);
      const factorRightCarrier = factor.right.functor.F0(object);
      const coproductLeftCarrier = coproductLaw.left.functor.F0(object);
      const coproductRightCarrier = coproductLaw.right.functor.F0(object);

      const leftInjection = leftInjectionAccessor(object);
      const rightInjection = rightInjectionAccessor(object);

      if (!Object.is(leftInjection.dom, factorLeftCarrier)) {
        details.push(`Left injection for ${String(object)} has unexpected domain.`);
        continue;
      }
      if (!Object.is(leftInjection.cod, coproductLeftCarrier)) {
        details.push(`Left injection for ${String(object)} has unexpected codomain.`);
        continue;
      }
      if (!Object.is(rightInjection.dom, factorRightCarrier)) {
        details.push(`Right injection for ${String(object)} has unexpected domain.`);
        continue;
      }
      if (!Object.is(rightInjection.cod, coproductRightCarrier)) {
        details.push(`Right injection for ${String(object)} has unexpected codomain.`);
        continue;
      }

      const factorLeftElements = enumerateCarrier(factorLeftCarrier);
      const factorRightElements = enumerateCarrier(factorRightCarrier);

      outer: for (const leftElement of factorLeftElements) {
        for (const rightElement of factorRightElements) {
          if (samples.length >= sampleLimit) {
            truncated = true;
            break outer;
          }

          const factorPrimal: IndexedElement<Obj, FactorLeft> = { object, element: leftElement };
          const factorDual: IndexedElement<Obj, FactorRight> = { object, element: rightElement };

          const injectedPrimal: IndexedElement<Obj, Coproduct<Left0, Left1>> = {
            object,
            element: leftInjection.map(leftElement),
          };
          const injectedDual: IndexedElement<Obj, Coproduct<Right0, Right1>> = {
            object,
            element: rightInjection.map(rightElement),
          };

          const factorValue = factor.evaluate(factorPrimal, factorDual);
          const injectedValue = valueInjection.map(factorValue);
          const lawValue = coproductLaw.evaluate(injectedPrimal, injectedDual);
          const matches = structuralCoproductEquals(injectedValue, lawValue);

          if (!matches) {
            details.push(
              `${injection} injection mismatch on ${String(object)}: expected ${JSON.stringify(
                injectedValue,
              )} but obtained ${JSON.stringify(lawValue)}.`,
            );
          }

          samples.push({
            object,
            factorPrimal,
            factorDual,
            injectedPrimal,
            injectedDual,
            factorValue,
            injectedValue,
            lawValue,
            matches,
          });
          checkedPairs += 1;
        }
      }
    }

    if (truncated) {
      details.push(`Injection ${injection} truncated after ${samples.length} samples.`);
    }

    const holds = samples.every((sample) => sample.matches);
    return { injection, samples, checkedPairs, truncated, holds, details };
  };

  const left = analyzeInjection(
    "inl",
    law0,
    (object) => result.injections.left(object).injections.inl,
    (object) => result.injections.right(object).injections.inl,
    result.injections.value.injections.inl,
  );
  const right = analyzeInjection(
    "inr",
    law1,
    (object) => result.injections.left(object).injections.inr,
    (object) => result.injections.right(object).injections.inr,
    result.injections.value.injections.inr,
  );

  return {
    coproduct: result,
    left,
    right,
    holds: left.holds && right.holds,
    details: [...left.details, ...right.details],
  };
};

export interface LaxMonoidalDualComparisonOracleOptions {
  readonly sampleLimit?: number;
}

export interface LaxMonoidalDualComparisonSample<
  Obj,
  Left0,
  Left1,
  Right0,
  Right1,
  Value0,
  Value1,
> {
  readonly object: Obj;
  readonly referencePrimal: IndexedElement<Obj, readonly [Left0, Left1]>;
  readonly referenceDual: IndexedElement<Obj, readonly [Right0, Right1]>;
  readonly domainPrimal: IndexedElement<Obj, readonly [Right1, Right0]>;
  readonly domainDual: IndexedElement<Obj, readonly [Left1, Left0]>;
  readonly referenceValue: readonly [Value0, Value1];
  readonly domainValue: readonly [Value1, Value0];
  readonly mappedValue: readonly [Value0, Value1];
  readonly matches: boolean;
}

export interface LaxMonoidalDualComparisonOracleResult<
  Obj,
  Arr,
  Left0,
  Right0,
  Value0,
  Left1,
  Right1,
  Value1,
> {
  readonly comparison: LaxMonoidalDualComparisonResult<
    Obj,
    Arr,
    Left0,
    Right0,
    Value0,
    Left1,
    Right1,
    Value1
  >;
  readonly samples: ReadonlyArray<
    LaxMonoidalDualComparisonSample<Obj, Left0, Left1, Right0, Right1, Value0, Value1>
  >;
  readonly mismatches: ReadonlyArray<
    LaxMonoidalDualComparisonSample<Obj, Left0, Left1, Right0, Right1, Value0, Value1>
  >;
  readonly truncated: boolean;
  readonly holds: boolean;
  readonly details: ReadonlyArray<string>;
}

export const checkLaxMonoidalDualComparison = <
  Obj,
  Arr,
  Left0,
  Right0,
  Value0,
  Left1,
  Right1,
  Value1,
>(
  leftLaw: FunctorInteractionLaw<Obj, Arr, Left0, Right0, Value0>,
  rightLaw: FunctorInteractionLaw<Obj, Arr, Left1, Right1, Value1>,
  options: LaxMonoidalDualComparisonOracleOptions = {},
): LaxMonoidalDualComparisonOracleResult<
  Obj,
  Arr,
  Left0,
  Right0,
  Value0,
  Left1,
  Right1,
  Value1
> => {
  if (leftLaw.kernel !== rightLaw.kernel) {
    throw new Error("checkLaxMonoidalDualComparison: laws must share the same promonoidal kernel.");
  }

  const comparison = laxMonoidalDualComparison(leftLaw, rightLaw);
  const sampleLimit = normalizedSampleLimit(options.sampleLimit);

  const referenceLaw = comparison.reference.law;
  const domainLaw = comparison.domain;
  const samples: Array<
    LaxMonoidalDualComparisonSample<Obj, Left0, Left1, Right0, Right1, Value0, Value1>
  > = [];
  const mismatches: typeof samples = [];

  let truncated = false;

  outer: for (const primal of referenceLaw.primalCarrier) {
    for (const dual of referenceLaw.dualCarrier) {
      if (samples.length >= sampleLimit) {
        truncated = true;
        break outer;
      }

      const domainPrimal: IndexedElement<Obj, readonly [Right1, Right0]> = {
        object: primal.object,
        element: [primal.element[1], primal.element[0]] as unknown as readonly [
          Right1,
          Right0,
        ],
      };
      const domainDual: IndexedElement<Obj, readonly [Left1, Left0]> = {
        object: dual.object,
        element: [dual.element[1], dual.element[0]] as unknown as readonly [Left1, Left0],
      };

      const referenceValue = referenceLaw.evaluate(primal, dual);
      const domainValue = domainLaw.evaluate(domainPrimal, domainDual);
      const mappedValue = [domainValue[1], domainValue[0]] as unknown as readonly [
        Value0,
        Value1,
      ];
      const matches = structuralValueEquals(referenceValue, mappedValue);

      const sample: LaxMonoidalDualComparisonSample<
        Obj,
        Left0,
        Left1,
        Right0,
        Right1,
        Value0,
        Value1
      > = {
        object: primal.object,
        referencePrimal: primal,
        referenceDual: dual,
        domainPrimal,
        domainDual,
        referenceValue,
        domainValue,
        mappedValue,
        matches,
      };

      samples.push(sample);
      if (!matches) {
        mismatches.push(sample);
      }
    }
  }

  const holds = comparison.comparison.matches && mismatches.length === 0;

  const details: string[] = [
    comparison.comparison.matches
      ? "laxMonoidalDualComparison: specialised law aligns with the reference dual."
      : "laxMonoidalDualComparison: specialised law differs from the reference dual.",
    comparison.valueMap.bijective
      ? "laxMonoidalDualComparison: value map witness is bijective, yielding an isomorphism."
      : "laxMonoidalDualComparison: value map witness is not bijective; only lax structure obtained.",
  ];

  if (truncated) {
    details.push(`Sample limit of ${sampleLimit} reached while analysing dual comparison.`);
  }

  details.push(...comparison.diagnostics);

  return {
    comparison,
    samples,
    mismatches,
    truncated,
    holds,
    details,
  };
};
