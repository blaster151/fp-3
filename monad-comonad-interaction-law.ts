import {
  deriveInteractionLawCurrying,
  deriveInteractionLawLeftCommaPresentation,
  deriveInteractionLawSweedlerSummary,
  dualInteractionLaw,
  productInteractionLaw,
  stretchInteractionLaw,
  greatestInteractingComonad,
  greatestInteractingFunctor,
  makeCommutativeBinaryMonadOperation,
  makeFunctorInteractionLaw,
  makeFunctorInteractionLawOperations,
  type InteractionLawProductProjections,
  type DualInteractionLawResult,
  type FunctorInteractionLaw,
  type FunctorInteractionLawContribution,
  type GreatestInteractingComonadOptions,
  type GreatestInteractingComonadResult,
  type GreatestInteractingFunctorOptions,
  type GreatestInteractingFunctorResult,
  type InteractionLawCurryingSummary,
  type InteractionLawFiberCurrying,
  type InteractionLawFiberFinalTransformation,
  type InteractionLawLeftCommaPresentation,
  type InteractionLawLeftCommaEquivalence,
  type InteractionLawSweedlerSummary,
  type StretchInteractionLawOptions,
} from "./functor-interaction-law";
import {
  analyzeFunctorOperationDegeneracy,
  type FunctorOperationDegeneracyReport,
} from "./functor-interaction-law-degeneracy";
import type {
  FunctorWithWitness,
} from "./functor";
import type {
  NaturalTransformationWithWitness,
} from "./natural-transformation";
import { constructContravariantFunctorWithWitness } from "./contravariant";
import { constructFunctorWithWitness } from "./functor";
import {
  contravariantRepresentableFunctorWithWitness,
  covariantRepresentableFunctorWithWitness,
} from "./functor-representable";
import { dayTensor } from "./day-convolution";
import { setSimpleCategory } from "./set-simple-category";
import {
  SetCat,
  SetOmega,
  getCarrierSemantics,
  semanticsAwareHas,
  semanticsAwareEquals,
  type Coproduct,
  type CoproductData,
  type ExponentialArrow,
  type ProductData,
  type SetHom,
  type SetObj,
  type SetTerminalObject,
} from "./set-cat";
import { makeTwoObjectPromonoidalKernel } from "./promonoidal-structure";
import { TwoObjectCategory, type TwoObject, type TwoArrow } from "./two-object-cat";
import { constructNaturalTransformationWithWitness } from "./natural-transformation";
import type { IndexedElement } from "./chu-space";

export interface MonadStructure<Obj, Arr> {
  readonly functor: FunctorWithWitness<Obj, Arr, Obj, Arr>;
  readonly unit: NaturalTransformationWithWitness<Obj, Arr, Obj, Arr>;
  readonly multiplication: NaturalTransformationWithWitness<Obj, Arr, Obj, Arr>;
  readonly metadata?: ReadonlyArray<string>;
}

export interface ComonadStructure<Obj, Arr> {
  readonly functor: FunctorWithWitness<Obj, Arr, Obj, Arr>;
  readonly counit: NaturalTransformationWithWitness<Obj, Arr, Obj, Arr>;
  readonly comultiplication: NaturalTransformationWithWitness<Obj, Arr, Obj, Arr>;
  readonly metadata?: ReadonlyArray<string>;
}

export interface MonadComonadInteractionLawInput<
  Obj,
  Arr,
  Left,
  Right,
  Value,
  LawObj = Obj,
  LawArr = Arr,
> {
  readonly monad: MonadStructure<Obj, Arr>;
  readonly comonad: ComonadStructure<Obj, Arr>;
  readonly law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>;
  readonly metadata?: ReadonlyArray<string>;
  readonly options?: MonadComonadInteractionLawOptions<
    Obj,
    Arr,
    Left,
    Right,
    Value,
    LawObj,
    LawArr
  >;
}

export interface MonadComonadInteractionLawOptions<
  Obj,
  Arr,
  Left,
  Right,
  Value,
  LawObj,
  LawArr,
> {
  readonly currying?: InteractionLawCurryingSummary<Obj, Arr, Left, Right, Value>;
  readonly comma?: InteractionLawLeftCommaPresentation<Obj, Arr, Left, Right, Value>;
  readonly sweedler?: InteractionLawSweedlerSummary<Obj, Arr, Left, Right, Value>;
  readonly degeneracy?: FunctorOperationDegeneracyReport<Obj, Arr, Left, Right, Value, LawObj, LawArr>;
  readonly commaEquivalence?: InteractionLawLeftCommaEquivalence<Obj, Arr, Left, Right, Value>;
  readonly dual?: DualInteractionLawResult<Obj, Arr, Left, Right, Value>;
  readonly metadata?: ReadonlyArray<string>;
}

export interface MonadComonadInteractionLaw<
  Obj,
  Arr,
  Left,
  Right,
  Value,
  LawObj,
  LawArr,
> {
  readonly monad: MonadStructure<Obj, Arr>;
  readonly comonad: ComonadStructure<Obj, Arr>;
  readonly law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>;
  readonly currying: InteractionLawCurryingSummary<Obj, Arr, Left, Right, Value>;
  readonly psiComponents: ReadonlyMap<Obj, InteractionLawFiberCurrying<Obj, Arr, Left, Right, Value>>;
  readonly comma: InteractionLawLeftCommaPresentation<Obj, Arr, Left, Right, Value>;
  readonly sweedler: InteractionLawSweedlerSummary<Obj, Arr, Left, Right, Value>;
  readonly degeneracy: FunctorOperationDegeneracyReport<Obj, Arr, Left, Right, Value, LawObj, LawArr>;
  readonly diagnostics: ReadonlyArray<string>;
  readonly metadata?: ReadonlyArray<string>;
  readonly commaEquivalence?: InteractionLawLeftCommaEquivalence<Obj, Arr, Left, Right, Value>;
  readonly dual?: DualInteractionLawResult<Obj, Arr, Left, Right, Value>;
}

const buildDiagnostics = <Obj, Arr, Left, Right, Value, LawObj, LawArr>(
  input: Required<
    Pick<
      MonadComonadInteractionLawOptions<Obj, Arr, Left, Right, Value, LawObj, LawArr>,
      "currying" | "comma" | "sweedler" | "degeneracy"
    >
  > & {
    readonly suppliedCurrying: boolean;
    readonly suppliedComma: boolean;
    readonly suppliedSweedler: boolean;
    readonly suppliedDegeneracy: boolean;
    readonly suppliedCommaEquivalence: boolean;
    readonly suppliedDual: boolean;
  },
): ReadonlyArray<string> => {
  const details: string[] = [];
  details.push(
    input.suppliedCurrying
      ? "makeMonadComonadInteractionLaw: reused supplied currying summary."
      : "makeMonadComonadInteractionLaw: derived currying summary from interaction law.",
  );
  details.push(
    input.suppliedComma
      ? "makeMonadComonadInteractionLaw: reused supplied comma presentation."
      : "makeMonadComonadInteractionLaw: derived comma presentation from interaction law.",
  );
  details.push(
    input.suppliedSweedler
      ? "makeMonadComonadInteractionLaw: reused supplied Sweedler summary."
      : "makeMonadComonadInteractionLaw: derived Sweedler summary from interaction law.",
  );
  details.push(
    input.suppliedDegeneracy
      ? "makeMonadComonadInteractionLaw: reused supplied degeneracy analysis."
      : "makeMonadComonadInteractionLaw: analyzed degeneracy witnesses from interaction law operations.",
  );
  if (input.suppliedCommaEquivalence) {
    details.push(
      "makeMonadComonadInteractionLaw: reused supplied comma equivalence diagnostics.",
    );
  }
  if (input.suppliedDual) {
    details.push(
      "makeMonadComonadInteractionLaw: reused supplied dual interaction law summary.",
    );
  }
  return details;
};

const mergeMetadata = (
  existing: ReadonlyArray<string> | undefined,
  addition: ReadonlyArray<string> | undefined,
): ReadonlyArray<string> | undefined => {
  if (!addition || addition.length === 0) {
    return existing;
  }
  if (!existing || existing.length === 0) {
    return [...addition];
  }
  return [...existing, ...addition];
};

const mergeMetadataList = (
  ...inputs: ReadonlyArray<string> | undefined[]
): ReadonlyArray<string> | undefined =>
  inputs.reduce<ReadonlyArray<string> | undefined>(
    (accumulator, current) => mergeMetadata(accumulator, current),
    undefined,
  );

const DEFAULT_MONOID_SAMPLE_LIMIT = 12;

const enumerateCarrier = <T>(carrier: SetObj<T>, limit: number): ReadonlyArray<T> => {
  if (limit <= 0) {
    return [];
  }
  const semantics = getCarrierSemantics(carrier);
  const result: T[] = [];
  if (semantics?.iterate) {
    for (const value of semantics.iterate()) {
      result.push(value);
      if (result.length >= limit) {
        break;
      }
    }
    return result;
  }
  for (const value of carrier as Iterable<T>) {
    result.push(value);
    if (result.length >= limit) {
      break;
    }
  }
  return result;
};

export interface InteractionLawMonoidFailure<Obj, Right, Value> {
  readonly object: Obj;
  readonly input: unknown;
  readonly dual: IndexedElement<Obj, Right>;
  readonly expected: Value;
  readonly actual: Value;
}

export interface InteractionLawMonoidComponentReport<Obj, Right, Value> {
  readonly object: Obj;
  readonly hom: SetHom<unknown, ExponentialArrow<IndexedElement<Obj, Right>, Value>>;
  readonly monadComponent: SetHom<unknown, unknown>;
  readonly comonadComponent: SetHom<Right, unknown>;
  readonly checked: number;
  readonly mismatches: number;
  readonly failures: ReadonlyArray<InteractionLawMonoidFailure<Obj, Right, Value>>;
  readonly diagnostics: ReadonlyArray<string>;
}

export interface InteractionLawMonoidMultiplication<Obj, Right, Value> {
  readonly components: ReadonlyMap<Obj, InteractionLawMonoidComponentReport<Obj, Right, Value>>;
  readonly diagnostics: ReadonlyArray<string>;
}

export interface InteractionLawMonoidUnit<Obj, Right, Value> {
  readonly components: ReadonlyMap<Obj, InteractionLawMonoidComponentReport<Obj, Right, Value>>;
  readonly diagnostics: ReadonlyArray<string>;
}

export interface InteractionLawMonoidOptions {
  readonly sampleLimit?: number;
  readonly metadata?: ReadonlyArray<string>;
}

export interface InteractionLawMonoid<Obj, Arr, Left, Right, Value> {
  readonly law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>;
  readonly currying: InteractionLawCurryingSummary<Obj, Arr, Left, Right, Value>;
  readonly comma: InteractionLawLeftCommaPresentation<Obj, Arr, Left, Right, Value>;
  readonly multiplication: InteractionLawMonoidMultiplication<Obj, Right, Value>;
  readonly unit: InteractionLawMonoidUnit<Obj, Right, Value>;
  readonly sweedler?: InteractionLawSweedlerSummary<Obj, Arr, Left, Right, Value>;
  readonly degeneracy?: FunctorOperationDegeneracyReport<Obj, Arr, Left, Right, Value, Obj, Arr>;
  readonly commaEquivalence?: InteractionLawLeftCommaEquivalence<Obj, Arr, Left, Right, Value>;
  readonly dual?: DualInteractionLawResult<Obj, Arr, Left, Right, Value>;
  readonly diagnostics: ReadonlyArray<string>;
  readonly metadata?: ReadonlyArray<string>;
}

const buildComponentDiagnostics = <Obj, Right, Value>(
  label: string,
  object: Obj,
  checked: number,
  mismatches: number,
): ReadonlyArray<string> => [
  `${label}: evaluated ${checked} sample pair(s) on ${String(object)}.`,
  mismatches === 0
    ? `${label}: composite agrees with ? on ${String(object)}.`
    : `${label}: detected ${mismatches} mismatch(es) on ${String(object)}; see failure records.`,
];

export const makeMonadComonadInteractionLaw = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
  LawObj = Obj,
  LawArr = Arr,
>(
  input: MonadComonadInteractionLawInput<Obj, Arr, Left, Right, Value, LawObj, LawArr>,
): MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, LawObj, LawArr> => {
  const { monad, comonad, law } = input;
  const options = input.options ?? {};

  const currying = options.currying ?? deriveInteractionLawCurrying(law);
  const comma = options.comma ?? deriveInteractionLawLeftCommaPresentation(law);
  const sweedler =
    options.sweedler ?? deriveInteractionLawSweedlerSummary(law, { currying, comma });
  const degeneracy =
    options.degeneracy ?? analyzeFunctorOperationDegeneracy<Obj, Arr, Left, Right, Value, LawObj, LawArr>(law);

  const diagnostics = buildDiagnostics({
    currying,
    comma,
    sweedler,
    degeneracy,
    suppliedCurrying: options.currying !== undefined,
    suppliedComma: options.comma !== undefined,
    suppliedSweedler: options.sweedler !== undefined,
    suppliedDegeneracy: options.degeneracy !== undefined,
    suppliedCommaEquivalence: options.commaEquivalence !== undefined,
    suppliedDual: options.dual !== undefined,
  });

  const metadata = [
    ...(monad.metadata ?? []),
    ...(comonad.metadata ?? []),
    ...(input.metadata ?? []),
    ...(options.metadata ?? []),
  ];

  const psiComponents = currying.fibers;

  return {
    monad,
    comonad,
    law,
    currying,
    psiComponents,
    comma,
    sweedler,
    degeneracy,
    diagnostics,
    ...(metadata.length > 0 ? { metadata } : {}),
    ...(options.commaEquivalence ? { commaEquivalence: options.commaEquivalence } : {}),
    ...(options.dual ? { dual: options.dual } : {}),
  };
};

export const monadComonadInteractionLawToMonoid = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
>(
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: InteractionLawMonoidOptions = {},
): InteractionLawMonoid<Obj, Arr, Left, Right, Value> => {
  const sampleLimit = Math.max(0, options.sampleLimit ?? DEFAULT_MONOID_SAMPLE_LIMIT);

  const multiplicationComponents = new Map<
    Obj,
    InteractionLawMonoidComponentReport<Obj, Right, Value>
  >();
  const unitComponents = new Map<Obj, InteractionLawMonoidComponentReport<Obj, Right, Value>>();

  const multiplicationDiagnostics: string[] = [];
  const unitDiagnostics: string[] = [];

  let multiplicationCheckedTotal = 0;
  let multiplicationMismatchTotal = 0;
  let unitCheckedTotal = 0;
  let unitMismatchTotal = 0;

  for (const object of interaction.law.kernel.base.objects) {
    const fiber = interaction.currying.fibers.get(object);
    if (!fiber) {
      continue;
    }

    const phiCheck = fiber.phiCheck;
    const muComponent = interaction.monad.multiplication.transformation.component(object) as SetHom<
      unknown,
      Left
    >;
    const deltaComponent = interaction.comonad.comultiplication.transformation.component(
      object,
    ) as SetHom<Right, unknown>;

    const multiplicationHom = SetCat.hom(
      muComponent.dom as SetObj<unknown>,
      phiCheck.cod as SetObj<ExponentialArrow<IndexedElement<Obj, Right>, Value>>,
      (inputElement: unknown) =>
        phiCheck.map(muComponent.map(inputElement as Left) as Left),
    );

    const multiplicationInputs = enumerateCarrier(multiplicationHom.dom as SetObj<unknown>, sampleLimit);
    const dualElements = enumerateCarrier(fiber.dualFiber, sampleLimit);

    const multiplicationFailures: InteractionLawMonoidFailure<Obj, Right, Value>[] = [];
    let multiplicationChecked = 0;
    let multiplicationMismatches = 0;

    for (const inputElement of multiplicationInputs) {
      const arrow = multiplicationHom.map(inputElement);
      const collapsed = muComponent.map(inputElement) as Left;
      const primal: IndexedElement<Obj, Left> = { object, element: collapsed };
      for (const dual of dualElements) {
        multiplicationChecked += 1;
        const expected = interaction.law.evaluate(primal, dual);
        const actual = arrow(dual);
        if (!semanticsAwareEquals(expected, actual)) {
          multiplicationMismatches += 1;
          if (multiplicationFailures.length < sampleLimit) {
            multiplicationFailures.push({
              object,
              input: inputElement,
              dual,
              expected,
              actual,
            });
          }
        }
      }
    }

    multiplicationCheckedTotal += multiplicationChecked;
    multiplicationMismatchTotal += multiplicationMismatches;

    const componentDiagnostics = buildComponentDiagnostics<Obj, Right, Value>(
      "monadComonadLawToInteractionLawMonoid (multiplication)",
      object,
      multiplicationChecked,
      multiplicationMismatches,
    );
    multiplicationDiagnostics.push(...componentDiagnostics);

    multiplicationComponents.set(object, {
      object,
      hom: multiplicationHom,
      monadComponent: muComponent as SetHom<unknown, unknown>,
      comonadComponent: deltaComponent,
      checked: multiplicationChecked,
      mismatches: multiplicationMismatches,
      failures: multiplicationFailures,
      diagnostics: componentDiagnostics,
    });

    const etaComponent = interaction.monad.unit.transformation.component(object) as SetHom<
      unknown,
      Left
    >;
    const epsilonComponent = interaction.comonad.counit.transformation.component(object) as SetHom<
      Right,
      unknown
    >;

    const unitHom = SetCat.hom(
      etaComponent.dom as SetObj<unknown>,
      phiCheck.cod as SetObj<ExponentialArrow<IndexedElement<Obj, Right>, Value>>,
      (inputElement: unknown) =>
        phiCheck.map(etaComponent.map(inputElement as Left) as Left),
    );

    const unitInputs = enumerateCarrier(unitHom.dom as SetObj<unknown>, sampleLimit);

    const unitFailures: InteractionLawMonoidFailure<Obj, Right, Value>[] = [];
    let unitChecked = 0;
    let unitMismatches = 0;

    for (const inputElement of unitInputs) {
      const arrow = unitHom.map(inputElement);
      const lifted = etaComponent.map(inputElement) as Left;
      const primal: IndexedElement<Obj, Left> = { object, element: lifted };
      for (const dual of dualElements) {
        unitChecked += 1;
        const expected = interaction.law.evaluate(primal, dual);
        const actual = arrow(dual);
        if (!semanticsAwareEquals(expected, actual)) {
          unitMismatches += 1;
          if (unitFailures.length < sampleLimit) {
            unitFailures.push({
              object,
              input: inputElement,
              dual,
              expected,
              actual,
            });
          }
        }
      }
    }

    unitCheckedTotal += unitChecked;
    unitMismatchTotal += unitMismatches;

    const unitComponentDiagnostics = buildComponentDiagnostics<Obj, Right, Value>(
      "monadComonadLawToInteractionLawMonoid (unit)",
      object,
      unitChecked,
      unitMismatches,
    );
    unitDiagnostics.push(...unitComponentDiagnostics);

    unitComponents.set(object, {
      object,
      hom: unitHom,
      monadComponent: etaComponent as SetHom<unknown, unknown>,
      comonadComponent: epsilonComponent,
      checked: unitChecked,
      mismatches: unitMismatches,
      failures: unitFailures,
      diagnostics: unitComponentDiagnostics,
    });
  }

  multiplicationDiagnostics.unshift(
    `monadComonadLawToInteractionLawMonoid: analysed multiplication on ${multiplicationComponents.size} object(s) with ${multiplicationCheckedTotal} sample pair(s).`,
  );
  if (multiplicationMismatchTotal === 0) {
    multiplicationDiagnostics.push(
      "monadComonadLawToInteractionLawMonoid: multiplication composites matched ? on all samples.",
    );
  } else {
    multiplicationDiagnostics.push(
      `monadComonadLawToInteractionLawMonoid: multiplication composites encountered ${multiplicationMismatchTotal} mismatch(es).`,
    );
  }

  unitDiagnostics.unshift(
    `monadComonadLawToInteractionLawMonoid: analysed unit on ${unitComponents.size} object(s) with ${unitCheckedTotal} sample pair(s).`,
  );
  if (unitMismatchTotal === 0) {
    unitDiagnostics.push(
      "monadComonadLawToInteractionLawMonoid: unit composites matched ? on all samples.",
    );
  } else {
    unitDiagnostics.push(
      `monadComonadLawToInteractionLawMonoid: unit composites encountered ${unitMismatchTotal} mismatch(es).`,
    );
  }

  const metadata = mergeMetadataList(
    interaction.metadata,
    interaction.monad.metadata,
    interaction.comonad.metadata,
    options.metadata,
  );

  const diagnostics: string[] = [
    `monadComonadLawToInteractionLawMonoid: constructed interaction-law monoid with sample limit ${sampleLimit}.`,
    multiplicationMismatchTotal + unitMismatchTotal === 0
      ? "monadComonadLawToInteractionLawMonoid: sampled composites agree with ? across multiplication and unit."
      : `monadComonadLawToInteractionLawMonoid: detected ${
          multiplicationMismatchTotal + unitMismatchTotal
        } mismatch(es) across multiplication/unit composites.`,
  ];

  return {
    law: interaction.law,
    currying: interaction.currying,
    comma: interaction.comma,
    multiplication: { components: multiplicationComponents, diagnostics: multiplicationDiagnostics },
    unit: { components: unitComponents, diagnostics: unitDiagnostics },
    ...(interaction.sweedler ? { sweedler: interaction.sweedler } : {}),
    ...(interaction.degeneracy ? { degeneracy: interaction.degeneracy } : {}),
    ...(interaction.commaEquivalence ? { commaEquivalence: interaction.commaEquivalence } : {}),
    ...(interaction.dual ? { dual: interaction.dual } : {}),
    diagnostics,
    ...(metadata ? { metadata } : {}),
  };
};

export interface InteractionLawMonoidToMonadComonadInput<
  Obj,
  Arr,
  Left,
  Right,
  Value,
> {
  readonly monoid: InteractionLawMonoid<Obj, Arr, Left, Right, Value>;
  readonly monad: MonadStructure<Obj, Arr>;
  readonly comonad: ComonadStructure<Obj, Arr>;
  readonly metadata?: ReadonlyArray<string>;
}

export const interactionLawMonoidToMonadComonadLaw = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
>(
  input: InteractionLawMonoidToMonadComonadInput<Obj, Arr, Left, Right, Value>,
): MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr> => {
  const options: MonadComonadInteractionLawOptions<Obj, Arr, Left, Right, Value, Obj, Arr> = {
    currying: input.monoid.currying,
    comma: input.monoid.comma,
    ...(input.monoid.sweedler ? { sweedler: input.monoid.sweedler } : {}),
    ...(input.monoid.degeneracy ? { degeneracy: input.monoid.degeneracy } : {}),
    ...(input.monoid.commaEquivalence ? { commaEquivalence: input.monoid.commaEquivalence } : {}),
    ...(input.monoid.dual ? { dual: input.monoid.dual } : {}),
    metadata: input.monoid.metadata,
  };

  const metadata = mergeMetadataList(
    input.monoid.metadata,
    input.monad.metadata,
    input.comonad.metadata,
    input.metadata,
  );

  return makeMonadComonadInteractionLaw({
    monad: input.monad,
    comonad: input.comonad,
    law: input.monoid.law,
    metadata,
    options,
  });
};

export interface MonadComonadGreatestFunctorResult<
  Obj,
  Arr,
  Left,
  Right,
  Value,
  LawObj,
  LawArr,
> {
  readonly interaction: MonadComonadInteractionLaw<
    Obj,
    Arr,
    Left,
    Right,
    Value,
    LawObj,
    LawArr
  >;
  readonly greatest: GreatestInteractingFunctorResult<Obj, Arr, Left, Right, Value>;
  readonly diagnostics: ReadonlyArray<string>;
  readonly metadata?: ReadonlyArray<string>;
}

export const deriveGreatestInteractingFunctorForMonadComonadLaw = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
  LawObj,
  LawArr,
>(
  interaction: MonadComonadInteractionLaw<
    Obj,
    Arr,
    Left,
    Right,
    Value,
    LawObj,
    LawArr
  >,
  options: GreatestInteractingFunctorOptions<Obj, Arr, Left, Right, Value> = {},
): MonadComonadGreatestFunctorResult<Obj, Arr, Left, Right, Value, LawObj, LawArr> => {
  const metadata = mergeMetadataList(
    interaction.metadata,
    interaction.monad.metadata,
    interaction.comonad.metadata,
    options.metadata,
  );

  const greatest = greatestInteractingFunctor(interaction.law, {
    ...options,
    sweedler: options.sweedler ?? interaction.sweedler,
    comma: options.comma ?? interaction.comma,
    dual: options.dual ?? interaction.dual,
    metadata,
  });

  const diagnostics: string[] = [];
  diagnostics.push(
    options.sweedler
      ? "Monad/comonad greatest functor: used Sweedler summary supplied via options."
      : "Monad/comonad greatest functor: reused packaged Sweedler summary from interaction law.",
  );
  diagnostics.push(
    options.comma
      ? "Monad/comonad greatest functor: used comma presentation supplied via options."
      : "Monad/comonad greatest functor: reused packaged comma presentation from interaction law.",
  );
  diagnostics.push(
    options.dual
      ? "Monad/comonad greatest functor: used dual interaction law supplied via options."
      : interaction.dual
      ? "Monad/comonad greatest functor: reused packaged dual interaction law from interaction law record."
      : "Monad/comonad greatest functor: computed dual interaction law via helper.",
  );
  diagnostics.push(
    `Monad/comonad greatest functor: underlying helper emitted ${greatest.diagnostics.length} diagnostic entries.`,
  );

  return {
    interaction,
    greatest,
    diagnostics,
    ...(metadata ? { metadata } : {}),
  };
};

export interface MonadComonadGreatestComonadResult<
  Obj,
  Arr,
  Left,
  Right,
  Value,
  LawObj,
  LawArr,
> {
  readonly interaction: MonadComonadInteractionLaw<
    Obj,
    Arr,
    Left,
    Right,
    Value,
    LawObj,
    LawArr
  >;
  readonly greatest: GreatestInteractingComonadResult<Obj, Arr, Left, Right, Value>;
  readonly diagnostics: ReadonlyArray<string>;
  readonly metadata?: ReadonlyArray<string>;
}

export const deriveGreatestInteractingComonadForMonadComonadLaw = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
  LawObj,
  LawArr,
>(
  interaction: MonadComonadInteractionLaw<
    Obj,
    Arr,
    Left,
    Right,
    Value,
    LawObj,
    LawArr
  >,
  options: GreatestInteractingComonadOptions<Obj, Arr, Left, Right, Value> = {},
): MonadComonadGreatestComonadResult<Obj, Arr, Left, Right, Value, LawObj, LawArr> => {
  const metadata = mergeMetadataList(
    interaction.metadata,
    interaction.monad.metadata,
    interaction.comonad.metadata,
    options.metadata,
  );

  const greatest = greatestInteractingComonad(interaction.law, {
    ...options,
    sweedler: options.sweedler ?? interaction.sweedler,
    dual: options.dual ?? interaction.dual,
    metadata,
  });

  const diagnostics: string[] = [];
  diagnostics.push(
    options.sweedler
      ? "Monad/comonad greatest comonad: used Sweedler summary supplied via options."
      : "Monad/comonad greatest comonad: reused packaged Sweedler summary from interaction law.",
  );
  diagnostics.push(
    options.dual
      ? "Monad/comonad greatest comonad: used dual interaction law supplied via options."
      : interaction.dual
      ? "Monad/comonad greatest comonad: reused packaged dual interaction law from interaction law record."
      : "Monad/comonad greatest comonad: computed dual interaction law via helper.",
  );
  diagnostics.push(
    options.comma
      ? "Monad/comonad greatest comonad: used swapped comma presentation supplied via options."
      : "Monad/comonad greatest comonad: derived swapped comma presentation via helper on dual law.",
  );
  diagnostics.push(
    `Monad/comonad greatest comonad: underlying helper emitted ${greatest.diagnostics.length} diagnostic entries.`,
  );

  return {
    interaction,
    greatest,
    diagnostics,
    ...(metadata ? { metadata } : {}),
  };
};

const DEFAULT_DUAL_MAP_SAMPLE_LIMIT = 24;
const MAX_DUAL_MAP_COUNTEREXAMPLES = 12;

interface DualMapCounterexample<Obj, Left, Right, Value> {
  readonly object: Obj;
  readonly left: Left;
  readonly right: Right;
  readonly expected: Value;
  readonly actual: Value;
}

export interface MonadComonadDualMapDiagramReport<Obj, Left, Right, Value> {
  readonly holds: boolean;
  readonly checked: number;
  readonly mismatches: number;
  readonly counterexamples: ReadonlyArray<DualMapCounterexample<Obj, Left, Right, Value>>;
  readonly details: ReadonlyArray<string>;
}

const compareSigmaWithPsi = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
  LawObj,
  LawArr,
>(
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, LawObj, LawArr>,
  sigma: ReadonlyMap<Obj, SetHom<unknown, unknown>>,
  orientation: "monad" | "comonad",
  sampleLimit: number,
): MonadComonadDualMapDiagramReport<Obj, Left, Right, Value> => {
  const counterexamples: Array<DualMapCounterexample<Obj, Left, Right, Value>> = [];
  const details: string[] = [];
  let checked = 0;
  let mismatches = 0;

  for (const object of interaction.law.kernel.base.objects) {
    const component = sigma.get(object);
    if (!component) {
      details.push(
        `No dual-map component recorded for object ${String(object)}; skipping ${
          orientation === "monad" ? "T ? D?" : "D ? T?"
        } comparison.`,
      );
      continue;
    }

    const leftCarrier = interaction.law.left.functor.F0(object) as SetObj<Left>;
    const rightCarrier = interaction.law.right.functor.F0(object) as SetObj<Right>;
    const leftSamples = enumerateCarrier(leftCarrier, sampleLimit);
    const rightSamples = enumerateCarrier(rightCarrier, sampleLimit);

    for (const leftElement of leftSamples) {
      for (const rightElement of rightSamples) {
        checked += 1;
        const expected = interaction.law.evaluate(
          { object, element: leftElement as Left },
          { object, element: rightElement as Right },
        ) as Value;

        const reconstructed = orientation === "monad"
          ? (
              (component as SetHom<
                Left,
                (input: Right) => Value
              >).map(leftElement as Left)
            )(rightElement as Right)
          : (
              (component as SetHom<
                Right,
                (input: Left) => Value
              >).map(rightElement as Right)
            )(leftElement as Left);

        if (!Object.is(expected, reconstructed)) {
          mismatches += 1;
          if (counterexamples.length < MAX_DUAL_MAP_COUNTEREXAMPLES) {
            counterexamples.push({
              object,
              left: leftElement as Left,
              right: rightElement as Right,
              expected,
              actual: reconstructed,
            });
          }
        }
      }
    }
  }

  details.unshift(
    `Compared ${checked} ?-evaluation sample(s) against ${
      orientation === "monad" ? "T ? D?" : "D ? T?"
    } assignments (limit ${sampleLimit}).`,
  );

  if (mismatches === 0) {
    details.push(
      `All sampled evaluations matched the ${
        orientation === "monad" ? "monad" : "comonad"
      } dual map.`,
    );
  } else {
    details.push(
      `Encountered ${mismatches} mismatch(es) when reconstructing ? via the ${
        orientation === "monad" ? "monad" : "comonad"
      } dual map.`,
    );
  }

  return {
    holds: mismatches === 0,
    checked,
    mismatches,
    counterexamples,
    details,
  };
};

export interface MonadComonadDualMapOptions<Obj, Arr, Left, Right, Value> {
  readonly sampleLimit?: number;
  readonly dual?: DualInteractionLawResult<Obj, Arr, Left, Right, Value>;
  readonly dualComma?: InteractionLawLeftCommaPresentation<Obj, Arr, Right, Left, Value>;
  readonly metadata?: ReadonlyArray<string>;
}

export interface MonadComonadDualMapSummary<
  Obj,
  Arr,
  Left,
  Right,
  Value,
  LawObj,
  LawArr,
> {
  readonly interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, LawObj, LawArr>;
  readonly monadToDual: NaturalTransformationWithWitness<Obj, Arr, SetObj<unknown>, SetHom<unknown, unknown>>;
  readonly comonadToDual: NaturalTransformationWithWitness<Obj, Arr, SetObj<unknown>, SetHom<unknown, unknown>>;
  readonly monadDiagram: MonadComonadDualMapDiagramReport<Obj, Left, Right, Value>;
  readonly comonadDiagram: MonadComonadDualMapDiagramReport<Obj, Left, Right, Value>;
  readonly diagnostics: ReadonlyArray<string>;
  readonly metadata?: ReadonlyArray<string>;
  readonly dual: DualInteractionLawResult<Obj, Arr, Left, Right, Value>;
  readonly dualComma: InteractionLawLeftCommaPresentation<Obj, Arr, Right, Left, Value>;
}

export const interactionLawToDualMap = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
  LawObj,
  LawArr,
>(
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, LawObj, LawArr>,
  options: MonadComonadDualMapOptions<Obj, Arr, Left, Right, Value> = {},
): MonadComonadDualMapSummary<Obj, Arr, Left, Right, Value, LawObj, LawArr> => {
  const sampleLimit = options.sampleLimit && options.sampleLimit > 0
    ? options.sampleLimit
    : DEFAULT_DUAL_MAP_SAMPLE_LIMIT;

  const metadata = mergeMetadataList(
    interaction.metadata,
    interaction.monad.metadata,
    interaction.comonad.metadata,
    options.metadata,
  );

  const diagnostics: string[] = [
    `interactionLawToDualMap: sampling up to ${sampleLimit} element(s) per carrier.`,
  ];

  diagnostics.push("interactionLawToDualMap: reused packaged comma presentation from interaction law.");

  const dual = options.dual
    ?? interaction.dual
    ?? dualInteractionLaw(interaction.law, {
      space: interaction.sweedler.space,
      currying: interaction.currying,
      comma: interaction.comma,
      degeneracy: interaction.degeneracy,
    });
  diagnostics.push(
    options.dual
      ? "interactionLawToDualMap: used dual interaction law supplied via options."
      : interaction.dual
      ? "interactionLawToDualMap: reused dual interaction law cached on interaction record."
      : "interactionLawToDualMap: computed dual interaction law via helper.",
  );

  const dualComma = options.dualComma ?? deriveInteractionLawLeftCommaPresentation(dual.law);
  diagnostics.push(
    options.dualComma
      ? "interactionLawToDualMap: used dual comma presentation supplied via options."
      : "interactionLawToDualMap: derived dual comma presentation for D ? T? translation.",
  );

  const monadMetadata = mergeMetadataList(metadata, ["interactionLawToDualMap: T ? D?"]);
  const comonadMetadata = mergeMetadataList(metadata, ["interactionLawToDualMap: D ? T?"]);

  const monadToDual = constructNaturalTransformationWithWitness(
    interaction.law.left.witness.oppositeWitness as FunctorWithWitness<
      Obj,
      Arr,
      SetObj<unknown>,
      SetHom<unknown, unknown>
    >,
    interaction.comma.internalHomOpposite as FunctorWithWitness<
      Obj,
      Arr,
      SetObj<unknown>,
      SetHom<unknown, unknown>
    >,
    (object) => {
      const component = interaction.comma.sigma.get(object);
      if (!component) {
        throw new Error(
          `interactionLawToDualMap: missing ?-component for object ${String(object)} in T ? D? translation.`,
        );
      }
      return component as unknown as SetHom<unknown, unknown>;
    },
    monadMetadata ? { metadata: monadMetadata } : undefined,
  );

  const comonadToDual = constructNaturalTransformationWithWitness(
    dual.law.left.witness.oppositeWitness as FunctorWithWitness<
      Obj,
      Arr,
      SetObj<unknown>,
      SetHom<unknown, unknown>
    >,
    dualComma.internalHomOpposite as FunctorWithWitness<
      Obj,
      Arr,
      SetObj<unknown>,
      SetHom<unknown, unknown>
    >,
    (object) => {
      const component = dualComma.sigma.get(object);
      if (!component) {
        throw new Error(
          `interactionLawToDualMap: missing dual ?-component for object ${String(object)} in D ? T? translation.`,
        );
      }
      return component as unknown as SetHom<unknown, unknown>;
    },
    comonadMetadata ? { metadata: comonadMetadata } : undefined,
  );

  diagnostics.push(
    monadToDual.report.holds
      ? "interactionLawToDualMap: T ? D? naturality verified."
      : `interactionLawToDualMap: T ? D? naturality failed: ${monadToDual.report.details.join(" ")}`,
  );
  diagnostics.push(
    comonadToDual.report.holds
      ? "interactionLawToDualMap: D ? T? naturality verified."
      : `interactionLawToDualMap: D ? T? naturality failed: ${comonadToDual.report.details.join(" ")}`,
  );

  const monadDiagram = compareSigmaWithPsi(
    interaction,
    interaction.comma.sigma as ReadonlyMap<Obj, SetHom<unknown, unknown>>,
    "monad",
    sampleLimit,
  );
  const comonadDiagram = compareSigmaWithPsi(
    interaction,
    dualComma.sigma as ReadonlyMap<Obj, SetHom<unknown, unknown>>,
    "comonad",
    sampleLimit,
  );

  if (!monadDiagram.holds || !comonadDiagram.holds) {
    diagnostics.push(
      "interactionLawToDualMap: detected mismatches when reconstructing ? via dual maps; see diagram reports.",
    );
  } else {
    diagnostics.push("interactionLawToDualMap: dual maps agree with ? on sampled entries.");
  }

  return {
    interaction,
    monadToDual,
    comonadToDual,
    monadDiagram,
    comonadDiagram,
    diagnostics,
    ...(metadata ? { metadata } : {}),
    dual,
    dualComma,
  };
};

export interface InteractionLawFromDualMapInput<
  Obj,
  Arr,
  Left,
  Right,
  Value,
  LawObj,
  LawArr,
> {
  readonly interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, LawObj, LawArr>;
  readonly monadToDual: NaturalTransformationWithWitness<Obj, Arr, SetObj<unknown>, SetHom<unknown, unknown>>;
  readonly comonadToDual: NaturalTransformationWithWitness<Obj, Arr, SetObj<unknown>, SetHom<unknown, unknown>>;
  readonly sampleLimit?: number;
}

export interface InteractionLawFromDualMapReport<Obj, Left, Right, Value> {
  readonly monadDiagram: MonadComonadDualMapDiagramReport<Obj, Left, Right, Value>;
  readonly comonadDiagram: MonadComonadDualMapDiagramReport<Obj, Left, Right, Value>;
  readonly reconstructsPsi: boolean;
  readonly details: ReadonlyArray<string>;
}

export const interactionLawFromDualMap = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
  LawObj,
  LawArr,
>(
  input: InteractionLawFromDualMapInput<Obj, Arr, Left, Right, Value, LawObj, LawArr>,
): InteractionLawFromDualMapReport<Obj, Left, Right, Value> => {
  const sampleLimit = input.sampleLimit && input.sampleLimit > 0
    ? input.sampleLimit
    : DEFAULT_DUAL_MAP_SAMPLE_LIMIT;

  const diagnostics: string[] = [
    `interactionLawFromDualMap: sampling up to ${sampleLimit} element(s) per carrier.`,
  ];

  const monadSigma = new Map<Obj, SetHom<unknown, unknown>>();
  const comonadSigma = new Map<Obj, SetHom<unknown, unknown>>();

  for (const object of input.interaction.law.kernel.base.objects) {
    monadSigma.set(
      object,
      input.monadToDual.transformation.component(object) as SetHom<unknown, unknown>,
    );
    comonadSigma.set(
      object,
      input.comonadToDual.transformation.component(object) as SetHom<unknown, unknown>,
    );
  }

  const monadDiagram = compareSigmaWithPsi(
    input.interaction,
    monadSigma,
    "monad",
    sampleLimit,
  );
  const comonadDiagram = compareSigmaWithPsi(
    input.interaction,
    comonadSigma,
    "comonad",
    sampleLimit,
  );

  const reconstructsPsi = monadDiagram.holds && comonadDiagram.holds;
  diagnostics.push(
    reconstructsPsi
      ? "interactionLawFromDualMap: dual maps reconstruct ? on sampled entries."
      : "interactionLawFromDualMap: mismatches detected when reconstructing ? from supplied dual maps.",
  );

  return {
    monadDiagram,
    comonadDiagram,
    reconstructsPsi,
    details: diagnostics,
  };
};

interface SweedlerFactorizationWitness<Obj, Right, Value> {
  readonly object: Obj;
  readonly input: Right;
  readonly witness: ExponentialArrow<Right, Value>;
}

interface SweedlerFactorizationCounterexample<Obj, Right> {
  readonly object: Obj;
  readonly input: Right;
  readonly reason: string;
}

export interface SweedlerFactorizationReport<Obj, Right, Value> {
  readonly holds: boolean;
  readonly checked: number;
  readonly matched: number;
  readonly witnesses: ReadonlyArray<SweedlerFactorizationWitness<Obj, Right, Value>>;
  readonly counterexamples: ReadonlyArray<SweedlerFactorizationCounterexample<Obj, Right>>;
  readonly details: ReadonlyArray<string>;
}

export interface SweedlerFactorizationOptions<
  Obj,
  Arr,
  Left,
  Right,
  Value,
  LawObj,
  LawArr,
> {
  readonly sampleLimit?: number;
  readonly dual?: MonadComonadDualMapSummary<Obj, Arr, Left, Right, Value, LawObj, LawArr>;
  readonly greatest?: MonadComonadGreatestComonadResult<Obj, Arr, Left, Right, Value, LawObj, LawArr>;
  readonly metadata?: ReadonlyArray<string>;
}

export interface SweedlerFactorizationSummary<
  Obj,
  Arr,
  Left,
  Right,
  Value,
  LawObj,
  LawArr,
> {
  readonly interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, LawObj, LawArr>;
  readonly dual: MonadComonadDualMapSummary<Obj, Arr, Left, Right, Value, LawObj, LawArr>;
  readonly greatest: MonadComonadGreatestComonadResult<Obj, Arr, Left, Right, Value, LawObj, LawArr>;
  readonly report: SweedlerFactorizationReport<Obj, Right, Value>;
  readonly diagnostics: ReadonlyArray<string>;
  readonly metadata?: ReadonlyArray<string>;
}

export const verifySweedlerDualFactorization = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
  LawObj,
  LawArr,
>(
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, LawObj, LawArr>,
  options: SweedlerFactorizationOptions<Obj, Arr, Left, Right, Value, LawObj, LawArr> = {},
): SweedlerFactorizationSummary<Obj, Arr, Left, Right, Value, LawObj, LawArr> => {
  const sampleLimit =
    options.sampleLimit !== undefined && options.sampleLimit > 0
      ? options.sampleLimit
      : DEFAULT_SWEEDLER_FACTOR_SAMPLE_LIMIT;

  const dual = options.dual ?? interactionLawToDualMap(interaction, { sampleLimit });
  const greatest =
    options.greatest ?? deriveGreatestInteractingComonadForMonadComonadLaw(interaction);

  const diagnostics: string[] = [
    `verifySweedlerDualFactorization: sampling up to ${sampleLimit} element(s) per carrier.`,
  ];

  const valueEquals = semanticsAwareEquals(interaction.law.dualizing as SetObj<Value>);

  const witnesses: Array<SweedlerFactorizationWitness<Obj, Right, Value>> = [];
  const counterexamples: Array<SweedlerFactorizationCounterexample<Obj, Right>> = [];

  let checked = 0;
  let matched = 0;

  const objects = new Set<Obj>();
  for (const object of interaction.law.kernel.base.objects) {
    objects.add(object);
  }
  for (const object of interaction.comonad.functor.witness.objectGenerators) {
    objects.add(object);
  }

  for (const object of objects) {
    const comonadCarrier = interaction.comonad.functor.functor.F0(object) as SetObj<Right>;
    const comonadElements = enumerateWithLimit(comonadCarrier, sampleLimit);

    const sweedlerCarrier = greatest.greatest.functorOpposite.functor.F0(object) as SetObj<
      ExponentialArrow<Right, Value>
    >;
    const sweedlerElements = enumerateWithLimit(sweedlerCarrier, sampleLimit);

    const rightCarrier = interaction.law.right.functor.F0(object) as SetObj<Right>;
    const rightSamples = enumerateWithLimit(rightCarrier, sampleLimit);

    const comonadComponent = dual.comonadToDual.transformation.component(object) as SetHom<
      Right,
      ExponentialArrow<Right, Value>
    >;
    const sweedlerComponent = greatest.greatest.transformation.transformation.component(object) as SetHom<
      ExponentialArrow<Right, Value>,
      ExponentialArrow<Right, Value>
    >;

    const compareAssignments = (
      reference: ExponentialArrow<Right, Value>,
      candidate: ExponentialArrow<Right, Value>,
    ): boolean => {
      if (rightSamples.length === 0) {
        return true;
      }
      for (const sample of rightSamples) {
        const expected = reference(sample as Right);
        const actual = candidate(sample as Right);
        if (!valueEquals(expected, actual)) {
          return false;
        }
      }
      return true;
    };

    for (const element of comonadElements) {
      checked += 1;
      const targetAssignment = comonadComponent.map(element as Right);
      let witness: ExponentialArrow<Right, Value> | undefined;

      for (const candidate of sweedlerElements) {
        const candidateAssignment = sweedlerComponent.map(candidate);
        if (compareAssignments(targetAssignment, candidateAssignment)) {
          witness = candidate;
          break;
        }
      }

      if (witness) {
        matched += 1;
        witnesses.push({ object, input: element as Right, witness });
      } else {
        const reason =
          sweedlerElements.length === 0
            ? "Sweedler carrier provided no sample elements."
            : "No Sweedler element reproduced the dual assignment on sampled evaluations.";
        counterexamples.push({ object, input: element as Right, reason });
      }
    }
  }

  diagnostics.push(
    `verifySweedlerDualFactorization: sampled ${checked} comonad element(s) across ${objects.size} object(s).`,
  );
  diagnostics.push(
    `verifySweedlerDualFactorization: matched ${matched} of ${checked} sampled assignment(s).`,
  );

  const holds = counterexamples.length === 0;
  diagnostics.push(
    holds
      ? "verifySweedlerDualFactorization: Sweedler factoring verified on sampled data."
      : `verifySweedlerDualFactorization: encountered ${counterexamples.length} mismatched assignment(s).`,
  );
  if (!holds && counterexamples.length > 0) {
    const first = counterexamples[0];
    diagnostics.push(
      `verifySweedlerDualFactorization: first mismatch at object ${String(
        first.object,
      )} on input ${String(first.input)} ? ${first.reason}`,
    );
  }

  const metadata = mergeMetadataList(
    interaction.metadata,
    interaction.comonad.metadata,
    dual.metadata,
    greatest.metadata,
    options.metadata,
  );

  const report: SweedlerFactorizationReport<Obj, Right, Value> = {
    holds,
    checked,
    matched,
    witnesses,
    counterexamples,
    details: diagnostics,
  };

  return {
    interaction,
    dual,
    greatest,
    report,
    diagnostics,
    ...(metadata ? { metadata } : {}),
  };
};

const DEFAULT_SWEEDLER_FACTOR_SAMPLE_LIMIT = 12;
const DEFAULT_RUNNER_TRANSLATION_SAMPLE_LIMIT = 64;

const enumerateWithLimit = <A>(carrier: SetObj<A>, limit: number): ReadonlyArray<A> => {
  const semantics = getCarrierSemantics(carrier);
  if (semantics?.iterate) {
    const values: A[] = [];
    for (const value of semantics.iterate()) {
      values.push(value);
      if (values.length >= limit) {
        break;
      }
    }
    return values;
  }
  const values: A[] = [];
  for (const value of carrier) {
    values.push(value);
    if (values.length >= limit) {
      break;
    }
  }
  return values;
};

export interface MonadComonadRunnerThetaComponent<Obj, Arr, Left, Right, Value> {
  readonly object: Obj;
  readonly phi: SetHom<
    readonly [IndexedElement<Obj, Left>, IndexedElement<Obj, Right>],
    Value
  >;
  readonly theta: SetHom<
    IndexedElement<Obj, Left>,
    ExponentialArrow<IndexedElement<Obj, Right>, Value>
  >;
  readonly finalTransformation: InteractionLawFiberFinalTransformation<Obj, Left, Right, Value>;
  readonly consistentWithDelta: boolean;
  readonly diagnostics: ReadonlyArray<string>;
}

export interface MonadComonadRunnerCostateComponent<Obj, Left, Right, Value> {
  readonly object: Obj;
  readonly costate: SetHom<
    Right,
    ExponentialArrow<IndexedElement<Obj, Right>, Value>
  >;
  readonly evaluationConsistent: boolean;
  readonly diagnostics: ReadonlyArray<string>;
}

export interface MonadComonadRunnerCoalgebraComponent<Obj, Left, Right, Value> {
  readonly object: Obj;
  readonly coalgebra: SetHom<
    IndexedElement<Obj, Right>,
    ExponentialArrow<IndexedElement<Obj, Right>, Value>
  >;
  readonly evaluationConsistent: boolean;
  readonly diagnostics: ReadonlyArray<string>;
}

export interface MonadComonadRunnerTranslationOptions {
  readonly sampleLimit?: number;
  readonly metadata?: ReadonlyArray<string>;
}

export interface MonadComonadRunnerTranslationSummary<
  Obj,
  Arr,
  Left,
  Right,
  Value,
  LawObj,
  LawArr,
> {
  readonly interaction: MonadComonadInteractionLaw<
    Obj,
    Arr,
    Left,
    Right,
    Value,
    LawObj,
    LawArr
  >;
  readonly thetaComponents: ReadonlyArray<
    MonadComonadRunnerThetaComponent<Obj, Arr, Left, Right, Value>
  >;
  readonly costateComponents: ReadonlyArray<
    MonadComonadRunnerCostateComponent<Obj, Left, Right, Value>
  >;
  readonly coalgebraComponents: ReadonlyArray<
    MonadComonadRunnerCoalgebraComponent<Obj, Left, Right, Value>
  >;
  readonly diagnostics: ReadonlyArray<string>;
  readonly metadata?: ReadonlyArray<string>;
}

export const deriveMonadComonadRunnerTranslation = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
  LawObj,
  LawArr,
>(
  interaction: MonadComonadInteractionLaw<
    Obj,
    Arr,
    Left,
    Right,
    Value,
    LawObj,
    LawArr
  >,
  options: MonadComonadRunnerTranslationOptions = {},
): MonadComonadRunnerTranslationSummary<Obj, Arr, Left, Right, Value, LawObj, LawArr> => {
  const sampleLimit =
    options.sampleLimit !== undefined && options.sampleLimit > 0
      ? options.sampleLimit
      : DEFAULT_RUNNER_TRANSLATION_SAMPLE_LIMIT;

  const metadata = mergeMetadataList(
    mergeMetadataList(interaction.metadata, interaction.monad.metadata),
    mergeMetadataList(interaction.comonad.metadata, options.metadata),
  );

  const thetaComponents: Array<
    MonadComonadRunnerThetaComponent<Obj, Arr, Left, Right, Value>
  > = [];
  const costateComponents: Array<
    MonadComonadRunnerCostateComponent<Obj, Left, Right, Value>
  > = [];
  const coalgebraComponents: Array<
    MonadComonadRunnerCoalgebraComponent<Obj, Left, Right, Value>
  > = [];
  const diagnostics: string[] = [];

  const sweedlerFromDual = interaction.sweedler.fromDual;

  for (const [object, fiber] of interaction.psiComponents.entries()) {
    const thetaDiagnostics: string[] = [];
    let consistentWithDelta = true;

    for (const component of fiber.finalTransformation.components) {
      const sampledEvaluations = component.evaluationTable.slice(0, sampleLimit);
      for (const entry of sampledEvaluations) {
        const sampledValues = entry.evaluations.slice(0, sampleLimit);
        for (const evaluation of sampledValues) {
          const lawValue = fiber.phi.map([entry.primal, evaluation.dual]);
          if (!Object.is(lawValue, evaluation.value)) {
            consistentWithDelta = false;
            thetaDiagnostics.push(
              `? tables disagree with ? at object ${String(object)}: expected ${String(
                evaluation.value,
              )} but obtained ${String(lawValue)} for (${String(entry.primal.element)}, ${String(
                evaluation.dual.element,
              )}).`,
            );
          }
        }
        if (entry.evaluations.length > sampledValues.length) {
          thetaDiagnostics.push(
            `?^${String(object)}_${String(component.parameter)} truncated to ${sampledValues.length}` +
              ` of ${entry.evaluations.length} dual samples for diagnostics.`,
          );
        }
      }
      if (component.evaluationTable.length > sampledEvaluations.length) {
        thetaDiagnostics.push(
          `?^${String(object)}_${String(component.parameter)} truncated to ${sampledEvaluations.length}` +
            ` of ${component.evaluationTable.length} primal samples for diagnostics.`,
        );
      }
    }

    if (consistentWithDelta) {
      thetaDiagnostics.push(
        `? tables for object ${String(object)} match ? on sampled entries (limit ${sampleLimit}).`,
      );
    }

    thetaComponents.push({
      object,
      phi: fiber.phi,
      theta: fiber.theta,
      finalTransformation: fiber.finalTransformation,
      consistentWithDelta,
      diagnostics: thetaDiagnostics,
    });

    const rightCarrier = interaction.law.right.functor.F0(object) as SetObj<Right>;
    const costateDiagnostics: string[] = [];
    let costateConsistent = true;

    const costate = SetCat.hom(rightCarrier, fiber.exponential.object, (element) => {
      const indexed: IndexedElement<Obj, Right> = { object, element };
      const evaluation = sweedlerFromDual.map(indexed);
      return fiber.exponential.register((primal) => evaluation(primal));
    });

    const coalgebraDiagnostics: string[] = [];
    let coalgebraConsistent = true;

    const coalgebra = SetCat.hom(
      fiber.dualFiber,
      fiber.exponential.object,
      (dualElement) => {
        const evaluation = sweedlerFromDual.map(dualElement);
        return fiber.exponential.register((primal) => evaluation(primal));
      },
    );

    const sampledDual = enumerateWithLimit(fiber.dualFiber, sampleLimit);
    const sampledPrimal = enumerateWithLimit(fiber.primalFiber, sampleLimit);

    for (const dualElement of sampledDual) {
      const rawElement = dualElement.element as Right;
      const costateArrow = costate.map(rawElement);
      const coalgebraArrow = coalgebra.map(dualElement);

      for (const primal of sampledPrimal) {
        const expected = fiber.phi.map([primal, dualElement]);
        const fromCostate = fiber.exponential.evaluation.map([costateArrow, dualElement]);
        const fromCoalgebra = fiber.exponential.evaluation.map([coalgebraArrow, dualElement]);

        if (!Object.is(expected, fromCostate)) {
          costateConsistent = false;
          costateDiagnostics.push(
            `Costate inconsistency at object ${String(object)}: ?(${String(
              primal.element,
            )}, ${String(rawElement)}) = ${String(expected)} but ? returns ${String(fromCostate)}.`,
          );
        }

        if (!Object.is(expected, fromCoalgebra)) {
          coalgebraConsistent = false;
          coalgebraDiagnostics.push(
            `Coalgebra inconsistency at object ${String(object)}: ?(${String(
              primal.element,
            )}, ${String(rawElement)}) = ${String(expected)} but Sweedler map returns ${String(
              fromCoalgebra,
            )}.`,
          );
        }
      }
    }

    if (sampledDual.length < fiber.dualFiber.size) {
      costateDiagnostics.push(
        `Costate diagnostics truncated to ${sampledDual.length} of ${fiber.dualFiber.size} dual elements for object ${String(
          object,
        )}.`,
      );
      coalgebraDiagnostics.push(
        `Coalgebra diagnostics truncated to ${sampledDual.length} of ${fiber.dualFiber.size} dual elements for object ${String(
          object,
        )}.`,
      );
    }

    if (sampledPrimal.length < fiber.primalFiber.size) {
      costateDiagnostics.push(
        `Costate diagnostics truncated to ${sampledPrimal.length} of ${fiber.primalFiber.size} primal elements for object ${String(
          object,
        )}.`,
      );
      coalgebraDiagnostics.push(
        `Coalgebra diagnostics truncated to ${sampledPrimal.length} of ${fiber.primalFiber.size} primal elements for object ${String(
          object,
        )}.`,
      );
    }

    if (costateConsistent) {
      costateDiagnostics.push(
        `Costate translation agrees with ? on sampled entries for object ${String(object)}.`,
      );
    }

    if (coalgebraConsistent) {
      coalgebraDiagnostics.push(
        `Coalgebra translation agrees with ? on sampled entries for object ${String(object)}.`,
      );
    }

    costateComponents.push({
      object,
      costate,
      evaluationConsistent: costateConsistent,
      diagnostics: costateDiagnostics,
    });

    coalgebraComponents.push({
      object,
      coalgebra,
      evaluationConsistent: coalgebraConsistent,
      diagnostics: coalgebraDiagnostics,
    });
  }

  diagnostics.push(
    `Runner translation sampled up to ${sampleLimit} element(s) per carrier to align ?, ?, and coalgebra data with recorded ? tables.`,
  );

  return {
    interaction,
    thetaComponents,
    costateComponents,
    coalgebraComponents,
    diagnostics,
    ...(metadata ? { metadata } : {}),
  };
};

type Example9Contribution = FunctorInteractionLawContribution<
  TwoObject,
  TwoArrow,
  unknown,
  unknown,
  boolean
>;

const EXAMPLE9_KERNEL = makeTwoObjectPromonoidalKernel();

const buildExample9Law = () => {
  const left = contravariantRepresentableFunctorWithWitness(TwoObjectCategory, "?");
  const right = covariantRepresentableFunctorWithWitness(TwoObjectCategory, "?");
  const convolution = dayTensor(EXAMPLE9_KERNEL, left.functor, right.functor);
  const dualizing = SetCat.obj([false, true], { tag: "Example9Bool" });
  const operations = makeFunctorInteractionLawOperations<TwoObject, TwoArrow>({
    metadata: ["Example9 free semigroup operations"],
    monadOperations: [
      makeCommutativeBinaryMonadOperation<TwoObject, TwoArrow>({
        label: "db",
        component: (object) => TwoObjectCategory.id(object),
        swapWitness: TwoObjectCategory.id("?"),
        kleisliOnGeneric: (object) => TwoObjectCategory.id(object),
        dayReferences: [
          {
            fiber: "?",
            index: 0,
            metadata: ["Example9 fiber"],
          },
        ],
        lawvereWitness: {
          domain: "?",
          codomain: "?",
          morphism: TwoObjectCategory.id("?"),
          metadata: ["Example9 lawvere witness"],
        },
        metadata: ["Example9 binary operation"],
        commutativeMetadata: ["Example9 degeneracy"],
      }),
    ],
  });

  return makeFunctorInteractionLaw<TwoObject, TwoArrow, unknown, unknown, boolean>({
    kernel: EXAMPLE9_KERNEL,
    left: left.functor,
    right: right.functor,
    convolution,
    dualizing,
    pairing: (
      _object,
      carrier,
    ) =>
      SetCat.hom(
        carrier,
        dualizing,
        (cls) => cls.witness.kernelLeft === cls.witness.kernelRight,
      ),
    aggregate: (contributions: ReadonlyArray<Example9Contribution>) =>
      contributions.some((entry) => entry.evaluation),
    tags: { primal: "Example9Primal", dual: "Example9Dual" },
    operations,
  });
};

export interface Example9FreeSemigroupDegeneracyResult {
  readonly law: FunctorInteractionLaw<TwoObject, TwoArrow, unknown, unknown, boolean>;
  readonly report: FunctorOperationDegeneracyReport<
    TwoObject,
    TwoArrow,
    unknown,
    unknown,
    boolean,
    TwoObject,
    TwoArrow
  >;
}

export const analyzeExample9FreeSemigroupDegeneracy = (): Example9FreeSemigroupDegeneracyResult => {
  const law = buildExample9Law();
  const report = analyzeFunctorOperationDegeneracy<
    TwoObject,
    TwoArrow,
    unknown,
    unknown,
    boolean,
    TwoObject,
    TwoArrow
  >(law);
  return { law, report };
};

export type NonemptyArray<T> = readonly [T, ...T[]];

export type Example14Symbol = "x0" | "x1";

export interface Example14Term<A> {
  readonly tag: "var" | "node";
  readonly value?: A;
  readonly left?: Example14Term<A>;
  readonly right?: Example14Term<A>;
}

export type Example14FreeTerm = Example14Term<Example14Symbol>;
export type Example14NestedTerm = Example14Term<Example14FreeTerm>;
export type Example14NonemptyList = NonemptyArray<Example14Symbol>;
export type Example14ListOfLists = NonemptyArray<Example14NonemptyList>;

export type Example14CofreeElement =
  | {
      readonly tag: "inl";
      readonly value: Example14NonemptyList;
    }
  | {
      readonly tag: "inr";
      readonly value: readonly [Example14NonemptyList, Example14NonemptyList];
    };

export type Example14CofreeDoubleElement =
  | {
      readonly tag: "inl";
      readonly value: Example14CofreeElement;
    }
  | {
      readonly tag: "inr";
      readonly value: readonly [Example14CofreeElement, Example14CofreeElement];
    };

const EXAMPLE14_SYMBOLS: ReadonlyArray<Example14Symbol> = ["x0", "x1"];

const example14SymbolCarrier = SetCat.obj(EXAMPLE14_SYMBOLS, {
  equals: (left, right) => left === right,
  tag: "Example14Symbol",
});

const isExample14Symbol = (candidate: unknown): candidate is Example14Symbol =>
  candidate === "x0" || candidate === "x1";

const isExample14Term = <A>(
  candidate: unknown,
  isLeaf: (value: unknown) => value is A,
): candidate is Example14Term<A> => {
  if (
    candidate === null ||
    typeof candidate !== "object" ||
    !("tag" in candidate) ||
    (candidate as { tag: unknown }).tag === undefined
  ) {
    return false;
  }
  const term = candidate as Example14Term<A>;
  if (term.tag === "var") {
    return isLeaf(term.value);
  }
  if (term.tag === "node") {
    return (
      term.left !== undefined &&
      term.right !== undefined &&
      isExample14Term(term.left, isLeaf) &&
      isExample14Term(term.right, isLeaf)
    );
  }
  return false;
};

const example14TermEquals = <A>(
  left: Example14Term<A>,
  right: Example14Term<A>,
  equals: (first: A, second: A) => boolean,
): boolean => {
  if (left.tag !== right.tag) {
    return false;
  }
  if (left.tag === "var" && right.tag === "var") {
    return equals(left.value as A, right.value as A);
  }
  if (left.left && right.left && left.right && right.right) {
    return (
      example14TermEquals(left.left, right.left, equals) &&
      example14TermEquals(left.right, right.right, equals)
    );
  }
  return false;
};

const isExample14FreeTerm = (candidate: unknown): candidate is Example14FreeTerm =>
  isExample14Term(candidate, isExample14Symbol);

const EXAMPLE14_FREE_TERM_CACHE = new Map<number, ReadonlyArray<Example14FreeTerm>>();

const computeExample14FreeTermsOfSize = (
  size: number,
): ReadonlyArray<Example14FreeTerm> => {
  const cached = EXAMPLE14_FREE_TERM_CACHE.get(size);
  if (cached) {
    return cached;
  }
  let terms: ReadonlyArray<Example14FreeTerm>;
  if (size === 1) {
    terms = EXAMPLE14_SYMBOLS.map<Example14FreeTerm>((symbol) => ({
      tag: "var",
      value: symbol,
    }));
  } else {
    const results: Example14FreeTerm[] = [];
    for (let leftSize = 1; leftSize < size; leftSize += 1) {
      const rightSize = size - leftSize;
      for (const leftTerm of computeExample14FreeTermsOfSize(leftSize)) {
        for (const rightTerm of computeExample14FreeTermsOfSize(rightSize)) {
          results.push({ tag: "node", left: leftTerm, right: rightTerm });
        }
      }
    }
    terms = results;
  }
  EXAMPLE14_FREE_TERM_CACHE.set(size, terms);
  return terms;
};

const enumerateExample14FreeTerms = function* (): IterableIterator<Example14FreeTerm> {
  let size = 1;
  while (true) {
    const terms = computeExample14FreeTermsOfSize(size);
    for (const term of terms) {
      yield term;
    }
    size += 1;
  }
};

const example14FreeTermSemantics = {
  iterate: enumerateExample14FreeTerms,
  has: (candidate: Example14FreeTerm) => isExample14FreeTerm(candidate),
  equals: (left: Example14FreeTerm, right: Example14FreeTerm) =>
    example14TermEquals(left, right, (first, second) => first === second),
  tag: "Example14FreeTerm",
};

const example14FreeTermCarrier = SetCat.lazyObj<Example14FreeTerm>({
  semantics: example14FreeTermSemantics,
});

const example14FreeTermIterator = enumerateExample14FreeTerms();
const example14FreeTermSamples: Example14FreeTerm[] = [];

const ensureExample14FreeTerms = (count: number): void => {
  while (example14FreeTermSamples.length < count) {
    const next = example14FreeTermIterator.next();
    if (next.done) {
      break;
    }
    example14FreeTermSamples.push(next.value);
  }
};

const isExample14NestedTerm = (
  candidate: unknown,
): candidate is Example14NestedTerm => isExample14Term(candidate, isExample14FreeTerm);

const EXAMPLE14_NESTED_CACHE = new Map<number, ReadonlyArray<Example14NestedTerm>>();
const EXAMPLE14_NESTED_BASE_LIMIT = 6;

const computeExample14NestedTermsOfSize = (
  size: number,
): ReadonlyArray<Example14NestedTerm> => {
  const cached = EXAMPLE14_NESTED_CACHE.get(size);
  if (cached) {
    return cached;
  }
  let terms: ReadonlyArray<Example14NestedTerm>;
  if (size === 1) {
    ensureExample14FreeTerms(EXAMPLE14_NESTED_BASE_LIMIT);
    terms = example14FreeTermSamples
      .slice(0, EXAMPLE14_NESTED_BASE_LIMIT)
      .map<Example14NestedTerm>((term) => ({ tag: "var", value: term }));
  } else {
    const results: Example14NestedTerm[] = [];
    for (let leftSize = 1; leftSize < size; leftSize += 1) {
      const rightSize = size - leftSize;
      for (const leftTerm of computeExample14NestedTermsOfSize(leftSize)) {
        for (const rightTerm of computeExample14NestedTermsOfSize(rightSize)) {
          results.push({ tag: "node", left: leftTerm, right: rightTerm });
        }
      }
    }
    terms = results;
  }
  EXAMPLE14_NESTED_CACHE.set(size, terms);
  return terms;
};

const enumerateExample14NestedTerms = function* (): IterableIterator<Example14NestedTerm> {
  let size = 1;
  while (true) {
    const terms = computeExample14NestedTermsOfSize(size);
    for (const term of terms) {
      yield term;
    }
    size += 1;
  }
};

const example14NestedTermSemantics = {
  iterate: enumerateExample14NestedTerms,
  has: (candidate: Example14NestedTerm) => isExample14NestedTerm(candidate),
  equals: (left: Example14NestedTerm, right: Example14NestedTerm) =>
    example14TermEquals(left, right, (first, second) =>
      example14TermEquals(
        first,
        second,
        (a, b) => a === b,
      ),
    ),
  tag: "Example14NestedTerm",
};

const example14NestedTermCarrier = SetCat.lazyObj<Example14NestedTerm>({
  semantics: example14NestedTermSemantics,
});

const isExample14NonemptyList = (
  candidate: unknown,
): candidate is Example14NonemptyList =>
  Array.isArray(candidate) &&
  candidate.length > 0 &&
  candidate.every((value) => isExample14Symbol(value));

const example14ListEquals = (
  left: Example14NonemptyList,
  right: Example14NonemptyList,
): boolean =>
  left.length === right.length && left.every((value, index) => value === right[index]);

const enumerateExample14Lists = function* (): IterableIterator<Example14NonemptyList> {
  let length = 1;
  while (true) {
    const indices = Array.from({ length }, () => 0);
    let finished = false;
    while (!finished) {
      const list = indices.map((index) => EXAMPLE14_SYMBOLS[index]);
      yield list as Example14NonemptyList;
      let position = length - 1;
      while (position >= 0 && indices[position] === EXAMPLE14_SYMBOLS.length - 1) {
        indices[position] = 0;
        position -= 1;
      }
      if (position < 0) {
        finished = true;
      } else {
        indices[position] += 1;
      }
    }
    length += 1;
  }
};

const example14NonemptyListSemantics = {
  iterate: enumerateExample14Lists,
  has: (candidate: Example14NonemptyList) => isExample14NonemptyList(candidate),
  equals: example14ListEquals,
  tag: "Example14NonemptyList",
};

const example14NonemptyListCarrier = SetCat.lazyObj<Example14NonemptyList>({
  semantics: example14NonemptyListSemantics,
});

const isExample14ListOfLists = (
  candidate: unknown,
): candidate is Example14ListOfLists =>
  Array.isArray(candidate) &&
  candidate.length > 0 &&
  candidate.every((value) => isExample14NonemptyList(value));

const enumerateExample14ListOfLists = function* (): IterableIterator<Example14ListOfLists> {
  let length = 1;
  const listIterator = enumerateExample14Lists();
  const cachedLists: Example14NonemptyList[] = [];
  while (true) {
    while (cachedLists.length < length) {
      const next = listIterator.next();
      if (next.done) {
        break;
      }
      cachedLists.push(next.value);
    }
    const indices = Array.from({ length }, () => 0);
    let finished = false;
    while (!finished) {
      const value = indices.map((index) => cachedLists[index]);
      yield value as Example14ListOfLists;
      let position = length - 1;
      while (position >= 0 && indices[position] === cachedLists.length - 1) {
        indices[position] = 0;
        position -= 1;
      }
      if (position < 0) {
        finished = true;
      } else {
        indices[position] += 1;
      }
    }
    length += 1;
  }
};

const example14ListOfListsSemantics = {
  iterate: enumerateExample14ListOfLists,
  has: (candidate: Example14ListOfLists) => isExample14ListOfLists(candidate),
  equals: (
    left: Example14ListOfLists,
    right: Example14ListOfLists,
  ) =>
    left.length === right.length &&
    left.every((value, index) => example14ListEquals(value, right[index])),
  tag: "Example14ListOfLists",
};

const example14ListOfListsCarrier = SetCat.lazyObj<Example14ListOfLists>({
  semantics: example14ListOfListsSemantics,
});

const flattenExample14Term = (
  term: Example14FreeTerm,
): Example14NonemptyList => {
  if (term.tag === "var") {
    return [term.value as Example14Symbol];
  }
  const left = flattenExample14Term(term.left as Example14FreeTerm);
  const right = flattenExample14Term(term.right as Example14FreeTerm);
  return [...left, ...right] as Example14NonemptyList;
};

const flattenExample14NestedTerm = (
  term: Example14NestedTerm,
): Example14FreeTerm => {
  if (term.tag === "var") {
    return term.value as Example14FreeTerm;
  }
  return {
    tag: "node",
    left: flattenExample14NestedTerm(term.left as Example14NestedTerm),
    right: flattenExample14NestedTerm(term.right as Example14NestedTerm),
  };
};

const flattenExample14ListOfLists = (
  lists: Example14ListOfLists,
): Example14NonemptyList => {
  const collected: Example14Symbol[] = [];
  for (const list of lists) {
    collected.push(...list);
  }
  return collected as Example14NonemptyList;
};

const example14FreeMonadFunctor = constructFunctorWithWitness(
  TwoObjectCategory,
  setSimpleCategory,
  {
    F0: () => example14FreeTermCarrier,
    F1: () => SetCat.id(example14FreeTermCarrier),
  },
  { objects: TwoObjectCategory.objects, arrows: TwoObjectCategory.arrows },
  ["Example14 free monad functor"],
);

const example14FreeMonadUnit = constructNaturalTransformationWithWitness(
  example14FreeMonadFunctor,
  example14FreeMonadFunctor,
  () =>
    SetCat.hom(example14SymbolCarrier, example14FreeTermCarrier, (symbol) => ({
      tag: "var",
      value: symbol as Example14Symbol,
    })),
  { metadata: ["Example14 free monad unit"] },
);

const example14FreeMonadMultiplication = constructNaturalTransformationWithWitness(
  example14FreeMonadFunctor,
  example14FreeMonadFunctor,
  () =>
    SetCat.hom(example14NestedTermCarrier, example14FreeTermCarrier, (term) =>
      flattenExample14NestedTerm(term as Example14NestedTerm),
    ),
  { metadata: ["Example14 free monad multiplication"] },
);

const example14NonemptyListFunctor = constructFunctorWithWitness(
  TwoObjectCategory,
  setSimpleCategory,
  {
    F0: () => example14NonemptyListCarrier,
    F1: () => SetCat.id(example14NonemptyListCarrier),
  },
  { objects: TwoObjectCategory.objects, arrows: TwoObjectCategory.arrows },
  ["Example14 nonempty list functor"],
);

const example14NonemptyListUnit = constructNaturalTransformationWithWitness(
  example14NonemptyListFunctor,
  example14NonemptyListFunctor,
  () =>
    SetCat.hom(example14SymbolCarrier, example14NonemptyListCarrier, (symbol) => [
      symbol as Example14Symbol,
    ] as Example14NonemptyList),
  { metadata: ["Example14 nonempty list unit"] },
);

const example14NonemptyListMultiplication = constructNaturalTransformationWithWitness(
  example14NonemptyListFunctor,
  example14NonemptyListFunctor,
  () =>
    SetCat.hom(example14ListOfListsCarrier, example14NonemptyListCarrier, (value) =>
      flattenExample14ListOfLists(value as Example14ListOfLists),
    ),
  { metadata: ["Example14 nonempty list multiplication"] },
);

export interface NonemptyListFreeMonadData {
  readonly symbolCarrier: SetObj<Example14Symbol>;
  readonly freeCarrier: SetObj<Example14FreeTerm>;
  readonly nestedCarrier: SetObj<Example14NestedTerm>;
  readonly monad: MonadStructure<TwoObject, TwoArrow>;
  readonly binaryOperation: (left: Example14FreeTerm, right: Example14FreeTerm) => Example14FreeTerm;
}

export const nonemptyListFreeMonad = (): NonemptyListFreeMonadData => ({
  symbolCarrier: example14SymbolCarrier,
  freeCarrier: example14FreeTermCarrier,
  nestedCarrier: example14NestedTermCarrier,
  monad: {
    functor: example14FreeMonadFunctor,
    unit: example14FreeMonadUnit,
    multiplication: example14FreeMonadMultiplication,
    metadata: ["Example14 free monad"],
  },
  binaryOperation: (left, right) => ({ tag: "node", left, right }),
});

export interface NonemptyListQuotientData {
  readonly free: NonemptyListFreeMonadData;
  readonly quotientCarrier: SetObj<Example14NonemptyList>;
  readonly listOfListsCarrier: SetObj<Example14ListOfLists>;
  readonly monad: MonadStructure<TwoObject, TwoArrow>;
  readonly quotient: NaturalTransformationWithWitness<TwoObject, TwoArrow, unknown, unknown>;
}

export const nonemptyListQuotient = (): NonemptyListQuotientData => {
  const free = nonemptyListFreeMonad();
  const quotient = constructNaturalTransformationWithWitness(
    free.monad.functor,
    example14NonemptyListFunctor,
    () =>
      SetCat.hom(free.freeCarrier, example14NonemptyListCarrier, (term) =>
        flattenExample14Term(term as Example14FreeTerm),
      ),
    { metadata: ["Example14 quotient map"] },
  );
  return {
    free,
    quotientCarrier: example14NonemptyListCarrier,
    listOfListsCarrier: example14ListOfListsCarrier,
    monad: {
      functor: example14NonemptyListFunctor,
      unit: example14NonemptyListUnit,
      multiplication: example14NonemptyListMultiplication,
      metadata: ["Example14 nonempty list monad"],
    },
    quotient,
  };
};

export interface NonemptyListSweedlerData {
  readonly quotient: NonemptyListQuotientData;
  readonly cofree: {
    readonly carrier: SetObj<Example14CofreeElement>;
    readonly doubleCarrier: SetObj<Example14CofreeDoubleElement>;
    readonly functor: FunctorWithWitness<TwoObject, TwoArrow, SetObj<unknown>, SetHom<unknown, unknown>>;
    readonly comonad: ComonadStructure<TwoObject, TwoArrow>;
  };
  readonly sweedler: {
    readonly carrier: SetObj<Example14CofreeElement>;
    readonly doubleCarrier: SetObj<Example14CofreeDoubleElement>;
    readonly functor: FunctorWithWitness<TwoObject, TwoArrow, SetObj<unknown>, SetHom<unknown, unknown>>;
    readonly comonad: ComonadStructure<TwoObject, TwoArrow>;
    readonly inclusion: NaturalTransformationWithWitness<TwoObject, TwoArrow, unknown, unknown>;
    readonly doubleInclusion: SetHom<Example14CofreeDoubleElement, Example14CofreeDoubleElement>;
    readonly coequation: SetHom<Example14CofreeElement, Example14CofreeDoubleElement>;
    readonly metadata: ReadonlyArray<string>;
  };
  readonly metadata: ReadonlyArray<string>;
}

const canonicalizeCofreeElement = (
  injections: CoproductData<
    Example14NonemptyList,
    Readonly<[Example14NonemptyList, Example14NonemptyList]>
  >["injections"],
  product: ProductData<Example14NonemptyList, Example14NonemptyList>,
  value: Example14CofreeElement,
): Example14CofreeElement =>
  value.tag === "inl"
    ? injections.inl.map(value.value)
    : injections.inr.map(product.lookup(value.value[0], value.value[1]));

const isRectangularCofree = (value: Example14CofreeElement): boolean =>
  value.tag === "inl"
    ? value.value.length <= 2
    : value.value[0].length === value.value[1].length;

const isRectangularDouble = (value: Example14CofreeDoubleElement): boolean =>
  value.tag === "inl"
    ? isRectangularCofree(value.value)
    : isRectangularCofree(value.value[0]) && isRectangularCofree(value.value[1]);

export const sweedlerDualNonemptyList = (): NonemptyListSweedlerData => {
  const quotient = nonemptyListQuotient();
  const baseCarrier = quotient.monad.functor.functor.F0("?") as SetObj<Example14NonemptyList>;
  const cofreePair = SetCat.product(baseCarrier, baseCarrier);
  const cofreeData = SetCat.coproduct(baseCarrier, cofreePair.object);
  const cofreeCarrier = cofreeData.object as SetObj<Example14CofreeElement>;
  const cofreeDoublePair = SetCat.product(cofreeCarrier, cofreeCarrier);
  const cofreeDoubleData = SetCat.coproduct(cofreeCarrier, cofreeDoublePair.object);
  const cofreeDoubleCarrier = cofreeDoubleData.object as SetObj<Example14CofreeDoubleElement>;

  const cofreeFunctor = constructFunctorWithWitness(
    TwoObjectCategory,
    setSimpleCategory,
    {
      F0: () => cofreeCarrier,
      F1: () => SetCat.id(cofreeCarrier),
    },
    { objects: TwoObjectCategory.objects, arrows: TwoObjectCategory.arrows },
    ["Example14 cofree functor"],
  );

  const cofreeCounit = constructNaturalTransformationWithWitness(
    cofreeFunctor,
    quotient.monad.functor,
    () =>
      SetCat.hom(
        cofreeCarrier,
        baseCarrier,
        (value) => (value.tag === "inl" ? value.value : value.value[0]),
      ),
    { metadata: ["Example14 cofree counit"] },
  );

  const cofreeComultiplication = constructNaturalTransformationWithWitness(
    cofreeFunctor,
    cofreeFunctor,
    () =>
      SetCat.hom(
        cofreeCarrier,
        cofreeDoubleCarrier,
        (raw) => {
          const value = canonicalizeCofreeElement(cofreeData.injections, cofreePair, raw);
          if (value.tag === "inl") {
            return cofreeDoubleData.injections.inl.map(value);
          }
          const left = cofreeData.injections.inl.map(value.value[0]);
          const right = cofreeData.injections.inl.map(value.value[1]);
          const paired = cofreeDoublePair.lookup(left, right);
          return cofreeDoubleData.injections.inr.map(paired);
        },
      ),
    { metadata: ["Example14 cofree comultiplication"] },
  );

  const rectangularCharacteristic = SetCat.hom(
    cofreeCarrier,
    SetOmega,
    (value) => (isRectangularCofree(value) ? true : false),
  );
  const sweedlerSubset = SetCat.subobjectFromCharacteristic(rectangularCharacteristic);
  const sweedlerCarrier = sweedlerSubset.subset as SetObj<Example14CofreeElement>;
  const sweedlerInclusionMap = sweedlerSubset.inclusion as SetHom<
    Example14CofreeElement,
    Example14CofreeElement
  >;

  const rectangularDoubleCharacteristic = SetCat.hom(
    cofreeDoubleCarrier,
    SetOmega,
    (value) => (isRectangularDouble(value) ? true : false),
  );
  const sweedlerDoubleSubset = SetCat.subobjectFromCharacteristic(
    rectangularDoubleCharacteristic,
  );
  const sweedlerDoubleCarrier = sweedlerDoubleSubset.subset as SetObj<Example14CofreeDoubleElement>;
  const sweedlerDoubleInclusion = sweedlerDoubleSubset.inclusion as SetHom<
    Example14CofreeDoubleElement,
    Example14CofreeDoubleElement
  >;

  const sweedlerFunctor = constructFunctorWithWitness(
    TwoObjectCategory,
    setSimpleCategory,
    {
      F0: () => sweedlerCarrier,
      F1: () => SetCat.id(sweedlerCarrier),
    },
    { objects: TwoObjectCategory.objects, arrows: TwoObjectCategory.arrows },
    ["Example14 Sweedler functor"],
  );

  const sweedlerCounit = constructNaturalTransformationWithWitness(
    sweedlerFunctor,
    quotient.monad.functor,
    () => SetCat.compose(cofreeCounit.transformation.component("?"), sweedlerInclusionMap),
    { metadata: ["Example14 Sweedler counit"] },
  );

  const cofreeComponent = cofreeComultiplication.transformation.component("?") as SetHom<
    Example14CofreeElement,
    Example14CofreeDoubleElement
  >;

  const sweedlerComultiplication = constructNaturalTransformationWithWitness(
    sweedlerFunctor,
    sweedlerFunctor,
    () =>
      SetCat.hom(
        sweedlerCarrier,
        sweedlerDoubleCarrier,
        (value) => cofreeComponent.map(sweedlerInclusionMap.map(value)),
      ),
    { metadata: ["Example14 Sweedler comultiplication"] },
  );

  const sweedlerInclusion = constructNaturalTransformationWithWitness(
    sweedlerFunctor,
    cofreeFunctor,
    () => sweedlerInclusionMap,
    { metadata: ["Example14 Sweedler inclusion"] },
  );

  const sweedlerCoequation = SetCat.compose(
    sweedlerDoubleInclusion,
    sweedlerComultiplication.transformation.component("?"),
  );

  return {
    quotient,
    cofree: {
      carrier: cofreeCarrier,
      doubleCarrier: cofreeDoubleCarrier,
      functor: cofreeFunctor,
      comonad: {
        functor: cofreeFunctor,
        counit: cofreeCounit,
        comultiplication: cofreeComultiplication,
        metadata: ["Example14 cofree comonad"],
      },
    },
    sweedler: {
      carrier: sweedlerCarrier,
      doubleCarrier: sweedlerDoubleCarrier,
      functor: sweedlerFunctor,
      comonad: {
        functor: sweedlerFunctor,
        counit: sweedlerCounit,
        comultiplication: sweedlerComultiplication,
        metadata: ["Example14 Sweedler dual"],
      },
      inclusion: sweedlerInclusion,
      doubleInclusion: sweedlerDoubleInclusion,
      coequation: sweedlerCoequation,
      metadata: ["Example14 Sweedler subcomonad"],
    },
    metadata: ["Example14 Sweedler dual data"],
  };
};

export interface NonemptyListCoequationData {
  readonly sweedler: NonemptyListSweedlerData;
  readonly leftPartition: SetObj<Example14CofreeElement>;
  readonly rightPartition: SetObj<Example14CofreeElement>;
  readonly leftInclusion: SetHom<Example14CofreeElement, Example14CofreeElement>;
  readonly rightInclusion: SetHom<Example14CofreeElement, Example14CofreeElement>;
  readonly cDelta: SetHom<
    Example14CofreeElement,
    Coproduct<Example14CofreeElement, Example14CofreeElement>
  >;
  readonly cEpsilon: SetHom<
    Example14CofreeElement,
    Coproduct<Example14NonemptyList, Example14NonemptyList>
  >;
  readonly deltaCoproduct: CoproductData<
    Example14CofreeElement,
    Example14CofreeElement
  >;
  readonly epsilonCoproduct: CoproductData<
    Example14NonemptyList,
    Example14NonemptyList
  >;
  readonly metadata: ReadonlyArray<string>;
}

const enumerateAllElements = <A>(carrier: SetObj<A>): ReadonlyArray<A> => {
  const semantics = getCarrierSemantics(carrier);
  if (semantics?.iterate) {
    return Array.from(semantics.iterate());
  }
  return Array.from(carrier.values());
};

const partitionSweedlerElements = (
  data: NonemptyListSweedlerData,
): {
  readonly left: ReadonlyArray<Example14CofreeElement>;
  readonly right: ReadonlyArray<Example14CofreeElement>;
} => {
  const values = enumerateAllElements(
    data.sweedler.functor.functor.F0("?") as SetObj<Example14CofreeElement>,
  );
  const left: Example14CofreeElement[] = [];
  const right: Example14CofreeElement[] = [];
  const coequation = data.sweedler.coequation;
  for (const value of values) {
    const image = coequation.map(value);
    if (image.tag === "inl") {
      left.push(value);
    } else {
      right.push(value);
    }
  }
  return { left, right };
};

const makeInclusion = <A>(
  subset: SetObj<A>,
  ambient: SetObj<A>,
): SetHom<A, A> =>
  SetCat.hom(subset, ambient, (value) => value);

export const deriveNonemptyListCoequation = (): NonemptyListCoequationData => {
  const sweedler = sweedlerDualNonemptyList();
  const sweedlerCarrier = sweedler.sweedler.functor.functor.F0(
    "?",
  ) as SetObj<Example14CofreeElement>;
  const baseCarrier = sweedler.quotient.monad.functor.functor.F0(
    "?",
  ) as SetObj<Example14NonemptyList>;

  const { left, right } = partitionSweedlerElements(sweedler);

  const leftSemantics = SetCat.createSubsetSemantics(
    sweedlerCarrier,
    left,
    { tag: "Example14CoequationLeft" },
  );
  const rightSemantics = SetCat.createSubsetSemantics(
    sweedlerCarrier,
    right,
    { tag: "Example14CoequationRight" },
  );

  const leftPartition = SetCat.obj(left, {
    semantics: leftSemantics,
    tag: "Example14CoequationLeft",
  }) as SetObj<Example14CofreeElement>;
  const rightPartition = SetCat.obj(right, {
    semantics: rightSemantics,
    tag: "Example14CoequationRight",
  }) as SetObj<Example14CofreeElement>;

  const leftInclusion = makeInclusion(leftPartition, sweedlerCarrier);
  const rightInclusion = makeInclusion(rightPartition, sweedlerCarrier);

  const deltaCoproduct = SetCat.coproduct(
    sweedlerCarrier,
    sweedlerCarrier,
    { tag: "Example14CoequationDelta" },
  );

  const epsilonCoproduct = SetCat.coproduct(
    baseCarrier,
    baseCarrier,
    { tag: "Example14CoequationEpsilon" },
  );

  const leftMembership = semanticsAwareHas(leftPartition);
  const counit = sweedler.sweedler.comonad.counit.transformation.component(
    "?",
  ) as SetHom<Example14CofreeElement, Example14NonemptyList>;
  const comultiplication =
    sweedler.sweedler.comonad.comultiplication.transformation.component(
      "?",
    ) as SetHom<Example14CofreeElement, Example14CofreeDoubleElement>;

  const cDelta = SetCat.hom(
    sweedlerCarrier,
    deltaCoproduct.object,
    (value) =>
      leftMembership(value)
        ? deltaCoproduct.injections.inl.map(value)
        : deltaCoproduct.injections.inr.map(value),
  );

  const cEpsilon = SetCat.hom(
    sweedlerCarrier,
    epsilonCoproduct.object,
    (value) => {
      const evaluation = counit.map(value);
      return leftMembership(value)
        ? epsilonCoproduct.injections.inl.map(evaluation)
        : epsilonCoproduct.injections.inr.map(evaluation);
    },
  );

  const metadata = mergeMetadataList(
    sweedler.metadata,
    ["Example14CoequationData"],
  );

  return {
    sweedler,
    leftPartition,
    rightPartition,
    leftInclusion,
    rightInclusion,
    cDelta,
    cEpsilon,
    deltaCoproduct,
    epsilonCoproduct,
    metadata,
  };
};

export interface NonemptyListRectangularityWitness {
  readonly value: Example14CofreeElement;
  readonly delta: Example14CofreeDoubleElement;
  readonly coequation: Example14CofreeDoubleElement;
  readonly partition: "left" | "right";
  readonly rectangular: boolean;
  readonly inclusionAgree: boolean;
}

export interface NonemptyListRectangularityReport {
  readonly holds: boolean;
  readonly witnesses: ReadonlyArray<NonemptyListRectangularityWitness>;
  readonly details: ReadonlyArray<string>;
  readonly metadata: ReadonlyArray<string>;
}

export const checkRectangularityFromCoequation = (
  data: NonemptyListCoequationData,
): NonemptyListRectangularityReport => {
  const sweedlerCarrier = data.sweedler.sweedler.functor.functor.F0(
    "?",
  ) as SetObj<Example14CofreeElement>;
  const values = enumerateAllElements(sweedlerCarrier);
  const doubleEquals = semanticsAwareEquals(
    data.sweedler.cofree.doubleCarrier,
  );
  const leftMembership = semanticsAwareHas(data.leftPartition);
  const rightMembership = semanticsAwareHas(data.rightPartition);
  const comultiplication =
    data.sweedler.sweedler.comonad.comultiplication.transformation.component(
      "?",
    ) as SetHom<Example14CofreeElement, Example14CofreeDoubleElement>;
  const coequation = data.sweedler.sweedler.coequation;
  const inclusion = data.sweedler.sweedler.doubleInclusion;

  const witnesses: NonemptyListRectangularityWitness[] = [];
  const details: string[] = [];

  for (const value of values) {
    const delta = comultiplication.map(value);
    const included = inclusion.map(delta);
    const classified = leftMembership(value) ? "left" : "right";
    if (!leftMembership(value) && !rightMembership(value)) {
      details.push(
        `Value ${JSON.stringify(value)} did not appear in either partition despite belonging to DY.`,
      );
    }
    const coequationValue = coequation.map(value);
    const inclusionAgree = doubleEquals(included, coequationValue);
    const rectangular = isRectangularDouble(coequationValue);
    witnesses.push({
      value,
      delta,
      coequation: coequationValue,
      partition: classified,
      rectangular,
      inclusionAgree,
    });
  }

  const holds =
    witnesses.every((entry) => entry.rectangular) &&
    witnesses.every((entry) => entry.inclusionAgree);

  if (holds) {
    details.push(
      "Example14 rectangularity: every Sweedler element maps into the rectangular subcomonad and matches the recorded coequation.",
    );
  } else {
    details.push(
      "Example14 rectangularity: at least one element failed the rectangular or inclusion consistency checks.",
    );
  }

  const metadata = mergeMetadataList(data.metadata, ["Example14Rectangularity"]);

  return { holds, witnesses, details, metadata };
};

type Example6AElement = 0 | 1;
type Example6BaseX = "x0" | "x1";
type Example6BaseY = "y0" | "y1";
type Example6Writer = readonly [Example6AElement, Example6BaseX];
type Example6WriterSquared = readonly [Example6AElement, Example6Writer];
type Example6Reader = readonly [Example6BaseY, Example6BaseY];
type Example6ReaderSquared = readonly [Example6Reader, Example6Reader];
type Example6Left = Example6Writer | Example6WriterSquared;
type Example6Right = Example6Reader | Example6ReaderSquared;
type Example6InteractionValue =
  | readonly [Example6BaseX, Example6BaseY]
  | readonly [Example6BaseX, Example6Reader]
  | readonly [Example6Writer, Example6BaseY]
  | readonly [Example6Writer, Example6Reader];

const EXAMPLE6_A_VALUES: ReadonlyArray<Example6AElement> = [0, 1];
const EXAMPLE6_BASE_X_VALUES: ReadonlyArray<Example6BaseX> = ["x0", "x1"];
const EXAMPLE6_BASE_Y_VALUES: ReadonlyArray<Example6BaseY> = ["y0", "y1"];

const addA = (left: Example6AElement, right: Example6AElement): Example6AElement =>
  ((left + right) % 2) as Example6AElement;

const isAElement = (candidate: unknown): candidate is Example6AElement =>
  candidate === 0 || candidate === 1;

const isBaseX = (candidate: unknown): candidate is Example6BaseX =>
  candidate === "x0" || candidate === "x1";

const isBaseY = (candidate: unknown): candidate is Example6BaseY =>
  candidate === "y0" || candidate === "y1";

const isWriter = (candidate: unknown): candidate is Example6Writer =>
  Array.isArray(candidate) &&
  candidate.length === 2 &&
  isAElement(candidate[0]) &&
  isBaseX(candidate[1]);

const isWriterSquared = (candidate: unknown): candidate is Example6WriterSquared =>
  Array.isArray(candidate) &&
  candidate.length === 2 &&
  isAElement(candidate[0]) &&
  isWriter(candidate[1]);

const isReader = (candidate: unknown): candidate is Example6Reader =>
  Array.isArray(candidate) &&
  candidate.length === 2 &&
  isBaseY(candidate[0]) &&
  isBaseY(candidate[1]);

const isReaderSquared = (candidate: unknown): candidate is Example6ReaderSquared =>
  Array.isArray(candidate) &&
  candidate.length === 2 &&
  isReader(candidate[0]) &&
  isReader(candidate[1]);

const example6WriterElements: ReadonlyArray<Example6Writer> = EXAMPLE6_A_VALUES.flatMap(
  (a) => EXAMPLE6_BASE_X_VALUES.map((x) => [a, x] as const),
);

const example6WriterSquaredElements: ReadonlyArray<Example6WriterSquared> =
  EXAMPLE6_A_VALUES.flatMap((a) =>
    example6WriterElements.map((inner) => [a, inner] as const),
  );

const example6ReaderElements: ReadonlyArray<Example6Reader> =
  EXAMPLE6_BASE_Y_VALUES.flatMap((y0) =>
    EXAMPLE6_BASE_Y_VALUES.map((y1) => [y0, y1] as const),
  );

const example6ReaderSquaredElements: ReadonlyArray<Example6ReaderSquared> =
  example6ReaderElements.flatMap((first) =>
    example6ReaderElements.map((second) => [first, second] as const),
  );

const evaluateExample6 = (
  left: Example6Left,
  right: Example6Right,
): Example6InteractionValue => {
  if (isWriterSquared(left)) {
    const [a0, inner] = left;
    if (isReader(right)) {
      return [inner, right[a0]];
    }
    if (isReaderSquared(right)) {
      return [inner, right[a0]];
    }
  }
  if (isWriter(left)) {
    const [a, x] = left;
    if (isReader(right)) {
      return [x, right[a]];
    }
    if (isReaderSquared(right)) {
      return [x, right[a]];
    }
  }
  throw new Error("Example6: unsupported combination of left/right elements.");
};

const example6Values = new Map<string, Example6InteractionValue>();

const registerExample6Value = (value: Example6InteractionValue): void => {
  const key = JSON.stringify(value);
  if (!example6Values.has(key)) {
    example6Values.set(key, value);
  }
};

for (const writer of example6WriterElements) {
  for (const reader of example6ReaderElements) {
    registerExample6Value([writer[1], reader[writer[0]]]);
  }
  for (const readerSquared of example6ReaderSquaredElements) {
    registerExample6Value([writer[1], readerSquared[writer[0]]]);
  }
}

for (const writerSquared of example6WriterSquaredElements) {
  for (const reader of example6ReaderElements) {
    registerExample6Value([writerSquared[1], reader[writerSquared[0]]]);
  }
  for (const readerSquared of example6ReaderSquaredElements) {
    registerExample6Value([writerSquared[1], readerSquared[writerSquared[0]]]);
  }
}

const example6ValueCarrier = SetCat.obj(Array.from(example6Values.values()), {
  equals: semanticsAwareEquals,
  tag: "Example6Value",
});

const example6WriterCarrier = SetCat.obj(example6WriterElements, {
  equals: semanticsAwareEquals,
  tag: "Example6Writer",
});

const example6WriterSquaredCarrier = SetCat.obj(example6WriterSquaredElements, {
  equals: semanticsAwareEquals,
  tag: "Example6WriterSquared",
});

const example6ReaderCarrier = SetCat.obj(example6ReaderElements, {
  equals: semanticsAwareEquals,
  tag: "Example6Reader",
});

const example6ReaderSquaredCarrier = SetCat.obj(example6ReaderSquaredElements, {
  equals: semanticsAwareEquals,
  tag: "Example6ReaderSquared",
});

const example6BaseCarrier = SetCat.obj(EXAMPLE6_BASE_X_VALUES, {
  equals: semanticsAwareEquals,
  tag: "Example6Base",
});

const example6BaseYCarrier = SetCat.obj(EXAMPLE6_BASE_Y_VALUES, {
  equals: semanticsAwareEquals,
  tag: "Example6BaseY",
});

const EXAMPLE6_KERNEL = makeTwoObjectPromonoidalKernel();

const example6LeftFunctor = constructContravariantFunctorWithWitness(
  TwoObjectCategory,
  setSimpleCategory,
  {
    F0: () => example6WriterCarrier,
    F1: () => SetCat.id(example6WriterCarrier),
  },
  { objects: TwoObjectCategory.objects, arrows: TwoObjectCategory.arrows },
);

const example6RightFunctor = constructFunctorWithWitness(
  TwoObjectCategory,
  setSimpleCategory,
  {
    F0: () => example6ReaderCarrier,
    F1: () => SetCat.id(example6ReaderCarrier),
  },
  { objects: TwoObjectCategory.objects, arrows: TwoObjectCategory.arrows },
);

const example6MonadFunctor = constructFunctorWithWitness(
  TwoObjectCategory,
  setSimpleCategory,
  {
    F0: () => example6WriterCarrier,
    F1: () => SetCat.id(example6WriterCarrier),
  },
  { objects: TwoObjectCategory.objects, arrows: TwoObjectCategory.arrows },
);

const example6ComonadFunctor = constructFunctorWithWitness(
  TwoObjectCategory,
  setSimpleCategory,
  {
    F0: () => example6ReaderCarrier,
    F1: () => SetCat.id(example6ReaderCarrier),
  },
  { objects: TwoObjectCategory.objects, arrows: TwoObjectCategory.arrows },
);

const example6Unit = constructNaturalTransformationWithWitness(
  example6MonadFunctor,
  example6MonadFunctor,
  {
    component: () =>
      SetCat.hom(example6BaseCarrier, example6WriterCarrier, (x) => [0, x]),
  },
  { metadata: ["Example6 unit"], samples: { objects: TwoObjectCategory.objects } },
);

const example6Multiplication = constructNaturalTransformationWithWitness(
  example6MonadFunctor,
  example6MonadFunctor,
  {
    component: () =>
      SetCat.hom(example6WriterSquaredCarrier, example6WriterCarrier, (value) => [
        addA(value[0], value[1][0]),
        value[1][1],
      ]),
  },
  { metadata: ["Example6 multiplication"], samples: { objects: TwoObjectCategory.objects } },
);

const example6Counit = constructNaturalTransformationWithWitness(
  example6ComonadFunctor,
  example6ComonadFunctor,
  {
    component: () =>
      SetCat.hom(example6ReaderCarrier, example6BaseYCarrier, (value) => value[0]),
  },
  { metadata: ["Example6 counit"], samples: { objects: TwoObjectCategory.objects } },
);

const example6Comultiplication = constructNaturalTransformationWithWitness(
  example6ComonadFunctor,
  example6ComonadFunctor,
  {
    component: () =>
      SetCat.hom(example6ReaderCarrier, example6ReaderSquaredCarrier, (value) => [
        value,
        [value[1], value[0]],
      ]),
  },
  { metadata: ["Example6 comultiplication"], samples: { objects: TwoObjectCategory.objects } },
);

const example6Convolution = dayTensor(
  EXAMPLE6_KERNEL,
  example6LeftFunctor.functor,
  example6RightFunctor.functor,
);

export const makeExample6MonadComonadInteractionLaw = () => {
  const law = makeFunctorInteractionLaw<TwoObject, TwoArrow, Example6Left, Example6Right, Example6InteractionValue>({
    kernel: EXAMPLE6_KERNEL,
    left: example6LeftFunctor.functor,
    right: example6RightFunctor.functor,
    convolution: example6Convolution,
    dualizing: example6ValueCarrier,
    pairing: (
      _object,
      carrier,
    ) =>
      SetCat.hom(carrier, example6ValueCarrier, (cls) =>
        evaluateExample6(
          cls.witness.leftElement as Example6Left,
          cls.witness.rightElement as Example6Right,
        )),
    aggregate: (contributions) => {
      const first = contributions[0];
      if (!first) {
        throw new Error("Example6: missing Day contributions.");
      }
      return evaluateExample6(
        first.left.element as Example6Left,
        first.right.element as Example6Right,
      );
    },
    tags: { primal: "Example6Primal", dual: "Example6Dual" },
  });

  const monad: MonadStructure<TwoObject, TwoArrow> = {
    functor: example6MonadFunctor,
    unit: example6Unit,
    multiplication: example6Multiplication,
    metadata: ["Example6 writer monad"],
  };

  const comonad: ComonadStructure<TwoObject, TwoArrow> = {
    functor: example6ComonadFunctor,
    counit: example6Counit,
    comultiplication: example6Comultiplication,
    metadata: ["Example6 reader comonad"],
  };

  return makeMonadComonadInteractionLaw({
    monad,
    comonad,
    law,
    metadata: ["Example6 interaction law"],
  });
};

type Example7MonoidElement = 0 | 1;
type Example7BaseX = "x0" | "x1";
type Example7BaseY = "y0" | "y1";
type Example7Writer = readonly [Example7MonoidElement, Example7BaseX];
type Example7WriterSquared = readonly [Example7MonoidElement, Example7Writer];
type Example7Reader = readonly [Example7MonoidElement, Example7BaseY];
type Example7ReaderSquared = readonly [Example7MonoidElement, Example7Reader];
type Example7Left = Example7Writer | Example7WriterSquared;
type Example7Right = Example7Reader | Example7ReaderSquared;
type Example7InteractionValue =
  | readonly [Example7BaseX, Example7BaseY]
  | readonly [Example7BaseX, Example7Reader]
  | readonly [Example7Writer, Example7BaseY]
  | readonly [Example7Writer, Example7Reader];

const EXAMPLE7_MONOID_VALUES: ReadonlyArray<Example7MonoidElement> = [0, 1];
const EXAMPLE7_BASE_X_VALUES: ReadonlyArray<Example7BaseX> = ["x0", "x1"];
const EXAMPLE7_BASE_Y_VALUES: ReadonlyArray<Example7BaseY> = ["y0", "y1"];

const addExample7 = (
  left: Example7MonoidElement,
  right: Example7MonoidElement,
): Example7MonoidElement => ((left + right) % 2) as Example7MonoidElement;

const actOnY = (
  element: Example7MonoidElement,
  y: Example7BaseY,
): Example7BaseY => {
  if (element === 0) {
    return y;
  }
  return y === "y0" ? "y1" : "y0";
};

const actOnReader = (
  element: Example7MonoidElement,
  reader: Example7Reader,
): Example7Reader => [reader[0], actOnY(element, reader[1])];

const isExample7Writer = (candidate: unknown): candidate is Example7Writer =>
  Array.isArray(candidate) &&
  candidate.length === 2 &&
  (candidate[0] === 0 || candidate[0] === 1) &&
  (candidate[1] === "x0" || candidate[1] === "x1");

const isExample7WriterSquared = (
  candidate: unknown,
): candidate is Example7WriterSquared =>
  Array.isArray(candidate) &&
  candidate.length === 2 &&
  (candidate[0] === 0 || candidate[0] === 1) &&
  isExample7Writer(candidate[1]);

const isExample7Reader = (candidate: unknown): candidate is Example7Reader =>
  Array.isArray(candidate) &&
  candidate.length === 2 &&
  (candidate[0] === 0 || candidate[0] === 1) &&
  (candidate[1] === "y0" || candidate[1] === "y1");

const isExample7ReaderSquared = (
  candidate: unknown,
): candidate is Example7ReaderSquared =>
  Array.isArray(candidate) &&
  candidate.length === 2 &&
  (candidate[0] === 0 || candidate[0] === 1) &&
  isExample7Reader(candidate[1]);

const example7WriterElements: ReadonlyArray<Example7Writer> =
  EXAMPLE7_MONOID_VALUES.flatMap((element) =>
    EXAMPLE7_BASE_X_VALUES.map((x) => [element, x] as const),
  );

const example7WriterSquaredElements: ReadonlyArray<Example7WriterSquared> =
  EXAMPLE7_MONOID_VALUES.flatMap((element) =>
    example7WriterElements.map((writer) => [element, writer] as const),
  );

const example7ReaderElements: ReadonlyArray<Example7Reader> =
  EXAMPLE7_MONOID_VALUES.flatMap((element) =>
    EXAMPLE7_BASE_Y_VALUES.map((y) => [element, y] as const),
  );

const example7ReaderSquaredElements: ReadonlyArray<Example7ReaderSquared> =
  EXAMPLE7_MONOID_VALUES.flatMap((element) =>
    example7ReaderElements.map((reader) => [element, reader] as const),
  );

const evaluateExample7 = (
  left: Example7Left,
  right: Example7Right,
): Example7InteractionValue => {
  if (isExample7WriterSquared(left)) {
    const [outer, inner] = left;
    if (isExample7Reader(right)) {
      return [inner, actOnY(outer, right[1])];
    }
    if (isExample7ReaderSquared(right)) {
      return [inner, actOnReader(outer, right[1])];
    }
  }
  if (isExample7Writer(left)) {
    const [weight, value] = left;
    if (isExample7Reader(right)) {
      return [value, actOnY(weight, right[1])];
    }
    if (isExample7ReaderSquared(right)) {
      return [value, actOnReader(weight, right[1])];
    }
  }
  throw new Error("Example7: unsupported combination of left/right elements.");
};

const example7Values = new Map<string, Example7InteractionValue>();

const registerExample7Value = (value: Example7InteractionValue): void => {
  const key = JSON.stringify(value);
  if (!example7Values.has(key)) {
    example7Values.set(key, value);
  }
};

for (const writer of example7WriterElements) {
  for (const reader of example7ReaderElements) {
    registerExample7Value([writer[1], actOnY(writer[0], reader[1])]);
  }
  for (const reader of example7ReaderSquaredElements) {
    registerExample7Value([writer[1], actOnReader(writer[0], reader[1])]);
  }
}

for (const writer of example7WriterSquaredElements) {
  for (const reader of example7ReaderElements) {
    registerExample7Value([writer[1], actOnY(writer[0], reader[1])]);
  }
  for (const reader of example7ReaderSquaredElements) {
    registerExample7Value([writer[1], actOnReader(writer[0], reader[1])]);
  }
}

const example7BaseXCarrier = SetCat.obj(EXAMPLE7_BASE_X_VALUES, {
  tag: "Example7BaseX",
});

const example7BaseYCarrier = SetCat.obj(EXAMPLE7_BASE_Y_VALUES, {
  tag: "Example7BaseY",
});

const example7WriterCarrier = SetCat.obj(example7WriterElements, {
  tag: "Example7Writer",
});

const example7WriterSquaredCarrier = SetCat.obj(example7WriterSquaredElements, {
  tag: "Example7WriterSquared",
});

const example7ReaderCarrier = SetCat.obj(example7ReaderElements, {
  tag: "Example7Reader",
});

const example7ReaderSquaredCarrier = SetCat.obj(example7ReaderSquaredElements, {
  tag: "Example7ReaderSquared",
});

const example7ValueCarrier = SetCat.obj(Array.from(example7Values.values()), {
  tag: "Example7Value",
});

const example7Kernel = makeTwoObjectPromonoidalKernel();

const example7LeftFunctor = constructContravariantFunctorWithWitness(
  TwoObjectCategory,
  setSimpleCategory,
  {
    F0: () => example7WriterCarrier,
    F1: () => SetCat.id(example7WriterCarrier),
  },
  { objects: TwoObjectCategory.objects, arrows: TwoObjectCategory.arrows },
);

const example7RightFunctor = constructFunctorWithWitness(
  TwoObjectCategory,
  setSimpleCategory,
  {
    F0: () => example7ReaderCarrier,
    F1: () => SetCat.id(example7ReaderCarrier),
  },
  { objects: TwoObjectCategory.objects, arrows: TwoObjectCategory.arrows },
);

const example7MonadFunctor = constructFunctorWithWitness(
  TwoObjectCategory,
  setSimpleCategory,
  {
    F0: () => example7WriterCarrier,
    F1: () => SetCat.id(example7WriterCarrier),
  },
  { objects: TwoObjectCategory.objects, arrows: TwoObjectCategory.arrows },
);

const example7ComonadFunctor = constructFunctorWithWitness(
  TwoObjectCategory,
  setSimpleCategory,
  {
    F0: () => example7ReaderCarrier,
    F1: () => SetCat.id(example7ReaderCarrier),
  },
  { objects: TwoObjectCategory.objects, arrows: TwoObjectCategory.arrows },
);

const example7Unit = constructNaturalTransformationWithWitness(
  example7MonadFunctor,
  example7MonadFunctor,
  {
    component: () =>
      SetCat.hom(example7BaseXCarrier, example7WriterCarrier, (value) => [0, value]),
  },
  { metadata: ["Example7 unit"], samples: { objects: TwoObjectCategory.objects } },
);

const example7Multiplication = constructNaturalTransformationWithWitness(
  example7MonadFunctor,
  example7MonadFunctor,
  {
    component: () =>
      SetCat.hom(example7WriterSquaredCarrier, example7WriterCarrier, (value) => [
        addExample7(value[0], value[1][0]),
        value[1][1],
      ]),
  },
  { metadata: ["Example7 multiplication"], samples: { objects: TwoObjectCategory.objects } },
);

const example7Counit = constructNaturalTransformationWithWitness(
  example7ComonadFunctor,
  example7ComonadFunctor,
  {
    component: () =>
      SetCat.hom(example7ReaderCarrier, example7BaseYCarrier, (value) => value[1]),
  },
  { metadata: ["Example7 counit"], samples: { objects: TwoObjectCategory.objects } },
);

const example7Comultiplication = constructNaturalTransformationWithWitness(
  example7ComonadFunctor,
  example7ComonadFunctor,
  {
    component: () =>
      SetCat.hom(example7ReaderCarrier, example7ReaderSquaredCarrier, (value) => [
        value[0],
        value,
      ]),
  },
  {
    metadata: ["Example7 comultiplication"],
    samples: { objects: TwoObjectCategory.objects },
  },
);

const example7Convolution = dayTensor(
  example7Kernel,
  example7LeftFunctor.functor,
  example7RightFunctor.functor,
);

const example7Operations = makeFunctorInteractionLawOperations<TwoObject, TwoArrow>({
  metadata: ["Example7 operations"],
  monadOperations: [
    makeCommutativeBinaryMonadOperation<TwoObject, TwoArrow>({
      label: "example7-multiply",
      transformation: example7Multiplication,
      component: (object) => TwoObjectCategory.id(object),
      metadata: ["Example7 associative binary operation"],
      commutativeMetadata: ["Example7 degeneracy"],
    }),
  ],
});

export const makeExample7MonadComonadInteractionLaw = () => {
  const law = makeFunctorInteractionLaw<TwoObject, TwoArrow, Example7Left, Example7Right, Example7InteractionValue>({
    kernel: example7Kernel,
    left: example7LeftFunctor.functor,
    right: example7RightFunctor.functor,
    convolution: example7Convolution,
    dualizing: example7ValueCarrier,
    pairing: (_object, carrier) =>
      SetCat.hom(carrier, example7ValueCarrier, (cls) =>
        evaluateExample7(
          cls.witness.leftElement as Example7Left,
          cls.witness.rightElement as Example7Right,
        )),
    aggregate: (contributions) => {
      const first = contributions[0];
      if (!first) {
        throw new Error("Example7: missing Day contributions.");
      }
      return evaluateExample7(
        first.left.element as Example7Left,
        first.right.element as Example7Right,
      );
    },
    tags: { primal: "Example7Primal", dual: "Example7Dual" },
    metadata: ["Example7 interaction law"],
    operations: example7Operations,
  });

  const monad: MonadStructure<TwoObject, TwoArrow> = {
    functor: example7MonadFunctor,
    unit: example7Unit,
    multiplication: example7Multiplication,
    metadata: ["Example7 writer monad"],
  };

  const comonad: ComonadStructure<TwoObject, TwoArrow> = {
    functor: example7ComonadFunctor,
    counit: example7Counit,
    comultiplication: example7Comultiplication,
    metadata: ["Example7 writer comonad"],
  };

  return makeMonadComonadInteractionLaw({
    monad,
    comonad,
    law,
    metadata: ["Example7 interaction law"],
  });
};

type Example8State = "a0" | "a1";
type Example8Action = 0 | 1;
type Example8BaseX = "x0" | "x1";
type Example8BaseY = "y0" | "y1";

type Example8UpdateArrow = readonly [Example8State, Example8Action, Example8BaseX];
type Example8UpdateFunction = readonly [Example8UpdateArrow, Example8UpdateArrow];
type Example8UpdateArrowSquared = readonly [
  Example8State,
  Example8Action,
  Example8UpdateFunction,
];
type Example8UpdateFunctionSquared = readonly [
  Example8UpdateArrowSquared,
  Example8UpdateArrowSquared,
];

type Example8Reader = readonly [Example8State, Example8BaseY];
type Example8ReaderSquared = readonly [Example8State, Example8Reader];

type Example8Left = Example8UpdateFunction | Example8UpdateFunctionSquared;
type Example8Right = Example8Reader | Example8ReaderSquared;
type Example8InteractionValue =
  | readonly [Example8BaseX, Example8BaseY]
  | readonly [Example8BaseX, Example8Reader]
  | readonly [Example8UpdateFunction, Example8BaseY]
  | readonly [Example8UpdateFunction, Example8Reader];

const EXAMPLE8_STATES: ReadonlyArray<Example8State> = ["a0", "a1"];
const EXAMPLE8_ACTIONS: ReadonlyArray<Example8Action> = [0, 1];
const EXAMPLE8_BASE_X_VALUES: ReadonlyArray<Example8BaseX> = ["x0", "x1"];
const EXAMPLE8_BASE_Y_VALUES: ReadonlyArray<Example8BaseY> = ["y0", "y1"];

const combineExample8Actions = (
  first: Example8Action,
  second: Example8Action,
): Example8Action => ((first + second) % 2) as Example8Action;

const actOnState = (action: Example8Action, state: Example8State): Example8State => {
  if (action === 0) {
    return state;
  }
  return state === "a0" ? "a1" : "a0";
};

const actOnExample8Y = (action: Example8Action, value: Example8BaseY): Example8BaseY => {
  if (action === 0) {
    return value;
  }
  return value === "y0" ? "y1" : "y0";
};

const actOnExample8Reader = (
  action: Example8Action,
  reader: Example8Reader,
): Example8Reader => [actOnState(action, reader[0]), actOnExample8Y(action, reader[1])];

const buildExample8UpdateFunction = (
  first: Example8UpdateArrow,
  second: Example8UpdateArrow,
): Example8UpdateFunction => [first, second];

const example8UpdateFunctionElements: ReadonlyArray<Example8UpdateFunction> =
  EXAMPLE8_ACTIONS.flatMap((actionFirst) =>
    EXAMPLE8_BASE_X_VALUES.flatMap((valueFirst) =>
      EXAMPLE8_ACTIONS.flatMap((actionSecond) =>
        EXAMPLE8_BASE_X_VALUES.map((valueSecond) =>
          buildExample8UpdateFunction(
            ["a0", actionFirst, valueFirst],
            ["a1", actionSecond, valueSecond],
          ),
        ),
      ),
    ),
  );

const example8UpdateFunctionSquaredElements: ReadonlyArray<Example8UpdateFunctionSquared> =
  EXAMPLE8_ACTIONS.flatMap((actionFirst) =>
    example8UpdateFunctionElements.flatMap((functionFirst) =>
      EXAMPLE8_ACTIONS.flatMap((actionSecond) =>
        example8UpdateFunctionElements.map((functionSecond) => [
          ["a0", actionFirst, functionFirst],
          ["a1", actionSecond, functionSecond],
        ] as Example8UpdateFunctionSquared),
      ),
    ),
  );

const example8ReaderElements: ReadonlyArray<Example8Reader> =
  EXAMPLE8_STATES.flatMap((state) =>
    EXAMPLE8_BASE_Y_VALUES.map((value) => [state, value] as const),
  );

const example8ReaderSquaredElements: ReadonlyArray<Example8ReaderSquared> =
  EXAMPLE8_STATES.flatMap((state) =>
    example8ReaderElements.map((reader) => [state, reader] as const),
  );

const isExample8UpdateFunction = (
  candidate: unknown,
): candidate is Example8UpdateFunction =>
  Array.isArray(candidate) &&
  candidate.length === 2 &&
  candidate.every(
    (entry) =>
      Array.isArray(entry) &&
      entry.length === 3 &&
      EXAMPLE8_STATES.includes(entry[0] as Example8State) &&
      EXAMPLE8_ACTIONS.includes(entry[1] as Example8Action) &&
      EXAMPLE8_BASE_X_VALUES.includes(entry[2] as Example8BaseX),
  );

const isExample8UpdateFunctionSquared = (
  candidate: unknown,
): candidate is Example8UpdateFunctionSquared =>
  Array.isArray(candidate) &&
  candidate.length === 2 &&
  candidate.every(
    (entry) =>
      Array.isArray(entry) &&
      entry.length === 3 &&
      EXAMPLE8_STATES.includes(entry[0] as Example8State) &&
      EXAMPLE8_ACTIONS.includes(entry[1] as Example8Action) &&
      isExample8UpdateFunction(entry[2]),
  );

const isExample8Reader = (candidate: unknown): candidate is Example8Reader =>
  Array.isArray(candidate) &&
  candidate.length === 2 &&
  EXAMPLE8_STATES.includes(candidate[0] as Example8State) &&
  EXAMPLE8_BASE_Y_VALUES.includes(candidate[1] as Example8BaseY);

const isExample8ReaderSquared = (
  candidate: unknown,
): candidate is Example8ReaderSquared =>
  Array.isArray(candidate) &&
  candidate.length === 2 &&
  EXAMPLE8_STATES.includes(candidate[0] as Example8State) &&
  isExample8Reader(candidate[1]);

const applyExample8Function = (
  fn: Example8UpdateFunction,
  state: Example8State,
): readonly [Example8Action, Example8BaseX] => {
  for (const entry of fn) {
    if (entry[0] === state) {
      return [entry[1], entry[2]];
    }
  }
  throw new Error("Example8: missing state in update function.");
};

const applyExample8FunctionSquared = (
  fn: Example8UpdateFunctionSquared,
  state: Example8State,
): readonly [Example8Action, Example8UpdateFunction] => {
  for (const entry of fn) {
    if (entry[0] === state) {
      return [entry[1], entry[2]];
    }
  }
  throw new Error("Example8: missing state in squared update function.");
};

const makeConstantExample8UpdateFunction = (
  value: Example8BaseX,
): Example8UpdateFunction =>
  buildExample8UpdateFunction(["a0", 0, value], ["a1", 0, value]);

const flattenExample8UpdateFunction = (
  value: Example8UpdateFunctionSquared,
): Example8UpdateFunction =>
  buildExample8UpdateFunction(
    (() => {
      const [outerAction, inner] = applyExample8FunctionSquared(value, "a0");
      const nextState = actOnState(outerAction, "a0");
      const [innerAction, result] = applyExample8Function(inner, nextState);
      return ["a0", combineExample8Actions(outerAction, innerAction), result];
    })(),
    (() => {
      const [outerAction, inner] = applyExample8FunctionSquared(value, "a1");
      const nextState = actOnState(outerAction, "a1");
      const [innerAction, result] = applyExample8Function(inner, nextState);
      return ["a1", combineExample8Actions(outerAction, innerAction), result];
    })(),
  );

const evaluateExample8 = (
  left: Example8Left,
  right: Example8Right,
): Example8InteractionValue => {
  const state = right[0];
  if (isExample8UpdateFunctionSquared(left)) {
    const [action, inner] = applyExample8FunctionSquared(left, state);
    if (isExample8Reader(right)) {
      return [inner, actOnExample8Y(action, right[1])];
    }
    if (isExample8ReaderSquared(right)) {
      return [inner, actOnExample8Reader(action, right[1])];
    }
  }
  if (isExample8UpdateFunction(left)) {
    const [action, value] = applyExample8Function(left, state);
    if (isExample8Reader(right)) {
      return [value, actOnExample8Y(action, right[1])];
    }
    if (isExample8ReaderSquared(right)) {
      return [value, actOnExample8Reader(action, right[1])];
    }
  }
  throw new Error("Example8: unsupported combination of left/right elements.");
};

const example8Values = new Map<string, Example8InteractionValue>();

const registerExample8Value = (value: Example8InteractionValue): void => {
  const key = JSON.stringify(value);
  if (!example8Values.has(key)) {
    example8Values.set(key, value);
  }
};

for (const fn of example8UpdateFunctionElements) {
  for (const reader of example8ReaderElements) {
    const [action, result] = applyExample8Function(fn, reader[0]);
    registerExample8Value([result, actOnExample8Y(action, reader[1])]);
  }
  for (const readerSquared of example8ReaderSquaredElements) {
    const [action, result] = applyExample8Function(fn, readerSquared[0]);
    registerExample8Value([result, actOnExample8Reader(action, readerSquared[1])]);
  }
}

for (const fn of example8UpdateFunctionSquaredElements) {
  for (const reader of example8ReaderElements) {
    const [action, inner] = applyExample8FunctionSquared(fn, reader[0]);
    registerExample8Value([inner, actOnExample8Y(action, reader[1])]);
  }
  for (const readerSquared of example8ReaderSquaredElements) {
    const [action, inner] = applyExample8FunctionSquared(fn, readerSquared[0]);
    registerExample8Value([inner, actOnExample8Reader(action, readerSquared[1])]);
  }
}

const example8BaseXCarrier = SetCat.obj(EXAMPLE8_BASE_X_VALUES, {
  tag: "Example8BaseX",
});

const example8BaseYCarrier = SetCat.obj(EXAMPLE8_BASE_Y_VALUES, {
  tag: "Example8BaseY",
});

const example8UpdateFunctionCarrier = SetCat.obj(example8UpdateFunctionElements, {
  tag: "Example8UpdateFunction",
});

const example8UpdateFunctionSquaredCarrier = SetCat.obj(
  example8UpdateFunctionSquaredElements,
  { tag: "Example8UpdateFunctionSquared" },
);

const example8ReaderCarrier = SetCat.obj(example8ReaderElements, {
  tag: "Example8Reader",
});

const example8ReaderSquaredCarrier = SetCat.obj(example8ReaderSquaredElements, {
  tag: "Example8ReaderSquared",
});

const example8ValueCarrier = SetCat.obj(Array.from(example8Values.values()), {
  tag: "Example8Value",
});

const example8Kernel = makeTwoObjectPromonoidalKernel();

const example8LeftFunctor = constructContravariantFunctorWithWitness(
  TwoObjectCategory,
  setSimpleCategory,
  {
    F0: () => example8UpdateFunctionCarrier,
    F1: () => SetCat.id(example8UpdateFunctionCarrier),
  },
  { objects: TwoObjectCategory.objects, arrows: TwoObjectCategory.arrows },
);

const example8RightFunctor = constructFunctorWithWitness(
  TwoObjectCategory,
  setSimpleCategory,
  {
    F0: () => example8ReaderCarrier,
    F1: () => SetCat.id(example8ReaderCarrier),
  },
  { objects: TwoObjectCategory.objects, arrows: TwoObjectCategory.arrows },
);

const example8MonadFunctor = constructFunctorWithWitness(
  TwoObjectCategory,
  setSimpleCategory,
  {
    F0: () => example8UpdateFunctionCarrier,
    F1: () => SetCat.id(example8UpdateFunctionCarrier),
  },
  { objects: TwoObjectCategory.objects, arrows: TwoObjectCategory.arrows },
);

const example8ComonadFunctor = constructFunctorWithWitness(
  TwoObjectCategory,
  setSimpleCategory,
  {
    F0: () => example8ReaderCarrier,
    F1: () => SetCat.id(example8ReaderCarrier),
  },
  { objects: TwoObjectCategory.objects, arrows: TwoObjectCategory.arrows },
);

const example8Unit = constructNaturalTransformationWithWitness(
  example8MonadFunctor,
  example8MonadFunctor,
  {
    component: () =>
      SetCat.hom(example8BaseXCarrier, example8UpdateFunctionCarrier, (value) =>
        makeConstantExample8UpdateFunction(value),
      ),
  },
  { metadata: ["Example8 unit"], samples: { objects: TwoObjectCategory.objects } },
);

const example8Multiplication = constructNaturalTransformationWithWitness(
  example8MonadFunctor,
  example8MonadFunctor,
  {
    component: () =>
      SetCat.hom(
        example8UpdateFunctionSquaredCarrier,
        example8UpdateFunctionCarrier,
        (value) => flattenExample8UpdateFunction(value),
      ),
  },
  { metadata: ["Example8 multiplication"], samples: { objects: TwoObjectCategory.objects } },
);

const example8Counit = constructNaturalTransformationWithWitness(
  example8ComonadFunctor,
  example8ComonadFunctor,
  {
    component: () =>
      SetCat.hom(example8ReaderCarrier, example8BaseYCarrier, (value) => value[1]),
  },
  { metadata: ["Example8 counit"], samples: { objects: TwoObjectCategory.objects } },
);

const example8Comultiplication = constructNaturalTransformationWithWitness(
  example8ComonadFunctor,
  example8ComonadFunctor,
  {
    component: () =>
      SetCat.hom(example8ReaderCarrier, example8ReaderSquaredCarrier, (value) => [
        value[0],
        value,
      ]),
  },
  { metadata: ["Example8 comultiplication"], samples: { objects: TwoObjectCategory.objects } },
);

const example8Convolution = dayTensor(
  example8Kernel,
  example8LeftFunctor.functor,
  example8RightFunctor.functor,
);

export const makeExample8MonadComonadInteractionLaw = () => {
  const law = makeFunctorInteractionLaw<TwoObject, TwoArrow, Example8Left, Example8Right, Example8InteractionValue>({
    kernel: example8Kernel,
    left: example8LeftFunctor.functor,
    right: example8RightFunctor.functor,
    convolution: example8Convolution,
    dualizing: example8ValueCarrier,
    pairing: (_object, carrier) =>
      SetCat.hom(carrier, example8ValueCarrier, (cls) =>
        evaluateExample8(
          cls.witness.leftElement as Example8Left,
          cls.witness.rightElement as Example8Right,
        )),
    aggregate: (contributions) => {
      const first = contributions[0];
      if (!first) {
        throw new Error("Example8: missing Day contributions.");
      }
      return evaluateExample8(
        first.left.element as Example8Left,
        first.right.element as Example8Right,
      );
    },
    tags: { primal: "Example8Primal", dual: "Example8Dual" },
    metadata: ["Example8 interaction law"],
  });

  const monad: MonadStructure<TwoObject, TwoArrow> = {
    functor: example8MonadFunctor,
    unit: example8Unit,
    multiplication: example8Multiplication,
    metadata: ["Example8 update monad"],
  };

  const comonad: ComonadStructure<TwoObject, TwoArrow> = {
    functor: example8ComonadFunctor,
    counit: example8Counit,
    comultiplication: example8Comultiplication,
    metadata: ["Example8 update comonad"],
  };

  return makeMonadComonadInteractionLaw({
    monad,
    comonad,
    law,
    metadata: ["Example8 interaction law"],
  });
};

const normalizeLabel = (label: string): string => {
  const index = label.indexOf("(");
  return index === -1 ? label : label.slice(0, index);
};

const mergeMetadataUnique = (
  ...sources: ReadonlyArray<ReadonlyArray<string> | undefined>
): ReadonlyArray<string> => {
  const aggregate = new Set<string>();
  for (const source of sources) {
    if (!source) continue;
    for (const value of source) {
      aggregate.add(value);
    }
  }
  return Array.from(aggregate);
};

export interface AssociativeBinaryDegeneracyInjections<Right> {
  readonly coproduct: CoproductData<Right, Right>;
  readonly iota: SetHom<Right, Coproduct<Right, Right>>;
  readonly kappa: SetHom<Right, Coproduct<Right, Right>>;
}

export interface AssociativeBinaryDegeneracyObjectWitness<
  Obj,
  Arr,
  Left,
  Right,
  Value,
> {
  readonly object: Obj;
  readonly operationLabel: string;
  readonly metadata: ReadonlyArray<string>;
  readonly injections?: AssociativeBinaryDegeneracyInjections<SetObj<Right>>;
  readonly theta?: SetHom<
    readonly [IndexedElement<Obj, Left>, IndexedElement<Obj, Right>],
    Value
  >;
  readonly delta?: SetHom<Right, unknown>;
  readonly mu?: SetHom<Left, unknown>;
  readonly h?: SetHom<Right, SetTerminalObject>;
  readonly deltaPrime?: SetHom<
    Right,
    Coproduct<SetTerminalObject, SetTerminalObject>
  >;
  readonly kPrime?: SetHom<Right, Coproduct<never, never>>;
  readonly k?: SetHom<Right, never>;
  readonly details: ReadonlyArray<string>;
  readonly gaps: ReadonlyArray<string>;
}

export interface AssociativeBinaryDegeneracyReport<Obj, Arr, Left, Right, Value> {
  readonly holds: boolean;
  readonly witnesses: ReadonlyArray<
    AssociativeBinaryDegeneracyObjectWitness<Obj, Arr, Left, Right, Value>
  >;
  readonly details: ReadonlyArray<string>;
  readonly metadata: ReadonlyArray<string>;
}

export interface AssociativeBinaryDegeneracyOptions {
  readonly operationLabel?: string;
}

export const checkAssociativeBinaryDegeneracy = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
>(
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: AssociativeBinaryDegeneracyOptions = {},
): AssociativeBinaryDegeneracyReport<Obj, Arr, Left, Right, Value> => {
  const degeneracy = interaction.degeneracy.commutativeBinary;
  const witnessesByLabel = new Map(
    degeneracy.witnesses.map((entry) => [entry.label, entry]),
  );

  const traces = degeneracy.traces.filter((trace) => {
    if (!options.operationLabel) {
      return true;
    }
    return normalizeLabel(trace.label) === options.operationLabel;
  });

  const witnesses: Array<
    AssociativeBinaryDegeneracyObjectWitness<Obj, Arr, Left, Right, Value>
  > = [];
  const metadataAggregate = new Set<string>();

  for (const trace of traces) {
    const baseLabel = normalizeLabel(trace.label);
    const operationWitness = witnessesByLabel.get(baseLabel);
    const psiFiber = interaction.psiComponents.get(trace.object);
    const rightCarrier = interaction.law.right.functor.F0(trace.object);
    const coproduct = SetCat.coproduct(rightCarrier, rightCarrier);

    const comultiplication =
      interaction.comonad.comultiplication.transformation.component(
        trace.object,
      ) as SetHom<Right, unknown> | undefined;
    const multiplication =
      interaction.monad.multiplication.transformation.component(trace.object) as
        | SetHom<Left, unknown>
        | undefined;

    const gaps: string[] = [];
    const detailEntries: string[] = [];

    if (!operationWitness) {
      gaps.push(`No operation witness recorded for label ${baseLabel}.`);
    }

    if (!psiFiber) {
      gaps.push(
        `Missing ? fiber for object ${String(
          trace.object,
        )}; unable to log ?_{X,Y}.`,
      );
    } else {
      detailEntries.push(
        `Recovered ?_{X,Y} from the ? fiber on object ${String(trace.object)}.`,
      );
    }

    if (!comultiplication) {
      gaps.push(
        `Comultiplication component unavailable for object ${String(trace.object)}.`,
      );
    } else {
      detailEntries.push(
        `Logged ?_{X,Y} using the comultiplication component on ${String(trace.object)}.`,
      );
    }

    if (!multiplication) {
      gaps.push(
        `Monad multiplication component unavailable for object ${String(trace.object)}.`,
      );
    } else {
      detailEntries.push(
        `Recorded ?_X contributing to the associative comparison on ${String(trace.object)}.`,
      );
    }

    if (!trace.artifacts.toTerminal) {
      gaps.push(`Unable to reconstruct h_Y for object ${String(trace.object)}.`);
    } else {
      detailEntries.push(
        `Captured h_Y : GY ? 1 using the degeneracy artifacts for ${String(trace.object)}.`,
      );
    }

    if (!trace.artifacts.terminalDiagonal) {
      gaps.push(
        `Unable to build ?'_Y : GY ? 1 + 1 for object ${String(trace.object)}.`,
      );
    } else {
      detailEntries.push(
        `Constructed ?'_Y via the canonical injection into 1 + 1 for ${String(trace.object)}.`,
      );
    }

    if (!trace.artifacts.kPrime) {
      gaps.push(
        `Missing k'_Y factorisation through 0 + 0 for object ${String(trace.object)}.`,
      );
    } else {
      detailEntries.push(
        `Recorded k'_Y witnessing the zero-object factorisation on ${String(trace.object)}.`,
      );
    }

    if (!trace.artifacts.zeroComparison?.toZero) {
      gaps.push(
        `Zero comparison map k_Y : GY ? 0 absent for object ${String(trace.object)}.`,
      );
    } else {
      detailEntries.push(
        `Logged the final collapse map k_Y into the initial object for ${String(trace.object)}.`,
      );
    }

    if (trace.artifacts.duplicationGap) gaps.push(trace.artifacts.duplicationGap);
    if (trace.artifacts.substitutionGap) gaps.push(trace.artifacts.substitutionGap);
    if (trace.artifacts.transformationGap)
      gaps.push(trace.artifacts.transformationGap);
    if (trace.artifacts.toTerminalGap) gaps.push(trace.artifacts.toTerminalGap);
    if (trace.artifacts.terminalDiagonalGap)
      gaps.push(trace.artifacts.terminalDiagonalGap);
    if (trace.artifacts.kPrimeGap) gaps.push(trace.artifacts.kPrimeGap);
    if (trace.artifacts.zeroComparisonGap)
      gaps.push(trace.artifacts.zeroComparisonGap);

    const injections: AssociativeBinaryDegeneracyInjections<SetObj<Right>> = {
      coproduct,
      iota: coproduct.injections.inl,
      kappa: coproduct.injections.inr,
    };

    detailEntries.push(
      `Formed the distributivity coproduct Y + Y with injections ?_Y and ?_Y for ${String(
        trace.object,
      )}.`,
    );

    const combinedMetadata = mergeMetadataUnique(
      operationWitness?.operationMetadata,
      trace.artifacts.operationMetadata,
      interaction.monad.metadata,
      interaction.comonad.metadata,
    );

    combinedMetadata.forEach((entry) => metadataAggregate.add(entry));

    witnesses.push({
      object: trace.object,
      operationLabel: baseLabel,
      metadata: combinedMetadata,
      injections,
      theta: psiFiber?.phi,
      delta: comultiplication,
      mu: multiplication,
      h: trace.artifacts.toTerminal,
      deltaPrime: trace.artifacts.terminalDiagonal,
      kPrime: trace.artifacts.kPrime,
      k: trace.artifacts.zeroComparison?.toZero,
      details: detailEntries,
      gaps,
    });
  }

  const details: string[] = [];
  if (degeneracy.details) {
    details.push(degeneracy.details);
  }
  if (witnesses.length > 0) {
    details.push(
      "Replayed Theorem 3 associative binary degeneracy witnesses, logging coproduct injections and zero-factorisation maps.",
    );
  }

  return {
    holds: degeneracy.holds,
    witnesses,
    details,
    metadata: Array.from(metadataAggregate),
  };
};

export interface StretchMonadComonadInteractionLawInput<
  Obj,
  Arr,
  Left,
  Right,
  Value,
  LeftPrime,
  RightPrime,
  LawObj = Obj,
  LawArr = Arr,
> {
  readonly base: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, LawObj, LawArr>;
  readonly monad: MonadStructure<Obj, Arr>;
  readonly comonad: ComonadStructure<Obj, Arr>;
  readonly stretch: StretchInteractionLawOptions<
    Obj,
    Arr,
    LeftPrime,
    RightPrime,
    Left,
    Right,
    Value
  >;
  readonly metadata?: ReadonlyArray<string>;
  readonly packageOptions?: MonadComonadInteractionLawOptions<
    Obj,
    Arr,
    LeftPrime,
    RightPrime,
    Value,
    LawObj,
    LawArr
  >;
}

export interface StretchMonadComonadInteractionLawResult<
  Obj,
  Arr,
  Left,
  Right,
  Value,
  LawObj,
  LawArr,
> {
  readonly interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, LawObj, LawArr>;
  readonly stretchedLaw: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>;
  readonly diagnostics: ReadonlyArray<string>;
}

export const stretchMonadComonadInteractionLaw = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
  LeftPrime,
  RightPrime,
  LawObj,
  LawArr,
>(
  input: StretchMonadComonadInteractionLawInput<
    Obj,
    Arr,
    Left,
    Right,
    Value,
    LeftPrime,
    RightPrime,
    LawObj,
    LawArr
  >,
): StretchMonadComonadInteractionLawResult<Obj, Arr, LeftPrime, RightPrime, Value, LawObj, LawArr> => {
  const stretchedLaw = stretchInteractionLaw(input.base.law, {
    ...input.stretch,
    operations: input.stretch.operations ?? input.base.law.operations,
  });

  const metadata = mergeMetadataList(
    mergeMetadataList(input.base.metadata, input.metadata),
    ["StretchMonadComonadInteractionLaw"],
  );

  const packaged = makeMonadComonadInteractionLaw({
    monad: input.monad,
    comonad: input.comonad,
    law: stretchedLaw,
    metadata,
    ...(input.packageOptions ? { options: input.packageOptions } : {}),
  });

  const diagnostics = [
    "stretchMonadComonadInteractionLaw: derived stretched functor interaction law via supplied mappings.",
    ...packaged.diagnostics,
  ];

  return { interaction: packaged, stretchedLaw, diagnostics };
};

export interface TensorMonadComonadInteractionLawInput<
  Obj,
  Arr,
  Left0,
  Right0,
  Value0,
  Left1,
  Right1,
  Value1,
  LawObj = Obj,
  LawArr = Arr,
> {
  readonly left: MonadComonadInteractionLaw<Obj, Arr, Left0, Right0, Value0, LawObj, LawArr>;
  readonly right: MonadComonadInteractionLaw<Obj, Arr, Left1, Right1, Value1, LawObj, LawArr>;
  readonly monad: MonadStructure<Obj, Arr>;
  readonly comonad: ComonadStructure<Obj, Arr>;
  readonly metadata?: ReadonlyArray<string>;
  readonly packageOptions?: MonadComonadInteractionLawOptions<
    Obj,
    Arr,
    readonly [Left0, Left1],
    readonly [Right0, Right1],
    readonly [Value0, Value1],
    LawObj,
    LawArr
  >;
}

export interface TensorMonadComonadInteractionLawResult<
  Obj,
  Arr,
  Left0,
  Right0,
  Value0,
  Left1,
  Right1,
  Value1,
  LawObj,
  LawArr,
> {
  readonly interaction: MonadComonadInteractionLaw<
    Obj,
    Arr,
    readonly [Left0, Left1],
    readonly [Right0, Right1],
    readonly [Value0, Value1],
    LawObj,
    LawArr
  >;
  readonly projections: InteractionLawProductProjections<
    Obj,
    Left0,
    Left1,
    Right0,
    Right1,
    Value0,
    Value1
  >;
  readonly diagnostics: ReadonlyArray<string>;
}

export const tensorMonadComonadInteractionLaws = <
  Obj,
  Arr,
  Left0,
  Right0,
  Value0,
  Left1,
  Right1,
  Value1,
  LawObj,
  LawArr,
>(
  input: TensorMonadComonadInteractionLawInput<
    Obj,
    Arr,
    Left0,
    Right0,
    Value0,
    Left1,
    Right1,
    Value1,
    LawObj,
    LawArr
  >,
): TensorMonadComonadInteractionLawResult<
  Obj,
  Arr,
  Left0,
  Right0,
  Value0,
  Left1,
  Right1,
  Value1,
  LawObj,
  LawArr
> => {
  const product = productInteractionLaw(input.left.law, input.right.law);

  const metadata = mergeMetadataList(
    mergeMetadataList(input.left.metadata, input.right.metadata),
    mergeMetadataList(input.metadata, ["TensorMonadComonadInteractionLaws"]),
  );

  const packaged = makeMonadComonadInteractionLaw({
    monad: input.monad,
    comonad: input.comonad,
    law: product.law,
    metadata,
    ...(input.packageOptions ? { options: input.packageOptions } : {}),
  });

  const diagnostics = [
    "tensorMonadComonadInteractionLaws: combined interaction laws via Day product of functor pairings.",
    ...packaged.diagnostics,
  ];

  return {
    interaction: packaged,
    projections: product.projections,
    diagnostics,
  };
};

export interface ComposeMonadComonadInteractionLawsInput<
  Obj,
  Arr,
  Left0,
  Right0,
  Value0,
  Left1,
  Right1,
  Value1,
  LeftComposite,
  RightComposite,
  ValueComposite,
  LawObj = Obj,
  LawArr = Arr,
> {
  readonly inner: MonadComonadInteractionLaw<Obj, Arr, Left0, Right0, Value0, LawObj, LawArr>;
  readonly outer: MonadComonadInteractionLaw<Obj, Arr, Left1, Right1, Value1, LawObj, LawArr>;
  readonly monad: MonadStructure<Obj, Arr>;
  readonly comonad: ComonadStructure<Obj, Arr>;
  readonly law: FunctorInteractionLaw<Obj, Arr, LeftComposite, RightComposite, ValueComposite>;
  readonly metadata?: ReadonlyArray<string>;
  readonly compatibilityDiagnostics?: ReadonlyArray<string>;
  readonly packageOptions?: MonadComonadInteractionLawOptions<
    Obj,
    Arr,
    LeftComposite,
    RightComposite,
    ValueComposite,
    LawObj,
    LawArr
  >;
}

export interface ComposeMonadComonadInteractionLawsResult<
  Obj,
  Arr,
  Left,
  Right,
  Value,
  LawObj,
  LawArr,
> {
  readonly interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, LawObj, LawArr>;
  readonly diagnostics: ReadonlyArray<string>;
}

export const composeMonadComonadInteractionLaws = <
  Obj,
  Arr,
  Left0,
  Right0,
  Value0,
  Left1,
  Right1,
  Value1,
  LeftComposite,
  RightComposite,
  ValueComposite,
  LawObj,
  LawArr,
>(
  input: ComposeMonadComonadInteractionLawsInput<
    Obj,
    Arr,
    Left0,
    Right0,
    Value0,
    Left1,
    Right1,
    Value1,
    LeftComposite,
    RightComposite,
    ValueComposite,
    LawObj,
    LawArr
  >,
): ComposeMonadComonadInteractionLawsResult<Obj, Arr, LeftComposite, RightComposite, ValueComposite, LawObj, LawArr> => {
  const metadata = mergeMetadataList(
    mergeMetadataList(input.inner.metadata, input.outer.metadata),
    mergeMetadataList(input.metadata, ["ComposeMonadComonadInteractionLaws"]),
  );

  const packaged = makeMonadComonadInteractionLaw({
    monad: input.monad,
    comonad: input.comonad,
    law: input.law,
    metadata,
    ...(input.packageOptions ? { options: input.packageOptions } : {}),
  });

  const diagnostics = [
    "composeMonadComonadInteractionLaws: packaged composite interaction law using supplied data.",
    ...(input.compatibilityDiagnostics ?? []),
    ...packaged.diagnostics,
  ];

  return { interaction: packaged, diagnostics };
};

export interface FreeMonadComonadCoproductInclusion<Obj> {
  readonly fiber: Obj;
  readonly label: string;
  readonly metadata?: ReadonlyArray<string>;
}

export interface FreeMonadComonadCoproductWitness<Obj> {
  readonly fiber: Obj;
  readonly summands: ReadonlyArray<FreeMonadComonadCoproductInclusion<Obj>>;
  readonly metadata?: ReadonlyArray<string>;
}

export interface FreeMonadComonadUniversalComparison<Payload> {
  readonly label: string;
  readonly payload: Payload;
  readonly metadata?: ReadonlyArray<string>;
}

export interface FreeMonadComonadUniversalComparisons<InitialPayload, FinalPayload> {
  readonly initial: ReadonlyArray<FreeMonadComonadUniversalComparison<InitialPayload>>;
  readonly final: ReadonlyArray<FreeMonadComonadUniversalComparison<FinalPayload>>;
  readonly metadata?: ReadonlyArray<string>;
}

export interface FreeMonadComonadInteractionLawInput<
  Obj,
  Arr,
  Left,
  Right,
  Value,
  LawObj = Obj,
  LawArr = Arr,
  InitialComparison = unknown,
  FinalComparison = unknown,
> {
  readonly base?: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, LawObj, LawArr>;
  readonly freeMonad: MonadStructure<Obj, Arr>;
  readonly cofreeComonad: ComonadStructure<Obj, Arr>;
  readonly law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>;
  readonly coproductWitnesses: ReadonlyArray<FreeMonadComonadCoproductWitness<LawObj>>;
  readonly universalComparisons?: FreeMonadComonadUniversalComparisons<
    InitialComparison,
    FinalComparison
  >;
  readonly metadata?: ReadonlyArray<string>;
  readonly options?: MonadComonadInteractionLawOptions<
    Obj,
    Arr,
    Left,
    Right,
    Value,
    LawObj,
    LawArr
  >;
}

export interface FreeMonadComonadInteractionLawResult<
  Obj,
  Arr,
  Left,
  Right,
  Value,
  LawObj,
  LawArr,
  InitialComparison,
  FinalComparison,
> {
  readonly interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, LawObj, LawArr>;
  readonly coproductWitnesses: ReadonlyArray<FreeMonadComonadCoproductWitness<LawObj>>;
  readonly universalComparisons: FreeMonadComonadUniversalComparisons<
    InitialComparison,
    FinalComparison
  >;
  readonly diagnostics: ReadonlyArray<string>;
}

export const makeFreeMonadComonadInteractionLaw = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
  LawObj,
  LawArr,
  InitialComparison,
  FinalComparison,
>(
  input: FreeMonadComonadInteractionLawInput<
    Obj,
    Arr,
    Left,
    Right,
    Value,
    LawObj,
    LawArr,
    InitialComparison,
    FinalComparison
  >,
): FreeMonadComonadInteractionLawResult<
  Obj,
  Arr,
  Left,
  Right,
  Value,
  LawObj,
  LawArr,
  InitialComparison,
  FinalComparison
> => {
  const metadata = mergeMetadataList(
    input.base?.metadata,
    input.metadata,
    ["FreeMonadComonadInteractionLaw"],
  );

  const packaged = makeMonadComonadInteractionLaw({
    monad: input.freeMonad,
    comonad: input.cofreeComonad,
    law: input.law,
    ...(metadata ? { metadata } : {}),
    ...(input.options ? { options: input.options } : {}),
  });

  const comparisons = input.universalComparisons ?? { initial: [], final: [] };
  const diagnostics = [
    `makeFreeMonadComonadInteractionLaw: recorded ${input.coproductWitnesses.length} coproduct witness${
      input.coproductWitnesses.length === 1 ? "" : "es"
    } for ?'.`,
    ...(input.base
      ? [
          "makeFreeMonadComonadInteractionLaw: reused base interaction law metadata when building the free law.",
        ]
      : []),
    ...packaged.diagnostics,
  ];

  return {
    interaction: packaged,
    coproductWitnesses: input.coproductWitnesses,
    universalComparisons: comparisons,
    diagnostics,
  };
};

export interface FreeMonadComonadSliceObject<
  Obj,
  Arr,
  Left,
  Right,
  Value,
  LawObj,
  LawArr,
  Comparison,
> {
  readonly interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, LawObj, LawArr>;
  readonly comparisons: ReadonlyArray<FreeMonadComonadUniversalComparison<Comparison>>;
  readonly diagnostics: ReadonlyArray<string>;
}

export const deriveInitialMonadSliceObject = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
  LawObj,
  LawArr,
  InitialComparison,
  FinalComparison,
>(
  result: FreeMonadComonadInteractionLawResult<
    Obj,
    Arr,
    Left,
    Right,
    Value,
    LawObj,
    LawArr,
    InitialComparison,
    FinalComparison
  >,
): FreeMonadComonadSliceObject<
  Obj,
  Arr,
  Left,
  Right,
  Value,
  LawObj,
  LawArr,
  InitialComparison
> => ({
  interaction: result.interaction,
  comparisons: result.universalComparisons.initial,
  diagnostics: [
    `deriveInitialMonadSliceObject: extracted ${result.universalComparisons.initial.length} comparison${
      result.universalComparisons.initial.length === 1 ? "" : "s"
    } into the free law.`,
  ],
});

export const deriveFinalComonadSliceObject = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
  LawObj,
  LawArr,
  InitialComparison,
  FinalComparison,
>(
  result: FreeMonadComonadInteractionLawResult<
    Obj,
    Arr,
    Left,
    Right,
    Value,
    LawObj,
    LawArr,
    InitialComparison,
    FinalComparison
  >,
): FreeMonadComonadSliceObject<
  Obj,
  Arr,
  Left,
  Right,
  Value,
  LawObj,
  LawArr,
  FinalComparison
> => ({
  interaction: result.interaction,
  comparisons: result.universalComparisons.final,
  diagnostics: [
    `deriveFinalComonadSliceObject: extracted ${result.universalComparisons.final.length} comparison${
      result.universalComparisons.final.length === 1 ? "" : "s"
    } out of the free law.`,
  ],
});
