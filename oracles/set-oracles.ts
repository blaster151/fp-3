import type { AnySet, Coproduct, SetHom, SetObj } from "../set-cat";
import { SetCat } from "../set-cat";
import {
  checkBinaryProductComponentwiseCollapse,
  checkBinaryCoproductComponentwiseCompatibility,
  makeBinaryProductComponentwise,
  makeBinaryCoproductComponentwise,
} from "../category-limits-helpers";

export type OracleReport<TExtra = Record<string, unknown>> = {
  holds: boolean;
  failures: string[];
  details: TExtra;
};

const EMPTY = new Set<never>();
const ONE = new Set([null]);

const homCount = <X, Y>(domain: AnySet<X>, codomain: AnySet<Y>): number =>
  Math.pow(codomain.size, domain.size);

const setHomEquals = <A, B>(f: SetHom<A, B>, g: SetHom<A, B>): boolean => {
  if (f.dom !== g.dom || f.cod !== g.cod) {
    return false;
  }
  for (const value of f.dom) {
    if (!Object.is(f.map(value), g.map(value))) {
      return false;
    }
  }
  return true;
};

type SetHomLike = {
  readonly dom: SetObj<unknown>;
  readonly cod: SetObj<unknown>;
  readonly map: (value: any) => unknown;
};

const forgetSetHom = <A, B>(hom: SetHom<A, B>): SetHomLike => hom as unknown as SetHomLike;

const rememberSetHom = <A, B>(hom: SetHomLike): SetHom<A, B> => hom as unknown as SetHom<A, B>;

const composeSetHomLike = (g: SetHomLike, f: SetHomLike): SetHomLike =>
  forgetSetHom(SetCat.compose(rememberSetHom(g), rememberSetHom(f)));

const eqSetHomLike = (f: SetHomLike, g: SetHomLike): boolean =>
  setHomEquals(rememberSetHom(f), rememberSetHom(g));

const makeProductTuple = <A, B>(
  product: ReturnType<typeof SetCat.product<A, B>>,
) => ({
  object: product.object as SetObj<unknown>,
  projections: [forgetSetHom(product.projections.fst), forgetSetHom(product.projections.snd)] as const,
  tuple: (
    domain: SetObj<unknown>,
    legs: readonly [SetHomLike, SetHomLike],
  ): SetHomLike => {
    if (legs.length !== 2) {
      throw new Error(`Set product tuple expects 2 legs, received ${legs.length}`);
    }
    const [leftLegLike, rightLegLike] = legs;
    const leftLeg = rememberSetHom(leftLegLike) as SetHom<any, A>;
    const rightLeg = rememberSetHom(rightLegLike) as SetHom<any, B>;
    if (leftLeg.dom !== domain || rightLeg.dom !== domain) {
      throw new Error("Set product tuple expects legs with shared domain");
    }
    return forgetSetHom(product.pair(leftLeg, rightLeg));
  },
});

const makeCoproductTuple = <A, B>(
  coproduct: ReturnType<typeof SetCat.coproduct<A, B>>,
) => ({
  object: coproduct.object as SetObj<unknown>,
  injections: [
    forgetSetHom(coproduct.injections.inl),
    forgetSetHom(coproduct.injections.inr),
  ] as const,
  cotuple: (
    codomain: SetObj<unknown>,
    legs: readonly [SetHomLike, SetHomLike],
  ): SetHomLike => {
    if (legs.length !== 2) {
      throw new Error(`Set coproduct cotuple expects 2 legs, received ${legs.length}`);
    }
    const [leftLegLike, rightLegLike] = legs;
    const leftLeg = rememberSetHom(leftLegLike) as SetHom<A, any>;
    const rightLeg = rememberSetHom(rightLegLike) as SetHom<B, any>;
    if (leftLeg.cod !== codomain || rightLeg.cod !== codomain) {
      throw new Error("Set coproduct cotuple expects legs with shared codomain");
    }
    return forgetSetHom(coproduct.copair(leftLeg, rightLeg));
  },
});

// ---------- Product universal property ----------

export type SetProductMediatorWitness<A, B, X> = {
  readonly domain: SetObj<X>;
  readonly legs: readonly [SetHom<X, A>, SetHom<X, B>];
  readonly mediator?: SetHom<X, readonly [A, B]>;
};

export type SetProductComponentwiseWitness<A, B, C, D, X> = {
  readonly targetLeft: SetObj<C>;
  readonly targetRight: SetObj<D>;
  readonly components: readonly [SetHom<A, C>, SetHom<B, D>];
  readonly domain: SetObj<X>;
  readonly legs: readonly [SetHom<X, A>, SetHom<X, B>];
};

type NormalisedProductMediatorWitness = {
  readonly domain: SetObj<unknown>;
  readonly legs: readonly [SetHomLike, SetHomLike];
  readonly mediator?: SetHomLike;
};

type NormalisedProductComponentwiseWitness = {
  readonly targetLeft: SetObj<unknown>;
  readonly targetRight: SetObj<unknown>;
  readonly components: readonly [SetHomLike, SetHomLike];
  readonly domain: SetObj<unknown>;
  readonly legs: readonly [SetHomLike, SetHomLike];
};

export type SetProductWitness<A, B> = {
  readonly left: SetObj<A>;
  readonly right: SetObj<B>;
  readonly mediators: ReadonlyArray<NormalisedProductMediatorWitness>;
  readonly componentwise: ReadonlyArray<NormalisedProductComponentwiseWitness>;
};

export const productWitness = <A, B>(
  left: SetObj<A>,
  right: SetObj<B>,
  options: {
    readonly mediators?: ReadonlyArray<SetProductMediatorWitness<A, B, any>>;
    readonly componentwise?: ReadonlyArray<
      SetProductComponentwiseWitness<A, B, any, any, any>
    >;
  } = {},
): SetProductWitness<A, B> => ({
  left,
  right,
  mediators: (options.mediators ?? []).map((sample) => {
    const domain = sample.domain as SetObj<unknown>;
    const legs = [forgetSetHom(sample.legs[0]), forgetSetHom(sample.legs[1])] as const;
    const mediator = sample.mediator ? forgetSetHom(sample.mediator) : undefined;
    if (mediator) {
      return { domain, legs, mediator } satisfies NormalisedProductMediatorWitness;
    }
    return { domain, legs } satisfies NormalisedProductMediatorWitness;
  }),
  componentwise: (options.componentwise ?? []).map((sample) => ({
    targetLeft: sample.targetLeft as SetObj<unknown>,
    targetRight: sample.targetRight as SetObj<unknown>,
    components: [forgetSetHom(sample.components[0]), forgetSetHom(sample.components[1])],
    domain: sample.domain as SetObj<unknown>,
    legs: [forgetSetHom(sample.legs[0]), forgetSetHom(sample.legs[1])],
  })),
});

type ProductMediatorReport = {
  readonly domainSize: number;
  readonly mediatorMatchesCanonical: boolean;
  readonly leftProjectionPreserved: boolean;
  readonly rightProjectionPreserved: boolean;
};

type ProductComponentwiseReport = {
  readonly domainSize: number;
  readonly collapseMatches: boolean;
};

export const checkProductWitness = <A, B>(
  witness: SetProductWitness<A, B>,
): OracleReport<{
  mediators: ProductMediatorReport[];
  componentwise: ProductComponentwiseReport[];
}> => {
  const product = SetCat.product(witness.left, witness.right);
  const productTuple = makeProductTuple(product);
  const failures: string[] = [];
  const mediatorReports: ProductMediatorReport[] = [];

  witness.mediators.forEach((sample, index) => {
    const [leftLegLike, rightLegLike] = sample.legs;
    const leftLeg = rememberSetHom(leftLegLike) as SetHom<any, A>;
    const rightLeg = rememberSetHom(rightLegLike) as SetHom<any, B>;
    let canonical: SetHom<any, readonly [A, B]> | undefined;
    try {
      canonical = product.pair(leftLeg, rightLeg) as SetHom<any, readonly [A, B]>;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`Mediator sample ${index}: failed to construct canonical pairing (${message})`);
    }

    const mediatorCandidate = sample.mediator
      ? (rememberSetHom(sample.mediator) as SetHom<any, readonly [A, B]>)
      : canonical;
    const mediator = mediatorCandidate as SetHom<any, readonly [A, B]> | undefined;
    if (!mediator) {
      failures.push(`Mediator sample ${index}: no mediator provided and canonical pairing failed`);
      mediatorReports.push({
        domainSize: sample.domain.size,
        mediatorMatchesCanonical: false,
        leftProjectionPreserved: false,
        rightProjectionPreserved: false,
      });
      return;
    }

    let leftProjectionPreserved = false;
    let rightProjectionPreserved = false;
    let mediatorMatchesCanonical = true;

    try {
      const composite = SetCat.compose(product.projections.fst, mediator);
      leftProjectionPreserved = setHomEquals(composite, leftLeg);
      if (!leftProjectionPreserved) {
        failures.push(`Mediator sample ${index}: π₁ ∘ mediator disagrees with the left leg`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`Mediator sample ${index}: composing with π₁ failed (${message})`);
    }

    try {
      const composite = SetCat.compose(product.projections.snd, mediator);
      rightProjectionPreserved = setHomEquals(composite, rightLeg);
      if (!rightProjectionPreserved) {
        failures.push(`Mediator sample ${index}: π₂ ∘ mediator disagrees with the right leg`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`Mediator sample ${index}: composing with π₂ failed (${message})`);
    }

    if (sample.mediator && canonical) {
      mediatorMatchesCanonical = setHomEquals(
        rememberSetHom(sample.mediator) as SetHom<any, readonly [A, B]>,
        canonical,
      );
      if (!mediatorMatchesCanonical) {
        failures.push(`Mediator sample ${index}: provided mediator is not the canonical pairing`);
      }
    }

    mediatorReports.push({
      domainSize: sample.domain.size,
      mediatorMatchesCanonical,
      leftProjectionPreserved,
      rightProjectionPreserved,
    });
  });

  const componentwiseReports: ProductComponentwiseReport[] = [];

  witness.componentwise.forEach((sample, index) => {
    const target = SetCat.product(
      sample.targetLeft as SetObj<any>,
      sample.targetRight as SetObj<any>,
    );
    const targetTuple = makeProductTuple(target);
    let collapseMatches = false;
    try {
      const componentwise = makeBinaryProductComponentwise({
        category: { compose: composeSetHomLike },
        source: productTuple,
        target: targetTuple,
        components: sample.components,
      });
      const holds = checkBinaryProductComponentwiseCollapse({
        category: { compose: composeSetHomLike, eq: eqSetHomLike },
        source: productTuple,
        target: targetTuple,
        componentwise,
        components: sample.components,
        domain: sample.domain,
        legs: sample.legs,
      });
      collapseMatches = holds;
      if (!holds) {
        failures.push(`Componentwise sample ${index}: componentwise arrow fails to collapse with mediators`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`Componentwise sample ${index}: failed to assemble componentwise arrow (${message})`);
    }
    componentwiseReports.push({
      domainSize: sample.domain.size,
      collapseMatches,
    });
  });

  return {
    holds: failures.length === 0,
    failures,
    details: {
      mediators: mediatorReports,
      componentwise: componentwiseReports,
    },
  };
};

// ---------- Coproduct universal property ----------

export type SetCoproductMediatorWitness<A, B, Z> = {
  readonly codomain: SetObj<Z>;
  readonly legs: readonly [SetHom<A, Z>, SetHom<B, Z>];
  readonly mediator?: SetHom<Coproduct<A, B>, Z>;
};

export type SetCoproductComponentwiseWitness<A, B, C, D> = {
  readonly targetLeft: SetObj<C>;
  readonly targetRight: SetObj<D>;
  readonly components: readonly [SetHom<A, C>, SetHom<B, D>];
};

type NormalisedCoproductMediatorWitness = {
  readonly codomain: SetObj<unknown>;
  readonly legs: readonly [SetHomLike, SetHomLike];
  readonly mediator?: SetHomLike;
};

type NormalisedCoproductComponentwiseWitness = {
  readonly targetLeft: SetObj<unknown>;
  readonly targetRight: SetObj<unknown>;
  readonly components: readonly [SetHomLike, SetHomLike];
};

export type SetCoproductWitness<A, B> = {
  readonly left: SetObj<A>;
  readonly right: SetObj<B>;
  readonly mediators: ReadonlyArray<NormalisedCoproductMediatorWitness>;
  readonly componentwise: ReadonlyArray<NormalisedCoproductComponentwiseWitness>;
};

export const coproductWitness = <A, B>(
  left: SetObj<A>,
  right: SetObj<B>,
  options: {
    readonly mediators?: ReadonlyArray<SetCoproductMediatorWitness<A, B, any>>;
    readonly componentwise?: ReadonlyArray<SetCoproductComponentwiseWitness<A, B, any, any>>;
  } = {},
): SetCoproductWitness<A, B> => ({
  left,
  right,
  mediators: (options.mediators ?? []).map((sample) => {
    const codomain = sample.codomain as SetObj<unknown>;
    const legs = [forgetSetHom(sample.legs[0]), forgetSetHom(sample.legs[1])] as const;
    const mediator = sample.mediator ? forgetSetHom(sample.mediator) : undefined;
    if (mediator) {
      return { codomain, legs, mediator } satisfies NormalisedCoproductMediatorWitness;
    }
    return { codomain, legs } satisfies NormalisedCoproductMediatorWitness;
  }),
  componentwise: (options.componentwise ?? []).map((sample) => ({
    targetLeft: sample.targetLeft as SetObj<unknown>,
    targetRight: sample.targetRight as SetObj<unknown>,
    components: [forgetSetHom(sample.components[0]), forgetSetHom(sample.components[1])],
  })),
});

type CoproductMediatorReport = {
  readonly codomainSize: number;
  readonly mediatorMatchesCanonical: boolean;
  readonly leftInjectionRespected: boolean;
  readonly rightInjectionRespected: boolean;
};

type CoproductComponentwiseReport = {
  readonly compatibility: boolean;
};

export const checkCoproductWitness = <A, B>(
  witness: SetCoproductWitness<A, B>,
): OracleReport<{
  mediators: CoproductMediatorReport[];
  componentwise: CoproductComponentwiseReport[];
}> => {
  const coproduct = SetCat.coproduct(witness.left, witness.right);
  const coproductTuple = makeCoproductTuple(coproduct);
  const failures: string[] = [];
  const mediatorReports: CoproductMediatorReport[] = [];

  witness.mediators.forEach((sample, index) => {
    const [leftLegLike, rightLegLike] = sample.legs;
    const leftLeg = rememberSetHom(leftLegLike) as SetHom<A, any>;
    const rightLeg = rememberSetHom(rightLegLike) as SetHom<B, any>;
    let canonical: SetHom<Coproduct<A, B>, unknown> | undefined;
    try {
      canonical = coproduct.copair(leftLeg, rightLeg) as SetHom<Coproduct<A, B>, unknown>;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`Coproduct mediator ${index}: failed to assemble canonical copairing (${message})`);
    }

    const mediatorCandidate = sample.mediator
      ? (rememberSetHom(sample.mediator) as SetHom<Coproduct<A, B>, unknown>)
      : canonical;
    const mediator = mediatorCandidate as SetHom<Coproduct<A, B>, unknown> | undefined;
    if (!mediator) {
      failures.push(`Coproduct mediator ${index}: no mediator provided and canonical copairing failed`);
      mediatorReports.push({
        codomainSize: sample.codomain.size,
        mediatorMatchesCanonical: false,
        leftInjectionRespected: false,
        rightInjectionRespected: false,
      });
      return;
    }

    let leftInjectionRespected = false;
    let rightInjectionRespected = false;
    let mediatorMatchesCanonical = true;

    try {
      const composite = SetCat.compose(mediator as SetHom<any, any>, coproduct.injections.inl);
      leftInjectionRespected = setHomEquals(composite, leftLeg);
      if (!leftInjectionRespected) {
        failures.push(`Coproduct mediator ${index}: mediator ∘ inl disagrees with the left leg`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`Coproduct mediator ${index}: composing with inl failed (${message})`);
    }

    try {
      const composite = SetCat.compose(mediator as SetHom<any, any>, coproduct.injections.inr);
      rightInjectionRespected = setHomEquals(composite, rightLeg);
      if (!rightInjectionRespected) {
        failures.push(`Coproduct mediator ${index}: mediator ∘ inr disagrees with the right leg`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`Coproduct mediator ${index}: composing with inr failed (${message})`);
    }

    if (sample.mediator && canonical) {
      mediatorMatchesCanonical = setHomEquals(
        rememberSetHom(sample.mediator) as SetHom<Coproduct<A, B>, unknown>,
        canonical as SetHom<Coproduct<A, B>, unknown>,
      );
      if (!mediatorMatchesCanonical) {
        failures.push(`Coproduct mediator ${index}: provided mediator is not the canonical copairing`);
      }
    }

    mediatorReports.push({
      codomainSize: sample.codomain.size,
      mediatorMatchesCanonical,
      leftInjectionRespected,
      rightInjectionRespected,
    });
  });

  const componentwiseReports: CoproductComponentwiseReport[] = [];

  witness.componentwise.forEach((sample, index) => {
    const target = SetCat.coproduct(
      sample.targetLeft as SetObj<any>,
      sample.targetRight as SetObj<any>,
    );
    const targetTuple = makeCoproductTuple(target);
    let compatibility = false;
    try {
      const componentwise = makeBinaryCoproductComponentwise({
        category: { compose: composeSetHomLike },
        source: coproductTuple,
        target: targetTuple,
        components: sample.components,
      });
      compatibility = checkBinaryCoproductComponentwiseCompatibility({
        category: { compose: composeSetHomLike, eq: eqSetHomLike },
        source: coproductTuple,
        target: targetTuple,
        componentwise,
        components: sample.components,
      });
      if (!compatibility) {
        failures.push(`Coproduct componentwise ${index}: compatibility with injections failed`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`Coproduct componentwise ${index}: failed to assemble componentwise arrow (${message})`);
    }
    componentwiseReports.push({ compatibility });
  });

  return {
    holds: failures.length === 0,
    failures,
    details: {
      mediators: mediatorReports,
      componentwise: componentwiseReports,
    },
  };
};

// ---------- Unique map from ∅ ----------
export type UniqueFromEmptyWitness<Y> = { Y: AnySet<Y> };

export const uniqueFromEmptyWitness = <Y>(Y: AnySet<Y>): UniqueFromEmptyWitness<Y> => ({ Y });

export const checkUniqueFromEmpty = <Y>(
  witness: UniqueFromEmptyWitness<Y>,
): OracleReport<{ homCount: number }> => {
  const count = homCount(EMPTY, witness.Y);
  const holds = count === 1;
  return {
    holds,
    failures: holds ? [] : [`|Hom(∅,Y)| = ${count}`],
    details: { homCount: count },
  };
};

// ---------- Empty set characterisation ----------
export type EmptyByHomsWitness<E> = {
  E: AnySet<E>;
  nonemptySamples: ReadonlyArray<AnySet<unknown>>;
};

export const emptyByHomsWitness = <E>(
  E: AnySet<E>,
  nonemptySamples: ReadonlyArray<AnySet<unknown>> = [],
): EmptyByHomsWitness<E> => ({ E, nonemptySamples });

export const checkEmptyByHoms = <E>(
  witness: EmptyByHomsWitness<E>,
): OracleReport<{ backwardCounts: Array<{ domainSize: number; homSize: number }> }> => {
  const failures: string[] = [];
  const backwardCounts: Array<{ domainSize: number; homSize: number }> = [];

  if (witness.E.size !== 0) {
    failures.push(`|E| = ${witness.E.size}`);
  }

  witness.nonemptySamples.forEach(sample => {
    if (sample.size === 0) return;
    const homSize = homCount(sample, witness.E);
    backwardCounts.push({ domainSize: sample.size, homSize });
    if (homSize !== 0) {
      failures.push(`Found X with |Hom(X,E)| = ${homSize}`);
    }
  });

  return {
    holds: failures.length === 0,
    failures,
    details: { backwardCounts },
  };
};

// ---------- Singleton characterisation ----------
export type SingletonByHomsWitness<S> = {
  S: AnySet<S>;
  universeSamples: ReadonlyArray<AnySet<unknown>>;
};

export const singletonByHomsWitness = <S>(
  S: AnySet<S>,
  universeSamples: ReadonlyArray<AnySet<unknown>>,
): SingletonByHomsWitness<S> => ({ S, universeSamples });

export const checkSingletonByHoms = <S>(
  witness: SingletonByHomsWitness<S>,
): OracleReport<{ counts: Array<{ domainSize: number; homSize: number }> }> => {
  const failures: string[] = [];
  const counts: Array<{ domainSize: number; homSize: number }> = [];

  if (witness.S.size !== 1) {
    failures.push(`|S| = ${witness.S.size}`);
  }

  witness.universeSamples.forEach(sample => {
    const homSize = homCount(sample, witness.S);
    counts.push({ domainSize: sample.size, homSize });
    if (homSize !== 1) {
      failures.push(`Found X with |Hom(X,S)| = ${homSize}`);
    }
  });

  return {
    holds: failures.length === 0,
    failures,
    details: { counts },
  };
};

// ---------- Elements as arrows ----------
export type ElementsAsArrowsWitness<A> = { A: AnySet<A> };

export const elementsAsArrowsWitness = <A>(
  A: AnySet<A>,
): ElementsAsArrowsWitness<A> => ({ A });

export const checkElementsAsArrows = <A>(
  witness: ElementsAsArrowsWitness<A>,
): OracleReport<{ homCount: number; size: number }> => {
  const count = homCount(ONE, witness.A);
  const size = witness.A.size;
  const holds = count === size;

  return {
    holds,
    failures: holds ? [] : [`|Hom(1,A)| = ${count} but |A| = ${size}`],
    details: { homCount: count, size },
  };
};

export const SetOracles = {
  product: {
    witness: productWitness,
    check: checkProductWitness,
  },
  coproduct: {
    witness: coproductWitness,
    check: checkCoproductWitness,
  },
  uniqueFromEmpty: {
    witness: uniqueFromEmptyWitness,
    check: checkUniqueFromEmpty,
  },
  emptyByHoms: {
    witness: emptyByHomsWitness,
    check: checkEmptyByHoms,
  },
  singletonByHoms: {
    witness: singletonByHomsWitness,
    check: checkSingletonByHoms,
  },
  elementsAsArrows: {
    witness: elementsAsArrowsWitness,
    check: checkElementsAsArrows,
  },
};
