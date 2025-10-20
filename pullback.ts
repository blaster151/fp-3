import type { Category } from "./stdlib/category";
import { ArrowFamilies } from "./stdlib/arrow-families";
import { CategoryLimits } from "./stdlib/category-limits";
import type { FiniteCategory } from "./finite-cat";
import type { IsoWitness } from "./kinds/iso";
import type { FinSetMor, FinSetObj } from "./src/all/triangulated";
import { FinSet, FinSetTruthArrow, FinSetTruthValues } from "./src/all/triangulated";
import { finsetFactorThroughEqualizer } from "./finset-equalizers";

export interface PullbackData<Obj, Arr> {
  readonly apex: Obj;
  readonly toDomain: Arr;
  readonly toAnchor: Arr;
}

export interface PullbackComparison<Arr> {
  readonly leftToRight: Arr;
  readonly rightToLeft: Arr;
}

export interface PullbackConeFactorResult<Arr> {
  readonly factored: boolean;
  readonly mediator?: Arr;
  readonly reason?: string;
}

export interface PullbackCertification<Obj, Arr> {
  readonly valid: boolean;
  readonly reason?: string;
  readonly conesChecked: ReadonlyArray<PullbackData<Obj, Arr>>;
  readonly mediators?: ReadonlyArray<Arr>;
}

export interface PullbackCalculator<Obj, Arr> {
  pullback(f: Arr, h: Arr): PullbackData<Obj, Arr>;
  factorCone(target: PullbackData<Obj, Arr>, cone: PullbackData<Obj, Arr>): PullbackConeFactorResult<Arr>;
  certify(f: Arr, h: Arr, candidate: PullbackData<Obj, Arr>): PullbackCertification<Obj, Arr>;
  induce(j: Arr, pullbackOfF: PullbackData<Obj, Arr>, pullbackOfG: PullbackData<Obj, Arr>): Arr;
  comparison(
    f: Arr,
    h: Arr,
    left: PullbackData<Obj, Arr>,
    right: PullbackData<Obj, Arr>
  ): PullbackComparison<Arr>;
  transportPullback(
    f: Arr,
    h: Arr,
    source: PullbackData<Obj, Arr>,
    iso: IsoWitness<Arr>,
    candidate: PullbackData<Obj, Arr>,
  ): PullbackData<Obj, Arr>;
}

export interface PullbackFromEqualizerWitness<Obj, Arr> {
  readonly product: {
    readonly obj: Obj;
    readonly projections: readonly [Arr, Arr];
  };
  readonly parallelPair: readonly [Arr, Arr];
  readonly equalizer: { readonly obj: Obj; readonly equalize: Arr };
  readonly pullback: PullbackData<Obj, Arr>;
}

export const makePullbackFromProductsAndEqualizers = <Obj, Arr>(
  base: Category<Obj, Arr> &
    ArrowFamilies.HasDomCod<Obj, Arr> &
    CategoryLimits.HasFiniteProducts<Obj, Arr> &
    CategoryLimits.HasEqualizers<Obj, Arr>,
  f: Arr,
  h: Arr,
): PullbackFromEqualizerWitness<Obj, Arr> => {
  const codomainOfF = base.cod(f);
  const codomainOfH = base.cod(h);
  if (codomainOfF !== codomainOfH) {
    throw new Error("makePullbackFromProductsAndEqualizers: arrows must share a codomain.");
  }

  const domainSource = base.dom(f);
  const anchorSource = base.dom(h);
  const productWitness = base.product([domainSource, anchorSource]);
  if (productWitness.projections.length !== 2) {
    throw new Error("makePullbackFromProductsAndEqualizers: binary product must supply two projections.");
  }
  const [projectionToDomain, projectionToAnchor] = productWitness.projections as readonly [Arr, Arr];

  const leftParallel = base.compose(f, projectionToDomain);
  const rightParallel = base.compose(h, projectionToAnchor);
  const equalizerWitness = base.equalizer(leftParallel, rightParallel);

  const toDomain = base.compose(projectionToDomain, equalizerWitness.equalize);
  const toAnchor = base.compose(projectionToAnchor, equalizerWitness.equalize);

  return {
    product: { obj: productWitness.obj, projections: [projectionToDomain, projectionToAnchor] },
    parallelPair: [leftParallel, rightParallel],
    equalizer: equalizerWitness,
    pullback: { apex: equalizerWitness.obj, toDomain, toAnchor },
  };
};

export const factorPullbackCone = <Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  target: PullbackData<Obj, Arr>,
  cone: PullbackData<Obj, Arr>,
): PullbackConeFactorResult<Arr> => {
  if (base.src(target.toDomain) !== target.apex) {
    return {
      factored: false,
      reason: "factorPullbackCone: target domain leg must originate at its apex.",
    };
  }
  if (base.src(target.toAnchor) !== target.apex) {
    return {
      factored: false,
      reason: "factorPullbackCone: target anchor leg must originate at its apex.",
    };
  }
  if (base.src(cone.toDomain) !== cone.apex) {
    return {
      factored: false,
      reason: "factorPullbackCone: cone domain leg must originate at its apex.",
    };
  }
  if (base.src(cone.toAnchor) !== cone.apex) {
    return {
      factored: false,
      reason: "factorPullbackCone: cone anchor leg must originate at its apex.",
    };
  }

  const domainTarget = base.dst(target.toDomain);
  const anchorTarget = base.dst(target.toAnchor);
  if (base.dst(cone.toDomain) !== domainTarget) {
    return {
      factored: false,
      reason: "factorPullbackCone: cone domain leg must land in the pullback domain object.",
    };
  }
  if (base.dst(cone.toAnchor) !== anchorTarget) {
    return {
      factored: false,
      reason: "factorPullbackCone: cone anchor leg must land in the pullback anchor object.",
    };
  }

  let mediator: Arr | undefined;
  for (const arrow of base.arrows) {
    if (base.src(arrow) !== cone.apex || base.dst(arrow) !== target.apex) continue;
    const domainLeg = base.compose(target.toDomain, arrow);
    if (!base.eq(domainLeg, cone.toDomain)) continue;
    const anchorLeg = base.compose(target.toAnchor, arrow);
    if (!base.eq(anchorLeg, cone.toAnchor)) continue;
    if (mediator && !base.eq(mediator, arrow)) {
      return {
        factored: false,
        reason: "factorPullbackCone: multiple mediating arrows satisfy the pullback conditions.",
      };
    }
    mediator = mediator ?? arrow;
  }

  if (mediator === undefined) {
    return {
      factored: false,
      reason: "factorPullbackCone: no mediating arrow satisfies the pullback conditions.",
    };
  }

  return { factored: true, mediator };
};

export function makeFinitePullbackCalculator<Obj, Arr>(
  base: FiniteCategory<Obj, Arr>
): PullbackCalculator<Obj, Arr> {
  const enumerateCones = (f: Arr, h: Arr): PullbackData<Obj, Arr>[] => {
    const cones: PullbackData<Obj, Arr>[] = [];
    const domainSource = base.src(f);
    const anchorSource = base.src(h);

    const pushCone = (candidate: PullbackData<Obj, Arr>): void => {
      const exists = cones.some(
        (existing) =>
          existing.apex === candidate.apex &&
          base.eq(existing.toDomain, candidate.toDomain) &&
          base.eq(existing.toAnchor, candidate.toAnchor)
      );
      if (!exists) cones.push(candidate);
    };

    for (const apex of base.objects) {
      for (const toDomain of base.arrows) {
        if (base.src(toDomain) !== apex || base.dst(toDomain) !== domainSource) continue;
        for (const toAnchor of base.arrows) {
          if (base.src(toAnchor) !== apex || base.dst(toAnchor) !== anchorSource) continue;
          const left = base.compose(f, toDomain);
          const right = base.compose(h, toAnchor);
          if (base.eq(left, right)) {
            pushCone({ apex, toDomain, toAnchor });
          }
        }
      }
    }

    return cones;
  };

  const certifyInternal = (
    f: Arr,
    h: Arr,
    candidate: PullbackData<Obj, Arr>,
    cones: PullbackData<Obj, Arr>[]
  ): PullbackCertification<Obj, Arr> => {
    if (base.src(candidate.toDomain) !== candidate.apex) {
      return {
        valid: false,
        reason: "Pullback certification: domain leg must originate at the candidate apex.",
        conesChecked: cones,
      };
    }
    if (base.src(candidate.toAnchor) !== candidate.apex) {
      return {
        valid: false,
        reason: "Pullback certification: anchor leg must originate at the candidate apex.",
        conesChecked: cones,
      };
    }

    const domainSource = base.src(f);
    const anchorSource = base.src(h);
    if (base.dst(candidate.toDomain) !== domainSource) {
      return {
        valid: false,
        reason: "Pullback certification: domain leg must land in the domain source of f.",
        conesChecked: cones,
      };
    }
    if (base.dst(candidate.toAnchor) !== anchorSource) {
      return {
        valid: false,
        reason: "Pullback certification: anchor leg must land in the domain source of h.",
        conesChecked: cones,
      };
    }

    const viaDomain = base.compose(f, candidate.toDomain);
    const viaAnchor = base.compose(h, candidate.toAnchor);
    if (!base.eq(viaDomain, viaAnchor)) {
      return {
        valid: false,
        reason: "Pullback certification: candidate square does not commute with the span.",
        conesChecked: cones,
      };
    }

    const mediators: Arr[] = [];
    for (const cone of cones) {
      const result = factorPullbackCone(base, candidate, cone);
      if (!result.factored || result.mediator === undefined) {
        return {
          valid: false,
          reason:
            result.reason ??
            "Pullback certification: a cone does not factor uniquely through the candidate apex.",
          conesChecked: cones,
        };
      }
      mediators.push(result.mediator);
    }

    return { valid: true, conesChecked: cones, mediators };
  };

  const pullback = (f: Arr, h: Arr): PullbackData<Obj, Arr> => {
    const cones = enumerateCones(f, h);

    for (const candidate of cones) {
      const certification = certifyInternal(f, h, candidate, cones);
      if (certification.valid && certification.mediators !== undefined) {
        return candidate;
      }
    }

    throw new Error("No pullback found for the supplied arrows.");
  };

  const factorCone = (
    target: PullbackData<Obj, Arr>,
    cone: PullbackData<Obj, Arr>,
  ): PullbackConeFactorResult<Arr> => factorPullbackCone(base, target, cone);

  const certify = (
    f: Arr,
    h: Arr,
    candidate: PullbackData<Obj, Arr>
  ): PullbackCertification<Obj, Arr> => {
    const cones = enumerateCones(f, h);
    return certifyInternal(f, h, candidate, cones);
  };

  const induce = (
    j: Arr,
    pullbackOfF: PullbackData<Obj, Arr>,
    pullbackOfG: PullbackData<Obj, Arr>
  ): Arr => {
    const candidates = base.arrows.filter((arrow) => {
      if (base.src(arrow) !== pullbackOfF.apex || base.dst(arrow) !== pullbackOfG.apex) return false;
      const leftDomain = base.compose(pullbackOfG.toDomain, arrow);
      const rightDomain = base.compose(j, pullbackOfF.toDomain);
      if (!base.eq(leftDomain, rightDomain)) return false;
      const leftAnchor = base.compose(pullbackOfG.toAnchor, arrow);
      return base.eq(leftAnchor, pullbackOfF.toAnchor);
    });

    const mediators = candidates.filter((candidate, index) => {
      const firstIndex = candidates.findIndex((other) => base.eq(other, candidate));
      return firstIndex === index;
    });

    if (mediators.length === 0) {
      throw new Error("No mediating arrow satisfies the pullback conditions.");
    }
    if (mediators.length > 1) {
      throw new Error("Multiple mediating arrows satisfy the pullback conditions.");
    }
    const [mediator] = mediators;
    if (mediator === undefined) {
      throw new Error("Pullback induce: expected a unique mediator after filtering candidates.");
    }
    return mediator;
  };

  const comparison = (
    f: Arr,
    h: Arr,
    left: PullbackData<Obj, Arr>,
    right: PullbackData<Obj, Arr>
  ): PullbackComparison<Arr> => {
    const domainSource = base.src(f);
    const anchorSource = base.src(h);
    if (base.dst(f) !== base.dst(h)) {
      throw new Error("Pullback comparison: the supplied arrows do not share a codomain.");
    }

    const checkCone = (label: "left" | "right", cone: PullbackData<Obj, Arr>): void => {
      if (base.src(cone.toDomain) !== cone.apex) {
        throw new Error(`Pullback comparison: ${label} cone domain leg does not emanate from its apex.`);
      }
      if (base.src(cone.toAnchor) !== cone.apex) {
        throw new Error(`Pullback comparison: ${label} cone anchor leg does not emanate from its apex.`);
      }
      if (base.dst(cone.toDomain) !== domainSource) {
        throw new Error(`Pullback comparison: ${label} cone domain leg targets the wrong object.`);
      }
      if (base.dst(cone.toAnchor) !== anchorSource) {
        throw new Error(`Pullback comparison: ${label} cone anchor leg targets the wrong object.`);
      }
      const viaDomain = base.compose(f, cone.toDomain);
      const viaAnchor = base.compose(h, cone.toAnchor);
      if (!base.eq(viaDomain, viaAnchor)) {
        throw new Error(`Pullback comparison: ${label} cone does not commute with the span.`);
      }
    };

    checkCone("left", left);
    checkCone("right", right);

    const identityOnDomain = base.id(domainSource);
    const leftToRight = induce(identityOnDomain, left, right);
    const rightToLeft = induce(identityOnDomain, right, left);

    const leftFactoring = factorPullbackCone(base, right, left);
    if (!leftFactoring.factored || leftFactoring.mediator === undefined) {
      const reason = leftFactoring.reason
        ? `: ${leftFactoring.reason}`
        : ".";
      throw new Error(
        `Pullback comparison: left cone fails to factor uniquely through the right pullback${reason}`,
      );
    }
    if (!base.eq(leftFactoring.mediator, leftToRight)) {
      throw new Error(
        "Pullback comparison: induced mediator does not match the left-to-right factoring witness.",
      );
    }

    const rightFactoring = factorPullbackCone(base, left, right);
    if (!rightFactoring.factored || rightFactoring.mediator === undefined) {
      const reason = rightFactoring.reason
        ? `: ${rightFactoring.reason}`
        : ".";
      throw new Error(
        `Pullback comparison: right cone fails to factor uniquely through the left pullback${reason}`,
      );
    }
    if (!base.eq(rightFactoring.mediator, rightToLeft)) {
      throw new Error(
        "Pullback comparison: induced mediator does not match the right-to-left factoring witness.",
      );
    }

    const leftIdentity = base.id(left.apex);
    const rightIdentity = base.id(right.apex);
    const roundTripLeft = base.compose(rightToLeft, leftToRight);
    if (!base.eq(roundTripLeft, leftIdentity)) {
      throw new Error("Pullback comparison: mediators do not reduce to the identity on the left apex.");
    }
    const roundTripRight = base.compose(leftToRight, rightToLeft);
    if (!base.eq(roundTripRight, rightIdentity)) {
      throw new Error("Pullback comparison: mediators do not reduce to the identity on the right apex.");
    }

    return { leftToRight, rightToLeft };
  };

  const transportPullback = (
    f: Arr,
    h: Arr,
    source: PullbackData<Obj, Arr>,
    iso: IsoWitness<Arr>,
    candidate: PullbackData<Obj, Arr>,
  ): PullbackData<Obj, Arr> => {
    const forwardSource = base.src(iso.forward);
    const forwardTarget = base.dst(iso.forward);
    if (forwardSource !== source.apex) {
      throw new Error("transportPullback: iso forward arrow must originate at the source pullback apex.");
    }
    if (base.src(iso.inverse) !== forwardTarget || base.dst(iso.inverse) !== source.apex) {
      throw new Error("transportPullback: iso inverse must map from the candidate apex back to the source apex.");
    }

    const identityOnSource = base.id(source.apex);
    const identityOnCandidate = base.id(forwardTarget);
    const forwardThenInverse = base.compose(iso.forward, iso.inverse);
    if (!base.eq(forwardThenInverse, identityOnCandidate)) {
      throw new Error("transportPullback: supplied iso witness does not collapse to the identity on the candidate apex.");
    }
    const inverseThenForward = base.compose(iso.inverse, iso.forward);
    if (!base.eq(inverseThenForward, identityOnSource)) {
      throw new Error("transportPullback: supplied iso witness does not collapse to the identity on the source apex.");
    }

    if (candidate.apex !== forwardTarget) {
      throw new Error("transportPullback: candidate apex must coincide with the iso target apex.");
    }
    if (base.src(candidate.toDomain) !== candidate.apex) {
      throw new Error("transportPullback: candidate domain leg must originate at its apex.");
    }
    if (base.src(candidate.toAnchor) !== candidate.apex) {
      throw new Error("transportPullback: candidate anchor leg must originate at its apex.");
    }

    const domainTarget = base.dst(source.toDomain);
    const anchorTarget = base.dst(source.toAnchor);
    if (base.dst(candidate.toDomain) !== domainTarget) {
      throw new Error("transportPullback: candidate domain leg must target the pullback domain object.");
    }
    if (base.dst(candidate.toAnchor) !== anchorTarget) {
      throw new Error("transportPullback: candidate anchor leg must target the pullback anchor object.");
    }

    const leftComposite = base.compose(f, candidate.toDomain);
    const rightComposite = base.compose(h, candidate.toAnchor);
    if (!base.eq(leftComposite, rightComposite)) {
      throw new Error("transportPullback: transported cone does not commute with the original span.");
    }

    const checkDomain = base.compose(candidate.toDomain, iso.forward);
    if (!base.eq(checkDomain, source.toDomain)) {
      throw new Error("transportPullback: iso forward does not reproduce the source domain projection.");
    }
    const checkAnchor = base.compose(candidate.toAnchor, iso.forward);
    if (!base.eq(checkAnchor, source.toAnchor)) {
      throw new Error("transportPullback: iso forward does not reproduce the source anchor projection.");
    }

    const mediators = comparison(f, h, source, candidate);
    if (!base.eq(mediators.leftToRight, iso.forward)) {
      throw new Error("transportPullback: universal property mediator differs from the supplied iso forward arrow.");
    }
    if (!base.eq(mediators.rightToLeft, iso.inverse)) {
      throw new Error("transportPullback: universal property mediator inverse differs from the supplied iso inverse arrow.");
    }

    return candidate;
  };

  return { pullback, factorCone, certify, induce, comparison, transportPullback };
}

export interface ProductAsPullbackInput<Obj, Arr> {
  readonly category: Category<Obj, Arr> & ArrowFamilies.HasDomCod<Obj, Arr>;
  readonly eq: (left: Arr, right: Arr) => boolean;
  readonly products: CategoryLimits.HasProductMediators<Obj, Arr>;
  readonly terminalObj: Obj;
  readonly terminate: (source: Obj) => Arr;
  readonly left: Obj;
  readonly right: Obj;
}

export interface ProductAsPullbackFactorResult<Arr> {
  readonly factored: boolean;
  readonly mediator?: Arr;
  readonly reason?: string;
}

export interface ProductAsPullbackWitness<Obj, Arr> {
  readonly span: { readonly left: Arr; readonly right: Arr };
  readonly pullback: PullbackData<Obj, Arr>;
  readonly factorCone: (cone: PullbackData<Obj, Arr>) => ProductAsPullbackFactorResult<Arr>;
}

export const productAsPullback = <Obj, Arr>(
  input: ProductAsPullbackInput<Obj, Arr>,
): ProductAsPullbackWitness<Obj, Arr> => {
  const { category, eq, products, terminalObj, terminate, left, right } = input;

  const terminateLeft = terminate(left);
  const terminateRight = terminate(right);

  if (category.dom(terminateLeft) !== left) {
    throw new Error("productAsPullback: terminate(left) must originate at the left object");
  }
  if (category.dom(terminateRight) !== right) {
    throw new Error("productAsPullback: terminate(right) must originate at the right object");
  }
  if (category.cod(terminateLeft) !== terminalObj || category.cod(terminateRight) !== terminalObj) {
    throw new Error("productAsPullback: terminate arrows must target the terminal object");
  }

  const { obj: productObj, projections } = products.product([left, right]);
  if (projections.length !== 2) {
    throw new Error("productAsPullback: binary product must provide two projections");
  }
  const [projectionLeft, projectionRight] = projections as [Arr, Arr];

  const pullback: PullbackData<Obj, Arr> = {
    apex: productObj,
    toDomain: projectionLeft,
    toAnchor: projectionRight,
  };

  const span = { left: terminateLeft, right: terminateRight };

  const factorCone = (cone: PullbackData<Obj, Arr>): ProductAsPullbackFactorResult<Arr> => {
    if (category.dom(cone.toDomain) !== cone.apex) {
      return {
        factored: false,
        reason: "productAsPullback: left leg must originate at the cone apex",
      };
    }
    if (category.dom(cone.toAnchor) !== cone.apex) {
      return {
        factored: false,
        reason: "productAsPullback: right leg must originate at the cone apex",
      };
    }
    if (category.cod(cone.toDomain) !== left) {
      return {
        factored: false,
        reason: "productAsPullback: left leg must land in the left object",
      };
    }
    if (category.cod(cone.toAnchor) !== right) {
      return {
        factored: false,
        reason: "productAsPullback: right leg must land in the right object",
      };
    }

    const leftComposite = category.compose(span.left, cone.toDomain);
    const rightComposite = category.compose(span.right, cone.toAnchor);
    if (!eq(leftComposite, rightComposite)) {
      return {
        factored: false,
        reason: "productAsPullback: supplied legs must agree after terminating",
      };
    }

    const mediator = products.tuple(cone.apex, [cone.toDomain, cone.toAnchor], productObj);

    const checkLeft = category.compose(pullback.toDomain, mediator);
    if (!eq(checkLeft, cone.toDomain)) {
      return {
        factored: false,
        reason: "productAsPullback: factoring through the left projection failed",
      };
    }

    const checkRight = category.compose(pullback.toAnchor, mediator);
    if (!eq(checkRight, cone.toAnchor)) {
      return {
        factored: false,
        reason: "productAsPullback: factoring through the right projection failed",
      };
    }

    return { factored: true, mediator };
  };

  return { span, pullback, factorCone };
};

export interface ProductFromPullbackInput<Obj, Arr> {
  readonly category: Category<Obj, Arr> & ArrowFamilies.HasDomCod<Obj, Arr>;
  readonly eq: (left: Arr, right: Arr) => boolean;
  readonly calculator: PullbackCalculator<Obj, Arr>;
  readonly terminalObj: Obj;
  readonly leftObj: Obj;
  readonly rightObj: Obj;
  readonly leftTerminate: Arr;
  readonly rightTerminate: Arr;
}

export interface ProductFromPullbackWitness<Obj, Arr> {
  readonly product: CategoryLimits.BinaryProductTuple<Obj, Arr>;
  readonly span: { readonly left: Arr; readonly right: Arr };
}

export const productFromPullbacks = <Obj, Arr>(
  input: ProductFromPullbackInput<Obj, Arr>,
): ProductFromPullbackWitness<Obj, Arr> => {
  const {
    category,
    eq,
    calculator,
    terminalObj,
    leftObj,
    rightObj,
    leftTerminate,
    rightTerminate,
  } = input;

  if (category.dom(leftTerminate) !== leftObj) {
    throw new Error("productFromPullbacks: left termination arrow must originate at the left object.");
  }
  if (category.dom(rightTerminate) !== rightObj) {
    throw new Error("productFromPullbacks: right termination arrow must originate at the right object.");
  }
  if (category.cod(leftTerminate) !== terminalObj || category.cod(rightTerminate) !== terminalObj) {
    throw new Error("productFromPullbacks: termination arrows must land in the terminal object.");
  }

  const pullback = calculator.pullback(leftTerminate, rightTerminate);

  if (category.dom(pullback.toDomain) !== pullback.apex) {
    throw new Error("productFromPullbacks: pullback domain leg must originate at the apex.");
  }
  if (category.dom(pullback.toAnchor) !== pullback.apex) {
    throw new Error("productFromPullbacks: pullback anchor leg must originate at the apex.");
  }
  if (category.cod(pullback.toDomain) !== leftObj) {
    throw new Error("productFromPullbacks: pullback domain leg must land in the left object.");
  }
  if (category.cod(pullback.toAnchor) !== rightObj) {
    throw new Error("productFromPullbacks: pullback anchor leg must land in the right object.");
  }

  const span = { left: leftTerminate, right: rightTerminate } as const;

  const tuple = (domain: Obj, legs: ReadonlyArray<Arr>): Arr => {
    if (legs.length !== 2) {
      throw new Error(
        `productFromPullbacks: expected exactly two legs for the binary product, received ${legs.length}.`,
      );
    }

    const [rawLeft, rawRight] = legs as readonly [Arr | undefined, Arr | undefined];
    if (!rawLeft || !rawRight) {
      throw new Error("productFromPullbacks: missing legs for the mediating arrow.");
    }

    if (category.dom(rawLeft) !== domain) {
      throw new Error("productFromPullbacks: left leg must originate at the supplied domain.");
    }
    if (category.dom(rawRight) !== domain) {
      throw new Error("productFromPullbacks: right leg must originate at the supplied domain.");
    }
    if (category.cod(rawLeft) !== leftObj) {
      throw new Error("productFromPullbacks: left leg must land in the left factor.");
    }
    if (category.cod(rawRight) !== rightObj) {
      throw new Error("productFromPullbacks: right leg must land in the right factor.");
    }

    const leftComposite = category.compose(span.left, rawLeft);
    const rightComposite = category.compose(span.right, rawRight);
    if (!eq(leftComposite, rightComposite)) {
      throw new Error("productFromPullbacks: supplied legs must agree after terminating to the base.");
    }

    const cone: PullbackData<Obj, Arr> = {
      apex: domain,
      toDomain: rawLeft,
      toAnchor: rawRight,
    };

    const factoring = calculator.factorCone(pullback, cone);
    if (!factoring.factored || factoring.mediator === undefined) {
      const detail = factoring.reason ??
        "productFromPullbacks: calculator did not supply the mediating arrow for the tuple.";
      throw new Error(detail);
    }

    const mediator = factoring.mediator;

    const factoredLeft = category.compose(pullback.toDomain, mediator);
    if (!eq(factoredLeft, rawLeft)) {
      throw new Error("productFromPullbacks: mediator does not reproduce the left leg.");
    }

    const factoredRight = category.compose(pullback.toAnchor, mediator);
    if (!eq(factoredRight, rawRight)) {
      throw new Error("productFromPullbacks: mediator does not reproduce the right leg.");
    }

    return mediator;
  };

  const product: CategoryLimits.BinaryProductTuple<Obj, Arr> = {
    object: pullback.apex,
    projections: [pullback.toDomain, pullback.toAnchor],
    tuple,
  };

  return { product, span };
};

const finsetMorEq = (left: FinSetMor, right: FinSetMor): boolean =>
  left.from === right.from &&
  left.to === right.to &&
  left.map.length === right.map.length &&
  left.map.every((value, index) => value === right.map[index]);

const finsetProductKey = (left: number, right: number): string => `${left}|${right}`;

const makeFinSetProductTuple = (
  product: FinSetObj,
  left: FinSetObj,
  right: FinSetObj,
  indexLookup: Map<string, number>,
) =>
  (domain: FinSetObj, legs: readonly [FinSetMor, FinSetMor]): FinSetMor => {
    const [rawLeft, rawRight] = legs;
    if (rawLeft.from !== domain || rawRight.from !== domain) {
      throw new Error("finsetProductFromPullback: tuple legs must share the supplied domain.");
    }
    if (rawLeft.to !== left) {
      throw new Error("finsetProductFromPullback: left leg must land in the left factor.");
    }
    if (rawRight.to !== right) {
      throw new Error("finsetProductFromPullback: right leg must land in the right factor.");
    }
    if (rawLeft.map.length !== domain.elements.length || rawRight.map.length !== domain.elements.length) {
      throw new Error("finsetProductFromPullback: tuple legs must assign images to every domain element.");
    }

    const map = domain.elements.map((_, index) => {
      const leftIndex = rawLeft.map[index];
      const rightIndex = rawRight.map[index];
      if (leftIndex === undefined || rightIndex === undefined) {
        throw new Error("finsetProductFromPullback: tuple legs are missing image indices.");
      }
      const key = finsetProductKey(leftIndex, rightIndex);
      const target = indexLookup.get(key);
      if (target === undefined) {
        throw new Error(
          "finsetProductFromPullback: tuple legs reference a pair that is absent from the product carrier.",
        );
      }
      return target;
    });

    return { from: domain, to: product, map };
  };

const validateFinSetProductCarrier = (product: FinSetObj, left: FinSetObj, right: FinSetObj): Map<string, number> => {
  const indexLookup = new Map<string, number>();
  product.elements.forEach((element, idx) => {
    if (!Array.isArray(element) || element.length !== 2) {
      throw new Error("finsetProductFromPullback: expected binary product carrier to encode index pairs.");
    }
    const [leftIndex, rightIndex] = element as ReadonlyArray<number>;
    if (typeof leftIndex !== "number" || typeof rightIndex !== "number") {
      throw new Error("finsetProductFromPullback: product carrier must contain numeric index pairs.");
    }
    if (leftIndex < 0 || leftIndex >= left.elements.length) {
      throw new Error("finsetProductFromPullback: product carrier references an invalid left index.");
    }
    if (rightIndex < 0 || rightIndex >= right.elements.length) {
      throw new Error("finsetProductFromPullback: product carrier references an invalid right index.");
    }
    indexLookup.set(finsetProductKey(leftIndex, rightIndex), idx);
  });
  return indexLookup;
};

interface FinSetPullbackMetadata {
  readonly span: { readonly left: FinSetMor; readonly right: FinSetMor };
  readonly product: { readonly obj: FinSetObj; readonly projections: readonly [FinSetMor, FinSetMor] };
  readonly equalizer: { readonly obj: FinSetObj; readonly equalize: FinSetMor };
  readonly tuple: (domain: FinSetObj, legs: readonly [FinSetMor, FinSetMor]) => FinSetMor;
  readonly pullback: PullbackData<FinSetObj, FinSetMor>;
}

const ensureFinSetEqual = (left: FinSetMor, right: FinSetMor): boolean => {
  const verdict = FinSet.equalMor?.(left, right);
  if (typeof verdict === "boolean") {
    return verdict;
  }
  return finsetMorEq(left, right);
};

export const makeFinSetPullbackCalculator = (): PullbackCalculator<FinSetObj, FinSetMor> => {
  const metadata = new WeakMap<PullbackData<FinSetObj, FinSetMor>, FinSetPullbackMetadata>();

  const buildMetadata = (f: FinSetMor, h: FinSetMor): FinSetPullbackMetadata => {
    const witness = makePullbackFromProductsAndEqualizers(FinSet, f, h);
    const domainObj = FinSet.dom(f);
    const anchorObj = FinSet.dom(h);
    const indexLookup = validateFinSetProductCarrier(witness.product.obj, domainObj, anchorObj);
    const tuple = makeFinSetProductTuple(witness.product.obj, domainObj, anchorObj, indexLookup);
    return {
      span: { left: witness.parallelPair[0], right: witness.parallelPair[1] },
      product: witness.product,
      equalizer: witness.equalizer,
      tuple,
      pullback: witness.pullback,
    };
  };

  const certifyCandidate = (
    f: FinSetMor,
    h: FinSetMor,
    candidate: PullbackData<FinSetObj, FinSetMor>,
  ): {
    readonly valid: boolean;
    readonly reason?: string;
    readonly metadata?: FinSetPullbackMetadata;
  } => {
    const witness = buildMetadata(f, h);
    if (candidate.apex !== witness.equalizer.obj) {
      return { valid: false, reason: "FinSet pullback certification: apex differs from the canonical equalizer." };
    }
    if (!ensureFinSetEqual(candidate.toDomain, witness.pullback.toDomain)) {
      return { valid: false, reason: "FinSet pullback certification: domain leg differs from the canonical factor." };
    }
    if (!ensureFinSetEqual(candidate.toAnchor, witness.pullback.toAnchor)) {
      return { valid: false, reason: "FinSet pullback certification: anchor leg differs from the canonical factor." };
    }
    return { valid: true, metadata: witness };
  };

  const induceMediator = (
    j: FinSetMor,
    pullbackOfF: PullbackData<FinSetObj, FinSetMor>,
    pullbackOfG: PullbackData<FinSetObj, FinSetMor>,
  ): FinSetMor => {
    if (pullbackOfF.toDomain.from !== pullbackOfF.apex || pullbackOfF.toAnchor.from !== pullbackOfF.apex) {
      throw new Error("FinSet pullback induce: first pullback legs must emanate from the apex.");
    }
    if (pullbackOfG.toDomain.from !== pullbackOfG.apex || pullbackOfG.toAnchor.from !== pullbackOfG.apex) {
      throw new Error("FinSet pullback induce: second pullback legs must emanate from the apex.");
    }

    const mediatedDomain = FinSet.compose(j, pullbackOfF.toDomain);
    const anchorLeg = pullbackOfF.toAnchor;

    const mediatorMap = pullbackOfF.apex.elements.map((_value, index) => {
      const expectedDomain = mediatedDomain.map[index];
      const expectedAnchor = anchorLeg.map[index];
      if (expectedDomain === undefined || expectedAnchor === undefined) {
        throw new Error("FinSet pullback induce: pullback legs must enumerate every apex element.");
      }

      const matches: number[] = [];
      pullbackOfG.apex.elements.forEach((_candidate, candidateIndex) => {
        const domainImage = pullbackOfG.toDomain.map[candidateIndex];
        const anchorImage = pullbackOfG.toAnchor.map[candidateIndex];
        if (domainImage === expectedDomain && anchorImage === expectedAnchor) {
          matches.push(candidateIndex);
        }
      });

      if (matches.length === 0) {
        throw new Error("FinSet pullback induce: no apex element satisfies the pullback equations.");
      }
      if (matches.length > 1) {
        throw new Error("FinSet pullback induce: multiple apex elements satisfy the pullback equations.");
      }
      return matches[0]!;
    });

    return { from: pullbackOfF.apex, to: pullbackOfG.apex, map: mediatorMap };
  };

  const calculator: PullbackCalculator<FinSetObj, FinSetMor> = {
    pullback(f, h) {
      const witness = buildMetadata(f, h);
      metadata.set(witness.pullback, witness);
      return witness.pullback;
    },
    factorCone(target, cone) {
      const data = metadata.get(target);
      if (!data) {
        return {
          factored: false,
          reason:
            "FinSet pullback factorCone: unrecognised apex; construct it via makeFinSetPullbackCalculator.pullback first.",
        };
      }
      try {
        const fork = data.tuple(cone.apex, [cone.toDomain, cone.toAnchor]);
        const mediator = finsetFactorThroughEqualizer(
          data.span.left,
          data.span.right,
          data.equalizer.equalize,
          fork,
        );
        return { factored: true, mediator };
      } catch (error) {
        return {
          factored: false,
          reason:
            error instanceof Error
              ? error.message
              : "FinSet pullback factorCone: unable to factor cone through the equalizer.",
        };
      }
    },
    certify(f, h, candidate) {
      const verdict = certifyCandidate(f, h, candidate);
      if (!verdict.valid || !verdict.metadata) {
        return {
          valid: false,
          reason: verdict.reason ?? "FinSet pullback certification: candidate differs from canonical witness.",
          conesChecked: [],
        };
      }
      metadata.set(candidate, verdict.metadata);
      return { valid: true, conesChecked: [] };
    },
    induce: induceMediator,
    comparison(f, h, left, right) {
      const domainIdentity = FinSet.id(FinSet.dom(f));
      const leftToRight = induceMediator(domainIdentity, left, right);
      const rightToLeft = induceMediator(domainIdentity, right, left);

      const roundTripLeft = FinSet.compose(rightToLeft, leftToRight);
      if (!ensureFinSetEqual(roundTripLeft, FinSet.id(left.apex))) {
        throw new Error("FinSet pullback comparison: mediators do not reduce to the identity on the left apex.");
      }
      const roundTripRight = FinSet.compose(leftToRight, rightToLeft);
      if (!ensureFinSetEqual(roundTripRight, FinSet.id(right.apex))) {
        throw new Error("FinSet pullback comparison: mediators do not reduce to the identity on the right apex.");
      }

      return { leftToRight, rightToLeft };
    },
    transportPullback(f, h, source, iso, candidate) {
      if (iso.forward.from !== source.apex) {
        throw new Error("FinSet pullback transport: iso forward arrow must originate at the source apex.");
      }
      if (iso.forward.to !== candidate.apex) {
        throw new Error("FinSet pullback transport: iso forward arrow must land in the candidate apex.");
      }
      if (iso.inverse.from !== candidate.apex || iso.inverse.to !== source.apex) {
        throw new Error("FinSet pullback transport: iso inverse must map between the candidate and source apex.");
      }

      const forwardThenInverse = FinSet.compose(iso.forward, iso.inverse);
      if (!ensureFinSetEqual(forwardThenInverse, FinSet.id(candidate.apex))) {
        throw new Error("FinSet pullback transport: iso witnesses do not compose to the identity on the candidate apex.");
      }
      const inverseThenForward = FinSet.compose(iso.inverse, iso.forward);
      if (!ensureFinSetEqual(inverseThenForward, FinSet.id(source.apex))) {
        throw new Error("FinSet pullback transport: iso witnesses do not compose to the identity on the source apex.");
      }

      const codomain = FinSet.cod(f);
      if (codomain !== FinSet.cod(h)) {
        throw new Error("FinSet pullback transport: span legs must share a codomain.");
      }
      if (candidate.toDomain.from !== candidate.apex || candidate.toAnchor.from !== candidate.apex) {
        throw new Error("FinSet pullback transport: candidate legs must emanate from the apex.");
      }
      if (candidate.toDomain.to !== FinSet.dom(f)) {
        throw new Error("FinSet pullback transport: candidate domain leg must land in dom(f).");
      }
      if (candidate.toAnchor.to !== FinSet.dom(h)) {
        throw new Error("FinSet pullback transport: candidate anchor leg must land in dom(h).");
      }

      const leftComposite = FinSet.compose(f, candidate.toDomain);
      const rightComposite = FinSet.compose(h, candidate.toAnchor);
      if (!ensureFinSetEqual(leftComposite, rightComposite)) {
        throw new Error("FinSet pullback transport: candidate square does not commute with the span.");
      }

      const checkDomain = FinSet.compose(candidate.toDomain, iso.forward);
      if (!ensureFinSetEqual(checkDomain, source.toDomain)) {
        throw new Error("FinSet pullback transport: iso forward does not reproduce the source domain projection.");
      }
      const checkAnchor = FinSet.compose(candidate.toAnchor, iso.forward);
      if (!ensureFinSetEqual(checkAnchor, source.toAnchor)) {
        throw new Error("FinSet pullback transport: iso forward does not reproduce the source anchor projection.");
      }

      const mediators = calculator.comparison(f, h, source, candidate);
      if (!ensureFinSetEqual(mediators.leftToRight, iso.forward)) {
        throw new Error("FinSet pullback transport: comparison mediator differs from the supplied iso forward arrow.");
      }
      if (!ensureFinSetEqual(mediators.rightToLeft, iso.inverse)) {
        throw new Error("FinSet pullback transport: comparison mediator differs from the supplied iso inverse arrow.");
      }

      metadata.set(candidate, buildMetadata(f, h));
      return candidate;
    },
  } satisfies PullbackCalculator<FinSetObj, FinSetMor>;

  return calculator;
};

export interface FinSetCharacteristicPullbackWitness {
  readonly pullback: PullbackData<FinSetObj, FinSetMor>;
  readonly subobject: FinSetObj;
  readonly inclusion: FinSetMor;
  readonly terminalProjection: FinSetMor;
  readonly squareCommutes: boolean;
  readonly characteristicComposite: FinSetMor;
  readonly truthComposite: FinSetMor;
  readonly factorCone: (
    cone: PullbackData<FinSetObj, FinSetMor>,
  ) => PullbackConeFactorResult<FinSetMor>;
  readonly certification: PullbackCertification<FinSetObj, FinSetMor>;
}

const finsetTruthPullbacks = makeFinSetPullbackCalculator();

export const finsetCharacteristicPullback = (
  characteristic: FinSetMor,
  target: FinSetMor = FinSetTruthArrow,
): FinSetCharacteristicPullbackWitness => {
  if (characteristic.to !== FinSetTruthValues) {
    throw new Error(
      "finsetSubobjectFromCharacteristic: arrow must land in the FinSet truth-value object.",
    );
  }

  if (characteristic.map.length !== characteristic.from.elements.length) {
    throw new Error(
      "finsetSubobjectFromCharacteristic: characteristic arrow must provide a verdict for every element.",
    );
  }

  if (target.to !== FinSetTruthValues) {
    throw new Error("finsetCharacteristicPullback: target arrow must land in the truth-value object.");
  }

  if (target.from !== FinSet.terminalObj) {
    throw new Error("finsetCharacteristicPullback: target arrow must originate at the FinSet terminal object.");
  }

  if (target.map.length !== target.from.elements.length) {
    throw new Error(
      "finsetCharacteristicPullback: target arrow must enumerate every element of the terminal object.",
    );
  }

  const targetIndex = target.map[0];

  if (targetIndex === undefined) {
    throw new Error("finsetCharacteristicPullback: target arrow must select at least one truth index.");
  }

  if (!Number.isInteger(targetIndex)) {
    throw new Error("finsetCharacteristicPullback: target arrow must select a valid truth index.");
  }

  if (targetIndex < 0 || targetIndex >= FinSetTruthValues.elements.length) {
    throw new Error("finsetCharacteristicPullback: target arrow must pick out a valid truth value.");
  }

  characteristic.map.forEach((value, index) => {
    if (value < 0 || value >= FinSetTruthValues.elements.length) {
      throw new Error("finsetSubobjectFromCharacteristic: characteristic arrow is not truth-valued.");
    }
    if (value === targetIndex && characteristic.from.elements[index] === undefined) {
      throw new Error("finsetSubobjectFromCharacteristic: missing domain element for targeted fibre.");
    }
  });

  const pullback = finsetTruthPullbacks.pullback(characteristic, target);

  if (pullback.toDomain.to !== characteristic.from) {
    throw new Error(
      "finsetCharacteristicPullback: pullback domain leg does not target the characteristic domain.",
    );
  }

  if (pullback.toAnchor.to !== target.from) {
    throw new Error(
      "finsetCharacteristicPullback: pullback anchor leg does not target the supplied terminal object.",
    );
  }

  const characteristicComposite = FinSet.compose(characteristic, pullback.toDomain);
  const truthComposite = FinSet.compose(target, pullback.toAnchor);
  const squareCommutes = ensureFinSetEqual(characteristicComposite, truthComposite);
  if (!squareCommutes) {
    throw new Error(
      "finsetCharacteristicPullback: canonical pullback square fails to commute with the target arrow.",
    );
  }

  const certification = finsetTruthPullbacks.certify(characteristic, target, pullback);
  if (!certification.valid) {
    throw new Error(
      `finsetCharacteristicPullback: canonical witness failed certification: ${
        certification.reason ?? "unknown reason"
      }`,
    );
  }

  return {
    pullback,
    subobject: pullback.apex,
    inclusion: pullback.toDomain,
    terminalProjection: pullback.toAnchor,
    squareCommutes,
    characteristicComposite,
    truthComposite,
    factorCone: (cone) => finsetTruthPullbacks.factorCone(pullback, cone),
    certification,
  };
};

export interface FinSetProductFromPullbackWitness {
  readonly product: CategoryLimits.BinaryProductTuple<FinSetObj, FinSetMor>;
  readonly native: CategoryLimits.BinaryProductTuple<FinSetObj, FinSetMor>;
  readonly span: { readonly left: FinSetMor; readonly right: FinSetMor };
}

export const finsetProductFromPullback = (
  left: FinSetObj,
  right: FinSetObj,
): FinSetProductFromPullbackWitness => {
  const eq = (first: FinSetMor, second: FinSetMor): boolean =>
    FinSet.equalMor?.(first, second) ?? finsetMorEq(first, second);

  const leftTerminate = FinSet.terminal.terminate(left);
  const rightTerminate = FinSet.terminal.terminate(right);

  const nativeProduct = FinSet.product([left, right]);
  if (nativeProduct.projections.length !== 2) {
    throw new Error("finsetProductFromPullback: FinSet.product must return exactly two projections in the binary case.");
  }
  const [projectionLeft, projectionRight] = nativeProduct.projections as readonly [FinSetMor, FinSetMor];

  const indexLookup = validateFinSetProductCarrier(nativeProduct.obj, left, right);
  const tupleForNative = makeFinSetProductTuple(nativeProduct.obj, left, right, indexLookup);

  const native: CategoryLimits.BinaryProductTuple<FinSetObj, FinSetMor> = {
    object: nativeProduct.obj,
    projections: [projectionLeft, projectionRight],
    tuple: tupleForNative,
  };

  const pairIndexForApex = new WeakMap<FinSetObj, Map<string, number>>();
  pairIndexForApex.set(nativeProduct.obj, indexLookup);

  const calculator: PullbackCalculator<FinSetObj, FinSetMor> = {
    pullback(f, g) {
      if (!eq(f, leftTerminate) || !eq(g, rightTerminate)) {
        throw new Error("finsetProductFromPullback: calculator only supports terminal legs for the supplied factors.");
      }
      pairIndexForApex.set(nativeProduct.obj, indexLookup);
      return { apex: nativeProduct.obj, toDomain: projectionLeft, toAnchor: projectionRight };
    },
    factorCone(target, cone) {
      if (
        target.apex !== nativeProduct.obj ||
        !eq(target.toDomain, projectionLeft) ||
        !eq(target.toAnchor, projectionRight)
      ) {
        return {
          factored: false,
          reason:
            "finsetProductFromPullback: calculator only recognises the canonical pullback of the terminal legs.",
        };
      }

      pairIndexForApex.set(nativeProduct.obj, indexLookup);
      const lookup = pairIndexForApex.get(nativeProduct.obj);
      if (!lookup) {
        return {
          factored: false,
          reason:
            "finsetProductFromPullback: missing tuple index metadata for the reconstructed FinSet product.",
        };
      }

      if (cone.toDomain.from !== cone.apex) {
        return {
          factored: false,
          reason: "finsetProductFromPullback: cone left leg must originate at its apex.",
        };
      }
      if (cone.toAnchor.from !== cone.apex) {
        return {
          factored: false,
          reason: "finsetProductFromPullback: cone right leg must originate at its apex.",
        };
      }
      if (cone.toDomain.to !== left) {
        return {
          factored: false,
          reason: "finsetProductFromPullback: cone left leg must land in the left factor.",
        };
      }
      if (cone.toAnchor.to !== right) {
        return {
          factored: false,
          reason: "finsetProductFromPullback: cone right leg must land in the right factor.",
        };
      }
      if (cone.toDomain.map.length !== cone.toAnchor.map.length) {
        return {
          factored: false,
          reason: "finsetProductFromPullback: cone legs must share the same arity.",
        };
      }

      const map = cone.toDomain.map.map((leftIndex, position) => {
        const rightIndex = cone.toAnchor.map[position];
        if (rightIndex === undefined) {
          throw new Error("finsetProductFromPullback: cone legs must map every domain element.");
        }
        const key = finsetProductKey(leftIndex, rightIndex);
        const targetIndex = lookup.get(key);
        if (targetIndex === undefined) {
          throw new Error(
            "finsetProductFromPullback: cone legs do not align with any element of the reconstructed product carrier.",
          );
        }
        return targetIndex;
      });

      const mediator: FinSetMor = { from: cone.apex, to: nativeProduct.obj, map };
      const checkLeft = FinSet.compose(projectionLeft, mediator);
      if (!eq(checkLeft, cone.toDomain)) {
        return {
          factored: false,
          reason: "finsetProductFromPullback: mediator does not reproduce the cone left leg.",
        };
      }
      const checkRight = FinSet.compose(projectionRight, mediator);
      if (!eq(checkRight, cone.toAnchor)) {
        return {
          factored: false,
          reason: "finsetProductFromPullback: mediator does not reproduce the cone right leg.",
        };
      }

      return { factored: true, mediator };
    },
    certify(f, g, candidate) {
      const valid =
        eq(f, leftTerminate) &&
        eq(g, rightTerminate) &&
        candidate.apex === nativeProduct.obj &&
        eq(candidate.toDomain, projectionLeft) &&
        eq(candidate.toAnchor, projectionRight);
      return valid
        ? { valid: true, conesChecked: [] }
        : {
            valid: false,
            reason:
              "finsetProductFromPullback: calculator only recognises the canonical pullback of the terminal legs.",
            conesChecked: [],
          };
    },
    induce(j, pullbackOfF, pullbackOfG) {
      if (pullbackOfG.apex !== nativeProduct.obj) {
        throw new Error(
          "finsetProductFromPullback: mediators can only target the reconstructed FinSet product apex.",
        );
      }
      const lookup = pairIndexForApex.get(nativeProduct.obj);
      if (!lookup) {
        throw new Error(
          "finsetProductFromPullback: missing tuple index metadata for the reconstructed FinSet product.",
        );
      }

      const composedLeft = FinSet.compose(j, pullbackOfF.toDomain);
      const anchorLeg = pullbackOfF.toAnchor;

      if (composedLeft.to !== left) {
        throw new Error("finsetProductFromPullback: composed left leg must land in the left factor.");
      }
      if (anchorLeg.to !== right) {
        throw new Error("finsetProductFromPullback: right leg must land in the right factor.");
      }
      if (composedLeft.map.length !== anchorLeg.map.length) {
        throw new Error("finsetProductFromPullback: cone legs must share the same arity.");
      }

      const map = composedLeft.map.map((leftIndex, position) => {
        const rightIndex = anchorLeg.map[position];
        if (rightIndex === undefined) {
          throw new Error("finsetProductFromPullback: cone legs must map every domain element.");
        }
        const key = finsetProductKey(leftIndex, rightIndex);
        const target = lookup.get(key);
        if (target === undefined) {
          throw new Error(
            "finsetProductFromPullback: cone legs do not align with any element of the reconstructed product carrier.",
          );
        }
        return target;
      });

      return { from: pullbackOfF.apex, to: nativeProduct.obj, map };
    },
    comparison(_f, _g, leftPullback, rightPullback) {
      if (leftPullback.apex !== nativeProduct.obj || rightPullback.apex !== nativeProduct.obj) {
        throw new Error(
          "finsetProductFromPullback: comparison is only available for the canonical terminal pullback.",
        );
      }
      const identity = FinSet.id(nativeProduct.obj);
      return { leftToRight: identity, rightToLeft: identity };
    },
    transportPullback(f, g, source, iso, candidate) {
      if (!eq(f, leftTerminate) || !eq(g, rightTerminate)) {
        throw new Error(
          "finsetProductFromPullback: transport is only defined for the terminal legs of the supplied factors.",
        );
      }

      if (
        source.apex !== nativeProduct.obj ||
        !eq(source.toDomain, projectionLeft) ||
        !eq(source.toAnchor, projectionRight)
      ) {
        throw new Error(
          "finsetProductFromPullback: source pullback must be the canonical terminal wedge for the factors.",
        );
      }

      const identity = FinSet.id(nativeProduct.obj);
      if (!eq(iso.forward, identity) || !eq(iso.inverse, identity)) {
        throw new Error(
          "finsetProductFromPullback: only the identity isomorphism is available for the reconstructed product apex.",
        );
      }

      if (
        candidate.apex !== nativeProduct.obj ||
        !eq(candidate.toDomain, projectionLeft) ||
        !eq(candidate.toAnchor, projectionRight)
      ) {
        throw new Error(
          "finsetProductFromPullback: candidate pullback must coincide with the canonical terminal wedge.",
        );
      }

      return candidate;
    },
  };

  const witness = productFromPullbacks<FinSetObj, FinSetMor>({
    category: FinSet,
    eq,
    calculator,
    terminalObj: FinSet.terminalObj,
    leftObj: left,
    rightObj: right,
    leftTerminate,
    rightTerminate,
  });

  if (witness.product.object !== nativeProduct.obj) {
    throw new Error(
      "finsetProductFromPullback: reconstructed product carrier does not match the FinSet.product carrier.",
    );
  }
  if (!eq(witness.product.projections[0], projectionLeft)) {
    throw new Error(
      "finsetProductFromPullback: reconstructed left projection differs from the FinSet.product projection.",
    );
  }
  if (!eq(witness.product.projections[1], projectionRight)) {
    throw new Error(
      "finsetProductFromPullback: reconstructed right projection differs from the FinSet.product projection.",
    );
  }

  return { product: witness.product, native, span: witness.span };
};

export interface EqualizerFromPullbackInput<Obj, Arr> {
  readonly category: Category<Obj, Arr> & ArrowFamilies.HasDomCod<Obj, Arr>;
  readonly eq: (left: Arr, right: Arr) => boolean;
  readonly calculator: PullbackCalculator<Obj, Arr>;
  readonly products: CategoryLimits.HasProductMediators<Obj, Arr>;
  readonly left: Arr;
  readonly right: Arr;
}

export interface EqualizerFromPullbackFactorResult<Arr> {
  readonly factored: boolean;
  readonly mediator?: Arr;
  readonly reason?: string;
}

export interface EqualizerFromPullbackWitness<Obj, Arr> {
  readonly equalizer: { readonly object: Obj; readonly arrow: Arr };
  readonly span: {
    readonly left: Arr;
    readonly right: Arr;
    readonly pair: Arr;
    readonly diagonal: Arr;
  };
  readonly pullback: PullbackData<Obj, Arr>;
  readonly factor: (arrow: Arr) => EqualizerFromPullbackFactorResult<Arr>;
}

export const equalizerFromPullback = <Obj, Arr>(
  input: EqualizerFromPullbackInput<Obj, Arr>,
): EqualizerFromPullbackWitness<Obj, Arr> => {
  const { category, eq, calculator, products, left, right } = input;
  const source = category.dom(left);
  const target = category.cod(left);

  if (source !== category.dom(right) || target !== category.cod(right)) {
    throw new Error("equalizerFromPullback: arrows must be parallel with a shared domain and codomain.");
  }

  const product = products.product([target, target]);
  const productObj = product.obj;
  const pair = products.tuple(source, [left, right], productObj);
  const idTarget = category.id(target);
  const diagonal = products.tuple(target, [idTarget, idTarget], productObj);

  const pullback = calculator.pullback(pair, diagonal);

  const equalizerArrow = pullback.toDomain;
  const factor = (arrow: Arr): EqualizerFromPullbackFactorResult<Arr> => {
    if (category.cod(arrow) !== source) {
      return {
        factored: false,
        reason: "equalizerFromPullback: arrow must land in the common domain of the parallel pair.",
      };
    }

    const leftComposite = category.compose(left, arrow);
    const rightComposite = category.compose(right, arrow);
    if (!eq(leftComposite, rightComposite)) {
      return {
        factored: false,
        reason: "equalizerFromPullback: supplied arrow does not equalise the parallel pair.",
      };
    }

    const cone: PullbackData<Obj, Arr> = {
      apex: category.dom(arrow),
      toDomain: arrow,
      toAnchor: leftComposite,
    };

    try {
      const mediator = calculator.induce(category.id(source), cone, pullback);

      const inclusionCheck = category.compose(equalizerArrow, mediator);
      if (!eq(inclusionCheck, arrow)) {
        return {
          factored: false,
          reason: "equalizerFromPullback: mediator does not reproduce the supplied arrow.",
        };
      }

      const anchorCheck = category.compose(pullback.toAnchor, mediator);
      if (!eq(anchorCheck, leftComposite)) {
        return {
          factored: false,
          reason: "equalizerFromPullback: mediator does not respect the anchor leg.",
        };
      }

      return { factored: true, mediator };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "equalizerFromPullback: mediator construction failed for an unknown reason.";
      return { factored: false, reason: message };
    }
  };

  return {
    equalizer: { object: pullback.apex, arrow: equalizerArrow },
    span: {
      left,
      right,
      pair,
      diagonal,
    },
    pullback,
    factor,
  };
};

export type PullbackIsoSide = "left" | "right";

export interface PullbackIsoInput<Obj, Arr> {
  readonly category: Category<Obj, Arr> & ArrowFamilies.HasDomCod<Obj, Arr>;
  readonly eq: (left: Arr, right: Arr) => boolean;
  readonly calculator: PullbackCalculator<Obj, Arr>;
  readonly span: { readonly left: Arr; readonly right: Arr };
  readonly pullback: PullbackData<Obj, Arr>;
  readonly iso: IsoWitness<Arr>;
  readonly side: PullbackIsoSide;
}

export const pullbackPreservesIso = <Obj, Arr>(
  input: PullbackIsoInput<Obj, Arr>,
): IsoWitness<Arr> => {
  const { category, eq, calculator, span, pullback, iso, side } = input;

  const spanLeftDomain = category.dom(span.left);
  const spanRightDomain = category.dom(span.right);

  if (side === "right") {
    if (!eq(iso.forward, span.right)) {
      throw new Error("pullbackPreservesIso: supplied iso must coincide with the span's right leg.");
    }
    const anchorLift = category.compose(iso.inverse, span.left);
    if (category.dom(anchorLift) !== spanLeftDomain || category.cod(anchorLift) !== spanRightDomain) {
      throw new Error("pullbackPreservesIso: inverse composed with the left leg must map into the iso domain.");
    }

    const cone: PullbackData<Obj, Arr> = {
      apex: spanLeftDomain,
      toDomain: category.id(spanLeftDomain),
      toAnchor: anchorLift,
    };

    const factoring = calculator.factorCone(pullback, cone);
    if (!factoring.factored || factoring.mediator === undefined) {
      const detail =
        factoring.reason ??
        "pullbackPreservesIso: universal property failed to produce the mediator induced by the iso.";
      throw new Error(detail);
    }

    const mediator = factoring.mediator;
    const forward = pullback.toDomain;
    const backward = mediator;

    const forwardThenBackward = category.compose(forward, backward);
    const identityOnLeft = category.id(spanLeftDomain);
    if (!eq(forwardThenBackward, identityOnLeft)) {
      throw new Error("pullbackPreservesIso: projection followed by the induced mediator is not the identity.");
    }

    const backwardThenForward = category.compose(backward, forward);
    const identityOnApex = category.id(pullback.apex);
    if (!eq(backwardThenForward, identityOnApex)) {
      throw new Error("pullbackPreservesIso: induced mediator does not split the pullback projection.");
    }

    return { forward, inverse: backward };
  }

  if (!eq(iso.forward, span.left)) {
    throw new Error("pullbackPreservesIso: supplied iso must coincide with the span's left leg.");
  }

  const domainLift = category.compose(iso.inverse, span.right);
  if (category.dom(domainLift) !== spanRightDomain || category.cod(domainLift) !== spanLeftDomain) {
    throw new Error("pullbackPreservesIso: inverse composed with the right leg must land in the iso domain.");
  }

  const cone: PullbackData<Obj, Arr> = {
    apex: spanRightDomain,
    toDomain: domainLift,
    toAnchor: category.id(spanRightDomain),
  };

  const factoring = calculator.factorCone(pullback, cone);
  if (!factoring.factored || factoring.mediator === undefined) {
    const detail =
      factoring.reason ??
      "pullbackPreservesIso: universal property failed to produce the mediator induced by the iso.";
    throw new Error(detail);
  }

  const mediator = factoring.mediator;
  const forward = pullback.toAnchor;
  const backward = mediator;

  const forwardThenBackward = category.compose(forward, backward);
  const identityOnRight = category.id(spanRightDomain);
  if (!eq(forwardThenBackward, identityOnRight)) {
    throw new Error("pullbackPreservesIso: anchor projection followed by the induced mediator is not the identity.");
  }

  const backwardThenForward = category.compose(backward, forward);
  const identityOnApex = category.id(pullback.apex);
  if (!eq(backwardThenForward, identityOnApex)) {
    throw new Error("pullbackPreservesIso: induced mediator does not split the anchor projection.");
  }

  return { forward, inverse: backward };
};

export interface MonomorphismCancellationResult<Arr> {
  readonly equal: boolean;
  readonly reason?: string;
}

export interface MonomorphismWitness<Arr> {
  readonly arrow: Arr;
  readonly cancel: (left: Arr, right: Arr) => MonomorphismCancellationResult<Arr>;
}

export interface PullbackMonoInput<Obj, Arr> {
  readonly category: Category<Obj, Arr> & ArrowFamilies.HasDomCod<Obj, Arr>;
  readonly eq: (left: Arr, right: Arr) => boolean;
  readonly calculator: PullbackCalculator<Obj, Arr>;
  readonly span: { readonly left: Arr; readonly right: Arr };
  readonly pullback: PullbackData<Obj, Arr>;
  readonly monomorphism: MonomorphismWitness<Arr>;
  readonly side: PullbackIsoSide;
}

export const pullbackPreservesMono = <Obj, Arr>(
  input: PullbackMonoInput<Obj, Arr>,
): MonomorphismWitness<Arr> => {
  const { category, eq, calculator, span, pullback, monomorphism, side } = input;

  const orientation = side === "right"
    ? {
        projection: pullback.toDomain,
        otherProjection: pullback.toAnchor,
        monoArrow: span.right,
        comparison: span.left,
      }
    : {
        projection: pullback.toAnchor,
        otherProjection: pullback.toDomain,
        monoArrow: span.left,
        comparison: span.right,
      };

  if (!eq(monomorphism.arrow, orientation.monoArrow)) {
    throw new Error("pullbackPreservesMono: supplied monomorphism witness must match the chosen span leg.");
  }

  const cancel = (first: Arr, second: Arr): MonomorphismCancellationResult<Arr> => {
    if (category.dom(first) !== category.dom(second)) {
      return {
        equal: false,
        reason: "pullbackPreservesMono: candidate arrows must share a domain when testing cancellability.",
      };
    }
    if (category.cod(first) !== pullback.apex || category.cod(second) !== pullback.apex) {
      return {
        equal: false,
        reason: "pullbackPreservesMono: candidate arrows must land in the pullback apex.",
      };
    }

    const domainFirst = category.compose(orientation.projection, first);
    const domainSecond = category.compose(orientation.projection, second);
    if (!eq(domainFirst, domainSecond)) {
      return {
        equal: false,
        reason: "pullbackPreservesMono: projection composites differ, so cancellability does not apply.",
      };
    }

    const anchorFirst = category.compose(orientation.otherProjection, first);
    const anchorSecond = category.compose(orientation.otherProjection, second);

    const imageFirst = category.compose(orientation.monoArrow, anchorFirst);
    const imageSecond = category.compose(orientation.monoArrow, anchorSecond);
    if (!eq(imageFirst, imageSecond)) {
      return {
        equal: false,
        reason: "pullbackPreservesMono: monomorphism composites disagree, so cancellation cannot proceed.",
      };
    }

    const cancellation = monomorphism.cancel(anchorFirst, anchorSecond);
    if (!cancellation.equal) {
      return {
        equal: false,
        reason:
          cancellation.reason ??
          "pullbackPreservesMono: supplied monomorphism witness rejected the cancellation request.",
      };
    }

    const cone: PullbackData<Obj, Arr> = {
      apex: category.dom(first),
      toDomain: domainFirst,
      toAnchor: anchorFirst,
    };

    const factoring = calculator.factorCone(pullback, cone);
    if (!factoring.factored || factoring.mediator === undefined) {
      return {
        equal: false,
        reason:
          factoring.reason ??
          "pullbackPreservesMono: universal property failed to recover the candidate mediator.",
      };
    }

    const mediator = factoring.mediator;
    if (!eq(mediator, first)) {
      return {
        equal: false,
        reason: "pullbackPreservesMono: universal mediator does not reproduce the first arrow.",
      };
    }
    if (!eq(mediator, second)) {
      return {
        equal: false,
        reason: "pullbackPreservesMono: universal mediator does not reproduce the second arrow.",
      };
    }

    return { equal: true };
  };

  return { arrow: orientation.projection, cancel };
};

export interface MonoByPullbackSquareInput<Obj, Arr> {
  readonly category: Category<Obj, Arr> & ArrowFamilies.HasDomCod<Obj, Arr>;
  readonly calculator: PullbackCalculator<Obj, Arr>;
  readonly products: CategoryLimits.HasProductMediators<Obj, Arr>;
  readonly arrow: Arr;
}

export interface MonoByPullbackSquareResult<Obj, Arr> {
  readonly holds: boolean;
  readonly certification: PullbackCertification<Obj, Arr>;
  readonly candidate: PullbackData<Obj, Arr>;
  readonly span: { readonly pair: Arr; readonly diagonal: Arr };
}

export const monoByPullbackSquare = <Obj, Arr>(
  input: MonoByPullbackSquareInput<Obj, Arr>,
): MonoByPullbackSquareResult<Obj, Arr> => {
  const { category, calculator, products, arrow } = input;

  const source = category.dom(arrow);
  const target = category.cod(arrow);

  const product = products.product([target, target]);
  const pair = products.tuple(source, [arrow, arrow], product.obj);
  const idTarget = category.id(target);
  const diagonal = products.tuple(target, [idTarget, idTarget], product.obj);

  const candidate: PullbackData<Obj, Arr> = {
    apex: source,
    toDomain: category.id(source),
    toAnchor: arrow,
  };

  const certification = calculator.certify(pair, diagonal, candidate);
  return {
    holds: certification.valid,
    certification,
    candidate,
    span: { pair, diagonal },
  };
};

export interface PullbackSquareWitness<Obj, Arr> {
  readonly span: { readonly left: Arr; readonly right: Arr };
  readonly pullback: PullbackData<Obj, Arr>;
}

interface PullbackLemmaBaseInput<Obj, Arr> {
  readonly category: FiniteCategory<Obj, Arr> & ArrowFamilies.HasDomCod<Obj, Arr>;
  readonly eq: (left: Arr, right: Arr) => boolean;
  readonly calculator: PullbackCalculator<Obj, Arr>;
  readonly cone: PullbackData<Obj, Arr>;
}

interface PullbackLemmaComposeInput<Obj, Arr> extends PullbackLemmaBaseInput<Obj, Arr> {
  readonly mode: "compose";
  readonly left: PullbackSquareWitness<Obj, Arr>;
  readonly right: PullbackSquareWitness<Obj, Arr>;
}

interface PullbackLemmaDeriveLeftInput<Obj, Arr> extends PullbackLemmaBaseInput<Obj, Arr> {
  readonly mode: "derive-left";
  readonly outer: PullbackSquareWitness<Obj, Arr>;
  readonly right: PullbackSquareWitness<Obj, Arr>;
}

interface PullbackLemmaDeriveRightInput<Obj, Arr> extends PullbackLemmaBaseInput<Obj, Arr> {
  readonly mode: "derive-right";
  readonly outer: PullbackSquareWitness<Obj, Arr>;
  readonly left: PullbackSquareWitness<Obj, Arr>;
}

export type PullbackLemmaInput<Obj, Arr> =
  | PullbackLemmaComposeInput<Obj, Arr>
  | PullbackLemmaDeriveLeftInput<Obj, Arr>
  | PullbackLemmaDeriveRightInput<Obj, Arr>;

export interface PullbackLemmaResult<Obj, Arr> {
  readonly outer: PullbackSquareWitness<Obj, Arr>;
  readonly left: PullbackSquareWitness<Obj, Arr>;
  readonly right: PullbackSquareWitness<Obj, Arr>;
  readonly mediator: Arr;
  readonly mediatorToRight: Arr;
  readonly outerCertification: PullbackCertification<Obj, Arr>;
  readonly leftCertification: PullbackCertification<Obj, Arr>;
  readonly rightCertification: PullbackCertification<Obj, Arr>;
  readonly factorizations: {
    readonly throughRight: PullbackConeFactorResult<Arr>;
    readonly throughLeft: PullbackConeFactorResult<Arr>;
    readonly outer: PullbackConeFactorResult<Arr>;
  };
}

const ensureUniqueArrow = <Obj, Arr>(
  options: {
    readonly category: FiniteCategory<Obj, Arr> & ArrowFamilies.HasDomCod<Obj, Arr>;
    readonly eq: (left: Arr, right: Arr) => boolean;
    readonly domain: Obj;
    readonly codomain: Obj;
    readonly describe: string;
    readonly predicate: (arrow: Arr) => boolean;
  },
): Arr => {
  const { category, eq, domain, codomain, describe, predicate } = options;
  let found: Arr | undefined;
  for (const arrow of category.arrows) {
    if (category.dom(arrow) !== domain || category.cod(arrow) !== codomain) continue;
    if (!predicate(arrow)) continue;
    if (found && !eq(found, arrow)) {
      throw new Error(`${describe}: multiple arrows satisfy the required equality.`);
    }
    found = found ?? arrow;
  }
  if (found === undefined) {
    throw new Error(`${describe}: no arrow satisfies the required equality.`);
  }
  return found;
};

const checkConeCompatibility = <Obj, Arr>(
  input: {
    readonly category: FiniteCategory<Obj, Arr> & ArrowFamilies.HasDomCod<Obj, Arr>;
    readonly eq: (left: Arr, right: Arr) => boolean;
    readonly span: { readonly left: Arr; readonly right: Arr };
    readonly cone: PullbackData<Obj, Arr>;
  },
): void => {
  const { category, eq, span, cone } = input;
  if (category.dom(cone.toDomain) !== cone.apex) {
    throw new Error("verifyPullbackLemma: cone domain leg must emanate from its apex.");
  }
  if (category.dom(cone.toAnchor) !== cone.apex) {
    throw new Error("verifyPullbackLemma: cone anchor leg must emanate from its apex.");
  }
  if (category.cod(cone.toDomain) !== category.dom(span.left)) {
    throw new Error("verifyPullbackLemma: cone domain leg must target the span's left domain.");
  }
  if (category.cod(cone.toAnchor) !== category.dom(span.right)) {
    throw new Error("verifyPullbackLemma: cone anchor leg must target the span's right domain.");
  }
  const viaDomain = category.compose(span.left, cone.toDomain);
  const viaAnchor = category.compose(span.right, cone.toAnchor);
  if (!eq(viaDomain, viaAnchor)) {
    throw new Error("verifyPullbackLemma: supplied cone does not commute with the outer span.");
  }
};

export const verifyPullbackLemma = <Obj, Arr>(
  input: PullbackLemmaInput<Obj, Arr>,
): PullbackLemmaResult<Obj, Arr> => {
  const { category, eq, calculator, cone } = input;

  let leftSquare: PullbackSquareWitness<Obj, Arr>;
  let rightSquare: PullbackSquareWitness<Obj, Arr>;
  let outerSquare: PullbackSquareWitness<Obj, Arr>;

  if (input.mode === "compose") {
    const { left, right } = input;

    if (!eq(left.span.left, right.pullback.toAnchor)) {
      throw new Error(
        "verifyPullbackLemma: left square's right edge must coincide with the right square's projection to the shared object.",
      );
    }

    const outerSpanRight = category.compose(right.span.right, left.span.right);
    const outerToDomain = category.compose(right.pullback.toDomain, left.pullback.toDomain);

    leftSquare = left;
    rightSquare = right;
    outerSquare = {
      span: { left: right.span.left, right: outerSpanRight },
      pullback: {
        apex: left.pullback.apex,
        toDomain: outerToDomain,
        toAnchor: left.pullback.toAnchor,
      },
    };
  } else if (input.mode === "derive-left") {
    const { outer, right } = input;

    if (!eq(outer.span.left, right.span.left)) {
      throw new Error(
        "verifyPullbackLemma: deriving the left square requires the outer rectangle and right square to share the left span leg.",
      );
    }

    const anchorTarget = category.dom(right.span.right);
    const anchorSource = category.dom(outer.span.right);

    const leftSpanRight = ensureUniqueArrow({
      category,
      eq,
      domain: anchorSource,
      codomain: anchorTarget,
      describe: "verifyPullbackLemma derive-left",
      predicate: (arrow) => {
        const composite = category.compose(right.span.right, arrow);
        return eq(composite, outer.span.right);
      },
    });

    const rightConeAnchor = category.compose(leftSpanRight, outer.pullback.toAnchor);
    const rightCone: PullbackData<Obj, Arr> = {
      apex: outer.pullback.apex,
      toDomain: outer.pullback.toDomain,
      toAnchor: rightConeAnchor,
    };

    const throughRight = calculator.factorCone(right.pullback, rightCone);
    if (!throughRight.factored || throughRight.mediator === undefined) {
      throw new Error(
        throughRight.reason ??
          "verifyPullbackLemma: right pullback square rejected the cone induced by the outer rectangle.",
      );
    }

    const leftSpan = { left: right.pullback.toAnchor, right: leftSpanRight };
    const leftPullback: PullbackData<Obj, Arr> = {
      apex: outer.pullback.apex,
      toDomain: throughRight.mediator,
      toAnchor: outer.pullback.toAnchor,
    };

    const viaDomain = category.compose(leftSpan.left, leftPullback.toDomain);
    const viaAnchor = category.compose(leftSpan.right, leftPullback.toAnchor);
    if (!eq(viaDomain, viaAnchor)) {
      throw new Error(
        "verifyPullbackLemma: reconstructed left square does not commute with the shared span.",
      );
    }

    leftSquare = { span: leftSpan, pullback: leftPullback };
    rightSquare = right;
    outerSquare = outer;
  } else {
    const { outer, left } = input;

    const rightSpanRight = ensureUniqueArrow({
      category,
      eq,
      domain: category.cod(left.span.left),
      codomain: category.cod(outer.span.right),
      describe: "verifyPullbackLemma derive-right",
      predicate: (arrow) => {
        const composite = category.compose(arrow, left.span.right);
        return eq(composite, outer.span.right);
      },
    });

    const rightSpanLeft = outer.span.left;
    const expectedTop = category.compose(rightSpanRight, left.span.left);

    const rightToDomain = ensureUniqueArrow({
      category,
      eq,
      domain: category.cod(left.pullback.toDomain),
      codomain: category.dom(rightSpanLeft),
      describe: "verifyPullbackLemma derive-right top", 
      predicate: (arrow) => {
        const composite = category.compose(rightSpanLeft, arrow);
        return eq(composite, expectedTop);
      },
    });

    const rightSpan = { left: rightSpanLeft, right: rightSpanRight };
    const rightPullback: PullbackData<Obj, Arr> = {
      apex: category.dom(left.span.left),
      toDomain: rightToDomain,
      toAnchor: left.span.left,
    };

    const viaDomain = category.compose(rightSpan.left, rightPullback.toDomain);
    const viaAnchor = category.compose(rightSpan.right, rightPullback.toAnchor);
    if (!eq(viaDomain, viaAnchor)) {
      throw new Error(
        "verifyPullbackLemma: reconstructed right square does not commute with the shared span.",
      );
    }

    leftSquare = left;
    rightSquare = { span: rightSpan, pullback: rightPullback };
    outerSquare = outer;
  }

  const leftCertification = calculator.certify(
    leftSquare.span.left,
    leftSquare.span.right,
    leftSquare.pullback,
  );
  if (!leftCertification.valid) {
    throw new Error(
      leftCertification.reason ??
        "verifyPullbackLemma: supplied or reconstructed left square failed pullback certification.",
    );
  }

  const rightCertification = calculator.certify(
    rightSquare.span.left,
    rightSquare.span.right,
    rightSquare.pullback,
  );
  if (!rightCertification.valid) {
    throw new Error(
      rightCertification.reason ??
        "verifyPullbackLemma: supplied or reconstructed right square failed pullback certification.",
    );
  }

  const outerCertification = calculator.certify(
    outerSquare.span.left,
    outerSquare.span.right,
    outerSquare.pullback,
  );
  if (!outerCertification.valid) {
    throw new Error(
      outerCertification.reason ??
        "verifyPullbackLemma: constructed outer rectangle failed pullback certification.",
    );
  }

  checkConeCompatibility({ category, eq, span: outerSquare.span, cone });

  const coneToShared = category.compose(leftSquare.span.right, cone.toAnchor);
  const throughRight = calculator.factorCone(rightSquare.pullback, {
    apex: cone.apex,
    toDomain: cone.toDomain,
    toAnchor: coneToShared,
  });
  if (!throughRight.factored || throughRight.mediator === undefined) {
    throw new Error(
      throughRight.reason ??
        "verifyPullbackLemma: right pullback failed to factor the cone induced by the outer rectangle.",
    );
  }

  const throughLeft = calculator.factorCone(leftSquare.pullback, {
    apex: cone.apex,
    toDomain: throughRight.mediator,
    toAnchor: cone.toAnchor,
  });
  if (!throughLeft.factored || throughLeft.mediator === undefined) {
    throw new Error(
      throughLeft.reason ??
        "verifyPullbackLemma: left pullback failed to factor the mediator induced by the right square.",
    );
  }

  const outerFactor = calculator.factorCone(outerSquare.pullback, cone);
  if (!outerFactor.factored || outerFactor.mediator === undefined) {
    throw new Error(
      outerFactor.reason ??
        "verifyPullbackLemma: outer rectangle did not provide the universal mediator for the supplied cone.",
    );
  }

  if (!eq(outerFactor.mediator, throughLeft.mediator)) {
    throw new Error(
      "verifyPullbackLemma: outer mediator differs from the composition of inner mediators.",
    );
  }

  const checkToRight = category.compose(leftSquare.pullback.toDomain, throughLeft.mediator);
  if (!eq(checkToRight, throughRight.mediator)) {
    throw new Error(
      "verifyPullbackLemma: composed mediator does not reproduce the factor through the right square.",
    );
  }

  const checkAnchor = category.compose(leftSquare.pullback.toAnchor, throughLeft.mediator);
  if (!eq(checkAnchor, cone.toAnchor)) {
    throw new Error(
      "verifyPullbackLemma: composed mediator does not reproduce the cone's anchor leg.",
    );
  }

  return {
    outer: outerSquare,
    left: leftSquare,
    right: rightSquare,
    mediator: throughLeft.mediator,
    mediatorToRight: throughRight.mediator,
    outerCertification,
    leftCertification,
    rightCertification,
    factorizations: {
      throughRight,
      throughLeft,
      outer: outerFactor,
    },
  };
};
