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
import { dayTensor } from "./day-convolution";
import {
  constructContravariantFunctorWithWitness,
  contravariantToOppositeFunctor,
  oppositeFunctorToContravariant,
  type ContravariantFunctorWithWitness,
} from "./contravariant";
import {
  constructFunctorWithWitness,
  type FunctorComposablePair,
  type FunctorWithWitness,
} from "./functor";
import type { FiniteCategory } from "./finite-cat";
import {
  constructNaturalTransformationWithWitness,
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
import type { PromonoidalKernel, PromonoidalTensorValue } from "./promonoidal-structure";
import type {
  FunctorOperationDegeneracyReport,
} from "./functor-interaction-law-degeneracy";

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

  const sourceOpposite = law.left.witness.oppositeWitness as FunctorWithWitness<
    Obj,
    Arr,
    SetObj<unknown>,
    SetHom<unknown, unknown>
  >;
  const targetOpposite = comma.internalHomOpposite as FunctorWithWitness<
    Obj,
    Arr,
    SetObj<unknown>,
    SetHom<unknown, unknown>
  >;

  const transformation = constructNaturalTransformationWithWitness(
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

  const comonadSourceOpposite = dual.law.left.witness.oppositeWitness as FunctorWithWitness<
    Obj,
    Arr,
    SetObj<unknown>,
    SetHom<unknown, unknown>
  >;
  const comonadTargetOpposite = comma.internalHomOpposite as FunctorWithWitness<
    Obj,
    Arr,
    SetObj<unknown>,
    SetHom<unknown, unknown>
  >;

  const transformation = constructNaturalTransformationWithWitness(
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
    SetObj<RightDomain>,
    SetHom<RightDomain, RightCodomain>
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
    SetObj<RightDomain>,
    SetHom<RightDomain, RightCodomain>
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
        const mapped = component.map(dual as RightDomain) as RightCodomain;
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
    SetObj<LeftDomain>,
    SetHom<LeftDomain, LeftCodomain>
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
    SetObj<LeftDomain>,
    SetHom<LeftDomain, LeftCodomain>
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
      const mapped = component.map(element as LeftDomain) as LeftCodomain;
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
  readonly sigma: NaturalTransformationWithWitness<
    Obj,
    Arr,
    SetObj<Left>,
    SetHom<Left, ExponentialArrow<Right, Value>>
  >;
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

  const sigmaRaw = constructNaturalTransformationWithWitness(
    contravariantToOppositeFunctor(law.left),
    presentation.internalHomOpposite,
    (object) => {
      const component = presentation.sigma.get(object);
      if (!component) {
        throw new Error(
          `buildFixedRightFinalObject: missing sigma component for ${String(object)}.`,
        );
      }
      return component;
    },
    {
      metadata: [
        "Currying transformation ? : F ? G' supplying the comparison into the fixed-right final object.",
      ],
    },
  );
  const sigma = sigmaRaw as unknown as NaturalTransformationWithWitness<
    Obj,
    Arr,
    SetObj<Left>,
    SetHom<Left, ExponentialArrow<Right, Value>>
  >;

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
