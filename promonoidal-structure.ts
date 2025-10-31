import type { FiniteCategory } from "./finite-cat";
import {
  computeFiniteCoend,
  computeFiniteEnd,
  type FiniteBifunctorInput,
  type FiniteCoendDiagnostics,
  type FiniteEndDiagnostics,
} from "./coend";
import type { ObjPair, ArrPair } from "./product-cat";
import { ProductCat } from "./product-cat";
import type { FiniteFunctor } from "./relative/mnne-lax-monoidal";
import { TwoObjectCategory, nonIdentity, type TwoObject, type TwoArrow } from "./two-object-cat";

export interface PromonoidalTensorValue<Obj, Arr> {
  readonly arrow: Arr;
  readonly domain: Obj;
  readonly codomain: Obj;
}

export interface PromonoidalUnitValue<Obj, Arr> {
  readonly arrow: Arr;
  readonly domain: Obj;
  readonly codomain: Obj;
}

export interface PromonoidalIsomorphism<Obj, Arr> {
  readonly forward: (object: Obj) => Arr;
  readonly backward: (object: Obj) => Arr;
}

export interface PromonoidalTensor<Obj, Arr> {
  readonly evaluate: (left: Obj, right: Obj, output: Obj) => ReadonlyArray<PromonoidalTensorValue<Obj, Arr>>;
  readonly valueKey: (
    left: Obj,
    right: Obj,
    output: Obj,
    value: PromonoidalTensorValue<Obj, Arr>,
  ) => string;
  readonly actOnLeft: (
    arrow: Arr,
    right: Obj,
    output: Obj,
    value: PromonoidalTensorValue<Obj, Arr>,
  ) => PromonoidalTensorValue<Obj, Arr>;
  readonly actOnRight: (
    left: Obj,
    arrow: Arr,
    output: Obj,
    value: PromonoidalTensorValue<Obj, Arr>,
  ) => PromonoidalTensorValue<Obj, Arr>;
  readonly actOnOutput: (
    left: Obj,
    right: Obj,
    arrow: Arr,
    value: PromonoidalTensorValue<Obj, Arr>,
  ) => PromonoidalTensorValue<Obj, Arr>;
}

export interface PromonoidalUnit<Obj, Arr> {
  readonly evaluate: (object: Obj) => ReadonlyArray<PromonoidalUnitValue<Obj, Arr>>;
  readonly valueKey: (object: Obj, value: PromonoidalUnitValue<Obj, Arr>) => string;
  readonly actOn: (arrow: Arr, value: PromonoidalUnitValue<Obj, Arr>) => PromonoidalUnitValue<Obj, Arr>;
}

export interface PromonoidalKernel<Obj, Arr> {
  readonly base: FiniteCategory<Obj, Arr>;
  readonly tensor: {
    readonly profunctor: PromonoidalTensor<Obj, Arr>;
    readonly bifunctor: FiniteBifunctorInput<Obj, Arr, PromonoidalTensorWitness<Obj, Arr>>;
    readonly functor: FiniteFunctor<ObjPair<Obj, Obj>, ArrPair<Obj, Obj, Arr, Arr>, Obj, Arr>;
    readonly associator?: PromonoidalIsomorphism<ObjTriple<Obj>, Arr>;
  };
  readonly unit: {
    readonly profunctor: PromonoidalUnit<Obj, Arr>;
    readonly bifunctor: FiniteBifunctorInput<Obj, Arr, PromonoidalUnitWitness<Obj, Arr>>;
    readonly functor: FiniteFunctor<Obj, Arr, Obj, Arr>;
    readonly leftUnitor?: PromonoidalIsomorphism<Obj, Arr>;
    readonly rightUnitor?: PromonoidalIsomorphism<Obj, Arr>;
  };
}

export interface PromonoidalTensorWitness<Obj, Arr> {
  readonly left: Obj;
  readonly right: Obj;
  readonly output: Obj;
  readonly value: PromonoidalTensorValue<Obj, Arr>;
}

export interface PromonoidalUnitWitness<Obj, Arr> {
  readonly object: Obj;
  readonly value: PromonoidalUnitValue<Obj, Arr>;
}

export interface PromonoidalTensorDiagnostics<Obj, Arr> {
  readonly leftRight: FiniteCoendDiagnostics<Obj, Arr, PromonoidalTensorWitness<Obj, Arr>>;
  readonly output: FiniteCoendDiagnostics<Obj, Arr, PromonoidalTensorWitness<Obj, Arr>>;
}

export interface PromonoidalUnitDiagnostics<Obj, Arr> {
  readonly coend: FiniteCoendDiagnostics<Obj, Arr, PromonoidalUnitWitness<Obj, Arr>>;
  readonly end: FiniteEndDiagnostics<Obj, Arr, PromonoidalUnitWitness<Obj, Arr>>;
}

export interface PromonoidalKernelDiagnostics<Obj, Arr> {
  readonly tensor: PromonoidalTensorDiagnostics<Obj, Arr>;
  readonly unit: PromonoidalUnitDiagnostics<Obj, Arr>;
}

export type ObjTriple<Obj> = readonly [Obj, Obj, Obj];

const tensorWitnessInput = <Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  tensor: PromonoidalTensor<Obj, Arr>,
): FiniteBifunctorInput<Obj, Arr, PromonoidalTensorWitness<Obj, Arr>> => ({
  category: base,
  evaluate: (left, right) => {
    const witnesses: Array<PromonoidalTensorWitness<Obj, Arr>> = [];
    for (const output of base.objects) {
      const values = tensor.evaluate(left, right, output);
      for (const value of values) {
        witnesses.push({ left, right, output, value });
      }
    }
    return witnesses;
  },
  valueKey: (_left, _right, witness) =>
    tensor.valueKey(witness.left, witness.right, witness.output, witness.value),
  objectKey: (object) => objectKeyFromCategory(base, object),
  actOnLeft: (arrow, _right, witness) => ({
    left: base.src(arrow),
    right: witness.right,
    output: witness.output,
    value: tensor.actOnLeft(arrow, witness.right, witness.output, witness.value),
  }),
  actOnRight: (_left, arrow, witness) => ({
    left: witness.left,
    right: base.dst(arrow),
    output: witness.output,
    value: tensor.actOnRight(witness.left, arrow, witness.output, witness.value),
  }),
});

const outputWitnessInput = <Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  tensor: PromonoidalTensor<Obj, Arr>,
): FiniteBifunctorInput<Obj, Arr, PromonoidalTensorWitness<Obj, Arr>> => ({
  category: base,
  evaluate: (target, source) => {
    const witnesses: Array<PromonoidalTensorWitness<Obj, Arr>> = [];
    for (const left of base.objects) {
      for (const right of base.objects) {
        const values = tensor.evaluate(left, right, source);
        for (const value of values) {
          witnesses.push({ left, right, output: source, value });
        }
      }
    }
    return witnesses;
  },
  valueKey: (_left, _right, witness) =>
    tensor.valueKey(witness.left, witness.right, witness.output, witness.value),
  objectKey: (object) => objectKeyFromCategory(base, object),
  actOnLeft: (_arrow, _right, witness) => witness,
  actOnRight: (_left, arrow, witness) => ({
    left: witness.left,
    right: witness.right,
    output: base.dst(arrow),
    value: tensor.actOnOutput(witness.left, witness.right, arrow, witness.value),
  }),
});

const unitWitnessInput = <Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  unit: PromonoidalUnit<Obj, Arr>,
): FiniteBifunctorInput<Obj, Arr, PromonoidalUnitWitness<Obj, Arr>> => ({
  category: base,
  evaluate: (left, right) => {
    if (!Object.is(left, right)) {
      return [];
    }
    return unit.evaluate(left).map((value) => ({ object: left, value }));
  },
  valueKey: (_left, _right, witness) => unit.valueKey(witness.object, witness.value),
  objectKey: (object) => objectKeyFromCategory(base, object),
  actOnLeft: (arrow, _right, witness) => ({
    object: base.src(arrow),
    value: unit.actOn(arrow, witness.value),
  }),
  actOnRight: (_left, arrow, witness) => ({
    object: base.dst(arrow),
    value: unit.actOn(arrow, witness.value),
  }),
});

export const analyzePromonoidalKernel = <Obj, Arr>(
  kernel: PromonoidalKernel<Obj, Arr>,
): PromonoidalKernelDiagnostics<Obj, Arr> => {
  const { base, tensor, unit } = kernel;
  const leftRightDiagnostics = computeFiniteCoend(tensor.bifunctor).diagnostics;
  const outputDiagnostics = computeFiniteCoend(outputWitnessInput(base, tensor.profunctor)).diagnostics;
  const unitCoendDiagnostics = computeFiniteCoend(unit.bifunctor).diagnostics;
  const unitEndDiagnostics = computeFiniteEnd(unit.bifunctor).diagnostics;
  return {
    tensor: {
      leftRight: leftRightDiagnostics,
      output: outputDiagnostics,
    },
    unit: {
      coend: unitCoendDiagnostics,
      end: unitEndDiagnostics,
    },
  };
};

const enumeratePairs = <Obj>(values: ReadonlyArray<Obj>): ReadonlyArray<ObjPair<Obj, Obj>> => {
  const pairs: Array<ObjPair<Obj, Obj>> = [];
  for (const left of values) {
    for (const right of values) {
      pairs.push([left, right]);
    }
  }
  return pairs;
};

const finiteProductCategory = <Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
): FiniteCategory<ObjPair<Obj, Obj>, ArrPair<Obj, Obj, Arr, Arr>> => {
  const product = ProductCat(base, base);
  const objects = enumeratePairs(base.objects);
  const arrows: Array<ArrPair<Obj, Obj, Arr, Arr>> = [];
  for (const cf of base.arrows) {
    for (const dg of base.arrows) {
      arrows.push({
        src: [base.src(cf), base.src(dg)],
        dst: [base.dst(cf), base.dst(dg)],
        cf,
        dg,
      });
    }
  }
  return {
    ...product,
    objects,
    arrows,
    eq: (x, y) => base.eq(x.cf, y.cf) && base.eq(x.dg, y.dg),
  };
};

export const tensorFunctorFromData = <Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  tensorOnObjects: (left: Obj, right: Obj) => Obj,
  tensorOnArrows: (left: Arr, right: Arr) => Arr,
): {
  readonly category: FiniteCategory<ObjPair<Obj, Obj>, ArrPair<Obj, Obj, Arr, Arr>>;
  readonly functor: FiniteFunctor<ObjPair<Obj, Obj>, ArrPair<Obj, Obj, Arr, Arr>, Obj, Arr>;
} => {
  const category = finiteProductCategory(base);
  const functor: FiniteFunctor<ObjPair<Obj, Obj>, ArrPair<Obj, Obj, Arr, Arr>, Obj, Arr> = {
    onObjects: ([left, right]) => tensorOnObjects(left, right),
    onArrows: (arrow) => tensorOnArrows(arrow.cf, arrow.dg),
  };
  return { category, functor };
};

export const identityFiniteFunctor = <Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
): FiniteFunctor<Obj, Arr, Obj, Arr> => ({
  onObjects: (object) => object,
  onArrows: (arrow) => arrow,
});

const objectKeyFromCategory = <Obj, Arr>(base: FiniteCategory<Obj, Arr>, object: Obj): string => {
  const index = base.objects.findIndex((candidate) => Object.is(candidate, object));
  if (index >= 0) {
    return `obj#${index}`;
  }
  return String(object);
};

const stringKeyFromArrow = <Obj, Arr>(base: FiniteCategory<Obj, Arr>, arrow: Arr): string => {
  const index = base.arrows.findIndex((candidate) => base.eq(candidate, arrow));
  if (index >= 0) {
    return `arr#${index}`;
  }
  return String(arrow);
};

export interface StrictMonoidalStructure<Obj, Arr> {
  readonly category: FiniteCategory<Obj, Arr>;
  readonly tensorObject: (left: Obj, right: Obj) => Obj;
  readonly tensorArrow: (left: Arr, right: Arr) => Arr;
  readonly unitObject: Obj;
  readonly associator?: (
    left: Obj,
    middle: Obj,
    right: Obj,
  ) => { readonly forward: Arr; readonly backward: Arr };
  readonly leftUnitor?: (object: Obj) => { readonly forward: Arr; readonly backward: Arr };
  readonly rightUnitor?: (object: Obj) => { readonly forward: Arr; readonly backward: Arr };
}

const makePromonoidalTensor = <Obj, Arr>(
  data: StrictMonoidalStructure<Obj, Arr>,
): PromonoidalTensor<Obj, Arr> => ({
  evaluate: (left, right, output) => {
    const domain = data.tensorObject(left, right);
    return data.category.arrows
      .filter((arrow) => Object.is(data.category.src(arrow), domain) && Object.is(data.category.dst(arrow), output))
      .map((arrow) => ({ arrow, domain, codomain: output }));
  },
  valueKey: (left, right, output, value) =>
    `${String(left)}⊗${String(right)}→${String(output)}::${stringKeyFromArrow(data.category, value.arrow)}`,
  actOnLeft: (arrow, right, output, value) => {
    const rightId = data.category.id(right);
    const transported = data.tensorArrow(arrow, rightId);
    return {
      arrow: data.category.compose(value.arrow, transported),
      domain: data.tensorObject(data.category.src(arrow), right),
      codomain: output,
    };
  },
  actOnRight: (left, arrow, output, value) => {
    const leftId = data.category.id(left);
    const transported = data.tensorArrow(leftId, arrow);
    return {
      arrow: data.category.compose(value.arrow, transported),
      domain: data.tensorObject(left, data.category.dst(arrow)),
      codomain: output,
    };
  },
  actOnOutput: (left, right, arrow, value) => ({
    arrow: data.category.compose(arrow, value.arrow),
    domain: data.tensorObject(left, right),
    codomain: data.category.dst(arrow),
  }),
});

const makePromonoidalUnit = <Obj, Arr>(
  data: StrictMonoidalStructure<Obj, Arr>,
): PromonoidalUnit<Obj, Arr> => ({
  evaluate: (object) =>
    data.category.arrows
      .filter((arrow) => Object.is(data.category.src(arrow), data.unitObject) && Object.is(data.category.dst(arrow), object))
      .map((arrow) => ({ arrow, domain: data.unitObject, codomain: object })),
  valueKey: (object, value) => `${String(object)}∘${stringKeyFromArrow(data.category, value.arrow)}`,
  actOn: (arrow, value) => ({
    arrow: data.category.compose(arrow, value.arrow),
    domain: data.unitObject,
    codomain: data.category.dst(arrow),
  }),
});

export const promonoidalKernelFromStrictMonoidal = <Obj, Arr>(
  data: StrictMonoidalStructure<Obj, Arr>,
): PromonoidalKernel<Obj, Arr> => {
  const tensor = makePromonoidalTensor(data);
  const unit = makePromonoidalUnit(data);
  const tensorInput = tensorWitnessInput(data.category, tensor);
  const unitInput = unitWitnessInput(data.category, unit);
  const { functor: tensorFunctor } = tensorFunctorFromData(
    data.category,
    data.tensorObject,
    data.tensorArrow,
  );
  const identityFunctor = identityFiniteFunctor(data.category);
  let unitSection: PromonoidalKernel<Obj, Arr>["unit"] = {
    profunctor: unit,
    bifunctor: unitInput,
    functor: identityFunctor,
  };

  if (data.leftUnitor || data.rightUnitor) {
    const leftData = data.leftUnitor;
    const rightData = data.rightUnitor;
    unitSection = {
      ...unitSection,
      ...(leftData
        ? {
            leftUnitor: {
              forward: (object: Obj) => leftData(object).forward,
              backward: (object: Obj) => leftData(object).backward,
            },
          }
        : {}),
      ...(rightData
        ? {
            rightUnitor: {
              forward: (object: Obj) => rightData(object).forward,
              backward: (object: Obj) => rightData(object).backward,
            },
          }
        : {}),
    };
  }

  let tensorSection: PromonoidalKernel<Obj, Arr>["tensor"] = {
    profunctor: tensor,
    bifunctor: tensorInput,
    functor: tensorFunctor,
  };

  const associator = data.associator;
  if (associator) {
    tensorSection = {
      ...tensorSection,
      associator: {
        forward: (object: ObjTriple<Obj>) =>
          associator(object[0], object[1], object[2]).forward,
        backward: (object: ObjTriple<Obj>) =>
          associator(object[0], object[1], object[2]).backward,
      },
    };
  }

  return {
    base: data.category,
    tensor: tensorSection,
    unit: unitSection,
  };
};

export const makeTwoObjectPromonoidalKernel = (): PromonoidalKernel<
  TwoObject,
  TwoArrow
> => {
  const tensorObject = (left: TwoObject, right: TwoObject) =>
    left === "★" || right === "★" ? "★" : "•";
  const tensorArrow = (
    left: TwoArrow,
    right: TwoArrow,
  ): TwoArrow => {
    const src = tensorObject(TwoObjectCategory.src(left), TwoObjectCategory.src(right));
    const dst = tensorObject(TwoObjectCategory.dst(left), TwoObjectCategory.dst(right));
    if (Object.is(src, dst)) {
      return TwoObjectCategory.id(src);
    }
    if (src === "•" && dst === "★") {
      return nonIdentity;
    }
    throw new Error("two-object tensorArrow: unsupported combination");
  };

  const structure: StrictMonoidalStructure<TwoObject, TwoArrow> = {
    category: TwoObjectCategory,
    tensorObject,
    tensorArrow,
    unitObject: "•",
    associator: (left, middle, right) => ({
      forward: TwoObjectCategory.id(tensorObject(tensorObject(left, middle), right)),
      backward: TwoObjectCategory.id(tensorObject(left, tensorObject(middle, right))),
    }),
    leftUnitor: (object) => ({
      forward: TwoObjectCategory.id(tensorObject("•", object)),
      backward: TwoObjectCategory.id(object),
    }),
    rightUnitor: (object) => ({
      forward: TwoObjectCategory.id(tensorObject(object, "•")),
      backward: TwoObjectCategory.id(object),
    }),
  };

  return promonoidalKernelFromStrictMonoidal(structure);
};

