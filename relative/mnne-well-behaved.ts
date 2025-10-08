import type { FiniteCategory } from "../finite-cat";
import type { FiniteFunctor } from "./mnne-lax-monoidal";
import {
  TwoObjectCategory,
  nonIdentity as TwoNonIdentity,
  type TwoArrow,
  type TwoObject,
} from "../two-object-cat";

export interface MnneWellBehavedWitness<DomObj, DomArr, CodObj, CodArr> {
  readonly domain: FiniteCategory<DomObj, DomArr>;
  readonly codomain: FiniteCategory<CodObj, CodArr>;
  readonly inclusion: FiniteFunctor<DomObj, DomArr, CodObj, CodArr>;
  readonly objectEqualsDomain: (left: DomObj, right: DomObj) => boolean;
  readonly objectEqualsCodomain: (left: CodObj, right: CodObj) => boolean;
}

export interface MnneWellBehavedReport<DomObj, DomArr, CodObj, CodArr> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly checkedPairs: number;
  readonly witness: MnneWellBehavedWitness<DomObj, DomArr, CodObj, CodArr>;
}

export const analyzeMnneWellBehavedInclusion = <DomObj, DomArr, CodObj, CodArr>(
  witness: MnneWellBehavedWitness<DomObj, DomArr, CodObj, CodArr>,
): MnneWellBehavedReport<DomObj, DomArr, CodObj, CodArr> => {
  const issues: string[] = [];
  const { domain, codomain, inclusion, objectEqualsDomain, objectEqualsCodomain } = witness;

  let checkedPairs = 0;

  for (const source of domain.objects) {
    for (const target of domain.objects) {
      checkedPairs += 1;
      const domainHom = domain.arrows.filter(
        (arrow) =>
          objectEqualsDomain(domain.src(arrow), source) &&
          objectEqualsDomain(domain.dst(arrow), target),
      );

      const codSource = inclusion.onObjects(source);
      const codTarget = inclusion.onObjects(target);
      const codHom = codomain.arrows.filter(
        (arrow) =>
          objectEqualsCodomain(codomain.src(arrow), codSource) &&
          objectEqualsCodomain(codomain.dst(arrow), codTarget),
      );

      const images = domainHom.map((arrow) => inclusion.onArrows(arrow));

      let injective = true;
      for (let index = 0; index < domainHom.length && injective; index += 1) {
        for (let other = index + 1; other < domainHom.length; other += 1) {
          if (
            !domain.eq(domainHom[index]!, domainHom[other]!) &&
            codomain.eq(images[index]!, images[other]!)
          ) {
            injective = false;
            issues.push(
              `Inclusion is not injective on hom(${String(source)}, ${String(target)}).`,
            );
            break;
          }
        }
      }

      for (const codArrow of codHom) {
        if (!images.some((image) => codomain.eq(image, codArrow))) {
          issues.push(
            `Arrow ${String(codArrow)} in C(${String(codSource)}, ${String(codTarget)}) has no J-preimage.`,
          );
        }
      }
    }
  }

  const holds = issues.length === 0;
  return {
    holds,
    issues,
    details: holds
      ? `J is fully faithful on ${checkedPairs} hom-set(s).`
      : `Well-behaved witness encountered ${issues.length} issue(s) across ${checkedPairs} hom-set(s).`,
    checkedPairs,
    witness,
  };
};

export const describeIdentityWellBehavedWitness = (): MnneWellBehavedWitness<
  TwoObject,
  TwoArrow,
  TwoObject,
  TwoArrow
> => ({
  domain: TwoObjectCategory,
  codomain: TwoObjectCategory,
  inclusion: {
    onObjects: (object) => object,
    onArrows: (arrow) => arrow,
  },
  objectEqualsDomain: (left, right) => left === right,
  objectEqualsCodomain: (left, right) => left === right,
});

export const describeBrokenWellBehavedWitness = (): MnneWellBehavedWitness<
  TwoObject,
  TwoArrow,
  TwoObject,
  TwoArrow
> => ({
  ...describeIdentityWellBehavedWitness(),
  inclusion: {
    onObjects: (object) => object,
    onArrows: (arrow) =>
      TwoObjectCategory.eq(arrow, TwoNonIdentity)
        ? TwoObjectCategory.id("•")
        : arrow,
  },
});
