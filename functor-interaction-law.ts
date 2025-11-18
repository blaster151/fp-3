import {
  buildDayPairingData,
  dualChuSpace,
  sweedlerDualFromDual,
  sweedlerDualFromPrimal,
  type ChuSpace,
  type ChuSpaceFromDayPairingInput,
  type DayPairingAggregator,
  type DayPairingContribution,
  type DayPairingData,
  type IndexedElement,
} from "./chu-space";
import { dayTensor, dayUnit, dayUnitContravariant } from "./day-convolution";
import type { DayConvolutionResult, DayUnitResult } from "./day-convolution";
import {
  constructContravariantFunctorWithWitness,
  contravariantToOppositeFunctor,
  oppositeFunctorToContravariant,
  type ContravariantFunctorWithWitness,
} from "./contravariant";
import {
  constructFunctorWithWitness,
  identityFunctorWithWitness,
  type FunctorComposablePair,
  type FunctorWithWitness,
} from "./functor";
import {
  contravariantRepresentableFunctorWithWitness,
  covariantRepresentableFunctorWithWitness,
} from "./functor-representable";
import type { FiniteCategory } from "./finite-cat";
import {
  constructNaturalTransformationWithWitness,
  identityNaturalTransformation,
  type NaturalTransformationWithWitness,
} from "./natural-transformation";
import {
  SetCat,
  getCarrierSemantics,
  semanticsAwareEquals,
  type Coproduct,
  type CoproductData,
  type ExponentialArrow,
  type ExponentialData,
  type ProductData,
  type SetHom,
  type SetObj,
  type SetTerminalObject,
} from "./set-cat";
import { setSimpleCategory } from "./set-simple-category";
import type { SimpleCat } from "./simple-cat";
import type {
  PromonoidalKernel,
  PromonoidalTensorValue,
  PromonoidalUnitValue,
} from "./promonoidal-structure";
import { makeTwoObjectPromonoidalKernel } from "./promonoidal-structure";
import type {
  FunctorOperationDegeneracyReport,
} from "./functor-interaction-law-degeneracy";
import { TwoObjectCategory, nonIdentity, type TwoArrow, type TwoObject } from "./two-object-cat";

export interface LawvereOperationWitness<LawObj, LawArr> {
  readonly domain: LawObj;
  readonly codomain: LawObj;
  readonly morphism: LawArr;
  readonly metadata?: ReadonlyArray<string>;
}

export interface OperationDayReference<Obj> {
  readonly fiber: Obj;
  readonly index: number;
  readonly metadata?: ReadonlyArray<string>;
}

export interface NullaryOperationMetadata<Obj, Arr> {
  readonly component: (object: Obj) => Arr;
  readonly metadata?: ReadonlyArray<string>;
}

export interface CommutativeBinaryOperationMetadata<Obj, Arr> {
  readonly component: (object: Obj) => Arr;
  readonly swapWitness?: Arr;
  readonly metadata?: ReadonlyArray<string>;
}

export interface MonadOperation<Obj, Arr, LawObj = Obj, LawArr = Arr> {
  readonly label: string;
  readonly arity: number;
  readonly transformation?: NaturalTransformationWithWitness<Obj, Arr, Obj, Arr>;
  readonly kleisliOnGeneric?: (object: Obj) => Arr;
  readonly lawvereWitness?: LawvereOperationWitness<LawObj, LawArr>;
  readonly dayReferences?: ReadonlyArray<OperationDayReference<Obj>>;
  readonly nullary?: NullaryOperationMetadata<Obj, Arr>;
  readonly commutativeBinary?: CommutativeBinaryOperationMetadata<Obj, Arr>;
  readonly metadata?: ReadonlyArray<string>;
}

export interface NullaryOperationConstruction<Obj, Arr, LawObj = Obj, LawArr = Arr> {
  readonly label: string;
  readonly transformation?: NaturalTransformationWithWitness<Obj, Arr, Obj, Arr>;
  readonly component: (object: Obj) => Arr;
  readonly kleisliOnGeneric?: (object: Obj) => Arr;
  readonly lawvereWitness?: LawvereOperationWitness<LawObj, LawArr>;
  readonly dayReferences?: ReadonlyArray<OperationDayReference<Obj>>;
  readonly metadata?: ReadonlyArray<string>;
  readonly nullaryMetadata?: ReadonlyArray<string>;
}

export interface CommutativeBinaryOperationConstruction<Obj, Arr, LawObj = Obj, LawArr = Arr> {
  readonly label: string;
  readonly transformation?: NaturalTransformationWithWitness<Obj, Arr, Obj, Arr>;
  readonly component: (object: Obj) => Arr;
  readonly swapWitness?: Arr;
  readonly kleisliOnGeneric?: (object: Obj) => Arr;
  readonly lawvereWitness?: LawvereOperationWitness<LawObj, LawArr>;
  readonly dayReferences?: ReadonlyArray<OperationDayReference<Obj>>;
  readonly metadata?: ReadonlyArray<string>;
  readonly commutativeMetadata?: ReadonlyArray<string>;
}

const normalizeNullaryMetadata = <Obj, Arr, LawObj, LawArr>(
  construction: NullaryOperationConstruction<Obj, Arr, LawObj, LawArr>,
): NullaryOperationMetadata<Obj, Arr> => ({
  component: construction.component,
  ...(construction.nullaryMetadata ? { metadata: construction.nullaryMetadata } : {}),
});

const normalizeCommutativeBinaryMetadata = <Obj, Arr, LawObj, LawArr>(
  construction: CommutativeBinaryOperationConstruction<Obj, Arr, LawObj, LawArr>,
): CommutativeBinaryOperationMetadata<Obj, Arr> => ({
  component: construction.component,
  ...(construction.swapWitness ? { swapWitness: construction.swapWitness } : {}),
  ...(construction.commutativeMetadata ? { metadata: construction.commutativeMetadata } : {}),
});

export const makeNullaryMonadOperation = <Obj, Arr, LawObj = Obj, LawArr = Arr>(
  construction: NullaryOperationConstruction<Obj, Arr, LawObj, LawArr>,
): MonadOperation<Obj, Arr, LawObj, LawArr> => ({
  label: construction.label,
  arity: 0,
  nullary: normalizeNullaryMetadata(construction),
  ...(construction.transformation ? { transformation: construction.transformation } : {}),
  ...(construction.kleisliOnGeneric ? { kleisliOnGeneric: construction.kleisliOnGeneric } : {}),
  ...(construction.lawvereWitness ? { lawvereWitness: construction.lawvereWitness } : {}),
  ...(construction.dayReferences ? { dayReferences: construction.dayReferences } : {}),
  ...(construction.metadata ? { metadata: construction.metadata } : {}),
});

export const makeCommutativeBinaryMonadOperation = <Obj, Arr, LawObj = Obj, LawArr = Arr>(
  construction: CommutativeBinaryOperationConstruction<Obj, Arr, LawObj, LawArr>,
): MonadOperation<Obj, Arr, LawObj, LawArr> => ({
  label: construction.label,
  arity: 2,
  commutativeBinary: normalizeCommutativeBinaryMetadata(construction),
  ...(construction.transformation ? { transformation: construction.transformation } : {}),
  ...(construction.kleisliOnGeneric ? { kleisliOnGeneric: construction.kleisliOnGeneric } : {}),
  ...(construction.lawvereWitness ? { lawvereWitness: construction.lawvereWitness } : {}),
  ...(construction.dayReferences ? { dayReferences: construction.dayReferences } : {}),
  ...(construction.metadata ? { metadata: construction.metadata } : {}),
});

export const makeNullaryComonadCooperation = <Obj, Arr, LawObj = Obj, LawArr = Arr>(
  construction: NullaryOperationConstruction<Obj, Arr, LawObj, LawArr>,
): ComonadCooperation<Obj, Arr, LawObj, LawArr> => ({
  label: construction.label,
  arity: 0,
  nullary: normalizeNullaryMetadata(construction),
  ...(construction.transformation ? { transformation: construction.transformation } : {}),
  ...(construction.kleisliOnGeneric ? { genericDuplication: construction.kleisliOnGeneric } : {}),
  ...(construction.lawvereWitness ? { lawvereWitness: construction.lawvereWitness } : {}),
  ...(construction.dayReferences ? { dayReferences: construction.dayReferences } : {}),
  ...(construction.metadata ? { metadata: construction.metadata } : {}),
});

export const makeCommutativeBinaryComonadCooperation = <Obj, Arr, LawObj = Obj, LawArr = Arr>(
  construction: CommutativeBinaryOperationConstruction<Obj, Arr, LawObj, LawArr>,
): ComonadCooperation<Obj, Arr, LawObj, LawArr> => ({
  label: construction.label,
  arity: 2,
  commutativeBinary: normalizeCommutativeBinaryMetadata(construction),
  ...(construction.transformation ? { transformation: construction.transformation } : {}),
  ...(construction.kleisliOnGeneric ? { genericDuplication: construction.kleisliOnGeneric } : {}),
  ...(construction.lawvereWitness ? { lawvereWitness: construction.lawvereWitness } : {}),
  ...(construction.dayReferences ? { dayReferences: construction.dayReferences } : {}),
  ...(construction.metadata ? { metadata: construction.metadata } : {}),
});

const enumerateCarrier = <T>(carrier: SetObj<T>): ReadonlyArray<T> => {
  const semantics = getCarrierSemantics(carrier);
  if (semantics?.iterate) {
    return Array.from(semantics.iterate());
  }
  return Array.from(carrier);
};

const buildIndexedFiberCarrier = <Obj, Payload>(
  object: Obj,
  carrier: SetObj<Payload>,
  tag: string,
): SetObj<IndexedElement<Obj, Payload>> => {
  const equals = semanticsAwareEquals(carrier);
  const elements = enumerateCarrier(carrier).map<IndexedElement<Obj, Payload>>((element) => ({
    object,
    element,
  }));
  return SetCat.obj(elements, {
    equals: (left, right) =>
      Object.is(left.object, right.object) &&
      (equals ? equals(left.element, right.element) : Object.is(left.element, right.element)),
    tag,
  });
};

const enumerateComposablePairs = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
): ReadonlyArray<FunctorComposablePair<Arr>> => {
  const pairs: FunctorComposablePair<Arr>[] = [];
  for (const g of category.arrows) {
    for (const f of category.arrows) {
      if (Object.is(category.dst(g), category.src(f))) {
        pairs.push({ f, g });
      }
    }
  }
  return pairs;
};

export interface ComonadCooperation<Obj, Arr, LawObj = Obj, LawArr = Arr> {
  readonly label: string;
  readonly arity: number;
  readonly transformation?: NaturalTransformationWithWitness<Obj, Arr, Obj, Arr>;
  readonly genericDuplication?: (object: Obj) => Arr;
  readonly counit?: (object: Obj) => Arr;
  readonly lawvereWitness?: LawvereOperationWitness<LawObj, LawArr>;
  readonly dayReferences?: ReadonlyArray<OperationDayReference<Obj>>;
  readonly nullary?: NullaryOperationMetadata<Obj, Arr>;
  readonly commutativeBinary?: CommutativeBinaryOperationMetadata<Obj, Arr>;
  readonly metadata?: ReadonlyArray<string>;
}

export interface FunctorInteractionLawOperations<Obj, Arr, LawObj = Obj, LawArr = Arr> {
  readonly monadOperations?: ReadonlyArray<MonadOperation<Obj, Arr, LawObj, LawArr>>;
  readonly comonadCooperations?: ReadonlyArray<ComonadCooperation<Obj, Arr, LawObj, LawArr>>;
  readonly metadata?: ReadonlyArray<string>;
}

const mergeMetadata = (
  existing: ReadonlyArray<string> | undefined,
  addition: ReadonlyArray<string> | undefined,
): ReadonlyArray<string> | undefined => {
  if (!addition || addition.length === 0) return existing;
  if (!existing || existing.length === 0) {
    return [...addition];
  }
  const combined = [...existing];
  let changed = false;
  for (const entry of addition) {
    if (!combined.includes(entry)) {
      combined.push(entry);
      changed = true;
    }
  }
  return changed ? combined : existing;
};

const mergeMetadataList = (
  ...inputs: (ReadonlyArray<string> | undefined)[]
): ReadonlyArray<string> | undefined =>
  inputs.reduce<ReadonlyArray<string> | undefined>((accumulator, current) => mergeMetadata(accumulator, current), undefined);

const buildMonadOperation = <Obj, Arr, LawObj, LawArr>(
  operation: MonadOperation<Obj, Arr, LawObj, LawArr>,
  genericElement: ((object: Obj) => Arr) | undefined,
  metadata: ReadonlyArray<string> | undefined,
): MonadOperation<Obj, Arr, LawObj, LawArr> => ({
  ...operation,
  ...(genericElement && !operation.kleisliOnGeneric
    ? { kleisliOnGeneric: genericElement }
    : {}),
  ...(metadata ? { metadata } : {}),
});

const buildComonadOperation = <Obj, Arr, LawObj, LawArr>(
  operation: ComonadCooperation<Obj, Arr, LawObj, LawArr>,
  duplication: ((object: Obj) => Arr) | undefined,
  counit: ((object: Obj) => Arr) | undefined,
  metadata: ReadonlyArray<string> | undefined,
): ComonadCooperation<Obj, Arr, LawObj, LawArr> => ({
  ...operation,
  ...(duplication && !operation.genericDuplication
    ? { genericDuplication: duplication }
    : {}),
  ...(counit && !operation.counit ? { counit } : {}),
  ...(metadata ? { metadata } : {}),
});

const MONAD_UNIT_METADATA = [
  "Generic element witnesses derived from the monad unit ?.",
] as const;

const COMONAD_COMULT_METADATA = [
  "Generic duplication witnesses derived from the comonad comultiplication ?.",
] as const;

const COMONAD_COUNIT_METADATA = [
  "Counit witnesses derived from the comonad counit ?.",
] as const;

export interface FunctorInteractionLawOperationsInput<Obj, Arr, LawObj = Obj, LawArr = Arr> {
  readonly monadOperations?: ReadonlyArray<MonadOperation<Obj, Arr, LawObj, LawArr>>;
  readonly comonadCooperations?: ReadonlyArray<ComonadCooperation<Obj, Arr, LawObj, LawArr>>;
  readonly metadata?: ReadonlyArray<string>;
  readonly monadStructure?: {
    readonly unit?: NaturalTransformationWithWitness<Obj, Arr, Obj, Arr>;
    readonly metadata?: ReadonlyArray<string>;
  };
  readonly comonadStructure?: {
    readonly counit?: NaturalTransformationWithWitness<Obj, Arr, Obj, Arr>;
    readonly comultiplication?: NaturalTransformationWithWitness<Obj, Arr, Obj, Arr>;
    readonly metadata?: ReadonlyArray<string>;
  };
}

export const makeFunctorInteractionLawOperations = <Obj, Arr, LawObj = Obj, LawArr = Arr>(
  input: FunctorInteractionLawOperationsInput<Obj, Arr, LawObj, LawArr>,
): FunctorInteractionLawOperations<Obj, Arr, LawObj, LawArr> => {
  const monadUnitMetadata = input.monadStructure?.unit
    ? mergeMetadataList(
        MONAD_UNIT_METADATA,
        input.monadStructure.metadata,
        input.monadStructure.unit.metadata,
      )
    : undefined;

  const monadGenericElement = input.monadStructure?.unit
    ? input.monadStructure.unit.transformation.component
    : undefined;

  const monadOperations = (input.monadOperations ?? []).map((operation) =>
    buildMonadOperation(operation, monadGenericElement, mergeMetadata(operation.metadata, monadUnitMetadata)),
  );

  const comultiplicationMetadata = input.comonadStructure?.comultiplication
    ? mergeMetadataList(
        COMONAD_COMULT_METADATA,
        input.comonadStructure.metadata,
        input.comonadStructure.comultiplication.metadata,
      )
    : undefined;

  const counitMetadata = input.comonadStructure?.counit
    ? mergeMetadataList(
        COMONAD_COUNIT_METADATA,
        input.comonadStructure.metadata,
        input.comonadStructure.counit.metadata,
      )
    : undefined;

  const comultiplicationComponent = input.comonadStructure?.comultiplication
    ? input.comonadStructure.comultiplication.transformation.component
    : undefined;

  const counitComponent = input.comonadStructure?.counit
    ? input.comonadStructure.counit.transformation.component
    : undefined;

  const comonadOperations = (input.comonadCooperations ?? []).map((operation) =>
    buildComonadOperation(
      operation,
      comultiplicationComponent,
      counitComponent,
      mergeMetadataList(operation.metadata, comultiplicationMetadata, counitMetadata),
    ),
  );

  const operationsMetadata = mergeMetadataList(
    input.metadata,
    input.monadStructure?.metadata,
    input.monadStructure?.unit?.metadata,
    input.monadStructure?.unit ? MONAD_UNIT_METADATA : undefined,
    input.comonadStructure?.metadata,
    input.comonadStructure?.comultiplication?.metadata,
    input.comonadStructure?.comultiplication ? COMONAD_COMULT_METADATA : undefined,
    input.comonadStructure?.counit?.metadata,
    input.comonadStructure?.counit ? COMONAD_COUNIT_METADATA : undefined,
  );

  return {
    ...(monadOperations.length > 0 ? { monadOperations } : {}),
    ...(comonadOperations.length > 0 ? { comonadCooperations: comonadOperations } : {}),
    ...(operationsMetadata && operationsMetadata.length > 0
      ? { metadata: operationsMetadata }
      : {}),
  };
};

export interface FunctorInteractionLaw<Obj, Arr, Left, Right, Value>
  extends DayPairingData<Obj, Arr, Left, Right, Value> {
  readonly evaluate: (primal: IndexedElement<Obj, Left>, dual: IndexedElement<Obj, Right>) => Value;
  readonly toChuSpace: () => ChuSpace<IndexedElement<Obj, Left>, IndexedElement<Obj, Right>, Value>;
  readonly getPairingComponent: (object: Obj) => PairingComponent<Obj, Arr, Left, Right, Value> | undefined;
  readonly operations?: FunctorInteractionLawOperations<Obj, Arr>;
}

type PairingComponent<Obj, Arr, Left, Right, Value> = DayPairingData<Obj, Arr, Left, Right, Value>["pairingComponents"] extends Map<
  Obj,
  infer Component
>
  ? Component
  : never;

export type FunctorInteractionLawInput<Obj, Arr, Left, Right, Value> =
  & ChuSpaceFromDayPairingInput<Obj, Arr, Left, Right, Value>
  & {
    readonly operations?: FunctorInteractionLawOperations<Obj, Arr>;
  };

const buildBooleanObject = () => SetCat.obj<boolean>([false, true], { tag: "Ω" });

const makeBooleanInteractionInputInternal = () => {
  const kernel = makeTwoObjectPromonoidalKernel();
  const leftToolkit = contravariantRepresentableFunctorWithWitness(TwoObjectCategory, "★");
  const rightToolkit = covariantRepresentableFunctorWithWitness(TwoObjectCategory, "★");
  const left = leftToolkit.functor;
  const right = rightToolkit.functor;
  const convolution = dayTensor(kernel, left, right);
  const dualizing = buildBooleanObject();
  const identity = identityFunctorWithWitness(TwoObjectCategory);
  const operations = makeFunctorInteractionLawOperations<TwoObject, TwoArrow>({
    metadata: ["SpecOperations"],
    monadOperations: [
      makeNullaryMonadOperation<TwoObject, TwoArrow>({
        label: "TestNullary",
        component: (object: TwoObject) => TwoObjectCategory.id(object),
        dayReferences: [
          {
            fiber: "★" as const,
            index: 0,
            metadata: ["SampleFiber"],
          },
        ],
        lawvereWitness: {
          domain: "★" as const,
          codomain: "★" as const,
          morphism: TwoObjectCategory.id("★"),
          metadata: ["NullaryLawvere"],
        },
        metadata: ["SampleMonadOperation"],
        nullaryMetadata: ["IdentityNullary"],
      }),
      makeCommutativeBinaryMonadOperation<TwoObject, TwoArrow>({
        label: "TestBinary",
        component: (object: TwoObject) => TwoObjectCategory.id(object),
        swapWitness: TwoObjectCategory.id("★"),
        dayReferences: [
          {
            fiber: "★" as const,
            index: 1,
            metadata: ["BinaryFiber"],
          },
        ],
        lawvereWitness: {
          domain: "★" as const,
          codomain: "★" as const,
          morphism: TwoObjectCategory.id("★"),
          metadata: ["BinaryLawvere"],
        },
        metadata: ["SampleBinaryOperation"],
        commutativeMetadata: ["BinaryMetadata"],
      }),
    ],
    monadStructure: {
      unit: identityNaturalTransformation(identity),
      metadata: ["IdentityMonadStructure"],
    },
  });

  return {
    kernel,
    left,
    right,
    convolution,
    dualizing,
    pairing: (
      _object: TwoObject,
      carrier: ReturnType<typeof convolution.functor.functor.F0>,
    ) =>
      SetCat.hom(carrier, dualizing, (cls) => cls.witness.kernelLeft === cls.witness.kernelRight),
    aggregate: (
      contributions: ReadonlyArray<
        DayPairingContribution<TwoObject, TwoArrow, unknown, unknown, boolean>
      >,
    ) => contributions.some((entry) => entry.evaluation),
    tags: { primal: "LawPrimal", dual: "LawDual" },
    operations,
  } as const;
};

export interface StretchInteractionLawOptions<Obj, Arr, LeftPrime, RightPrime, Left, Right, Value> {
  readonly left: ContravariantFunctorWithWitness<Obj, Arr, SetObj<LeftPrime>, SetHom<LeftPrime, LeftPrime>>;
  readonly right: FunctorWithWitness<Obj, Arr, SetObj<RightPrime>, SetHom<RightPrime, RightPrime>>;
  readonly mapLeft: (object: Obj, element: LeftPrime) => Left;
  readonly mapRight: (object: Obj, element: RightPrime) => Right;
  readonly aggregatePostprocess?: (input: {
    readonly baseValue: Value;
    readonly contributions: ReadonlyArray<DayPairingContribution<Obj, Arr, LeftPrime, RightPrime, Value>>;
    readonly mapped: ReadonlyArray<DayPairingContribution<Obj, Arr, Left, Right, Value>>;
  }) => Value;
  readonly pairingPostprocess?: (input: {
    readonly object: Obj;
    readonly diagonal: Obj;
    readonly baseValue: Value;
    readonly witness: unknown;
  }) => Value;
  readonly tags?: {
    readonly primal?: string;
    readonly dual?: string;
  };
  readonly operations?: FunctorInteractionLawOperations<Obj, Arr>;
}

export interface FinalInteractionLawOptions<Obj, Arr, Value> {
  readonly dualizing?: SetObj<Value>;
  readonly evaluationValue?: Value;
  readonly tags?: {
    readonly primal?: string;
    readonly dual?: string;
  };
  readonly operations?: FunctorInteractionLawOperations<Obj, Arr>;
}

export interface SelfDualInteractionLawOptions<Obj, Arr, Left, Right, Value> {
  readonly space?: ChuSpace<IndexedElement<Obj, Left>, IndexedElement<Obj, Right>, Value>;
}

export interface InteractionLawProductProjections<
  Obj,
  Left0,
  Left1,
  Right0,
  Right1,
  Value0,
  Value1,
> {
  readonly left: (object: Obj) => ProductData<Left0, Left1>;
  readonly right: (object: Obj) => ProductData<Right0, Right1>;
  readonly value: ProductData<Value0, Value1>;
}

export interface ProductInteractionLawResult<
  Obj,
  Arr,
  Left0,
  Right0,
  Value0,
  Left1,
  Right1,
  Value1,
> {
  readonly law: FunctorInteractionLaw<
    Obj,
    Arr,
    readonly [Left0, Left1],
    readonly [Right0, Right1],
    readonly [Value0, Value1]
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
}

export interface InteractionLawCoproductInjections<
  Obj,
  Left0,
  Left1,
  Right0,
  Right1,
  Value0,
  Value1,
> {
  readonly left: (object: Obj) => CoproductData<Left0, Left1>;
  readonly right: (object: Obj) => CoproductData<Right0, Right1>;
  readonly value: CoproductData<Value0, Value1>;
}

export interface CoproductInteractionLawResult<
  Obj,
  Arr,
  Left0,
  Right0,
  Value0,
  Left1,
  Right1,
  Value1,
> {
  readonly law: FunctorInteractionLaw<
    Obj,
    Arr,
    Coproduct<Left0, Left1>,
    Coproduct<Right0, Right1>,
    Coproduct<Value0, Value1>
  >;
  readonly injections: InteractionLawCoproductInjections<
    Obj,
    Left0,
    Left1,
    Right0,
    Right1,
    Value0,
    Value1
  >;
}

export const makeFunctorInteractionLaw = <Obj, Arr, Left, Right, Value>(
  input: FunctorInteractionLawInput<Obj, Arr, Left, Right, Value>,
): FunctorInteractionLaw<Obj, Arr, Left, Right, Value> => {
  const { operations } = input;
  const data = buildDayPairingData(input);

  const evaluate = (
    primal: IndexedElement<Obj, Left>,
    dual: IndexedElement<Obj, Right>,
  ): Value => {
    const contributions = data.collect(primal, dual);
    return data.aggregate(contributions);
  };

  const toChuSpace = () => data.space;
  const getPairingComponent = (object: Obj) => data.pairingComponents.get(object);

  return {
    ...data,
    ...(operations ? { operations } : {}),
    evaluate,
    toChuSpace,
    getPairingComponent,
  };
};

export type {
  DayPairingAggregator as FunctorInteractionLawAggregator,
  DayPairingContribution as FunctorInteractionLawContribution,
  IndexedElement as FunctorInteractionLawElement,
} from "./chu-space";

export const stretchInteractionLaw = <Obj, Arr, Left, Right, Value, LeftPrime, RightPrime>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  options: StretchInteractionLawOptions<Obj, Arr, LeftPrime, RightPrime, Left, Right, Value>,
): FunctorInteractionLaw<Obj, Arr, LeftPrime, RightPrime, Value> => {
  const {
    left,
    right,
    mapLeft,
    mapRight,
    aggregatePostprocess,
    pairingPostprocess,
    tags,
    operations,
  } = options;

  const convolution = dayTensor(law.kernel, left, right);

  const pairing = (
    object: Obj,
    carrier: ReturnType<typeof convolution.functor.functor.F0>,
  ) => {
    const baseComponent = law.getPairingComponent(object);
    if (!baseComponent) {
      throw new Error(`stretchInteractionLaw: missing pairing component for ${String(object)}.`);
    }
    const baseFiber = law.convolution.fibers.find((fiber) => Object.is(fiber.output, object));
    if (!baseFiber) {
      throw new Error(`stretchInteractionLaw: missing Day fiber for ${String(object)}.`);
    }

    return SetCat.hom(carrier, law.dualizing, (cls) => {
      const data = cls as {
        readonly diagonalObject: Obj;
        readonly witness: {
          readonly kernelLeft: Obj;
          readonly kernelRight: Obj;
          readonly output: Obj;
          readonly kernelValue: PromonoidalTensorValue<Obj, Arr>;
          readonly leftElement: LeftPrime;
          readonly rightElement: RightPrime;
        };
      };

      const mappedWitness: Parameters<typeof baseFiber.classify>[1] = {
        kernelLeft: data.witness.kernelLeft,
        kernelRight: data.witness.kernelRight,
        output: data.witness.output,
        kernelValue: data.witness.kernelValue,
        leftElement: mapLeft(data.witness.kernelLeft, data.witness.leftElement),
        rightElement: mapRight(data.witness.kernelRight, data.witness.rightElement),
      };

      const classified = baseFiber.classify(data.diagonalObject, mappedWitness);
      if (!classified) {
        throw new Error(
          `stretchInteractionLaw: unable to classify mapped witness for ${String(object)}.`,
        );
      }

      const baseValue = baseComponent.map(classified);
      if (!pairingPostprocess) {
        return baseValue;
      }
      return pairingPostprocess({
        object,
        diagonal: data.diagonalObject,
        baseValue,
        witness: cls,
      });
    });
  };

  const aggregate: DayPairingAggregator<Obj, Arr, LeftPrime, RightPrime, Value> = (contributions) => {
    const mapped = contributions.map<DayPairingContribution<Obj, Arr, Left, Right, Value>>((entry) => ({
      output: entry.output,
      diagonal: entry.diagonal,
      kernelLeft: entry.kernelLeft,
      kernelRight: entry.kernelRight,
      kernelValue: entry.kernelValue,
      evaluation: entry.evaluation,
      left: {
        object: entry.left.object,
        element: mapLeft(entry.left.object, entry.left.element),
      },
      right: {
        object: entry.right.object,
        element: mapRight(entry.right.object, entry.right.element),
      },
    }));

    const baseValue = law.aggregate(mapped);
    if (!aggregatePostprocess) {
      return baseValue;
    }
    return aggregatePostprocess({ baseValue, contributions, mapped });
  };

  const combinedOperations = operations ?? law.operations;

  return makeFunctorInteractionLaw({
    kernel: law.kernel,
    left,
    right,
    convolution,
    dualizing: law.dualizing,
    pairing,
    aggregate,
    ...(tags ? { tags } : {}),
    ...(combinedOperations ? { operations: combinedOperations } : {}),
  });
};

export const selfDualInteractionLaw = <Obj, Arr, Left, Right, Value>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  options: SelfDualInteractionLawOptions<Obj, Arr, Left, Right, Value> = {},
): {
  readonly law: FunctorInteractionLaw<Obj, Arr, Right, Left, Value>;
  readonly dualSpace: ChuSpace<IndexedElement<Obj, Right>, IndexedElement<Obj, Left>, Value>;
} => {
  const space = options.space ?? law.toChuSpace();
  const dualSpace = dualChuSpace(space);
  const dualLeft = oppositeFunctorToContravariant(law.kernel.base, law.right);
  const dualRight = contravariantToOppositeFunctor(law.left);
  const convolution = dayTensor(law.kernel, dualLeft, dualRight);

  const pairing = (
    _object: Obj,
    carrier: ReturnType<typeof convolution.functor.functor.F0>,
  ) => SetCat.hom(carrier, law.dualizing, (cls) => {
    const data = cls as {
      readonly witness: {
        readonly kernelLeft: Obj;
        readonly kernelRight: Obj;
        readonly output: Obj;
        readonly kernelValue: PromonoidalTensorValue<Obj, Arr>;
        readonly leftElement: Right;
        readonly rightElement: Left;
      };
    };

    const primal: IndexedElement<Obj, Right> = {
      object: data.witness.kernelLeft,
      element: data.witness.leftElement,
    };
    const dual: IndexedElement<Obj, Left> = {
      object: data.witness.kernelRight,
      element: data.witness.rightElement,
    };
    return dualSpace.evaluate(primal, dual);
  });

  const aggregate: DayPairingAggregator<Obj, Arr, Right, Left, Value> = (contributions) => {
    const mapped = contributions.map<DayPairingContribution<Obj, Arr, Left, Right, Value>>((entry) => ({
      output: entry.output,
      diagonal: entry.diagonal,
      kernelLeft: entry.kernelLeft,
      kernelRight: entry.kernelRight,
      kernelValue: entry.kernelValue,
      evaluation: entry.evaluation,
      left: {
        object: entry.right.object,
        element: entry.right.element,
      },
      right: {
        object: entry.left.object,
        element: entry.left.element,
      },
    }));
    return law.aggregate(mapped);
  };

  const result = makeFunctorInteractionLaw({
    kernel: law.kernel,
    left: dualLeft,
    right: dualRight,
    convolution,
    dualizing: law.dualizing,
    pairing,
    aggregate,
    ...(law.operations ? { operations: law.operations } : {}),
    tags: { primal: "SelfDualPrimal", dual: "SelfDualDual" },
  });

  return { law: result, dualSpace };
};

export interface InteractionLawSweedlerOptions<Obj, Arr, Left, Right, Value> {
  readonly space?: ChuSpace<IndexedElement<Obj, Left>, IndexedElement<Obj, Right>, Value>;
  readonly currying?: InteractionLawCurryingSummary<Obj, Arr, Left, Right, Value>;
  readonly comma?: InteractionLawLeftCommaEquivalence<Obj, Arr, Left, Right, Value>;
  readonly degeneracy?: FunctorOperationDegeneracyReport<
    Obj,
    Arr,
    Left,
    Right,
    Value,
    unknown,
    unknown
  >;
}

export interface InteractionLawSweedlerSummary<Obj, Arr, Left, Right, Value> {
  readonly law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>;
  readonly space: ChuSpace<IndexedElement<Obj, Left>, IndexedElement<Obj, Right>, Value>;
  readonly fromPrimal: SetHom<
    IndexedElement<Obj, Left>,
    (dual: IndexedElement<Obj, Right>) => Value
  >;
  readonly fromDual: SetHom<
    IndexedElement<Obj, Right>,
    (primal: IndexedElement<Obj, Left>) => Value
  >;
  readonly currying: InteractionLawCurryingSummary<Obj, Arr, Left, Right, Value>;
  readonly comma: InteractionLawLeftCommaEquivalence<Obj, Arr, Left, Right, Value>;
  readonly degeneracyMetadata?: ReadonlyArray<string>;
  readonly diagnostics: ReadonlyArray<string>;
}

export interface InteractionLawSweedlerMapResult<Obj, Arr, Left, Right, Value> {
  readonly hom: SetHom<
    IndexedElement<Obj, Left>,
    (dual: IndexedElement<Obj, Right>) => Value
  >;
  readonly summary: InteractionLawSweedlerSummary<Obj, Arr, Left, Right, Value>;
}

const buildDegeneracyMetadata = <Obj, Arr, Left, Right, Value>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  options: InteractionLawSweedlerOptions<Obj, Arr, Left, Right, Value>,
): ReadonlyArray<string> | undefined => {
  if (options.degeneracy?.metadata && options.degeneracy.metadata.length > 0) {
    return options.degeneracy.metadata;
  }
  if (law.operations?.metadata && law.operations.metadata.length > 0) {
    return law.operations.metadata;
  }
  return undefined;
};

const describeOptionReuse = (
  label: string,
  provided: boolean,
): string =>
  provided
    ? `${label}: reused cached data supplied via options.`
    : `${label}: recomputed using Phase I helper diagnostics.`;

export const deriveInteractionLawSweedlerSummary = <Obj, Arr, Left, Right, Value>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  options: InteractionLawSweedlerOptions<Obj, Arr, Left, Right, Value> = {},
): InteractionLawSweedlerSummary<Obj, Arr, Left, Right, Value> => {
  const diagnostics: string[] = [];
  const space = options.space ?? law.toChuSpace();
  diagnostics.push(
    options.space
      ? "Chu space reused from cached interaction-law pairing data."
      : "Chu space reconstructed from the interaction law via buildDayPairingData cache.",
  );

  const currying = options.currying ?? deriveInteractionLawCurrying(law);
  diagnostics.push(describeOptionReuse("Currying summary", Boolean(options.currying)));

  const comma = options.comma ?? deriveInteractionLawLeftCommaEquivalence(law);
  diagnostics.push(describeOptionReuse("Comma presentation", Boolean(options.comma)));

  const degeneracyMetadata = buildDegeneracyMetadata(law, options);
  diagnostics.push(
    degeneracyMetadata
      ? "Degeneracy metadata attached for Sweedler diagnostics."
      : "No degeneracy metadata supplied; Sweedler diagnostics will omit collapse references.",
  );

  const fromPrimal = sweedlerDualFromPrimal(space);
  const fromDual = sweedlerDualFromDual(space);
  diagnostics.push("Computed Sweedler dual maps from the cached Chu pairing.");

  return {
    law,
    space,
    fromPrimal,
    fromDual,
    currying,
    comma,
    ...(degeneracyMetadata ? { degeneracyMetadata } : {}),
    diagnostics,
  };
};

export const deriveInteractionLawSweedlerFromPrimal = <Obj, Arr, Left, Right, Value>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  options: InteractionLawSweedlerOptions<Obj, Arr, Left, Right, Value> = {},
): InteractionLawSweedlerMapResult<Obj, Arr, Left, Right, Value> => {
  const summary = deriveInteractionLawSweedlerSummary(law, options);
  return { hom: summary.fromPrimal, summary };
};

export const deriveInteractionLawSweedlerFromDual = <Obj, Arr, Left, Right, Value>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  options: InteractionLawSweedlerOptions<Obj, Arr, Left, Right, Value> = {},
): {
  readonly hom: SetHom<
    IndexedElement<Obj, Right>,
    (primal: IndexedElement<Obj, Left>) => Value
  >;
  readonly summary: InteractionLawSweedlerSummary<Obj, Arr, Left, Right, Value>;
} => {
  const summary = deriveInteractionLawSweedlerSummary(law, options);
  return { hom: summary.fromDual, summary };
};

export interface DualInteractionLawOptions<Obj, Arr, Left, Right, Value>
  extends InteractionLawSweedlerOptions<Obj, Arr, Left, Right, Value> {}

export interface DualInteractionLawResult<Obj, Arr, Left, Right, Value> {
  readonly law: FunctorInteractionLaw<Obj, Arr, Right, Left, Value>;
  readonly dualSpace: ChuSpace<IndexedElement<Obj, Right>, IndexedElement<Obj, Left>, Value>;
  readonly sweedler: InteractionLawSweedlerSummary<Obj, Arr, Left, Right, Value>;
  readonly diagnostics: ReadonlyArray<string>;
}

export const dualInteractionLaw = <Obj, Arr, Left, Right, Value>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  options: DualInteractionLawOptions<Obj, Arr, Left, Right, Value> = {},
): DualInteractionLawResult<Obj, Arr, Left, Right, Value> => {
  const sweedler = deriveInteractionLawSweedlerSummary(law, options);
  const { law: dualLaw, dualSpace } = selfDualInteractionLaw(law, { space: sweedler.space });
  const diagnostics = [
    ...sweedler.diagnostics,
    "dualInteractionLaw: constructed dual interaction law via dualChuSpace without recomputing contributions.",
    sweedler.degeneracyMetadata
      ? "dualInteractionLaw: degeneracy metadata propagated to Sweedler summary."
      : "dualInteractionLaw: no degeneracy metadata available for Sweedler summary.",
  ];
  return {
    law: dualLaw,
    dualSpace,
    sweedler,
    diagnostics,
  };
};

export interface GreatestInteractingFunctorOptions<Obj, Arr, Left, Right, Value> {
  readonly sweedler?: InteractionLawSweedlerSummary<Obj, Arr, Left, Right, Value>;
  readonly comma?: InteractionLawLeftCommaPresentation<Obj, Arr, Left, Right, Value>;
  readonly dual?: DualInteractionLawResult<Obj, Arr, Left, Right, Value>;
  readonly metadata?: ReadonlyArray<string>;
}

export interface GreatestInteractingFunctorResult<Obj, Arr, Left, Right, Value> {
  readonly sweedler: InteractionLawSweedlerSummary<Obj, Arr, Left, Right, Value>;
  readonly comma: InteractionLawLeftCommaPresentation<Obj, Arr, Left, Right, Value>;
  readonly dual: DualInteractionLawResult<Obj, Arr, Left, Right, Value>;
  readonly functor: ContravariantFunctorWithWitness<
    Obj,
    Arr,
    SetObj<ExponentialArrow<Right, Value>>,
    SetHom<ExponentialArrow<Right, Value>, ExponentialArrow<Right, Value>>
  >;
  readonly functorOpposite: FunctorWithWitness<
    Obj,
    Arr,
    SetObj<ExponentialArrow<Right, Value>>,
    SetHom<ExponentialArrow<Right, Value>, ExponentialArrow<Right, Value>>
  >;
  readonly transformation: NaturalTransformationWithWitness<
    Obj,
    Arr,
    SetObj<unknown>,
    SetHom<unknown, unknown>
  >;
  readonly diagnostics: ReadonlyArray<string>;
}

export const greatestInteractingFunctor = <Obj, Arr, Left, Right, Value>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  options: GreatestInteractingFunctorOptions<Obj, Arr, Left, Right, Value> = {},
): GreatestInteractingFunctorResult<Obj, Arr, Left, Right, Value> => {
  const diagnostics: string[] = [];

  const sweedler = options.sweedler ?? deriveInteractionLawSweedlerSummary(law);
  diagnostics.push(
    options.sweedler
      ? "Greatest functor: reused provided Sweedler summary."
      : "Greatest functor: computed Sweedler summary for dual packaging.",
  );

  const dual =
    options.dual
    ?? dualInteractionLaw(law, {
      space: sweedler.space,
      currying: sweedler.currying,
      comma: sweedler.comma,
    });
  diagnostics.push(
    options.dual
      ? "Greatest functor: reused supplied dual interaction law."
      : "Greatest functor: constructed dual interaction law for comparison.",
  );

  const comma = options.comma ?? deriveInteractionLawLeftCommaPresentation(law);
  diagnostics.push(
    options.comma
      ? "Greatest functor: reused cached internal-hom presentation."
      : "Greatest functor: derived internal-hom presentation [G(-), ?].",
  );

  const sigma = comma.sigma;
  const metadata = mergeMetadataList(
    options.metadata,
    sweedler.degeneracyMetadata,
    law.operations?.metadata,
    ["Greatest interacting functor packages Sweedler dual evaluations."],
  );

  const sourceOpposite: FunctorWithWitness<Obj, Arr, SetObj<unknown>, SetHom<unknown, unknown>> =
    law.left.witness.oppositeWitness as FunctorWithWitness<
      Obj,
      Arr,
      SetObj<unknown>,
      SetHom<unknown, unknown>
    >;
  const targetOpposite: FunctorWithWitness<Obj, Arr, SetObj<unknown>, SetHom<unknown, unknown>> =
    comma.internalHomOpposite as FunctorWithWitness<
      Obj,
      Arr,
      SetObj<unknown>,
      SetHom<unknown, unknown>
    >;

  const transformation = constructNaturalTransformationWithWitness<
    Obj,
    Arr,
    SetObj<unknown>,
    SetHom<unknown, unknown>
  >(
    sourceOpposite,
    targetOpposite,
    (object) => {
      const component = sigma.get(object);
      if (!component) {
        throw new Error(
          `Greatest interacting functor requires a ?-component for object ${String(object)}.`,
        );
      }
      return component as unknown as SetHom<unknown, unknown>;
    },
    metadata ? { metadata } : {},
  );

  diagnostics.push(
    metadata
      ? "Greatest functor: natural transformation metadata includes degeneracy and Sweedler tags."
      : "Greatest functor: natural transformation built without additional metadata tags.",
  );

  if (sweedler.degeneracyMetadata && sweedler.degeneracyMetadata.length > 0) {
    diagnostics.push(
      `Greatest functor: degeneracy metadata propagated -> ${sweedler.degeneracyMetadata.join(", ")}.`,
    );
  }

  return {
    sweedler,
    comma,
    dual,
    functor: comma.internalHom,
    functorOpposite: comma.internalHomOpposite,
    transformation,
    diagnostics,
  };
};

export interface GreatestInteractingComonadOptions<Obj, Arr, Left, Right, Value> {
  readonly sweedler?: InteractionLawSweedlerSummary<Obj, Arr, Left, Right, Value>;
  readonly dual?: DualInteractionLawResult<Obj, Arr, Left, Right, Value>;
  readonly comma?: InteractionLawLeftCommaPresentation<Obj, Arr, Right, Left, Value>;
  readonly metadata?: ReadonlyArray<string>;
}

export interface GreatestInteractingComonadResult<Obj, Arr, Left, Right, Value> {
  readonly sweedler: InteractionLawSweedlerSummary<Obj, Arr, Left, Right, Value>;
  readonly dual: DualInteractionLawResult<Obj, Arr, Left, Right, Value>;
  readonly comma: InteractionLawLeftCommaPresentation<Obj, Arr, Right, Left, Value>;
  readonly functor: ContravariantFunctorWithWitness<
    Obj,
    Arr,
    SetObj<ExponentialArrow<Left, Value>>,
    SetHom<ExponentialArrow<Left, Value>, ExponentialArrow<Left, Value>>
  >;
  readonly functorOpposite: FunctorWithWitness<
    Obj,
    Arr,
    SetObj<ExponentialArrow<Left, Value>>,
    SetHom<ExponentialArrow<Left, Value>, ExponentialArrow<Left, Value>>
  >;
  readonly transformation: NaturalTransformationWithWitness<
    Obj,
    Arr,
    SetObj<unknown>,
    SetHom<unknown, unknown>
  >;
  readonly diagnostics: ReadonlyArray<string>;
}

export const greatestInteractingComonad = <Obj, Arr, Left, Right, Value>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  options: GreatestInteractingComonadOptions<Obj, Arr, Left, Right, Value> = {},
): GreatestInteractingComonadResult<Obj, Arr, Left, Right, Value> => {
  const diagnostics: string[] = [];

  const sweedler = options.sweedler ?? deriveInteractionLawSweedlerSummary(law);
  diagnostics.push(
    options.sweedler
      ? "Greatest comonad: reused provided Sweedler summary."
      : "Greatest comonad: computed Sweedler summary for dual packaging.",
  );

  const dual =
    options.dual
    ?? dualInteractionLaw(law, {
      space: sweedler.space,
      currying: sweedler.currying,
      comma: sweedler.comma,
    });
  diagnostics.push(
    options.dual
      ? "Greatest comonad: reused supplied dual interaction law."
      : "Greatest comonad: constructed dual interaction law for swapped pairing.",
  );

  const comma = options.comma ?? deriveInteractionLawLeftCommaPresentation(dual.law);
  diagnostics.push(
    options.comma
      ? "Greatest comonad: reused cached internal-hom presentation."
      : "Greatest comonad: derived internal-hom presentation [F(-), ?].",
  );

  const sigma = comma.sigma;
  const metadata = mergeMetadataList(
    options.metadata,
    sweedler.degeneracyMetadata,
    law.operations?.metadata,
    ["Greatest interacting comonad packages Sweedler dual evaluations."],
  );

  const comonadSourceOpposite: FunctorWithWitness<Obj, Arr, SetObj<unknown>, SetHom<unknown, unknown>> =
    dual.law.left.witness.oppositeWitness as FunctorWithWitness<
      Obj,
      Arr,
      SetObj<unknown>,
      SetHom<unknown, unknown>
    >;
  const comonadTargetOpposite: FunctorWithWitness<Obj, Arr, SetObj<unknown>, SetHom<unknown, unknown>> =
    comma.internalHomOpposite as FunctorWithWitness<
      Obj,
      Arr,
      SetObj<unknown>,
      SetHom<unknown, unknown>
    >;

  const transformation = constructNaturalTransformationWithWitness<
    Obj,
    Arr,
    SetObj<unknown>,
    SetHom<unknown, unknown>
  >(
    comonadSourceOpposite,
    comonadTargetOpposite,
    (object) => {
      const component = sigma.get(object);
      if (!component) {
        throw new Error(
          `Greatest interacting comonad requires a ?-component for object ${String(object)}.`,
        );
      }
      return component as unknown as SetHom<unknown, unknown>;
    },
    metadata ? { metadata } : {},
  );

  diagnostics.push(
    metadata
      ? "Greatest comonad: natural transformation metadata includes degeneracy and Sweedler tags."
      : "Greatest comonad: natural transformation built without additional metadata tags.",
  );

  if (sweedler.degeneracyMetadata && sweedler.degeneracyMetadata.length > 0) {
    diagnostics.push(
      `Greatest comonad: degeneracy metadata propagated -> ${sweedler.degeneracyMetadata.join(", ")}.`,
    );
  }

  return {
    sweedler,
    dual,
    comma,
    functor: comma.internalHom,
    functorOpposite: comma.internalHomOpposite,
    transformation,
    diagnostics,
  };
};

interface InteractionLawComparisonMapping<
  Obj,
  LeftReference,
  RightReference,
  ValueReference,
  LeftCandidate,
  RightCandidate,
  ValueCandidate,
> {
  readonly mapPrimal?: (
    element: IndexedElement<Obj, LeftCandidate>,
  ) => IndexedElement<Obj, LeftReference>;
  readonly mapDual?: (
    element: IndexedElement<Obj, RightCandidate>,
  ) => IndexedElement<Obj, RightReference>;
  readonly mapValue?: (value: ValueCandidate) => ValueReference;
  readonly label?: string;
}

export interface InteractionLawComparisonResult {
  readonly matches: boolean;
  readonly checkedPairs: number;
  readonly mismatches: number;
  readonly diagnostics: ReadonlyArray<string>;
}

const encodeIndexedElement = <Obj>(element: IndexedElement<Obj, unknown>): string =>
  `${String(element.object)}::${JSON.stringify(element.element)}`;

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
  if (typeof left === "object" && typeof right === "object" && left !== null && right !== null) {
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

const compareInteractionLaws = <
  Obj,
  Arr,
  LeftReference,
  RightReference,
  ValueReference,
  LeftCandidate,
  RightCandidate,
  ValueCandidate,
>(
  reference: FunctorInteractionLaw<Obj, Arr, LeftReference, RightReference, ValueReference>,
  candidate: FunctorInteractionLaw<Obj, Arr, LeftCandidate, RightCandidate, ValueCandidate>,
  mapping: InteractionLawComparisonMapping<
    Obj,
    LeftReference,
    RightReference,
    ValueReference,
    LeftCandidate,
    RightCandidate,
    ValueCandidate
  > = {},
): InteractionLawComparisonResult => {
  const diagnostics: string[] = [];
  const referencePrimals = Array.from(reference.primalCarrier);
  const referenceDuals = Array.from(reference.dualCarrier);
  const candidatePrimals = Array.from(candidate.primalCarrier);
  const candidateDuals = Array.from(candidate.dualCarrier);

  const referencePrimalLookup = new Map<string, IndexedElement<Obj, LeftReference>>();
  const referenceDualLookup = new Map<string, IndexedElement<Obj, RightReference>>();
  for (const element of referencePrimals) {
    referencePrimalLookup.set(encodeIndexedElement(element), element);
  }
  for (const element of referenceDuals) {
    referenceDualLookup.set(encodeIndexedElement(element), element);
  }

  const visitedPrimal = new Set<string>();
  const visitedDual = new Set<string>();
  const visitedPairs = new Set<string>();

  let mismatches = 0;
  let checkedPairs = 0;
  let matches = true;

  for (const element of candidatePrimals) {
    const mapped = mapping.mapPrimal
      ? mapping.mapPrimal(element)
      : (element as unknown as IndexedElement<Obj, LeftReference>);
    const key = encodeIndexedElement(mapped);
    if (!referencePrimalLookup.has(key)) {
      matches = false;
      diagnostics.push(
        `compareInteractionLaws${mapping.label ? ` (${mapping.label})` : ""}: missing mapped primal ${key} in reference law.`,
      );
    } else {
      visitedPrimal.add(key);
    }
  }

  for (const element of candidateDuals) {
    const mapped = mapping.mapDual
      ? mapping.mapDual(element)
      : (element as unknown as IndexedElement<Obj, RightReference>);
    const key = encodeIndexedElement(mapped);
    if (!referenceDualLookup.has(key)) {
      matches = false;
      diagnostics.push(
        `compareInteractionLaws${mapping.label ? ` (${mapping.label})` : ""}: missing mapped dual ${key} in reference law.`,
      );
    } else {
      visitedDual.add(key);
    }
  }

  for (const primal of candidatePrimals) {
    const mappedPrimal = mapping.mapPrimal
      ? mapping.mapPrimal(primal)
      : (primal as unknown as IndexedElement<Obj, LeftReference>);
    const primalKey = encodeIndexedElement(mappedPrimal);
    const referencePrimal = referencePrimalLookup.get(primalKey);
    if (!referencePrimal) {
      continue;
    }

    for (const dual of candidateDuals) {
      const mappedDual = mapping.mapDual
        ? mapping.mapDual(dual)
        : (dual as unknown as IndexedElement<Obj, RightReference>);
      const dualKey = encodeIndexedElement(mappedDual);
      const referenceDual = referenceDualLookup.get(dualKey);
      if (!referenceDual) {
        continue;
      }

      const referenceValue = reference.evaluate(referencePrimal, referenceDual);
      const candidateValue = candidate.evaluate(primal, dual);
      const mappedValue = mapping.mapValue
        ? mapping.mapValue(candidateValue)
        : (candidateValue as unknown as ValueReference);
      checkedPairs += 1;
      if (!structuralValueEquals(referenceValue, mappedValue)) {
        mismatches += 1;
        matches = false;
        diagnostics.push(
          `compareInteractionLaws${mapping.label ? ` (${mapping.label})` : ""}: mismatch for pair ${primalKey} ? ${dualKey}.`,
        );
      } else {
        visitedPairs.add(`${primalKey}||${dualKey}`);
      }
    }
  }

  for (const [key] of referencePrimalLookup) {
    if (!visitedPrimal.has(key) && candidatePrimals.length > 0) {
      matches = false;
      diagnostics.push(
        `compareInteractionLaws${mapping.label ? ` (${mapping.label})` : ""}: reference primal ${key} was not produced by candidate mapping.`,
      );
    }
  }

  for (const [key] of referenceDualLookup) {
    if (!visitedDual.has(key) && candidateDuals.length > 0) {
      matches = false;
      diagnostics.push(
        `compareInteractionLaws${mapping.label ? ` (${mapping.label})` : ""}: reference dual ${key} was not produced by candidate mapping.`,
      );
    }
  }

  if (referencePrimals.length > 0 && referenceDuals.length > 0) {
    const expectedPairs = referencePrimals.length * referenceDuals.length;
    if (visitedPairs.size !== expectedPairs) {
      matches = false;
      diagnostics.push(
        `compareInteractionLaws${mapping.label ? ` (${mapping.label})` : ""}: visited ${visitedPairs.size} pairs but expected ${expectedPairs}.`,
      );
    }
  }

  return { matches, mismatches, checkedPairs, diagnostics };
};

export interface IdentityDualResult<Obj, Arr, Left, Right, Value>
  extends DualInteractionLawResult<Obj, Arr, Left, Right, Value> {
  readonly swapAgreement: InteractionLawComparisonResult;
}

const compareDualAgainstOriginal = <Obj, Arr, Left, Right, Value>(
  original: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  dual: FunctorInteractionLaw<Obj, Arr, Right, Left, Value>,
): InteractionLawComparisonResult => {
  const diagnostics: string[] = [];
  let matches = true;
  let mismatches = 0;
  let checkedPairs = 0;

  for (const primal of dual.primalCarrier) {
    for (const dualElement of dual.dualCarrier) {
      const originalValue = original.evaluate(
        dualElement as unknown as IndexedElement<Obj, Left>,
        primal as unknown as IndexedElement<Obj, Right>,
      );
      const dualValue = dual.evaluate(primal, dualElement);
      checkedPairs += 1;
      if (!structuralValueEquals(originalValue, dualValue)) {
        mismatches += 1;
        matches = false;
        diagnostics.push(
          `dualOfIdentity: mismatch when swapping (${String(primal.object)}, ${String(dualElement.object)}).`,
        );
      }
    }
  }

  return { matches, mismatches, checkedPairs, diagnostics };
};

export const dualOfIdentity = <Obj, Arr, Left, Right, Value>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  options: DualInteractionLawOptions<Obj, Arr, Left, Right, Value> = {},
): IdentityDualResult<Obj, Arr, Left, Right, Value> => {
  const result = dualInteractionLaw(law, options);
  const swapAgreement = compareDualAgainstOriginal(law, result.law);
  const diagnostics = [
    ...result.diagnostics,
    swapAgreement.matches
      ? "dualOfIdentity: dual evaluations agree with the original law after swapping arguments."
      : "dualOfIdentity: detected mismatches when comparing to the original law via argument swap.",
    ...swapAgreement.diagnostics,
  ];
  return { ...result, diagnostics, swapAgreement };
};

export interface DualOfTerminalOptions<Obj, Arr, Left, Right, Value>
  extends DualInteractionLawOptions<Obj, Arr, Left, Right, Value> {
  readonly final?: FinalInteractionLawOptions<Obj, Arr, Value>;
}

export interface DualOfTerminalResult<Obj, Arr, Left, Right, Value> {
  readonly law: FunctorInteractionLaw<Obj, Arr, SetTerminalObject, never, Value>;
  readonly reference: DualInteractionLawResult<Obj, Arr, Left, Right, Value>;
  readonly matchesReference: boolean;
  readonly diagnostics: ReadonlyArray<string>;
}

export const dualOfTerminal = <Obj, Arr, Left, Right, Value>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  options: DualOfTerminalOptions<Obj, Arr, Left, Right, Value> = {},
): DualOfTerminalResult<Obj, Arr, Left, Right, Value> => {
  const reference = dualInteractionLaw(law, options);
  const dualizing = options.final?.dualizing ?? (law.dualizing as SetObj<Value>);
  const enumerated = enumerateCarrier(dualizing as SetObj<Value>);
  const evaluationValue = options.final?.evaluationValue ?? enumerated[0];
  if (evaluationValue === undefined) {
    throw new Error("dualOfTerminal: unable to determine evaluation value for final interaction law.");
  }

  const finalLaw = finalInteractionLaw(law.kernel, {
    ...options.final,
    dualizing,
    evaluationValue,
  });

  const referencePrimalSize = Array.from(reference.law.primalCarrier).length;
  const referenceDualSize = Array.from(reference.law.dualCarrier).length;
  const finalPrimalSize = Array.from(finalLaw.primalCarrier).length;
  const finalDualSize = Array.from(finalLaw.dualCarrier).length;

  const matchesReference =
    referencePrimalSize === finalPrimalSize &&
    referenceDualSize === finalDualSize &&
    referencePrimalSize === 0 &&
    referenceDualSize === 0;

  const diagnostics = [
    ...reference.diagnostics,
    `dualOfTerminal: reference dual carriers ? primal ${referencePrimalSize}, dual ${referenceDualSize}.`,
    `dualOfTerminal: constructed final law carriers ? primal ${finalPrimalSize}, dual ${finalDualSize}.`,
    matchesReference
      ? "dualOfTerminal: both constructions collapse to the constant-zero interaction law."
      : "dualOfTerminal: mismatch between general dual and final-law construction for terminal functor.",
  ];

  return { law: finalLaw, reference, matchesReference, diagnostics };
};

export interface DualOfProductOptions<
  Obj,
  Arr,
  Left0,
  Right0,
  Value0,
  Left1,
  Right1,
  Value1,
> {
  readonly left?: DualInteractionLawOptions<Obj, Arr, Left0, Right0, Value0>;
  readonly right?: DualInteractionLawOptions<Obj, Arr, Left1, Right1, Value1>;
  readonly product?: DualInteractionLawOptions<
    Obj,
    Arr,
    readonly [Left0, Left1],
    readonly [Right0, Right1],
    readonly [Value0, Value1]
  >;
}

export interface DualOfProductResult<
  Obj,
  Arr,
  Left0,
  Right0,
  Value0,
  Left1,
  Right1,
  Value1,
> {
  readonly law: FunctorInteractionLaw<
    Obj,
    Arr,
    readonly [Right1, Right0],
    readonly [Left1, Left0],
    readonly [Value1, Value0]
  >;
  readonly projections: InteractionLawProductProjections<
    Obj,
    Right1,
    Right0,
    Left1,
    Left0,
    Value1,
    Value0
  >;
  readonly reference: DualInteractionLawResult<
    Obj,
    Arr,
    readonly [Left0, Left1],
    readonly [Right0, Right1],
    readonly [Value0, Value1]
  >;
  readonly components: {
    readonly left: DualInteractionLawResult<Obj, Arr, Left0, Right0, Value0>;
    readonly right: DualInteractionLawResult<Obj, Arr, Left1, Right1, Value1>;
  };
  readonly agreement: InteractionLawComparisonResult;
  readonly diagnostics: ReadonlyArray<string>;
}

export const dualOfProduct = <
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
  options: DualOfProductOptions<Obj, Arr, Left0, Right0, Value0, Left1, Right1, Value1> = {},
): DualOfProductResult<Obj, Arr, Left0, Right0, Value0, Left1, Right1, Value1> => {
  if (leftLaw.kernel !== rightLaw.kernel) {
    throw new Error("dualOfProduct: both laws must share the same promonoidal kernel.");
  }

  const product = productInteractionLaw(leftLaw, rightLaw);
  const reference = dualInteractionLaw(product.law, options.product ?? {});
  const left = dualInteractionLaw(leftLaw, options.left ?? {});
  const right = dualInteractionLaw(rightLaw, options.right ?? {});

  const specialized = productInteractionLaw(right.law, left.law);

  const agreement = compareInteractionLaws(
    reference.law,
    specialized.law,
    {
      label: "dualOfProduct",
      mapPrimal: (element) => ({
        object: element.object,
        element: [element.element[1], element.element[0]] as unknown as readonly [
          Right0,
          Right1,
        ],
      }),
      mapDual: (element) => ({
        object: element.object,
        element: [element.element[1], element.element[0]] as unknown as readonly [
          Left0,
          Left1,
        ],
      }),
      mapValue: (value) => [value[1], value[0]] as unknown as readonly [Value0, Value1],
    },
  );

  const diagnostics = [
    ...left.diagnostics,
    ...right.diagnostics,
    ...reference.diagnostics,
    agreement.matches
      ? "dualOfProduct: specialised dual matches the general dual after swapping factors."
      : "dualOfProduct: specialised dual differs from the general dual even after swapping factors.",
    ...agreement.diagnostics,
  ];

  return {
    law: specialized.law,
    projections: specialized.projections,
    reference,
    components: { left, right },
    agreement,
    diagnostics,
  };
};

export interface DualOfInitialOptions<Obj, Arr, Left, Right, Value>
  extends DualInteractionLawOptions<Obj, Arr, Left, Right, Value> {}

export interface DualOfInitialResult<Obj, Arr, Left, Right, Value> {
  readonly law: FunctorInteractionLaw<Obj, Arr, Right, Left, Value>;
  readonly reference: DualInteractionLawResult<Obj, Arr, Left, Right, Value>;
  readonly initialWitness: FixedLeftInitialObject<Obj, Arr, Right, Value>;
  readonly degeneracyMetadata?: ReadonlyArray<string>;
  readonly diagnostics: ReadonlyArray<string>;
}

export const dualOfInitial = <Obj, Arr, Left, Right, Value>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  options: DualOfInitialOptions<Obj, Arr, Left, Right, Value> = {},
): DualOfInitialResult<Obj, Arr, Left, Right, Value> => {
  const reference = dualInteractionLaw(law, options);
  const initialWitness = buildFixedLeftInitialObject(reference.law);

  const degeneracyMetadata = mergeMetadataList(
    reference.sweedler.degeneracyMetadata,
    law.operations?.metadata,
    initialWitness.collapse.finalLaw.operations?.metadata,
  );

  const diagnostics = [
    ...reference.diagnostics,
    "dualOfInitial: reused fixed-left initial object witness from Phase I.",
    ...(degeneracyMetadata && degeneracyMetadata.length > 0
      ? [
          `dualOfInitial: degeneracy metadata propagated ? ${degeneracyMetadata.join(
            "; ",
          )}.`,
        ]
      : ["dualOfInitial: no degeneracy metadata available for the initial witness."]),
  ];

  return {
    law: reference.law,
    reference,
    initialWitness,
    ...(degeneracyMetadata ? { degeneracyMetadata } : {}),
    diagnostics,
  };
};

export interface DualOfCoproductOptions<
  Obj,
  Arr,
  Left0,
  Right0,
  Value0,
  Left1,
  Right1,
  Value1,
> {
  readonly left?: DualInteractionLawOptions<Obj, Arr, Left0, Right0, Value0>;
  readonly right?: DualInteractionLawOptions<Obj, Arr, Left1, Right1, Value1>;
  readonly coproduct?: DualInteractionLawOptions<
    Obj,
    Arr,
    Coproduct<Left0, Left1>,
    Coproduct<Right0, Right1>,
    Coproduct<Value0, Value1>
  >;
}

export interface DualOfCoproductResult<
  Obj,
  Arr,
  Left0,
  Right0,
  Value0,
  Left1,
  Right1,
  Value1,
> {
  readonly law: FunctorInteractionLaw<
    Obj,
    Arr,
    Coproduct<Right0, Right1>,
    Coproduct<Left0, Left1>,
    Coproduct<Value0, Value1>
  >;
  readonly injections: InteractionLawCoproductInjections<
    Obj,
    Right0,
    Right1,
    Left0,
    Left1,
    Value0,
    Value1
  >;
  readonly reference: DualInteractionLawResult<
    Obj,
    Arr,
    Coproduct<Left0, Left1>,
    Coproduct<Right0, Right1>,
    Coproduct<Value0, Value1>
  >;
  readonly components: {
    readonly left: DualInteractionLawResult<Obj, Arr, Left0, Right0, Value0>;
    readonly right: DualInteractionLawResult<Obj, Arr, Left1, Right1, Value1>;
  };
  readonly agreement: InteractionLawComparisonResult;
  readonly degeneracyMetadata?: ReadonlyArray<string>;
  readonly diagnostics: ReadonlyArray<string>;
}

export const dualOfCoproduct = <
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
  options: DualOfCoproductOptions<Obj, Arr, Left0, Right0, Value0, Left1, Right1, Value1> = {},
): DualOfCoproductResult<Obj, Arr, Left0, Right0, Value0, Left1, Right1, Value1> => {
  if (leftLaw.kernel !== rightLaw.kernel) {
    throw new Error("dualOfCoproduct: both laws must use the same promonoidal kernel.");
  }

  const coproduct = coproductInteractionLaw(leftLaw, rightLaw);
  const reference = dualInteractionLaw(coproduct.law, options.coproduct ?? {});
  const left = dualInteractionLaw(leftLaw, options.left ?? {});
  const right = dualInteractionLaw(rightLaw, options.right ?? {});

  const specialized = coproductInteractionLaw(left.law, right.law);

  const agreement = compareInteractionLaws(reference.law, specialized.law, {
    label: "dualOfCoproduct",
  });

  const degeneracyMetadata = mergeMetadataList(
    reference.sweedler.degeneracyMetadata,
    left.sweedler.degeneracyMetadata,
    right.sweedler.degeneracyMetadata,
    coproduct.law.operations?.metadata,
  );

  const diagnostics = [
    ...left.diagnostics,
    ...right.diagnostics,
    ...reference.diagnostics,
    agreement.matches
      ? "dualOfCoproduct: specialised dual matches the general dual without additional stretching."
      : "dualOfCoproduct: specialised dual differs from the general dual; inspect agreement diagnostics.",
    ...agreement.diagnostics,
    ...(degeneracyMetadata && degeneracyMetadata.length > 0
      ? [
          `dualOfCoproduct: degeneracy metadata propagated ? ${degeneracyMetadata.join(
            "; ",
          )}.`,
        ]
      : ["dualOfCoproduct: no degeneracy metadata available for coproduct witnesses."]),
  ];

  return {
    law: specialized.law,
    injections: specialized.injections,
    reference,
    components: { left, right },
    agreement,
    ...(degeneracyMetadata ? { degeneracyMetadata } : {}),
    diagnostics,
  };
};

export interface DualOfWeightedSumOptions<Obj, Arr, Left, Right, Value, Weight>
  extends DualInteractionLawOptions<Obj, Arr, Left, Right, Value> {
  readonly weights: SetObj<Weight>;
  readonly weightMetadata?: ReadonlyArray<string>;
}

export interface DualOfWeightedSumResult<Obj, Arr, Left, Right, Value, Weight> {
  readonly law: FunctorInteractionLaw<Obj, Arr, Right, Left, Value>;
  readonly reference: DualInteractionLawResult<Obj, Arr, Left, Right, Value>;
  readonly weights: SetObj<Weight>;
  readonly degeneracyMetadata?: ReadonlyArray<string>;
  readonly diagnostics: ReadonlyArray<string>;
}

export const dualOfWeightedSum = <Obj, Arr, Left, Right, Value, Weight>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  options: DualOfWeightedSumOptions<Obj, Arr, Left, Right, Value, Weight>,
): DualOfWeightedSumResult<Obj, Arr, Left, Right, Value, Weight> => {
  const reference = dualInteractionLaw(law, options);
  const weights = options.weights;
  const enumeratedWeights = Array.from(weights.values());

  const degeneracyMetadata = mergeMetadataList(
    reference.sweedler.degeneracyMetadata,
    law.operations?.metadata,
    options.weightMetadata,
  );

  const diagnostics = [
    ...reference.diagnostics,
    `dualOfWeightedSum: enumerated ${enumeratedWeights.length} weight elements for the Day integral witness.`,
    ...(degeneracyMetadata && degeneracyMetadata.length > 0
      ? [
          `dualOfWeightedSum: degeneracy metadata propagated ? ${degeneracyMetadata.join(
            "; ",
          )}.`,
        ]
      : ["dualOfWeightedSum: no degeneracy metadata supplied for the weighted sum witnesses."]),
  ];

  return {
    law: reference.law,
    reference,
    weights,
    ...(degeneracyMetadata ? { degeneracyMetadata } : {}),
    diagnostics,
  };
};

export interface DualLowerBoundAssignment<Obj, Arr, Left, Right, Value> {
  readonly primal: IndexedElement<Obj, Left>;
  readonly dual: IndexedElement<Obj, Right>;
  readonly contributions: ReadonlyArray<DayPairingContribution<Obj, Arr, Left, Right, Value>>;
}

export interface DualLowerBoundCoverage<Obj, Right> {
  readonly object: Obj;
  readonly totalAssignments: number;
  readonly uniqueTargets: number;
  readonly targetCardinality: number;
  readonly isIsomorphism: boolean;
  readonly uncoveredTargets: ReadonlyArray<IndexedElement<Obj, Right>>;
}

export interface DualLowerBoundComponent<Obj, Arr, Left, Right, Value> {
  readonly object: Obj;
  readonly assignments: ReadonlyArray<DualLowerBoundAssignment<Obj, Arr, Left, Right, Value>>;
  readonly carrier: SetObj<DualLowerBoundAssignment<Obj, Arr, Left, Right, Value>>;
  readonly comparison: SetHom<
    DualLowerBoundAssignment<Obj, Arr, Left, Right, Value>,
    IndexedElement<Obj, Right>
  >;
  readonly coverage: DualLowerBoundCoverage<Obj, Right>;
}

export interface DualLowerBoundOptions<Obj, Arr, Left, Right, Value>
  extends DualInteractionLawOptions<Obj, Arr, Left, Right, Value> {
  readonly metadata?: ReadonlyArray<string>;
}

export interface DualLowerBoundResult<Obj, Arr, Left, Right, Value> {
  readonly reference: DualInteractionLawResult<Obj, Arr, Left, Right, Value>;
  readonly components: ReadonlyArray<DualLowerBoundComponent<Obj, Arr, Left, Right, Value>>;
  readonly degeneracyMetadata?: ReadonlyArray<string>;
  readonly diagnostics: ReadonlyArray<string>;
}

const makeAssignmentCarrier = <Obj, Arr, Left, Right, Value>(
  object: Obj,
  assignments: ReadonlyArray<DualLowerBoundAssignment<Obj, Arr, Left, Right, Value>>,
): SetObj<DualLowerBoundAssignment<Obj, Arr, Left, Right, Value>> =>
  SetCat.obj(assignments, {
    tag: `DualLowerBound(${String(object)})`,
    equals: (left, right) =>
      Object.is(left.primal.object, right.primal.object) &&
      Object.is(left.dual.object, right.dual.object) &&
      structuralValueEquals(left.primal.element, right.primal.element) &&
      structuralValueEquals(left.dual.element, right.dual.element),
  });

const collectAssignments = <Obj, Arr, Left, Right, Value>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  object: Obj,
  primals: ReadonlyArray<IndexedElement<Obj, Left>>,
  duals: ReadonlyArray<IndexedElement<Obj, Right>>,
): ReadonlyArray<DualLowerBoundAssignment<Obj, Arr, Left, Right, Value>> => {
  const assignments = new Map<string, DualLowerBoundAssignment<Obj, Arr, Left, Right, Value>>();

  for (const primal of primals) {
    if (!Object.is(primal.object, object)) {
      continue;
    }
    for (const dual of duals) {
      const contributions = law
        .collect(primal, dual)
        .filter((entry) => Object.is(entry.output, object));
      if (contributions.length === 0) {
        continue;
      }
      const key = `${encodeIndexedElement(primal)}||${encodeIndexedElement(dual)}`;
      if (!assignments.has(key)) {
        assignments.set(key, {
          primal,
          dual,
          contributions,
        });
      }
    }
  }

  return Array.from(assignments.values());
};

const buildCoverage = <Obj, Arr, Left, Right, Value>(
  object: Obj,
  assignments: ReadonlyArray<DualLowerBoundAssignment<Obj, Arr, Left, Right, Value>>,
  targets: ReadonlyArray<IndexedElement<Obj, Right>>,
): DualLowerBoundCoverage<Obj, Right> => {
  const uniqueTargets = new Map<string, IndexedElement<Obj, Right>>();
  for (const assignment of assignments) {
    uniqueTargets.set(encodeIndexedElement(assignment.dual), assignment.dual);
  }

  const uncovered = targets.filter(
    (target) => !uniqueTargets.has(encodeIndexedElement(target)),
  );

  const isIsomorphism =
    uncovered.length === 0 && uniqueTargets.size === assignments.length;

  return {
    object,
    totalAssignments: assignments.length,
    uniqueTargets: uniqueTargets.size,
    targetCardinality: targets.length,
    isIsomorphism,
    uncoveredTargets: uncovered,
  };
};

export const dualLowerBound = <Obj, Arr, Left, Right, Value>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  options: DualLowerBoundOptions<Obj, Arr, Left, Right, Value> = {},
): DualLowerBoundResult<Obj, Arr, Left, Right, Value> => {
  const reference = dualInteractionLaw(law, options);

  const primals = enumerateCarrier(law.primalCarrier);
  const duals = enumerateCarrier(law.dualCarrier);
  const targetsByObject = new Map<Obj, Array<IndexedElement<Obj, Right>>>();
  for (const element of enumerateCarrier(reference.law.primalCarrier)) {
    const list = targetsByObject.get(element.object);
    if (list) {
      list.push(element);
    } else {
      targetsByObject.set(element.object, [element]);
    }
  }

  const components: Array<DualLowerBoundComponent<Obj, Arr, Left, Right, Value>> = [];
  const componentDiagnostics: string[] = [];

  for (const object of law.kernel.base.objects) {
    const assignments = collectAssignments(law, object, primals, duals);
    if (assignments.length === 0) {
      componentDiagnostics.push(
        `dualLowerBound: no Day contributions found for object ${String(object)}; canonical map is empty.`,
      );
    }

    const carrier = makeAssignmentCarrier(object, assignments);
    const comparison = SetCat.hom(
      carrier,
      reference.law.primalCarrier,
      (assignment) => assignment.dual,
    );

    const coverage = buildCoverage(
      object,
      assignments,
      targetsByObject.get(object) ?? [],
    );

    componentDiagnostics.push(
      coverage.isIsomorphism
        ? `dualLowerBound: canonical map for ${String(object)} is an isomorphism onto the dual carrier.`
        : `dualLowerBound: canonical map for ${String(object)} covers ${coverage.uniqueTargets} of ${coverage.targetCardinality} dual elements; ${coverage.uncoveredTargets.length} remain.`,
    );

    components.push({
      object,
      assignments,
      carrier,
      comparison,
      coverage,
    });
  }

  const degeneracyMetadata = mergeMetadataList(
    reference.sweedler.degeneracyMetadata,
    law.operations?.metadata,
    options.metadata,
  );

  const diagnostics = [
    ...reference.diagnostics,
    `dualLowerBound: analysed ${components.reduce(
      (total, component) => total + component.assignments.length,
      0,
    )} Day pairing assignments across ${components.length} object(s).`,
    ...componentDiagnostics,
    ...(degeneracyMetadata && degeneracyMetadata.length > 0
      ? [
          `dualLowerBound: degeneracy metadata propagated ? ${degeneracyMetadata.join(
            "; ",
          )}.`,
        ]
      : ["dualLowerBound: no degeneracy metadata supplied for the canonical comparison."]),
  ];

  return {
    reference,
    components,
    ...(degeneracyMetadata ? { degeneracyMetadata } : {}),
    diagnostics,
  };
};

export interface ExponentialIdentityCardinalitySummary<Obj> {
  readonly object: Obj;
  readonly parameterCardinality: number;
  readonly originalCardinality: number;
  readonly dualCardinality: number;
  readonly expectedCardinality: number;
  readonly matches: boolean;
}

export interface DualOfExponentialIdentityOptions<Obj, Arr, Left, Right, Value, Parameter>
  extends DualInteractionLawOptions<Obj, Arr, Left, Right, Value> {
  readonly parameter: SetObj<Parameter>;
  readonly metadata?: ReadonlyArray<string>;
}

export interface DualOfExponentialIdentityResult<
  Obj,
  Arr,
  Left,
  Right,
  Value,
  Parameter,
> {
  readonly law: FunctorInteractionLaw<Obj, Arr, Right, Left, Value>;
  readonly reference: DualInteractionLawResult<Obj, Arr, Left, Right, Value>;
  readonly parameter: SetObj<Parameter>;
  readonly cardinalities: ReadonlyArray<ExponentialIdentityCardinalitySummary<Obj>>;
  readonly degeneracyMetadata?: ReadonlyArray<string>;
  readonly diagnostics: ReadonlyArray<string>;
}

export const dualOfExponentialIdentity = <Obj, Arr, Left, Right, Value, Parameter>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  options: DualOfExponentialIdentityOptions<Obj, Arr, Left, Right, Value, Parameter>,
): DualOfExponentialIdentityResult<Obj, Arr, Left, Right, Value, Parameter> => {
  const reference = dualInteractionLaw(law, options);
  const parameterElements = enumerateCarrier(options.parameter);
  const parameterCardinality = parameterElements.length;

  const cardinalities: Array<ExponentialIdentityCardinalitySummary<Obj>> = [];
  for (const object of law.kernel.base.objects) {
    const originalCarrier = law.right.functor.F0(object);
    const dualCarrier = reference.law.left.functor.F0(object);
    const originalCardinality = enumerateCarrier(originalCarrier).length;
    const dualCardinality = enumerateCarrier(dualCarrier).length;
    const expectedCardinality = originalCardinality * parameterCardinality;
    cardinalities.push({
      object,
      parameterCardinality,
      originalCardinality,
      dualCardinality,
      expectedCardinality,
      matches: dualCardinality === expectedCardinality,
    });
  }

  const degeneracyMetadata = mergeMetadataList(
    reference.sweedler.degeneracyMetadata,
    law.operations?.metadata,
    options.metadata,
  );

  const diagnostics = [
    ...reference.diagnostics,
    `dualOfExponentialIdentity: parameter cardinality ${parameterCardinality}.`,
    ...cardinalities.map((entry) =>
      `dualOfExponentialIdentity: object ${String(entry.object)} ? original ${entry.originalCardinality}, dual ${entry.dualCardinality}, expected ${entry.expectedCardinality}.`,
    ),
    ...(degeneracyMetadata && degeneracyMetadata.length > 0
      ? [
          `dualOfExponentialIdentity: degeneracy metadata propagated ? ${degeneracyMetadata.join(
            "; ",
          )}.`,
        ]
      : [
          "dualOfExponentialIdentity: no degeneracy metadata supplied for exponential identity witnesses.",
        ]),
  ];

  return {
    law: reference.law,
    reference,
    parameter: options.parameter,
    cardinalities,
    ...(degeneracyMetadata ? { degeneracyMetadata } : {}),
    diagnostics,
  };
};

export interface PositiveListLengthSummary<Obj> {
  readonly object: Obj;
  readonly length: number;
  readonly count: number;
}

export interface PositiveListThetaSummary<Obj, Element> {
  readonly object: Obj;
  readonly length: number;
  readonly sequences: ReadonlyArray<ReadonlyArray<Element>>;
}

export interface DualOfPositiveListOptions<Obj, Arr, Left, Right, Value, Element>
  extends DualInteractionLawOptions<Obj, Arr, Left, Right, Value> {
  readonly decodeList: (input: { object: Obj; element: Right }) => ReadonlyArray<Element>;
  readonly metadata?: ReadonlyArray<string>;
}

export interface DualOfPositiveListResult<Obj, Arr, Left, Right, Value, Element> {
  readonly law: FunctorInteractionLaw<Obj, Arr, Right, Left, Value>;
  readonly reference: DualInteractionLawResult<Obj, Arr, Left, Right, Value>;
  readonly thetaSummaries: ReadonlyArray<PositiveListThetaSummary<Obj, Element>>;
  readonly lengthSummaries: ReadonlyArray<PositiveListLengthSummary<Obj>>;
  readonly degeneracyMetadata?: ReadonlyArray<string>;
  readonly diagnostics: ReadonlyArray<string>;
}

export const dualOfPositiveList = <Obj, Arr, Left, Right, Value, Element>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  options: DualOfPositiveListOptions<Obj, Arr, Left, Right, Value, Element>,
): DualOfPositiveListResult<Obj, Arr, Left, Right, Value, Element> => {
  const reference = dualInteractionLaw(law, options);
  const thetaSummaries: Array<PositiveListThetaSummary<Obj, Element>> = [];
  const lengthSummaries: Array<PositiveListLengthSummary<Obj>> = [];
  const zeroLengthDiagnostics: Array<string> = [];

  for (const object of law.kernel.base.objects) {
    const elements = enumerateCarrier(law.right.functor.F0(object));
    const lengthMap = new Map<number, Array<ReadonlyArray<Element>>>();
    for (const element of elements) {
      const sequence = Array.from(options.decodeList({ object, element }));
      if (sequence.length === 0) {
        zeroLengthDiagnostics.push(
          `dualOfPositiveList: decodeList returned an empty sequence for object ${String(object)}; positive-list witnesses expect strictly positive length.`,
        );
        continue;
      }
      const current = lengthMap.get(sequence.length) ?? [];
      current.push(sequence);
      lengthMap.set(sequence.length, current);
    }

    for (const [length, sequences] of lengthMap) {
      lengthSummaries.push({ object, length, count: sequences.length });
      thetaSummaries.push({ object, length, sequences });
    }
  }

  const degeneracyMetadata = mergeMetadataList(
    reference.sweedler.degeneracyMetadata,
    law.operations?.metadata,
    options.metadata,
  );

  const diagnostics = [
    ...reference.diagnostics,
    `dualOfPositiveList: collected ?_n summaries for ${thetaSummaries.length} length classes.`,
    ...thetaSummaries.map((summary) => {
      const preview = summary.sequences
        .slice(0, 3)
        .map((sequence) => `[${sequence.map((value) => String(value)).join(", ")}]`)
        .join(", ");
      const suffix = summary.sequences.length > 3 ? ", ?" : "";
      return `dualOfPositiveList: ?_${summary.length} on ${String(summary.object)} captures ${summary.sequences.length} sequences${
        preview ? ` (${preview}${suffix})` : ""
      }.`;
    }),
    ...zeroLengthDiagnostics,
    ...(degeneracyMetadata && degeneracyMetadata.length > 0
      ? [
          `dualOfPositiveList: degeneracy metadata propagated ? ${degeneracyMetadata.join("; ")}.`,
        ]
      : ["dualOfPositiveList: no degeneracy metadata supplied for positive-list witnesses."]),
  ];

  return {
    law: reference.law,
    reference,
    thetaSummaries,
    lengthSummaries,
    ...(degeneracyMetadata ? { degeneracyMetadata } : {}),
    diagnostics,
  };
};

export interface LaxMonoidalDualComparisonOptions<
  Obj,
  Arr,
  Left0,
  Right0,
  Value0,
  Left1,
  Right1,
  Value1,
> extends DualOfProductOptions<Obj, Arr, Left0, Right0, Value0, Left1, Right1, Value1> {}

export interface LaxMonoidalDualComparisonObjectSummary<Obj> {
  readonly object: Obj;
  readonly checkedPairs: number;
  readonly mismatches: number;
  readonly consistent: boolean;
  readonly diagnostics: ReadonlyArray<string>;
}

export interface LaxMonoidalDualComparisonValueMap<Value0, Value1> {
  readonly domain: SetObj<readonly [Value1, Value0]>;
  readonly codomain: SetObj<readonly [Value0, Value1]>;
  readonly map: SetHom<readonly [Value1, Value0], readonly [Value0, Value1]>;
  readonly table: ReadonlyArray<{
    readonly input: readonly [Value1, Value0];
    readonly output: readonly [Value0, Value1];
  }>;
  readonly injective: boolean;
  readonly surjective: boolean;
  readonly bijective: boolean;
  readonly diagnostics: ReadonlyArray<string>;
}

export interface LaxMonoidalDualComparisonResult<
  Obj,
  Arr,
  Left0,
  Right0,
  Value0,
  Left1,
  Right1,
  Value1,
> {
  readonly domain: FunctorInteractionLaw<
    Obj,
    Arr,
    readonly [Right1, Right0],
    readonly [Left1, Left0],
    readonly [Value1, Value0]
  >;
  readonly reference: DualInteractionLawResult<
    Obj,
    Arr,
    readonly [Left0, Left1],
    readonly [Right0, Right1],
    readonly [Value0, Value1]
  >;
  readonly components: ReadonlyArray<LaxMonoidalDualComparisonObjectSummary<Obj>>;
  readonly valueMap: LaxMonoidalDualComparisonValueMap<Value0, Value1>;
  readonly comparison: InteractionLawComparisonResult;
  readonly diagnostics: ReadonlyArray<string>;
  readonly degeneracyMetadata?: ReadonlyArray<string>;
}

const swapPrimalPair = <Obj, Right0, Right1>(
  element: IndexedElement<Obj, readonly [Right0, Right1]>,
): IndexedElement<Obj, readonly [Right1, Right0]> => ({
  object: element.object,
  element: [element.element[1], element.element[0]] as unknown as readonly [
    Right1,
    Right0,
  ],
});

const swapDualPair = <Obj, Left0, Left1>(
  element: IndexedElement<Obj, readonly [Left0, Left1]>,
): IndexedElement<Obj, readonly [Left1, Left0]> => ({
  object: element.object,
  element: [element.element[1], element.element[0]] as unknown as readonly [
    Left1,
    Left0,
  ],
});

const swapValuePair = <Value0, Value1>(
  value: readonly [Value0, Value1],
): readonly [Value1, Value0] => [value[1], value[0]] as unknown as readonly [
  Value1,
  Value0,
];

export const laxMonoidalDualComparison = <
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
  options: LaxMonoidalDualComparisonOptions<
    Obj,
    Arr,
    Left0,
    Right0,
    Value0,
    Left1,
    Right1,
    Value1
  > = {},
): LaxMonoidalDualComparisonResult<
  Obj,
  Arr,
  Left0,
  Right0,
  Value0,
  Left1,
  Right1,
  Value1
> => {
  const product = dualOfProduct(leftLaw, rightLaw, options);

  const { law: domain } = product;
  const reference = product.reference;

  const valueMapDomain = domain.dualizing as SetObj<readonly [Value1, Value0]>;
  const valueMapCodomain = reference.law.dualizing as SetObj<readonly [Value0, Value1]>;
  const swapForHom = (value: readonly [Value1, Value0]) =>
    [value[1], value[0]] as unknown as readonly [Value0, Value1];
  const map = SetCat.hom(valueMapDomain, valueMapCodomain, swapForHom);

  const domainValues = enumerateCarrier(valueMapDomain);
  const codomainValues = enumerateCarrier(valueMapCodomain);
  const table = domainValues.map((input) => ({ input, output: swapForHom(input) }));
  const serializedOutputs = new Set(table.map((entry) => JSON.stringify(entry.output)));
  const injective = serializedOutputs.size === table.length;
  const surjective = codomainValues.every((candidate) =>
    table.some((entry) => structuralValueEquals(entry.output, candidate)),
  );
  const bijective = injective && surjective;
  const valueMapDiagnostics = [
    `laxMonoidalDualComparison: value map covers ${table.length} element(s).`,
    injective
      ? "laxMonoidalDualComparison: value map is injective across the dualising set."
      : "laxMonoidalDualComparison: value map is not injective; duplicated images detected.",
    surjective
      ? "laxMonoidalDualComparison: value map is surjective onto the codomain dualising set."
      : "laxMonoidalDualComparison: value map is not surjective; some codomain values are absent.",
  ];

  const components: Array<LaxMonoidalDualComparisonObjectSummary<Obj>> = [];
  const mismatchDiagnostics: string[] = [];

  for (const object of reference.law.kernel.base.objects) {
    let checkedPairs = 0;
    let mismatches = 0;
    for (const primal of reference.law.primalCarrier) {
      if (!Object.is(primal.object, object)) {
        continue;
      }
      for (const dual of reference.law.dualCarrier) {
        const domainPrimal = swapPrimalPair(primal);
        const domainDual = swapDualPair(dual);
        const referenceValue = reference.law.evaluate(primal, dual);
        const domainValue = domain.evaluate(domainPrimal, domainDual);
        const mappedValue = swapValuePair(domainValue);
        checkedPairs += 1;
        if (!structuralValueEquals(referenceValue, mappedValue)) {
          mismatches += 1;
          if (mismatchDiagnostics.length < 4) {
            mismatchDiagnostics.push(
              `laxMonoidalDualComparison: mismatch on object ${String(object)} with primal ${JSON.stringify(
                primal.element,
              )} and dual ${JSON.stringify(dual.element)} ? specialised value ${JSON.stringify(
                domainValue,
              )} maps to ${JSON.stringify(mappedValue)} but reference produced ${JSON.stringify(
                referenceValue,
              )}.`,
            );
          }
        }
      }
    }
    const diagnostics: string[] = [
      `laxMonoidalDualComparison: analysed ${checkedPairs} comparison pair(s) on ${String(object)}.`,
    ];
    if (mismatches === 0) {
      diagnostics.push(
        `laxMonoidalDualComparison: comparison agrees with reference evaluations on ${String(object)}.`,
      );
    } else {
      diagnostics.push(
        `laxMonoidalDualComparison: detected ${mismatches} mismatch(es) on ${String(object)}; see detailed diagnostics.`,
      );
    }
    components.push({
      object,
      checkedPairs,
      mismatches,
      consistent: mismatches === 0,
      diagnostics,
    });
  }

  const degeneracyMetadata = mergeMetadataList(
    reference.sweedler.degeneracyMetadata,
    product.components.left.sweedler.degeneracyMetadata,
    product.components.right.sweedler.degeneracyMetadata,
    leftLaw.operations?.metadata,
    rightLaw.operations?.metadata,
  );

  const diagnostics = [
    ...product.diagnostics,
    ...valueMapDiagnostics,
    ...components.flatMap((component) => component.diagnostics),
    ...mismatchDiagnostics,
    product.agreement.matches
      ? "laxMonoidalDualComparison: specialised comparison aligns with the general dual."
      : "laxMonoidalDualComparison: specialised comparison diverges from the general dual; investigate diagnostics.",
    bijective
      ? "laxMonoidalDualComparison: value-level swap witness is a bijection (comparison isomorphism)."
      : "laxMonoidalDualComparison: value-level swap witness is not bijective; lax structure fails to be invertible.",
    ...(degeneracyMetadata && degeneracyMetadata.length > 0
      ? [
          `laxMonoidalDualComparison: degeneracy metadata propagated ? ${degeneracyMetadata.join(
            "; ",
          )}.`,
        ]
      : [
          "laxMonoidalDualComparison: no degeneracy metadata supplied for the comparison witnesses.",
        ]),
  ];

  return {
    domain,
    reference,
    components,
    valueMap: {
      domain: valueMapDomain,
      codomain: valueMapCodomain,
      map,
      table,
      injective,
      surjective,
      bijective,
      diagnostics: valueMapDiagnostics,
    },
    comparison: product.agreement,
    diagnostics,
    ...(degeneracyMetadata ? { degeneracyMetadata } : {}),
  };
};

export const finalInteractionLaw = <Obj, Arr, Value = boolean>(
  kernel: PromonoidalKernel<Obj, Arr>,
  options: FinalInteractionLawOptions<Obj, Arr, Value> = {},
): FunctorInteractionLaw<Obj, Arr, SetTerminalObject, never, Value> => {
  const terminalData = SetCat.terminal();
  const terminal = terminalData.object;
  const initialData = SetCat.initial();
  const initial = initialData.object;
  const evaluationValue = options.evaluationValue ?? ((false as unknown) as Value);
  const dualizing = options.dualizing ?? (SetCat.obj([false, true], { tag: "FinalDualizing" }) as SetObj<Value>);

  const terminalSimpleCategory = setSimpleCategory as unknown as SimpleCat<
    SetObj<SetTerminalObject>,
    SetHom<SetTerminalObject, SetTerminalObject>
  >;

  const left = constructContravariantFunctorWithWitness(
    kernel.base,
    terminalSimpleCategory,
    {
      F0: () => terminal,
      F1: () => SetCat.id(terminal),
    },
  );

  const initialSimpleCategory = setSimpleCategory as unknown as SimpleCat<
    SetObj<never>,
    SetHom<never, never>
  >;

  const right = constructFunctorWithWitness(
    kernel.base,
    initialSimpleCategory,
    {
      F0: () => initial,
      F1: () => SetCat.id(initial),
    },
  );

  const convolution = dayTensor(kernel, left, right);

  const pairing = (
    _object: Obj,
    carrier: ReturnType<typeof convolution.functor.functor.F0>,
  ) => SetCat.hom(carrier, dualizing, () => evaluationValue);

  const aggregate: DayPairingAggregator<Obj, Arr, SetTerminalObject, never, Value> = () => evaluationValue;

  return makeFunctorInteractionLaw({
    kernel,
    left,
    right,
    convolution,
    dualizing,
    pairing,
    aggregate,
    ...(options.tags ? { tags: options.tags } : {}),
    ...(options.operations ? { operations: options.operations } : {}),
  });
};

const mergeOperations = <Obj, Arr>(
  first: FunctorInteractionLawOperations<Obj, Arr> | undefined,
  second: FunctorInteractionLawOperations<Obj, Arr> | undefined,
): FunctorInteractionLawOperations<Obj, Arr> | undefined => {
  if (!first && !second) {
    return undefined;
  }
  const monadOperations = [
    ...(first?.monadOperations ?? []),
    ...(second?.monadOperations ?? []),
  ];
  const comonadCooperations = [
    ...(first?.comonadCooperations ?? []),
    ...(second?.comonadCooperations ?? []),
  ];
  const metadata = [...(first?.metadata ?? []), ...(second?.metadata ?? [])];
  if (metadata.length === 0 && monadOperations.length === 0 && comonadCooperations.length === 0) {
    return undefined;
  }
  return {
    ...(monadOperations.length > 0 ? { monadOperations } : {}),
    ...(comonadCooperations.length > 0 ? { comonadCooperations } : {}),
    ...(metadata.length > 0 ? { metadata } : {}),
  };
};

const buildFiberLookup = <Obj, Arr, Left, Right, Value>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
): Map<Obj, typeof law.convolution.fibers[number]> => {
  const lookup = new Map<Obj, typeof law.convolution.fibers[number]>();
  for (const fiber of law.convolution.fibers) {
    lookup.set(fiber.output, fiber);
  }
  return lookup;
};

const evaluateWitnessForLaw = <Obj, Arr, Left, Right, Value>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  fiberLookup: Map<Obj, typeof law.convolution.fibers[number]>,
  object: Obj,
  diagonal: Obj,
  witness: {
    readonly kernelLeft: Obj;
    readonly kernelRight: Obj;
    readonly output: Obj;
    readonly kernelValue: PromonoidalTensorValue<Obj, Arr>;
    readonly leftElement: Left;
    readonly rightElement: Right;
  },
): Value => {
  const fiber = fiberLookup.get(object);
  if (!fiber) {
    throw new Error(`productInteractionLaw: missing Day fiber for ${String(object)}.`);
  }
  const classification = fiber.classify(diagonal, witness as typeof fiber.classes[number]["witness"]);
  if (!classification) {
    throw new Error(
      `productInteractionLaw: unable to classify witness for object ${String(object)}.`,
    );
  }
  const component = law.getPairingComponent(object);
  if (!component) {
    throw new Error(
      `productInteractionLaw: missing pairing component for object ${String(object)}.`,
    );
  }
  return component.map(classification);
};

export const productInteractionLaw = <
  Obj,
  Arr,
  Left0,
  Right0,
  Value0,
  Left1,
  Right1,
  Value1,
>(
  law0: FunctorInteractionLaw<Obj, Arr, Left0, Right0, Value0>,
  law1: FunctorInteractionLaw<Obj, Arr, Left1, Right1, Value1>,
): ProductInteractionLawResult<Obj, Arr, Left0, Right0, Value0, Left1, Right1, Value1> => {
  if (law0.kernel !== law1.kernel) {
    throw new Error("productInteractionLaw: both laws must use the same promonoidal kernel.");
  }

  const { kernel } = law0;
  const leftProducts = new Map<Obj, ProductData<Left0, Left1>>();
  const rightProducts = new Map<Obj, ProductData<Right0, Right1>>();

  const getLeftProduct = (object: Obj): ProductData<Left0, Left1> => {
    let product = leftProducts.get(object);
    if (!product) {
      product = SetCat.product(
        law0.left.functor.F0(object),
        law1.left.functor.F0(object),
      );
      leftProducts.set(object, product);
    }
    return product;
  };

  const getRightProduct = (object: Obj): ProductData<Right0, Right1> => {
    let product = rightProducts.get(object);
    if (!product) {
      product = SetCat.product(
        law0.right.functor.F0(object),
        law1.right.functor.F0(object),
      );
      rightProducts.set(object, product);
    }
    return product;
  };

  const leftPairSimpleCategory = setSimpleCategory as unknown as SimpleCat<
    SetObj<readonly [Left0, Left1]>,
    SetHom<readonly [Left0, Left1], readonly [Left0, Left1]>
  >;

  const left = constructContravariantFunctorWithWitness(
    kernel.base,
    leftPairSimpleCategory,
    {
      F0: (object) => getLeftProduct(object).object,
      F1: (arrow) => {
        const domain = getLeftProduct(kernel.base.dst(arrow));
        const codomain = getLeftProduct(kernel.base.src(arrow));
        const map0 = law0.left.functor.F1(arrow);
        const map1 = law1.left.functor.F1(arrow);
        return SetCat.hom(domain.object, codomain.object, (pair) => (
          [
            map0.map(pair[0]),
            map1.map(pair[1]),
          ] as const
        )) as SetHom<readonly [Left0, Left1], readonly [Left0, Left1]>;
      },
    },
  );

  const rightPairSimpleCategory = setSimpleCategory as unknown as SimpleCat<
    SetObj<readonly [Right0, Right1]>,
    SetHom<readonly [Right0, Right1], readonly [Right0, Right1]>
  >;

  const right = constructFunctorWithWitness(
    kernel.base,
    rightPairSimpleCategory,
    {
      F0: (object) => getRightProduct(object).object,
      F1: (arrow) => {
        const domain = getRightProduct(kernel.base.src(arrow));
        const codomain = getRightProduct(kernel.base.dst(arrow));
        const map0 = law0.right.functor.F1(arrow);
        const map1 = law1.right.functor.F1(arrow);
        return SetCat.hom(domain.object, codomain.object, (pair) => (
          [
            map0.map(pair[0]),
            map1.map(pair[1]),
          ] as const
        )) as SetHom<readonly [Right0, Right1], readonly [Right0, Right1]>;
      },
    },
  );

  const convolution = dayTensor(kernel, left, right);
  const dualizingProduct = SetCat.product(law0.dualizing, law1.dualizing);

  const fiber0 = buildFiberLookup(law0);
  const fiber1 = buildFiberLookup(law1);

  const pairing = (
    object: Obj,
    carrier: ReturnType<typeof convolution.functor.functor.F0>,
  ) => SetCat.hom(carrier, dualizingProduct.object, (cls) => {
    const data = cls as {
      readonly diagonalObject: Obj;
      readonly witness: {
        readonly kernelLeft: Obj;
        readonly kernelRight: Obj;
        readonly output: Obj;
        readonly kernelValue: PromonoidalTensorValue<Obj, Arr>;
        readonly leftElement: readonly [Left0, Left1];
        readonly rightElement: readonly [Right0, Right1];
      };
    };

    const value0 = evaluateWitnessForLaw(law0, fiber0, object, data.diagonalObject, {
      kernelLeft: data.witness.kernelLeft,
      kernelRight: data.witness.kernelRight,
      output: data.witness.output,
      kernelValue: data.witness.kernelValue,
      leftElement: data.witness.leftElement[0],
      rightElement: data.witness.rightElement[0],
    });

    const value1 = evaluateWitnessForLaw(law1, fiber1, object, data.diagonalObject, {
      kernelLeft: data.witness.kernelLeft,
      kernelRight: data.witness.kernelRight,
      output: data.witness.output,
      kernelValue: data.witness.kernelValue,
      leftElement: data.witness.leftElement[1],
      rightElement: data.witness.rightElement[1],
    });

    return dualizingProduct.lookup?.(value0, value1) ?? ([value0, value1] as const);
  });

  const aggregate: DayPairingAggregator<
    Obj,
    Arr,
    readonly [Left0, Left1],
    readonly [Right0, Right1],
    readonly [Value0, Value1]
  > = (contributions) => {
    const mapped0 = contributions.map<DayPairingContribution<Obj, Arr, Left0, Right0, Value0>>((entry) => ({
      output: entry.output,
      diagonal: entry.diagonal,
      kernelLeft: entry.kernelLeft,
      kernelRight: entry.kernelRight,
      kernelValue: entry.kernelValue,
      left: {
        object: entry.left.object,
        element: entry.left.element[0],
      },
      right: {
        object: entry.right.object,
        element: entry.right.element[0],
      },
      evaluation: evaluateWitnessForLaw(law0, fiber0, entry.output, entry.diagonal, {
        kernelLeft: entry.kernelLeft,
        kernelRight: entry.kernelRight,
        output: entry.output,
        kernelValue: entry.kernelValue,
        leftElement: entry.left.element[0],
        rightElement: entry.right.element[0],
      }),
    }));

    const mapped1 = contributions.map<DayPairingContribution<Obj, Arr, Left1, Right1, Value1>>((entry) => ({
      output: entry.output,
      diagonal: entry.diagonal,
      kernelLeft: entry.kernelLeft,
      kernelRight: entry.kernelRight,
      kernelValue: entry.kernelValue,
      left: {
        object: entry.left.object,
        element: entry.left.element[1],
      },
      right: {
        object: entry.right.object,
        element: entry.right.element[1],
      },
      evaluation: evaluateWitnessForLaw(law1, fiber1, entry.output, entry.diagonal, {
        kernelLeft: entry.kernelLeft,
        kernelRight: entry.kernelRight,
        output: entry.output,
        kernelValue: entry.kernelValue,
        leftElement: entry.left.element[1],
        rightElement: entry.right.element[1],
      }),
    }));

    const value0 = law0.aggregate(mapped0);
    const value1 = law1.aggregate(mapped1);
    return dualizingProduct.lookup?.(value0, value1) ?? ([value0, value1] as const);
  };

  const mergedOperations = mergeOperations(law0.operations, law1.operations);

  const law = makeFunctorInteractionLaw({
    kernel,
    left,
    right,
    convolution,
    dualizing: dualizingProduct.object,
    pairing,
    aggregate,
    ...(mergedOperations ? { operations: mergedOperations } : {}),
  });

  const projections: InteractionLawProductProjections<
    Obj,
    Left0,
    Left1,
    Right0,
    Right1,
    Value0,
    Value1
  > = {
    left: (object) => getLeftProduct(object),
    right: (object) => getRightProduct(object),
    value: dualizingProduct,
  };

  return { law, projections };
};

const projectIndexedElementSecond = <Obj, First, Second>(
  element: IndexedElement<Obj, readonly [First, Second]>,
): IndexedElement<Obj, Second> => ({
  object: element.object,
  element: element.element[1],
});

const projectIndexedElementFirst = <Obj, First, Second>(
  element: IndexedElement<Obj, readonly [First, Second]>,
): IndexedElement<Obj, First> => ({
  object: element.object,
  element: element.element[0],
});

const rebracketAssociativityPrimal = <Obj, A, B, C>(
  element: IndexedElement<Obj, readonly [readonly [A, B], C]>,
): IndexedElement<Obj, readonly [A, readonly [B, C]]> => ({
  object: element.object,
  element: [element.element[0][0], [element.element[0][1], element.element[1]] as const] as const,
});

const rebracketAssociativityDual = <Obj, A, B, C>(
  element: IndexedElement<Obj, readonly [readonly [A, B], C]>,
): IndexedElement<Obj, readonly [A, readonly [B, C]]> => ({
  object: element.object,
  element: [element.element[0][0], [element.element[0][1], element.element[1]] as const] as const,
});

const rebracketAssociativityValue = <A, B, C>(
  value: readonly [readonly [A, B], C],
): readonly [A, readonly [B, C]] =>
  [value[0][0], [value[0][1], value[1]] as const] as const;

export interface InteractionLawDayUnitComponent<Obj, Arr> {
  readonly object: Obj;
  readonly values: ReadonlyArray<PromonoidalUnitValue<Obj, Arr>>;
  readonly diagnostics: ReadonlyArray<string>;
}

export interface InteractionLawDayUnitSummary<
  Obj,
  Arr,
  Left,
  Right,
  Value,
> {
  readonly law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>;
  readonly kernel: PromonoidalKernel<Obj, Arr>;
  readonly unit: DayUnitResult<Obj, Arr>;
  readonly unitContravariant: ContravariantFunctorWithWitness<
    Obj,
    Arr,
    SetObj<PromonoidalUnitValue<Obj, Arr>>,
    SetHom<PromonoidalUnitValue<Obj, Arr>, PromonoidalUnitValue<Obj, Arr>>
  >;
  readonly components: ReadonlyArray<InteractionLawDayUnitComponent<Obj, Arr>>;
  readonly diagnostics: ReadonlyArray<string>;
  readonly metadata?: ReadonlyArray<string>;
}

export interface InteractionLawDayUnitOptions {
  readonly metadata?: ReadonlyArray<string>;
  readonly unitMetadata?: ReadonlyArray<string>;
  readonly contravariantMetadata?: ReadonlyArray<string>;
}

export interface InteractionLawDayUnitTensorFiberSummary<Obj, Arr> {
  readonly object: Obj;
  readonly classCount: number;
  readonly diagonalCount: number;
  readonly relationCount: number;
  readonly missingDiagonalCount: number;
  readonly diagnostics: ReadonlyArray<string>;
}

export interface InteractionLawDayUnitTensorSummary<
  Obj,
  Arr,
  Left,
  Right,
  Value,
> {
  readonly law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>;
  readonly kernel: PromonoidalKernel<Obj, Arr>;
  readonly unit: InteractionLawDayUnitSummary<Obj, Arr, Left, Right, Value>;
  readonly tensor: DayConvolutionResult<
    Obj,
    Arr,
    PromonoidalUnitValue<Obj, Arr>,
    PromonoidalUnitValue<Obj, Arr>
  >;
  readonly fibers: ReadonlyArray<InteractionLawDayUnitTensorFiberSummary<Obj, Arr>>;
  readonly diagnostics: ReadonlyArray<string>;
  readonly metadata?: ReadonlyArray<string>;
}

export interface InteractionLawDayUnitTensorOptions<Obj, Arr, Left, Right, Value> {
  readonly unit?: InteractionLawDayUnitSummary<Obj, Arr, Left, Right, Value>;
  readonly metadata?: ReadonlyArray<string>;
  readonly tensorMetadata?: ReadonlyArray<string>;
}

export const summarizeInteractionLawDayUnit = <Obj, Arr, Left, Right, Value>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  options: InteractionLawDayUnitOptions = {},
): InteractionLawDayUnitSummary<Obj, Arr, Left, Right, Value> => {
  const unit = dayUnit(law.kernel, options.unitMetadata ?? []);
  const unitContravariant = dayUnitContravariant(
    law.kernel,
    options.contravariantMetadata ?? [],
  );

  const components: InteractionLawDayUnitComponent<Obj, Arr>[] = [];
  const diagnostics: string[] = [];

  let witnessTotal = 0;

  for (const object of law.kernel.base.objects) {
    const values = law.kernel.unit.profunctor.evaluate(object);
    witnessTotal += values.length;
    const componentDiagnostics: string[] = [
      `InteractionLawDayUnit(${String(object)}): enumerated ${values.length} promonoidal unit witness(es).`,
    ];
    if (values.length === 0) {
      componentDiagnostics.push(
        `InteractionLawDayUnit(${String(object)}): promonoidal unit provided no witnesses; downstream opmonoidal checks will report missing data.`,
      );
    }
    components.push({ object, values, diagnostics: componentDiagnostics });
  }

  diagnostics.push(
    components.length === 0
      ? "summarizeInteractionLawDayUnit: promonoidal kernel supplied no objects for the Day unit."
      : `summarizeInteractionLawDayUnit: recorded ${components.length} Day unit carrier(s) with ${witnessTotal} total witness(es).`,
  );

  const metadata = mergeMetadataList(
    unit.functor.metadata,
    unitContravariant.metadata,
    options.metadata,
  );

  return {
    law,
    kernel: law.kernel,
    unit,
    unitContravariant,
    components,
    diagnostics,
    ...(metadata ? { metadata } : {}),
  };
};

const defaultDayUnitTensorMetadata = [
  "Day unit tensor derived for opmonoidal diagnostics.",
];

export const summarizeInteractionLawDayUnitTensor = <Obj, Arr, Left, Right, Value>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  options: InteractionLawDayUnitTensorOptions<Obj, Arr, Left, Right, Value> = {},
): InteractionLawDayUnitTensorSummary<Obj, Arr, Left, Right, Value> => {
  const unit = options.unit ?? summarizeInteractionLawDayUnit(law);
  const tensorMetadata =
    mergeMetadataList(options.tensorMetadata, defaultDayUnitTensorMetadata) ??
    defaultDayUnitTensorMetadata;
  const tensor = dayTensor(
    law.kernel,
    unit.unitContravariant,
    unit.unit.functor,
    tensorMetadata,
  );

  const fibers: InteractionLawDayUnitTensorFiberSummary<Obj, Arr>[] = [];
  const diagnostics: string[] = [];
  let totalClasses = 0;

  for (const fiber of tensor.fibers) {
    totalClasses += fiber.classes.length;
    const coendDiagnostics = fiber.coend.diagnostics;
    const fiberDiagnostics: string[] = [
      `InteractionLawDayUnitTensor(${String(fiber.output)}): classified ${fiber.classes.length} Day class(es) from ${coendDiagnostics.diagonalCount} diagonal witness(es) and ${coendDiagnostics.relationCount} relation(s).`,
    ];
    if (coendDiagnostics.missingDiagonalWitnesses.length > 0) {
      fiberDiagnostics.push(
        `InteractionLawDayUnitTensor(${String(fiber.output)}): promonoidal unit tensor reported ${coendDiagnostics.missingDiagonalWitnesses.length} missing diagonal witness(es); opmonoidal comparisons may be incomplete.`,
      );
    }
    if (!coendDiagnostics.holds) {
      fiberDiagnostics.push(
        `InteractionLawDayUnitTensor(${String(fiber.output)}): coend computation marked as incomplete; check promonoidal kernel witnesses.`,
      );
    }
    fibers.push({
      object: fiber.output,
      classCount: fiber.classes.length,
      diagonalCount: coendDiagnostics.diagonalCount,
      relationCount: coendDiagnostics.relationCount,
      missingDiagonalCount: coendDiagnostics.missingDiagonalWitnesses.length,
      diagnostics: fiberDiagnostics,
    });
  }

  diagnostics.push(
    fibers.length === 0
      ? "summarizeInteractionLawDayUnitTensor: promonoidal kernel provided no objects for the Day unit tensor."
      : `summarizeInteractionLawDayUnitTensor: recorded ${fibers.length} unit tensor fiber(s) with ${totalClasses} Day convolution class(es).`,
  );

  const metadata = mergeMetadataList(unit.metadata, options.metadata);

  return {
    law,
    kernel: law.kernel,
    unit,
    tensor,
    fibers,
    diagnostics,
    ...(metadata ? { metadata } : {}),
  };
};

export interface InteractionLawDayUnitOpmonoidalFiberSummary<Obj> {
  readonly object: Obj;
  readonly unitWitnesses: number;
  readonly tensorClasses: number;
  readonly hasUnitWitnesses: boolean;
  readonly hasTensorFiber: boolean;
  readonly hasTensorWitnesses: boolean;
  readonly diagnostics: ReadonlyArray<string>;
}

export interface InteractionLawDayUnitOpmonoidalSummary<
  Obj,
  Arr,
  Left,
  Right,
  Value,
> {
  readonly law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>;
  readonly kernel: PromonoidalKernel<Obj, Arr>;
  readonly unit: InteractionLawDayUnitSummary<Obj, Arr, Left, Right, Value>;
  readonly tensor: InteractionLawDayUnitTensorSummary<Obj, Arr, Left, Right, Value>;
  readonly fibers: ReadonlyArray<InteractionLawDayUnitOpmonoidalFiberSummary<Obj>>;
  readonly satisfied: number;
  readonly missingUnit: number;
  readonly missingTensor: number;
  readonly diagnostics: ReadonlyArray<string>;
  readonly metadata?: ReadonlyArray<string>;
}

export interface InteractionLawDayUnitOpmonoidalOptions<
  Obj,
  Arr,
  Left,
  Right,
  Value,
> {
  readonly unit?: InteractionLawDayUnitSummary<Obj, Arr, Left, Right, Value>;
  readonly tensor?: InteractionLawDayUnitTensorSummary<Obj, Arr, Left, Right, Value>;
  readonly metadata?: ReadonlyArray<string>;
}

const defaultDayUnitOpmonoidalMetadata = [
  "Day unit opmonoidal coverage derived from promonoidal witnesses.",
];

export const summarizeInteractionLawDayUnitOpmonoidal = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  options: InteractionLawDayUnitOpmonoidalOptions<Obj, Arr, Left, Right, Value> = {},
): InteractionLawDayUnitOpmonoidalSummary<Obj, Arr, Left, Right, Value> => {
  const unit = options.unit ?? summarizeInteractionLawDayUnit(law);
  const tensor =
    options.tensor ?? summarizeInteractionLawDayUnitTensor(law, { unit });

  const unitByObject = new Map(unit.components.map((component) => [component.object, component]));
  const tensorByObject = new Map(
    tensor.fibers.map((fiber) => [fiber.object, fiber]),
  );

  const fibers: InteractionLawDayUnitOpmonoidalFiberSummary<Obj>[] = [];
  const diagnostics: string[] = [];

  let satisfied = 0;
  let missingUnit = 0;
  let missingTensor = 0;

  for (const object of law.kernel.base.objects) {
    const component = unitByObject.get(object);
    const fiber = tensorByObject.get(object);
    const unitWitnesses = component?.values.length ?? 0;
    const tensorClasses = fiber?.classCount ?? 0;
    const hasUnitWitnesses = unitWitnesses > 0;
    const hasTensorFiber = fiber !== undefined;
    const hasTensorWitnesses = hasTensorFiber && tensorClasses > 0;
    const entryDiagnostics: string[] = [
      `InteractionLawDayUnitOpmonoidal(${String(
        object,
      )}): recorded ${unitWitnesses} unit witness(es) and ${tensorClasses} tensor class(es).`,
    ];
    if (!component) {
      entryDiagnostics.push(
        `InteractionLawDayUnitOpmonoidal(${String(
          object,
        )}): Day unit summary supplied no witnesses for this object; comparisons will short-circuit.`,
      );
      missingUnit += 1;
    } else if (!hasUnitWitnesses) {
      entryDiagnostics.push(
        `InteractionLawDayUnitOpmonoidal(${String(
          object,
        )}): Day unit summary recorded zero witnesses; opmonoidal triangles cannot run.`,
      );
      missingUnit += 1;
    }
    if (!hasTensorFiber) {
      entryDiagnostics.push(
        `InteractionLawDayUnitOpmonoidal(${String(
          object,
        )}): Day unit tensor summary supplied no fiber; convolution-based comparisons are unavailable.`,
      );
      missingTensor += 1;
    } else if (!hasTensorWitnesses) {
      entryDiagnostics.push(
        `InteractionLawDayUnitOpmonoidal(${String(
          object,
        )}): Day unit tensor fiber recorded zero Day classes; check promonoidal witnesses.`,
      );
      missingTensor += 1;
    }

    if (hasUnitWitnesses && hasTensorWitnesses) {
      satisfied += 1;
    }

    fibers.push({
      object,
      unitWitnesses,
      tensorClasses,
      hasUnitWitnesses,
      hasTensorFiber,
      hasTensorWitnesses,
      diagnostics: entryDiagnostics,
    });
  }

  diagnostics.push(
    `summarizeInteractionLawDayUnitOpmonoidal: recorded ${fibers.length} object(s) with ${satisfied} complete opmonoidal witness set(s), ${missingUnit} missing unit carrier(s), and ${missingTensor} missing tensor fiber(s).`,
  );

  const metadata =
    mergeMetadataList(unit.metadata, tensor.metadata, options.metadata) ??
    defaultDayUnitOpmonoidalMetadata;

  return {
    law,
    kernel: law.kernel,
    unit,
    tensor,
    fibers,
    satisfied,
    missingUnit,
    missingTensor,
    diagnostics,
    ...(metadata ? { metadata } : {}),
  };
};

export interface InteractionLawDayUnitOpmonoidalTriangleEntry<Obj> {
  readonly object: Obj;
  readonly unitWitnesses: number;
  readonly tensorClasses: number;
  readonly hasTriangle: boolean;
  readonly diagnostics: ReadonlyArray<string>;
}

export interface InteractionLawDayUnitOpmonoidalTrianglesSummary<
  Obj,
  Arr,
  Left,
  Right,
  Value,
> {
  readonly law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>;
  readonly kernel: PromonoidalKernel<Obj, Arr>;
  readonly unit: InteractionLawDayUnitSummary<Obj, Arr, Left, Right, Value>;
  readonly tensor: InteractionLawDayUnitTensorSummary<Obj, Arr, Left, Right, Value>;
  readonly opmonoidal: InteractionLawDayUnitOpmonoidalSummary<
    Obj,
    Arr,
    Left,
    Right,
    Value
  >;
  readonly entries: ReadonlyArray<InteractionLawDayUnitOpmonoidalTriangleEntry<Obj>>;
  readonly satisfied: number;
  readonly missing: number;
  readonly laxComparisonAvailable: boolean;
  readonly diagnostics: ReadonlyArray<string>;
  readonly metadata?: ReadonlyArray<string>;
}

export interface InteractionLawDayUnitOpmonoidalTrianglesOptions<
  Obj,
  Arr,
  Left,
  Right,
  Value,
> {
  readonly unit?: InteractionLawDayUnitSummary<Obj, Arr, Left, Right, Value>;
  readonly tensor?: InteractionLawDayUnitTensorSummary<Obj, Arr, Left, Right, Value>;
  readonly opmonoidal?: InteractionLawDayUnitOpmonoidalSummary<
    Obj,
    Arr,
    Left,
    Right,
    Value
  >;
  readonly metadata?: ReadonlyArray<string>;
}

const defaultDayUnitOpmonoidalTrianglesMetadata = [
  "Day unit opmonoidal triangles derived from Day tensor coverage.",
];

export const summarizeInteractionLawDayUnitOpmonoidalTriangles = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  options: InteractionLawDayUnitOpmonoidalTrianglesOptions<
    Obj,
    Arr,
    Left,
    Right,
    Value
  > = {},
): InteractionLawDayUnitOpmonoidalTrianglesSummary<Obj, Arr, Left, Right, Value> => {
  const unit = options.unit ?? summarizeInteractionLawDayUnit(law);
  const tensor = options.tensor ?? summarizeInteractionLawDayUnitTensor(law, { unit });
  const opmonoidal =
    options.opmonoidal ??
    summarizeInteractionLawDayUnitOpmonoidal(law, { unit, tensor });

  const unitByObject = new Map(unit.components.map((component) => [component.object, component]));
  const tensorByObject = new Map(tensor.fibers.map((fiber) => [fiber.object, fiber]));

  const entries: InteractionLawDayUnitOpmonoidalTriangleEntry<Obj>[] = [];
  let satisfied = 0;
  let missing = 0;

  for (const object of law.kernel.base.objects) {
    const unitComponent = unitByObject.get(object);
    const tensorFiber = tensorByObject.get(object);
    const unitWitnesses = unitComponent?.values.length ?? 0;
    const tensorClasses = tensorFiber?.classCount ?? 0;
    const hasTriangle = unitWitnesses > 0 && tensorClasses > 0;
    const entryDiagnostics: string[] = [
      `DayUnitOpmonoidalTriangles(${String(
        object,
      )}): recorded ${unitWitnesses} unit witness(es) and ${tensorClasses} convolution class(es).`,
    ];
    if (unitWitnesses === 0) {
      entryDiagnostics.push(
        `DayUnitOpmonoidalTriangles(${String(
          object,
        )}): Day unit summary supplied no witnesses; opmonoidal triangle short-circuits.`,
      );
    }
    if (tensorClasses === 0) {
      entryDiagnostics.push(
        `DayUnitOpmonoidalTriangles(${String(
          object,
        )}): Day unit tensor summary recorded zero convolution classes; cannot instantiate triangle.`,
      );
    }
    if (hasTriangle) {
      entryDiagnostics.push(
        `DayUnitOpmonoidalTriangles(${String(
          object,
        )}): coverage ready for the opmonoidal comparison JX ⊙ JY → J(X ⊗ Y).`,
      );
      satisfied += 1;
    } else {
      missing += 1;
    }
    entries.push({
      object,
      unitWitnesses,
      tensorClasses,
      hasTriangle,
      diagnostics: entryDiagnostics,
    });
  }

  const diagnostics = [
    entries.length === 0
      ? "DayUnitOpmonoidalTriangles: promonoidal kernel supplied no objects for triangle coverage."
      : `DayUnitOpmonoidalTriangles: recorded ${entries.length} object(s) with ${satisfied} opmonoidal triangle coverage set(s) and ${missing} incomplete case(s).`,
    `DayUnitOpmonoidalTriangles: opmonoidal coverage summary reports ${opmonoidal.satisfied} satisfied fiber(s); missing unit=${opmonoidal.missingUnit}, missing tensor=${opmonoidal.missingTensor}.`,
    "DayUnitOpmonoidalTriangles: no lax-monoidal comparison J(X ⊗ Y) → JX ⊙ JY supplied; this witnesses the paper's failure of J to be lax monoidal.",
  ];

  const metadata =
    mergeMetadataList(
      unit.metadata,
      tensor.metadata,
      opmonoidal.metadata,
      options.metadata,
    ) ?? defaultDayUnitOpmonoidalTrianglesMetadata;

  return {
    law,
    kernel: law.kernel,
    unit,
    tensor,
    opmonoidal,
    entries,
    satisfied,
    missing,
    laxComparisonAvailable: false,
    diagnostics,
    ...(metadata ? { metadata } : {}),
  };
};

export interface InteractionLawDayUnitOpmonoidalTrianglesCheckReport<
  Obj,
  Arr,
  Left,
  Right,
  Value,
> {
  readonly kernel: PromonoidalKernel<Obj, Arr>;
  readonly summary: InteractionLawDayUnitOpmonoidalTrianglesSummary<
    Obj,
    Arr,
    Left,
    Right,
    Value
  >;
  readonly diagnostics: ReadonlyArray<string>;
  readonly holds: boolean;
  readonly metadata?: ReadonlyArray<string>;
}

export interface InteractionLawDayUnitOpmonoidalTrianglesCheckOptions<
  Obj,
  Arr,
  Left,
  Right,
  Value,
> {
  readonly summary?: InteractionLawDayUnitOpmonoidalTrianglesSummary<
    Obj,
    Arr,
    Left,
    Right,
    Value
  >;
  readonly summaryOptions?: InteractionLawDayUnitOpmonoidalTrianglesOptions<
    Obj,
    Arr,
    Left,
    Right,
    Value
  >;
  readonly metadata?: ReadonlyArray<string>;
}

const defaultDayUnitOpmonoidalTrianglesCheckMetadata = [
  "Day unit opmonoidal triangles check derived from cached coverage.",
];

export const checkInteractionLawDayUnitOpmonoidalTriangles = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  options: InteractionLawDayUnitOpmonoidalTrianglesCheckOptions<
    Obj,
    Arr,
    Left,
    Right,
    Value
  > = {},
): InteractionLawDayUnitOpmonoidalTrianglesCheckReport<
  Obj,
  Arr,
  Left,
  Right,
  Value
> => {
  const summary =
    options.summary ??
    summarizeInteractionLawDayUnitOpmonoidalTriangles(
      law,
      options.summaryOptions,
    );
  const diagnostics = [
    `checkInteractionLawDayUnitOpmonoidalTriangles: recorded ${summary.entries.length} triangle entry(ies) with ${summary.satisfied} ready case(s), ${summary.missing} incomplete case(s), and lax comparison available=${summary.laxComparisonAvailable}.`,
    ...summary.diagnostics,
  ];
  const metadata =
    mergeMetadataList(summary.metadata, options.metadata) ??
    defaultDayUnitOpmonoidalTrianglesCheckMetadata;
  const holds = summary.laxComparisonAvailable && summary.missing === 0;
  return {
    kernel: summary.kernel,
    summary,
    diagnostics,
    holds,
    ...(metadata ? { metadata } : {}),
  } satisfies InteractionLawDayUnitOpmonoidalTrianglesCheckReport<
    Obj,
    Arr,
    Left,
    Right,
    Value
  >;
};

export interface InteractionLawDayMonoidalSummary<
  Obj,
  Arr,
> {
  readonly kernel: PromonoidalKernel<Obj, Arr>;
  readonly unitComparisons: {
    readonly left: InteractionLawComparisonResult;
    readonly right: InteractionLawComparisonResult;
  };
  readonly associativity: InteractionLawComparisonResult;
  readonly pairingTraces: {
    readonly leftUnit: ReadonlyArray<string>;
    readonly rightUnit: ReadonlyArray<string>;
    readonly associativity: ReadonlyArray<string>;
  };
  readonly diagnostics: ReadonlyArray<string>;
  readonly holds: boolean;
}

export interface InteractionLawDaySymmetrySummary<Obj, Arr> {
  readonly kernel: PromonoidalKernel<Obj, Arr>;
  readonly comparison: InteractionLawComparisonResult;
  readonly pairingTraces: ReadonlyArray<string>;
  readonly diagnostics: ReadonlyArray<string>;
  readonly holds: boolean;
}

export type InteractionLawDayReferenceRole = "monad" | "comonad";

export interface InteractionLawDayInterchangeSample<
  Obj,
  Arr,
  Left,
  Right,
  Value,
> {
  readonly primal: IndexedElement<Obj, Left>;
  readonly dual: IndexedElement<Obj, Right>;
  readonly contributions: ReadonlyArray<
    DayPairingContribution<Obj, Arr, Left, Right, Value>
  >;
  readonly diagnostics: ReadonlyArray<string>;
}

export interface InteractionLawDayInterchangeDetail<
  Obj,
  Arr,
  Left,
  Right,
  Value,
> {
  readonly role: InteractionLawDayReferenceRole;
  readonly operation: string;
  readonly reference: OperationDayReference<Obj>;
  readonly fiberAvailable: boolean;
  readonly pairingAvailable: boolean;
  readonly contributions: ReadonlyArray<string>;
  readonly samples: ReadonlyArray<
    InteractionLawDayInterchangeSample<Obj, Arr, Left, Right, Value>
  >;
  readonly contributionCount: number;
  readonly checkedPairs: number;
  readonly missingPairs: number;
  readonly sampledLeftCount: number;
  readonly sampledRightCount: number;
  readonly sampleEmpty: boolean;
  readonly canonicalContributionCount: number;
  readonly canonicalSatisfied: boolean;
  readonly canonicalSample?: InteractionLawDayInterchangeSample<
    Obj,
    Arr,
    Left,
    Right,
    Value
  >;
  readonly diagnostics: ReadonlyArray<string>;
}

export interface InteractionLawDayInterchangeSummary<
  Obj,
  Arr,
  Left,
  Right,
  Value,
> {
  readonly kernel: PromonoidalKernel<Obj, Arr>;
  readonly details: ReadonlyArray<
    InteractionLawDayInterchangeDetail<Obj, Arr, Left, Right, Value>
  >;
  readonly diagnostics: ReadonlyArray<string>;
  readonly holds: boolean;
}

export interface InteractionLawDayInterchangeTotals {
  readonly totalReferences: number;
  readonly satisfiedReferences: number;
  readonly missingFibers: number;
  readonly missingPairings: number;
  readonly emptySamples: number;
  readonly zeroContributionReferences: number;
  readonly referencesWithMissingPairs: number;
  readonly totalMissingPairs: number;
  readonly totalCheckedPairs: number;
}

export interface InteractionLawDayInterchangeReport<
  Obj,
  Arr,
  Left,
  Right,
  Value,
> {
  readonly kernel: PromonoidalKernel<Obj, Arr>;
  readonly summary: InteractionLawDayInterchangeSummary<Obj, Arr, Left, Right, Value>;
  readonly totals: InteractionLawDayInterchangeTotals;
  readonly roleTotals: Record<
    InteractionLawDayReferenceRole,
    InteractionLawDayInterchangeTotals
  >;
  readonly diagnostics: ReadonlyArray<string>;
  readonly holds: boolean;
}

export interface InteractionLawDayInterchangeOperationSummary<Obj, Arr> {
  readonly label: string;
  readonly arity: number;
  readonly metadata?: ReadonlyArray<string>;
  readonly lawvereWitness?: LawvereOperationWitness<Obj, Arr>;
  readonly hasTransformation: boolean;
  readonly hasGenericWitness: boolean;
  readonly hasNullaryComponent: boolean;
  readonly hasCommutativeComponent: boolean;
  readonly dayReferenceCount: number;
}

export interface InteractionLawDayInterchangeInstantiationDetail<
  Obj,
  Arr,
  Left,
  Right,
  Value,
> {
  readonly detail: InteractionLawDayInterchangeDetail<
    Obj,
    Arr,
    Left,
    Right,
    Value
  >;
  readonly operation?: InteractionLawDayInterchangeOperationSummary<Obj, Arr>;
  readonly diagnostics: ReadonlyArray<string>;
  readonly holds: boolean;
}

export interface InteractionLawDayInterchangeInstantiationTotals {
  readonly totalReferences: number;
  readonly instantiatedReferences: number;
  readonly missingOperations: number;
  readonly missingCanonicalSamples: number;
  readonly unsatisfiedCanonicalSamples: number;
}

export interface InteractionLawDayInterchangeInstantiationReport<
  Obj,
  Arr,
  Left,
  Right,
  Value,
> {
  readonly kernel: PromonoidalKernel<Obj, Arr>;
  readonly summary: InteractionLawDayInterchangeSummary<Obj, Arr, Left, Right, Value>;
  readonly details: ReadonlyArray<
    InteractionLawDayInterchangeInstantiationDetail<
      Obj,
      Arr,
      Left,
      Right,
      Value
    >
  >;
  readonly totals: InteractionLawDayInterchangeInstantiationTotals;
  readonly roleTotals: Record<
    InteractionLawDayReferenceRole,
    InteractionLawDayInterchangeInstantiationTotals
  >;
  readonly diagnostics: ReadonlyArray<string>;
  readonly holds: boolean;
}

const describeDiagnosticValue = (value: unknown): string => {
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint" ||
    value === null ||
    value === undefined
  ) {
    return String(value);
  }
  if (typeof value === "function") {
    return `[Function${value.name ? ` ${value.name}` : ""}]`;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const describeDayContribution = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
>(contribution: DayPairingContribution<Obj, Arr, Left, Right, Value>): string => {
  const base = `diag=${String(contribution.diagonal)} kernel=(${String(contribution.kernelLeft)}, ${String(contribution.kernelRight)})`;
  const left = `left=${describeDiagnosticValue(contribution.left.element)}`;
  const right = `right=${describeDiagnosticValue(contribution.right.element)}`;
  const evaluation = `eval=${describeDiagnosticValue(contribution.evaluation)}`;
  return `${base} ${left} ${right} ${evaluation}`;
};

const collectDayMonoidalPairingDiagnostics = <
  Obj,
  Arr,
  LeftReference,
  RightReference,
  ValueReference,
  LeftCandidate,
  RightCandidate,
  ValueCandidate,
>(
  label: string,
  reference: FunctorInteractionLaw<Obj, Arr, LeftReference, RightReference, ValueReference>,
  candidate: FunctorInteractionLaw<Obj, Arr, LeftCandidate, RightCandidate, ValueCandidate>,
  mapping: InteractionLawComparisonMapping<
    Obj,
    LeftReference,
    RightReference,
    ValueReference,
    LeftCandidate,
    RightCandidate,
    ValueCandidate
  >,
  sampleLimit = 2,
): ReadonlyArray<string> => {
  const traces: string[] = [];
  const primals = enumerateCarrier(candidate.primalCarrier) as IndexedElement<
    Obj,
    LeftCandidate
  >[];
  const duals = enumerateCarrier(candidate.dualCarrier) as IndexedElement<
    Obj,
    RightCandidate
  >[];

  if (primals.length === 0 || duals.length === 0) {
    traces.push(
      `${label}: candidate carrier is empty (primals=${primals.length}, duals=${duals.length}).`,
    );
    return traces;
  }

  const primalLimit = Math.min(sampleLimit, primals.length);
  const dualLimit = Math.min(sampleLimit, duals.length);

  for (let primalIndex = 0; primalIndex < primalLimit; primalIndex += 1) {
    const primal = primals[primalIndex]!;
    for (let dualIndex = 0; dualIndex < dualLimit; dualIndex += 1) {
      const dual = duals[dualIndex]!;
      const contributions = candidate.collect(primal, dual);
      const candidateValue = candidate.aggregate(contributions);
      const mappedValue = mapping.mapValue
        ? mapping.mapValue(candidateValue)
        : (candidateValue as unknown as ValueReference);
      const mappedPrimal = mapping.mapPrimal
        ? mapping.mapPrimal(primal)
        : (primal as unknown as IndexedElement<Obj, LeftReference>);
      const mappedDual = mapping.mapDual
        ? mapping.mapDual(dual)
        : (dual as unknown as IndexedElement<Obj, RightReference>);
      const referenceValue = reference.evaluate(mappedPrimal, mappedDual);
      const matches = structuralValueEquals(referenceValue, mappedValue);
      const contributionDescriptions = contributions
        .slice(0, 3)
        .map((entry) => describeDayContribution(entry))
        .join("; ");
      const extra = contributions.length > 3
        ? ` (+${contributions.length - 3} more)`
        : "";
      traces.push(
        `${label}: pair ${encodeIndexedElement(primal)} ? ${encodeIndexedElement(dual)} -> mapped value ${describeDiagnosticValue(mappedValue)} vs reference ${describeDiagnosticValue(referenceValue)} (${matches ? "match" : "mismatch"}); contributions=${contributions.length}${extra}${contributionDescriptions ? ` | witnesses: ${contributionDescriptions}` : ""}.`,
      );
    }
  }

  return traces;
};

const swapTuple = <Left0, Left1>(
  value: readonly [Left0, Left1],
): readonly [Left1, Left0] => [value[1], value[0]] as const;

const swapIndexedElement = <Obj, Left0, Left1>(
  element: IndexedElement<Obj, readonly [Left0, Left1]>,
): IndexedElement<Obj, readonly [Left1, Left0]> => ({
  object: element.object,
  element: swapTuple(element.element),
});

export const checkInteractionLawDaySymmetry = <
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
): InteractionLawDaySymmetrySummary<Obj, Arr> => {
  if (leftLaw.kernel !== rightLaw.kernel) {
    throw new Error(
      "checkInteractionLawDaySymmetry: interaction laws must share the same promonoidal kernel.",
    );
  }

  const leftRight = productInteractionLaw(leftLaw, rightLaw);
  const rightLeft = productInteractionLaw(rightLaw, leftLaw);

  const mapping: InteractionLawComparisonMapping<
    Obj,
    readonly [Left0, Left1],
    readonly [Right0, Right1],
    readonly [Value0, Value1],
    readonly [Left1, Left0],
    readonly [Right1, Right0],
    readonly [Value1, Value0]
  > = {
    label: "DaySymmetry",
    mapPrimal: (element) => swapIndexedElement(element),
    mapDual: (element) => swapIndexedElement(element),
    mapValue: (value) => swapTuple(value),
  };

  const comparison = compareInteractionLaws(leftRight.law, rightLeft.law, mapping);

  const pairingTraces = collectDayMonoidalPairingDiagnostics(
    "DayMonoidal.symmetry",
    leftRight.law,
    rightLeft.law,
    mapping,
  );

  const diagnostics = [
    `DayMonoidal.symmetry: ${comparison.matches ? "holds" : "fails"} (checked ${comparison.checkedPairs} pairs; mismatches ${comparison.mismatches}).`,
    ...comparison.diagnostics,
    ...pairingTraces,
  ];

  return {
    kernel: leftLaw.kernel,
    comparison,
    pairingTraces,
    diagnostics,
    holds: comparison.matches,
  };
};

export const checkInteractionLawDayMonoidal = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
): InteractionLawDayMonoidalSummary<Obj, Arr> => {
  const unitLaw = finalInteractionLaw(law.kernel);

  const leftUnitProduct = productInteractionLaw(unitLaw, law);
  const leftUnit = compareInteractionLaws(law, leftUnitProduct.law, {
    label: "DayLeftUnit",
    mapPrimal: (element) => projectIndexedElementSecond(element),
    mapDual: (element) => projectIndexedElementSecond(element),
    mapValue: (value) => value[1],
  });

  const rightUnitProduct = productInteractionLaw(law, unitLaw);
  const rightUnit = compareInteractionLaws(law, rightUnitProduct.law, {
    label: "DayRightUnit",
    mapPrimal: (element) => projectIndexedElementFirst(element),
    mapDual: (element) => projectIndexedElementFirst(element),
    mapValue: (value) => value[0],
  });

  const leftPair = productInteractionLaw(law, law);
  const leftAssociative = productInteractionLaw(leftPair.law, law);
  const rightPair = productInteractionLaw(law, law);
  const rightAssociative = productInteractionLaw(law, rightPair.law);

  const associativity = compareInteractionLaws(rightAssociative.law, leftAssociative.law, {
    label: "DayAssociativity",
    mapPrimal: (element) => rebracketAssociativityPrimal(element),
    mapDual: (element) => rebracketAssociativityDual(element),
    mapValue: (value) => rebracketAssociativityValue(value),
  });

  const leftUnitTraces = collectDayMonoidalPairingDiagnostics(
    "DayMonoidal.leftUnit",
    law,
    leftUnitProduct.law,
    {
      label: "DayLeftUnit",
      mapPrimal: (element) => projectIndexedElementSecond(element),
      mapDual: (element) => projectIndexedElementSecond(element),
      mapValue: (value) => value[1],
    },
  );

  const rightUnitTraces = collectDayMonoidalPairingDiagnostics(
    "DayMonoidal.rightUnit",
    law,
    rightUnitProduct.law,
    {
      label: "DayRightUnit",
      mapPrimal: (element) => projectIndexedElementFirst(element),
      mapDual: (element) => projectIndexedElementFirst(element),
      mapValue: (value) => value[0],
    },
  );

  const associativityTraces = collectDayMonoidalPairingDiagnostics<
    Obj,
    Arr,
    readonly [Left, readonly [Left, Left]],
    readonly [Right, readonly [Right, Right]],
    readonly [Value, readonly [Value, Value]],
    readonly [readonly [Left, Left], Left],
    readonly [readonly [Right, Right], Right],
    readonly [readonly [Value, Value], Value]
  >(
    "DayMonoidal.associativity",
    rightAssociative.law,
    leftAssociative.law,
    {
      label: "DayAssociativity",
      mapPrimal: (element) => rebracketAssociativityPrimal(element),
      mapDual: (element) => rebracketAssociativityDual(element),
      mapValue: (value) => rebracketAssociativityValue(value),
    },
  );

  const diagnostics = [
    `DayMonoidal.leftUnit: ${leftUnit.matches ? "holds" : "fails"} (checked ${leftUnit.checkedPairs} pairs; mismatches ${leftUnit.mismatches}).`,
    ...leftUnit.diagnostics,
    `DayMonoidal.rightUnit: ${rightUnit.matches ? "holds" : "fails"} (checked ${rightUnit.checkedPairs} pairs; mismatches ${rightUnit.mismatches}).`,
    ...rightUnit.diagnostics,
    `DayMonoidal.associativity: ${associativity.matches ? "holds" : "fails"} (checked ${associativity.checkedPairs} pairs; mismatches ${associativity.mismatches}).`,
    ...associativity.diagnostics,
    ...leftUnitTraces,
    ...rightUnitTraces,
    ...associativityTraces,
  ];

  return {
    kernel: law.kernel,
    unitComparisons: { left: leftUnit, right: rightUnit },
    associativity,
    pairingTraces: {
      leftUnit: leftUnitTraces,
      rightUnit: rightUnitTraces,
      associativity: associativityTraces,
    },
    diagnostics,
    holds: leftUnit.matches && rightUnit.matches && associativity.matches,
  };
};

interface DayReferenceContributionSample<Obj, Arr, Left, Right, Value> {
  readonly primal: IndexedElement<Obj, Left>;
  readonly dual: IndexedElement<Obj, Right>;
  readonly contributions: ReadonlyArray<
    DayPairingContribution<Obj, Arr, Left, Right, Value>
  >;
  readonly diagnostics: ReadonlyArray<string>;
}

interface DayReferenceContributionData<Obj, Arr, Left, Right, Value> {
  readonly diagnostics: ReadonlyArray<string>;
  readonly contributionCount: number;
  readonly checkedPairs: number;
  readonly missingPairs: number;
  readonly sampledLeftCount: number;
  readonly sampledRightCount: number;
  readonly sampleEmpty: boolean;
  readonly samples: ReadonlyArray<
    DayReferenceContributionSample<Obj, Arr, Left, Right, Value>
  >;
}

const collectDayReferenceContributionData = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  fiber: Obj,
  sampleLimit: number,
): DayReferenceContributionData<Obj, Arr, Left, Right, Value> => {
  const leftCarrier = law.left.functor.F0(fiber) as SetObj<Left>;
  const rightCarrier = law.right.functor.F0(fiber) as SetObj<Right>;

  const leftElements = enumerateCarrier(leftCarrier).slice(0, sampleLimit);
  const rightElements = enumerateCarrier(rightCarrier).slice(0, sampleLimit);

  if (leftElements.length === 0 || rightElements.length === 0) {
    return {
      diagnostics: [
        `DayInterchange.reference(${String(fiber)}): carrier sample empty (left=${leftElements.length}, right=${rightElements.length}).`,
      ],
      contributionCount: 0,
      checkedPairs: 0,
      missingPairs: 0,
      sampledLeftCount: leftElements.length,
      sampledRightCount: rightElements.length,
      sampleEmpty: true,
      samples: [],
    };
  }

  const diagnostics: string[] = [];
  let contributionCount = 0;
  let checkedPairs = 0;
  let missingPairs = 0;
  const samples: Array<
    DayReferenceContributionSample<Obj, Arr, Left, Right, Value>
  > = [];

  for (const leftElement of leftElements) {
    const primal: IndexedElement<Obj, Left> = { object: fiber, element: leftElement as Left };
    for (const rightElement of rightElements) {
      const dual: IndexedElement<Obj, Right> = {
        object: fiber,
        element: rightElement as Right,
      };
      const contributions = law.collect(primal, dual).filter((contribution) =>
        Object.is(contribution.diagonal, fiber),
      );
      checkedPairs += 1;
      const sampleDiagnostics: string[] = [];
      if (contributions.length === 0) {
        missingPairs += 1;
        sampleDiagnostics.push(
          `DayInterchange.reference(${String(fiber)}): no contributions for sample left=${describeDiagnosticValue(
            primal.element,
          )}, right=${describeDiagnosticValue(dual.element)}.`,
        );
        diagnostics.push(...sampleDiagnostics);
        samples.push({
          primal,
          dual,
          contributions: [],
          diagnostics: sampleDiagnostics,
        });
        continue;
      }
      contributionCount += contributions.length;
      sampleDiagnostics.push(
        ...contributions.map((contribution) =>
          `DayInterchange.reference(${String(fiber)}): ${describeDayContribution(contribution)}`,
        ),
      );
      diagnostics.push(...sampleDiagnostics);
      samples.push({
        primal,
        dual,
        contributions,
        diagnostics: sampleDiagnostics,
      });
    }
  }

  return {
    diagnostics,
    contributionCount,
    checkedPairs,
    missingPairs,
    sampledLeftCount: leftElements.length,
    sampledRightCount: rightElements.length,
    sampleEmpty: false,
    samples,
  };
};

const collectCanonicalDayReferenceSample = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  reference: OperationDayReference<Obj>,
  fiber: (typeof law.convolution.fibers)[number] | undefined,
): {
  readonly sample?: InteractionLawDayInterchangeSample<
    Obj,
    Arr,
    Left,
    Right,
    Value
  >;
  readonly diagnostics: ReadonlyArray<string>;
  readonly totalContributions: number;
  readonly satisfied: boolean;
} => {
  const diagnostics: string[] = [];
  const fiberLabel = String(reference.fiber);
  if (!fiber) {
    diagnostics.push(
      `DayInterchange.reference(${fiberLabel}): canonical sample unavailable (missing Day fiber).`,
    );
    return { diagnostics, totalContributions: 0, satisfied: false };
  }

  diagnostics.push(
    `DayInterchange.reference(${fiberLabel}): canonical class index ${reference.index} of ${fiber.classes.length}.`,
  );

  const canonicalClass = fiber.classes[reference.index];
  if (!canonicalClass) {
    diagnostics.push(
      `DayInterchange.reference(${fiberLabel}): canonical sample index ${reference.index} is out of range.`,
    );
    return { diagnostics, totalContributions: 0, satisfied: false };
  }

  const witness = canonicalClass.witness;
  const diagonalLabel = String(canonicalClass.diagonalObject);
  const kernelLeftLabel = String(witness.kernelLeft);
  const kernelRightLabel = String(witness.kernelRight);

  diagnostics.push(
    `DayInterchange.reference(${fiberLabel}): canonical witness uses diagonal ${diagonalLabel} with kernel objects (${kernelLeftLabel}, ${kernelRightLabel}).`,
  );

  const witnessMatchesOutput = Object.is(witness.output, reference.fiber);
  if (!witnessMatchesOutput) {
    diagnostics.push(
      `DayInterchange.reference(${fiberLabel}): canonical witness output ${String(witness.output)} differs from referenced fiber.`,
    );
  }

  const canonicalPrimal: IndexedElement<Obj, Left> = {
    object: witness.kernelLeft,
    element: witness.leftElement as Left,
  };
  const canonicalDual: IndexedElement<Obj, Right> = {
    object: witness.kernelRight,
    element: witness.rightElement as Right,
  };

  const contributions = law.collect(canonicalPrimal, canonicalDual);
  const totalContributions = contributions.length;
  const matchingContributions = contributions.filter(
    (contribution) =>
      Object.is(contribution.output, reference.fiber) &&
      Object.is(contribution.diagonal, canonicalClass.diagonalObject),
  );

  const evaluation = law.aggregate(contributions);
  diagnostics.push(
    `DayInterchange.reference(${fiberLabel}): canonical evaluation ${describeDiagnosticValue(evaluation)} from ${totalContributions} total contribution(s).`,
  );
  diagnostics.push(
    `DayInterchange.reference(${fiberLabel}): canonical contributions targeting the referenced fiber ${matchingContributions.length}.`,
  );

  const sampleDiagnostics =
    matchingContributions.length > 0
      ? matchingContributions.map(
          (contribution) =>
            `DayInterchange.reference(${fiberLabel}): canonical ${describeDayContribution(contribution)}`,
        )
      : [
          `DayInterchange.reference(${fiberLabel}): canonical sample produced no contributions for the referenced fiber.`,
        ];

  diagnostics.push(...sampleDiagnostics);

  return {
    sample: {
      primal: canonicalPrimal,
      dual: canonicalDual,
      contributions: matchingContributions,
      diagnostics: sampleDiagnostics,
    },
    diagnostics,
    totalContributions,
    satisfied:
      matchingContributions.length > 0 &&
      witnessMatchesOutput &&
      totalContributions > 0,
  };
};

export interface InteractionLawDayInterchangeOptions {
  readonly sampleLimit?: number;
}

export const summarizeInteractionLawDayInterchangePreparation = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  options: InteractionLawDayInterchangeOptions = {},
): InteractionLawDayInterchangeSummary<Obj, Arr, Left, Right, Value> => {
  const sampleLimit = options.sampleLimit ?? 2;
  const details: InteractionLawDayInterchangeDetail<
    Obj,
    Arr,
    Left,
    Right,
    Value
  >[] = [];

  const collectForOperation = (
    role: InteractionLawDayReferenceRole,
    operationLabel: string,
    references: ReadonlyArray<OperationDayReference<Obj>> | undefined,
  ) => {
    if (!references || references.length === 0) {
      return;
    }
    for (const reference of references) {
      const fiberData = law.convolution.fibers.find((fiber) =>
        Object.is(fiber.output, reference.fiber),
      );
      const pairingComponent = law.getPairingComponent(reference.fiber);
      const fiberAvailable = Boolean(fiberData);
      const pairingAvailable = Boolean(pairingComponent);
      const contributionData = fiberAvailable
        ? collectDayReferenceContributionData(law, reference.fiber, sampleLimit)
        : {
            diagnostics: [
              `DayInterchange.reference(${String(
                reference.fiber,
              )}): missing Day fiber in convolution data.`,
            ],
            contributionCount: 0,
            checkedPairs: 0,
            missingPairs: 0,
            sampledLeftCount: 0,
            sampledRightCount: 0,
            sampleEmpty: true,
            samples: [],
          } satisfies DayReferenceContributionData<
            Obj,
            Arr,
            Left,
            Right,
            Value
          >;
      const contributionDiagnostics = contributionData.diagnostics;
      const canonical = collectCanonicalDayReferenceSample(
        law,
        reference,
        fiberData,
      );
      const detailDiagnostics = [
        `${role} operation ${operationLabel} (index ${reference.index}) references fiber ${String(
          reference.fiber,
        )}.`,
        fiberAvailable
          ? `DayInterchange.reference(${String(reference.fiber)}): fiber located in convolution data.`
          : `DayInterchange.reference(${String(reference.fiber)}): fiber missing from convolution data.`,
        pairingAvailable
          ? `DayInterchange.reference(${String(reference.fiber)}): pairing component available.`
          : `DayInterchange.reference(${String(reference.fiber)}): pairing component missing.`,
        `DayInterchange.reference(${String(
          reference.fiber,
        )}): sampled ${contributionData.sampledLeftCount} left × ${contributionData.sampledRightCount} right element(s) (${contributionData.checkedPairs} pair(s) checked; ${contributionData.missingPairs} missing).`,
        `DayInterchange.reference(${String(
          reference.fiber,
        )}): recorded ${contributionData.contributionCount} Day contribution(s).`,
        ...contributionDiagnostics,
        ...canonical.diagnostics,
      ];
      details.push({
        role,
        operation: operationLabel,
        reference,
        fiberAvailable,
        pairingAvailable,
        contributions: contributionDiagnostics,
        samples: contributionData.samples,
        contributionCount: contributionData.contributionCount,
        checkedPairs: contributionData.checkedPairs,
        missingPairs: contributionData.missingPairs,
        sampledLeftCount: contributionData.sampledLeftCount,
        sampledRightCount: contributionData.sampledRightCount,
        sampleEmpty: contributionData.sampleEmpty,
        canonicalContributionCount: canonical.totalContributions,
        canonicalSatisfied: canonical.satisfied,
        ...(canonical.sample ? { canonicalSample: canonical.sample } : {}),
        diagnostics: detailDiagnostics,
      });
    }
  };

  if (law.operations?.monadOperations) {
    for (const operation of law.operations.monadOperations) {
      collectForOperation("monad", operation.label, operation.dayReferences);
    }
  }

  if (law.operations?.comonadCooperations) {
    for (const operation of law.operations.comonadCooperations) {
      collectForOperation("comonad", operation.label, operation.dayReferences);
    }
  }

  const satisfied = details.filter(
    (detail) =>
      detail.fiberAvailable &&
      detail.pairingAvailable &&
      !detail.sampleEmpty &&
      detail.checkedPairs > 0 &&
      detail.missingPairs === 0 &&
      detail.contributionCount > 0 &&
      detail.canonicalSatisfied,
  );

  const diagnostics = [
    details.length === 0
      ? "summarizeInteractionLawDayInterchangePreparation: no operations supplied Day references."
      : `summarizeInteractionLawDayInterchangePreparation: enumerated ${details.length} Day reference(s); ${satisfied.length} satisfied fiber/pairing/contribution checks.`,
    ...details.flatMap((detail) => detail.diagnostics),
  ];

  const holds = satisfied.length === details.length;

  return {
    kernel: law.kernel,
    details,
    diagnostics,
    holds,
  };
};

interface MutableInteractionLawDayInterchangeTotals {
  totalReferences: number;
  satisfiedReferences: number;
  missingFibers: number;
  missingPairings: number;
  emptySamples: number;
  zeroContributionReferences: number;
  referencesWithMissingPairs: number;
  totalMissingPairs: number;
  totalCheckedPairs: number;
}

const createMutableInteractionLawDayInterchangeTotals = () => ({
  totalReferences: 0,
  satisfiedReferences: 0,
  missingFibers: 0,
  missingPairings: 0,
  emptySamples: 0,
  zeroContributionReferences: 0,
  referencesWithMissingPairs: 0,
  totalMissingPairs: 0,
  totalCheckedPairs: 0,
});

const finalizeInteractionLawDayInterchangeTotals = (
  totals: MutableInteractionLawDayInterchangeTotals,
): InteractionLawDayInterchangeTotals => ({
  totalReferences: totals.totalReferences,
  satisfiedReferences: totals.satisfiedReferences,
  missingFibers: totals.missingFibers,
  missingPairings: totals.missingPairings,
  emptySamples: totals.emptySamples,
  zeroContributionReferences: totals.zeroContributionReferences,
  referencesWithMissingPairs: totals.referencesWithMissingPairs,
  totalMissingPairs: totals.totalMissingPairs,
  totalCheckedPairs: totals.totalCheckedPairs,
});

const accumulateDayInterchangeDetail = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
>(
  totals: MutableInteractionLawDayInterchangeTotals,
  detail: InteractionLawDayInterchangeDetail<Obj, Arr, Left, Right, Value>,
  satisfied: boolean,
): void => {
  totals.totalReferences += 1;
  totals.totalCheckedPairs += detail.checkedPairs;
  if (!detail.fiberAvailable) {
    totals.missingFibers += 1;
  }
  if (!detail.pairingAvailable) {
    totals.missingPairings += 1;
  }
  if (detail.sampleEmpty) {
    totals.emptySamples += 1;
  }
  if (detail.contributionCount === 0) {
    totals.zeroContributionReferences += 1;
  }
  if (detail.missingPairs > 0) {
    totals.referencesWithMissingPairs += 1;
    totals.totalMissingPairs += detail.missingPairs;
  }
  if (satisfied) {
    totals.satisfiedReferences += 1;
  }
};

const describeInteractionLawDayInterchangeTotals = (
  label: string,
  totals: InteractionLawDayInterchangeTotals,
): string => {
  if (totals.totalReferences === 0) {
    return `DayInterchange.${label}: no Day references recorded.`;
  }
  const base =
    `DayInterchange.${label}: ${totals.satisfiedReferences}/${totals.totalReferences} references satisfied.`;
  const coverage =
    totals.totalMissingPairs === 0
      ? ""
      : ` Missing ${totals.totalMissingPairs} pair(s) across ${totals.referencesWithMissingPairs} reference(s).`;
  return (
    `${base} Missing fibers=${totals.missingFibers}; missing pairings=${totals.missingPairings}; ` +
    `empty samples=${totals.emptySamples}; zero contributions=${totals.zeroContributionReferences}; ` +
    `checked pairs=${totals.totalCheckedPairs}.${coverage}`
  );
};

export const summarizeInteractionLawDayInterchangeFromSummary = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
>(
  summary: InteractionLawDayInterchangeSummary<Obj, Arr, Left, Right, Value>,
): InteractionLawDayInterchangeReport<Obj, Arr, Left, Right, Value> => {
  const totals = createMutableInteractionLawDayInterchangeTotals();
  const roleTotals: Record<
    InteractionLawDayReferenceRole,
    MutableInteractionLawDayInterchangeTotals
  > = {
    monad: createMutableInteractionLawDayInterchangeTotals(),
    comonad: createMutableInteractionLawDayInterchangeTotals(),
  };

  for (const detail of summary.details) {
    const satisfied =
      detail.fiberAvailable &&
      detail.pairingAvailable &&
      !detail.sampleEmpty &&
      detail.checkedPairs > 0 &&
      detail.missingPairs === 0 &&
      detail.contributionCount > 0 &&
      detail.canonicalSatisfied;
    accumulateDayInterchangeDetail(totals, detail, satisfied);
    accumulateDayInterchangeDetail(roleTotals[detail.role], detail, satisfied);
  }

  const finalizedTotals = finalizeInteractionLawDayInterchangeTotals(totals);
  const finalizedRoleTotals: Record<
    InteractionLawDayReferenceRole,
    InteractionLawDayInterchangeTotals
  > = {
    monad: finalizeInteractionLawDayInterchangeTotals(roleTotals.monad),
    comonad: finalizeInteractionLawDayInterchangeTotals(roleTotals.comonad),
  };

  const diagnostics = [
    describeInteractionLawDayInterchangeTotals("overall", finalizedTotals),
    describeInteractionLawDayInterchangeTotals("monad", finalizedRoleTotals.monad),
    describeInteractionLawDayInterchangeTotals("comonad", finalizedRoleTotals.comonad),
    ...summary.diagnostics,
  ];

  return {
    kernel: summary.kernel,
    summary,
    totals: finalizedTotals,
    roleTotals: finalizedRoleTotals,
    diagnostics,
    holds: summary.holds,
  };
};

export const summarizeInteractionLawDayInterchange = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  options: InteractionLawDayInterchangeOptions = {},
): InteractionLawDayInterchangeReport<Obj, Arr, Left, Right, Value> =>
  summarizeInteractionLawDayInterchangeFromSummary(
    summarizeInteractionLawDayInterchangePreparation(law, options),
  );

const summarizeDayInterchangeOperation = <Obj, Arr>(
  operation: MonadOperation<Obj, Arr> | ComonadCooperation<Obj, Arr>,
): InteractionLawDayInterchangeOperationSummary<Obj, Arr> => {
  let hasGenericWitness: boolean;
  if ("kleisliOnGeneric" in operation) {
    hasGenericWitness = Boolean(operation.kleisliOnGeneric);
  } else {
    const comonadOperation = operation as ComonadCooperation<Obj, Arr>;
    hasGenericWitness = Boolean(
      comonadOperation.genericDuplication ?? comonadOperation.counit,
    );
  }

  return {
    label: operation.label,
    arity: operation.arity,
    ...(operation.metadata ? { metadata: operation.metadata } : {}),
    ...(operation.lawvereWitness
      ? { lawvereWitness: operation.lawvereWitness as LawvereOperationWitness<Obj, Arr> }
      : {}),
    hasTransformation: Boolean(operation.transformation),
    hasGenericWitness,
    hasNullaryComponent: Boolean(operation.nullary),
    hasCommutativeComponent: Boolean(operation.commutativeBinary),
    dayReferenceCount: operation.dayReferences?.length ?? 0,
  };
};

interface MutableInteractionLawDayInterchangeInstantiationTotals {
  totalReferences: number;
  instantiatedReferences: number;
  missingOperations: number;
  missingCanonicalSamples: number;
  unsatisfiedCanonicalSamples: number;
}

const createMutableInteractionLawDayInterchangeInstantiationTotals = (): MutableInteractionLawDayInterchangeInstantiationTotals => ({
  totalReferences: 0,
  instantiatedReferences: 0,
  missingOperations: 0,
  missingCanonicalSamples: 0,
  unsatisfiedCanonicalSamples: 0,
});

const finalizeInteractionLawDayInterchangeInstantiationTotals = (
  totals: MutableInteractionLawDayInterchangeInstantiationTotals,
): InteractionLawDayInterchangeInstantiationTotals => ({
  totalReferences: totals.totalReferences,
  instantiatedReferences: totals.instantiatedReferences,
  missingOperations: totals.missingOperations,
  missingCanonicalSamples: totals.missingCanonicalSamples,
  unsatisfiedCanonicalSamples: totals.unsatisfiedCanonicalSamples,
});

const describeInteractionLawDayInterchangeInstantiationTotals = (
  label: string,
  totals: InteractionLawDayInterchangeInstantiationTotals,
): string => {
  if (totals.totalReferences === 0) {
    return `DayInterchangeInstantiation.${label}: no Day references recorded.`;
  }
  const problems = [
    `${totals.missingOperations} missing operation(s)`,
    `${totals.missingCanonicalSamples} missing canonical sample(s)`,
    `${totals.unsatisfiedCanonicalSamples} unsatisfied canonical witness(es)`,
  ].join(", ");
  return `DayInterchangeInstantiation.${label}: ${totals.instantiatedReferences}/${totals.totalReferences} reference(s) instantiated (${problems}).`;
};

const buildInstantiationDiagnostics = <Obj, Arr, Left, Right, Value>(
  role: InteractionLawDayReferenceRole,
  operationLabel: string,
  operation: InteractionLawDayInterchangeOperationSummary<Obj, Arr> | undefined,
  detail: InteractionLawDayInterchangeDetail<Obj, Arr, Left, Right, Value>,
): string[] => {
  const diagnostics: string[] = [];
  const prefix = `DayInterchangeInstantiation.${role}.${operationLabel}`;
  if (!operation) {
    diagnostics.push(
      `${prefix}: operation not found in interaction-law operations list.`,
    );
  } else {
    diagnostics.push(
      `${prefix}: located operation (arity=${operation.arity}, dayReferences=${operation.dayReferenceCount}).`,
    );
    diagnostics.push(
      `${prefix}: transformation=${operation.hasTransformation}; genericWitness=${operation.hasGenericWitness}; nullaryComponent=${operation.hasNullaryComponent}; commutativeComponent=${operation.hasCommutativeComponent}.`,
    );
    if (operation.metadata?.length) {
      diagnostics.push(
        `${prefix}: operation metadata (${operation.metadata.length}) => ${operation.metadata.join(", ")}.`,
      );
    }
    if (operation.lawvereWitness) {
      diagnostics.push(
        `${prefix}: Lawvere witness ${describeDiagnosticValue(operation.lawvereWitness.morphism)} : ${describeDiagnosticValue(operation.lawvereWitness.domain)} → ${describeDiagnosticValue(operation.lawvereWitness.codomain)}.`,
      );
    }
  }
  if (!detail.canonicalSample) {
    diagnostics.push(`${prefix}: canonical sample missing.`);
  }
  if (!detail.canonicalSatisfied) {
    diagnostics.push(`${prefix}: canonical Day witness did not satisfy referenced fiber.`);
  }
  return diagnostics;
};

export const instantiateInteractionLawDayInterchangeFromSummary = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  summary: InteractionLawDayInterchangeSummary<Obj, Arr, Left, Right, Value>,
): InteractionLawDayInterchangeInstantiationReport<Obj, Arr, Left, Right, Value> => {
  const overallTotals = createMutableInteractionLawDayInterchangeInstantiationTotals();
  const roleTotals: Record<
    InteractionLawDayReferenceRole,
    MutableInteractionLawDayInterchangeInstantiationTotals
  > = {
    monad: createMutableInteractionLawDayInterchangeInstantiationTotals(),
    comonad: createMutableInteractionLawDayInterchangeInstantiationTotals(),
  };

  const findOperation = (
    role: InteractionLawDayReferenceRole,
    label: string,
  ): (MonadOperation<Obj, Arr> | ComonadCooperation<Obj, Arr>) | undefined => {
    if (role === "monad") {
      return law.operations?.monadOperations?.find((operation) => operation.label === label);
    }
    return law.operations?.comonadCooperations?.find((operation) => operation.label === label);
  };

  const details: InteractionLawDayInterchangeInstantiationDetail<
    Obj,
    Arr,
    Left,
    Right,
    Value
  >[] = summary.details.map((detail) => {
    const operation = findOperation(detail.role, detail.operation);
    const operationSummary = operation
      ? summarizeDayInterchangeOperation(operation)
      : undefined;
    const diagnostics = buildInstantiationDiagnostics(
      detail.role,
      detail.operation,
      operationSummary,
      detail,
    );
    const holds = Boolean(operationSummary) && detail.canonicalSatisfied && Boolean(detail.canonicalSample);

    overallTotals.totalReferences += 1;
    roleTotals[detail.role].totalReferences += 1;

    if (!operationSummary) {
      overallTotals.missingOperations += 1;
      roleTotals[detail.role].missingOperations += 1;
    }
    if (!detail.canonicalSample) {
      overallTotals.missingCanonicalSamples += 1;
      roleTotals[detail.role].missingCanonicalSamples += 1;
    }
    if (!detail.canonicalSatisfied) {
      overallTotals.unsatisfiedCanonicalSamples += 1;
      roleTotals[detail.role].unsatisfiedCanonicalSamples += 1;
    }
    if (holds) {
      overallTotals.instantiatedReferences += 1;
      roleTotals[detail.role].instantiatedReferences += 1;
    }

    return {
      detail,
      ...(operationSummary ? { operation: operationSummary } : {}),
      diagnostics,
      holds,
    };
  });

  const finalizedTotals = finalizeInteractionLawDayInterchangeInstantiationTotals(
    overallTotals,
  );
  const finalizedRoleTotals: Record<
    InteractionLawDayReferenceRole,
    InteractionLawDayInterchangeInstantiationTotals
  > = {
    monad: finalizeInteractionLawDayInterchangeInstantiationTotals(roleTotals.monad),
    comonad: finalizeInteractionLawDayInterchangeInstantiationTotals(roleTotals.comonad),
  };

  const diagnostics = [
    describeInteractionLawDayInterchangeInstantiationTotals(
      "overall",
      finalizedTotals,
    ),
    describeInteractionLawDayInterchangeInstantiationTotals(
      "monad",
      finalizedRoleTotals.monad,
    ),
    describeInteractionLawDayInterchangeInstantiationTotals(
      "comonad",
      finalizedRoleTotals.comonad,
    ),
    ...details.flatMap((entry) => entry.diagnostics),
  ];

  return {
    kernel: law.kernel,
    summary,
    details,
    totals: finalizedTotals,
    roleTotals: finalizedRoleTotals,
    diagnostics,
    holds:
      finalizedTotals.totalReferences === finalizedTotals.instantiatedReferences &&
      summary.holds,
  };
};

export const instantiateInteractionLawDayInterchangeFromReport = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  report: InteractionLawDayInterchangeReport<Obj, Arr, Left, Right, Value>,
): InteractionLawDayInterchangeInstantiationReport<Obj, Arr, Left, Right, Value> =>
  instantiateInteractionLawDayInterchangeFromSummary(law, report.summary);

export const instantiateInteractionLawDayInterchange = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  options: InteractionLawDayInterchangeOptions = {},
): InteractionLawDayInterchangeInstantiationReport<Obj, Arr, Left, Right, Value> =>
  instantiateInteractionLawDayInterchangeFromSummary(
    law,
    summarizeInteractionLawDayInterchangePreparation(law, options),
  );

export interface InteractionLawDayInterchangeInstantiationCheckDetail<
  Obj,
  Arr,
  Left,
  Right,
  Value,
> {
  readonly instantiation: InteractionLawDayInterchangeInstantiationDetail<
    Obj,
    Arr,
    Left,
    Right,
    Value
  >;
  readonly evaluation?: Value;
  readonly aggregated?: Value;
  readonly matches: boolean;
  readonly diagnostics: ReadonlyArray<string>;
  readonly holds: boolean;
}

export interface InteractionLawDayInterchangeInstantiationCheckTotals {
  readonly totalReferences: number;
  readonly matchedReferences: number;
  readonly mismatchedReferences: number;
  readonly missingCanonicalSamples: number;
}

export interface InteractionLawDayInterchangeInstantiationCheckReport<
  Obj,
  Arr,
  Left,
  Right,
  Value,
> {
  readonly kernel: PromonoidalKernel<Obj, Arr>;
  readonly instantiation: InteractionLawDayInterchangeInstantiationReport<
    Obj,
    Arr,
    Left,
    Right,
    Value
  >;
  readonly details: ReadonlyArray<
    InteractionLawDayInterchangeInstantiationCheckDetail<
      Obj,
      Arr,
      Left,
      Right,
      Value
    >
  >;
  readonly totals: InteractionLawDayInterchangeInstantiationCheckTotals;
  readonly diagnostics: ReadonlyArray<string>;
  readonly holds: boolean;
}

export interface InteractionLawDayInterchangeInstantiationCheckOptions<
  Obj,
  Arr,
  Left,
  Right,
  Value,
> extends InteractionLawDayInterchangeOptions {
  readonly instantiation?: InteractionLawDayInterchangeInstantiationReport<
    Obj,
    Arr,
    Left,
    Right,
    Value
  >;
}

export const verifyInteractionLawDayInterchangeInstantiationFromReport = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  instantiation: InteractionLawDayInterchangeInstantiationReport<
    Obj,
    Arr,
    Left,
    Right,
    Value
  >,
): InteractionLawDayInterchangeInstantiationCheckReport<
  Obj,
  Arr,
  Left,
  Right,
  Value
> => {
  const equals =
    semanticsAwareEquals(law.dualizing) ?? ((left: Value, right: Value) => Object.is(left, right));

  let matchedReferences = 0;
  let mismatchedReferences = 0;
  let missingCanonicalSamples = 0;

  const details = instantiation.details.map((entry) => {
    const { detail } = entry;
    const prefix = `DayInterchangeInstantiationCheck.${detail.role}.${detail.operation}`;
    const diagnostics: string[] = [];

    const canonicalSample = detail.canonicalSample;
    if (!canonicalSample) {
      diagnostics.push(
        `${prefix}: canonical sample unavailable for reference ${String(detail.reference.fiber)}.`,
      );
      diagnostics.push(
        `${prefix}: prior instantiation diagnostics: ${entry.diagnostics.join(" | ")}.`,
      );
      missingCanonicalSamples += 1;
      mismatchedReferences += 1;
      return {
        instantiation: entry,
        matches: false,
        diagnostics,
        holds: false,
      } satisfies InteractionLawDayInterchangeInstantiationCheckDetail<
        Obj,
        Arr,
        Left,
        Right,
        Value
      >;
    }

    const aggregated = law.aggregate(canonicalSample.contributions);
    const evaluation = law.evaluate(canonicalSample.primal, canonicalSample.dual);
    const matches = equals(aggregated, evaluation);

    diagnostics.push(
      `${prefix}: aggregated canonical contributions -> ${describeDiagnosticValue(aggregated)}; evaluation ${describeDiagnosticValue(evaluation)} (${matches ? "match" : "mismatch"}).`,
    );
    diagnostics.push(...entry.diagnostics);

    const holds = entry.holds && matches;
    if (holds) {
      matchedReferences += 1;
    } else {
      mismatchedReferences += 1;
    }

    return {
      instantiation: entry,
      aggregated,
      evaluation,
      matches,
      diagnostics,
      holds,
    } satisfies InteractionLawDayInterchangeInstantiationCheckDetail<
      Obj,
      Arr,
      Left,
      Right,
      Value
    >;
  });

  const totals: InteractionLawDayInterchangeInstantiationCheckTotals = {
    totalReferences: instantiation.details.length,
    matchedReferences,
    mismatchedReferences,
    missingCanonicalSamples,
  };

  const diagnostics = [
    totals.totalReferences === 0
      ? "DayInterchangeInstantiationCheck: no Day references to verify."
      : `DayInterchangeInstantiationCheck: ${totals.matchedReferences}/${totals.totalReferences} canonical sample(s) matched aggregated evaluations (${totals.missingCanonicalSamples} missing samples).`,
    ...details.flatMap((entry) => entry.diagnostics),
  ];

  return {
    kernel: law.kernel,
    instantiation,
    details,
    totals,
    diagnostics,
    holds:
      totals.totalReferences === totals.matchedReferences && totals.missingCanonicalSamples === 0,
  };
};

export const verifyInteractionLawDayInterchangeInstantiation = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  options: InteractionLawDayInterchangeInstantiationCheckOptions<
    Obj,
    Arr,
    Left,
    Right,
    Value
  > = {},
): InteractionLawDayInterchangeInstantiationCheckReport<
  Obj,
  Arr,
  Left,
  Right,
  Value
> =>
  verifyInteractionLawDayInterchangeInstantiationFromReport(
    law,
    options.instantiation ?? instantiateInteractionLawDayInterchange(law, options),
  );

export interface InteractionLawDayInterchangeCheckOptions<
  Obj,
  Arr,
  Left,
  Right,
  Value,
> extends InteractionLawDayInterchangeInstantiationCheckOptions<
    Obj,
    Arr,
    Left,
    Right,
    Value
  > {
  readonly report?: InteractionLawDayInterchangeReport<Obj, Arr, Left, Right, Value>;
  readonly verification?: InteractionLawDayInterchangeInstantiationCheckReport<
    Obj,
    Arr,
    Left,
    Right,
    Value
  >;
}

export interface InteractionLawDayInterchangeCheckReport<
  Obj,
  Arr,
  Left,
  Right,
  Value,
> {
  readonly kernel: PromonoidalKernel<Obj, Arr>;
  readonly report: InteractionLawDayInterchangeReport<Obj, Arr, Left, Right, Value>;
  readonly instantiation: InteractionLawDayInterchangeInstantiationReport<
    Obj,
    Arr,
    Left,
    Right,
    Value
  >;
  readonly verification: InteractionLawDayInterchangeInstantiationCheckReport<
    Obj,
    Arr,
    Left,
    Right,
    Value
  >;
  readonly diagnostics: ReadonlyArray<string>;
  readonly holds: boolean;
}

const buildDayInterchangeCheckDiagnostics = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
>(
  report: InteractionLawDayInterchangeReport<Obj, Arr, Left, Right, Value>,
  instantiation: InteractionLawDayInterchangeInstantiationReport<
    Obj,
    Arr,
    Left,
    Right,
    Value
  >,
  verification: InteractionLawDayInterchangeInstantiationCheckReport<
    Obj,
    Arr,
    Left,
    Right,
    Value
  >,
): ReadonlyArray<string> => {
  const preface =
    `checkInteractionLawDayInterchange: summary=${report.holds ? "holds" : "fails"}` +
    `, instantiation=${instantiation.holds ? "holds" : "fails"}` +
    `, verification=${verification.holds ? "holds" : "fails"}.`;
  return [
    preface,
    ...report.diagnostics,
    ...instantiation.diagnostics,
    ...verification.diagnostics,
  ];
};

export const checkInteractionLawDayInterchangeFromReport = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  report: InteractionLawDayInterchangeReport<Obj, Arr, Left, Right, Value>,
  options: InteractionLawDayInterchangeCheckOptions<
    Obj,
    Arr,
    Left,
    Right,
    Value
  > = {},
): InteractionLawDayInterchangeCheckReport<Obj, Arr, Left, Right, Value> => {
  const instantiation =
    options.instantiation ??
    instantiateInteractionLawDayInterchangeFromReport(law, report);
  const verification =
    options.verification ??
    verifyInteractionLawDayInterchangeInstantiationFromReport(law, instantiation);
  const diagnostics = buildDayInterchangeCheckDiagnostics(
    report,
    instantiation,
    verification,
  );
  return {
    kernel: report.kernel,
    report,
    instantiation,
    verification,
    diagnostics,
    holds: report.holds && instantiation.holds && verification.holds,
  } satisfies InteractionLawDayInterchangeCheckReport<Obj, Arr, Left, Right, Value>;
};

export const checkInteractionLawDayInterchange = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  options: InteractionLawDayInterchangeCheckOptions<
    Obj,
    Arr,
    Left,
    Right,
    Value
  > = {},
): InteractionLawDayInterchangeCheckReport<Obj, Arr, Left, Right, Value> => {
  const report =
    options.report ?? summarizeInteractionLawDayInterchange(law, options);
  return checkInteractionLawDayInterchangeFromReport(law, report, options);
};

export const coproductInteractionLaw = <
  Obj,
  Arr,
  Left0,
  Right0,
  Value0,
  Left1,
  Right1,
  Value1,
>(
  law0: FunctorInteractionLaw<Obj, Arr, Left0, Right0, Value0>,
  law1: FunctorInteractionLaw<Obj, Arr, Left1, Right1, Value1>,
): CoproductInteractionLawResult<Obj, Arr, Left0, Right0, Value0, Left1, Right1, Value1> => {
  if (law0.kernel !== law1.kernel) {
    throw new Error("coproductInteractionLaw: both laws must use the same promonoidal kernel.");
  }

  const { kernel } = law0;
  const leftCoproducts = new Map<Obj, CoproductData<Left0, Left1>>();
  const rightCoproducts = new Map<Obj, CoproductData<Right0, Right1>>();

  const getLeftCoproduct = (object: Obj): CoproductData<Left0, Left1> => {
    let coproduct = leftCoproducts.get(object);
    if (!coproduct) {
      coproduct = SetCat.coproduct(
        law0.left.functor.F0(object),
        law1.left.functor.F0(object),
      );
      leftCoproducts.set(object, coproduct);
    }
    return coproduct;
  };

  const getRightCoproduct = (object: Obj): CoproductData<Right0, Right1> => {
    let coproduct = rightCoproducts.get(object);
    if (!coproduct) {
      coproduct = SetCat.coproduct(
        law0.right.functor.F0(object),
        law1.right.functor.F0(object),
      );
      rightCoproducts.set(object, coproduct);
    }
    return coproduct;
  };

  const leftCoproductSimpleCategory = setSimpleCategory as unknown as SimpleCat<
    SetObj<Coproduct<Left0, Left1>>,
    SetHom<Coproduct<Left0, Left1>, Coproduct<Left0, Left1>>
  >;

  const left = constructContravariantFunctorWithWitness(
    kernel.base,
    leftCoproductSimpleCategory,
    {
      F0: (object) => getLeftCoproduct(object).object,
      F1: (arrow) => {
        const domain = getLeftCoproduct(kernel.base.dst(arrow));
        const codomain = getLeftCoproduct(kernel.base.src(arrow));
        const map0 = law0.left.functor.F1(arrow);
        const map1 = law1.left.functor.F1(arrow);
        return SetCat.hom(domain.object, codomain.object, (value) => {
          if (value.tag === "inl") {
            const mapped = map0.map(value.value);
            return codomain.injections.inl.map(mapped);
          }
          const mapped = map1.map(value.value);
          return codomain.injections.inr.map(mapped);
        }) as SetHom<Coproduct<Left0, Left1>, Coproduct<Left0, Left1>>;
      },
    },
  );

  const rightCoproductSimpleCategory = setSimpleCategory as unknown as SimpleCat<
    SetObj<Coproduct<Right0, Right1>>,
    SetHom<Coproduct<Right0, Right1>, Coproduct<Right0, Right1>>
  >;

  const right = constructFunctorWithWitness(
    kernel.base,
    rightCoproductSimpleCategory,
    {
      F0: (object) => getRightCoproduct(object).object,
      F1: (arrow) => {
        const domain = getRightCoproduct(kernel.base.src(arrow));
        const codomain = getRightCoproduct(kernel.base.dst(arrow));
        const map0 = law0.right.functor.F1(arrow);
        const map1 = law1.right.functor.F1(arrow);
        return SetCat.hom(domain.object, codomain.object, (value) => {
          if (value.tag === "inl") {
            const mapped = map0.map(value.value);
            return codomain.injections.inl.map(mapped);
          }
          const mapped = map1.map(value.value);
          return codomain.injections.inr.map(mapped);
        }) as SetHom<Coproduct<Right0, Right1>, Coproduct<Right0, Right1>>;
      },
    },
  );

  const convolution = dayTensor(kernel, left, right);
  const dualizingCoproduct = SetCat.coproduct(law0.dualizing, law1.dualizing);

  const fiber0 = buildFiberLookup(law0);
  const fiber1 = buildFiberLookup(law1);

  const pairing = (
    object: Obj,
    carrier: ReturnType<typeof convolution.functor.functor.F0>,
  ) => SetCat.hom(carrier, dualizingCoproduct.object, (cls) => {
    const data = cls as {
      readonly diagonalObject: Obj;
      readonly witness: {
        readonly kernelLeft: Obj;
        readonly kernelRight: Obj;
        readonly output: Obj;
        readonly kernelValue: PromonoidalTensorValue<Obj, Arr>;
        readonly leftElement: Coproduct<Left0, Left1>;
        readonly rightElement: Coproduct<Right0, Right1>;
      };
    };

    const { leftElement, rightElement } = data.witness;
    if (leftElement.tag === "inl") {
      if (rightElement.tag !== "inl") {
        throw new Error(
          "coproductInteractionLaw: left/right contributions must agree on the coproduct summand.",
        );
      }
      const value0 = evaluateWitnessForLaw(law0, fiber0, object, data.diagonalObject, {
        kernelLeft: data.witness.kernelLeft,
        kernelRight: data.witness.kernelRight,
        output: data.witness.output,
        kernelValue: data.witness.kernelValue,
        leftElement: leftElement.value,
        rightElement: rightElement.value,
      });
      return dualizingCoproduct.injections.inl.map(value0);
    }
    if (rightElement.tag !== "inr") {
      throw new Error(
        "coproductInteractionLaw: left/right contributions must agree on the coproduct summand.",
      );
    }
    const value1 = evaluateWitnessForLaw(law1, fiber1, object, data.diagonalObject, {
      kernelLeft: data.witness.kernelLeft,
      kernelRight: data.witness.kernelRight,
      output: data.witness.output,
      kernelValue: data.witness.kernelValue,
      leftElement: leftElement.value,
      rightElement: rightElement.value,
    });
    return dualizingCoproduct.injections.inr.map(value1);
  });

  const aggregate: DayPairingAggregator<
    Obj,
    Arr,
    Coproduct<Left0, Left1>,
    Coproduct<Right0, Right1>,
    Coproduct<Value0, Value1>
  > = (contributions) => {
    const mapped0: DayPairingContribution<Obj, Arr, Left0, Right0, Value0>[] = [];
    const mapped1: DayPairingContribution<Obj, Arr, Left1, Right1, Value1>[] = [];

    for (const entry of contributions) {
      const leftElement = entry.left.element;
      const rightElement = entry.right.element;
      if (leftElement.tag === "inl") {
        if (rightElement.tag !== "inl") {
          throw new Error(
            "coproductInteractionLaw: aggregate requires matching coproduct summands.",
          );
        }
        mapped0.push({
          output: entry.output,
          diagonal: entry.diagonal,
          kernelLeft: entry.kernelLeft,
          kernelRight: entry.kernelRight,
          kernelValue: entry.kernelValue,
          left: { object: entry.left.object, element: leftElement.value },
          right: { object: entry.right.object, element: rightElement.value },
          evaluation: evaluateWitnessForLaw(law0, fiber0, entry.output, entry.diagonal, {
            kernelLeft: entry.kernelLeft,
            kernelRight: entry.kernelRight,
            output: entry.output,
            kernelValue: entry.kernelValue,
            leftElement: leftElement.value,
            rightElement: rightElement.value,
          }),
        });
        continue;
      }
      if (rightElement.tag !== "inr") {
        throw new Error(
          "coproductInteractionLaw: aggregate requires matching coproduct summands.",
        );
      }
      mapped1.push({
        output: entry.output,
        diagonal: entry.diagonal,
        kernelLeft: entry.kernelLeft,
        kernelRight: entry.kernelRight,
        kernelValue: entry.kernelValue,
        left: { object: entry.left.object, element: leftElement.value },
        right: { object: entry.right.object, element: rightElement.value },
        evaluation: evaluateWitnessForLaw(law1, fiber1, entry.output, entry.diagonal, {
          kernelLeft: entry.kernelLeft,
          kernelRight: entry.kernelRight,
          output: entry.output,
          kernelValue: entry.kernelValue,
          leftElement: leftElement.value,
          rightElement: rightElement.value,
        }),
      });
    }

    const hasLeft = mapped0.length > 0;
    const hasRight = mapped1.length > 0;
    if (hasLeft && hasRight) {
      throw new Error(
        "coproductInteractionLaw: collected contributions should not mix coproduct summands.",
      );
    }
    if (hasLeft) {
      return dualizingCoproduct.injections.inl.map(law0.aggregate(mapped0));
    }
    if (hasRight) {
      return dualizingCoproduct.injections.inr.map(law1.aggregate(mapped1));
    }
    throw new Error("coproductInteractionLaw: aggregate requires at least one contribution.");
  };

  const mergedOperations = mergeOperations(law0.operations, law1.operations);

  const law = makeFunctorInteractionLaw({
    kernel,
    left,
    right,
    convolution,
    dualizing: dualizingCoproduct.object,
    pairing,
    aggregate,
    ...(mergedOperations ? { operations: mergedOperations } : {}),
  });

  const injections: InteractionLawCoproductInjections<
    Obj,
    Left0,
    Left1,
    Right0,
    Right1,
    Value0,
    Value1
  > = {
    left: (object) => getLeftCoproduct(object),
    right: (object) => getRightCoproduct(object),
    value: dualizingCoproduct,
  };

  return { law, injections };
};

export interface InteractionLawFiberDiscrepancy<Obj, Left, Right, Value> {
  readonly object: Obj;
  readonly primal: IndexedElement<Obj, Left>;
  readonly dual: IndexedElement<Obj, Right>;
  readonly original: Value;
  readonly reconstructed: Value;
}

export interface InteractionLawFinalTransformationEvaluation<
  Obj,
  Left,
  Right,
  Value,
> {
  readonly primal: IndexedElement<Obj, Left>;
  readonly evaluations: ReadonlyArray<{
    readonly dual: IndexedElement<Obj, Right>;
    readonly value: Value;
  }>;
}

export interface InteractionLawFiberFinalTransformationComponent<
  Obj,
  Left,
  Right,
  Value,
> {
  readonly parameter: Obj;
  readonly tensorObject: Obj;
  readonly domain: SetObj<Left>;
  readonly codomain: SetObj<Right>;
  readonly evaluationTable: ReadonlyArray<
    InteractionLawFinalTransformationEvaluation<Obj, Left, Right, Value>
  >;
  readonly diagnostics: ReadonlyArray<string>;
}

export interface InteractionLawFiberFinalTransformation<Obj, Left, Right, Value> {
  readonly implemented: boolean;
  readonly components: ReadonlyArray<
    InteractionLawFiberFinalTransformationComponent<Obj, Left, Right, Value>
  >;
  readonly diagnostics: ReadonlyArray<string>;
}

export interface InteractionLawFiberCurrying<Obj, Arr, Left, Right, Value> {
  readonly object: Obj;
  readonly primalFiber: SetObj<IndexedElement<Obj, Left>>;
  readonly dualFiber: SetObj<IndexedElement<Obj, Right>>;
  readonly product: ProductData<IndexedElement<Obj, Left>, IndexedElement<Obj, Right>>;
  readonly phi: SetHom<readonly [IndexedElement<Obj, Left>, IndexedElement<Obj, Right>], Value>;
  readonly theta: SetHom<
    IndexedElement<Obj, Left>,
    ExponentialArrow<IndexedElement<Obj, Right>, Value>
  >;
  readonly phiHat: SetHom<
    IndexedElement<Obj, Left>,
    ExponentialArrow<IndexedElement<Obj, Right>, Value>
  >;
  readonly phiCheck: SetHom<
    Left,
    ExponentialArrow<IndexedElement<Obj, Right>, Value>
  >;
  readonly exponential: ExponentialData<IndexedElement<Obj, Right>, Value>;
  readonly evaluation: SetHom<
    readonly [ExponentialArrow<IndexedElement<Obj, Right>, Value>, IndexedElement<Obj, Right>],
    Value
  >;
  readonly reconstructed: SetHom<
    readonly [IndexedElement<Obj, Left>, IndexedElement<Obj, Right>],
    Value
  >;
  readonly doubleTransposeConsistent: boolean;
  readonly hatEvaluationConsistent: boolean;
  readonly consistent: boolean;
  readonly discrepancies: ReadonlyArray<{
    readonly primal: IndexedElement<Obj, Left>;
    readonly dual: IndexedElement<Obj, Right>;
    readonly original: Value;
    readonly reconstructed: Value;
  }>;
  readonly hatEvaluationDiscrepancies: ReadonlyArray<{
    readonly primal: IndexedElement<Obj, Left>;
    readonly dual: IndexedElement<Obj, Right>;
    readonly original: Value;
    readonly reconstructed: Value;
  }>;
  readonly finalTransformation: InteractionLawFiberFinalTransformation<
    Obj,
    Left,
    Right,
    Value
  >;
}

export interface InteractionLawCurryingSummary<Obj, Arr, Left, Right, Value> {
  readonly law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>;
  readonly fibers: ReadonlyMap<Obj, InteractionLawFiberCurrying<Obj, Arr, Left, Right, Value>>;
  readonly doubleTransposeConsistent: boolean;
  readonly hatEvaluationConsistent: boolean;
  readonly consistent: boolean;
  readonly discrepancies: ReadonlyArray<InteractionLawFiberDiscrepancy<Obj, Left, Right, Value>>;
  readonly hatEvaluationDiscrepancies: ReadonlyArray<
    InteractionLawFiberDiscrepancy<Obj, Left, Right, Value>
  >;
}

export const deriveInteractionLawCurrying = <Obj, Arr, Left, Right, Value>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
): InteractionLawCurryingSummary<Obj, Arr, Left, Right, Value> => {
  const fibers = new Map<Obj, InteractionLawFiberCurrying<Obj, Arr, Left, Right, Value>>();
  const discrepancies: InteractionLawFiberDiscrepancy<Obj, Left, Right, Value>[] = [];
  const hatEvaluationDiscrepancies: InteractionLawFiberDiscrepancy<Obj, Left, Right, Value>[] = [];

  for (const object of law.kernel.base.objects) {
    const leftCarrier = law.left.functor.F0(object);
    const rightCarrier = law.right.functor.F0(object);
    const primalFiber = buildIndexedFiberCarrier(object, leftCarrier, `PrimalFiber(${String(object)})`);
    const dualFiber = buildIndexedFiberCarrier(object, rightCarrier, `DualFiber(${String(object)})`);
    const product = SetCat.product(primalFiber, dualFiber);

    const phi = SetCat.hom(product.object, law.dualizing, ([primal, dual]) =>
      law.evaluate(primal, dual),
    );

    const exponential = SetCat.exponential(dualFiber, law.dualizing);
    const theta = exponential.curry({ domain: primalFiber, product, morphism: phi });
    const reconstructed = exponential.uncurry({ product, morphism: theta });
    const phiCheck = SetCat.hom(leftCarrier, exponential.object, (element) =>
      theta.map({ object, element }),
    );

    const fiberDiscrepancies: Array<{
      readonly primal: IndexedElement<Obj, Left>;
      readonly dual: IndexedElement<Obj, Right>;
      readonly original: Value;
      readonly reconstructed: Value;
    }> = [];

    for (const pair of enumerateCarrier(product.object)) {
      const original = phi.map(pair);
      const recalculated = reconstructed.map(pair);
      if (!Object.is(original, recalculated)) {
        const [primal, dual] = pair;
        fiberDiscrepancies.push({ primal, dual, original, reconstructed: recalculated });
        discrepancies.push({ object, primal, dual, original, reconstructed: recalculated });
      }
    }

    const hatFiberDiscrepancies: Array<{
      readonly primal: IndexedElement<Obj, Left>;
      readonly dual: IndexedElement<Obj, Right>;
      readonly original: Value;
      readonly reconstructed: Value;
    }> = [];

    for (const element of enumerateCarrier(leftCarrier)) {
      const primal: IndexedElement<Obj, Left> = { object, element };
      const arrow = phiCheck.map(element);
      for (const dual of enumerateCarrier(dualFiber)) {
        const original = law.evaluate(primal, dual);
        const reconstructedValue = exponential.evaluation.map([arrow, dual]);
        if (!Object.is(original, reconstructedValue)) {
          hatFiberDiscrepancies.push({
            primal,
            dual,
            original,
            reconstructed: reconstructedValue,
          });
          hatEvaluationDiscrepancies.push({
            object,
            primal,
            dual,
            original,
            reconstructed: reconstructedValue,
          });
        }
      }
    }

    const finalComponents: Array<
      InteractionLawFiberFinalTransformationComponent<Obj, Left, Right, Value>
    > = [];
    const finalDiagnostics: string[] = [];

    for (const parameter of law.kernel.base.objects) {
      const tensorObject = law.kernel.tensor.functor.onObjects([object, parameter]);
      const domain = law.left.functor.F0(tensorObject) as SetObj<Left>;
      const codomain = law.right.functor.F0(parameter) as SetObj<Right>;

      const domainElements = enumerateCarrier(domain).map<IndexedElement<Obj, Left>>(
        (element) => ({ object: tensorObject, element: element as Left }),
      );
      const codomainElements = enumerateCarrier(codomain).map<IndexedElement<Obj, Right>>(
        (element) => ({ object: parameter, element: element as Right }),
      );

      const evaluationTable = domainElements.map<
        InteractionLawFinalTransformationEvaluation<Obj, Left, Right, Value>
      >((primalElement) => ({
        primal: primalElement,
        evaluations: codomainElements.map((dualElement) => ({
          dual: dualElement,
          value: law.evaluate(primalElement, dualElement),
        })),
      }));

      const componentDiagnostics: string[] = [
        `?^${String(object)}_${String(parameter)} tabulates ${domainElements.length} domain element(s)` +
          ` against ${codomainElements.length} candidate(s) of G(${String(parameter)}).`,
      ];
      if (domainElements.length === 0) {
        componentDiagnostics.push(
          `F(${String(tensorObject)}) is empty; ?^${String(object)}_${String(parameter)} has no samples to evaluate.`,
        );
      }
      if (codomainElements.length === 0) {
        componentDiagnostics.push(
          `G(${String(parameter)}) is empty; ?^${String(object)}_${String(parameter)} produces no targets.`,
        );
      }

      finalComponents.push({
        parameter,
        tensorObject,
        domain,
        codomain,
        evaluationTable,
        diagnostics: componentDiagnostics,
      });
    }

    finalDiagnostics.push(
      `Recorded ${finalComponents.length} component(s) of ?^${String(object)}_(-)` +
        " with Day-based evaluation tables.",
    );

    fibers.set(object, {
      object,
      primalFiber,
      dualFiber,
      product,
      phi,
      theta,
      phiHat: theta,
      phiCheck,
      exponential,
      evaluation: exponential.evaluation,
      reconstructed,
      doubleTransposeConsistent: fiberDiscrepancies.length === 0,
      hatEvaluationConsistent: hatFiberDiscrepancies.length === 0,
      consistent:
        fiberDiscrepancies.length === 0 && hatFiberDiscrepancies.length === 0,
      discrepancies: fiberDiscrepancies,
      hatEvaluationDiscrepancies: hatFiberDiscrepancies,
      finalTransformation: {
        implemented: true,
        components: finalComponents,
        diagnostics: finalDiagnostics,
      },
    });
  }

  return {
    law,
    fibers,
    doubleTransposeConsistent: discrepancies.length === 0,
    hatEvaluationConsistent: hatEvaluationDiscrepancies.length === 0,
    consistent:
      discrepancies.length === 0 && hatEvaluationDiscrepancies.length === 0,
    discrepancies,
    hatEvaluationDiscrepancies,
  };
};

export const deriveInteractionLawCCCPresentation = <Obj, Arr, Left, Right, Value>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
): InteractionLawCurryingSummary<Obj, Arr, Left, Right, Value> =>
  deriveInteractionLawCurrying(law);

const DEFAULT_MONOID_PREPARATION_SAMPLE_LIMIT = 24;

export interface InteractionLawMonoidPreparationSample<Obj, Left, Right, Value> {
  readonly object: Obj;
  readonly parameter: Obj;
  readonly tensorObject: Obj;
  readonly primal: IndexedElement<Obj, Left>;
  readonly dual: IndexedElement<Obj, Right>;
  readonly value: Value;
}

export interface InteractionLawMonoidPreparationComponent<Obj, Left, Right, Value> {
  readonly object: Obj;
  readonly parameter: Obj;
  readonly tensorObject: Obj;
  readonly domain: SetObj<Left>;
  readonly codomain: SetObj<Right>;
  readonly codomainIndexed: SetObj<IndexedElement<Obj, Right>>;
  readonly exponentialObject: SetObj<
    ExponentialArrow<IndexedElement<Obj, Right>, Value>
  >;
  readonly hom: SetHom<Left, ExponentialArrow<IndexedElement<Obj, Right>, Value>>;
  readonly domainSize: number;
  readonly codomainSize: number;
  readonly samples: ReadonlyArray<InteractionLawMonoidPreparationSample<Obj, Left, Right, Value>>;
  readonly diagnostics: ReadonlyArray<string>;
}

export interface InteractionLawMonoidPreparationOptions<Obj, Arr, Left, Right, Value> {
  readonly currying?: InteractionLawCurryingSummary<Obj, Arr, Left, Right, Value>;
  readonly sampleLimit?: number;
  readonly metadata?: ReadonlyArray<string>;
}

export interface InteractionLawMonoidPreparationSummary<Obj, Arr, Left, Right, Value> {
  readonly law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>;
  readonly currying: InteractionLawCurryingSummary<Obj, Arr, Left, Right, Value>;
  readonly components: ReadonlyArray<
    InteractionLawMonoidPreparationComponent<Obj, Left, Right, Value>
  >;
  readonly diagnostics: ReadonlyArray<string>;
  readonly metadata?: ReadonlyArray<string>;
}

export const summarizeInteractionLawMonoidPreparation = <Obj, Arr, Left, Right, Value>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  options: InteractionLawMonoidPreparationOptions<Obj, Arr, Left, Right, Value> = {},
): InteractionLawMonoidPreparationSummary<Obj, Arr, Left, Right, Value> => {
  const currying = options.currying ?? deriveInteractionLawCurrying(law);
  const sampleLimit = Math.max(0, options.sampleLimit ?? DEFAULT_MONOID_PREPARATION_SAMPLE_LIMIT);

  const components: InteractionLawMonoidPreparationComponent<Obj, Left, Right, Value>[] = [];
  const diagnostics: string[] = [];

  for (const [object, fiber] of currying.fibers) {
    const finalTransformation = fiber.finalTransformation;
    if (!finalTransformation.implemented) {
      diagnostics.push(
        `InteractionLawMonoidPreparation(${String(object)}): final transformation not implemented; skipping Day tensor samples.`,
      );
      continue;
    }

    for (const component of finalTransformation.components) {
      const { parameter, tensorObject, domain, codomain, evaluationTable } = component;

      const samples: InteractionLawMonoidPreparationSample<Obj, Left, Right, Value>[] = [];

      const codomainIndexed = buildIndexedFiberCarrier(
        parameter,
        codomain,
        `InteractionLawMonoidPreparation.codomain(${String(object)}; ${String(parameter)})`,
      );
      const exponential = SetCat.exponential(
        codomainIndexed,
        law.dualizing,
      );
      const hom = SetCat.hom(
        domain,
        exponential.object,
        (element: Left) =>
          exponential.register((dual: IndexedElement<Obj, Right>) =>
            law.evaluate(
              { object: tensorObject, element },
              dual,
            ),
          ),
      );

      outer: for (const row of evaluationTable) {
        for (const entry of row.evaluations) {
          samples.push({
            object,
            parameter,
            tensorObject,
            primal: row.primal,
            dual: entry.dual,
            value: entry.value,
          });
          if (samples.length >= sampleLimit) {
            break outer;
          }
        }
      }

      const domainSize = evaluationTable.length;
      const codomainSize = evaluationTable.reduce(
        (count, row) => Math.max(count, row.evaluations.length),
        0,
      );

      const componentDiagnostics: string[] = [
        `InteractionLawMonoidPreparation(${String(object)}; parameter ${String(parameter)}): sampled ${samples.length} element(s) from F(${String(tensorObject)}) × G(${String(parameter)}).`,
        `InteractionLawMonoidPreparation(${String(object)}; parameter ${String(parameter)}): built exponential hom F(${String(tensorObject)}) → [G(${String(parameter)}) ⇒ Ω] with ${domainSize} × ${codomainSize} support.`,
        ...component.diagnostics,
      ];

      diagnostics.push(...componentDiagnostics);

      components.push({
        object,
        parameter,
        tensorObject,
        domain,
        codomain,
        codomainIndexed,
        exponentialObject: exponential.object,
        hom,
        domainSize,
        codomainSize,
        samples,
        diagnostics: componentDiagnostics,
      });
    }
  }

  diagnostics.unshift(
    `InteractionLawMonoidPreparation: analysed ${components.length} component(s) across ${currying.fibers.size} fiber(s) with sample limit ${sampleLimit}.`,
  );

  if (components.length === 0) {
    diagnostics.push(
      "InteractionLawMonoidPreparation: no Day tensor components were available for sampling.",
    );
  }

  const metadata = mergeMetadataList(law.operations?.metadata, options.metadata);

  return {
    law,
    currying,
    components,
    diagnostics,
    ...(metadata ? { metadata } : {}),
  };
};

export interface InteractionLawMonoidMultiplicationTranslatorOptions<
  Obj,
  Arr,
  Left,
  Right,
  Value,
> {
  readonly preparation?: InteractionLawMonoidPreparationSummary<Obj, Arr, Left, Right, Value>;
  readonly preparationOptions?: InteractionLawMonoidPreparationOptions<Obj, Arr, Left, Right, Value>;
  readonly metadata?: ReadonlyArray<string>;
}

export interface InteractionLawMonoidMultiplicationTranslator<
  Obj,
  Arr,
  Left,
  Right,
  Value,
> {
  readonly law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>;
  readonly preparation: InteractionLawMonoidPreparationSummary<Obj, Arr, Left, Right, Value>;
  readonly components: ReadonlyMap<
    Obj,
    ReadonlyMap<Obj, InteractionLawMonoidPreparationComponent<Obj, Left, Right, Value>>
  >;
  readonly diagnostics: ReadonlyArray<string>;
  readonly metadata?: ReadonlyArray<string>;
}

export const makeInteractionLawMonoidMultiplicationTranslator = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  options: InteractionLawMonoidMultiplicationTranslatorOptions<Obj, Arr, Left, Right, Value> = {},
): InteractionLawMonoidMultiplicationTranslator<Obj, Arr, Left, Right, Value> => {
  const preparation =
    options.preparation ??
    summarizeInteractionLawMonoidPreparation(law, options.preparationOptions);

  const components = new Map<
    Obj,
    Map<Obj, InteractionLawMonoidPreparationComponent<Obj, Left, Right, Value>>
  >();
  const diagnostics: string[] = [];

  diagnostics.push(
    options.preparation
      ? "InteractionLawMonoidMultiplicationTranslator: reused supplied monoid preparation summary."
      : "InteractionLawMonoidMultiplicationTranslator: derived monoid preparation summary from interaction law.",
  );

  for (const component of preparation.components) {
    let objectComponents = components.get(component.object);
    if (!objectComponents) {
      objectComponents = new Map();
      components.set(component.object, objectComponents);
    }

    if (objectComponents.has(component.parameter)) {
      const existing = objectComponents.get(component.parameter)!;
      diagnostics.push(
        `InteractionLawMonoidMultiplicationTranslator(${String(component.object)}; parameter ${String(component.parameter)}): duplicate component encountered (tensor ${String(component.tensorObject)}); retaining previously registered tensor ${String(existing.tensorObject)}.`,
      );
      continue;
    }

    objectComponents.set(component.parameter, component);
    diagnostics.push(
      `InteractionLawMonoidMultiplicationTranslator(${String(component.object)}; parameter ${String(component.parameter)}): registered hom F(${String(component.tensorObject)}) → [G(${String(component.parameter)}) ⇒ Ω].`,
    );
  }

  diagnostics.unshift(
    `InteractionLawMonoidMultiplicationTranslator: indexed ${preparation.components.length} component(s) across ${components.size} object(s).`,
  );

  if (preparation.components.length === 0) {
    diagnostics.push(
      "InteractionLawMonoidMultiplicationTranslator: no Day tensor components were available to index.",
    );
  }

  const metadata = mergeMetadataList(preparation.metadata, options.metadata);

  return {
    law,
    preparation,
    components,
    diagnostics,
    ...(metadata ? { metadata } : {}),
  };
};

export const lookupInteractionLawMonoidMultiplicationComponent = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
>(
  translator: InteractionLawMonoidMultiplicationTranslator<Obj, Arr, Left, Right, Value>,
  object: Obj,
  parameter: Obj,
): InteractionLawMonoidPreparationComponent<Obj, Left, Right, Value> | undefined =>
  translator.components.get(object)?.get(parameter);

export interface InteractionLawMonoidMultiplicationRealizationComponent<
  Obj,
  Left,
  Right,
  Value,
> {
  readonly object: Obj;
  readonly parameter: Obj;
  readonly tensorObject: Obj;
  readonly translatorComponent: InteractionLawMonoidPreparationComponent<Obj, Left, Right, Value>;
  readonly hom: SetHom<Left, ExponentialArrow<Right, Value>>;
  readonly evaluation: SetHom<readonly [Left, Right], Value>;
  readonly evaluationProduct: ProductData<Left, Right>;
  readonly samples: ReadonlyArray<InteractionLawMonoidPreparationSample<Obj, Left, Right, Value>>;
  readonly checked: number;
  readonly mismatches: number;
  readonly diagnostics: ReadonlyArray<string>;
}

export interface InteractionLawMonoidMultiplicationRealization<
  Obj,
  Arr,
  Left,
  Right,
  Value,
> {
  readonly translator: InteractionLawMonoidMultiplicationTranslator<Obj, Arr, Left, Right, Value>;
  readonly components: ReadonlyMap<
    Obj,
    ReadonlyMap<Obj, InteractionLawMonoidMultiplicationRealizationComponent<Obj, Left, Right, Value>>
  >;
  readonly checked: number;
  readonly mismatches: number;
  readonly diagnostics: ReadonlyArray<string>;
  readonly metadata?: ReadonlyArray<string>;
}

export interface InteractionLawMonoidMultiplicationRealizationOptions {
  readonly metadata?: ReadonlyArray<string>;
}

export interface InteractionLawMonoidPsiReconstructionComponent<
  Obj,
  Left,
  Right,
  Value,
> {
  readonly object: Obj;
  readonly parameter: Obj;
  readonly translatorComponent: InteractionLawMonoidPreparationComponent<Obj, Left, Right, Value>;
  readonly realizationComponent: InteractionLawMonoidMultiplicationRealizationComponent<
    Obj,
    Left,
    Right,
    Value
  >;
  readonly checked: number;
  readonly translatorMismatches: number;
  readonly realizationMismatches: number;
  readonly lawMismatches: number;
  readonly diagnostics: ReadonlyArray<string>;
}

export interface InteractionLawMonoidPsiReconstruction<
  Obj,
  Arr,
  Left,
  Right,
  Value,
> {
  readonly translator: InteractionLawMonoidMultiplicationTranslator<Obj, Arr, Left, Right, Value>;
  readonly realization: InteractionLawMonoidMultiplicationRealization<Obj, Arr, Left, Right, Value>;
  readonly components: ReadonlyMap<
    Obj,
    ReadonlyMap<Obj, InteractionLawMonoidPsiReconstructionComponent<Obj, Left, Right, Value>>
  >;
  readonly checked: number;
  readonly translatorMismatches: number;
  readonly realizationMismatches: number;
  readonly lawMismatches: number;
  readonly diagnostics: ReadonlyArray<string>;
  readonly metadata?: ReadonlyArray<string>;
}

export interface InteractionLawMonoidPsiReconstructionOptions<
  Obj,
  Arr,
  Left,
  Right,
  Value,
> {
  readonly translator?: InteractionLawMonoidMultiplicationTranslator<Obj, Arr, Left, Right, Value>;
  readonly realization?: InteractionLawMonoidMultiplicationRealization<Obj, Arr, Left, Right, Value>;
  readonly metadata?: ReadonlyArray<string>;
}

export const realizeInteractionLawMonoidMultiplication = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
>(
  translator: InteractionLawMonoidMultiplicationTranslator<Obj, Arr, Left, Right, Value>,
  options: InteractionLawMonoidMultiplicationRealizationOptions = {},
): InteractionLawMonoidMultiplicationRealization<Obj, Arr, Left, Right, Value> => {
  const components = new Map<
    Obj,
    Map<Obj, InteractionLawMonoidMultiplicationRealizationComponent<Obj, Left, Right, Value>>
  >();
  const diagnostics: string[] = [];

  let checkedTotal = 0;
  let mismatchTotal = 0;
  let componentTotal = 0;

  for (const [object, parameterMap] of translator.components) {
    let objectComponents = components.get(object);
    if (!objectComponents) {
      objectComponents = new Map();
      components.set(object, objectComponents);
    }

    for (const [parameter, component] of parameterMap) {
      componentTotal += 1;

      const codomainExponential = SetCat.exponential(
        component.codomain,
        translator.law.dualizing,
      );
      const hom = SetCat.hom(
        component.domain,
        codomainExponential.object,
        (element: Left) => {
          const indexedArrow = component.hom.map(element);
          return codomainExponential.register((right: Right) =>
            indexedArrow({ object: parameter, element: right } as IndexedElement<Obj, Right>),
          );
        },
      );

      const evaluationProduct = SetCat.product(component.domain, component.codomain);
      const evaluation = codomainExponential.uncurry({ morphism: hom, product: evaluationProduct });

      let componentChecked = 0;
      let componentMismatches = 0;
      let firstMismatch: InteractionLawMonoidPreparationSample<Obj, Left, Right, Value> | undefined;

      for (const sample of component.samples) {
        componentChecked += 1;
        const actual = evaluation.map([
          sample.primal.element,
          sample.dual.element,
        ] as const);
        if (!Object.is(actual, sample.value)) {
          componentMismatches += 1;
          if (!firstMismatch) {
            firstMismatch = sample;
          }
        }
      }

      checkedTotal += componentChecked;
      mismatchTotal += componentMismatches;

      const componentDiagnostics: string[] = [
        `InteractionLawMonoidMultiplicationRealization(${String(object)}; parameter ${String(
          parameter,
        )}): built canonical evaluation F(${String(component.tensorObject)}) × G(${String(
          parameter,
        )}) → Ω.`,
      ];

      if (componentChecked === 0) {
        componentDiagnostics.push(
          `InteractionLawMonoidMultiplicationRealization(${String(object)}; parameter ${String(
            parameter,
          )}): no recorded samples were available for verification.`,
        );
      } else {
        componentDiagnostics.push(
          componentMismatches === 0
            ? `InteractionLawMonoidMultiplicationRealization(${String(object)}; parameter ${String(
                parameter,
              )}): verified ${componentChecked} recorded sample(s) with no mismatches.`
            : `InteractionLawMonoidMultiplicationRealization(${String(object)}; parameter ${String(
                parameter,
              )}): detected ${componentMismatches} mismatch(es) across ${componentChecked} recorded sample(s).`,
        );
        if (firstMismatch) {
          componentDiagnostics.push(
            `InteractionLawMonoidMultiplicationRealization(${String(object)}; parameter ${String(
              parameter,
            )}): first mismatch encountered at F(${String(
              component.tensorObject,
            )}) element ${String(firstMismatch.primal.element)} with G(${String(
              parameter,
            )}) element ${String(firstMismatch.dual.element)} — expected ${String(
              firstMismatch.value,
            )} but observed ${String(
              evaluation.map([
                firstMismatch.primal.element,
                firstMismatch.dual.element,
              ] as const),
            )}.`,
          );
        }
      }

      const realization: InteractionLawMonoidMultiplicationRealizationComponent<
        Obj,
        Left,
        Right,
        Value
      > = {
        object,
        parameter,
        tensorObject: component.tensorObject,
        translatorComponent: component,
        hom,
        evaluation,
        evaluationProduct,
        samples: component.samples,
        checked: componentChecked,
        mismatches: componentMismatches,
        diagnostics: componentDiagnostics,
      };

      objectComponents.set(parameter, realization);
      diagnostics.push(...componentDiagnostics);
    }
  }

  diagnostics.unshift(
    `InteractionLawMonoidMultiplicationRealization: materialized ${componentTotal} canonical evaluation component(s) across ${components.size} object(s).`,
    `InteractionLawMonoidMultiplicationRealization: verified ${checkedTotal} recorded sample(s) with ${mismatchTotal} mismatch(es).`,
  );

  if (componentTotal === 0) {
    diagnostics.push(
      "InteractionLawMonoidMultiplicationRealization: translator did not expose any Day tensor components to realise.",
    );
  }

  const metadata = mergeMetadataList(translator.metadata, options.metadata);

  return {
    translator,
    components,
    checked: checkedTotal,
    mismatches: mismatchTotal,
    diagnostics,
    ...(metadata ? { metadata } : {}),
  };
};

export const reconstructInteractionLawMonoidPsi = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
  options: InteractionLawMonoidPsiReconstructionOptions<Obj, Arr, Left, Right, Value> = {},
): InteractionLawMonoidPsiReconstruction<Obj, Arr, Left, Right, Value> => {
  const translator =
    options.translator ?? makeInteractionLawMonoidMultiplicationTranslator(law);
  const realization =
    options.realization ??
    realizeInteractionLawMonoidMultiplication(translator);

  const diagnostics: string[] = [];
  diagnostics.push(
    options.translator
      ? "InteractionLawMonoidPsi: reused monoid multiplication translator supplied via options."
      : "InteractionLawMonoidPsi: derived monoid multiplication translator from interaction law.",
  );
  diagnostics.push(
    options.realization
      ? "InteractionLawMonoidPsi: reused monoid multiplication realization supplied via options."
      : "InteractionLawMonoidPsi: realized canonical monoid multiplication evaluations from translator components.",
  );

  const components = new Map<
    Obj,
    Map<Obj, InteractionLawMonoidPsiReconstructionComponent<Obj, Left, Right, Value>>
  >();

  let checkedTotal = 0;
  let translatorMismatchTotal = 0;
  let realizationMismatchTotal = 0;
  let lawMismatchTotal = 0;

  for (const [object, parameterMap] of translator.components) {
    let objectComponents = components.get(object);
    if (!objectComponents) {
      objectComponents = new Map();
      components.set(object, objectComponents);
    }

    const realizationParameterMap = realization.components.get(object);
    if (!realizationParameterMap) {
      diagnostics.push(
        `InteractionLawMonoidPsi(${String(object)}): realization did not expose canonical evaluations for this object.`,
      );
      continue;
    }

    for (const [parameter, translatorComponent] of parameterMap) {
      const realizationComponent = realizationParameterMap.get(parameter);
      if (!realizationComponent) {
        diagnostics.push(
          `InteractionLawMonoidPsi(${String(object)}; parameter ${String(parameter)}): missing realization component; skipping ψ reconstruction.`,
        );
        continue;
      }

      const componentDiagnostics: string[] = [];
      const samples =
        translatorComponent.samples.length > 0
          ? translatorComponent.samples
          : realizationComponent.samples;

      let componentChecked = 0;
      let componentTranslatorMismatches = 0;
      let componentRealizationMismatches = 0;
      let componentLawMismatches = 0;

      let firstTranslatorMismatch: InteractionLawMonoidPreparationSample<Obj, Left, Right, Value> | undefined;
      let firstRealizationMismatch: InteractionLawMonoidPreparationSample<Obj, Left, Right, Value> | undefined;
      let firstLawMismatch: InteractionLawMonoidPreparationSample<Obj, Left, Right, Value> | undefined;

      for (const sample of samples) {
        componentChecked += 1;
        const translatorArrow = translatorComponent.hom.map(sample.primal.element);
        const translatorValue = translatorArrow(sample.dual);

        const realizationValue = realizationComponent.evaluation.map([
          sample.primal.element,
          sample.dual.element,
        ] as const);

        const lawValue = law.evaluate(sample.primal, sample.dual);

        if (!Object.is(translatorValue, lawValue)) {
          componentTranslatorMismatches += 1;
          if (!firstTranslatorMismatch) {
            firstTranslatorMismatch = sample;
          }
        }

        if (!Object.is(realizationValue, lawValue)) {
          componentRealizationMismatches += 1;
          if (!firstRealizationMismatch) {
            firstRealizationMismatch = sample;
          }
        }

        if (!Object.is(sample.value, lawValue)) {
          componentLawMismatches += 1;
          if (!firstLawMismatch) {
            firstLawMismatch = sample;
          }
        }
      }

      checkedTotal += componentChecked;
      translatorMismatchTotal += componentTranslatorMismatches;
      realizationMismatchTotal += componentRealizationMismatches;
      lawMismatchTotal += componentLawMismatches;

      componentDiagnostics.push(
        `InteractionLawMonoidPsi(${String(object)}; parameter ${String(parameter)}): analysed ${componentChecked} canonical sample(s).`,
      );

      const mismatchSummary = (count: number, label: string, first?: InteractionLawMonoidPreparationSample<Obj, Left, Right, Value>) => {
        if (componentChecked === 0) {
          componentDiagnostics.push(
            `InteractionLawMonoidPsi(${String(object)}; parameter ${String(parameter)}): no recorded samples available for ${label} verification.`,
          );
          return;
        }
        componentDiagnostics.push(
          count === 0
            ? `InteractionLawMonoidPsi(${String(object)}; parameter ${String(parameter)}): ${label} matches all recorded samples.`
            : `InteractionLawMonoidPsi(${String(object)}; parameter ${String(parameter)}): detected ${count} ${label.toLowerCase()} mismatch(es) across ${componentChecked} sample(s).`,
        );
        if (count > 0 && first) {
          componentDiagnostics.push(
            `InteractionLawMonoidPsi(${String(object)}; parameter ${String(parameter)}): first ${label.toLowerCase()} mismatch at F(${String(translatorComponent.tensorObject)}) element ${String(first.primal.element)} with G(${String(parameter)}) element ${String(first.dual.element)} — expected ${String(first.value)} from ψ but reconstructed value differed.`,
          );
        }
      };

      mismatchSummary(componentTranslatorMismatches, "translator", firstTranslatorMismatch);
      mismatchSummary(componentRealizationMismatches, "realization", firstRealizationMismatch);
      mismatchSummary(componentLawMismatches, "sample", firstLawMismatch);

      const componentResult: InteractionLawMonoidPsiReconstructionComponent<Obj, Left, Right, Value> = {
        object,
        parameter,
        translatorComponent,
        realizationComponent,
        checked: componentChecked,
        translatorMismatches: componentTranslatorMismatches,
        realizationMismatches: componentRealizationMismatches,
        lawMismatches: componentLawMismatches,
        diagnostics: componentDiagnostics,
      };

      objectComponents.set(parameter, componentResult);
    }
  }

  diagnostics.push(
    `InteractionLawMonoidPsi: reconstructed ψ across ${components.size} object(s) covering ${checkedTotal} recorded sample(s).`,
  );
  diagnostics.push(
    `InteractionLawMonoidPsi: translator mismatches=${translatorMismatchTotal}, realization mismatches=${realizationMismatchTotal}, recorded sample mismatches=${lawMismatchTotal}.`,
  );

  const metadata = mergeMetadataList(options.metadata, translator.metadata, realization.metadata);

  const readonlyComponents = new Map<
    Obj,
    ReadonlyMap<Obj, InteractionLawMonoidPsiReconstructionComponent<Obj, Left, Right, Value>>
  >();

  for (const [object, parameterMap] of components) {
    readonlyComponents.set(object, new Map(parameterMap));
  }

  return {
    translator,
    realization,
    components: readonlyComponents,
    checked: checkedTotal,
    translatorMismatches: translatorMismatchTotal,
    realizationMismatches: realizationMismatchTotal,
    lawMismatches: lawMismatchTotal,
    diagnostics,
    ...(metadata ? { metadata } : {}),
  };
};

export interface InteractionLawCommaEvaluationFailure<Obj, Left, Right, Value> {
  readonly object: Obj;
  readonly primal: IndexedElement<Obj, Left>;
  readonly dual: IndexedElement<Obj, Right>;
  readonly lawValue: Value;
  readonly sigmaValue: Value;
}

export interface InteractionLawCommaNaturalityFailure<Obj, Arr, Left, Right, Value> {
  readonly arrow: Arr;
  readonly source: Obj;
  readonly target: Obj;
  readonly sourcePrimal: IndexedElement<Obj, Left>;
  readonly targetPrimal: IndexedElement<Obj, Left>;
  readonly dual: IndexedElement<Obj, Right>;
  readonly expected: Value;
  readonly actual: Value;
}

export interface InteractionLawLeftCommaPresentation<Obj, Arr, Left, Right, Value> {
  readonly law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>;
  readonly internalHom: ContravariantFunctorWithWitness<
    Obj,
    Arr,
    SetObj<ExponentialArrow<Right, Value>>,
    SetHom<ExponentialArrow<Right, Value>, ExponentialArrow<Right, Value>>
  >;
  readonly internalHomOpposite: FunctorWithWitness<
    Obj,
    Arr,
    SetObj<ExponentialArrow<Right, Value>>,
    SetHom<ExponentialArrow<Right, Value>, ExponentialArrow<Right, Value>>
  >;
  readonly sigma: ReadonlyMap<Obj, SetHom<Left, ExponentialArrow<Right, Value>>>;
  readonly evaluationConsistent: boolean;
  readonly evaluationFailures: ReadonlyArray<
    InteractionLawCommaEvaluationFailure<Obj, Left, Right, Value>
  >;
  readonly naturalityConsistent: boolean;
  readonly naturalityFailures: ReadonlyArray<
    InteractionLawCommaNaturalityFailure<Obj, Arr, Left, Right, Value>
  >;
}

export interface InteractionLawLeftCommaComponent<Left, Right, Value> {
  readonly product: ProductData<Left, Right>;
  readonly morphism: SetHom<readonly [Left, Right], Value>;
}

export interface InteractionLawLeftCommaReconstructionFailure<Obj, Left, Right, Value> {
  readonly object: Obj;
  readonly primal: IndexedElement<Obj, Left>;
  readonly dual: IndexedElement<Obj, Right>;
  readonly lawValue: Value;
  readonly reconstructed: Value;
}

export interface InteractionLawLeftCommaNaturalityFailure<Obj, Arr, Left, Right, Value> {
  readonly arrow: Arr;
  readonly source: Obj;
  readonly target: Obj;
  readonly sourcePrimal: IndexedElement<Obj, Left>;
  readonly sourceDual: IndexedElement<Obj, Right>;
  readonly targetPrimal: IndexedElement<Obj, Left>;
  readonly targetDual: IndexedElement<Obj, Right>;
  readonly leftMapped: IndexedElement<Obj, Left>;
  readonly rightMapped: IndexedElement<Obj, Right>;
  readonly sourceValue: Value;
  readonly targetValue: Value;
}

export interface InteractionLawLeftCommaEquivalence<Obj, Arr, Left, Right, Value> {
  readonly presentation: InteractionLawLeftCommaPresentation<Obj, Arr, Left, Right, Value>;
  readonly components: ReadonlyMap<
    Obj,
    InteractionLawLeftCommaComponent<Left, Right, Value>
  >;
  readonly reconstructionConsistent: boolean;
  readonly reconstructionFailures: ReadonlyArray<
    InteractionLawLeftCommaReconstructionFailure<Obj, Left, Right, Value>
  >;
  readonly naturalityConsistent: boolean;
  readonly naturalityFailures: ReadonlyArray<
    InteractionLawLeftCommaNaturalityFailure<Obj, Arr, Left, Right, Value>
  >;
}

export const deriveInteractionLawLeftCommaPresentation = <Obj, Arr, Left, Right, Value>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
): InteractionLawLeftCommaPresentation<Obj, Arr, Left, Right, Value> => {
  const base = law.kernel.base;
  const exponentialCache = new Map<Obj, ExponentialData<Right, Value>>();
  const getExponential = (object: Obj): ExponentialData<Right, Value> => {
    const cached = exponentialCache.get(object);
    if (cached) {
      return cached;
    }
    const rightCarrier = law.right.functor.F0(object) as SetObj<Right>;
    const data = SetCat.exponential(rightCarrier, law.dualizing as SetObj<Value>);
    exponentialCache.set(object, data as ExponentialData<Right, Value>);
    return data as ExponentialData<Right, Value>;
  };

  const internalHomFunctor = {
    F0: (object: Obj): SetObj<ExponentialArrow<Right, Value>> =>
      getExponential(object).object as SetObj<ExponentialArrow<Right, Value>>,
    F1: (arrow: Arr): SetHom<
      ExponentialArrow<Right, Value>,
      ExponentialArrow<Right, Value>
    > => {
      const source = base.src(arrow);
      const target = base.dst(arrow);
      const domain = getExponential(target);
      const codomain = getExponential(source);
      const rightArrow = law.right.functor.F1(arrow);
      return SetCat.hom(
        domain.object as SetObj<ExponentialArrow<Right, Value>>,
        codomain.object as SetObj<ExponentialArrow<Right, Value>>,
        (assignment) =>
          codomain.register((value: Right) => assignment(rightArrow.map(value))) as ExponentialArrow<
            Right,
            Value
          >,
      );
    },
  };

  const samples = {
    objects: base.objects,
    arrows: base.arrows,
    composablePairs: enumerateComposablePairs(base),
  } as const;
  const exponentialSimpleCategory = setSimpleCategory as unknown as SimpleCat<
    SetObj<ExponentialArrow<Right, Value>>,
    SetHom<ExponentialArrow<Right, Value>, ExponentialArrow<Right, Value>>
  >;

  const internalHom = constructContravariantFunctorWithWitness<
    Obj,
    Arr,
    SetObj<ExponentialArrow<Right, Value>>,
    SetHom<ExponentialArrow<Right, Value>, ExponentialArrow<Right, Value>>
  >(
    base,
    exponentialSimpleCategory,
    internalHomFunctor,
    samples,
    [
      "Internal hom functor X -> [G(X), ?] induced from the interaction law's right witness.",
      "Targets land in Set thanks to SetCat.exponential carriers registered per object.",
    ],
  );

  const sigma = new Map<Obj, SetHom<Left, ExponentialArrow<Right, Value>>>();
  const evaluationFailures: InteractionLawCommaEvaluationFailure<Obj, Left, Right, Value>[] = [];
  const naturalityFailures: InteractionLawCommaNaturalityFailure<Obj, Arr, Left, Right, Value>[] = [];

  for (const object of base.objects) {
    const leftCarrier = law.left.functor.F0(object) as SetObj<Left>;
    const rightCarrier = law.right.functor.F0(object) as SetObj<Right>;
    const exponential = getExponential(object);
    const component = SetCat.hom(leftCarrier, exponential.object, (element: Left) => {
      const primal: IndexedElement<Obj, Left> = { object, element };
      return exponential.register((dualElement: Right) =>
        law.evaluate(primal, { object, element: dualElement }),
      );
    });
    sigma.set(object, component);

    const leftElements = enumerateCarrier(leftCarrier);
    const rightElements = enumerateCarrier(rightCarrier);
    for (const element of leftElements) {
      const assignment = component.map(element as Left);
      const primal: IndexedElement<Obj, Left> = { object, element: element as Left };
      for (const dualElement of rightElements) {
        const dual: IndexedElement<Obj, Right> = { object, element: dualElement as Right };
        const lawValue = law.evaluate(primal, dual);
        const sigmaValue = assignment(dualElement as Right);
        if (!Object.is(lawValue, sigmaValue)) {
          evaluationFailures.push({ object, primal, dual, lawValue, sigmaValue });
        }
      }
    }
  }

  for (const arrow of base.arrows) {
    const source = base.src(arrow);
    const target = base.dst(arrow);
    const leftSourceCarrier = law.left.functor.F0(source) as SetObj<Left>;
    const leftTargetCarrier = law.left.functor.F0(target) as SetObj<Left>;
    const rightSourceCarrier = law.right.functor.F0(source) as SetObj<Right>;
    const leftArrow = law.left.functor.F1(arrow);
    const sigmaSource = sigma.get(source);
    const sigmaTarget = sigma.get(target);
    const internalHomArrow = internalHom.functor.F1(arrow);
    if (!sigmaSource || !sigmaTarget) {
      continue;
    }

    const leftElements = enumerateCarrier(leftSourceCarrier);
    const rightElements = enumerateCarrier(rightSourceCarrier);
    const targetElements = enumerateCarrier(leftTargetCarrier);
    for (const element of leftElements) {
      const mappedLeft = leftArrow.map(element as Left);
      if (!targetElements.some((candidate) => Object.is(candidate, mappedLeft))) {
        continue;
      }
      const sourcePrimal: IndexedElement<Obj, Left> = { object: source, element: element as Left };
      const targetPrimal: IndexedElement<Obj, Left> = { object: target, element: mappedLeft as Left };
      const sigmaSourceValue = sigmaSource.map(element as Left);
      const sigmaTargetValue = sigmaTarget.map(mappedLeft as Left);
      const transported = internalHomArrow.map(sigmaTargetValue);
      for (const dualElement of rightElements) {
        const dual: IndexedElement<Obj, Right> = { object: source, element: dualElement as Right };
        const expected = sigmaSourceValue(dualElement as Right);
        const actual = transported(dualElement as Right);
        if (!Object.is(expected, actual)) {
          naturalityFailures.push({
            arrow,
            source,
            target,
            sourcePrimal,
            targetPrimal,
            dual,
            expected,
            actual,
          });
        }
      }
    }
  }

  return {
    law,
    internalHom,
    internalHomOpposite: contravariantToOppositeFunctor(internalHom),
    sigma,
    evaluationConsistent: evaluationFailures.length === 0,
    evaluationFailures,
    naturalityConsistent: naturalityFailures.length === 0,
    naturalityFailures,
  };
};

export const deriveInteractionLawLeftCommaEquivalence = <Obj, Arr, Left, Right, Value>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
): InteractionLawLeftCommaEquivalence<Obj, Arr, Left, Right, Value> => {
  const presentation = deriveInteractionLawLeftCommaPresentation(law);
  const components = new Map<
    Obj,
    InteractionLawLeftCommaComponent<Left, Right, Value>
  >();
  const reconstructionFailures: InteractionLawLeftCommaReconstructionFailure<
    Obj,
    Left,
    Right,
    Value
  >[] = [];
  const naturalityFailures: InteractionLawLeftCommaNaturalityFailure<
    Obj,
    Arr,
    Left,
    Right,
    Value
  >[] = [];

  for (const object of law.kernel.base.objects) {
    const leftCarrier = law.left.functor.F0(object) as SetObj<Left>;
    const rightCarrier = law.right.functor.F0(object) as SetObj<Right>;
    const sigmaComponent = presentation.sigma.get(object);
    if (!sigmaComponent) {
      continue;
    }
    const product = SetCat.product(leftCarrier, rightCarrier);
    const morphism = SetCat.hom(product.object, law.dualizing as SetObj<Value>, (pair) => {
      const [leftElement, rightElement] = pair;
      const assignment = sigmaComponent.map(leftElement as Left);
      return assignment(rightElement as Right);
    });
    components.set(object, { product, morphism });

    const pairingComponent = law.getPairingComponent(object);
    if (!pairingComponent) {
      continue;
    }
    const leftElements = enumerateCarrier(leftCarrier);
    const rightElements = enumerateCarrier(rightCarrier);
    for (const leftElement of leftElements) {
      for (const rightElement of rightElements) {
        const primal: IndexedElement<Obj, Left> = { object, element: leftElement as Left };
        const dual: IndexedElement<Obj, Right> = { object, element: rightElement as Right };
        const lawValue = law.evaluate(primal, dual);
        const reconstructed = morphism.map([
          leftElement as Left,
          rightElement as Right,
        ]);
        if (!Object.is(lawValue, reconstructed)) {
          reconstructionFailures.push({
            object,
            primal,
            dual,
            lawValue,
            reconstructed,
          });
        }
      }
    }
  }

  for (const arrow of law.kernel.base.arrows) {
    const source = law.kernel.base.src(arrow);
    const target = law.kernel.base.dst(arrow);
    const sourceComponent = components.get(source);
    const targetComponent = components.get(target);
    if (!sourceComponent || !targetComponent) {
      continue;
    }
    const leftTargetCarrier = law.left.functor.F0(target) as SetObj<Left>;
    const rightSourceCarrier = law.right.functor.F0(source) as SetObj<Right>;
    const leftArrow = law.left.functor.F1(arrow);
    const rightArrow = law.right.functor.F1(arrow);
    const leftElements = enumerateCarrier(leftTargetCarrier);
    const rightElements = enumerateCarrier(rightSourceCarrier);
    for (const targetLeft of leftElements) {
      const mappedLeft = leftArrow.map(targetLeft as Left);
      const targetPrimal: IndexedElement<Obj, Left> = {
        object: target,
        element: targetLeft as Left,
      };
      const sourcePrimal: IndexedElement<Obj, Left> = {
        object: source,
        element: mappedLeft as Left,
      };
      for (const sourceRight of rightElements) {
        const mappedRight = rightArrow.map(sourceRight as Right);
        const sourceDual: IndexedElement<Obj, Right> = {
          object: source,
          element: sourceRight as Right,
        };
        const targetDual: IndexedElement<Obj, Right> = {
          object: target,
          element: mappedRight as Right,
        };
        const sourceValue = sourceComponent.morphism.map([
          mappedLeft as Left,
          sourceRight as Right,
        ]);
        const targetValue = targetComponent.morphism.map([
          targetLeft as Left,
          mappedRight as Right,
        ]);
        if (!Object.is(sourceValue, targetValue)) {
          naturalityFailures.push({
            arrow,
            source,
            target,
            sourcePrimal,
            sourceDual,
            targetPrimal,
            targetDual,
            leftMapped: sourcePrimal,
            rightMapped: targetDual,
            sourceValue,
            targetValue,
          });
        }
      }
    }
  }

  return {
    presentation,
    components,
    reconstructionConsistent: reconstructionFailures.length === 0,
    reconstructionFailures,
    naturalityConsistent: naturalityFailures.length === 0,
    naturalityFailures,
  };
};

export interface FixedLeftInteractionComparison<Obj, Left, RightDomain, RightCodomain, Value> {
  readonly object: Obj;
  readonly primal: IndexedElement<Obj, Left>;
  readonly domainDual: IndexedElement<Obj, RightDomain>;
  readonly codomainDual: IndexedElement<Obj, RightCodomain>;
  readonly domainValue: Value;
  readonly codomainValue: Value;
  readonly matches: boolean;
}

export interface FixedLeftInteractionMorphism<Obj, Arr, Left, RightDomain, RightCodomain, Value> {
  readonly domain: FunctorInteractionLaw<Obj, Arr, Left, RightDomain, Value>;
  readonly codomain: FunctorInteractionLaw<Obj, Arr, Left, RightCodomain, Value>;
  readonly transformation: NaturalTransformationWithWitness<
    Obj,
    Arr,
    SetObj<unknown>,
    SetHom<unknown, unknown>
  >;
  readonly comparisons: ReadonlyArray<
    FixedLeftInteractionComparison<Obj, Left, RightDomain, RightCodomain, Value>
  >;
  readonly holds: boolean;
  readonly details: ReadonlyArray<string>;
}

export interface FixedLeftInteractionMorphismInput<Obj, Arr, Left, RightDomain, RightCodomain, Value> {
  readonly domain: FunctorInteractionLaw<Obj, Arr, Left, RightDomain, Value>;
  readonly codomain: FunctorInteractionLaw<Obj, Arr, Left, RightCodomain, Value>;
  readonly transformation: NaturalTransformationWithWitness<
    Obj,
    Arr,
    SetObj<unknown>,
    SetHom<unknown, unknown>
  >;
  readonly sampleLimit?: number;
}

export const makeFixedLeftInteractionMorphism = <Obj, Arr, Left, RightDomain, RightCodomain, Value>(
  input: FixedLeftInteractionMorphismInput<Obj, Arr, Left, RightDomain, RightCodomain, Value>,
): FixedLeftInteractionMorphism<Obj, Arr, Left, RightDomain, RightCodomain, Value> => {
  const { domain, codomain, transformation, sampleLimit = 64 } = input;
  if (domain.kernel !== codomain.kernel) {
    throw new Error("makeFixedLeftInteractionMorphism: laws must share the same promonoidal kernel.");
  }
  const comparisons: FixedLeftInteractionComparison<
    Obj,
    Left,
    RightDomain,
    RightCodomain,
    Value
  >[] = [];
  const details: string[] = [];

  for (const object of domain.kernel.base.objects) {
    const component = transformation.transformation.component(object);
    const domainCarrier = domain.right.functor.F0(object);
    const codomainCarrier = codomain.right.functor.F0(object);
    if (!Object.is(component.dom, domainCarrier) || !Object.is(component.cod, codomainCarrier)) {
      details.push(
        `Right transformation component for ${String(object)} does not align with law carriers.`,
      );
      continue;
    }

    const primalCarrier = domain.left.functor.F0(object);
    const dualElements = enumerateCarrier(domainCarrier);
    const primalElements = enumerateCarrier(primalCarrier);

    for (const element of primalElements) {
      for (const dual of dualElements) {
          const mapped = component.map(dual) as RightCodomain;
        const primal: IndexedElement<Obj, Left> = { object, element };
        const domainDual: IndexedElement<Obj, RightDomain> = { object, element: dual };
        const codomainDual: IndexedElement<Obj, RightCodomain> = { object, element: mapped };
        const domainValue = domain.evaluate(primal, domainDual);
        const codomainValue = codomain.evaluate(primal, codomainDual);
        const matches = Object.is(domainValue, codomainValue);
        comparisons.push({
          object,
          primal,
          domainDual,
          codomainDual,
          domainValue,
          codomainValue,
          matches,
        });
        if (comparisons.length >= sampleLimit) {
          break;
        }
      }
      if (comparisons.length >= sampleLimit) {
        break;
      }
    }
    if (comparisons.length >= sampleLimit) {
      break;
    }
  }

  const holds = comparisons.every((comparison) => comparison.matches);
  if (!holds) {
    details.push("Fixed-left morphism verification uncovered mismatched evaluations.");
  }

  return { domain, codomain, transformation, comparisons, holds, details };
};

export interface FixedRightInteractionComparison<Obj, LeftDomain, LeftCodomain, Right, Value> {
  readonly object: Obj;
  readonly domainPrimal: IndexedElement<Obj, LeftDomain>;
  readonly codomainPrimal: IndexedElement<Obj, LeftCodomain>;
  readonly dual: IndexedElement<Obj, Right>;
  readonly domainValue: Value;
  readonly codomainValue: Value;
  readonly matches: boolean;
}

export interface FixedRightInteractionMorphism<Obj, Arr, LeftDomain, LeftCodomain, Right, Value> {
  readonly domain: FunctorInteractionLaw<Obj, Arr, LeftDomain, Right, Value>;
  readonly codomain: FunctorInteractionLaw<Obj, Arr, LeftCodomain, Right, Value>;
  readonly transformation: NaturalTransformationWithWitness<
    Obj,
    Arr,
    SetObj<unknown>,
    SetHom<unknown, unknown>
  >;
  readonly comparisons: ReadonlyArray<
    FixedRightInteractionComparison<Obj, LeftDomain, LeftCodomain, Right, Value>
  >;
  readonly holds: boolean;
  readonly details: ReadonlyArray<string>;
}

export interface FixedRightInteractionMorphismInput<Obj, Arr, LeftDomain, LeftCodomain, Right, Value> {
  readonly domain: FunctorInteractionLaw<Obj, Arr, LeftDomain, Right, Value>;
  readonly codomain: FunctorInteractionLaw<Obj, Arr, LeftCodomain, Right, Value>;
  readonly transformation: NaturalTransformationWithWitness<
    Obj,
    Arr,
    SetObj<unknown>,
    SetHom<unknown, unknown>
  >;
  readonly sampleLimit?: number;
}

export const makeFixedRightInteractionMorphism = <Obj, Arr, LeftDomain, LeftCodomain, Right, Value>(
  input: FixedRightInteractionMorphismInput<Obj, Arr, LeftDomain, LeftCodomain, Right, Value>,
): FixedRightInteractionMorphism<Obj, Arr, LeftDomain, LeftCodomain, Right, Value> => {
  const { domain, codomain, transformation, sampleLimit = 64 } = input;
  if (domain.kernel !== codomain.kernel) {
    throw new Error("makeFixedRightInteractionMorphism: laws must share the same promonoidal kernel.");
  }
  const comparisons: FixedRightInteractionComparison<
    Obj,
    LeftDomain,
    LeftCodomain,
    Right,
    Value
  >[] = [];
  const details: string[] = [];

  for (const object of domain.kernel.base.objects) {
    const component = transformation.transformation.component(object);
    const domainCarrier = domain.left.functor.F0(object);
    const codomainCarrier = codomain.left.functor.F0(object);
    if (!Object.is(component.dom, domainCarrier) || !Object.is(component.cod, codomainCarrier)) {
      details.push(
        `Left transformation component for ${String(object)} does not align with law carriers.`,
      );
      continue;
    }

    const dualCarrier = domain.right.functor.F0(object);
    const dualElements = enumerateCarrier(dualCarrier);
    const primalElements = enumerateCarrier(domainCarrier);

    for (const element of primalElements) {
      const mapped = component.map(element) as LeftCodomain;
      const domainPrimal: IndexedElement<Obj, LeftDomain> = { object, element };
      const codomainPrimal: IndexedElement<Obj, LeftCodomain> = { object, element: mapped };
      for (const dual of dualElements) {
        const dualElement: IndexedElement<Obj, Right> = { object, element: dual };
        const domainValue = domain.evaluate(domainPrimal, dualElement);
        const codomainValue = codomain.evaluate(codomainPrimal, dualElement);
        const matches = Object.is(domainValue, codomainValue);
        comparisons.push({
          object,
          domainPrimal,
          codomainPrimal,
          dual: dualElement,
          domainValue,
          codomainValue,
          matches,
        });
        if (comparisons.length >= sampleLimit) {
          break;
        }
      }
      if (comparisons.length >= sampleLimit) {
        break;
      }
    }
    if (comparisons.length >= sampleLimit) {
      break;
    }
  }

  const holds = comparisons.every((comparison) => comparison.matches);
  if (!holds) {
    details.push("Fixed-right morphism verification uncovered mismatched evaluations.");
  }

  return { domain, codomain, transformation, comparisons, holds, details };
};

export interface FixedLeftInitialObject<Obj, Arr, Left, Value> {
  readonly law: FunctorInteractionLaw<Obj, Arr, Left, never, Value>;
  readonly collapse: {
    readonly finalLaw: FunctorInteractionLaw<Obj, Arr, SetTerminalObject, never, Value>;
    readonly component: (object: Obj) => SetHom<Left, SetTerminalObject>;
  };
}

export const buildFixedLeftInitialObject = <Obj, Arr, Left, Right, Value>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
): FixedLeftInitialObject<Obj, Arr, Left, Value> => {
  const terminalElement = enumerateCarrier(SetCat.terminal().object)[0]!;
  const finalLaw = finalInteractionLaw<Obj, Arr, Value>(law.kernel, {
    dualizing: law.dualizing,
  });
  const stretched = stretchInteractionLaw(finalLaw, {
    left: law.left,
    right: finalLaw.right,
    mapLeft: () => terminalElement,
    mapRight: (_object, element) => element,
    ...(law.operations ? { operations: law.operations } : {}),
  });

  const component = (object: Obj) =>
    SetCat.hom(law.left.functor.F0(object), SetCat.terminal().object, () => terminalElement);

  return {
    law: stretched,
    collapse: {
      finalLaw,
      component,
    },
  };
};

export interface FixedRightInitialObject<Obj, Arr, Right, Value> {
  readonly law: FunctorInteractionLaw<Obj, Arr, SetTerminalObject, Right, Value>;
  readonly collapse: {
    readonly finalLaw: FunctorInteractionLaw<Obj, Arr, SetTerminalObject, never, Value>;
    readonly component?: (object: Obj) => SetHom<Right, never>;
    readonly details?: string;
  };
}

export const buildFixedRightInitialObject = <Obj, Arr, Left, Right, Value>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
): FixedRightInitialObject<Obj, Arr, Right, Value> => {
  const terminal = SetCat.terminal().object;
  const initialData = SetCat.initial();
  const initialObject = initialData.object;
  const terminalSimpleCategory = setSimpleCategory as unknown as SimpleCat<
    SetObj<SetTerminalObject>,
    SetHom<SetTerminalObject, SetTerminalObject>
  >;
  const terminalFunctor = constructContravariantFunctorWithWitness(
    law.kernel.base,
    terminalSimpleCategory,
    {
      F0: () => terminal,
      F1: () => SetCat.id(terminal),
    },
  );

  const finalLaw = finalInteractionLaw<Obj, Arr, Value>(law.kernel, {
    dualizing: law.dualizing,
  });
  const collapseValue = finalLaw.aggregate([]);

  const convolution = dayTensor(law.kernel, terminalFunctor, law.right);
  const pairing = (
    _object: Obj,
    carrier: ReturnType<typeof convolution.functor.functor.F0>,
  ) => SetCat.hom(carrier, law.dualizing, () => collapseValue);
  const aggregate: DayPairingAggregator<Obj, Arr, SetTerminalObject, Right, Value> = () =>
    collapseValue;
  const initial = makeFunctorInteractionLaw({
    kernel: law.kernel,
    left: terminalFunctor,
    right: law.right,
    convolution,
    dualizing: law.dualizing,
    pairing,
    aggregate,
    ...(law.operations ? { operations: law.operations } : {}),
  });

  const collapseDetails: string[] = [];
  const collapseComponents = new Map<Obj, SetHom<Right, never>>();
  for (const object of law.kernel.base.objects) {
    const carrier = law.right.functor.F0(object);
    const elements = enumerateCarrier(carrier);
    if (elements.length > 0) {
      collapseDetails.push(
        `Right carrier for ${String(object)} is non-empty; no collapse map into the initial object exists.`,
      );
      continue;
    }
    collapseComponents.set(
      object,
      SetCat.hom(carrier, initialObject, () => {
        throw new Error(
          "buildFixedRightInitialObject: collapse map invoked on a non-empty right carrier.",
        );
      }),
    );
  }

  return {
    law: initial,
    collapse: {
      finalLaw,
      ...(collapseComponents.size > 0
        ? {
            component: (object: Obj) => {
              const component = collapseComponents.get(object);
              if (!component) {
                throw new Error(
                  `buildFixedRightInitialObject: collapse component unavailable for ${String(object)}.`,
                );
              }
              return component;
            },
          }
        : {}),
      ...(collapseDetails.length > 0 ? { details: collapseDetails.join(" ") } : {}),
    },
  };
};

export interface FixedRightFinalObject<Obj, Arr, Left, Right, Value> {
  readonly law: FunctorInteractionLaw<
    Obj,
    Arr,
    ExponentialArrow<Right, Value>,
    Right,
    Value
  >;
  readonly presentation: InteractionLawLeftCommaPresentation<Obj, Arr, Left, Right, Value>;
  readonly sigma: NaturalTransformationWithWitness<Obj, Arr, SetObj<unknown>, SetHom<unknown, unknown>>;
  readonly mediator: FixedRightInteractionMorphism<
    Obj,
    Arr,
    Left,
    ExponentialArrow<Right, Value>,
    Right,
    Value
  >;
}

const enforceConsistentContributions = <Obj, Arr, Left, Right, Value>(
  contributions: ReadonlyArray<DayPairingContribution<Obj, Arr, Left, Right, Value>>,
): Value => {
  if (contributions.length === 0) {
    throw new Error(
      "Fixed-slice universal object aggregation requires at least one Day contribution.",
    );
  }
  const first = contributions[0]!;
  for (let index = 1; index < contributions.length; index += 1) {
    const entry = contributions[index]!;
    if (!Object.is(entry.evaluation, first.evaluation)) {
      throw new Error(
        "Fixed-slice universal object aggregation encountered mismatched Day evaluations.",
      );
    }
  }
  return first.evaluation;
};

export const buildFixedRightFinalObject = <Obj, Arr, Left, Right, Value>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
): FixedRightFinalObject<Obj, Arr, Left, Right, Value> => {
  const presentation = deriveInteractionLawLeftCommaPresentation(law);
  const internalHom = presentation.internalHom;

  const convolution = dayTensor(law.kernel, internalHom, law.right);
  const pairing = (
    _object: Obj,
    carrier: ReturnType<typeof convolution.functor.functor.F0>,
  ) =>
    SetCat.hom(carrier, law.dualizing, (cls) => {
      const data = cls as {
        readonly witness: {
          readonly leftElement: ExponentialArrow<Right, Value>;
          readonly rightElement: Right;
        };
      };
      const assignment = data.witness.leftElement;
      const element = data.witness.rightElement;
      return assignment(element);
    });

  const aggregate: DayPairingAggregator<
    Obj,
    Arr,
    ExponentialArrow<Right, Value>,
    Right,
    Value
  > = (contributions) => enforceConsistentContributions(contributions);

  const lawInternal = makeFunctorInteractionLaw({
    kernel: law.kernel,
    left: internalHom,
    right: law.right,
    convolution,
    dualizing: law.dualizing,
    pairing,
    aggregate,
    ...(law.operations ? { operations: law.operations } : {}),
  });

  const sigmaSource: FunctorWithWitness<Obj, Arr, SetObj<unknown>, SetHom<unknown, unknown>> =
    contravariantToOppositeFunctor(law.left) as FunctorWithWitness<
      Obj,
      Arr,
      SetObj<unknown>,
      SetHom<unknown, unknown>
    >;
  const sigmaTarget: FunctorWithWitness<Obj, Arr, SetObj<unknown>, SetHom<unknown, unknown>> =
    presentation.internalHomOpposite as FunctorWithWitness<
      Obj,
      Arr,
      SetObj<unknown>,
      SetHom<unknown, unknown>
    >;

  const sigma = constructNaturalTransformationWithWitness<
    Obj,
    Arr,
    SetObj<unknown>,
    SetHom<unknown, unknown>
  >(
    sigmaSource,
    sigmaTarget,
    (object) => {
      const component = presentation.sigma.get(object);
      if (!component) {
        throw new Error(
          `buildFixedRightFinalObject: missing sigma component for ${String(object)}.`,
        );
      }
      return component as unknown as SetHom<unknown, unknown>;
    },
    {
      metadata: [
        "Currying transformation ? : F ? G' supplying the comparison into the fixed-right final object.",
      ],
    },
  );

  const mediator = makeFixedRightInteractionMorphism({
    domain: law,
    codomain: lawInternal,
    transformation: sigma,
  });

  return {
    law: lawInternal,
    presentation,
    sigma,
    mediator,
  };
};

export interface GlueingInteractionLawSubcategory<Obj, Arr> {
  readonly label: string;
  readonly objects: ReadonlyArray<Obj>;
  readonly arrows: ReadonlyArray<Arr>;
  readonly pullbackStable: boolean;
  readonly diagnostics?: ReadonlyArray<string>;
}

export interface GlueingInteractionLawSpanComponent<Obj, Arr> {
  readonly label: string;
  readonly residualObject: Obj;
  readonly leftArrow: Arr;
  readonly rightArrow: Arr;
  readonly metadata?: ReadonlyArray<string>;
}

export interface GlueingInteractionLawEvaluation<Obj, Left, Right, Value> {
  readonly object: Obj;
  readonly primal: IndexedElement<Obj, Left>;
  readonly dual: IndexedElement<Obj, Right>;
  readonly value: Value;
  readonly metadata?: ReadonlyArray<string>;
}

export interface GlueingInteractionLawConstruction<Obj, Arr, Left, Right, Value> {
  readonly law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>;
  readonly category: FiniteCategory<Obj, Arr>;
  readonly kernel: PromonoidalKernel<Obj, Arr>;
  readonly leftSubcategory: GlueingInteractionLawSubcategory<Obj, Arr>;
  readonly rightSubcategory: GlueingInteractionLawSubcategory<Obj, Arr>;
  readonly span: ReadonlyArray<GlueingInteractionLawSpanComponent<Obj, Arr>>;
  readonly evaluations?: ReadonlyArray<GlueingInteractionLawEvaluation<Obj, Left, Right, Value>>;
  readonly metadata?: ReadonlyArray<string>;
  readonly notes?: ReadonlyArray<string>;
}

export interface GlueingInteractionLawSummary<Obj, Arr, Left, Right, Value>
  extends GlueingInteractionLawConstruction<Obj, Arr, Left, Right, Value> {
  readonly diagnostics: ReadonlyArray<string>;
  readonly evaluations: ReadonlyArray<GlueingInteractionLawEvaluation<Obj, Left, Right, Value>>;
}

export interface GlueingInteractionLawCheckReport<Obj, Arr, Left, Right, Value> {
  readonly summary: GlueingInteractionLawSummary<Obj, Arr, Left, Right, Value>;
  readonly pullbackStable: boolean;
  readonly spanConsistent: boolean;
  readonly evaluationConsistent: boolean;
  readonly diagnostics: ReadonlyArray<string>;
  readonly metadata?: ReadonlyArray<string>;
}

export const constructGlueingInteractionLaw = <Obj, Arr, Left, Right, Value>(
  construction: GlueingInteractionLawConstruction<Obj, Arr, Left, Right, Value>,
): GlueingInteractionLawSummary<Obj, Arr, Left, Right, Value> => {
  const diagnostics: string[] = [];
  if (construction.kernel !== construction.law.kernel) {
    diagnostics.push(
      "GlueingInteractionLaw: supplied kernel differs from the law's kernel; continuing with the law's kernel.",
    );
  }

  diagnostics.push(
    `GlueingInteractionLaw: recorded ${construction.span.length} span component(s) for ${construction.leftSubcategory.label}/${construction.rightSubcategory.label}.`,
  );
  const evaluations = construction.evaluations ?? [];
  diagnostics.push(
    `GlueingInteractionLaw: recorded ${evaluations.length} evaluation sample(s) for the glueing pairing.`,
  );

  if (!construction.leftSubcategory.pullbackStable || !construction.rightSubcategory.pullbackStable) {
    diagnostics.push(
      "GlueingInteractionLaw: one or both subcategories are not marked pullback-stable; downstream checks will surface mismatches.",
    );
  }

  const metadata = mergeMetadataList(
    construction.metadata,
    construction.leftSubcategory.diagnostics,
    construction.rightSubcategory.diagnostics,
    construction.notes,
    ...construction.span.map((component) => component.metadata),
    ...evaluations.map((entry) => entry.metadata),
  );

  return {
    ...construction,
    diagnostics,
    evaluations,
    ...(metadata ? { metadata } : {}),
  };
};

export const checkGlueingInteractionLaw = <Obj, Arr, Left, Right, Value>(
  summary: GlueingInteractionLawSummary<Obj, Arr, Left, Right, Value>,
): GlueingInteractionLawCheckReport<Obj, Arr, Left, Right, Value> => {
  const diagnostics = [...summary.diagnostics];
  let spanConsistent = true;
  let spanFailures = 0;

  for (const component of summary.span) {
    const leftSource = summary.category.src(component.leftArrow);
    const rightSource = summary.category.src(component.rightArrow);
    const leftTarget = summary.category.dst(component.leftArrow);
    const rightTarget = summary.category.dst(component.rightArrow);
    if (!Object.is(leftSource, component.residualObject)) {
      spanConsistent = false;
      spanFailures += 1;
      diagnostics.push(
        `GlueingInteractionLaw: span ${component.label} left arrow source ${String(leftSource)} does not match residual object ${String(component.residualObject)}.`,
      );
    }
    if (!Object.is(rightSource, component.residualObject)) {
      spanConsistent = false;
      spanFailures += 1;
      diagnostics.push(
        `GlueingInteractionLaw: span ${component.label} right arrow source ${String(rightSource)} does not match residual object ${String(component.residualObject)}.`,
      );
    }
    if (!summary.leftSubcategory.objects.some((object) => Object.is(object, leftTarget))) {
      spanConsistent = false;
      spanFailures += 1;
      diagnostics.push(
        `GlueingInteractionLaw: span ${component.label} left arrow targets ${String(leftTarget)}, which is absent from the left subcategory.`,
      );
    }
    if (!summary.rightSubcategory.objects.some((object) => Object.is(object, rightTarget))) {
      spanConsistent = false;
      spanFailures += 1;
      diagnostics.push(
        `GlueingInteractionLaw: span ${component.label} right arrow targets ${String(rightTarget)}, which is absent from the right subcategory.`,
      );
    }
  }

  diagnostics.push(
    `GlueingInteractionLaw: span components checked=${summary.span.length}, mismatches=${spanFailures}.`,
  );

  let evaluationConsistent = true;
  let evaluationMismatches = 0;
  for (const evaluation of summary.evaluations) {
    const actual = summary.law.evaluate(evaluation.primal, evaluation.dual);
    if (!Object.is(actual, evaluation.value)) {
      evaluationConsistent = false;
      evaluationMismatches += 1;
      diagnostics.push(
        `GlueingInteractionLaw: evaluation mismatch for object ${String(evaluation.object)}; recorded ${String(
          evaluation.value,
        )}, actual ${String(actual)}.`,
      );
    }
  }
  diagnostics.push(
    `GlueingInteractionLaw: evaluation samples checked=${summary.evaluations.length}, mismatches=${evaluationMismatches}.`,
  );

  const pullbackStable =
    summary.leftSubcategory.pullbackStable && summary.rightSubcategory.pullbackStable;
  if (!pullbackStable) {
    diagnostics.push(
      "GlueingInteractionLaw: pullback stability failed for at least one subcategory.",
    );
  }

  return {
    summary,
    pullbackStable,
    spanConsistent,
    evaluationConsistent,
    diagnostics,
    ...(summary.metadata ? { metadata: summary.metadata } : {}),
  };
};

export interface GlueingInteractionLawExampleSuite {
  readonly law: FunctorInteractionLaw<TwoObject, TwoArrow, unknown, unknown, boolean>;
  readonly identitySummary: GlueingInteractionLawSummary<TwoObject, TwoArrow, unknown, unknown, boolean>;
  readonly tensorSummary: GlueingInteractionLawSummary<TwoObject, TwoArrow, unknown, unknown, boolean>;
  readonly pullbackFailureSummary: GlueingInteractionLawSummary<
    TwoObject,
    TwoArrow,
    unknown,
    unknown,
    boolean
  >;
}

const makeGlueingEvaluationSample = (
  law: FunctorInteractionLaw<TwoObject, TwoArrow, unknown, unknown, boolean>,
  primal: IndexedElement<TwoObject, unknown>,
  dual: IndexedElement<TwoObject, unknown>,
  metadata: ReadonlyArray<string>,
): GlueingInteractionLawEvaluation<TwoObject, unknown, unknown, boolean> => ({
  object: primal.object,
  primal,
  dual,
  value: law.evaluate(primal, dual),
  metadata,
});

export const makeGlueingInteractionLawExampleSuite = (): GlueingInteractionLawExampleSuite => {
  const law = makeFunctorInteractionLaw(makeBooleanInteractionInputInternal());
  const primalSamples = Array.from(law.primalCarrier);
  const dualSamples = Array.from(law.dualCarrier);
  const firstPrimal = primalSamples[0];
  const firstDual = dualSamples[0];
  if (!firstPrimal || !firstDual) {
    throw new Error("Glueing examples require non-empty carriers.");
  }

  const secondPrimal = primalSamples[1] ?? firstPrimal;
  const secondDual = dualSamples[1] ?? firstDual;
  const baseEvaluation = makeGlueingEvaluationSample(
    law,
    firstPrimal,
    firstDual,
    ["Identity evaluation sample"],
  );
  const secondEvaluation = makeGlueingEvaluationSample(
    law,
    secondPrimal,
    secondDual,
    ["Tensor evaluation sample"],
  );

  const identitySubcategory = {
    label: "IdentityGlueing",
    objects: TwoObjectCategory.objects,
    arrows: TwoObjectCategory.arrows,
    pullbackStable: true,
    diagnostics: ["Identity inclusion preserves pullbacks."],
  } as const;

  const identitySpan = {
    label: "identity-span",
    residualObject: firstPrimal.object,
    leftArrow: TwoObjectCategory.id(firstPrimal.object),
    rightArrow: TwoObjectCategory.id(firstPrimal.object),
    metadata: ["Identity glueing residual"],
  } as const;

  const identitySummary = constructGlueingInteractionLaw({
    law,
    category: TwoObjectCategory,
    kernel: law.kernel,
    leftSubcategory: identitySubcategory,
    rightSubcategory: identitySubcategory,
    span: [identitySpan],
    evaluations: [baseEvaluation],
    metadata: ["ExampleGlueingIdentity"],
    notes: ["Matches the Example 6 residual glueing construction."],
  });

  const tensorSummary = constructGlueingInteractionLaw({
    law,
    category: TwoObjectCategory,
    kernel: law.kernel,
    leftSubcategory: identitySubcategory,
    rightSubcategory: identitySubcategory,
    span: [
      identitySpan,
      {
        label: "nontrivial-span",
        residualObject: secondPrimal.object,
        leftArrow: TwoObjectCategory.id(secondPrimal.object),
        rightArrow: nonIdentity,
        metadata: ["Nontrivial Day tensor witness"],
      },
    ],
    evaluations: [baseEvaluation, secondEvaluation],
    metadata: ["ExampleGlueingTensor"],
    notes: ["Witnesses the nontrivial glueing tensor evaluation from Section 6.2."],
  });

  const pullbackFailureSummary = constructGlueingInteractionLaw({
    law,
    category: TwoObjectCategory,
    kernel: law.kernel,
    leftSubcategory: {
      ...identitySubcategory,
      pullbackStable: false,
      diagnostics: ["Pullback stability intentionally disabled."],
    },
    rightSubcategory: identitySubcategory,
    span: [identitySpan],
    evaluations: [baseEvaluation],
    metadata: ["ExampleGlueingPullbackFailure"],
    notes: ["Demonstrates the need for pullback-stable subcategories."],
  });

  return { law, identitySummary, tensorSummary, pullbackFailureSummary };
};
