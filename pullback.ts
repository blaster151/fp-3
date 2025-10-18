import type { Category } from "./stdlib/category";
import { ArrowFamilies } from "./stdlib/arrow-families";
import { CategoryLimits } from "./stdlib/category-limits";
import type { FiniteCategory } from "./finite-cat";

export interface PullbackData<Obj, Arr> {
  readonly apex: Obj;
  readonly toDomain: Arr;
  readonly toAnchor: Arr;
}

export interface PullbackComparison<Arr> {
  readonly leftToRight: Arr;
  readonly rightToLeft: Arr;
}

export interface PullbackCertification<Obj, Arr> {
  readonly valid: boolean;
  readonly reason?: string;
  readonly conesChecked: ReadonlyArray<PullbackData<Obj, Arr>>;
}

export interface PullbackCalculator<Obj, Arr> {
  pullback(f: Arr, h: Arr): PullbackData<Obj, Arr>;
  certify(f: Arr, h: Arr, candidate: PullbackData<Obj, Arr>): PullbackCertification<Obj, Arr>;
  induce(j: Arr, pullbackOfF: PullbackData<Obj, Arr>, pullbackOfG: PullbackData<Obj, Arr>): Arr;
  comparison(
    f: Arr,
    h: Arr,
    left: PullbackData<Obj, Arr>,
    right: PullbackData<Obj, Arr>
  ): PullbackComparison<Arr>;
}

export function makeFinitePullbackCalculator<Obj, Arr>(
  base: FiniteCategory<Obj, Arr>
): PullbackCalculator<Obj, Arr> {
  const factorPullbackCone = (
    target: PullbackData<Obj, Arr>,
    cone: PullbackData<Obj, Arr>
  ): { found: true; mediator: Arr } | { found: false; reason: string } => {
    let mediator: Arr | undefined;
    for (const arrow of base.arrows) {
      if (base.src(arrow) !== cone.apex || base.dst(arrow) !== target.apex) continue;
      const domainLeg = base.compose(target.toDomain, arrow);
      if (!base.eq(domainLeg, cone.toDomain)) continue;
      const anchorLeg = base.compose(target.toAnchor, arrow);
      if (!base.eq(anchorLeg, cone.toAnchor)) continue;
      if (mediator && !base.eq(mediator, arrow)) {
        return {
          found: false,
          reason: "Multiple mediating arrows satisfy the pullback conditions.",
        };
      }
      mediator = mediator ?? arrow;
    }
    if (mediator === undefined) {
      return { found: false, reason: "No mediating arrow satisfies the pullback conditions." };
    }
    return { found: true, mediator: mediator as Arr };
  };

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

    for (const cone of cones) {
      const result = factorPullbackCone(candidate, cone);
      if (!result.found) {
        return {
          valid: false,
          reason:
            result.reason ??
            "Pullback certification: a cone does not factor uniquely through the candidate apex.",
          conesChecked: cones,
        };
      }
    }

    return { valid: true, conesChecked: cones };
  };

  const pullback = (f: Arr, h: Arr): PullbackData<Obj, Arr> => {
    const cones = enumerateCones(f, h);

    for (const candidate of cones) {
      const certification = certifyInternal(f, h, candidate, cones);
      if (certification.valid) {
        return candidate;
      }
    }

    throw new Error("No pullback found for the supplied arrows.");
  };

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
    const mediators: Arr[] = [];
    arrowLoop: for (const candidate of base.arrows) {
      if (base.src(candidate) !== pullbackOfF.apex || base.dst(candidate) !== pullbackOfG.apex) continue;
      const leftDomain = base.compose(pullbackOfG.toDomain, candidate);
      const rightDomain = base.compose(j, pullbackOfF.toDomain);
      if (!base.eq(leftDomain, rightDomain)) continue;
      const leftAnchor = base.compose(pullbackOfG.toAnchor, candidate);
      if (!base.eq(leftAnchor, pullbackOfF.toAnchor)) continue;
      for (const existing of mediators) {
        if (base.eq(existing, candidate)) {
          continue arrowLoop;
        }
      }
      mediators.push(candidate);
    }
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

  return { pullback, certify, induce, comparison };
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

    const mediator = calculator.induce(category.id(leftObj), cone, pullback);

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
