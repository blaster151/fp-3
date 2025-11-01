import {
  buildDayPairingData,
  dualChuSpace,
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
import type { NaturalTransformationWithWitness } from "./natural-transformation";
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
import type { PromonoidalKernel } from "./promonoidal-structure";

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

  const convolution = dayTensor(law.kernel, left.functor, right.functor);

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
      const data = cls as unknown as {
        readonly diagonalObject: Obj;
        readonly witness: {
          readonly kernelLeft: Obj;
          readonly kernelRight: Obj;
          readonly output: Obj;
          readonly kernelValue: unknown;
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

  return makeFunctorInteractionLaw({
    kernel: law.kernel,
    left,
    right,
    convolution,
    dualizing: law.dualizing,
    pairing,
    aggregate,
    ...(tags ? { tags } : {}),
    operations: operations ?? law.operations,
  });
};

export const selfDualInteractionLaw = <Obj, Arr, Left, Right, Value>(
  law: FunctorInteractionLaw<Obj, Arr, Left, Right, Value>,
): {
  readonly law: FunctorInteractionLaw<Obj, Arr, Right, Left, Value>;
  readonly dualSpace: ChuSpace<IndexedElement<Obj, Right>, IndexedElement<Obj, Left>, Value>;
} => {
  const dualLeft = oppositeFunctorToContravariant(law.kernel.base, law.right);
  const dualRight = contravariantToOppositeFunctor(law.left);
  const convolution = dayTensor(law.kernel, dualLeft.functor, dualRight.functor);
  const dualSpace = dualChuSpace(law.toChuSpace());

  const pairing = (
    _object: Obj,
    carrier: ReturnType<typeof convolution.functor.functor.F0>,
  ) => SetCat.hom(carrier, law.dualizing, (cls) => {
    const data = cls as unknown as {
      readonly witness: {
        readonly kernelLeft: Obj;
        readonly kernelRight: Obj;
        readonly output: Obj;
        readonly kernelValue: unknown;
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
    operations: law.operations,
    tags: { primal: "SelfDualPrimal", dual: "SelfDualDual" },
  });

  return { law: result, dualSpace };
};

export const finalInteractionLaw = <Obj, Arr, Value = boolean>(
  kernel: PromonoidalKernel<Obj, Arr>,
  options: FinalInteractionLawOptions<Obj, Arr, Value> = {},
): FunctorInteractionLaw<Obj, Arr, SetTerminalObject, never, Value> => {
  const terminal = SetCat.terminalObj;
  const initial = SetCat.initialObj;
  const evaluationValue = options.evaluationValue ?? ((false as unknown) as Value);
  const dualizing = options.dualizing ?? (SetCat.obj([false, true], { tag: "FinalDualizing" }) as SetObj<Value>);

  const left = constructContravariantFunctorWithWitness(
    kernel.base,
    setSimpleCategory,
    {
      F0: () => terminal,
      F1: () => SetCat.id(terminal),
    },
  );

  const right = constructFunctorWithWitness(
    kernel.base,
    setSimpleCategory,
    {
      F0: () => initial,
      F1: () => SetCat.id(initial),
    },
  );

  const convolution = dayTensor(kernel, left.functor, right.functor);

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
    operations: options.operations,
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
    readonly kernelValue: unknown;
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

  const left = constructContravariantFunctorWithWitness(
    kernel.base,
    setSimpleCategory,
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

  const right = constructFunctorWithWitness(
    kernel.base,
    setSimpleCategory,
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

  const convolution = dayTensor(kernel, left.functor, right.functor);
  const dualizingProduct = SetCat.product(law0.dualizing, law1.dualizing);

  const fiber0 = buildFiberLookup(law0);
  const fiber1 = buildFiberLookup(law1);

  const pairing = (
    object: Obj,
    carrier: ReturnType<typeof convolution.functor.functor.F0>,
  ) => SetCat.hom(carrier, dualizingProduct.object, (cls) => {
    const data = cls as unknown as {
      readonly diagonalObject: Obj;
      readonly witness: {
        readonly kernelLeft: Obj;
        readonly kernelRight: Obj;
        readonly output: Obj;
        readonly kernelValue: unknown;
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

    return dualizingProduct.lookup(value0, value1);
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
    return dualizingProduct.lookup(value0, value1);
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
    operations: mergedOperations,
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

  const left = constructContravariantFunctorWithWitness(
    kernel.base,
    setSimpleCategory,
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

  const right = constructFunctorWithWitness(
    kernel.base,
    setSimpleCategory,
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

  const convolution = dayTensor(kernel, left.functor, right.functor);
  const dualizingCoproduct = SetCat.coproduct(law0.dualizing, law1.dualizing);

  const fiber0 = buildFiberLookup(law0);
  const fiber1 = buildFiberLookup(law1);

  const pairing = (
    object: Obj,
    carrier: ReturnType<typeof convolution.functor.functor.F0>,
  ) => SetCat.hom(carrier, dualizingCoproduct.object, (cls) => {
    const data = cls as unknown as {
      readonly diagonalObject: Obj;
      readonly witness: {
        readonly kernelLeft: Obj;
        readonly kernelRight: Obj;
        readonly output: Obj;
        readonly kernelValue: unknown;
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
    operations: mergedOperations,
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
  readonly finalTransformationDiagnostics: ReadonlyArray<string>;
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

    const finalTransformationDiagnostics = [
      "Final transformation δ^X_Y requires explicit F^X carriers; computation deferred to future phases.",
    ];

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
      finalTransformationDiagnostics,
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
  const internalHom = constructContravariantFunctorWithWitness(
    base,
    setSimpleCategory,
    internalHomFunctor,
    samples,
    [
      "Internal hom functor X ↦ [G(X), ⊙] induced from the interaction law's right witness.",
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
        const mapped = component.map(dual);
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
      const mapped = component.map(element);
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
  const terminalElement = enumerateCarrier(SetCat.terminalObj)[0]!;
  const finalLaw = finalInteractionLaw<Obj, Arr, Value>(law.kernel, {
    dualizing: law.dualizing,
  });
  const stretched = stretchInteractionLaw(finalLaw, {
    left: law.left,
    right: finalLaw.right,
    mapLeft: () => terminalElement,
    mapRight: (_object, element) => element,
    operations: law.operations,
  });

  const component = (object: Obj) =>
    SetCat.hom(law.left.functor.F0(object), SetCat.terminalObj, () => terminalElement);

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
  const terminal = SetCat.terminalObj;
  const terminalFunctor = constructContravariantFunctorWithWitness(
    law.kernel.base,
    setSimpleCategory,
    {
      F0: () => terminal,
      F1: () => SetCat.id(terminal),
    },
  );

  const finalLaw = finalInteractionLaw<Obj, Arr, Value>(law.kernel, {
    dualizing: law.dualizing,
  });
  const collapseValue = finalLaw.aggregate([]);

  const convolution = dayTensor(law.kernel, terminalFunctor.functor, law.right.functor);
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
    operations: law.operations,
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
      SetCat.hom(carrier, SetCat.initialObj, () => {
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
