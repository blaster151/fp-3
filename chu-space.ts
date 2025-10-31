import {
  SetCat,
  getCarrierSemantics,
  semanticsAwareEquals,
  type ProductData,
  type SetHom,
  type SetObj,
} from "./set-cat";
import type { ContravariantFunctorWithWitness } from "./contravariant";
import type { FunctorWithWitness } from "./functor";
import type { DayConvolutionResult } from "./day-convolution";
import type {
  PromonoidalKernel,
  PromonoidalTensorValue,
} from "./promonoidal-structure";

const MAX_ENUMERATED_PAIRS = 4096;
const MAX_RECORDED_FAILURES = 8;

const enumerate = <T>(carrier: SetObj<T>): ReadonlyArray<T> => {
  const semantics = getCarrierSemantics(carrier);
  if (semantics?.iterate) {
    return Array.from(semantics.iterate());
  }
  return Array.from(carrier);
};

export interface ChuSpace<Primal, Dual, Value> {
  readonly dualizing: SetObj<Value>;
  readonly primal: SetObj<Primal>;
  readonly dual: SetObj<Dual>;
  readonly product: ProductData<Primal, Dual>;
  readonly pairing: SetHom<readonly [Primal, Dual], Value>;
  readonly evaluate: (primal: Primal, dual: Dual) => Value;
}

export interface IndexedElement<Obj, Payload> {
  readonly object: Obj;
  readonly element: Payload;
}

export interface ChuSpaceData<Primal, Dual, Value> {
  readonly dualizing: SetObj<Value>;
  readonly primal: SetObj<Primal>;
  readonly dual: SetObj<Dual>;
  readonly product: ProductData<Primal, Dual>;
  readonly pairing: SetHom<readonly [Primal, Dual], Value>;
}

export interface ChuSpaceFunctionInput<Primal, Dual, Value> {
  readonly dualizing: SetObj<Value>;
  readonly primal: SetObj<Primal>;
  readonly dual: SetObj<Dual>;
  readonly evaluate: (primal: Primal, dual: Dual) => Value;
  readonly product?: ProductData<Primal, Dual>;
}

type DayFiber<Obj, Arr, Left, Right> = DayConvolutionResult<Obj, Arr, Left, Right>["fibers"][number];

type DayClass<Obj, Arr, Left, Right> = DayFiber<Obj, Arr, Left, Right>["classes"][number];

type DayWitness<Obj, Arr, Left, Right> = DayClass<Obj, Arr, Left, Right>["witness"];

export interface DayPairingContribution<Obj, Arr, Left, Right, Value> {
  readonly output: Obj;
  readonly diagonal: Obj;
  readonly kernelLeft: Obj;
  readonly kernelRight: Obj;
  readonly kernelValue: PromonoidalTensorValue<Obj, Arr>;
  readonly left: IndexedElement<Obj, Left>;
  readonly right: IndexedElement<Obj, Right>;
  readonly evaluation: Value;
}

export type DayPairingAggregator<Obj, Arr, Left, Right, Value> = (
  contributions: ReadonlyArray<DayPairingContribution<Obj, Arr, Left, Right, Value>>,
) => Value;

export interface ChuSpaceFromDayPairingInput<Obj, Arr, Left, Right, Value> {
  readonly kernel: PromonoidalKernel<Obj, Arr>;
  readonly left: ContravariantFunctorWithWitness<Obj, Arr, SetObj<Left>, SetHom<Left, Left>>;
  readonly right: FunctorWithWitness<Obj, Arr, SetObj<Right>, SetHom<Right, Right>>;
  readonly convolution: DayConvolutionResult<Obj, Arr, Left, Right>;
  readonly dualizing: SetObj<Value>;
  readonly pairing: (
    object: Obj,
    carrier: SetObj<DayClass<Obj, Arr, Left, Right>>,
  ) => SetHom<DayClass<Obj, Arr, Left, Right>, Value>;
  readonly aggregate: DayPairingAggregator<Obj, Arr, Left, Right, Value>;
  readonly tags?: {
    readonly primal?: string;
    readonly dual?: string;
  };
}

export const constructChuSpace = <Primal, Dual, Value>(data: ChuSpaceData<Primal, Dual, Value>): ChuSpace<Primal, Dual, Value> => {
  if (data.pairing.dom !== data.product.object) {
    throw new Error("Chu space pairing domain must equal the product carrier.");
  }
  if (data.pairing.cod !== data.dualizing) {
    throw new Error("Chu space pairing codomain must equal the dualizing object.");
  }
  const evaluate = (primal: Primal, dual: Dual): Value => data.pairing.map([primal, dual]);
  return {
    dualizing: data.dualizing,
    primal: data.primal,
    dual: data.dual,
    product: data.product,
    pairing: data.pairing,
    evaluate,
  };
};

export const makeChuSpace = <Primal, Dual, Value>(input: ChuSpaceFunctionInput<Primal, Dual, Value>): ChuSpace<Primal, Dual, Value> => {
  const product = input.product ?? SetCat.product(input.primal, input.dual);
  const pairing = SetCat.hom(product.object, input.dualizing, (pair) => input.evaluate(pair[0], pair[1]));
  return constructChuSpace({
    dualizing: input.dualizing,
    primal: input.primal,
    dual: input.dual,
    product,
    pairing,
  });
};

const buildIndexedCarrier = <Obj, Arr, Payload>(
  kernel: PromonoidalKernel<Obj, Arr>,
  getCarrier: (object: Obj) => SetObj<Payload>,
  tag: string,
): SetObj<IndexedElement<Obj, Payload>> => {
  const equalsByObject = new Map<Obj, (left: Payload, right: Payload) => boolean>();
  const elements: Array<IndexedElement<Obj, Payload>> = [];
  for (const object of kernel.base.objects) {
    const carrier = getCarrier(object);
    equalsByObject.set(object, semanticsAwareEquals(carrier));
    for (const element of enumerate(carrier)) {
      elements.push({ object, element });
    }
  }
  return SetCat.obj(elements, {
    equals: (left, right) => {
      if (!Object.is(left.object, right.object)) {
        return false;
      }
      const equals = equalsByObject.get(left.object);
      if (!equals) {
        return Object.is(left.element, right.element);
      }
      return equals(left.element, right.element);
    },
    tag,
  });
};

const classifyWitness = <Obj, Arr, Left, Right>(
  fiber: DayFiber<Obj, Arr, Left, Right>,
  witness: DayWitness<Obj, Arr, Left, Right>,
): { readonly diagonal: Obj; readonly class: DayClass<Obj, Arr, Left, Right> } | undefined => {
  for (const candidate of fiber.classes) {
    const classified = fiber.classify(candidate.diagonalObject, witness);
    if (classified) {
      return { diagonal: candidate.diagonalObject, class: classified };
    }
  }
  return undefined;
};

const buildContributionCollector = <Obj, Arr, Left, Right, Value>(
  kernel: PromonoidalKernel<Obj, Arr>,
  convolution: DayConvolutionResult<Obj, Arr, Left, Right>,
  pairing: Map<Obj, SetHom<DayClass<Obj, Arr, Left, Right>, Value>>,
) =>
  (
    primal: IndexedElement<Obj, Left>,
    dual: IndexedElement<Obj, Right>,
  ): ReadonlyArray<DayPairingContribution<Obj, Arr, Left, Right, Value>> => {
    const contributions: Array<DayPairingContribution<Obj, Arr, Left, Right, Value>> = [];
    for (const fiber of convolution.fibers) {
      const component = pairing.get(fiber.output);
      if (!component) {
        throw new Error(
          `Chu space Day pairing: missing evaluation component for object ${String(fiber.output)}.`,
        );
      }
      const kernelValues = kernel.tensor.profunctor.evaluate(
        primal.object,
        dual.object,
        fiber.output,
      );
      for (const kernelValue of kernelValues) {
        const witness: DayWitness<Obj, Arr, Left, Right> = {
          kernelLeft: primal.object,
          kernelRight: dual.object,
          output: fiber.output,
          kernelValue,
          leftElement: primal.element,
          rightElement: dual.element,
        };
        const classification = classifyWitness(fiber, witness);
        if (!classification) {
          continue;
        }
        const evaluation = component.map(classification.class);
        contributions.push({
          output: fiber.output,
          diagonal: classification.diagonal,
          kernelLeft: primal.object,
          kernelRight: dual.object,
          kernelValue,
          left: primal,
          right: dual,
          evaluation,
        });
      }
    }
    return contributions;
  };

export interface DayPairingData<Obj, Arr, Left, Right, Value> {
  readonly kernel: PromonoidalKernel<Obj, Arr>;
  readonly left: ContravariantFunctorWithWitness<Obj, Arr, SetObj<Left>, SetHom<Left, Left>>;
  readonly right: FunctorWithWitness<Obj, Arr, SetObj<Right>, SetHom<Right, Right>>;
  readonly convolution: DayConvolutionResult<Obj, Arr, Left, Right>;
  readonly dualizing: SetObj<Value>;
  readonly pairingComponents: Map<Obj, SetHom<DayClass<Obj, Arr, Left, Right>, Value>>;
  readonly primalCarrier: SetObj<IndexedElement<Obj, Left>>;
  readonly dualCarrier: SetObj<IndexedElement<Obj, Right>>;
  readonly collect: (
    primal: IndexedElement<Obj, Left>,
    dual: IndexedElement<Obj, Right>,
  ) => ReadonlyArray<DayPairingContribution<Obj, Arr, Left, Right, Value>>;
  readonly aggregate: DayPairingAggregator<Obj, Arr, Left, Right, Value>;
  readonly space: ChuSpace<IndexedElement<Obj, Left>, IndexedElement<Obj, Right>, Value>;
}

export const buildDayPairingData = <Obj, Arr, Left, Right, Value>(
  input: ChuSpaceFromDayPairingInput<Obj, Arr, Left, Right, Value>,
): DayPairingData<Obj, Arr, Left, Right, Value> => {
  const { kernel, left, right, convolution, dualizing, pairing, aggregate, tags } = input;

  const pairingComponents = new Map<Obj, SetHom<DayClass<Obj, Arr, Left, Right>, Value>>();
  for (const fiber of convolution.fibers) {
    const carrier = convolution.functor.functor.F0(fiber.output);
    const component = pairing(fiber.output, carrier);
    if (component.dom !== carrier) {
      throw new Error(
        `Chu space Day pairing: component for ${String(fiber.output)} must use the Day fiber carrier.`,
      );
    }
    if (component.cod !== dualizing) {
      throw new Error(
        `Chu space Day pairing: component for ${String(fiber.output)} must target the supplied dualizing object.`,
      );
    }
    pairingComponents.set(fiber.output, component);
  }

  const primalCarrier = buildIndexedCarrier(
    kernel,
    (object) => left.functor.F0(object),
    tags?.primal ?? "DayChuPrimal",
  );
  const dualCarrier = buildIndexedCarrier(
    kernel,
    (object) => right.functor.F0(object),
    tags?.dual ?? "DayChuDual",
  );

  const collect = buildContributionCollector(kernel, convolution, pairingComponents);

  const evaluate = (primal: IndexedElement<Obj, Left>, dual: IndexedElement<Obj, Right>): Value => {
    const contributions = collect(primal, dual);
    return aggregate(contributions);
  };

  const product = SetCat.product(primalCarrier, dualCarrier);
  const pairingHom = SetCat.hom(product.object, dualizing, ([primal, dual]) => evaluate(primal, dual));

  const space = constructChuSpace({
    dualizing,
    primal: primalCarrier,
    dual: dualCarrier,
    product,
    pairing: pairingHom,
  });

  return {
    kernel,
    left,
    right,
    convolution,
    dualizing,
    pairingComponents,
    primalCarrier,
    dualCarrier,
    collect,
    aggregate,
    space,
  };
};

export const chuSpaceFromDayPairing = <Obj, Arr, Left, Right, Value>(
  input: ChuSpaceFromDayPairingInput<Obj, Arr, Left, Right, Value>,
): ChuSpace<IndexedElement<Obj, Left>, IndexedElement<Obj, Right>, Value> =>
  buildDayPairingData(input).space;

export const dualChuSpace = <Primal, Dual, Value>(
  space: ChuSpace<Primal, Dual, Value>,
): ChuSpace<Dual, Primal, Value> => {
  const product = SetCat.product(space.dual, space.primal);
  const evaluate = (dualElement: Dual, primalElement: Primal): Value =>
    space.evaluate(primalElement, dualElement);
  const pairing = SetCat.hom(product.object, space.dualizing, ([dualElement, primalElement]) =>
    evaluate(dualElement, primalElement),
  );
  return {
    dualizing: space.dualizing,
    primal: space.dual,
    dual: space.primal,
    product,
    pairing,
    evaluate,
  };
};

export const sweedlerDualFromPrimal = <Primal, Dual, Value>(
  space: ChuSpace<Primal, Dual, Value>,
): SetHom<Primal, (dual: Dual) => Value> => {
  const exponential = SetCat.exponential(space.dual, space.dualizing);
  return SetCat.hom(space.primal, exponential.object, (primalElement) =>
    exponential.register((dualElement: Dual) => space.evaluate(primalElement, dualElement)),
  );
};

export const sweedlerDualFromDual = <Primal, Dual, Value>(
  space: ChuSpace<Primal, Dual, Value>,
): SetHom<Dual, (primal: Primal) => Value> => {
  const exponential = SetCat.exponential(space.primal, space.dualizing);
  return SetCat.hom(space.dual, exponential.object, (dualElement) =>
    exponential.register((primalElement: Primal) => space.evaluate(primalElement, dualElement)),
  );
};

export interface ChuMorphism<DomainPrimal, DomainDual, CodomainPrimal, CodomainDual> {
  readonly forward: SetHom<DomainPrimal, CodomainPrimal>;
  readonly backward: SetHom<CodomainDual, DomainDual>;
}

export interface ChuAdjointnessFailure<DomainPrimal, CodomainDual, Value> {
  readonly primal: DomainPrimal;
  readonly dual: CodomainDual;
  readonly forwardValue: Value;
  readonly backwardValue: Value;
}

export interface ChuMorphismDiagnostics<DomainPrimal, CodomainDual, Value> {
  readonly holds: boolean;
  readonly failures: ReadonlyArray<ChuAdjointnessFailure<DomainPrimal, CodomainDual, Value>>;
  readonly checkedPairs: number;
  readonly truncated: boolean;
}

export interface ChuMorphismWithDiagnostics<
  DomainPrimal,
  DomainDual,
  CodomainPrimal,
  CodomainDual,
  Value,
> {
  readonly morphism: ChuMorphism<DomainPrimal, DomainDual, CodomainPrimal, CodomainDual>;
  readonly diagnostics: ChuMorphismDiagnostics<DomainPrimal, CodomainDual, Value>;
}

const ensureCompatibleChuMorphism = <DomainPrimal, DomainDual, CodomainPrimal, CodomainDual, Value>(
  domain: ChuSpace<DomainPrimal, DomainDual, Value>,
  codomain: ChuSpace<CodomainPrimal, CodomainDual, Value>,
  forward: SetHom<DomainPrimal, CodomainPrimal>,
  backward: SetHom<CodomainDual, DomainDual>,
): void => {
  if (domain.dualizing !== codomain.dualizing) {
    throw new Error("Chu morphisms require a shared dualizing object.");
  }
  if (forward.dom !== domain.primal || forward.cod !== codomain.primal) {
    throw new Error("Chu morphism forward map must go between the primal carriers.");
  }
  if (backward.dom !== codomain.dual || backward.cod !== domain.dual) {
    throw new Error("Chu morphism backward map must go between the dual carriers.");
  }
};

export const checkChuMorphism = <DomainPrimal, DomainDual, CodomainPrimal, CodomainDual, Value>(
  domain: ChuSpace<DomainPrimal, DomainDual, Value>,
  codomain: ChuSpace<CodomainPrimal, CodomainDual, Value>,
  morphism: ChuMorphism<DomainPrimal, DomainDual, CodomainPrimal, CodomainDual>,
): ChuMorphismDiagnostics<DomainPrimal, CodomainDual, Value> => {
  ensureCompatibleChuMorphism(domain, codomain, morphism.forward, morphism.backward);
  const equals = semanticsAwareEquals(domain.dualizing);
  const domainElements = enumerate(domain.primal);
  const codomainDualElements = enumerate(codomain.dual);

  const failures: Array<ChuAdjointnessFailure<DomainPrimal, CodomainDual, Value>> = [];
  let checkedPairs = 0;
  let truncated = false;

  outer: for (const x of domainElements) {
    const forwardImage = morphism.forward.map(x);
    for (const b of codomainDualElements) {
      checkedPairs += 1;
      if (checkedPairs > MAX_ENUMERATED_PAIRS) {
        truncated = true;
        break outer;
      }
      const forwardValue = codomain.evaluate(forwardImage, b);
      const backwardValue = domain.evaluate(x, morphism.backward.map(b));
      if (!equals(forwardValue, backwardValue)) {
        if (failures.length < MAX_RECORDED_FAILURES) {
          failures.push({
            primal: x,
            dual: b,
            forwardValue,
            backwardValue,
          });
        } else {
          truncated = true;
          break outer;
        }
      }
    }
  }

  return {
    holds: failures.length === 0,
    failures,
    checkedPairs,
    truncated,
  };
};

export const constructChuMorphism = <DomainPrimal, DomainDual, CodomainPrimal, CodomainDual, Value>(
  domain: ChuSpace<DomainPrimal, DomainDual, Value>,
  codomain: ChuSpace<CodomainPrimal, CodomainDual, Value>,
  forward: SetHom<DomainPrimal, CodomainPrimal>,
  backward: SetHom<CodomainDual, DomainDual>,
): ChuMorphismWithDiagnostics<DomainPrimal, DomainDual, CodomainPrimal, CodomainDual, Value> => {
  ensureCompatibleChuMorphism(domain, codomain, forward, backward);
  const morphism: ChuMorphism<DomainPrimal, DomainDual, CodomainPrimal, CodomainDual> = {
    forward,
    backward,
  };
  const diagnostics = checkChuMorphism(domain, codomain, morphism);
  return { morphism, diagnostics };
};

export const identityChuMorphism = <Primal, Dual, Value>(
  space: ChuSpace<Primal, Dual, Value>,
): ChuMorphismWithDiagnostics<Primal, Dual, Primal, Dual, Value> =>
  constructChuMorphism(space, space, SetCat.id(space.primal), SetCat.id(space.dual));

export const composeChuMorphisms = <
  DomainPrimal,
  DomainDual,
  MiddlePrimal,
  MiddleDual,
  CodomainPrimal,
  CodomainDual,
  Value,
>(
  domain: ChuSpace<DomainPrimal, DomainDual, Value>,
  middle: ChuSpace<MiddlePrimal, MiddleDual, Value>,
  codomain: ChuSpace<CodomainPrimal, CodomainDual, Value>,
  first: ChuMorphism<DomainPrimal, DomainDual, MiddlePrimal, MiddleDual>,
  second: ChuMorphism<MiddlePrimal, MiddleDual, CodomainPrimal, CodomainDual>,
): ChuMorphismWithDiagnostics<DomainPrimal, DomainDual, CodomainPrimal, CodomainDual, Value> => {
  ensureCompatibleChuMorphism(domain, middle, first.forward, first.backward);
  ensureCompatibleChuMorphism(middle, codomain, second.forward, second.backward);
  const forward = SetCat.compose(second.forward, first.forward);
  const backward = SetCat.compose(first.backward, second.backward);
  return constructChuMorphism(domain, codomain, forward, backward);
};
