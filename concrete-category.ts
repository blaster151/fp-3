import { SetCat, type SetHom, type SetObj } from "./set-cat";
import { setSimpleCategory } from "./set-simple-category";
import type { SimpleCat } from "./simple-cat";
import type {
  Functor,
  FunctorCheckSamples,
  FunctorComposablePair,
  FunctorWithWitness,
} from "./functor";
import { constructFunctorWithWitness } from "./functor";
import {
  checkFaithfulFunctor,
  type FaithfulnessOptions,
  type FaithfulnessReport,
} from "./functor-equivalence";
import type { Preorder } from "./preorder-cat";
import type { PreordHom } from "./preord-cat";
import { PreordCat } from "./preord-cat";
import type { PointedSetHom, PointedSetObj } from "./pointed-set-cat";
import { PointedSet } from "./pointed-set-cat";
import type { Monoid } from "./monoid-cat";
import { MonCat, type MonoidHom } from "./mon-cat";

export interface ConcreteCategoryStructureDescriptor {
  readonly name: string;
  readonly forgottenStructure: ReadonlyArray<string>;
  readonly retainedStructure?: ReadonlyArray<string>;
  readonly notes?: ReadonlyArray<string>;
}

export interface ConcreteCategoryWitness<
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
> {
  readonly category: SimpleCat<SrcObj, SrcArr>;
  readonly forgetful: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly faithfulness: FaithfulnessReport<SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly descriptor: ConcreteCategoryStructureDescriptor;
  readonly metadata?: ReadonlyArray<string>;
}

export interface ConcreteCategoryOptions<
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
> {
  readonly faithfulness?: FaithfulnessOptions<SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly metadata?: ReadonlyArray<string>;
}

export const concretizeForgetfulFunctor = <
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
>(
  forgetful: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>,
  descriptor: ConcreteCategoryStructureDescriptor,
  options: ConcreteCategoryOptions<SrcObj, SrcArr, TgtObj, TgtArr> = {},
): ConcreteCategoryWitness<SrcObj, SrcArr, TgtObj, TgtArr> => {
  const faithfulness = checkFaithfulFunctor(
    forgetful,
    options.faithfulness ?? {},
  );
  const metadata = options.metadata;
  const base: ConcreteCategoryWitness<SrcObj, SrcArr, TgtObj, TgtArr> = metadata
    ? { category: forgetful.witness.source, forgetful, faithfulness, descriptor, metadata }
    : { category: forgetful.witness.source, forgetful, faithfulness, descriptor };
  return base;
};

export interface ConcreteObstructionReport<
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
> {
  readonly functor: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly faithfulness: FaithfulnessReport<SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly isFaithful: boolean;
  readonly details: ReadonlyArray<string>;
}

export const detectConcreteObstruction = <
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
>(
  functor: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>,
  options: FaithfulnessOptions<SrcObj, SrcArr, TgtObj, TgtArr> = {},
): ConcreteObstructionReport<SrcObj, SrcArr, TgtObj, TgtArr> => {
  const faithfulness = checkFaithfulFunctor(functor, options);
  const details = faithfulness.holds
    ? [
        "Underlying functor was faithful on the supplied samples; no obstruction witnessed.",
        ...faithfulness.details,
      ]
    : [
        "Faithfulness failed on the supplied samples, obstructing concreteness.",
        ...faithfulness.details,
      ];
  return { functor, faithfulness, isFaithful: faithfulness.holds, details };
};

const makeSetPairs = <Obj, Arr>(
  arrows: ReadonlyArray<Arr>,
  category: SimpleCat<Obj, Arr>,
): ReadonlyArray<FunctorComposablePair<Arr>> => {
  const pairs: FunctorComposablePair<Arr>[] = [];
  for (const g of arrows) {
    for (const f of arrows) {
      if (category.dst(f) === category.src(g)) {
        pairs.push({ f, g });
      }
    }
  }
  return pairs;
};

const makeSetSamples = (
  objects: ReadonlyArray<SetObj<unknown>>,
  arrows: ReadonlyArray<SetHom<unknown, unknown>>,
  category: SimpleCat<SetObj<unknown>, SetHom<unknown, unknown>>,
): FunctorCheckSamples<SetObj<unknown>, SetHom<unknown, unknown>> => ({
  objects,
  arrows,
  composablePairs: makeSetPairs(arrows, category),
});

const finiteSetObjects = [
  SetCat.obj(["0", "1"]) as SetObj<unknown>,
  SetCat.obj(["a", "b", "c"]) as SetObj<unknown>,
];

const finiteSetArrows: ReadonlyArray<SetHom<unknown, unknown>> = [
  SetCat.id(finiteSetObjects[0]!),
  SetCat.id(finiteSetObjects[1]!),
  SetCat.hom(
    finiteSetObjects[0]!,
    finiteSetObjects[1]!,
    (value: unknown) => (Object.is(value, "0") ? "a" : "b"),
  ) as SetHom<unknown, unknown>,
];

export const buildConcreteFinSetWitness = (): ConcreteCategoryWitness<
  SetObj<unknown>,
  SetHom<unknown, unknown>,
  SetObj<unknown>,
  SetHom<unknown, unknown>
> => {
  const functor: Functor<
    SetObj<unknown>,
    SetHom<unknown, unknown>,
    SetObj<unknown>,
    SetHom<unknown, unknown>
  > = {
    F0: (object) => object,
    F1: (arrow) => arrow,
  };
  const samples = makeSetSamples(
    finiteSetObjects,
    finiteSetArrows,
    setSimpleCategory,
  );
  const witness = constructFunctorWithWitness(
    setSimpleCategory,
    setSimpleCategory,
    functor,
    samples,
    [
      "Inclusion of FinSet into Set on a representative finite sample.",
      "Acts as identity on underlying sets and functions, modelling the forgetful functor.",
    ],
  );
  return concretizeForgetfulFunctor(witness, {
    name: "FinSet",
    forgottenStructure: ["finiteness constraint"],
    notes: [
      "Forgetful functor simply erases the finiteness witness; morphisms are unchanged.",
    ],
  });
};

export const concreteMonoidDescriptor: ConcreteCategoryStructureDescriptor = {
  name: "Mon",
  forgottenStructure: ["binary multiplication", "unit element"],
  notes: [
    "Under the forgetful functor, monoid homomorphisms become their underlying set maps.",
  ],
};

const booleanAndMonoid: Monoid<boolean> = {
  e: true,
  op: (left, right) => left && right,
  elements: [false, true],
};

const booleanOrMonoid: Monoid<boolean> = {
  e: false,
  op: (left, right) => left || right,
  elements: [false, true],
};

const monoidIdentity = (monoid: Monoid<boolean>): MonoidHom<boolean, boolean> =>
  MonCat.id(monoid);

const negationHom: MonoidHom<boolean, boolean> = MonCat.hom(
  booleanOrMonoid,
  booleanAndMonoid,
  (value: boolean) => !value,
);

const monoidObjects: ReadonlyArray<Monoid<boolean>> = [
  booleanAndMonoid,
  booleanOrMonoid,
];

const monoidArrows: ReadonlyArray<MonoidHom<boolean, boolean>> = [
  monoidIdentity(booleanAndMonoid),
  monoidIdentity(booleanOrMonoid),
  negationHom,
];

const monoidSimpleCategory: SimpleCat<Monoid<boolean>, MonoidHom<boolean, boolean>> = {
  id: (monoid) => MonCat.id(monoid),
  compose: MonCat.compose,
  src: (arrow) => arrow.dom,
  dst: (arrow) => arrow.cod,
};

const monoidSet = (monoid: Monoid<boolean>): SetObj<boolean> =>
  SetCat.obj((monoid.elements ?? []) as boolean[]);

const monoidHomToSet = (
  hom: MonoidHom<boolean, boolean>,
): SetHom<boolean, boolean> => SetCat.hom(monoidSet(hom.dom), monoidSet(hom.cod), hom.map);

const monoidSamples: FunctorCheckSamples<Monoid<boolean>, MonoidHom<boolean, boolean>> = {
  objects: monoidObjects,
  arrows: monoidArrows,
  composablePairs: makeSetPairs(monoidArrows, monoidSimpleCategory),
};

export const buildConcreteMonoidWitness = (): ConcreteCategoryWitness<
  Monoid<boolean>,
  MonoidHom<boolean, boolean>,
  SetObj<boolean>,
  SetHom<boolean, boolean>
> => {
  const functor: Functor<
    Monoid<boolean>,
    MonoidHom<boolean, boolean>,
    SetObj<boolean>,
    SetHom<boolean, boolean>
  > = {
    F0: monoidSet,
    F1: monoidHomToSet,
  };
  const witness = constructFunctorWithWitness(
    monoidSimpleCategory,
    setSimpleCategory as SimpleCat<SetObj<boolean>, SetHom<boolean, boolean>>,
    functor,
    monoidSamples,
    ["Forgetful functor on a pair of boolean monoids."],
  );
  return concretizeForgetfulFunctor(witness, concreteMonoidDescriptor);
};

export const buildConcreteGroupDescriptor = (): ConcreteCategoryStructureDescriptor => ({
  name: "Grp",
  forgottenStructure: ["group multiplication", "identity", "inverse"],
  notes: [
    "Faithfulness witnesses that distinct homomorphisms remain distinct as Set functions.",
  ],
});

interface FiniteGroup {
  readonly name: string;
  readonly elements: ReadonlyArray<string>;
  readonly multiply: (left: string, right: string) => string;
  readonly identity: string;
  readonly inverse: (value: string) => string;
}

interface GroupHom {
  readonly dom: FiniteGroup;
  readonly cod: FiniteGroup;
  readonly map: (value: string) => string;
}

const Z2: FiniteGroup = {
  name: "Z₂",
  elements: ["0", "1"],
  identity: "0",
  multiply: (left, right) => (left === right ? "0" : "1"),
  inverse: (value) => value,
};

const Z3: FiniteGroup = {
  name: "Z₃",
  elements: ["0", "1", "2"],
  identity: "0",
  multiply: (left, right) => ((Number(left) + Number(right)) % 3).toString(),
  inverse: (value) => ((3 - Number(value)) % 3).toString(),
};

const groupIdentity = (group: FiniteGroup): GroupHom => ({
  dom: group,
  cod: group,
  map: (value) => value,
});

const moduloCollapse: GroupHom = {
  dom: Z3,
  cod: Z2,
  map: (value) => (value === "0" ? "0" : "1"),
};

const groupCategory: SimpleCat<FiniteGroup, GroupHom> = {
  id: (object) => groupIdentity(object),
  compose: (g, f) => {
    if (f.cod !== g.dom) {
      throw new Error("Group homomorphisms must compose with matching codomain/domain.");
    }
    return {
      dom: f.dom,
      cod: g.cod,
      map: (value: string) => g.map(f.map(value)),
    };
  },
  src: (arrow) => arrow.dom,
  dst: (arrow) => arrow.cod,
};

const groupSet = (group: FiniteGroup): SetObj<string> => SetCat.obj(group.elements);

const groupHomToSet = (hom: GroupHom): SetHom<string, string> =>
  SetCat.hom(groupSet(hom.dom), groupSet(hom.cod), hom.map);

const groupSamples: FunctorCheckSamples<FiniteGroup, GroupHom> = {
  objects: [Z2, Z3],
  arrows: [groupIdentity(Z2), groupIdentity(Z3), moduloCollapse],
  composablePairs: [{ f: moduloCollapse, g: groupIdentity(Z2) }],
};

export const buildConcreteGroupWitness = (): ConcreteCategoryWitness<
  FiniteGroup,
  GroupHom,
  SetObj<string>,
  SetHom<string, string>
> => {
  const functor: Functor<FiniteGroup, GroupHom, SetObj<string>, SetHom<string, string>> = {
    F0: groupSet,
    F1: groupHomToSet,
  };
  const witness = constructFunctorWithWitness(
    groupCategory,
    setSimpleCategory as SimpleCat<SetObj<string>, SetHom<string, string>>,
    functor,
    groupSamples,
    ["Forgetful functor on a small catalogue of finite groups."],
  );
  return concretizeForgetfulFunctor(witness, buildConcreteGroupDescriptor());
};

interface FiniteRing {
  readonly name: string;
  readonly elements: ReadonlyArray<number>;
  readonly add: (left: number, right: number) => number;
  readonly mul: (left: number, right: number) => number;
  readonly neg: (value: number) => number;
  readonly zero: number;
  readonly one: number;
}

interface RingHom {
  readonly dom: FiniteRing;
  readonly cod: FiniteRing;
  readonly map: (value: number) => number;
}

const makeModRing = (modulus: number): FiniteRing => ({
  name: `Z_${modulus}`,
  elements: Array.from({ length: modulus }, (_, idx) => idx),
  zero: 0,
  one: 1 % modulus,
  add: (left, right) => (left + right) % modulus,
  mul: (left, right) => (left * right) % modulus,
  neg: (value) => (modulus - value) % modulus,
});

const Z2Ring = makeModRing(2);
const Z4Ring = makeModRing(4);

const ringIdentity = (ring: FiniteRing): RingHom => ({
  dom: ring,
  cod: ring,
  map: (value) => value,
});

const mod4ToMod2: RingHom = {
  dom: Z4Ring,
  cod: Z2Ring,
  map: (value) => value % 2,
};

const ringCategory: SimpleCat<FiniteRing, RingHom> = {
  id: ringIdentity,
  compose: (g, f) => {
    if (f.cod !== g.dom) {
      throw new Error("Ring homomorphisms must compose with matching codomain/domain.");
    }
    return {
      dom: f.dom,
      cod: g.cod,
      map: (value: number) => g.map(f.map(value)),
    };
  },
  src: (arrow) => arrow.dom,
  dst: (arrow) => arrow.cod,
};

const ringSet = (ring: FiniteRing): SetObj<number> => SetCat.obj(ring.elements);

const ringHomToSet = (hom: RingHom): SetHom<number, number> =>
  SetCat.hom(ringSet(hom.dom), ringSet(hom.cod), hom.map);

const ringSamples: FunctorCheckSamples<FiniteRing, RingHom> = {
  objects: [Z2Ring, Z4Ring],
  arrows: [ringIdentity(Z2Ring), ringIdentity(Z4Ring), mod4ToMod2],
  composablePairs: [{ f: mod4ToMod2, g: ringIdentity(Z2Ring) }],
};

export const buildConcreteRingWitness = (): ConcreteCategoryWitness<
  FiniteRing,
  RingHom,
  SetObj<number>,
  SetHom<number, number>
> => {
  const functor: Functor<FiniteRing, RingHom, SetObj<number>, SetHom<number, number>> = {
    F0: ringSet,
    F1: ringHomToSet,
  };
  const witness = constructFunctorWithWitness(
    ringCategory,
    setSimpleCategory as SimpleCat<SetObj<number>, SetHom<number, number>>,
    functor,
    ringSamples,
    ["Forgetful functor from a toy ring category to Set."],
  );
  return concretizeForgetfulFunctor(witness, {
    name: "Ring",
    forgottenStructure: [
      "additive structure",
      "multiplicative structure",
      "negation",
    ],
    notes: ["Finite mod-n rings with their standard homomorphisms."],
  });
};

const preorderObjects: ReadonlyArray<Preorder<number>> = [
  { elems: [0, 1], le: (x, y) => x <= y },
  { elems: [0, 1, 2], le: (x, y) => x <= y },
];

const preorderHomCategory = PreordCat;

const preorderArrows: ReadonlyArray<PreordHom<number, number>> = [
  preorderHomCategory.hom(
    preorderObjects[0]!,
    preorderObjects[0]!,
    (value: number) => value,
  ),
  preorderHomCategory.hom(
    preorderObjects[1]!,
    preorderObjects[1]!,
    (value: number) => value,
  ),
  preorderHomCategory.hom(
    preorderObjects[0]!,
    preorderObjects[1]!,
    (value: number) => value,
  ),
];

const preorderSimpleCategory: SimpleCat<
  Preorder<number>,
  PreordHom<number, number>
> = {
  id: (object) => preorderHomCategory.id(object),
  compose: preorderHomCategory.compose,
  src: (arrow) => arrow.dom,
  dst: (arrow) => arrow.cod,
};

const preorderSet = (preorder: Preorder<number>): SetObj<number> =>
  SetCat.obj(preorder.elems);

const preorderHomToSet = (
  hom: PreordHom<number, number>,
): SetHom<number, number> => SetCat.hom(preorderSet(hom.dom), preorderSet(hom.cod), hom.map);

const preorderSamples: FunctorCheckSamples<
  Preorder<number>,
  PreordHom<number, number>
> = {
  objects: preorderObjects,
  arrows: preorderArrows,
  composablePairs: makeSetPairs(preorderArrows, preorderSimpleCategory),
};

export const buildConcretePreorderWitness = (): ConcreteCategoryWitness<
  Preorder<number>,
  PreordHom<number, number>,
  SetObj<number>,
  SetHom<number, number>
> => {
  const functor: Functor<
    Preorder<number>,
    PreordHom<number, number>,
    SetObj<number>,
    SetHom<number, number>
  > = {
    F0: preorderSet,
    F1: preorderHomToSet,
  };
  const witness = constructFunctorWithWitness(
    preorderSimpleCategory,
    setSimpleCategory as SimpleCat<SetObj<number>, SetHom<number, number>>,
    functor,
    preorderSamples,
    ["Forgetful functor from Preord to Set on a finite sample."],
  );
  return concretizeForgetfulFunctor(witness, {
    name: "Preord",
    forgottenStructure: ["comparison relation"],
    notes: ["Morphisms are monotone maps; faithfulness checks ensure distinct monotone maps remain distinct."],
  });
};

const pointedObjects: ReadonlyArray<PointedSetObj<string>> = [
  PointedSet.create({ label: "P", elems: ["*", "x"], basepoint: "*" }),
  PointedSet.create({ label: "Q", elems: ["•", "a", "b"], basepoint: "•" }),
];

const pointedArrows: ReadonlyArray<PointedSetHom<string, string>> = [
  PointedSet.id(pointedObjects[0]!),
  PointedSet.id(pointedObjects[1]!),
  PointedSet.hom(pointedObjects[0]!, pointedObjects[1]!, (value) =>
    value === "*" ? "•" : "a",
  ),
];

const pointedSimpleCategory: SimpleCat<
  PointedSetObj<string>,
  PointedSetHom<string, string>
> = {
  id: PointedSet.id,
  compose: PointedSet.compose,
  src: (arrow) => arrow.dom,
  dst: (arrow) => arrow.cod,
};

const pointedSet = (object: PointedSetObj<string>): SetObj<string> =>
  SetCat.obj(object.elems);

const pointedHomToSet = (
  arrow: PointedSetHom<string, string>,
): SetHom<string, string> => SetCat.hom(pointedSet(arrow.dom), pointedSet(arrow.cod), arrow.map);

const pointedSamples: FunctorCheckSamples<
  PointedSetObj<string>,
  PointedSetHom<string, string>
> = {
  objects: pointedObjects,
  arrows: pointedArrows,
  composablePairs: makeSetPairs(pointedArrows, pointedSimpleCategory),
};

export const buildConcretePointedSetWitness = (): ConcreteCategoryWitness<
  PointedSetObj<string>,
  PointedSetHom<string, string>,
  SetObj<string>,
  SetHom<string, string>
> => {
  const functor: Functor<
    PointedSetObj<string>,
    PointedSetHom<string, string>,
    SetObj<string>,
    SetHom<string, string>
  > = {
    F0: pointedSet,
    F1: pointedHomToSet,
  };
  const witness = constructFunctorWithWitness(
    pointedSimpleCategory,
    setSimpleCategory as SimpleCat<SetObj<string>, SetHom<string, string>>,
    functor,
    pointedSamples,
    ["Underlying-set functor on pointed sets."],
  );
  return concretizeForgetfulFunctor(witness, {
    name: "PointedSet",
    forgottenStructure: ["distinguished basepoint"],
    notes: [
      "Faithfulness notes when two basepoint-preserving maps collapse to the same Set map.",
    ],
  });
};

interface SubsetObject {
  readonly label: string;
  readonly carrier: SetObj<string>;
  readonly distinguished: SetObj<string>;
}

interface SubsetHom {
  readonly dom: SubsetObject;
  readonly cod: SubsetObject;
  readonly map: (value: string) => string;
}

const subsetObjects: ReadonlyArray<SubsetObject> = [
  {
    label: "(A, S)",
    carrier: SetCat.obj(["s", "t", "u"]),
    distinguished: SetCat.obj(["s", "t"]),
  },
  {
    label: "(B, T)",
    carrier: SetCat.obj(["x", "y", "z"]),
    distinguished: SetCat.obj(["x"]),
  },
];

const subsetHomomorphisms: ReadonlyArray<SubsetHom> = [
  {
    dom: subsetObjects[0]!,
    cod: subsetObjects[1]!,
    map: (value) => (value === "s" ? "x" : "z"),
  },
  {
    dom: subsetObjects[0]!,
    cod: subsetObjects[0]!,
    map: (value) => value,
  },
];

const subsetSimpleCategory: SimpleCat<SubsetObject, SubsetHom> = {
  id: (object) => ({ dom: object, cod: object, map: (value) => value }),
  compose: (g, f) => {
    if (f.cod !== g.dom) {
      throw new Error("Subset morphisms require matching carriers for composition.");
    }
    return { dom: f.dom, cod: g.cod, map: (value: string) => g.map(f.map(value)) };
  },
  src: (arrow) => arrow.dom,
  dst: (arrow) => arrow.cod,
};

const subsetHomToSet = (hom: SubsetHom): SetHom<string, string> =>
  SetCat.hom(hom.dom.carrier, hom.cod.carrier, hom.map);

const subsetSamples: FunctorCheckSamples<SubsetObject, SubsetHom> = {
  objects: subsetObjects,
  arrows: [subsetHomomorphisms[0]!, subsetHomomorphisms[1]!],
  composablePairs: makeSetPairs([
    subsetHomomorphisms[0]!,
    subsetHomomorphisms[1]!,
    subsetSimpleCategory.id(subsetObjects[1]!),
  ], subsetSimpleCategory),
};

export const buildExoticSubsetConcreteWitness = (): ConcreteCategoryWitness<
  SubsetObject,
  SubsetHom,
  SetObj<string>,
  SetHom<string, string>
> => {
  const functor: Functor<SubsetObject, SubsetHom, SetObj<string>, SetHom<string, string>> = {
    F0: (object) => object.carrier,
    F1: subsetHomToSet,
  };
  const witness = constructFunctorWithWitness(
    subsetSimpleCategory,
    setSimpleCategory as SimpleCat<SetObj<string>, SetHom<string, string>>,
    functor,
    subsetSamples,
    [
      "Forgetful functor from sets-with-subset to the underlying carrier set.",
      "Faithfulness is tautological because arrows are determined entirely by their Set action.",
    ],
  );
  return concretizeForgetfulFunctor(witness, {
    name: "Set↘Subset",
    forgottenStructure: ["distinguished subset"],
    notes: [
      "Highlights that some faithful forgetful functors discard structure that is only bookkeeping.",
    ],
  });
};

export const concreteCategoryCatalogue = (): ReadonlyArray<ConcreteCategoryWitness<any, any, any, any>> => [
  buildConcreteFinSetWitness(),
  buildConcreteMonoidWitness(),
  buildConcreteGroupWitness(),
  buildConcreteRingWitness(),
  buildConcretePreorderWitness(),
  buildConcretePointedSetWitness(),
  buildExoticSubsetConcreteWitness(),
];
