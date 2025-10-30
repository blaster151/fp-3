import type { Semiring } from "../allTS";
import {
  createFiniteIndexedFamily,
  createReplayableIterable,
  createReplayableIterableFromArray,
  materializeIndexedFamily,
  sliceLazyIterable,
  type LazyReplayableIterable,
  type LazySliceResult,
  type MaterializeIndexedFamilyResult,
} from "./mnne-infinite-support";

const boolOrAndSemiring: Semiring<boolean> = {
  add: (left, right) => left || right,
  zero: false,
  mul: (left, right) => left && right,
  one: true,
  eq: (left, right) => left === right,
};

export type Vector<R> = ReadonlyArray<R>;

export interface FiniteSemiring<R> extends Semiring<R> {
  readonly elements: ReadonlyArray<R>;
}

export const FiniteSemiringBoolOrAnd: FiniteSemiring<boolean> = {
  ...boolOrAndSemiring,
  elements: [false, true],
};

const defaultEquals = <R>(semiring: Semiring<R>) =>
  semiring.eq ?? ((left: R, right: R) => left === right);

const vectorEquals = <R>(
  semiring: Semiring<R>,
  left: Vector<R>,
  right: Vector<R>,
): boolean => {
  if (left.length !== right.length) {
    return false;
  }
  const equals = defaultEquals(semiring);
  for (let index = 0; index < left.length; index += 1) {
    if (!equals(left[index]!, right[index]!)) {
      return false;
    }
  }
  return true;
};

const enumerateVectors = <R>(
  semiring: FiniteSemiring<R>,
  dimension: number,
): Vector<R>[] => {
  if (dimension === 0) {
    return [Object.freeze([] as R[]) as Vector<R>];
  }
  const results: R[][] = [];
  const { elements } = semiring;
  if (elements.length === 0) {
    throw new Error("Finite semiring must enumerate at least one element.");
  }
  const build = (prefix: R[], depth: number) => {
    if (depth === dimension) {
      results.push([...prefix]);
      return;
    }
    for (const element of elements) {
      prefix.push(element);
      build(prefix, depth + 1);
      prefix.pop();
    }
  };
  build([], 0);
  return results.map((vector) => Object.freeze([...vector]) as Vector<R>);
};

const enumerateArrows = <R>(
  semiring: FiniteSemiring<R>,
  domain: number,
  codomain: number,
): ReadonlyArray<ReadonlyArray<Vector<R>>> => {
  if (domain === 0) {
    return [Object.freeze([] as Vector<R>[]) as ReadonlyArray<Vector<R>>];
  }
  const codomainVectors = enumerateVectors(semiring, codomain);
  const results: Vector<R>[][] = [];
  const build = (prefix: Vector<R>[], depth: number) => {
    if (depth === domain) {
      results.push(prefix.map((entry) => Object.freeze([...entry])));
      return;
    }
    for (const vector of codomainVectors) {
      prefix.push(vector);
      build(prefix, depth + 1);
      prefix.pop();
    }
  };
  build([], 0);
  return results.map((arrow) =>
    Object.freeze([...arrow]) as ReadonlyArray<Vector<R>>,
  );
};

export const canonicalBasisVector = <R>(
  semiring: FiniteSemiring<R>,
  dimension: number,
  index: number,
): Vector<R> => {
  if (index < 0 || index >= dimension) {
    throw new Error(`Basis index ${index} out of range for dimension ${dimension}.`);
  }
  return Object.freeze(
    Array.from({ length: dimension }, (_, position) =>
      position === index ? semiring.one : semiring.zero,
    ),
  ) as Vector<R>;
};

export const canonicalExtendVector = <R>(
  semiring: FiniteSemiring<R>,
  domain: number,
  codomain: number,
  arrow: ReadonlyArray<Vector<R>>,
  vector: Vector<R>,
): Vector<R> => {
  if (arrow.length !== domain) {
    throw new Error(
      `Expected arrow for domain ${domain}, received length ${arrow.length}.`,
    );
  }
  if (vector.length !== domain) {
    throw new Error(
      `Vector length ${vector.length} incompatible with domain ${domain}.`,
    );
  }
  const result = Array.from({ length: codomain }, () => semiring.zero);
  for (let source = 0; source < domain; source += 1) {
    const coefficient = vector[source]!;
    const column = arrow[source]!;
    if (column.length !== codomain) {
      throw new Error(
        `Arrow component ${source} expected codomain ${codomain}, received ${column.length}.`,
      );
    }
    for (let target = 0; target < codomain; target += 1) {
      const contribution = semiring.mul(coefficient, column[target]!);
      const updated = semiring.add(result[target]!, contribution);
      result[target] = updated;
    }
  }
  return Object.freeze(result) as Vector<R>;
};

export interface FiniteVectorRelativeMonadWitness<R> {
  readonly semiring: FiniteSemiring<R>;
  readonly dimensions: ReadonlyArray<number>;
  readonly customUnit?: (
    semiring: FiniteSemiring<R>,
    dimension: number,
    index: number,
  ) => Vector<R>;
  readonly customExtend?: (
    semiring: FiniteSemiring<R>,
    domain: number,
    codomain: number,
    arrow: ReadonlyArray<Vector<R>>,
    vector: Vector<R>,
  ) => Vector<R>;
}

export interface FiniteVectorRelativeMonadReport<R> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly semiring: FiniteSemiring<R>;
  readonly dimensions: ReadonlyArray<number>;
  readonly spaceSummary: ReadonlyArray<{
    readonly dimension: number;
    readonly vectorCount: number;
    readonly arrowCount: number;
  }>;
  readonly enumeration: MaterializeIndexedFamilyResult<number, Vector<R>>;
}

export interface FiniteVectorKleisliSplittingReport<R> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly dimensions: ReadonlyArray<number>;
  readonly identitySummaries: ReadonlyArray<{
    readonly dimension: number;
    readonly valid: boolean;
  }>;
  readonly identityChecks: number;
  readonly associativityChecks: number;
}

export interface FiniteVectorArrowCorrespondenceWitness<R> {
  readonly semiring: FiniteSemiring<R>;
  readonly dimensions: ReadonlyArray<number>;
  readonly arrowAction: (
    semiring: FiniteSemiring<R>,
    domain: number,
    codomain: number,
    arrow: ReadonlyArray<Vector<R>>,
    vector: Vector<R>,
  ) => Vector<R>;
  readonly composeArrows?: (
    semiring: FiniteSemiring<R>,
    domain: number,
    middle: number,
    codomain: number,
    left: ReadonlyArray<Vector<R>>,
    right: ReadonlyArray<Vector<R>>,
  ) => ReadonlyArray<Vector<R>>;
}

export interface FiniteVectorArrowCorrespondenceReport<R> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly semiring: FiniteSemiring<R>;
  readonly dimensions: ReadonlyArray<number>;
  readonly actionComparisons: number;
  readonly compositionComparisons: number;
}

const formatVector = <R>(vector: Vector<R>): string =>
  `[${vector.map((entry) => `${entry}`).join(", ")}]`;

const computeUnitVectors = <R>(
  witness: FiniteVectorRelativeMonadWitness<R>,
  dimension: number,
): ReadonlyArray<Vector<R>> => {
  const { semiring, customUnit } = witness;
  return Array.from({ length: dimension }, (_, index) =>
    Object.freeze(
      customUnit?.(semiring, dimension, index) ??
        canonicalBasisVector(semiring, dimension, index),
    ) as Vector<R>,
  );
};

const freezeArrow = <R>(columns: ReadonlyArray<Vector<R>>): ReadonlyArray<Vector<R>> =>
  Object.freeze(columns.map((column) => Object.freeze([...column]) as Vector<R>));

const identityArrow = <R>(
  witness: FiniteVectorRelativeMonadWitness<R>,
  dimension: number,
): ReadonlyArray<Vector<R>> =>
  freezeArrow(computeUnitVectors(witness, dimension));

const composeArrows = <R>(
  witness: FiniteVectorRelativeMonadWitness<R>,
  domain: number,
  middle: number,
  codomain: number,
  first: ReadonlyArray<Vector<R>>,
  second: ReadonlyArray<Vector<R>>,
): ReadonlyArray<Vector<R>> => {
  const columns: Vector<R>[] = [];
  const basis = computeUnitVectors(witness, domain);
  for (const basisVector of basis) {
    const viaFirst = applyExtend(witness, domain, middle, first, basisVector);
    const viaSecond = applyExtend(witness, middle, codomain, second, viaFirst);
    columns.push(viaSecond);
  }
  return freezeArrow(columns);
};

const arrowsEqual = <R>(
  semiring: FiniteSemiring<R>,
  left: ReadonlyArray<Vector<R>>,
  right: ReadonlyArray<Vector<R>>,
): boolean => {
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    if (!vectorEquals(semiring, left[index]!, right[index]!)) {
      return false;
    }
  }
  return true;
};

const applyExtend = <R>(
  witness: FiniteVectorRelativeMonadWitness<R>,
  domain: number,
  codomain: number,
  arrow: ReadonlyArray<Vector<R>>,
  vector: Vector<R>,
): Vector<R> =>
  witness.customExtend?.(witness.semiring, domain, codomain, arrow, vector) ??
  canonicalExtendVector(witness.semiring, domain, codomain, arrow, vector);

export const analyzeFiniteVectorRelativeMonad = <R>(
  witness: FiniteVectorRelativeMonadWitness<R>,
): FiniteVectorRelativeMonadReport<R> => {
  const { semiring } = witness;
  const sortedDimensions = [...witness.dimensions].sort((a, b) => a - b);
  const uniqueDimensions = sortedDimensions.filter(
    (dimension, index, array) => index === 0 || array[index - 1] !== dimension,
  );

  const issues: string[] = [];
  const spaceSummary: Array<{
    readonly dimension: number;
    readonly vectorCount: number;
    readonly arrowCount: number;
  }> = [];

  const vectorsByDimension = new Map<number, ReadonlyArray<Vector<R>>>();
  const unitVectorsByDimension = new Map<number, ReadonlyArray<Vector<R>>>();
  const arrowsByPair = new Map<string, ReadonlyArray<ReadonlyArray<Vector<R>>>>();

  const safeExtend = (
    domain: number,
    codomain: number,
    arrow: ReadonlyArray<Vector<R>>,
    vector: Vector<R>,
    context: string,
  ): Vector<R> | undefined => {
    try {
      return applyExtend(witness, domain, codomain, arrow, vector);
    } catch (error) {
      const message = error instanceof Error ? error.message : `${error}`;
      issues.push(`${context}: ${message}`);
      return undefined;
    }
  };

  for (const dimension of uniqueDimensions) {
    if (dimension < 0) {
      issues.push(`Dimension ${dimension} is invalid; dimensions must be non-negative.`);
      continue;
    }
    const vectors = enumerateVectors(semiring, dimension);
    const units = computeUnitVectors(witness, dimension);
    for (let index = 0; index < units.length; index += 1) {
      const candidate = units[index]!;
      if (candidate.length !== dimension) {
        issues.push(
          `Unit vector for dimension ${dimension} at basis ${index} has length ${candidate.length}.`,
        );
      }
    }
    const etaArrow = units;

    for (const vector of vectors) {
      const extended = safeExtend(
        dimension,
        dimension,
        etaArrow,
        vector,
        `Unit law evaluation failed for dimension ${dimension}`,
      );
      if (!extended) {
        break;
      }
      if (!vectorEquals(semiring, extended, vector)) {
        issues.push(
          `Unit law failed at dimension ${dimension}: expected ${formatVector(vector)}, obtained ${formatVector(extended)}.`,
        );
        break;
      }
    }

    vectorsByDimension.set(dimension, vectors);
    unitVectorsByDimension.set(dimension, units);
    const arrowCount = enumerateArrows(semiring, dimension, dimension).length;
    spaceSummary.push({ dimension, vectorCount: vectors.length, arrowCount });
  }

  const arrowKey = (domain: number, codomain: number) => `${domain}->${codomain}`;

  const getArrows = (domain: number, codomain: number) => {
    const key = arrowKey(domain, codomain);
    const cached = arrowsByPair.get(key);
    if (cached !== undefined) {
      return cached;
    }
    const enumerated = enumerateArrows(semiring, domain, codomain);
    arrowsByPair.set(key, enumerated);
    return enumerated;
  };

  for (const domain of uniqueDimensions) {
    const units = unitVectorsByDimension.get(domain);
    const domainVectors = vectorsByDimension.get(domain);
    if (!units || !domainVectors) {
      continue;
    }
    for (const codomain of uniqueDimensions) {
      const arrows = getArrows(domain, codomain);
      for (const arrow of arrows) {
        for (let index = 0; index < domain; index += 1) {
          const basisVector = units[index]!;
          const image = safeExtend(
            domain,
            codomain,
            arrow,
            basisVector,
            `Extension evaluation failed for ${domain}->${codomain}`,
          );
          if (!image) {
            break;
          }
          const expected = arrow[index]!;
          if (!vectorEquals(semiring, image, expected)) {
            issues.push(
              `Extension compatibility failed for ${domain}->${codomain} at basis ${index}: expected ${formatVector(expected)}, received ${formatVector(image)}.`,
            );
            index = domain;
            break;
          }
        }
      }
    }
  }

  for (const left of uniqueDimensions) {
    const leftVectors = vectorsByDimension.get(left);
    if (!leftVectors) {
      continue;
    }
    for (const middle of uniqueDimensions) {
      const arrowsLeftMiddle = getArrows(left, middle);
      const middleVectors = vectorsByDimension.get(middle);
      if (!middleVectors) {
        continue;
      }
      for (const right of uniqueDimensions) {
        const arrowsMiddleRight = getArrows(middle, right);
        let brokeForF = false;
        for (const f of arrowsLeftMiddle) {
          let brokeForG = false;
          for (const g of arrowsMiddleRight) {
            const gf: Vector<R>[] = [];
            let failedComposition = false;
            for (const vector of f) {
              const image = safeExtend(
                middle,
                right,
                g,
                vector,
                `Associativity composition failed for ${middle}->${right}`,
              );
              if (!image) {
                failedComposition = true;
                break;
              }
              gf.push(image);
            }
            if (failedComposition) {
              brokeForG = true;
              break;
            }
            for (const vector of leftVectors) {
              const intermediate = safeExtend(
                left,
                middle,
                f,
                vector,
                `Associativity intermediate failed for ${left}->${middle}`,
              );
              if (!intermediate) {
                brokeForG = true;
                break;
              }
              const sequential = safeExtend(
                middle,
                right,
                g,
                intermediate,
                `Associativity sequential failed for ${middle}->${right}`,
              );
              const combined = safeExtend(
                left,
                right,
                gf,
                vector,
                `Associativity combined failed for ${left}->${right}`,
              );
              if (!sequential || !combined) {
                brokeForG = true;
                break;
              }
              if (!vectorEquals(semiring, sequential, combined)) {
                issues.push(
                  `Associativity failed for ${left}->${middle}->${right}: sequential ${formatVector(sequential)} vs combined ${formatVector(combined)} on vector ${formatVector(vector)}.`,
                );
                brokeForG = true;
                break;
              }
            }
            if (brokeForG) {
              break;
            }
          }
          if (brokeForG) {
            brokeForF = true;
            break;
          }
        }
        if (brokeForF) {
          break;
        }
      }
    }
  }

  const holds = issues.length === 0;
  const details = holds
    ? `Verified relative monad laws for ${uniqueDimensions.length} dimensions over a semiring with ${semiring.elements.length} elements.`
    : "Relative monad verification uncovered issues; inspect the recorded diagnostics.";

  const enumeratedDimensions = Array.from(vectorsByDimension.keys());
  enumeratedDimensions.sort((a, b) => a - b);
  const enumeration = materializeIndexedFamily(
    createFiniteIndexedFamily<number, Vector<R>>({
      description: "Finite vector relative monad carrier",
      indices: enumeratedDimensions,
      fibre: (dimension) => vectorsByDimension.get(dimension) ?? [],
    }),
    {
      indexLimit: enumeratedDimensions.length,
    },
  );

  return {
    holds,
    issues,
    details,
    semiring,
    dimensions: uniqueDimensions,
    spaceSummary,
    enumeration,
  };
};

export const analyzeFiniteVectorKleisliSplitting = <R>(
  witness: FiniteVectorRelativeMonadWitness<R>,
): FiniteVectorKleisliSplittingReport<R> => {
  const { semiring } = witness;
  const sortedDimensions = [...witness.dimensions].sort((a, b) => a - b);
  const uniqueDimensions = sortedDimensions.filter(
    (dimension, index, array) => index === 0 || array[index - 1] !== dimension,
  );
  const issues: string[] = [];

  const identityCatalog = new Map<number, ReadonlyArray<Vector<R>>>();
  const enumeratedArrows = new Map<string, ReadonlyArray<ReadonlyArray<Vector<R>>>>();

  const getIdentity = (dimension: number): ReadonlyArray<Vector<R>> => {
    const cached = identityCatalog.get(dimension);
    if (cached) {
      return cached;
    }
    const computed = identityArrow(witness, dimension);
    identityCatalog.set(dimension, computed);
    return computed;
  };

  const getArrows = (
    domain: number,
    codomain: number,
  ): ReadonlyArray<ReadonlyArray<Vector<R>>> => {
    const key = `${domain}->${codomain}`;
    const cached = enumeratedArrows.get(key);
    if (cached) {
      return cached;
    }
    const generated = enumerateArrows(semiring, domain, codomain);
    enumeratedArrows.set(key, generated);
    return generated;
  };

  const identitySummaries = uniqueDimensions.map((dimension) => {
    const basis = computeUnitVectors(witness, dimension);
    const identity = getIdentity(dimension);
    let valid = true;
    for (let index = 0; index < basis.length; index += 1) {
      const viaIdentity = applyExtend(witness, dimension, dimension, identity, basis[index]!);
      if (!vectorEquals(semiring, viaIdentity, basis[index]!)) {
        valid = false;
        issues.push(
          `Identity arrow for dimension ${dimension} does not preserve basis vector ${index}.`,
        );
        break;
      }
    }
    return { dimension, valid } as const;
  });

  let identityChecks = 0;
  for (const domain of uniqueDimensions) {
    for (const codomain of uniqueDimensions) {
      const arrows = getArrows(domain, codomain);
      if (arrows.length === 0) {
        continue;
      }
      const leftIdentity = getIdentity(domain);
      const rightIdentity = getIdentity(codomain);
      for (const arrow of arrows) {
        identityChecks += 2;
        const leftComposed = composeArrows(
          witness,
          domain,
          domain,
          codomain,
          leftIdentity,
          arrow,
        );
        if (!arrowsEqual(semiring, leftComposed, arrow)) {
          issues.push(
            `Left identity failed for arrow ${domain}→${codomain}; expected equality after composing with identity on ${domain}.`,
          );
        }
        const rightComposed = composeArrows(
          witness,
          domain,
          codomain,
          codomain,
          arrow,
          rightIdentity,
        );
        if (!arrowsEqual(semiring, rightComposed, arrow)) {
          issues.push(
            `Right identity failed for arrow ${domain}→${codomain}; expected equality after composing with identity on ${codomain}.`,
          );
        }
      }
    }
  }

  let associativityChecks = 0;
  for (const source of uniqueDimensions) {
    for (const middle of uniqueDimensions) {
      for (const target of uniqueDimensions) {
        for (const apex of uniqueDimensions) {
          const sigmas = getArrows(source, middle);
          const taus = getArrows(middle, target);
          const upsilons = getArrows(target, apex);
          if (sigmas.length === 0 || taus.length === 0 || upsilons.length === 0) {
            continue;
          }
          for (const sigma of sigmas) {
            for (const tau of taus) {
              for (const upsilon of upsilons) {
                associativityChecks += 1;
                const tauAfterSigma = composeArrows(
                  witness,
                  source,
                  middle,
                  target,
                  sigma,
                  tau,
                );
                const upsilonAfterTau = composeArrows(
                  witness,
                  middle,
                  target,
                  apex,
                  tau,
                  upsilon,
                );
                const leftComposite = composeArrows(
                  witness,
                  source,
                  middle,
                  apex,
                  sigma,
                  upsilonAfterTau,
                );
                const rightComposite = composeArrows(
                  witness,
                  source,
                  target,
                  apex,
                  tauAfterSigma,
                  upsilon,
                );
                if (!arrowsEqual(semiring, leftComposite, rightComposite)) {
                  issues.push(
                    `Associativity failed for dimensions ${source}→${middle}→${target}→${apex}.`,
                  );
                }
              }
            }
          }
        }
      }
    }
  }

  const details = `Checked ${uniqueDimensions.length} Kleisli objects, ${identityChecks} identity compositions, and ${associativityChecks} associative composites.`;

  return {
    holds: issues.length === 0,
    issues,
    details,
    dimensions: uniqueDimensions,
    identitySummaries: identitySummaries.map((entry) => ({ ...entry })),
    identityChecks,
    associativityChecks,
  };
};

export const describeBooleanVectorRelativeMonadWitness = (
  dimensions: ReadonlyArray<number> = [0, 1, 2],
): FiniteVectorRelativeMonadWitness<boolean> => ({
  semiring: FiniteSemiringBoolOrAnd,
  dimensions,
});

const canonicalComposition = <R>(
  semiring: FiniteSemiring<R>,
  domain: number,
  middle: number,
  codomain: number,
  left: ReadonlyArray<Vector<R>>,
  right: ReadonlyArray<Vector<R>>,
): ReadonlyArray<Vector<R>> => {
  const basis = Array.from({ length: domain }, (_, index) =>
    canonicalBasisVector(semiring, domain, index),
  );
  const columns = basis.map((vector) => {
    const viaLeft = canonicalExtendVector(semiring, domain, middle, left, vector);
    return canonicalExtendVector(semiring, middle, codomain, right, viaLeft);
  });
  return freezeArrow(columns);
};

export const analyzeFiniteVectorArrowCorrespondence = <R>(
  witness: FiniteVectorArrowCorrespondenceWitness<R>,
): FiniteVectorArrowCorrespondenceReport<R> => {
  const { semiring } = witness;
  const sortedDimensions = [...witness.dimensions].sort((a, b) => a - b);
  const uniqueDimensions = sortedDimensions.filter(
    (dimension, index, array) => index === 0 || array[index - 1] !== dimension,
  );

  const issues: string[] = [];
  let actionComparisons = 0;
  let compositionComparisons = 0;

  const safeArrowAction = (
    domain: number,
    codomain: number,
    arrow: ReadonlyArray<Vector<R>>,
    vector: Vector<R>,
  ): Vector<R> | undefined => {
    try {
      return witness.arrowAction(semiring, domain, codomain, arrow, vector);
    } catch (error) {
      const message = error instanceof Error ? error.message : `${error}`;
      issues.push(
        `Arrow action threw for ${domain}->${codomain} on ${formatVector(vector)}: ${message}`,
      );
      return undefined;
    }
  };

  const safeCompose = witness.composeArrows
    ? (
        domain: number,
        middle: number,
        codomain: number,
        left: ReadonlyArray<Vector<R>>,
        right: ReadonlyArray<Vector<R>>,
      ): ReadonlyArray<Vector<R>> | undefined => {
        try {
          return witness.composeArrows!(semiring, domain, middle, codomain, left, right);
        } catch (error) {
          const message = error instanceof Error ? error.message : `${error}`;
          issues.push(
            `Arrow composition threw for ${domain}->${middle}->${codomain}: ${message}`,
          );
          return undefined;
        }
      }
    : undefined;

  for (const dimension of uniqueDimensions) {
    if (dimension < 0) {
      issues.push(`Dimension ${dimension} is invalid; dimensions must be non-negative.`);
    }
  }

  for (const domain of uniqueDimensions) {
    if (domain < 0) {
      continue;
    }
    const vectors = enumerateVectors(semiring, domain);
    for (const codomain of uniqueDimensions) {
      if (codomain < 0) {
        continue;
      }
      const arrows = enumerateArrows(semiring, domain, codomain);
      for (const arrow of arrows) {
        for (const vector of vectors) {
          const expected = canonicalExtendVector(semiring, domain, codomain, arrow, vector);
          const actual = safeArrowAction(domain, codomain, arrow, vector);
          actionComparisons += 1;
          if (!actual) {
            continue;
          }
          if (!vectorEquals(semiring, expected, actual)) {
            issues.push(
              `Arrow action mismatch for ${domain}->${codomain} on ${formatVector(vector)}: expected ${formatVector(expected)}, received ${formatVector(actual)}.`,
            );
          }
        }
      }
    }
  }

  if (safeCompose) {
    for (const domain of uniqueDimensions) {
      if (domain < 0) {
        continue;
      }
      for (const middle of uniqueDimensions) {
        if (middle < 0) {
          continue;
        }
        for (const codomain of uniqueDimensions) {
          if (codomain < 0) {
            continue;
          }
          const leftArrows = enumerateArrows(semiring, domain, middle);
          const rightArrows = enumerateArrows(semiring, middle, codomain);
          for (const left of leftArrows) {
            for (const right of rightArrows) {
              const expected = canonicalComposition(
                semiring,
                domain,
                middle,
                codomain,
                left,
                right,
              );
              const actual = safeCompose(domain, middle, codomain, left, right);
              compositionComparisons += 1;
              if (!actual) {
                continue;
              }
              if (!arrowsEqual(semiring, expected, actual)) {
                issues.push(
                  `Arrow composition mismatch for ${domain}->${middle}->${codomain}.`,
                );
              }
            }
          }
        }
      }
    }
  }

  const holds = issues.length === 0;
  const details = holds
    ? `Verified ${actionComparisons} arrow actions${
        safeCompose ? ` and ${compositionComparisons} compositions` : ""
      } against the finite vector relative monad.`
    : `Arrow correspondence issues: ${issues.join("; ")}`;

  return {
    holds,
    issues,
    details,
    semiring,
    dimensions: uniqueDimensions,
    actionComparisons,
    compositionComparisons,
  };
};

export const describeBooleanVectorArrowCorrespondenceWitness = (
  dimensions: ReadonlyArray<number> = [0, 1, 2],
): FiniteVectorArrowCorrespondenceWitness<boolean> => ({
  semiring: FiniteSemiringBoolOrAnd,
  dimensions,
  arrowAction: (semiring, domain, codomain, arrow, vector) =>
    canonicalExtendVector(semiring, domain, codomain, arrow, vector),
  composeArrows: (semiring, domain, middle, codomain, left, right) =>
    canonicalComposition(semiring, domain, middle, codomain, left, right),
});

export const describeBrokenBooleanVectorArrowCorrespondenceWitness = (
  dimensions: ReadonlyArray<number> = [0, 1, 2],
): FiniteVectorArrowCorrespondenceWitness<boolean> => ({
  semiring: FiniteSemiringBoolOrAnd,
  dimensions,
  arrowAction: (semiring, domain, codomain, arrow, vector) => {
    const result = canonicalExtendVector(semiring, domain, codomain, arrow, vector);
    if (result.length === 0) {
      return result;
    }
    const flipped = [...result];
    flipped[0] = flipped[0] === semiring.one ? semiring.zero : semiring.one;
    return Object.freeze(flipped) as Vector<boolean>;
  },
});

type FiniteFunction = ReadonlyArray<number>;

const enumerateFunctions = (
  domain: number,
  codomain: number,
): ReadonlyArray<FiniteFunction> => {
  if (domain === 0) {
    return [Object.freeze([] as number[]) as FiniteFunction];
  }
  if (codomain === 0) {
    return [];
  }
  const results: number[][] = [];
  const assignment = Array.from({ length: domain }, () => 0);
  const build = (position: number) => {
    if (position === domain) {
      results.push([...assignment]);
      return;
    }
    for (let value = 0; value < codomain; value += 1) {
      assignment[position] = value;
      build(position + 1);
    }
  };
  build(0);
  return results.map((fn) => Object.freeze([...fn]) as FiniteFunction);
};

const composeFunctions = (
  outer: FiniteFunction,
  inner: FiniteFunction,
): FiniteFunction =>
  Object.freeze(inner.map((value) => outer[value]!)) as FiniteFunction;

const functionKey = (
  domain: number,
  codomain: number,
  mapping: FiniteFunction,
) => `${domain}->${codomain}:${mapping.join(',')}`;

const vectorKey = <R>(vector: Vector<R>): string => vector.map((entry) => `${entry}`).join(',');

const toArrow = <R>(
  semiring: FiniteSemiring<R>,
  domain: number,
  codomain: number,
  mapping: FiniteFunction,
): ReadonlyArray<Vector<R>> =>
  Array.from({ length: domain }, (_, index) =>
    codomain === 0
      ? (Object.freeze([]) as Vector<R>)
      : canonicalBasisVector(semiring, codomain, mapping[index]!),
  );

class UnionFind {
  private readonly parent: number[];

  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, index) => index);
  }

    find(index: number): number {
      const parent = this.parent[index];
      if (parent === undefined) {
        throw new Error(`UnionFind lookup outside of parent range: ${index}`);
      }
      if (parent === index) {
        return index;
      }
      const root = this.find(parent);
    this.parent[index] = root;
    return root;
  }

  union(left: number, right: number): void {
    const leftRoot = this.find(left);
    const rightRoot = this.find(right);
    if (leftRoot === rightRoot) {
      return;
    }
    this.parent[leftRoot] = rightRoot;
  }
}

export interface FiniteVectorLeftKanExtensionWitness<R> {
  readonly semiring: FiniteSemiring<R>;
  readonly dimensionLimit: number;
  readonly targetSizes: ReadonlyArray<number>;
}

export interface FiniteVectorLeftKanExtensionSummary {
  readonly targetSize: number;
  readonly entryCount: number;
  readonly vectorCount: number;
  readonly equivalenceClasses: number;
}

export interface FiniteVectorLeftKanExtensionReport<R> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly witness: FiniteVectorLeftKanExtensionWitness<R>;
  readonly summaries: ReadonlyArray<FiniteVectorLeftKanExtensionSummary>;
}

export const analyzeFiniteVectorLeftKanExtension = <R>(
  witness: FiniteVectorLeftKanExtensionWitness<R>,
): FiniteVectorLeftKanExtensionReport<R> => {
  const { semiring, dimensionLimit } = witness;
  const issues: string[] = [];

  if (dimensionLimit < 0) {
    issues.push('Dimension limit must be non-negative.');
  }

  const uniqueTargets = [...witness.targetSizes]
    .filter((size, index, array) => index === array.indexOf(size))
    .sort((a, b) => a - b);

  const vectorCache = new Map<number, ReadonlyArray<Vector<R>>>();
  const functionCache = new Map<string, ReadonlyArray<FiniteFunction>>();
  const arrowCache = new Map<string, ReadonlyArray<Vector<R>>>();

  const getVectors = (dimension: number) => {
    const cached = vectorCache.get(dimension);
    if (cached) {
      return cached;
    }
    const enumerated = enumerateVectors(semiring, dimension);
    vectorCache.set(dimension, enumerated);
    return enumerated;
  };

  const getFunctions = (domain: number, codomain: number) => {
    const key = `${domain}->${codomain}`;
    const cached = functionCache.get(key);
    if (cached) {
      return cached;
    }
    const enumerated = enumerateFunctions(domain, codomain);
    functionCache.set(key, enumerated);
    return enumerated;
  };

  const getArrow = (domain: number, codomain: number, mapping: FiniteFunction) => {
    const key = functionKey(domain, codomain, mapping);
    const cached = arrowCache.get(key);
    if (cached) {
      return cached;
    }
    const arrow = toArrow(semiring, domain, codomain, mapping);
    arrowCache.set(key, arrow);
    return arrow;
  };

  const ensureEntry = (
    entries: Array<{
      readonly domain: number;
      readonly mapping: FiniteFunction;
      readonly vector: Vector<R>;
      readonly canonical: Vector<R>;
    }>,
    indexMap: Map<string, number>,
    domain: number,
    mapping: FiniteFunction,
    vector: Vector<R>,
    targetSize: number,
  ): number => {
    const key = `${domain}|${mapping.join(',')}|${vectorKey(vector)}`;
    const existing = indexMap.get(key);
    if (existing !== undefined) {
      return existing;
    }
    const arrow = getArrow(domain, targetSize, mapping);
    const canonical = canonicalExtendVector(semiring, domain, targetSize, arrow, vector);
    entries.push({ domain, mapping, vector, canonical });
    const index = entries.length - 1;
    indexMap.set(key, index);
    return index;
  };

  const summaries: FiniteVectorLeftKanExtensionSummary[] = [];

  for (const targetSize of uniqueTargets) {
    if (targetSize < 0) {
      issues.push(`Target size ${targetSize} must be non-negative.`);
      continue;
    }

    const targetVectors = getVectors(targetSize);
    const entries: Array<{
      readonly domain: number;
      readonly mapping: FiniteFunction;
      readonly vector: Vector<R>;
      readonly canonical: Vector<R>;
    }> = [];
    const indexMap = new Map<string, number>();

    for (let domain = 0; domain <= dimensionLimit; domain += 1) {
      const vectors = getVectors(domain);
      const functions = getFunctions(domain, targetSize);
      for (const mapping of functions) {
        for (const vector of vectors) {
          ensureEntry(entries, indexMap, domain, mapping, vector, targetSize);
        }
      }
    }

    if (entries.length === 0) {
      issues.push(
        `No cocone data available for target size ${targetSize}; increase the dimension limit to witness the Kan extension.`,
      );
      continue;
    }

    const unionFind = new UnionFind(entries.length);

    for (let domain = 0; domain <= dimensionLimit; domain += 1) {
      const functions = getFunctions(domain, targetSize);
      if (functions.length === 0) {
        continue;
      }
      for (const mapping of functions) {
        for (let source = 0; source <= dimensionLimit; source += 1) {
          const comparisonFunctions = getFunctions(source, domain);
          if (comparisonFunctions.length === 0) {
            continue;
          }
          const sourceVectors = getVectors(source);
          for (const comparison of comparisonFunctions) {
            const comparisonArrow = getArrow(source, domain, comparison);
            const composedMapping = composeFunctions(mapping, comparison);
            for (const vector of sourceVectors) {
              const leftIndex = ensureEntry(
                entries,
                indexMap,
                source,
                composedMapping,
                vector,
                targetSize,
              );
              const pushed = canonicalExtendVector(
                semiring,
                source,
                domain,
                comparisonArrow,
                vector,
              );
              const rightIndex = ensureEntry(
                entries,
                indexMap,
                domain,
                mapping,
                pushed,
                targetSize,
              );
              unionFind.union(leftIndex, rightIndex);
            }
          }
        }
      }
    }

    const canonicalClasses = new Map<string, number[]>();
    entries.forEach((entry, index) => {
      const key = vectorKey(entry.canonical);
      const bucket = canonicalClasses.get(key);
      if (bucket) {
        bucket.push(index);
      } else {
        canonicalClasses.set(key, [index]);
      }
    });

    for (const vector of targetVectors) {
      const key = vectorKey(vector);
      if (!canonicalClasses.has(key)) {
        issues.push(
          `Left Kan extension failed to reach vector ${formatVector(vector)} in target size ${targetSize}.`,
        );
      }
    }

    for (const [, indices] of canonicalClasses) {
      const representative = unionFind.find(indices[0]!);
      for (const index of indices) {
        if (unionFind.find(index) !== representative) {
          const entry = entries[index]!;
          issues.push(
            `Multiple presentations of ${formatVector(entry.canonical)} in target size ${targetSize} are not identified by the Kan extension relation.`,
          );
          break;
        }
      }
    }

    const classCount = new Set(entries.map((_, index) => unionFind.find(index))).size;
    summaries.push({
      targetSize,
      entryCount: entries.length,
      vectorCount: targetVectors.length,
      equivalenceClasses: classCount,
    });
  }

  const holds = issues.length === 0;
  const details = holds
    ? `Enumerated left Kan extension data for ${uniqueTargets.length} target sizes using dimension limit ${dimensionLimit}.`
    : `Finite left Kan extension issues: ${issues.join('; ')}`;

  return { holds, issues, details, witness, summaries };
};

export const describeBooleanVectorLeftKanExtensionWitness = (
  targetSizes: ReadonlyArray<number> = [0, 1, 2],
  dimensionLimit = 2,
): FiniteVectorLeftKanExtensionWitness<boolean> => ({
  semiring: FiniteSemiringBoolOrAnd,
  targetSizes,
  dimensionLimit,
});

type CoordinatewiseComparisonKind = "unit" | "element" | "associativity";

const DEFAULT_COORDINATE_LIMIT = 12;
const DEFAULT_VECTOR_ENTRY_LIMIT = 16;
const DEFAULT_ARROW_LIMIT = 6;
const DEFAULT_COMPOSITION_LIMIT = 4;

const freezeArray = <T>(values: readonly T[]): ReadonlyArray<T> =>
  Object.freeze([...values]) as ReadonlyArray<T>;

export interface CoordinatewiseVectorEntry<Coordinate, R> {
  readonly coordinate: Coordinate;
  readonly value: R;
}

export interface CoordinatewiseVectorArrow<Coordinate, R> {
  readonly label: string;
  readonly column: (
    coordinate: Coordinate,
  ) => LazyReplayableIterable<CoordinatewiseVectorEntry<Coordinate, R>>;
  readonly description?: string;
}

export interface CoordinatewiseVectorApproximationOptions {
  readonly coordinateLimit?: number;
  readonly entryLimit?: number;
  readonly arrowLimit?: number;
  readonly compositionLimit?: number;
}

export interface CoordinatewiseVectorRelativeMonadWitness<Coordinate, R> {
  readonly semiring: Semiring<R>;
  readonly coordinates: LazyReplayableIterable<Coordinate>;
  readonly arrows: ReadonlyArray<CoordinatewiseVectorArrow<Coordinate, R>>;
  readonly coordinateKey: (coordinate: Coordinate) => string;
  readonly describeCoordinate?: (coordinate: Coordinate) => string;
  readonly unit?: (
    coordinate: Coordinate,
  ) => LazyReplayableIterable<CoordinatewiseVectorEntry<Coordinate, R>>;
  readonly approximation?: CoordinatewiseVectorApproximationOptions;
}

export interface CoordinatewiseVectorUnitSlice<Coordinate, R> {
  readonly coordinate: Coordinate;
  readonly slice: LazySliceResult<CoordinatewiseVectorEntry<Coordinate, R>>;
}

export interface CoordinatewiseVectorArrowSlice<Coordinate, R> {
  readonly arrow: string;
  readonly coordinate: Coordinate;
  readonly slice: LazySliceResult<CoordinatewiseVectorEntry<Coordinate, R>>;
  readonly arrowDescription?: string;
}

export interface CoordinatewiseVectorComparison<Coordinate, R> {
  readonly kind: CoordinatewiseComparisonKind;
  readonly context: string;
  readonly equal: boolean;
  readonly leftSlice: LazySliceResult<CoordinatewiseVectorEntry<Coordinate, R>>;
  readonly rightSlice: LazySliceResult<CoordinatewiseVectorEntry<Coordinate, R>>;
}

export interface CoordinatewiseVectorApproximationDiagnostics<Coordinate> {
  readonly coordinateLimit: number;
  readonly entryLimit: number;
  readonly arrowLimit: number;
  readonly compositionLimit: number;
  readonly coordinateSlice: LazySliceResult<Coordinate>;
  readonly truncatedUnits: ReadonlyArray<{
    readonly coordinate: Coordinate;
    readonly limit: number;
    readonly consumed: number;
  }>;
  readonly truncatedArrows: ReadonlyArray<{
    readonly arrow: string;
    readonly coordinate: Coordinate;
    readonly limit: number;
    readonly consumed: number;
  }>;
  readonly truncatedComparisons: ReadonlyArray<{
    readonly kind: CoordinatewiseComparisonKind;
    readonly context: string;
    readonly leftTruncated: boolean;
    readonly rightTruncated: boolean;
  }>;
}

export interface CoordinatewiseVectorRelativeMonadReport<Coordinate, R> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly coordinateSlice: LazySliceResult<Coordinate>;
  readonly unitSlices: ReadonlyArray<CoordinatewiseVectorUnitSlice<Coordinate, R>>;
  readonly arrowSlices: ReadonlyArray<CoordinatewiseVectorArrowSlice<Coordinate, R>>;
  readonly comparisons: ReadonlyArray<CoordinatewiseVectorComparison<Coordinate, R>>;
  readonly approximation: CoordinatewiseVectorApproximationDiagnostics<Coordinate>;
}

interface NormalisedVectorEntry<Coordinate, R> {
  readonly coordinate: Coordinate;
  readonly value: R;
}

interface NormalisedVector<Coordinate, R> {
  readonly entries: ReadonlyArray<NormalisedVectorEntry<Coordinate, R>>;
  readonly truncated: boolean;
}

const semiringEquals = <R>(semiring: Semiring<R>) =>
  semiring.eq ?? ((left: R, right: R) => left === right);

const accumulateVector = <Coordinate, R>(
  semiring: Semiring<R>,
  key: (coordinate: Coordinate) => string,
  slice: LazySliceResult<CoordinatewiseVectorEntry<Coordinate, R>>,
): NormalisedVector<Coordinate, R> => {
  const map = new Map<string, NormalisedVectorEntry<Coordinate, R>>();
  for (const entry of slice.values) {
    const entryKey = key(entry.coordinate);
    const existing = map.get(entryKey);
    if (existing) {
      map.set(entryKey, {
        coordinate: existing.coordinate,
        value: semiring.add(existing.value, entry.value),
      });
    } else {
      map.set(entryKey, {
        coordinate: entry.coordinate,
        value: entry.value,
      });
    }
  }
  return {
    entries: freezeArray(Array.from(map.values())),
    truncated: slice.truncated,
  };
};

const compareNormalisedVectors = <Coordinate, R>(
  semiring: Semiring<R>,
  key: (coordinate: Coordinate) => string,
  left: NormalisedVector<Coordinate, R>,
  right: NormalisedVector<Coordinate, R>,
): boolean => {
  const equals = semiringEquals(semiring);
  if (left.entries.length !== right.entries.length) {
    return false;
  }
  const sortedLeft = [...left.entries].sort((a, b) =>
    key(a.coordinate).localeCompare(key(b.coordinate)),
  );
  const sortedRight = [...right.entries].sort((a, b) =>
    key(a.coordinate).localeCompare(key(b.coordinate)),
  );
  for (let index = 0; index < sortedLeft.length; index += 1) {
    const leftEntry = sortedLeft[index]!;
    const rightEntry = sortedRight[index]!;
    if (key(leftEntry.coordinate) !== key(rightEntry.coordinate)) {
      return false;
    }
    if (!equals(leftEntry.value, rightEntry.value)) {
      return false;
    }
  }
  return true;
};

const defaultDescribeCoordinate = (coordinate: unknown): string => `${coordinate}`;

const defaultUnitVector = <Coordinate, R>(
  semiring: Semiring<R>,
  coordinate: Coordinate,
  describe: (coordinate: Coordinate) => string,
): LazyReplayableIterable<CoordinatewiseVectorEntry<Coordinate, R>> =>
  createReplayableIterableFromArray(
    [
      {
        coordinate,
        value: semiring.one,
      },
    ],
    { description: `η(${describe(coordinate)})` },
  );

const approximateExtend = <Coordinate, R>(
  semiring: Semiring<R>,
  key: (coordinate: Coordinate) => string,
  arrow: CoordinatewiseVectorArrow<Coordinate, R>,
  vector: LazyReplayableIterable<CoordinatewiseVectorEntry<Coordinate, R>>,
  entryLimit: number,
  description: string,
): {
  readonly iterable: LazyReplayableIterable<CoordinatewiseVectorEntry<Coordinate, R>>;
  readonly slice: LazySliceResult<CoordinatewiseVectorEntry<Coordinate, R>>;
  readonly normalised: NormalisedVector<Coordinate, R>;
} => {
  const vectorSlice = sliceLazyIterable(vector, { limit: entryLimit });
  const equals = semiringEquals(semiring);
  const contributions = new Map<string, CoordinatewiseVectorEntry<Coordinate, R>>();
  let truncated = vectorSlice.truncated;

  for (const entry of vectorSlice.values) {
    const columnSlice = sliceLazyIterable(arrow.column(entry.coordinate), {
      limit: entryLimit,
    });
    truncated = truncated || columnSlice.truncated;
    for (const columnEntry of columnSlice.values) {
      const columnKey = key(columnEntry.coordinate);
      const scaled = semiring.mul(entry.value, columnEntry.value);
      const existing = contributions.get(columnKey);
      if (existing) {
        const combined = semiring.add(existing.value, scaled);
        if (!equals(existing.value, combined)) {
          contributions.set(columnKey, {
            coordinate: existing.coordinate,
            value: combined,
          });
        }
      } else {
        contributions.set(columnKey, {
          coordinate: columnEntry.coordinate,
          value: scaled,
        });
      }
    }
  }

  const values = freezeArray(Array.from(contributions.values()));
  const iterable = createReplayableIterableFromArray(values, {
    description,
  });
  const slice: LazySliceResult<CoordinatewiseVectorEntry<Coordinate, R>> = {
    values,
    truncated,
    limit: entryLimit,
    consumed: values.length,
  };
  const normalised = accumulateVector(semiring, key, slice);
  return { iterable, slice, normalised };
};

export const analyzeCoordinatewiseVectorRelativeMonad = <Coordinate, R>(
  witness: CoordinatewiseVectorRelativeMonadWitness<Coordinate, R>,
): CoordinatewiseVectorRelativeMonadReport<Coordinate, R> => {
  const describe = witness.describeCoordinate ?? defaultDescribeCoordinate;
  const coordinateLimit = witness.approximation?.coordinateLimit ?? DEFAULT_COORDINATE_LIMIT;
  const entryLimit = witness.approximation?.entryLimit ?? DEFAULT_VECTOR_ENTRY_LIMIT;
  const arrowLimit = witness.approximation?.arrowLimit ?? DEFAULT_ARROW_LIMIT;
  const compositionLimit = witness.approximation?.compositionLimit ?? DEFAULT_COMPOSITION_LIMIT;

  const coordinateSlice = sliceLazyIterable(witness.coordinates, {
    limit: coordinateLimit,
  });

  const issues: string[] = [];
  const unitSlices: CoordinatewiseVectorUnitSlice<Coordinate, R>[] = [];
  const arrowSlices: CoordinatewiseVectorArrowSlice<Coordinate, R>[] = [];
  const comparisons: CoordinatewiseVectorComparison<Coordinate, R>[] = [];

  const unitArrow: CoordinatewiseVectorArrow<Coordinate, R> = {
    label: "η",
    description: "Basis singleton",
    column: (coordinate) =>
      witness.unit?.(coordinate) ??
      defaultUnitVector(witness.semiring, coordinate, describe),
  };

  const sampleVectors: Array<{
    readonly label: string;
    readonly vector: LazyReplayableIterable<CoordinatewiseVectorEntry<Coordinate, R>>;
  }> = [];

  for (const coordinate of coordinateSlice.values) {
    const unit = unitArrow.column(coordinate);
    const slice = sliceLazyIterable(unit, { limit: entryLimit });
    unitSlices.push({ coordinate, slice });
    sampleVectors.push({
      label: `η(${describe(coordinate)})`,
      vector: unit,
    });
  }

  const limitedArrows = witness.arrows.slice(0, arrowLimit);
  for (const arrow of limitedArrows) {
    for (const coordinate of coordinateSlice.values) {
      const column = arrow.column(coordinate);
      const slice = sliceLazyIterable(column, { limit: entryLimit });
      arrowSlices.push({
        arrow: arrow.label,
        coordinate,
        slice,
        ...(arrow.description !== undefined
          ? { arrowDescription: arrow.description }
          : {}),
      });
      sampleVectors.push({
        label: `${arrow.label}(${describe(coordinate)})`,
        vector: column,
      });

      const unitVector = unitArrow.column(coordinate);
      const rightUnit = approximateExtend(
        witness.semiring,
        witness.coordinateKey,
        arrow,
        unitVector,
        entryLimit,
        `${arrow.label} ∘ η(${describe(coordinate)})`,
      );
      const comparison = compareNormalisedVectors(
        witness.semiring,
        witness.coordinateKey,
        rightUnit.normalised,
        accumulateVector(witness.semiring, witness.coordinateKey, slice),
      );
      if (!comparison) {
        issues.push(
          `Right unit failed for coordinate ${describe(coordinate)} via arrow "${arrow.label}".`,
        );
      }
      comparisons.push({
        kind: "element",
        context: `Right unit for ${describe(coordinate)} along "${arrow.label}"`,
        equal: comparison,
        leftSlice: rightUnit.slice,
        rightSlice: slice,
      });
    }
  }

  for (const sample of sampleVectors) {
    const unitExtended = approximateExtend(
      witness.semiring,
      witness.coordinateKey,
      unitArrow,
      sample.vector,
      entryLimit,
      `η ▷ ${sample.label}`,
    );
    const vectorSlice = sliceLazyIterable(sample.vector, { limit: entryLimit });
    const equal = compareNormalisedVectors(
      witness.semiring,
      witness.coordinateKey,
      unitExtended.normalised,
      accumulateVector(witness.semiring, witness.coordinateKey, vectorSlice),
    );
    if (!equal) {
      issues.push(`Unit law failed on sample vector ${sample.label}.`);
    }
    comparisons.push({
      kind: "unit",
      context: `Unit law on ${sample.label}`,
      equal,
      leftSlice: unitExtended.slice,
      rightSlice: vectorSlice,
    });
  }

  const limitedSamples = sampleVectors.slice(0, compositionLimit);
  for (const first of limitedArrows) {
    for (const second of limitedArrows) {
      for (const sample of limitedSamples) {
        const sequential = approximateExtend(
          witness.semiring,
          witness.coordinateKey,
          second,
          approximateExtend(
            witness.semiring,
            witness.coordinateKey,
            first,
            sample.vector,
            entryLimit,
            `${first.label} ▷ ${sample.label}`,
          ).iterable,
          entryLimit,
          `${second.label} ▷ (${first.label} ▷ ${sample.label})`,
        );

        const composite: CoordinatewiseVectorArrow<Coordinate, R> = {
          label: `${second.label} ∘ ${first.label}`,
          column: (coordinate) =>
            approximateExtend(
              witness.semiring,
              witness.coordinateKey,
              second,
              first.column(coordinate),
              entryLimit,
              `${second.label} ∘ ${first.label}(${describe(coordinate)})`,
            ).iterable,
        };

        const combined = approximateExtend(
          witness.semiring,
          witness.coordinateKey,
          composite,
          sample.vector,
          entryLimit,
          `(${second.label} ∘ ${first.label}) ▷ ${sample.label}`,
        );

        const equal = compareNormalisedVectors(
          witness.semiring,
          witness.coordinateKey,
          sequential.normalised,
          combined.normalised,
        );
        if (!equal) {
          issues.push(
            `Associativity failed on ${sample.label} using arrows "${first.label}" then "${second.label}".`,
          );
        }
        comparisons.push({
          kind: "associativity",
          context: `${second.label} ∘ ${first.label} on ${sample.label}`,
          equal,
          leftSlice: sequential.slice,
          rightSlice: combined.slice,
        });
      }
    }
  }

  const holds = comparisons.every((comparison) => comparison.equal) && issues.length === 0;
  const details = holds
    ? `Coordinatewise vector witness satisfied unit and associativity checks on ${coordinateSlice.consumed} sampled coordinates.`
    : "Coordinatewise vector witness failed one or more sampled laws.";

  const approximation: CoordinatewiseVectorApproximationDiagnostics<Coordinate> = {
    coordinateLimit,
    entryLimit,
    arrowLimit,
    compositionLimit,
    coordinateSlice,
    truncatedUnits: freezeArray(
      unitSlices
        .filter((slice) => slice.slice.truncated)
        .map((slice) => ({
          coordinate: slice.coordinate,
          limit: slice.slice.limit,
          consumed: slice.slice.consumed,
        })),
    ),
    truncatedArrows: freezeArray(
      arrowSlices
        .filter((slice) => slice.slice.truncated)
        .map((slice) => ({
          arrow: slice.arrow,
          coordinate: slice.coordinate,
          limit: slice.slice.limit,
          consumed: slice.slice.consumed,
        })),
    ),
    truncatedComparisons: freezeArray(
      comparisons
        .filter(
          (comparison) => comparison.leftSlice.truncated || comparison.rightSlice.truncated,
        )
        .map((comparison) => ({
          kind: comparison.kind,
          context: comparison.context,
          leftTruncated: comparison.leftSlice.truncated,
          rightTruncated: comparison.rightSlice.truncated,
        })),
    ),
  };

  return {
    holds,
    issues: freezeArray(issues),
    details,
    coordinateSlice,
    unitSlices: freezeArray(unitSlices),
    arrowSlices: freezeArray(arrowSlices),
    comparisons: freezeArray(comparisons),
    approximation,
  };
};

const naturalsIterable: LazyReplayableIterable<number> = createReplayableIterable(() => ({
  [Symbol.iterator]: function* () {
    let index = 0;
    while (true) {
      yield index;
      index += 1;
    }
  },
}), { description: "ℕ" });

const successorColumn = (
  coordinate: number,
): LazyReplayableIterable<CoordinatewiseVectorEntry<number, boolean>> =>
  createReplayableIterableFromArray(
    [
      { coordinate: coordinate + 1, value: true },
    ],
    { description: `{${coordinate + 1}}` },
  );

const duplicateColumn = (
  coordinate: number,
): LazyReplayableIterable<CoordinatewiseVectorEntry<number, boolean>> =>
  createReplayableIterableFromArray(
    [
      { coordinate, value: true },
      { coordinate: coordinate + 1, value: true },
    ],
    { description: `{${coordinate}, ${coordinate + 1}}` },
  );

const tailColumn = (
  coordinate: number,
): LazyReplayableIterable<CoordinatewiseVectorEntry<number, boolean>> =>
  createReplayableIterable(() => ({
    [Symbol.iterator]: function* () {
      let offset = 0;
      while (true) {
        yield { coordinate: coordinate + offset, value: true };
        offset += 1;
      }
    },
  }), { description: `{n ≥ ${coordinate}}` });

export const describeCoordinatewiseBooleanVectorWitness = (
  approximation: CoordinatewiseVectorApproximationOptions = {
    coordinateLimit: 8,
    entryLimit: 16,
    arrowLimit: 3,
    compositionLimit: 3,
  },
): CoordinatewiseVectorRelativeMonadWitness<number, boolean> => ({
  semiring: FiniteSemiringBoolOrAnd,
  coordinates: naturalsIterable,
  coordinateKey: (coordinate) => coordinate.toString(),
  describeCoordinate: (coordinate) => coordinate.toString(),
  arrows: [
    {
      label: "shift",
      description: "n ↦ e_{n+1}",
      column: successorColumn,
    },
    {
      label: "duplicate",
      description: "n ↦ e_n + e_{n+1}",
      column: duplicateColumn,
    },
    {
      label: "tail",
      description: "n ↦ ∑_{k≥0} e_{n+k}",
      column: tailColumn,
    },
  ],
  approximation,
});
