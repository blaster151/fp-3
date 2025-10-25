import { CategoryLimits } from "./stdlib/category-limits";
import { finsetFactorThroughEqualizer } from "./finset-equalizers";
import type { PullbackCalculator, PullbackConeFactorResult, PullbackCertification, PullbackData } from "./pullback";
import { makePullbackFromProductsAndEqualizers, productFromPullbacks } from "./pullback";
import type { FinSetMor, FinSetObj } from "./src/all/triangulated";

interface FinSetStructure {
  readonly dom: (arrow: FinSetMor) => FinSetObj;
  readonly cod: (arrow: FinSetMor) => FinSetObj;
  readonly compose: (g: FinSetMor, f: FinSetMor) => FinSetMor;
  readonly id: (object: FinSetObj) => FinSetMor;
  readonly equalMor?: (left: FinSetMor, right: FinSetMor) => boolean;
  readonly equalizer: (
    left: FinSetMor,
    right: FinSetMor,
  ) => { readonly obj: FinSetObj; readonly equalize: FinSetMor };
  readonly terminal: { readonly terminate: (object: FinSetObj) => FinSetMor };
  readonly terminalObj: FinSetObj;
  readonly product: (objects: readonly FinSetObj[]) => {
    readonly obj: FinSetObj;
    readonly projections: ReadonlyArray<FinSetMor>;
  };
}

export interface FinSetPullbackDependencies {
  readonly FinSet: FinSetStructure;
  readonly FinSetTruthArrow: FinSetMor;
  readonly FinSetTruthValues: FinSetObj;
}

let finsetDependencies: FinSetPullbackDependencies | undefined;

export const configureFinSetPullbacks = (dependencies: FinSetPullbackDependencies): void => {
  finsetDependencies = dependencies;
};

const requireFinSetDependencies = (): FinSetPullbackDependencies => {
  if (!finsetDependencies) {
    throw new Error("finset-pullback: FinSet dependencies have not been configured.");
  }
  return finsetDependencies;
};

const getFinSet = (): FinSetStructure => requireFinSetDependencies().FinSet;
const getFinSetTruthArrow = (): FinSetMor => requireFinSetDependencies().FinSetTruthArrow;
const getFinSetTruthValues = (): FinSetObj => requireFinSetDependencies().FinSetTruthValues;

let finsetTruthPullbacksInstance: PullbackCalculator<FinSetObj, FinSetMor> | undefined;

const getFinsetTruthPullbacks = (): PullbackCalculator<FinSetObj, FinSetMor> => {
  if (!finsetTruthPullbacksInstance) {
    finsetTruthPullbacksInstance = makeFinSetPullbackCalculator();
  }
  return finsetTruthPullbacksInstance;
};

const finsetObjEquals = (left: FinSetObj, right: FinSetObj): boolean => {
  if (left === right) return true;
  if (left.elements.length !== right.elements.length) return false;

  return left.elements.every((value, index) => {
    const candidate = right.elements[index];
    if (Array.isArray(value) && Array.isArray(candidate)) {
      return (
        value.length === candidate.length &&
        value.every((entry, entryIndex) => entry === candidate[entryIndex])
      );
    }
    return value === candidate;
  });
};

const finsetMorEq = (left: FinSetMor, right: FinSetMor): boolean =>
  finsetObjEquals(left.from, right.from) &&
  finsetObjEquals(left.to, right.to) &&
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
  const FinSet = getFinSet();
  const verdict = FinSet.equalMor?.(left, right);
  if (verdict === true) {
    return true;
  }
  if (verdict === false) {
    return finsetMorEq(left, right);
  }
  return finsetMorEq(left, right);
};

export const makeFinSetPullbackCalculator = (): PullbackCalculator<FinSetObj, FinSetMor> => {
  const FinSet = getFinSet();
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
    if (!finsetObjEquals(candidate.apex, witness.equalizer.obj)) {
      return { valid: false, reason: "FinSet pullback certification: apex differs from the canonical equalizer." };
    }
    if (!ensureFinSetEqual(candidate.toDomain, witness.pullback.toDomain)) {
      return { valid: false, reason: "FinSet pullback certification: domain leg differs from the canonical factor." };
    }
    if (!ensureFinSetEqual(candidate.toAnchor, witness.pullback.toAnchor)) {
      return { valid: false, reason: "FinSet pullback certification: anchor leg differs from the canonical factor." };
    }
    const equalizer = {
      obj: candidate.apex,
      equalize: {
        from: candidate.apex,
        to: witness.equalizer.equalize.to,
        map: [...witness.equalizer.equalize.map],
      },
    } as const;
    const metadata: FinSetPullbackMetadata = {
      span: witness.span,
      product: witness.product,
      equalizer,
      tuple: witness.tuple,
      pullback: candidate,
    };
    return { valid: true, metadata };
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

export const finsetCharacteristicPullback = (
  characteristic: FinSetMor,
  target?: FinSetMor,
): FinSetCharacteristicPullbackWitness => {
  const FinSet = getFinSet();
  const FinSetTruthValues = getFinSetTruthValues();
  const FinSetTruthArrow = getFinSetTruthArrow();
  const evaluationTarget = target ?? FinSetTruthArrow;

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

  if (evaluationTarget.to !== FinSetTruthValues) {
    throw new Error("finsetCharacteristicPullback: target arrow must land in the truth-value object.");
  }

  if (evaluationTarget.from !== FinSet.terminalObj) {
    throw new Error("finsetCharacteristicPullback: target arrow must originate at the FinSet terminal object.");
  }

  if (evaluationTarget.map.length !== evaluationTarget.from.elements.length) {
    throw new Error(
      "finsetCharacteristicPullback: target arrow must enumerate every element of the terminal object.",
    );
  }

  const targetIndex = evaluationTarget.map[0]!;

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

  const truthPullbacks = getFinsetTruthPullbacks();
  const pullback = truthPullbacks.pullback(characteristic, evaluationTarget);

  if (pullback.toDomain.to !== characteristic.from) {
    throw new Error(
      "finsetCharacteristicPullback: pullback domain leg does not target the characteristic domain.",
    );
  }

  if (pullback.toAnchor.to !== evaluationTarget.from) {
    throw new Error(
      "finsetCharacteristicPullback: pullback anchor leg does not target the supplied terminal object.",
    );
  }

  const characteristicComposite = FinSet.compose(characteristic, pullback.toDomain);
  const truthComposite = FinSet.compose(evaluationTarget, pullback.toAnchor);
  const squareCommutes = ensureFinSetEqual(characteristicComposite, truthComposite);
  if (!squareCommutes) {
    throw new Error(
      "finsetCharacteristicPullback: canonical pullback square fails to commute with the target arrow.",
    );
  }

  const certification = truthPullbacks.certify(characteristic, evaluationTarget, pullback);
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
    factorCone: (cone) => truthPullbacks.factorCone(pullback, cone),
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
  const FinSet = getFinSet();
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
