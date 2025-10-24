import type { FiniteCategory } from "./finite-cat";
import type { IsoWitness } from "./kinds/iso";
import { isoWitness as findIsoWitness } from "./kinds/iso";
import type { SimpleCat } from "./simple-cat";
import type { CategoryPropertyCheck } from "./functor-property-types";

interface FiniteLikeCategory<Obj, Arr> extends SimpleCat<Obj, Arr> {
  readonly arrows?: ReadonlyArray<Arr>;
  readonly eq?: (left: Arr, right: Arr) => boolean;
}

const asFiniteCategory = <Obj, Arr>(
  category: SimpleCat<Obj, Arr>,
): FiniteCategory<Obj, Arr> | null => {
  const candidate = category as FiniteLikeCategory<Obj, Arr> &
    Partial<FiniteCategory<Obj, Arr>>;
  if (Array.isArray(candidate.arrows) && typeof candidate.eq === "function") {
    return candidate as FiniteCategory<Obj, Arr>;
  }
  return null;
};

const arrowLabel = <Obj, Arr>(
  category: SimpleCat<Obj, Arr>,
  arrow: Arr,
): string => {
  const name = (arrow as { readonly name?: unknown }).name;
  const tag = typeof name === "string" ? name : String(arrow);
  return `${tag}:${String(category.src(arrow))}→${String(category.dst(arrow))}`;
};

export const describeArrow = arrowLabel;

export const checkIsomorphism = <Obj, Arr>(
  category: SimpleCat<Obj, Arr>,
  arrow: Arr,
): CategoryPropertyCheck<IsoWitness<Arr>> => {
  const finite = asFiniteCategory(category);
  if (!finite) {
    return {
      holds: false,
      details:
        "Isomorphism checks require enumerating arrows and an equality predicate; provide a FiniteCategory witness to enable detection.",
    };
  }
  const witness = findIsoWitness(finite, arrow);
  if (!witness) {
    return {
      holds: false,
      details: `${arrowLabel(category, arrow)} is not invertible among the enumerated arrows.`,
    };
  }
  return {
    holds: true,
    witness,
    details: `Recovered inverse for ${arrowLabel(category, arrow)} via finite search.`,
  };
};

export interface IsomorphismCheckers<
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
> {
  readonly source?: (
    category: SimpleCat<SrcObj, SrcArr>,
    arrow: SrcArr,
  ) => CategoryPropertyCheck<IsoWitness<SrcArr>>;
  readonly target?: (
    category: SimpleCat<TgtObj, TgtArr>,
    arrow: TgtArr,
  ) => CategoryPropertyCheck<IsoWitness<TgtArr>>;
}

