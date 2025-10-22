import { CategoryLimits } from "./stdlib/category-limits";
import {
  SetCat,
  SetFalseArrow,
  SetNegation,
  SetOmega,
  SetTruthAnd,
  SetTruthArrow,
  SetTruthImplication,
  SetTruthOr,
  SetTruthProduct,
  ensureSubsetMonomorphism,
  setCharacteristicOfSubset,
  setSubsetFromCharacteristic,
  semanticsAwareEquals,
  semanticsAwareHas,
  type ExponentialArrow,
  type SetHom,
  type SetObj,
} from "./set-cat";
import { SetPullbacks, equalSetHom } from "./set-pullbacks";

export type AnySetObj = SetObj<unknown>;
export type AnySetHom = SetHom<unknown, unknown>;

const terminalData = SetCat.terminal();
const initialData = SetCat.initial();

const truthProductWitness: CategoryLimits.TruthProductWitness<AnySetObj, AnySetHom> = {
  obj: SetTruthProduct.obj as AnySetObj,
  projections: [
    SetTruthProduct.projections[0] as AnySetHom,
    SetTruthProduct.projections[1] as AnySetHom,
  ] as const,
  pair: (_domain, left, right) =>
    SetTruthProduct.pair(
      left as SetHom<unknown, boolean>,
      right as SetHom<unknown, boolean>,
    ) as AnySetHom,
};

const makeBinaryProductWithPair = (
  left: AnySetObj,
  right: AnySetObj,
): CategoryLimits.BinaryProductWithPairWitness<AnySetObj, AnySetHom> & {
  readonly lookup: (left: unknown, right: unknown) => readonly [unknown, unknown];
} => {
  const product = SetCat.product(left as SetObj<unknown>, right as SetObj<unknown>);
  return {
    obj: product.object as AnySetObj,
    projections: [
      product.projections.fst as AnySetHom,
      product.projections.snd as AnySetHom,
    ] as const,
    pair: (domain, leftLeg, rightLeg) =>
      product.pair(
        leftLeg as SetHom<unknown, unknown>,
        rightLeg as SetHom<unknown, unknown>,
      ) as AnySetHom,
    lookup: product.lookup ?? ((a, b) => [a, b] as const),
  };
};

const ensureSubsetEquality = (
  subset: AnySetObj,
  superset: AnySetObj,
  context: string,
): void => {
  const supersetHas = semanticsAwareHas(superset as SetObj<unknown>);
  for (const element of subset) {
    if (!supersetHas(element)) {
      throw new Error(
        `${context}: element ${String(element)} must belong to the target subset when constructing the comparison iso.`,
      );
    }
  }
};

const makeSubsetIso = (
  relation: AnySetHom,
  canonical: AnySetHom,
  context: string,
): CategoryLimits.SubobjectClassifierIsoWitness<AnySetHom> => {
  ensureSubsetMonomorphism(relation as SetHom<unknown, unknown>, `${context}: relation`);
  ensureSubsetMonomorphism(canonical as SetHom<unknown, unknown>, `${context}: canonical`);

  ensureSubsetEquality(relation.dom, canonical.dom, `${context}: relation → canonical`);
  ensureSubsetEquality(canonical.dom, relation.dom, `${context}: canonical → relation`);

  const forward = SetCat.hom(
    relation.dom as SetObj<unknown>,
    canonical.dom as SetObj<unknown>,
    (value) => value,
  );
  const backward = SetCat.hom(
    canonical.dom as SetObj<unknown>,
    relation.dom as SetObj<unknown>,
    (value) => value,
  );

  return { forward: forward as AnySetHom, backward: backward as AnySetHom };
};

const makeEqualizer = (left: AnySetHom, right: AnySetHom): { obj: AnySetObj; equalize: AnySetHom } => {
  if (left.dom !== right.dom || left.cod !== right.cod) {
    throw new Error(
      "Set subobject-classifier: equalizer expects parallel arrows with shared domain and codomain.",
    );
  }

  const codEquals = semanticsAwareEquals(left.cod as SetObj<unknown>);

  const subset: unknown[] = [];
  for (const value of left.dom) {
    const leftImage = left.map(value);
    const rightImage = right.map(value);
    if (codEquals(leftImage, rightImage)) {
      subset.push(value);
    }
  }

  const subsetSemantics = SetCat.createSubsetSemantics(left.dom as SetObj<unknown>, subset, {
    tag: "SetSubobjectClassifier.equalizer",
  });
  const equalizerObj = SetCat.obj(subset, {
    semantics: subsetSemantics,
  });
  const inclusion = SetCat.hom(equalizerObj, left.dom as SetObj<unknown>, (value) => value);

  return { obj: equalizerObj as AnySetObj, equalize: inclusion as AnySetHom };
};

const { powerObject: _setCatPowerObject, ...setCatWithoutPowerObject } = SetCat as typeof SetCat & {
  powerObject: unknown;
};

const baseSetSubobjectClassifier = {
  ...setCatWithoutPowerObject,
  terminate: terminalData.terminate,
  initialArrow: (codomain: AnySetObj) =>
    initialData.initialize(codomain as SetObj<unknown>) as unknown as AnySetHom,
  terminalObj: terminalData.object as AnySetObj,
  initialObj: initialData.object as AnySetObj,
  truthValues: SetOmega as AnySetObj,
  truthArrow: SetTruthArrow as AnySetHom,
  falseArrow: SetFalseArrow as AnySetHom,
  negation: SetNegation as AnySetHom,
  truthProduct: truthProductWitness,
  truthAnd: SetTruthAnd as AnySetHom,
  characteristic: setCharacteristicOfSubset as (monomorphism: AnySetHom) => AnySetHom,
  subobjectFromCharacteristic: (characteristic: AnySetHom) => {
    const result = setSubsetFromCharacteristic(characteristic as SetHom<unknown, boolean>);
    return { subobject: result.subset as AnySetObj, inclusion: result.inclusion as AnySetHom };
  },
  equalMor: equalSetHom,
  equalizer: (left: AnySetHom, right: AnySetHom) => makeEqualizer(left, right),
};

export const ensureSetMonomorphism = ensureSubsetMonomorphism;

const cartesianClosedSetClassifier = {
  ...baseSetSubobjectClassifier,
  terminal: {
    obj: terminalData.object as AnySetObj,
    terminate: (object: AnySetObj) => terminalData.terminate(object as SetObj<unknown>) as AnySetHom,
  },
  binaryProduct: (left: AnySetObj, right: AnySetObj) => {
    const product = makeBinaryProductWithPair(left, right);
    return {
      obj: product.obj,
      proj1: product.projections[0],
      proj2: product.projections[1],
      pair: (domain: AnySetObj, leftLeg: AnySetHom, rightLeg: AnySetHom) =>
        product.pair(domain, leftLeg, rightLeg),
    };
  },
  exponential: (base: AnySetObj, codomain: AnySetObj) => {
    const data = SetCat.exponential(base as SetObj<unknown>, codomain as SetObj<unknown>);
    return {
      obj: data.object as AnySetObj,
      evaluation: data.evaluation as AnySetHom,
      product: {
        obj: data.evaluationProduct.object as AnySetObj,
        proj1: data.evaluationProduct.projections.fst as AnySetHom,
        proj2: data.evaluationProduct.projections.snd as AnySetHom,
        pair: (domain: AnySetObj, leftLeg: AnySetHom, rightLeg: AnySetHom) =>
          data.evaluationProduct.pair(
            leftLeg as SetHom<unknown, ExponentialArrow<unknown, unknown>>,
            rightLeg as SetHom<unknown, unknown>,
          ) as AnySetHom,
      },
      curry: (domain: AnySetObj, morphism: AnySetHom) =>
        data.curry({
          domain: domain as SetObj<unknown>,
          morphism: morphism as SetHom<readonly [unknown, unknown], unknown>,
        }) as AnySetHom,
      uncurry: (domain: AnySetObj, mediator: AnySetHom) =>
        data.uncurry({
          morphism: mediator as SetHom<unknown, ExponentialArrow<unknown, unknown>>,
        }) as AnySetHom,
    };
  },
};

const binaryCoproductMetadata = new WeakMap<AnySetObj, { left: AnySetObj; right: AnySetObj }>();

const setCoproductsWithCotuple: CategoryLimits.HasCoproductMediators<AnySetObj, AnySetHom> = {
  coproduct(objects) {
    if (objects.length === 0) {
      return { obj: initialData.object as AnySetObj, injections: [] };
    }

    if (objects.length === 1) {
      const [only] = objects;
      if (!only) {
        throw new Error("Set coproducts: singleton coproduct must provide an object.");
      }
      return {
        obj: only,
        injections: [SetCat.id(only as SetObj<unknown>) as AnySetHom],
      };
    }

    if (objects.length !== 2) {
      throw new Error(
        `Set coproducts: expected a binary coproduct request, received ${objects.length} summands.`,
      );
    }

    const [left, right] = objects;
    const data = SetCat.coproduct(left as SetObj<unknown>, right as SetObj<unknown>);
    binaryCoproductMetadata.set(data.object as AnySetObj, { left, right });
    return {
      obj: data.object as AnySetObj,
      injections: [data.injections.inl as AnySetHom, data.injections.inr as AnySetHom],
    };
  },
  cotuple(coproduct, legs, codomain) {
    if (legs.length !== 2) {
      throw new Error(
        `Set coproducts: expected two legs when mediating from a binary coproduct, received ${legs.length}.`,
      );
    }

    const metadata = binaryCoproductMetadata.get(coproduct);
    if (!metadata) {
      throw new Error(
        "Set coproducts: unknown coproduct carrier; use the coproduct builder from this module.",
      );
    }

    const [leftLeg, rightLeg] = legs as readonly [AnySetHom, AnySetHom];
    if (leftLeg.dom !== metadata.left || rightLeg.dom !== metadata.right) {
      throw new Error(
        "Set coproducts: cotuple legs must originate from the coproduct summands returned by the builder.",
      );
    }

    if (leftLeg.cod !== codomain || rightLeg.cod !== codomain) {
      throw new Error("Set coproducts: cotuple legs must land in the declared codomain.");
    }

    return SetCat.hom(coproduct as SetObj<unknown>, codomain as SetObj<unknown>, (entry) => {
      if (typeof entry !== "object" || entry === null || !("tag" in entry)) {
        throw new Error("Set coproducts: encountered an element outside the canonical tagged union.");
      }

      const tagged = entry as { readonly tag: "inl" | "inr"; readonly value: unknown };
      if (tagged.tag === "inl") {
        return leftLeg.map(tagged.value);
      }
      if (tagged.tag === "inr") {
        return rightLeg.map(tagged.value);
      }
      throw new Error(`Set coproducts: unrecognised coproduct tag ${String(tagged.tag)}.`);
    }) as AnySetHom;
  },
};

export const SetCartesianClosed = cartesianClosedSetClassifier as CategoryLimits.CartesianClosedCategory<
  AnySetObj,
  AnySetHom
>;

export const SetCoproductsWithCotuple = setCoproductsWithCotuple;

export const SetPowerObject = CategoryLimits.makePowerObjectFromSubobjectClassifier<AnySetObj, AnySetHom>({
  category: cartesianClosedSetClassifier,
  pullbacks: SetPullbacks,
  binaryProduct: (left, right) => makeBinaryProductWithPair(left, right),
  ensureMonomorphism: (arrow, context) =>
    ensureSubsetMonomorphism(arrow as SetHom<unknown, unknown>, context),
  makeIso: (relation, canonical, context) =>
    makeSubsetIso(relation as AnySetHom, canonical as AnySetHom, context),
  equalMor: equalSetHom,
});

export const SetSubobjectClassifier: CategoryLimits.SubobjectClassifierCategory<AnySetObj, AnySetHom> = {
  ...baseSetSubobjectClassifier,
  powerObject: (anchor: AnySetObj) => SetPowerObject(anchor),
};

