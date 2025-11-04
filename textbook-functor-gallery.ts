import { SetCat, type SetHom, type SetObj } from "./set-cat";
import type { FiniteCategory } from "./finite-cat";
import type { Functor, FunctorCheckSamples, FunctorWithWitness } from "./functor";
import { constructFunctorWithWitness } from "./functor";
import {
  checkEssentialInjectivityOnObjects,
  checkFaithfulFunctor,
  checkFullFunctor,
  essentialInjectiveFromFullyFaithful,
  isEssentiallySurjective,
  type EssentialInjectivityReport,
  type EssentialInjectivityFromFullFaithfulnessOptions,
  type FaithfulnessReport,
  type FullnessWitness,
  type EssentialSurjectivityReport,
} from "./functor-equivalence";
import type { SimpleCat } from "./simple-cat";
import type { SmallCategory } from "./subcategory";
import { makeFullSubcategory } from "./subcategory";
import { PointedSet, type PointedSetHom, type PointedSetObj } from "./pointed-set-cat";
import { FinGrpCat, FinGrp, type FinGrpCategory, type FinGrpObj, type Hom as FinGrpHom } from "./models/fingroup-cat";
import { MonCat, type MonoidHom } from "./mon-cat";
import type { Monoid } from "./monoid-cat";

export interface GalleryPropertyReports<SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly faithfulness: FaithfulnessReport<SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly fullness: FullnessWitness<SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly essentialInjectivity: EssentialInjectivityReport<SrcObj, TgtObj, TgtArr>;
  readonly derivedEssentialInjectivity: EssentialInjectivityReport<SrcObj, TgtObj, TgtArr>;
  readonly essentialSurjectivity: EssentialSurjectivityReport<SrcObj, SrcArr, TgtObj, TgtArr>;
}

export interface GalleryEntry<SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly name: string;
  readonly functor: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly reports: GalleryPropertyReports<SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly metadata?: ReadonlyArray<string>;
}

const evaluateProperties = <SrcObj, SrcArr, TgtObj, TgtArr>(
  functor: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>,
  options: {
    readonly faithfulnessSamples?: Parameters<typeof checkFaithfulFunctor<SrcObj, SrcArr, TgtObj, TgtArr>>[1];
    readonly fullnessSamples?: Parameters<typeof checkFullFunctor<SrcObj, SrcArr, TgtObj, TgtArr>>[1];
    readonly essentialInjectivitySamples?: Parameters<
      typeof checkEssentialInjectivityOnObjects<SrcObj, SrcArr, TgtObj, TgtArr>
    >[1];
    readonly essentialSurjectivitySamples?: Parameters<typeof isEssentiallySurjective<SrcObj, SrcArr, TgtObj, TgtArr>>[1];
  } = {},
): GalleryPropertyReports<SrcObj, SrcArr, TgtObj, TgtArr> => {
  const faithfulness = checkFaithfulFunctor(functor, options.faithfulnessSamples ?? {});
  const fullness = checkFullFunctor(functor, options.fullnessSamples ?? {});
  const essentialInjectivity = checkEssentialInjectivityOnObjects(
    functor,
    options.essentialInjectivitySamples ?? {},
  );
  const derivedOptions: EssentialInjectivityFromFullFaithfulnessOptions<
    SrcObj,
    SrcArr,
    TgtObj,
    TgtArr
  > = {
    ...(options.essentialInjectivitySamples?.objectPairs
      ? { objectPairs: options.essentialInjectivitySamples.objectPairs }
      : {}),
    ...(options.essentialInjectivitySamples?.targetIsoSearch
      ? { targetIsoSearch: options.essentialInjectivitySamples.targetIsoSearch }
      : {}),
  };
  const derivedEssentialInjectivity = essentialInjectiveFromFullyFaithful(
    functor,
    { faithfulness, fullness },
    derivedOptions,
  );
  const essentialSurjectivity = isEssentiallySurjective(
    functor,
    options.essentialSurjectivitySamples ?? {},
  );

  return {
    faithfulness,
    fullness,
    essentialInjectivity,
    derivedEssentialInjectivity,
    essentialSurjectivity,
  };
};

const collectComposablePairs = <Obj, Arr>(
  arrows: ReadonlyArray<Arr>,
  category: SimpleCat<Obj, Arr>,
): ReadonlyArray<Readonly<{ readonly f: Arr; readonly g: Arr }>> => {
  const pairs: Array<{ readonly f: Arr; readonly g: Arr }> = [];
  for (const g of arrows) {
    for (const f of arrows) {
      if (category.dst(f) === category.src(g)) {
        pairs.push({ f, g });
      }
    }
  }
  return pairs;
};

const setEq = <A>(left: SetHom<A, A>, right: SetHom<A, A>): boolean => {
  if (!Object.is(left.dom, right.dom) || !Object.is(left.cod, right.cod)) {
    return false;
  }
  for (const value of left.dom) {
    if (!Object.is(left.map(value), right.map(value))) {
      return false;
    }
  }
  return true;
};

const makeSetCategory = (
  objects: ReadonlyArray<SetObj<string>>,
  extraArrows: ReadonlyArray<SetHom<string, string>>,
): FiniteCategory<SetObj<string>, SetHom<string, string>> => {
  const arrows: SetHom<string, string>[] = [];
  for (const object of objects) {
    arrows.push(SetCat.id(object));
  }
  arrows.push(...extraArrows);
  return {
    objects,
    arrows,
    id: (object) => SetCat.id(object),
    compose: (g, f) => SetCat.compose(g, f),
    src: (arrow) => arrow.dom,
    dst: (arrow) => arrow.cod,
    eq: (left, right) => setEq(left as SetHom<string, string>, right as SetHom<string, string>),
  };
};

const collectSetGenerators = (
  category: FiniteCategory<SetObj<string>, SetHom<string, string>>,
): FunctorCheckSamples<SetObj<string>, SetHom<string, string>> => ({
  objects: category.objects,
  arrows: category.arrows,
  composablePairs: collectComposablePairs(category.arrows, category),
});

const makeMonoid = <A>(
  name: string,
  elements: ReadonlyArray<A>,
  op: (left: A, right: A) => A,
  identity: A,
): Monoid<A> & { readonly name: string } => ({
  name,
  e: identity,
  op,
  elements,
});

const booleanAndMonoid = makeMonoid("Bool∧", [false, true], (left, right) => left && right, true);
const booleanOrMonoid = makeMonoid("Bool∨", [false, true], (left, right) => left || right, false);

const monoidCategory: FiniteCategory<Monoid<boolean>, MonoidHom<boolean, boolean>> = {
  objects: [booleanAndMonoid, booleanOrMonoid],
  arrows: [
    MonCat.id(booleanAndMonoid),
    MonCat.id(booleanOrMonoid),
    MonCat.hom(booleanOrMonoid, booleanAndMonoid, (value) => !value),
  ],
  id: (monoid) => MonCat.id(monoid),
  compose: (g, f) => MonCat.compose(g, f),
  src: (arrow) => arrow.dom,
  dst: (arrow) => arrow.cod,
  eq: (left, right) => {
    if (!Object.is(left.dom, right.dom) || !Object.is(left.cod, right.cod)) {
      return false;
    }
    const elements = left.dom.elements;
    if (!elements) {
      return Object.is(left.map, right.map);
    }
    for (const element of elements) {
      if (!Object.is(left.map(element), right.map(element))) {
        return false;
      }
    }
    return true;
  },
};

const monoidSamples: FunctorCheckSamples<Monoid<boolean>, MonoidHom<boolean, boolean>> = {
  objects: monoidCategory.objects,
  arrows: monoidCategory.arrows,
  composablePairs: collectComposablePairs(monoidCategory.arrows, monoidCategory),
};

const buildForgetfulMonoidFunctor = (
  setCategory: FiniteCategory<SetObj<string>, SetHom<string, string>>,
): FunctorWithWitness<Monoid<boolean>, MonoidHom<boolean, boolean>, SetObj<string>, SetHom<string, string>> => {
  const encodeBoolean = (value: boolean): string => (value ? "true" : "false");
  const decodeBoolean = (label: string): boolean => label === "true";
  // Cache created Set objects so repeated calls for the same monoid return
  // the same `SetObj` instance. This ensures that composed images of
  // arrows live in the same carrier instances and `SetCat.compose`
  // does not report domain/codomain mismatches.
  const setCache = new Map<Monoid<boolean>, SetObj<string>>();
  const getSetForMonoid = (m: Monoid<boolean> | undefined, elements?: ReadonlyArray<boolean>): SetObj<string> => {
    if (!m) {
      return SetCat.obj((elements ?? []).map(encodeBoolean));
    }
    const existing = setCache.get(m);
    if (existing) return existing;
    const created = SetCat.obj((elements ?? m.elements ?? []).map(encodeBoolean));
    setCache.set(m, created);
    return created;
  };

  const functor: Functor<Monoid<boolean>, MonoidHom<boolean, boolean>, SetObj<string>, SetHom<string, string>> = {
    F0: (monoid) => getSetForMonoid(monoid, monoid.elements),
    F1: (arrow) => {
      const dom = getSetForMonoid(arrow.dom, arrow.dom.elements);
      const cod = getSetForMonoid(arrow.cod, arrow.cod.elements);
      return SetCat.hom(dom, cod, (label) => encodeBoolean(arrow.map(decodeBoolean(label))));
    },
  };
  return constructFunctorWithWitness(
    monoidCategory,
    setCategory,
    functor,
    monoidSamples,
    [
      "Forgetful functor Mon→Set on the Boolean-and/Boolean-or example.",
      "Samples include identity and negation homomorphisms to witness faithfulness.",
    ],
  );
};

const z2: FinGrpObj = {
  name: "Z₂",
  elems: ["0", "1"],
  e: "0",
  mul: (left, right) => ((Number(left) + Number(right)) % 2).toString(),
  inv: (value) => value,
};

const z3: FinGrpObj = {
  name: "Z₃",
  elems: ["0", "1", "2"],
  e: "0",
  mul: (left, right) => ((Number(left) + Number(right)) % 3).toString(),
  inv: (value) => ((3 - Number(value)) % 3).toString(),
};

const z4: FinGrpObj = {
  name: "Z₄",
  elems: ["0", "1", "2", "3"],
  e: "0",
  mul: (left, right) => ((Number(left) + Number(right)) % 4).toString(),
  inv: (value) => ((4 - Number(value)) % 4).toString(),
};

const toBitPair = (value: string): readonly [string, string] => {
  const digits = value.split("");
  if (digits.length !== 2) {
    throw new Error(`Expected a pair of bits, received ${value}`);
  }
  return [digits[0]!, digits[1]!];
};

const v4: FinGrpObj = {
  name: "V₄",
  elems: ["00", "01", "10", "11"],
  e: "00",
  mul: (left, right) => {
    const [la, lb] = toBitPair(left);
    const [ra, rb] = toBitPair(right);
    const first = ((Number(la) + Number(ra)) % 2).toString();
    const second = ((Number(lb) + Number(rb)) % 2).toString();
    return `${first}${second}`;
  },
  inv: (value) => value,
};

type Permutation = readonly [number, number, number];

const composePermutation = (first: Permutation, second: Permutation): Permutation => [
  first[second[0]]!,
  first[second[1]]!,
  first[second[2]]!,
];

const inversePermutation = (perm: Permutation): Permutation => {
  const output: number[] = [];
  for (let index = 0; index < perm.length; index += 1) {
    output[perm[index]!] = index;
  }
  return [output[0]!, output[1]!, output[2]!] as Permutation;
};

const permutations: ReadonlyArray<{ readonly name: string; readonly value: Permutation }> = [
  { name: "e", value: [0, 1, 2] },
  { name: "(12)", value: [1, 0, 2] },
  { name: "(23)", value: [0, 2, 1] },
  { name: "(13)", value: [2, 1, 0] },
  { name: "(123)", value: [1, 2, 0] },
  { name: "(132)", value: [2, 0, 1] },
];

const permutationByName = new Map(permutations.map((entry) => [entry.name, entry.value] as const));

const composeNamedPermutations = (first: string, second: string): string => {
  const a = permutationByName.get(first);
  const b = permutationByName.get(second);
  if (!a || !b) {
    throw new Error(`S₃: unknown permutation ${first} or ${second}`);
  }
  const composed = composePermutation(a, b);
  for (const candidate of permutations) {
    if (
      candidate.value[0] === composed[0] &&
      candidate.value[1] === composed[1] &&
      candidate.value[2] === composed[2]
    ) {
      return candidate.name;
    }
  }
  throw new Error("S₃: composition left the permutation list");
};

const inverseNamedPermutation = (name: string): string => {
  const value = permutationByName.get(name);
  if (!value) {
    throw new Error(`S₃: unknown permutation ${name}`);
  }
  const inverse = inversePermutation(value);
  for (const candidate of permutations) {
    if (
      candidate.value[0] === inverse[0] &&
      candidate.value[1] === inverse[1] &&
      candidate.value[2] === inverse[2]
    ) {
      return candidate.name;
    }
  }
  throw new Error("S₃: inverse left the permutation list");
};

const s3: FinGrpObj = {
  name: "S₃",
  elems: permutations.map((entry) => entry.name),
  e: "e",
  mul: composeNamedPermutations,
  inv: inverseNamedPermutation,
};

const finGrpCategory: FinGrpCategory = FinGrpCat([z2, z3, s3, z4, v4]);

const includeArrow = (arrow: FinGrpHom): void => {
  (finGrpCategory.arrows as FinGrpHom[]).push(arrow);
};

const identityZ2: FinGrpHom = { name: "id_Z₂", dom: "Z₂", cod: "Z₂", map: (value) => value };
const identityZ3: FinGrpHom = { name: "id_Z₃", dom: "Z₃", cod: "Z₃", map: (value) => value };
const identityS3: FinGrpHom = { name: "id_S₃", dom: "S₃", cod: "S₃", map: (value) => value };
const identityZ4: FinGrpHom = { name: "id_Z₄", dom: "Z₄", cod: "Z₄", map: (value) => value };
const identityV4: FinGrpHom = { name: "id_V₄", dom: "V₄", cod: "V₄", map: (value) => value };

includeArrow(identityZ2);
includeArrow(identityZ3);
includeArrow(identityS3);
includeArrow(identityZ4);
includeArrow(identityV4);

const trivialToZ2: FinGrpHom = FinGrp.initialArrow(z2);
const trivialToZ3: FinGrpHom = FinGrp.initialArrow(z3);

includeArrow(trivialToZ2);
includeArrow(trivialToZ3);

const z2ToZ3: FinGrpHom = {
  name: "inclZ₂→Z₃",
  dom: "Z₂",
  cod: "Z₃",
  // map both elements of Z₂ to the identity in Z₃ to form a valid group homomorphism
  map: () => "0",
};

if (!FinGrp.isHom(z2, z3, z2ToZ3)) {
  throw new Error("Expected Z₂→Z₃ to be a group homomorphism");
}

includeArrow(z2ToZ3);

const z3ToZ2Trivial: FinGrpHom = {
  name: "trivialZ₃→Z₂",
  dom: "Z₃",
  cod: "Z₂",
  map: () => "0",
};

includeArrow(z3ToZ2Trivial);

const abelianObjects = new Set(["Z₂", "Z₃"]);
abelianObjects.add("Z₄");
abelianObjects.add("V₄");

const abelianSubcategory: SmallCategory<string, FinGrpHom> = makeFullSubcategory(
  {
    objects: new Set(finGrpCategory.objects),
    arrows: new Set(finGrpCategory.arrows),
    id: finGrpCategory.id,
    compose: finGrpCategory.compose,
    src: finGrpCategory.src,
    dst: finGrpCategory.dst,
  },
  abelianObjects,
);

const makeGroupSet = (group: FinGrpObj): SetObj<string> => SetCat.obj(group.elems);

const z2Set = makeGroupSet(z2);
const z3Set = makeGroupSet(z3);
const s3Set = makeGroupSet(s3);
const z4Set = makeGroupSet(z4);
const v4Set = makeGroupSet(v4);
const extraTwoSet = SetCat.obj(["a", "b"]);

const flipZ2: SetHom<string, string> = SetCat.hom(z2Set, z2Set, (value) => (value === "0" ? "1" : "0"));
const collapseZ3: SetHom<string, string> = SetCat.hom(z3Set, z2Set, (value) => (value === "0" ? "0" : "1"));
const nonHomZ2ToZ2: SetHom<string, string> = SetCat.hom(z2Set, z2Set, (value) =>
  value === "0" ? "1" : "1",
);
const z4ToV4: SetHom<string, string> = SetCat.hom(z4Set, v4Set, (value) => {
  switch (value) {
    case "0":
      return "00";
    case "1":
      return "01";
    case "2":
      return "10";
    default:
      return "11";
  }
});
const v4ToZ4: SetHom<string, string> = SetCat.hom(v4Set, z4Set, (value) => {
  switch (value) {
    case "00":
      return "0";
    case "01":
      return "1";
    case "10":
      return "2";
    default:
      return "3";
  }
});
const thinTargetArrows = [flipZ2, collapseZ3, nonHomZ2ToZ2, z4ToV4, v4ToZ4];

const setCategory = makeSetCategory([z2Set, z3Set, s3Set, z4Set, v4Set, extraTwoSet], thinTargetArrows);
const setSamples = collectSetGenerators(setCategory);

const groupToSetFunctor = (): FunctorWithWitness<string, FinGrpHom, SetObj<string>, SetHom<string, string>> => {
  // Cache created Set objects so repeated calls for the same group name
  // return the same `SetObj` instance. This ensures that composed images
  // of arrows live in the same carrier instances and `SetCat.compose`
  // does not report domain/codomain mismatches.
  const setCache = new Map<string, SetObj<string>>();
  const getSetForGroup = (name: string): SetObj<string> => {
    const existing = setCache.get(name);
    if (existing) return existing;
    const group = finGrpCategory.lookup(name);
    const created = makeGroupSet(group);
    setCache.set(name, created);
    return created;
  };

  const functor: Functor<string, FinGrpHom, SetObj<string>, SetHom<string, string>> = {
    F0: (name) => getSetForGroup(name),
    F1: (arrow) => {
      const dom = getSetForGroup(arrow.dom);
      const cod = getSetForGroup(arrow.cod);
      return SetCat.hom(dom, cod, arrow.map);
    },
  };
  const samples: FunctorCheckSamples<string, FinGrpHom> = {
    objects: ["Z₂", "Z₃", "S₃"],
    arrows: finGrpCategory.arrows,
    composablePairs: collectComposablePairs(finGrpCategory.arrows, finGrpCategory),
  };
  return constructFunctorWithWitness(
    finGrpCategory,
    setCategory,
    functor,
    samples,
    [
      "Forgetful functor Grp→Set on {Z₂, Z₃, S₃}.",
      "Samples include trivial and inclusion homomorphisms to trigger property diagnostics.",
    ],
  );
};

const abelianInclusionFunctor = (): FunctorWithWitness<string, FinGrpHom, string, FinGrpHom> => {
  const functor: Functor<string, FinGrpHom, string, FinGrpHom> = {
    F0: (object) => object,
    F1: (arrow) => arrow,
  };
  const samples: FunctorCheckSamples<string, FinGrpHom> = {
    objects: Array.from(abelianSubcategory.objects),
    arrows: Array.from(abelianSubcategory.arrows),
    composablePairs: collectComposablePairs(Array.from(abelianSubcategory.arrows), finGrpCategory),
  };
  return constructFunctorWithWitness(
    {
      id: (object) => finGrpCategory.id(object),
      compose: (g, f) => finGrpCategory.compose(g, f),
      src: (arrow) => finGrpCategory.src(arrow),
      dst: (arrow) => finGrpCategory.dst(arrow),
    },
    finGrpCategory,
    functor,
    samples,
    [
      "Inclusion of the abelian finite groups {Z₂, Z₃} into the ambient {Z₂, Z₃, S₃} catalogue.",
      "Acts as identity on objects and arrows inside the abelian subcategory.",
    ],
  );
};

const pointedObjectP = PointedSet.create({ label: "P", elems: ["*", "x", "y"], basepoint: "*" });
const pointedObjectQ = PointedSet.create({ label: "Q", elems: ["•", "a"], basepoint: "•" });
const pointedObjectR = PointedSet.create({ label: "R", elems: ["r"], basepoint: "r" });

const pointedObjects: ReadonlyArray<PointedSetObj<string>> = [
  pointedObjectP,
  pointedObjectQ,
  pointedObjectR,
];

const thinObjects: ReadonlyArray<PointedSetObj<string>> = [pointedObjectP, pointedObjectQ];

const idPointed = (obj: PointedSetObj<string>): PointedSetHom<string, string> => PointedSet.id(obj);

const pointedHom = (
  dom: PointedSetObj<string>,
  cod: PointedSetObj<string>,
  map: (value: string) => string,
): PointedSetHom<string, string> => {
  const arrow: PointedSetHom<string, string> = { dom, cod, map };
  if (!PointedSet.isHom(arrow)) {
    throw new Error("PointedSet hom is not basepoint preserving");
  }
  return arrow;
};

const collapseToBasepoint = pointedHom(pointedObjectP, pointedObjectQ, () => "•");
const swapNonBasepoints = pointedHom(pointedObjectP, pointedObjectQ, (value) =>
  value === "*" ? "•" : value === "x" ? "a" : "a",
);

const pointedCategory: FiniteCategory<PointedSetObj<string>, PointedSetHom<string, string>> = {
  objects: pointedObjects,
  arrows: [
    idPointed(pointedObjectP),
    idPointed(pointedObjectQ),
    idPointed(pointedObjectR),
    collapseToBasepoint,
    swapNonBasepoints,
  ],
  id: idPointed,
  compose: PointedSet.compose,
  src: (arrow) => arrow.dom,
  dst: (arrow) => arrow.cod,
  eq: (left, right) => {
    if (!Object.is(left.dom, right.dom) || !Object.is(left.cod, right.cod)) {
      return false;
    }
    return left.dom.elems.every((value) => Object.is(left.map(value), right.map(value)));
  },
};

const thinCategory: FiniteCategory<PointedSetObj<string>, PointedSetHom<string, string>> = {
  objects: thinObjects,
  arrows: [
    idPointed(pointedObjectP),
    idPointed(pointedObjectQ),
    pointedHom(pointedObjectP, pointedObjectQ, () => "•"),
    pointedHom(pointedObjectQ, pointedObjectQ, () => "•"),
  ],
  id: idPointed,
  compose: PointedSet.compose,
  src: (arrow) => arrow.dom,
  dst: (arrow) => arrow.cod,
  eq: (left, right) => {
    if (!Object.is(left.dom, right.dom) || !Object.is(left.cod, right.cod)) {
      return false;
    }
    return left.dom.elems.every((value) => Object.is(left.map(value), right.map(value)));
  },
};

const pointedSamples: FunctorCheckSamples<PointedSetObj<string>, PointedSetHom<string, string>> = {
  objects: pointedCategory.objects,
  arrows: pointedCategory.arrows,
  composablePairs: collectComposablePairs(pointedCategory.arrows, pointedCategory),
};

const thinSamples: FunctorCheckSamples<PointedSetObj<string>, PointedSetHom<string, string>> = {
  objects: thinCategory.objects,
  arrows: thinCategory.arrows,
  composablePairs: collectComposablePairs(thinCategory.arrows, thinCategory),
};

const thinningFunctor = (): FunctorWithWitness<
  PointedSetObj<string>,
  PointedSetHom<string, string>,
  PointedSetObj<string>,
  PointedSetHom<string, string>
> => {
  const idP = thinCategory.arrows[0]!;
  const idQ = thinCategory.arrows[1]!;
  const pToQ = thinCategory.arrows[2]!;
  const functor: Functor<
    PointedSetObj<string>,
    PointedSetHom<string, string>,
    PointedSetObj<string>,
    PointedSetHom<string, string>
  > = {
    F0: (object) => {
      if (object === pointedObjectR) {
        return pointedObjectQ;
      }
      return object;
    },
    F1: (arrow) => {
      if (arrow.dom === pointedObjectP && arrow.cod === pointedObjectP) {
        return idP;
      }
      if (arrow.dom === pointedObjectQ && arrow.cod === pointedObjectQ) {
        return idQ;
      }
      if (arrow.dom === pointedObjectR && arrow.cod === pointedObjectR) {
        return idQ;
      }
      if (arrow.dom === pointedObjectP && arrow.cod === pointedObjectQ) {
        return pToQ;
      }
      return pToQ;
    },
  };
  return constructFunctorWithWitness(
    pointedCategory,
    thinCategory,
    functor,
    pointedSamples,
    [
      "Thinning functor collapsing multiple basepoint-preserving maps to a single mediator.",
      "Witnesses non-faithfulness by mapping distinct arrows with the same endpoints to the unique thin arrow.",
    ],
  );
};

const thinInclusionFunctor = (): FunctorWithWitness<
  PointedSetObj<string>,
  PointedSetHom<string, string>,
  PointedSetObj<string>,
  PointedSetHom<string, string>
> => {
  const functor: Functor<
    PointedSetObj<string>,
    PointedSetHom<string, string>,
    PointedSetObj<string>,
    PointedSetHom<string, string>
  > = {
    F0: (object) => object,
    F1: (arrow) => arrow,
  };
  return constructFunctorWithWitness(
    thinCategory,
    pointedCategory,
    functor,
    thinSamples,
    [
      "Inclusion of the thin pointed-set subcategory back into the richer category.",
      "Faithful and full but misses the extra automorphism present in the ambient category.",
    ],
  );
};

const collapseTerminal = PointedSet.create<string>({
  label: "𝟙⋆",
  elems: ["⋆"],
  basepoint: "⋆",
  eq: Object.is,
});
const collapseShadow = PointedSet.create<string>({
  label: "𝟙◦",
  elems: ["⋆"],
  basepoint: "⋆",
  eq: Object.is,
});

const collapseCategory: FiniteCategory<PointedSetObj<string>, PointedSetHom<string, string>> = {
  objects: [collapseTerminal, collapseShadow],
  arrows: [
    PointedSet.id(collapseTerminal),
    PointedSet.id(collapseShadow),
    PointedSet.hom(collapseTerminal, collapseShadow, () => collapseShadow.basepoint),
  ],
  id: (object) => PointedSet.id(object),
  compose: PointedSet.compose,
  src: (arrow) => arrow.dom,
  dst: (arrow) => arrow.cod,
  eq: (left, right) => Object.is(left.cod, right.cod) && Object.is(left.dom, right.dom),
};

const collapseFunctor = (): FunctorWithWitness<
  PointedSetObj<string>,
  PointedSetHom<string, string>,
  PointedSetObj<string>,
  PointedSetHom<string, string>
> => {
  const terminal = collapseCategory.objects[0]!;
  const functor: Functor<
    PointedSetObj<string>,
    PointedSetHom<string, string>,
    PointedSetObj<string>,
    PointedSetHom<string, string>
  > = {
    F0: () => terminal,
    F1: () => collapseCategory.arrows[0]!,
  };
  const samples: FunctorCheckSamples<PointedSetObj<string>, PointedSetHom<string, string>> = {
    objects: pointedCategory.objects,
    arrows: pointedCategory.arrows,
    composablePairs: collectComposablePairs(pointedCategory.arrows, pointedCategory),
  };
  return constructFunctorWithWitness(
    pointedCategory,
    collapseCategory,
    functor,
    samples,
    [
      "Total collapse functor sending every pointed set to the singleton basepoint object.",
      "Witnesses extreme loss of information demanded by the Milestone 23 case studies.",
    ],
  );
};

const buildGallery = (): ReadonlyArray<GalleryEntry<any, any, any, any>> => {
  const groupFunctor = groupToSetFunctor();
  const abelianFunctor = abelianInclusionFunctor();
  const thinFunctor = thinningFunctor();
  const inclusionFunctor = thinInclusionFunctor();
  const collapse = collapseFunctor();

  const groupReports = evaluateProperties(groupFunctor, {
    essentialSurjectivitySamples: { targetObjects: setCategory.objects },
  });
  const abelianReports = evaluateProperties(abelianFunctor, {
    essentialSurjectivitySamples: { targetObjects: finGrpCategory.objects },
  });
  const thinReports = evaluateProperties(thinFunctor, {
    faithfulnessSamples: {
      sourceHom: (source, target) =>
        pointedCategory.arrows.filter(
          (arrow) => arrow.dom === source && arrow.cod === target,
        ),
    },
  });
  const inclusionReports = evaluateProperties(inclusionFunctor, {
    essentialSurjectivitySamples: { targetObjects: pointedCategory.objects },
  });
  const collapseReports = evaluateProperties(collapse, {
    faithfulnessSamples: {
      sourceHom: (source, target) =>
        pointedCategory.arrows.filter(
          (arrow) => arrow.dom === source && arrow.cod === target,
        ),
    },
    fullnessSamples: {
      targetHom: () => collapseCategory.arrows,
    },
    essentialSurjectivitySamples: { targetObjects: collapseCategory.objects },
  });

  const monoidFunctor = buildForgetfulMonoidFunctor(setCategory);
  const monoidReports = evaluateProperties(monoidFunctor, {
    essentialSurjectivitySamples: { targetObjects: setCategory.objects },
    faithfulnessSamples: {
      sourceHom: (source, target) =>
        monoidCategory.arrows.filter((arrow) => arrow.dom === source && arrow.cod === target),
    },
  });

  return [
    {
      name: "Mon → Set (forgetful)",
      functor: monoidFunctor,
      reports: monoidReports,
    },
    {
      name: "Grp → Set (forgetful)",
      functor: groupFunctor,
      reports: groupReports,
    },
    {
      name: "Ab ↪ Grp (inclusion)",
      functor: abelianFunctor,
      reports: abelianReports,
    },
    {
      name: "Pointed thinning",
      functor: thinFunctor,
      reports: thinReports,
    },
    {
      name: "Thin inclusion",
      functor: inclusionFunctor,
      reports: inclusionReports,
    },
    {
      name: "Total collapse",
      functor: collapse,
      reports: collapseReports,
    },
  ];
};

export const textbookFunctorGallery: ReadonlyArray<GalleryEntry<any, any, any, any>> = buildGallery();

