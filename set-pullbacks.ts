import type {
  PullbackCalculator,
  PullbackCertification,
  PullbackComparison,
  PullbackConeFactorResult,
  PullbackData,
} from "./pullback";
import {
  SetCat,
  semanticsAwareEquals,
  semanticsAwareHas,
  type SetCarrierSemantics,
  type SetHom,
  type SetObj,
} from "./set-cat";

const LAZY_PAIR_TAG = "SetPullbackApex";

export type AnySetObj = SetObj<unknown>;
export type AnySetHom = SetHom<unknown, unknown>;

type Pair = readonly [unknown, unknown];

type PairLookup = Map<unknown, Map<unknown, Pair>>;

type SetPullbackMetadata = {
  readonly apex: AnySetObj;
  readonly pairLookup: PairLookup;
  readonly register: (first: unknown, second: unknown) => Pair | undefined;
};

const createPairEquality = (
  domain: AnySetObj,
  anchor: AnySetObj,
): ((left: Pair, right: Pair) => boolean) => {
  const domainEquals = semanticsAwareEquals(domain);
  const anchorEquals = semanticsAwareEquals(anchor);
  return (left: Pair, right: Pair) =>
    domainEquals(left[0], right[0]) && anchorEquals(left[1], right[1]);
};

const metadataByPullback = new WeakMap<PullbackData<AnySetObj, AnySetHom>, SetPullbackMetadata>();

const ensurePairLookup = (
  pullback: PullbackData<AnySetObj, AnySetHom>,
): SetPullbackMetadata => {
  const existing = metadataByPullback.get(pullback);
  if (existing) {
    return existing;
  }

  const pairLookup: PairLookup = new Map();
  for (const value of pullback.apex) {
    const toDomain = pullback.toDomain.map(value);
    const toAnchor = pullback.toAnchor.map(value);
    let bucket = pairLookup.get(toDomain);
    if (!bucket) {
      bucket = new Map();
      pairLookup.set(toDomain, bucket);
    }
    bucket.set(toAnchor, value as Pair);
  }

  const register = (first: unknown, second: unknown): Pair | undefined => {
    const bucket = pairLookup.get(first);
    return bucket?.get(second);
  };

  const metadata: SetPullbackMetadata = {
    apex: pullback.apex,
    pairLookup,
    register,
  };
  metadataByPullback.set(pullback, metadata);
  return metadata;
};

const createLazyApex = (
  domain: AnySetObj,
  anchor: AnySetObj,
  relation: (first: unknown, second: unknown) => boolean,
): { apex: AnySetObj; metadata: SetPullbackMetadata } => {
  const knownPairs = new Set<Pair>();
  const pairLookup: PairLookup = new Map();
  const pairEquals = createPairEquality(domain, anchor);

  const ensureBucket = (first: unknown): Map<unknown, Pair> => {
    let bucket = pairLookup.get(first);
    if (!bucket) {
      bucket = new Map();
      pairLookup.set(first, bucket);
    }
    return bucket;
  };

  const locateRegistered = (first: unknown, second: unknown): Pair | undefined => {
    const bucket = pairLookup.get(first);
    const direct = bucket?.get(second);
    if (direct) {
      return direct;
    }
    for (const candidate of knownPairs) {
      if (pairEquals(candidate, [first, second] as Pair)) {
        ensureBucket(candidate[0]).set(candidate[1], candidate);
        return candidate;
      }
    }
    return undefined;
  };

  const register = (first: unknown, second: unknown): Pair | undefined => {
    const existing = locateRegistered(first, second);
    if (existing) {
      return existing;
    }
    if (!relation(first, second)) {
      return undefined;
    }
    const pair = Object.freeze([first, second]) as Pair;
    ensureBucket(first).set(second, pair);
    knownPairs.add(pair);
    return pair;
  };

  const semantics: SetCarrierSemantics<Pair> = {
    iterate: function* iterate(): IterableIterator<Pair> {
      for (const pair of knownPairs) {
        yield pair;
      }
    },
    has: (candidate) => {
      if (!Array.isArray(candidate) || candidate.length !== 2) {
        return false;
      }
      const [first, second] = candidate as Pair;
      const registered = register(first, second);
      return registered !== undefined && pairEquals(registered, candidate as Pair);
    },
    equals: pairEquals,
    tag: LAZY_PAIR_TAG,
  };

  const apex = SetCat.lazyObj<Pair>({ semantics });

  const metadata: SetPullbackMetadata = {
    apex,
    pairLookup,
    register,
  };

  return { apex, metadata };
};

const collectCanonicalPairs = (
  domain: AnySetObj,
  anchor: AnySetObj,
  relation: (first: unknown, second: unknown) => boolean,
): { apex: AnySetObj; metadata: SetPullbackMetadata } => {
  const knownPairs: Pair[] = [];
  const pairLookup: PairLookup = new Map();
  const pairEquals = createPairEquality(domain, anchor);

  for (const first of domain) {
    const bucket = (() => {
      let existing = pairLookup.get(first);
      if (existing) {
        return existing;
      }
      existing = new Map();
      pairLookup.set(first, existing);
      return existing;
    })();
    for (const second of anchor) {
      if (!relation(first, second)) {
        continue;
      }
      const pair = Object.freeze([first, second]) as Pair;
      bucket.set(second, pair);
      knownPairs.push(pair);
    }
  }

  const semantics = SetCat.createMaterializedSemantics(knownPairs, {
    equals: pairEquals,
    tag: "SetPullbacks.canonicalApex",
  });
  const apex = SetCat.obj(knownPairs, { semantics });
  const ensureBucket = (first: unknown): Map<unknown, Pair> => {
    let bucket = pairLookup.get(first);
    if (!bucket) {
      bucket = new Map();
      pairLookup.set(first, bucket);
    }
    return bucket;
  };

  const register = (first: unknown, second: unknown): Pair | undefined => {
    const bucket = pairLookup.get(first);
    const direct = bucket?.get(second);
    if (direct) {
      return direct;
    }
    for (const candidate of apex) {
      const pair = candidate as Pair;
      if (pairEquals(pair, [first, second] as Pair)) {
        ensureBucket(pair[0]).set(pair[1], pair);
        return pair;
      }
    }
    return undefined;
  };

  const metadata: SetPullbackMetadata = {
    apex,
    pairLookup,
    register,
  };

  return { apex, metadata };
};

const equalHom = (left: AnySetHom, right: AnySetHom): boolean => {
  if (left.dom !== right.dom || left.cod !== right.cod) {
    return false;
  }
  const codEquals = semanticsAwareEquals(left.cod);
  for (const value of left.dom) {
    const leftImage = left.map(value);
    const rightImage = right.map(value);
    if (!codEquals(leftImage, rightImage)) {
      return false;
    }
  }
  return true;
};

const buildCanonicalPullback = (
  f: AnySetHom,
  h: AnySetHom,
): { pullback: PullbackData<AnySetObj, AnySetHom>; metadata: SetPullbackMetadata } => {
  const domain = f.dom;
  const anchor = h.dom;
  const domainHas = semanticsAwareHas(domain);
  const anchorHas = semanticsAwareHas(anchor);
  const codEquals = semanticsAwareEquals(f.cod as AnySetObj);

  const relation = (first: unknown, second: unknown): boolean => {
    if (!domainHas(first) || !anchorHas(second)) {
      return false;
    }
    const left = f.map(first);
    const right = h.map(second);
    return codEquals(left, right);
  };

  const domainCard = SetCat.knownFiniteCardinality(domain);
  const anchorCard = SetCat.knownFiniteCardinality(anchor);

  if (domainCard !== undefined && anchorCard !== undefined) {
    const { apex, metadata } = collectCanonicalPairs(domain, anchor, relation);
    const toDomain = SetCat.hom(apex, domain, (pair) => (pair as Pair)[0]);
    const toAnchor = SetCat.hom(apex, anchor, (pair) => (pair as Pair)[1]);
    const pullback = { apex, toDomain, toAnchor };
    metadataByPullback.set(pullback, metadata);
    return { pullback, metadata };
  }

  const { apex, metadata } = createLazyApex(domain, anchor, relation);
  const toDomain = SetCat.hom(apex, domain, (pair) => (pair as Pair)[0]);
  const toAnchor = SetCat.hom(apex, anchor, (pair) => (pair as Pair)[1]);
  const pullback = { apex, toDomain, toAnchor };
  metadataByPullback.set(pullback, metadata);
  return { pullback, metadata };
};

const factorCone = (
  target: PullbackData<AnySetObj, AnySetHom>,
  cone: PullbackData<AnySetObj, AnySetHom>,
): PullbackConeFactorResult<AnySetHom> => {
  if (cone.toDomain.dom !== cone.apex || cone.toAnchor.dom !== cone.apex) {
    return {
      factored: false,
      reason: "SetPullbacks.factorCone: cone legs must originate at their apex.",
    };
  }
  const targetMetadata = ensurePairLookup(target);

  const mapping = new Map<unknown, Pair>();

  for (const value of cone.apex) {
    const domainImage = cone.toDomain.map(value);
    const anchorImage = cone.toAnchor.map(value);
    const pair = targetMetadata.register(domainImage, anchorImage);
    if (!pair) {
      return {
        factored: false,
        reason: "SetPullbacks.factorCone: cone legs do not land in the pullback relation.",
      };
    }
    mapping.set(value, pair);
  }

  const mediator = SetCat.hom(cone.apex, target.apex, (value) => {
    const pair = mapping.get(value);
    if (!pair) {
      throw new Error("SetPullbacks.factorCone: missing mediator image for apex element.");
    }
    return pair;
  });

  const leftComposite = SetCat.compose(target.toDomain, mediator);
  const rightComposite = cone.toDomain;
  if (!equalHom(leftComposite, rightComposite)) {
    return {
      factored: false,
      reason: "SetPullbacks.factorCone: mediated domain leg does not reproduce the cone.",
    };
  }

  const anchorComposite = SetCat.compose(target.toAnchor, mediator);
  if (!equalHom(anchorComposite, cone.toAnchor)) {
    return {
      factored: false,
      reason: "SetPullbacks.factorCone: mediated anchor leg does not reproduce the cone.",
    };
  }

  return { factored: true, mediator };
};

const certify = (
  f: AnySetHom,
  h: AnySetHom,
  candidate: PullbackData<AnySetObj, AnySetHom>,
): PullbackCertification<AnySetObj, AnySetHom> => {
  if (candidate.toDomain.dom !== candidate.apex) {
    return {
      valid: false,
      reason: "SetPullbacks.certify: domain leg must originate at the candidate apex.",
      conesChecked: [],
    };
  }
  if (candidate.toAnchor.dom !== candidate.apex) {
    return {
      valid: false,
      reason: "SetPullbacks.certify: anchor leg must originate at the candidate apex.",
      conesChecked: [],
    };
  }

  const domainSource = f.dom;
  const anchorSource = h.dom;

  if (candidate.toDomain.cod !== domainSource) {
    return {
      valid: false,
      reason: "SetPullbacks.certify: domain leg must land in dom(f).",
      conesChecked: [],
    };
  }
  if (candidate.toAnchor.cod !== anchorSource) {
    return {
      valid: false,
      reason: "SetPullbacks.certify: anchor leg must land in dom(h).",
      conesChecked: [],
    };
  }

  const domainComposite = SetCat.compose(f, candidate.toDomain);
  const anchorComposite = SetCat.compose(h, candidate.toAnchor);
  if (!equalHom(domainComposite, anchorComposite)) {
    return {
      valid: false,
      reason: "SetPullbacks.certify: candidate square does not commute with the span.",
      conesChecked: [],
    };
  }

  const { pullback: canonical } = buildCanonicalPullback(f, h);
  const conesChecked = [canonical];

  const candidateToCanonical = factorCone(canonical, candidate);
  if (!candidateToCanonical.factored || !candidateToCanonical.mediator) {
    return {
      valid: false,
      reason:
        candidateToCanonical.reason ??
        "SetPullbacks.certify: candidate does not factor through the canonical witness.",
      conesChecked,
    };
  }

  const canonicalToCandidate = factorCone(candidate, canonical);
  if (!canonicalToCandidate.factored || !canonicalToCandidate.mediator) {
    return {
      valid: false,
      reason:
        canonicalToCandidate.reason ??
        "SetPullbacks.certify: canonical witness does not factor through the candidate.",
      conesChecked,
    };
  }

  const canonicalRoundTrip = SetCat.compose(
    candidateToCanonical.mediator,
    canonicalToCandidate.mediator,
  );
  if (!equalHom(canonicalRoundTrip, SetCat.id(canonical.apex))) {
    return {
      valid: false,
      reason: "SetPullbacks.certify: factorisation does not reduce to the identity on the canonical apex.",
      conesChecked,
    };
  }

  const candidateRoundTrip = SetCat.compose(
    canonicalToCandidate.mediator,
    candidateToCanonical.mediator,
  );
  if (!equalHom(candidateRoundTrip, SetCat.id(candidate.apex))) {
    return {
      valid: false,
      reason: "SetPullbacks.certify: factorisation does not reduce to the identity on the candidate apex.",
      conesChecked,
    };
  }

  return {
    valid: true,
    conesChecked,
    mediators: [candidateToCanonical.mediator, canonicalToCandidate.mediator],
  };
};

const pullback = (
  f: AnySetHom,
  h: AnySetHom,
): PullbackData<AnySetObj, AnySetHom> => buildCanonicalPullback(f, h).pullback;

const comparison = (
  f: AnySetHom,
  h: AnySetHom,
  left: PullbackData<AnySetObj, AnySetHom>,
  right: PullbackData<AnySetObj, AnySetHom>,
): PullbackComparison<AnySetHom> => {
  const leftFactor = factorCone(right, left);
  if (!leftFactor.factored || !leftFactor.mediator) {
    throw new Error(
      leftFactor.reason ?? "SetPullbacks.comparison: unable to factor left witness through right.",
    );
  }
  const rightFactor = factorCone(left, right);
  if (!rightFactor.factored || !rightFactor.mediator) {
    throw new Error(
      rightFactor.reason ?? "SetPullbacks.comparison: unable to factor right witness through left.",
    );
  }
  return { leftToRight: leftFactor.mediator, rightToLeft: rightFactor.mediator };
};

const induce = (
  j: AnySetHom,
  pullbackOfF: PullbackData<AnySetObj, AnySetHom>,
  pullbackOfG: PullbackData<AnySetObj, AnySetHom>,
): AnySetHom => {
  const mapping = new Map<unknown, Pair>();
  const metadata = ensurePairLookup(pullbackOfG);

  for (const value of pullbackOfF.apex) {
    const domainImage = pullbackOfF.toDomain.map(value);
    const transportedDomain = j.map(domainImage);
    const anchorImage = pullbackOfF.toAnchor.map(value);
    const pair = metadata.register(transportedDomain, anchorImage);
    if (!pair) {
      throw new Error("SetPullbacks.induce: mediator data does not land in the target pullback.");
    }
    mapping.set(value, pair);
  }

  return SetCat.hom(pullbackOfF.apex, pullbackOfG.apex, (value) => {
    const pair = mapping.get(value);
    if (!pair) {
      throw new Error("SetPullbacks.induce: missing mediator image for apex element.");
    }
    return pair;
  });
};

const transportPullback = (
  f: AnySetHom,
  h: AnySetHom,
  source: PullbackData<AnySetObj, AnySetHom>,
  iso: { forward: AnySetHom; inverse: AnySetHom },
  candidate: PullbackData<AnySetObj, AnySetHom>,
): PullbackData<AnySetObj, AnySetHom> => {
  const forward = iso.forward;
  const inverse = iso.inverse;

  if (forward.dom !== source.apex || inverse.dom !== candidate.apex) {
    throw new Error("SetPullbacks.transportPullback: iso arrows must map between apex objects.");
  }
  if (forward.cod !== candidate.apex || inverse.cod !== source.apex) {
    throw new Error("SetPullbacks.transportPullback: iso arrows must land in the expected apex objects.");
  }

  const forwardThenInverse = SetCat.compose(inverse, forward);
  if (!equalHom(forwardThenInverse, SetCat.id(source.apex))) {
    throw new Error("SetPullbacks.transportPullback: supplied arrows are not inverse on the source apex.");
  }

  const inverseThenForward = SetCat.compose(forward, inverse);
  if (!equalHom(inverseThenForward, SetCat.id(candidate.apex))) {
    throw new Error(
      "SetPullbacks.transportPullback: supplied arrows are not inverse on the candidate apex.",
    );
  }

  const transportedDomain = SetCat.compose(candidate.toDomain, forward);
  if (!equalHom(transportedDomain, source.toDomain)) {
    throw new Error(
      "SetPullbacks.transportPullback: iso forward does not preserve the domain projection.",
    );
  }

  const transportedAnchor = SetCat.compose(candidate.toAnchor, forward);
  if (!equalHom(transportedAnchor, source.toAnchor)) {
    throw new Error(
      "SetPullbacks.transportPullback: iso forward does not preserve the anchor projection.",
    );
  }

  const certification = certify(f, h, candidate);
  if (!certification.valid) {
    throw new Error(
      certification.reason ??
        "SetPullbacks.transportPullback: transported candidate failed pullback certification.",
    );
  }

  return candidate;
};

export const SetPullbacks: PullbackCalculator<AnySetObj, AnySetHom> = {
  pullback,
  factorCone,
  certify,
  induce,
  comparison,
  transportPullback,
};

export { equalHom as equalSetHom };

