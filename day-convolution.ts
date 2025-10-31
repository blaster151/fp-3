import type { FiniteBifunctorInput, FiniteCoendResult } from "./coend";
import type { FiniteCategory } from "./finite-cat";
import { computeFiniteCoend } from "./coend";
import {
  constructFunctorWithWitness,
  type Functor,
  type FunctorCheckSamples,
  type FunctorWithWitness,
} from "./functor";
import {
  type ContravariantFunctorWithWitness,
  oppositeFunctorToContravariant,
} from "./contravariant";
import type {
  PromonoidalKernel,
  PromonoidalTensorValue,
  PromonoidalUnitValue,
} from "./promonoidal-structure";
import { setSimpleCategory } from "./set-simple-category";
import { SetCat, getCarrierSemantics, type SetHom, type SetObj } from "./set-cat";
import type { SimpleCat } from "./simple-cat";
import {
  constructNaturalTransformationWithWitness,
  type NaturalTransformationWithWitness,
} from "./natural-transformation";
import type { ArrPair } from "./product-cat";

interface DayTensorWitness<Obj, Arr, Left, Right> {
  readonly kernelLeft: Obj;
  readonly kernelRight: Obj;
  readonly output: Obj;
  readonly kernelValue: PromonoidalTensorValue<Obj, Arr>;
  readonly leftElement: Left;
  readonly rightElement: Right;
}

interface ElementKeyCache {
  readonly map: WeakMap<SetObj<unknown>, Map<unknown, string>>;
}

const makeElementKeyCache = (): ElementKeyCache => ({ map: new WeakMap() });

const iterateSet = <A>(set: SetObj<A>): Iterable<A> => {
  const semantics = getCarrierSemantics(set);
  if (semantics?.iterate) {
    return semantics.iterate();
  }
  return set.values();
};

const elementKey = <A>(cache: ElementKeyCache, set: SetObj<A>, element: A): string => {
  let table = cache.map.get(set);
  if (!table) {
    table = new Map();
    cache.map.set(set, table);
    let index = 0;
    for (const value of iterateSet(set)) {
      if (!table.has(value)) {
        table.set(value, `el#${index}`);
        index += 1;
      }
    }
  }
  let key = table.get(element as unknown);
  if (key === undefined) {
    key = `el#${table.size}`;
    table.set(element as unknown, key);
  }
  return key;
};

const objectKeyFromCategory = <Obj, Arr>(base: FiniteCategory<Obj, Arr>, object: Obj): string => {
  const index = base.objects.findIndex((candidate) => Object.is(candidate, object));
  if (index >= 0) {
    return `obj#${index}`;
  }
  return String(object);
};

const tensorOnArrows = <Obj, Arr>(
  kernel: PromonoidalKernel<Obj, Arr>,
  left: Arr,
  right: Arr,
): Arr => {
  const pair: ArrPair<Obj, Obj, Arr, Arr> = {
    src: [kernel.base.src(left), kernel.base.src(right)],
    dst: [kernel.base.dst(left), kernel.base.dst(right)],
    cf: left,
    dg: right,
  };
  return kernel.tensor.functor.onArrows(pair);
};

const leftUnitorBackwardArrow = <Obj, Arr>(
  kernel: PromonoidalKernel<Obj, Arr>,
  object: Obj,
): Arr => {
  const { leftUnitor } = kernel.unit;
  if (!leftUnitor) {
    throw new Error("Day convolution: promonoidal kernel is missing a left unitor.");
  }
  return leftUnitor.backward(object);
};

const rightUnitorBackwardArrow = <Obj, Arr>(
  kernel: PromonoidalKernel<Obj, Arr>,
  object: Obj,
): Arr => {
  const { rightUnitor } = kernel.unit;
  if (!rightUnitor) {
    throw new Error("Day convolution: promonoidal kernel is missing a right unitor.");
  }
  return rightUnitor.backward(object);
};

const associatorBackwardArrow = <Obj, Arr>(
  kernel: PromonoidalKernel<Obj, Arr>,
  left: Obj,
  middle: Obj,
  right: Obj,
): Arr => {
  const { associator } = kernel.tensor;
  if (!associator) {
    throw new Error("Day convolution: promonoidal kernel is missing an associator.");
  }
  return associator.backward([left, middle, right]);
};

const createDayTensorInput = <Obj, Arr, Left, Right>(
  kernel: PromonoidalKernel<Obj, Arr>,
  output: Obj,
  left: ContravariantFunctorWithWitness<Obj, Arr, SetObj<Left>, SetHom<Left, Left>>,
  right: FunctorWithWitness<Obj, Arr, SetObj<Right>, SetHom<Right, Right>>,
  cache: ElementKeyCache,
): FiniteBifunctorInput<Obj, Arr, DayTensorWitness<Obj, Arr, Left, Right>> => {
  const { base } = kernel;
  return {
    category: base,
    evaluate: (kernelLeft, kernelRight) => {
      const witnesses: DayTensorWitness<Obj, Arr, Left, Right>[] = [];
      const kernelValues = kernel.tensor.profunctor.evaluate(kernelLeft, kernelRight, output);
      const leftSet = left.functor.F0(kernelLeft);
      const rightSet = right.functor.F0(kernelRight);
      for (const kernelValue of kernelValues) {
        for (const leftElement of iterateSet(leftSet)) {
          for (const rightElement of iterateSet(rightSet)) {
            witnesses.push({
              kernelLeft,
              kernelRight,
              output,
              kernelValue,
              leftElement,
              rightElement,
            });
          }
        }
      }
      return witnesses;
    },
    valueKey: (kernelLeft, kernelRight, witness) => {
      const kernelKey = kernel.tensor.profunctor.valueKey(
        kernelLeft,
        kernelRight,
        witness.output,
        witness.kernelValue,
      );
      const leftSet = left.functor.F0(kernelLeft);
      const rightSet = right.functor.F0(kernelRight);
      const leftKey = elementKey(cache, leftSet, witness.leftElement);
      const rightKey = elementKey(cache, rightSet, witness.rightElement);
      return `${kernelKey}::L=${leftKey}::R=${rightKey}`;
    },
    objectKey: (object) => objectKeyFromCategory(base, object),
    actOnLeft: (arrow, kernelRight, witness) => {
      const transportedKernel = kernel.tensor.profunctor.actOnLeft(
        arrow,
        kernelRight,
        witness.output,
        witness.kernelValue,
      );
      const leftAction = left.functor.F1(arrow);
      const mappedLeft = leftAction.map(witness.leftElement);
      const newKernelLeft = base.src(arrow);
      const leftSet = left.functor.F0(newKernelLeft);
      elementKey(cache, leftSet, mappedLeft);
      return {
        kernelLeft: newKernelLeft,
        kernelRight,
        output: witness.output,
        kernelValue: transportedKernel,
        leftElement: mappedLeft,
        rightElement: witness.rightElement,
      } satisfies DayTensorWitness<Obj, Arr, Left, Right>;
    },
    actOnRight: (kernelLeft, arrow, witness) => {
      const transportedKernel = kernel.tensor.profunctor.actOnRight(
        kernelLeft,
        arrow,
        witness.output,
        witness.kernelValue,
      );
      const rightAction = right.functor.F1(arrow);
      const mappedRight = rightAction.map(witness.rightElement);
      const newKernelRight = base.dst(arrow);
      const rightSet = right.functor.F0(newKernelRight);
      elementKey(cache, rightSet, mappedRight);
      return {
        kernelLeft,
        kernelRight: newKernelRight,
        output: witness.output,
        kernelValue: transportedKernel,
        leftElement: witness.leftElement,
        rightElement: mappedRight,
      } satisfies DayTensorWitness<Obj, Arr, Left, Right>;
    },
  } satisfies FiniteBifunctorInput<Obj, Arr, DayTensorWitness<Obj, Arr, Left, Right>>;
};

interface DayConvolutionClass<Obj, Arr, Left, Right> {
  readonly output: Obj;
  readonly diagonalObject: Obj;
  readonly key: string;
  readonly witness: DayTensorWitness<Obj, Arr, Left, Right>;
}

interface DayConvolutionFiber<Obj, Arr, Left, Right> {
  readonly output: Obj;
  readonly coend: FiniteCoendResult<Obj, Arr, DayTensorWitness<Obj, Arr, Left, Right>>;
  readonly classes: ReadonlyArray<DayConvolutionClass<Obj, Arr, Left, Right>>;
  readonly classMap: ReadonlyMap<string, DayConvolutionClass<Obj, Arr, Left, Right>>;
  readonly classify: (
    diagonal: Obj,
    witness: DayTensorWitness<Obj, Arr, Left, Right>,
  ) => DayConvolutionClass<Obj, Arr, Left, Right> | undefined;
}

const buildFiber = <Obj, Arr, Left, Right>(
  kernel: PromonoidalKernel<Obj, Arr>,
  output: Obj,
  left: ContravariantFunctorWithWitness<Obj, Arr, SetObj<Left>, SetHom<Left, Left>>,
  right: FunctorWithWitness<Obj, Arr, SetObj<Right>, SetHom<Right, Right>>,
  cache: ElementKeyCache,
): DayConvolutionFiber<Obj, Arr, Left, Right> => {
  const input = createDayTensorInput(kernel, output, left, right, cache);
  const coend = computeFiniteCoend(input);
  const classes: DayConvolutionClass<Obj, Arr, Left, Right>[] = coend.classes.map((coendClass) => ({
    output,
    diagonalObject: coendClass.representative.object,
    key: coendClass.key,
    witness: coendClass.representative.value,
  }));
  const classMap = new Map<string, DayConvolutionClass<Obj, Arr, Left, Right>>(
    classes.map((entry) => [entry.key, entry]),
  );
  const classify = (
    diagonal: Obj,
    witness: DayTensorWitness<Obj, Arr, Left, Right>,
  ): DayConvolutionClass<Obj, Arr, Left, Right> | undefined => {
    const result = coend.classify({ object: diagonal, value: witness });
    if (!result) {
      return undefined;
    }
    return classMap.get(result.key);
  };
  return { output, coend, classes, classMap, classify };
};

const classifyInFiber = <Obj, Arr, Left, Right>(
  fiber: DayConvolutionFiber<Obj, Arr, Left, Right>,
  witness: DayTensorWitness<Obj, Arr, Left, Right>,
): { diagonal: Obj; class: DayConvolutionClass<Obj, Arr, Left, Right> } | undefined => {
  for (const candidate of fiber.classes) {
    const classified = fiber.classify(candidate.diagonalObject, witness);
    if (classified) {
      return { diagonal: candidate.diagonalObject, class: classified };
    }
  }
  return undefined;
};

const makeFunctorSamples = <Obj, Arr>(base: FiniteCategory<Obj, Arr>): FunctorCheckSamples<Obj, Arr> => ({
  objects: base.objects,
  arrows: base.arrows,
});

const buildSetForFiber = <Obj, Arr, Left, Right>(
  fiber: DayConvolutionFiber<Obj, Arr, Left, Right>,
): SetObj<DayConvolutionClass<Obj, Arr, Left, Right>> =>
  SetCat.obj(fiber.classes, {
    equals: (left, right) => left.key === right.key,
    tag: `DayTensor(${String(fiber.output)})`,
  });

const buildArrowMap = <Obj, Arr, Left, Right>(
  kernel: PromonoidalKernel<Obj, Arr>,
  arrow: Arr,
  domain: DayConvolutionFiber<Obj, Arr, Left, Right>,
  codomain: DayConvolutionFiber<Obj, Arr, Left, Right>,
): ((value: DayConvolutionClass<Obj, Arr, Left, Right>) => DayConvolutionClass<Obj, Arr, Left, Right>) => {
  const target = kernel.base.dst(arrow);
  if (!Object.is(target, codomain.output)) {
    throw new Error("dayConvolution: codomain fiber does not match arrow target");
  }
  return (value) => {
    const transportedKernel = kernel.tensor.profunctor.actOnOutput(
      value.witness.kernelLeft,
      value.witness.kernelRight,
      arrow,
      value.witness.kernelValue,
    );
    const transported: DayTensorWitness<Obj, Arr, Left, Right> = {
      kernelLeft: value.witness.kernelLeft,
      kernelRight: value.witness.kernelRight,
      output: codomain.output,
      kernelValue: transportedKernel,
      leftElement: value.witness.leftElement,
      rightElement: value.witness.rightElement,
    };
    const classified = codomain.classify(value.diagonalObject, transported);
    if (!classified) {
      throw new Error(
        `dayConvolution: unable to classify transported element for arrow ${String(arrow)}.`,
      );
    }
    return classified;
  };
};

export interface DayConvolutionResult<Obj, Arr, Left, Right> {
  readonly functor: FunctorWithWitness<Obj, Arr, SetObj<DayConvolutionClass<Obj, Arr, Left, Right>>, SetHom<
    DayConvolutionClass<Obj, Arr, Left, Right>,
    DayConvolutionClass<Obj, Arr, Left, Right>
  >>;
  readonly fibers: ReadonlyArray<DayConvolutionFiber<Obj, Arr, Left, Right>>;
  readonly carrier: (
    object: Obj,
  ) => SetObj<DayConvolutionClass<Obj, Arr, Left, Right>> | undefined;
}

export const dayTensor = <Obj, Arr, Left, Right>(
  kernel: PromonoidalKernel<Obj, Arr>,
  left: ContravariantFunctorWithWitness<Obj, Arr, SetObj<Left>, SetHom<Left, Left>>,
  right: FunctorWithWitness<Obj, Arr, SetObj<Right>, SetHom<Right, Right>>,
  metadata: ReadonlyArray<string> = [
    "Day convolution tensor computed from promonoidal kernel.",
  ],
): DayConvolutionResult<Obj, Arr, Left, Right> => {
  const cache = makeElementKeyCache();
  const fibers = kernel.base.objects.map((output) =>
    buildFiber(kernel, output, left, right, cache),
  );
  const objectSets = new Map<Obj, SetObj<DayConvolutionClass<Obj, Arr, Left, Right>>>();
  fibers.forEach((fiber) => {
    objectSets.set(fiber.output, buildSetForFiber(fiber));
  });

  const functor: Functor<Obj, Arr, SetObj<DayConvolutionClass<Obj, Arr, Left, Right>>, SetHom<
    DayConvolutionClass<Obj, Arr, Left, Right>,
    DayConvolutionClass<Obj, Arr, Left, Right>
  >> = {
    F0: (object) => {
      const set = objectSets.get(object);
      if (!set) {
        throw new Error(`dayConvolution: missing carrier for object ${String(object)}.`);
      }
      return set;
    },
    F1: (arrow) => {
      const domainObject = kernel.base.src(arrow);
      const codomainObject = kernel.base.dst(arrow);
      const domainFiber = fibers.find((fiber) => Object.is(fiber.output, domainObject));
      const codomainFiber = fibers.find((fiber) => Object.is(fiber.output, codomainObject));
      if (!domainFiber || !codomainFiber) {
        throw new Error("dayConvolution: missing fiber for arrow map.");
      }
      const domainSet = objectSets.get(domainObject);
      const codomainSet = objectSets.get(codomainObject);
      if (!domainSet || !codomainSet) {
        throw new Error("dayConvolution: missing carrier for arrow map.");
      }
      const map = buildArrowMap(kernel, arrow, domainFiber, codomainFiber);
      return SetCat.hom(domainSet, codomainSet, map);
    },
  };

  const samples = makeFunctorSamples(kernel.base);

  const witnessed = constructFunctorWithWitness(
    kernel.base,
    setSimpleCategory as SimpleCat<
      SetObj<DayConvolutionClass<Obj, Arr, Left, Right>>,
      SetHom<
        DayConvolutionClass<Obj, Arr, Left, Right>,
        DayConvolutionClass<Obj, Arr, Left, Right>
      >
    >,
    functor,
    samples,
    metadata,
  );

  const carrier = (object: Obj) => objectSets.get(object);

  return { functor: witnessed, fibers, carrier };
};

export interface DayTensorWitnessTransform<Obj, Arr, LeftIn, RightIn, LeftOut, RightOut> {
  readonly diagonal?: Obj;
  readonly kernelLeft?: Obj;
  readonly kernelRight?: Obj;
  readonly kernelValue?: PromonoidalTensorValue<Obj, Arr>;
  readonly leftElement: LeftOut;
  readonly rightElement: RightOut;
}

const findFiber = <Obj, Arr, Left, Right>(
  fibers: ReadonlyArray<DayConvolutionFiber<Obj, Arr, Left, Right>>,
  object: Obj,
): DayConvolutionFiber<Obj, Arr, Left, Right> | undefined =>
  fibers.find((fiber) => Object.is(fiber.output, object));

export const mapDayConvolutionFiber = <Obj, Arr, LeftIn, RightIn, LeftOut, RightOut>(
  source: DayConvolutionResult<Obj, Arr, LeftIn, RightIn>,
  target: DayConvolutionResult<Obj, Arr, LeftOut, RightOut>,
  object: Obj,
  transform: (
    witness: DayTensorWitness<Obj, Arr, LeftIn, RightIn>,
  ) => DayTensorWitnessTransform<Obj, Arr, LeftIn, RightIn, LeftOut, RightOut>,
): SetHom<
  DayConvolutionClass<Obj, Arr, LeftIn, RightIn>,
  DayConvolutionClass<Obj, Arr, LeftOut, RightOut>
> => {
  const domainCarrier = source.carrier(object);
  const codomainCarrier = target.carrier(object);
  if (!domainCarrier || !codomainCarrier) {
    throw new Error(`mapDayConvolutionFiber: missing carriers for object ${String(object)}.`);
  }

  const sourceFiber = findFiber(source.fibers, object);
  const targetFiber = findFiber(target.fibers, object);
  if (!sourceFiber || !targetFiber) {
    throw new Error(`mapDayConvolutionFiber: missing fibers for object ${String(object)}.`);
  }

  const mapping = (
    value: DayConvolutionClass<Obj, Arr, LeftIn, RightIn>,
  ): DayConvolutionClass<Obj, Arr, LeftOut, RightOut> => {
    const update = transform(value.witness);
    const diagonal = update.diagonal ?? value.diagonalObject;
    const kernelLeft = update.kernelLeft ?? value.witness.kernelLeft;
    const kernelRight = update.kernelRight ?? value.witness.kernelRight;
    const kernelValue = update.kernelValue ?? value.witness.kernelValue;
    const newWitness: DayTensorWitness<Obj, Arr, LeftOut, RightOut> = {
      kernelLeft,
      kernelRight,
      output: value.witness.output,
      kernelValue,
      leftElement: update.leftElement,
      rightElement: update.rightElement,
    };
    const classified = targetFiber.classify(diagonal, newWitness);
    if (!classified) {
      throw new Error(
        `mapDayConvolutionFiber: unable to classify mapped witness for object ${String(object)}.`,
      );
    }
    return classified;
  };

  return SetCat.hom(domainCarrier, codomainCarrier, mapping);
};

export interface DayUnitResult<Obj, Arr> {
  readonly functor: FunctorWithWitness<
    Obj,
    Arr,
    SetObj<PromonoidalUnitValue<Obj, Arr>>,
    SetHom<PromonoidalUnitValue<Obj, Arr>, PromonoidalUnitValue<Obj, Arr>>
  >;
}

export const dayUnit = <Obj, Arr>(
  kernel: PromonoidalKernel<Obj, Arr>,
  metadata: ReadonlyArray<string> = [
    "Day convolution unit derived from promonoidal kernel.",
  ],
): DayUnitResult<Obj, Arr> => {
  const carriers = new Map<Obj, SetObj<PromonoidalUnitValue<Obj, Arr>>>();
  for (const object of kernel.base.objects) {
    const values = kernel.unit.profunctor.evaluate(object);
    carriers.set(
      object,
      SetCat.obj(values, {
        equals: (left, right) => kernel.base.eq(left.arrow, right.arrow),
        tag: `DayUnit(${String(object)})`,
      }),
    );
  }

  const functor: Functor<
    Obj,
    Arr,
    SetObj<PromonoidalUnitValue<Obj, Arr>>,
    SetHom<PromonoidalUnitValue<Obj, Arr>, PromonoidalUnitValue<Obj, Arr>>
  > = {
    F0: (object) => {
      const carrier = carriers.get(object);
      if (!carrier) {
        throw new Error(`dayUnit: missing carrier for object ${String(object)}.`);
      }
      return carrier;
    },
    F1: (arrow) => {
      const domainObject = kernel.base.src(arrow);
      const codomainObject = kernel.base.dst(arrow);
      const domainCarrier = carriers.get(domainObject);
      const codomainCarrier = carriers.get(codomainObject);
      if (!domainCarrier || !codomainCarrier) {
        throw new Error("dayUnit: missing carrier for arrow map.");
      }
      const map = (value: PromonoidalUnitValue<Obj, Arr>) =>
        kernel.unit.profunctor.actOn(arrow, value);
      return SetCat.hom(domainCarrier, codomainCarrier, map);
    },
  };

  const samples = makeFunctorSamples(kernel.base);

  const witnessed = constructFunctorWithWitness(
    kernel.base,
    setSimpleCategory as SimpleCat<
      SetObj<PromonoidalUnitValue<Obj, Arr>>,
      SetHom<PromonoidalUnitValue<Obj, Arr>, PromonoidalUnitValue<Obj, Arr>>
    >,
    functor,
    samples,
    metadata,
  );

  return { functor: witnessed };
};

const unitContravariantMetadata = [
  "Day convolution unit converted to a contravariant witness via the opposite functor.",
];

export const dayUnitContravariant = <Obj, Arr>(
  kernel: PromonoidalKernel<Obj, Arr>,
  metadata: ReadonlyArray<string> = [],
): ContravariantFunctorWithWitness<
  Obj,
  Arr,
  SetObj<PromonoidalUnitValue<Obj, Arr>>,
  SetHom<PromonoidalUnitValue<Obj, Arr>, PromonoidalUnitValue<Obj, Arr>>
> => {
  const unit = dayUnit(kernel);
  const combined = [...metadata, ...unitContravariantMetadata];
  return oppositeFunctorToContravariant(kernel.base, unit.functor, combined);
};

const buildLeftUnitorComponent = <Obj, Arr, Payload>(
  kernel: PromonoidalKernel<Obj, Arr>,
  functor: FunctorWithWitness<Obj, Arr, SetObj<Payload>, SetHom<Payload, Payload>>,
  convolution: DayConvolutionResult<Obj, Arr, PromonoidalUnitValue<Obj, Arr>, Payload>,
  object: Obj,
): SetHom<
  DayConvolutionClass<Obj, Arr, PromonoidalUnitValue<Obj, Arr>, Payload>,
  Payload
> => {
  const fiber = findFiber(convolution.fibers, object);
  if (!fiber) {
    throw new Error(`dayConvolutionLeftUnitor: missing fiber for object ${String(object)}.`);
  }
  const domain = convolution.functor.functor.F0(object);
  const codomain = functor.functor.F0(object);
  const mapping = (
    value: DayConvolutionClass<Obj, Arr, PromonoidalUnitValue<Obj, Arr>, Payload>,
  ): Payload => {
    const rightObject = value.witness.kernelRight;
    const unitArrow = value.witness.leftElement.arrow;
    const transported = tensorOnArrows(
      kernel,
      unitArrow,
      kernel.base.id(rightObject),
    );
    const throughTensor = kernel.base.compose(value.witness.kernelValue.arrow, transported);
    const unitor = leftUnitorBackwardArrow(kernel, rightObject);
    const composite = kernel.base.compose(throughTensor, unitor);
    const action = functor.functor.F1(composite);
    return action.map(value.witness.rightElement);
  };
  return SetCat.hom(domain, codomain, mapping);
};

const buildRightUnitorComponent = <Obj, Arr, Payload>(
  kernel: PromonoidalKernel<Obj, Arr>,
  functor: FunctorWithWitness<Obj, Arr, SetObj<Payload>, SetHom<Payload, Payload>>,
  convolution: DayConvolutionResult<Obj, Arr, Payload, PromonoidalUnitValue<Obj, Arr>>,
  object: Obj,
): SetHom<
  DayConvolutionClass<Obj, Arr, Payload, PromonoidalUnitValue<Obj, Arr>>,
  Payload
> => {
  const fiber = findFiber(convolution.fibers, object);
  if (!fiber) {
    throw new Error(`dayConvolutionRightUnitor: missing fiber for object ${String(object)}.`);
  }
  const domain = convolution.functor.functor.F0(object);
  const codomain = functor.functor.F0(object);
  const mapping = (
    value: DayConvolutionClass<Obj, Arr, Payload, PromonoidalUnitValue<Obj, Arr>>,
  ): Payload => {
    const leftObject = value.witness.kernelLeft;
    const unitArrow = value.witness.rightElement.arrow;
    const transported = tensorOnArrows(
      kernel,
      kernel.base.id(leftObject),
      unitArrow,
    );
    const throughTensor = kernel.base.compose(value.witness.kernelValue.arrow, transported);
    const unitor = rightUnitorBackwardArrow(kernel, leftObject);
    const composite = kernel.base.compose(throughTensor, unitor);
    const action = functor.functor.F1(composite);
    return action.map(value.witness.leftElement);
  };
  return SetCat.hom(domain, codomain, mapping);
};

export const dayConvolutionLeftUnitor = <Obj, Arr, Payload>(
  kernel: PromonoidalKernel<Obj, Arr>,
  functor: FunctorWithWitness<Obj, Arr, SetObj<Payload>, SetHom<Payload, Payload>>,
): NaturalTransformationWithWitness<Obj, Arr, SetObj<Payload>, SetHom<Payload, Payload>> => {
  const unit = dayUnitContravariant(kernel);
  const convolution = dayTensor(kernel, unit, functor);
  const metadata = ["Day convolution left unitor induced by the promonoidal left unitor."];
  const transformation = constructNaturalTransformationWithWitness<
    Obj,
    Arr,
    SetObj<unknown>,
    SetHom<unknown, unknown>
  >(
    convolution.functor as FunctorWithWitness<Obj, Arr, SetObj<unknown>, SetHom<unknown, unknown>>,
    functor as FunctorWithWitness<Obj, Arr, SetObj<unknown>, SetHom<unknown, unknown>>,
    (object) =>
      buildLeftUnitorComponent(kernel, functor, convolution, object) as SetHom<unknown, unknown>,
    { metadata },
  );
  return transformation as unknown as NaturalTransformationWithWitness<
    Obj,
    Arr,
    SetObj<Payload>,
    SetHom<Payload, Payload>
  >;
};

export const dayConvolutionRightUnitor = <Obj, Arr, Payload>(
  kernel: PromonoidalKernel<Obj, Arr>,
  functor: FunctorWithWitness<Obj, Arr, SetObj<Payload>, SetHom<Payload, Payload>>,
): NaturalTransformationWithWitness<Obj, Arr, SetObj<Payload>, SetHom<Payload, Payload>> => {
  const contravariant = oppositeFunctorToContravariant(kernel.base, functor);
  const unit = dayUnit(kernel);
  const convolution = dayTensor(kernel, contravariant, unit.functor);
  const metadata = ["Day convolution right unitor induced by the promonoidal right unitor."];
  const transformation = constructNaturalTransformationWithWitness<
    Obj,
    Arr,
    SetObj<unknown>,
    SetHom<unknown, unknown>
  >(
    convolution.functor as FunctorWithWitness<Obj, Arr, SetObj<unknown>, SetHom<unknown, unknown>>,
    functor as FunctorWithWitness<Obj, Arr, SetObj<unknown>, SetHom<unknown, unknown>>,
    (object) =>
      buildRightUnitorComponent(kernel, functor, convolution, object) as SetHom<unknown, unknown>,
    { metadata },
  );
  return transformation as unknown as NaturalTransformationWithWitness<
    Obj,
    Arr,
    SetObj<Payload>,
    SetHom<Payload, Payload>
  >;
};

const buildAssociatorTransform = <Obj, Arr, LeftPayload, MiddlePayload, RightPayload>(
  kernel: PromonoidalKernel<Obj, Arr>,
  gh: DayConvolutionResult<Obj, Arr, MiddlePayload, RightPayload>,
) => (
  witness: DayTensorWitness<
    Obj,
    Arr,
    DayConvolutionClass<Obj, Arr, LeftPayload, MiddlePayload>,
    RightPayload
  >,
): DayTensorWitnessTransform<
  Obj,
  Arr,
  DayConvolutionClass<Obj, Arr, LeftPayload, MiddlePayload>,
  RightPayload,
  LeftPayload,
  DayConvolutionClass<Obj, Arr, MiddlePayload, RightPayload>
> => {
  const outerClass = witness.leftElement;
  const innerWitness = outerClass.witness;
  const leftObject = innerWitness.kernelLeft;
  const middleObject = innerWitness.kernelRight;
  const rightObject = witness.kernelRight;
  const output = witness.output;

  const wObject = kernel.tensor.functor.onObjects([middleObject, rightObject]);
  const ghFiber = findFiber(gh.fibers, wObject);
  if (!ghFiber) {
    throw new Error("dayConvolutionAssociator: missing (G ⋆ H) fiber for intermediate object.");
  }

  const ghWitness: DayTensorWitness<Obj, Arr, MiddlePayload, RightPayload> = {
    kernelLeft: middleObject,
    kernelRight: rightObject,
    output: wObject,
    kernelValue: {
      arrow: kernel.base.id(wObject),
      domain: kernel.tensor.functor.onObjects([middleObject, rightObject]),
      codomain: wObject,
    },
    leftElement: innerWitness.rightElement,
    rightElement: witness.rightElement,
  };

  const ghClassification = classifyInFiber(ghFiber, ghWitness);
  if (!ghClassification) {
    throw new Error("dayConvolutionAssociator: unable to classify (G ⋆ H) witness.");
  }

  const lifted = tensorOnArrows(
    kernel,
    innerWitness.kernelValue.arrow,
    kernel.base.id(rightObject),
  );
  const throughTensor = kernel.base.compose(witness.kernelValue.arrow, lifted);
  const assoc = associatorBackwardArrow(kernel, leftObject, middleObject, rightObject);
  const finalArrow = kernel.base.compose(throughTensor, assoc);

  return {
    diagonal: ghClassification.diagonal,
    kernelLeft: leftObject,
    kernelRight: wObject,
    kernelValue: {
      arrow: finalArrow,
      domain: kernel.tensor.functor.onObjects([leftObject, wObject]),
      codomain: output,
    },
    leftElement: innerWitness.leftElement,
    rightElement: ghClassification.class,
  };
};

export const dayConvolutionAssociator = <Obj, Arr, LeftPayload, MiddlePayload, RightPayload>(
  kernel: PromonoidalKernel<Obj, Arr>,
  left: FunctorWithWitness<Obj, Arr, SetObj<LeftPayload>, SetHom<LeftPayload, LeftPayload>>,
  middle: FunctorWithWitness<Obj, Arr, SetObj<MiddlePayload>, SetHom<MiddlePayload, MiddlePayload>>,
  right: FunctorWithWitness<Obj, Arr, SetObj<RightPayload>, SetHom<RightPayload, RightPayload>>,
): NaturalTransformationWithWitness<
  Obj,
  Arr,
  SetObj<DayConvolutionClass<Obj, Arr, DayConvolutionClass<Obj, Arr, LeftPayload, MiddlePayload>, RightPayload>>,
  SetHom<
    DayConvolutionClass<Obj, Arr, DayConvolutionClass<Obj, Arr, LeftPayload, MiddlePayload>, RightPayload>,
    DayConvolutionClass<Obj, Arr, LeftPayload, DayConvolutionClass<Obj, Arr, MiddlePayload, RightPayload>>
  >
> => {
  const leftContravariant = oppositeFunctorToContravariant(kernel.base, left);
  const middleContravariant = oppositeFunctorToContravariant(kernel.base, middle);

  const fg = dayTensor(kernel, leftContravariant, middle);
  const fgContravariant = oppositeFunctorToContravariant(kernel.base, fg.functor);

  const gh = dayTensor(kernel, middleContravariant, right);

  const leftSide = dayTensor(kernel, fgContravariant, right);
  const rightSide = dayTensor(kernel, leftContravariant, gh.functor);

  const metadata = ["Day convolution associator induced by the promonoidal associator."];

  const transformation = constructNaturalTransformationWithWitness<
    Obj,
    Arr,
    SetObj<unknown>,
    SetHom<unknown, unknown>
  >(
    leftSide.functor as FunctorWithWitness<Obj, Arr, SetObj<unknown>, SetHom<unknown, unknown>>,
    rightSide.functor as FunctorWithWitness<Obj, Arr, SetObj<unknown>, SetHom<unknown, unknown>>,
    (object) =>
      mapDayConvolutionFiber(
        leftSide,
        rightSide,
        object,
        buildAssociatorTransform(kernel, gh),
      ) as SetHom<unknown, unknown>,
    { metadata },
  );
  return transformation as unknown as NaturalTransformationWithWitness<
    Obj,
    Arr,
    SetObj<
      DayConvolutionClass<
        Obj,
        Arr,
        DayConvolutionClass<Obj, Arr, LeftPayload, MiddlePayload>,
        RightPayload
      >
    >,
    SetHom<
      DayConvolutionClass<
        Obj,
        Arr,
        DayConvolutionClass<Obj, Arr, LeftPayload, MiddlePayload>,
        RightPayload
      >,
      DayConvolutionClass<
        Obj,
        Arr,
        LeftPayload,
        DayConvolutionClass<Obj, Arr, MiddlePayload, RightPayload>
      >
    >
  >;
};
