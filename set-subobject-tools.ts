import { CategoryLimits } from "./stdlib/category-limits";
import type { PullbackConeFactorResult, PullbackData } from "./pullback";
import {
  SetCat,
  SetOmega,
  SetTruthArrow,
  ensureSubsetMonomorphism,
  setCharacteristicOfSubset,
  setSubsetFromCharacteristic,
  semanticsAwareEquals,
  semanticsAwareHas,
  type SetHom,
  type SetObj,
} from "./set-cat";
import { SetLaws, type CharacteristicWitness } from "./set-laws";
import { SetPullbacks, equalSetHom } from "./set-pullbacks";

export type AnySetObj = SetObj<unknown>;
export type AnySetHom = SetHom<unknown, unknown>;

const asAnySetHom = <A, B>(hom: SetHom<A, B>): AnySetHom => hom as unknown as AnySetHom;

export interface SetSubobjectWitness {
  readonly subobject: AnySetObj;
  readonly inclusion: AnySetHom;
}

export interface SetSubobjectEnumerationEntry {
  readonly witness: SetSubobjectWitness;
  readonly characteristic: SetHom<unknown, boolean>;
}

export interface SetSubobjectLeqResult {
  readonly holds: boolean;
  readonly mediator?: AnySetHom;
  readonly reason?: string;
}

export interface SetSubobjectIsomorphism {
  readonly forward: AnySetHom;
  readonly backward: AnySetHom;
}

export interface SetSubobjectPartialOrderResult {
  readonly leftLeqRight: SetSubobjectLeqResult;
  readonly rightLeqLeft: SetSubobjectLeqResult;
  readonly isomorphic?: SetSubobjectIsomorphism;
}

export interface SetSubobjectIntersectionWitness {
  readonly pullback: PullbackData<AnySetObj, AnySetHom>;
  readonly intersection: SetSubobjectWitness;
  readonly projections: { readonly left: AnySetHom; readonly right: AnySetHom };
  readonly factorCone: (
    cone: PullbackData<AnySetObj, AnySetHom>,
  ) => PullbackConeFactorResult<AnySetHom>;
}

export interface SetComplementSubobjectWitness {
  readonly complement: SetSubobjectWitness;
  readonly characteristic: AnySetHom;
}

export interface SetMonomorphismEqualizerWitness {
  readonly monomorphism: AnySetHom;
  readonly characteristic: AnySetHom;
  readonly truthComposite: AnySetHom;
  readonly canonical: SetSubobjectWitness;
  readonly canonicalCharacteristicComposite: AnySetHom;
  readonly canonicalTruthComposite: AnySetHom;
  readonly domainCharacteristicComposite: AnySetHom;
  readonly domainTruthComposite: AnySetHom;
  readonly isoToCanonical: { readonly forward: AnySetHom; readonly backward: AnySetHom };
  readonly equalizer: { readonly obj: AnySetObj; readonly equalize: AnySetHom };
  readonly factorCanonical: CategoryLimits.EqualizerFactorizer<AnySetHom>;
  readonly factorMonomorphism: CategoryLimits.EqualizerFactorizer<AnySetHom>;
}

export interface SetMonicEpicIsoWitness {
  readonly forward: AnySetHom;
  readonly backward: AnySetHom;
  readonly equalizer: SetMonomorphismEqualizerWitness;
}

export interface SetMonicEpicIsoResult {
  readonly found: boolean;
  readonly witness?: SetMonicEpicIsoWitness;
  readonly reason?: string;
}

export const listSetSubobjects = <A>(ambient: SetObj<A>): ReadonlyArray<SetSubobjectEnumerationEntry> => {
  const evidence = SetLaws.powerSetEvidence(ambient);
  return evidence.subsets.map((entry: CharacteristicWitness<A>) => ({
    witness: { subobject: entry.subset, inclusion: asAnySetHom(entry.inclusion) },
    characteristic: entry.characteristic as SetHom<unknown, boolean>,
  }));
};

export const setSubobjectIntersection = (
  left: AnySetHom,
  right: AnySetHom,
): SetSubobjectIntersectionWitness => {
  if (left.cod !== right.cod) {
    throw new Error("setSubobjectIntersection: monomorphisms must share a codomain.");
  }

  ensureSubsetMonomorphism(left, "setSubobjectIntersection (left mono)");
  ensureSubsetMonomorphism(right, "setSubobjectIntersection (right mono)");

  const pullback = SetPullbacks.pullback(left, right);
  const certification = SetPullbacks.certify(left, right, pullback);
  if (!certification.valid) {
    throw new Error(
      `setSubobjectIntersection: pullback certification failed: ${
        certification.reason ?? "candidate differs from canonical witness"
      }`,
    );
  }

  const leftComposite = SetCat.compose(left, pullback.toDomain);
  const rightComposite = SetCat.compose(right, pullback.toAnchor);

  if (!equalSetHom(asAnySetHom(leftComposite), asAnySetHom(rightComposite))) {
    throw new Error(
      "setSubobjectIntersection: pullback legs do not agree on the ambient composite.",
    );
  }

  return {
    pullback,
    intersection: { subobject: pullback.apex, inclusion: asAnySetHom(leftComposite) },
    projections: { left: pullback.toDomain, right: pullback.toAnchor },
    factorCone: (cone) => SetPullbacks.factorCone(pullback, cone),
  };
};

export const compareSetSubobjectIntersections = (
  left: AnySetHom,
  right: AnySetHom,
  first: SetSubobjectIntersectionWitness,
  second: SetSubobjectIntersectionWitness,
): SetSubobjectIsomorphism => {
  if (left.cod !== right.cod) {
    throw new Error("compareSetSubobjectIntersections: monomorphisms must share a codomain.");
  }

  ensureSubsetMonomorphism(left, "compareSetSubobjectIntersections (left mono)");
  ensureSubsetMonomorphism(right, "compareSetSubobjectIntersections (right mono)");

  const mediators = SetPullbacks.comparison(left, right, first.pullback, second.pullback);

  const forwardComposite = SetCat.compose(second.intersection.inclusion, mediators.leftToRight);
  if (!equalSetHom(asAnySetHom(forwardComposite), first.intersection.inclusion)) {
    throw new Error(
      "compareSetSubobjectIntersections: forward mediator does not preserve the intersection inclusion.",
    );
  }

  const backwardComposite = SetCat.compose(first.intersection.inclusion, mediators.rightToLeft);
  if (!equalSetHom(asAnySetHom(backwardComposite), second.intersection.inclusion)) {
    throw new Error(
      "compareSetSubobjectIntersections: backward mediator does not preserve the intersection inclusion.",
    );
  }

  const leftRoundTrip = SetCat.compose(mediators.rightToLeft, mediators.leftToRight);
  if (!equalSetHom(asAnySetHom(leftRoundTrip), SetCat.id(first.pullback.apex))) {
    throw new Error(
      "compareSetSubobjectIntersections: mediators are not inverse on the first intersection.",
    );
  }

  const rightRoundTrip = SetCat.compose(mediators.leftToRight, mediators.rightToLeft);
  if (!equalSetHom(asAnySetHom(rightRoundTrip), SetCat.id(second.pullback.apex))) {
    throw new Error(
      "compareSetSubobjectIntersections: mediators are not inverse on the second intersection.",
    );
  }

  return { forward: mediators.leftToRight, backward: mediators.rightToLeft };
};

export const setSubobjectLeq = (lower: AnySetHom, upper: AnySetHom): SetSubobjectLeqResult => {
  if (lower.cod !== upper.cod) {
    return {
      holds: false,
      reason: "setSubobjectLeq: subobjects must share a codomain to compare.",
    };
  }

  ensureSubsetMonomorphism(lower, "setSubobjectLeq (lower)");
  ensureSubsetMonomorphism(upper, "setSubobjectLeq (upper)");

  const upperHas = semanticsAwareHas(upper.dom);

  for (const value of lower.dom) {
    if (!upperHas(value)) {
      return {
        holds: false,
        reason: "setSubobjectLeq: lower subobject does not land in the upper domain.",
      };
    }
  }

  const mediator = SetCat.hom(lower.dom, upper.dom, (value) => value);
  const recomposed = SetCat.compose(upper, mediator);
  if (!equalSetHom(asAnySetHom(recomposed), lower)) {
    return {
      holds: false,
      reason: "setSubobjectLeq: mediator does not reconstruct the lower inclusion.",
    };
  }

  return { holds: true, mediator: asAnySetHom(mediator) };
};

export const setSubobjectPartialOrder = (
  left: AnySetHom,
  right: AnySetHom,
): SetSubobjectPartialOrderResult => {
  const leftLeqRight = setSubobjectLeq(left, right);
  const rightLeqLeft = setSubobjectLeq(right, left);

  if (leftLeqRight.holds && rightLeqLeft.holds) {
    const forward = SetCat.hom(left.dom, right.dom, (value) => value);
    const backward = SetCat.hom(right.dom, left.dom, (value) => value);

    if (!equalSetHom(asAnySetHom(SetCat.compose(backward, forward)), SetCat.id(left.dom))) {
      throw new Error(
        "setSubobjectPartialOrder: mediators are not inverse on the left subobject.",
      );
    }

    if (!equalSetHom(asAnySetHom(SetCat.compose(forward, backward)), SetCat.id(right.dom))) {
      throw new Error(
        "setSubobjectPartialOrder: mediators are not inverse on the right subobject.",
      );
    }

    return {
      leftLeqRight,
      rightLeqLeft,
      isomorphic: { forward: asAnySetHom(forward), backward: asAnySetHom(backward) },
    };
  }

  return { leftLeqRight, rightLeqLeft };
};

export const setIdentitySubobject = (ambient: AnySetObj): SetSubobjectWitness => ({
  subobject: ambient,
  inclusion: asAnySetHom(SetCat.id(ambient)),
});

export const setZeroSubobject = (ambient: AnySetObj): SetSubobjectWitness => {
  const elements = Array.from(ambient).filter(() => false);
  const subsetSemantics = SetCat.createSubsetSemantics(ambient, elements, {
    tag: "SetSubobjectTools.zeroSubobject",
  });
  const empty = SetCat.obj(elements, {
    semantics: subsetSemantics,
  });
  return {
    subobject: empty,
    inclusion: asAnySetHom(SetCat.hom(empty, ambient, (value) => value)),
  };
};

export const setTopSubobject = (ambient: AnySetObj): {
  readonly top: SetSubobjectWitness;
  readonly dominates: (candidate: AnySetHom) => SetSubobjectLeqResult;
} => {
  const top = setIdentitySubobject(ambient);
  const dominates = (candidate: AnySetHom): SetSubobjectLeqResult =>
    setSubobjectLeq(candidate, top.inclusion);
  return { top, dominates };
};

export const setBottomSubobject = (ambient: AnySetObj): {
  readonly bottom: SetSubobjectWitness;
  readonly subordinate: (candidate: AnySetHom) => SetSubobjectLeqResult;
} => {
  const bottom = setZeroSubobject(ambient);
  const subordinate = (candidate: AnySetHom): SetSubobjectLeqResult =>
    setSubobjectLeq(bottom.inclusion, candidate);
  return { bottom, subordinate };
};

const ensureBooleanVerdict: (
  value: unknown,
  context: string,
) => asserts value is boolean = (value, context) => {
  if (value !== true && value !== false) {
    throw new Error(`${context}: characteristic map must return Boolean values.`);
  }
};

export const setCharacteristicComplement = <A>(
  characteristic: SetHom<A, boolean>,
): SetHom<A, boolean> => {
  if (characteristic.cod !== SetOmega) {
    throw new Error("setCharacteristicComplement: characteristic must land in Ω.");
  }

  return SetCat.hom(characteristic.dom, SetOmega, (value) => {
    const verdict = characteristic.map(value);
    ensureBooleanVerdict(verdict, "setCharacteristicComplement");
    return verdict === false;
  });
};

export const setComplementSubobject = (monomorphism: AnySetHom): SetComplementSubobjectWitness => {
  ensureSubsetMonomorphism(monomorphism, "setComplementSubobject");
  const characteristic = setCharacteristicOfSubset(monomorphism as SetHom<unknown, unknown>);
  const complementCharacteristic = setCharacteristicComplement(characteristic);
  const subset = setSubsetFromCharacteristic(complementCharacteristic);
  return {
    complement: { subobject: subset.subset, inclusion: asAnySetHom(subset.inclusion) },
    characteristic: asAnySetHom(complementCharacteristic),
  };
};

interface MonomorphismImageLookup {
  readonly get: (image: unknown) => unknown | undefined;
}

const ensureMonomorphism = (arrow: AnySetHom, context: string): MonomorphismImageLookup => {
  const codHas = semanticsAwareHas(arrow.cod);
  const codEquals = semanticsAwareEquals(arrow.cod);
  const mapping: Array<{ readonly image: unknown; readonly preimage: unknown }> = [];
  for (const value of arrow.dom) {
    const image = arrow.map(value);
    if (!codHas(image)) {
      throw new Error(`${context}: arrow image must belong to the codomain.`);
    }
    if (mapping.some((entry) => codEquals(entry.image, image))) {
      throw new Error(`${context}: arrow fails injectivity.`);
    }
    mapping.push({ image, preimage: value });
  }
  return {
    get: (candidate: unknown) =>
      mapping.find((entry) => codEquals(entry.image, candidate))?.preimage,
  };
};

const characteristicOfMonomorphism = (arrow: AnySetHom): SetHom<unknown, boolean> => {
  const codomain = arrow.cod;
  const codEquals = semanticsAwareEquals(codomain);
  const image: unknown[] = [];
  for (const value of arrow.dom) {
    const mapped = arrow.map(value);
    if (!image.some((candidate) => codEquals(candidate, mapped))) {
      image.push(mapped);
    }
  }
  return SetCat.hom(codomain, SetOmega, (candidate) =>
    image.some((value) => codEquals(value, candidate)),
  );
};

export const setMonomorphismEqualizer = (
  monomorphism: AnySetHom,
): SetMonomorphismEqualizerWitness => {
  const imageToDomain = ensureMonomorphism(monomorphism, "setMonomorphismEqualizer");
  const characteristic = characteristicOfMonomorphism(monomorphism);
  const truthComposite = SetCat.compose(SetTruthArrow, terminalData.terminate(monomorphism.cod));

  const canonical = setSubsetFromCharacteristic(characteristic);
  const canonicalSubset = canonical.subset;

  const canonicalCharacteristicComposite = SetCat.compose(characteristic, canonical.inclusion);
  const canonicalTruthComposite = SetCat.compose(
    SetTruthArrow,
    terminalData.terminate(canonical.subset),
  );

  const domainCharacteristicComposite = SetCat.compose(characteristic, monomorphism);
  const domainTruthComposite = SetCat.compose(
    SetTruthArrow,
    terminalData.terminate(monomorphism.dom),
  );

  const isoForward = SetCat.hom(canonicalSubset, monomorphism.dom, (value) => {
    const preimage = imageToDomain.get(value);
    if (preimage === undefined) {
      throw new Error(
        "setMonomorphismEqualizer: canonical subobject misses a monomorphism image.",
      );
    }
    return preimage;
  });

  const isoBackward = SetCat.hom(monomorphism.dom, canonicalSubset, (value) => monomorphism.map(value));

  const canonicalComposite = SetCat.compose(isoBackward, isoForward);
  if (!equalSetHom(asAnySetHom(canonicalComposite), SetCat.id(canonicalSubset))) {
    throw new Error(
      "setMonomorphismEqualizer: comparison iso must square to the identity on the canonical subobject.",
    );
  }

  const domainComposite = SetCat.compose(isoForward, isoBackward);
  if (!equalSetHom(asAnySetHom(domainComposite), SetCat.id(monomorphism.dom))) {
    throw new Error(
      "setMonomorphismEqualizer: comparison iso must square to the identity on the domain.",
    );
  }

  const transportedCanonical = SetCat.compose(monomorphism, isoForward);
  if (!equalSetHom(asAnySetHom(transportedCanonical), canonical.inclusion)) {
    throw new Error(
      "setMonomorphismEqualizer: comparison iso must transport the canonical inclusion onto the supplied monomorphism.",
    );
  }

  const transportedMonomorphism = SetCat.compose(canonical.inclusion, isoBackward);
  if (!equalSetHom(asAnySetHom(transportedMonomorphism), monomorphism)) {
    throw new Error(
      "setMonomorphismEqualizer: comparison iso must transport the monomorphism onto the canonical inclusion.",
    );
  }

  if (!equalSetHom(asAnySetHom(canonicalCharacteristicComposite), asAnySetHom(canonicalTruthComposite))) {
    throw new Error(
      "setMonomorphismEqualizer: canonical inclusion must equalize the characteristic and the truth composite.",
    );
  }

  if (!equalSetHom(asAnySetHom(domainCharacteristicComposite), asAnySetHom(domainTruthComposite))) {
    throw new Error(
      "setMonomorphismEqualizer: supplied monomorphism must equalize the characteristic and the truth composite.",
    );
  }

  const factorCanonical: CategoryLimits.EqualizerFactorizer<AnySetHom> = ({
    left,
    right,
    inclusion,
    fork,
  }) => {
    try {
      if (!equalSetHom(left, asAnySetHom(characteristic))) {
        return {
          factored: false,
          reason: "setMonomorphismEqualizer: left arrow does not match the characteristic map.",
        };
      }
      if (!equalSetHom(right, asAnySetHom(truthComposite))) {
        return {
          factored: false,
          reason: "setMonomorphismEqualizer: right arrow does not match the ambient truth composite.",
        };
      }
      if (!equalSetHom(inclusion, asAnySetHom(canonical.inclusion))) {
        return {
          factored: false,
          reason: "setMonomorphismEqualizer: inclusion must be the canonical one returned by the helper.",
        };
      }

      const canonicalHas = semanticsAwareHas(canonicalSubset);
      const mediator = SetCat.hom(fork.dom, canonicalSubset, (value) => {
        const image = fork.map(value);
        if (!canonicalHas(image)) {
          throw new Error(
            "setMonomorphismEqualizer: fork lands outside the canonical subobject.",
          );
        }
        return image;
      });

      const recomposed = SetCat.compose(canonical.inclusion, mediator);
      if (!equalSetHom(asAnySetHom(recomposed), fork)) {
        return {
          factored: false,
          reason: "setMonomorphismEqualizer: mediator does not reproduce the supplied fork.",
        };
      }

      return { factored: true, mediator: asAnySetHom(mediator) };
    } catch (error) {
      return {
        factored: false,
        reason:
          error instanceof Error
            ? error.message
            : "setMonomorphismEqualizer: unexpected error while factoring the fork through the canonical equalizer.",
      };
    }
  };

  const factorMonomorphism: CategoryLimits.EqualizerFactorizer<AnySetHom> = ({
    left,
    right,
    inclusion,
    fork,
  }) => {
    try {
      if (!equalSetHom(inclusion, monomorphism)) {
        return {
          factored: false,
          reason: "setMonomorphismEqualizer: inclusion must be the supplied monomorphism.",
        };
      }

      const canonicalAttempt = factorCanonical({
        left,
        right,
        inclusion: asAnySetHom(canonical.inclusion),
        fork,
      });

      if (!canonicalAttempt.factored || !canonicalAttempt.mediator) {
        return canonicalAttempt;
      }

      const mediator = SetCat.compose(isoForward, canonicalAttempt.mediator);
      const recomposed = SetCat.compose(monomorphism, mediator);
      if (!equalSetHom(asAnySetHom(recomposed), fork)) {
        return {
          factored: false,
          reason: "setMonomorphismEqualizer: lifted mediator does not reproduce the supplied fork.",
        };
      }

      return { factored: true, mediator: asAnySetHom(mediator) };
    } catch (error) {
      return {
        factored: false,
        reason:
          error instanceof Error
            ? error.message
            : "setMonomorphismEqualizer: unexpected error while factoring through the supplied monomorphism.",
      };
    }
  };

  return {
    monomorphism,
    characteristic: asAnySetHom(characteristic),
    truthComposite: asAnySetHom(truthComposite),
    canonical: { subobject: canonicalSubset, inclusion: asAnySetHom(canonical.inclusion) },
    canonicalCharacteristicComposite: asAnySetHom(canonicalCharacteristicComposite),
    canonicalTruthComposite: asAnySetHom(canonicalTruthComposite),
    domainCharacteristicComposite: asAnySetHom(domainCharacteristicComposite),
    domainTruthComposite: asAnySetHom(domainTruthComposite),
    isoToCanonical: { forward: asAnySetHom(isoForward), backward: asAnySetHom(isoBackward) },
    equalizer: { obj: canonicalSubset, equalize: asAnySetHom(canonical.inclusion) },
    factorCanonical,
    factorMonomorphism,
  };
};

const terminalData = SetCat.terminal();

export const setMonicEpicIso = (arrow: AnySetHom): SetMonicEpicIsoResult => {
  let imageToDomain: MonomorphismImageLookup;
  try {
    imageToDomain = ensureMonomorphism(arrow, "setMonicEpicIso");
  } catch (error) {
    return {
      found: false,
      reason:
        error instanceof Error
          ? error.message
          : "setMonicEpicIso: arrow must be monic (injective).",
    };
  }

  let equalizer: SetMonomorphismEqualizerWitness;
  try {
    equalizer = setMonomorphismEqualizer(arrow);
  } catch (error) {
    return {
      found: false,
      reason:
        error instanceof Error
          ? error.message
          : "setMonicEpicIso: equalizer construction failed for the supplied monomorphism.",
    };
  }

  if (!equalSetHom(equalizer.characteristic, equalizer.truthComposite)) {
    return {
      found: false,
      reason:
        "setMonicEpicIso: characteristic does not coincide with the ambient truth composite, so the arrow is not epic.",
    };
  }

  const backward = SetCat.hom(arrow.cod, arrow.dom, (value) => {
    const preimage = imageToDomain.get(value);
    if (preimage === undefined) {
      throw new Error("setMonicEpicIso: inverse construction requires surjectivity.");
    }
    return preimage;
  });

  const leftComposite = SetCat.compose(backward, arrow);
  if (!equalSetHom(asAnySetHom(leftComposite), SetCat.id(arrow.dom))) {
    return {
      found: false,
      reason: "setMonicEpicIso: constructed inverse failed the source identity check.",
    };
  }

  const rightComposite = SetCat.compose(arrow, backward);
  if (!equalSetHom(asAnySetHom(rightComposite), SetCat.id(arrow.cod))) {
    return {
      found: false,
      reason: "setMonicEpicIso: constructed inverse failed the target identity check.",
    };
  }

  return { found: true, witness: { forward: arrow, backward: asAnySetHom(backward), equalizer } };
};
