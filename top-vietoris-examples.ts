// top-vietoris-examples.ts
// Adapters for Kl(H): Kleisli category of the lower Vietoris monad on Top.
// Kolmogorov products exist here via the infinite product topology.
// Caveat: Kl(H) is NOT causal, so Hewitt–Savage does NOT apply.

// These helpers now encode finite Kolmogorov products explicitly so that
// downstream zero–one witnesses can consume concrete priors/statistics.

import {
  FinMarkov,
  detK,
  fromWeights,
  mkFin,
  type Eq,
  type Fin,
} from "./markov-category";
import type { MarkovOracleRegistry, TopVietorisAdapters } from "./markov-oracles";
import type { KolmogorovFiniteMarginal } from "./markov-zero-one";
import type { Dist } from "./dist";
import { Prob } from "./semiring-utils";
import {
  buildKolmogorovZeroOneWitness,
  checkKolmogorovZeroOne,
} from "./markov-zero-one";
import { isDeterministic } from "./markov-laws";
import {
  continuous,
  forgetStructure,
  isHausdorff,
  structureFromTop,
  type Top,
  type TopStructure,
} from "./src/top/Topology";
import { topologyFromSubbase } from "./src/top/InitialFinal";

export interface ClosedSubset<Point> {
  readonly label: string;
  readonly members: ReadonlyArray<Point>;
  contains(point: Point): boolean;
}

export interface TopSpace<Point> {
  readonly label: string;
  readonly points: Fin<Point>;
  readonly closedSubsets: ReadonlyArray<ClosedSubset<Point>>;
}

export interface KolmogorovProductSpace<Point, Factors extends ReadonlyArray<TopSpace<any>> = ReadonlyArray<TopSpace<any>>>
  extends TopSpace<Point> {
  readonly factors: Factors;
  readonly finiteMarginals: ReadonlyArray<KolmogorovFiniteMarginal<Point, unknown>>;
}

export type Cont<X, Y> = (x: X) => Y;

export interface ProductPriorInput<A, XJ> {
  readonly domain: Fin<A>;
  readonly product: KolmogorovProductSpace<XJ>;
  readonly support: ReadonlyArray<readonly [XJ, number]>;
  readonly label?: string;
}

export interface DeterministicStatisticInput<XJ, T> {
  readonly source: TopSpace<XJ>;
  readonly target: Fin<T>;
  readonly statistic: Cont<XJ, T>;
  readonly label?: string;
}

export interface TopVietorisConstantFunctionWitness<XJ, Y> {
  readonly product: KolmogorovProductSpace<XJ>;
  readonly target: TopSpace<Y>;
  readonly map: Cont<XJ, Y>;
  readonly finiteSubsets: ReadonlyArray<ReadonlyArray<number>>;
  readonly label?: string;
}

export interface TopVietorisConstantFunctionReport<XJ, Y> {
  readonly holds: boolean;
  readonly hausdorff: boolean;
  readonly continuous: boolean;
  readonly independence: boolean;
  readonly constant: boolean;
  readonly witness: TopVietorisConstantFunctionWitness<XJ, Y>;
  readonly constantValue?: Y;
  readonly counterexample?: {
    readonly subset: ReadonlyArray<number>;
    readonly points: readonly [XJ, XJ];
    readonly outputs: readonly [Y, Y];
  };
  readonly details: string;
}

type FactorPoints<Spaces extends ReadonlyArray<TopSpace<any>>> = {
  readonly [Index in keyof Spaces]: Spaces[Index] extends TopSpace<infer Point> ? Point : never;
};

const DEFAULT_PRODUCT_LABEL = "Top/Vietoris product" as const;

export const TOP_VIETORIS_STATUS =
  "Kolmogorov adapters and constant-function law helpers available; Hewitt–Savage unavailable because Kl(H) is not causal.";

const defined = <T>(value: T | undefined): value is T => value !== undefined;

const spaceStructureCache = new WeakMap<TopSpace<any>, TopStructure<any>>();

function uniqueCarrier<Point>(points: Fin<Point>): Point[] {
  const carrier: Point[] = [];
  for (const candidate of points.elems) {
    if (candidate === undefined) {
      continue;
    }
    if (!carrier.some((existing) => points.eq(existing, candidate))) {
      carrier.push(candidate);
    }
  }
  return carrier;
}

function eqSubset<Point>(eq: Eq<Point>, left: ReadonlyArray<Point>, right: ReadonlyArray<Point>): boolean {
  return (
    left.length === right.length &&
    left.every((l) => right.some((r) => eq(l, r))) &&
    right.every((r) => left.some((l) => eq(l, r)))
  );
}

function dedupeSubsets<Point>(
  eq: Eq<Point>,
  subsets: ReadonlyArray<ReadonlyArray<Point>>,
): Array<ReadonlyArray<Point>> {
  const unique: Array<ReadonlyArray<Point>> = [];
  for (const subset of subsets) {
    if (!unique.some((existing) => eqSubset(eq, existing, subset))) {
      unique.push([...subset]);
    }
  }
  return unique;
}

function evaluateClosedSubset<Point>(
  carrier: ReadonlyArray<Point>,
  eq: Eq<Point>,
  subset: ClosedSubset<Point>,
): Point[] {
  const members: Point[] = [];
  for (const candidate of carrier) {
    if (subset.contains(candidate) && !members.some((existing) => eq(existing, candidate))) {
      members.push(candidate);
    }
  }
  return members;
}

function complementSubset<Point>(
  eq: Eq<Point>,
  carrier: ReadonlyArray<Point>,
  subset: ReadonlyArray<Point>,
): Point[] {
  return carrier.filter((candidate) => !subset.some((member) => eq(candidate, member)));
}

function spaceStructure<Point>(space: TopSpace<Point>): TopStructure<Point> {
  const cached = spaceStructureCache.get(space) as TopStructure<Point> | undefined;
  if (cached) {
    return cached;
  }

  const carrier = uniqueCarrier(space.points);
  const eq = space.points.eq;
  const closedMembers = space.closedSubsets.map((subset) => evaluateClosedSubset(carrier, eq, subset));
  closedMembers.push([], [...carrier]);
  const closed = dedupeSubsets(eq, closedMembers);
  const subbase = closed.map((subset) => complementSubset(eq, carrier, subset));
  const topology = topologyFromSubbase(eq, carrier, subbase);
  const structure = structureFromTop(eq, topology, space.points.show ? { show: space.points.show } : undefined);
  spaceStructureCache.set(space, structure);
  return structure;
}

const spaceTopology = <Point>(space: TopSpace<Point>): Top<Point> => forgetStructure(spaceStructure(space));

function enumerateFiniteSubsets(arity: number): Array<ReadonlyArray<number>> {
  const results: Array<ReadonlyArray<number>> = [];
  const pick: number[] = [];

  const dfs = (index: number) => {
    if (index === arity) {
      if (pick.length > 0) {
        results.push([...pick]);
      }
      return;
    }
    pick.push(index);
    dfs(index + 1);
    pick.pop();
    dfs(index + 1);
  };

  dfs(0);
  return results.map((subset) => {
    const ordered = [...subset];
    ordered.sort((a, b) => a - b);
    return ordered;
  });
}

function normalizeFiniteSubsets(
  arity: number,
  subsets?: ReadonlyArray<ReadonlyArray<number>>,
): ReadonlyArray<ReadonlyArray<number>> {
  const pool = subsets ? [...subsets] : enumerateFiniteSubsets(arity);
  const normalized: Array<ReadonlyArray<number>> = [];
  for (const subset of pool) {
    const ordered = [...subset].sort((a, b) => a - b);
    if (ordered.some((index) => index < 0 || index >= arity)) {
      throw new Error(`Top/Vietoris constant law: subset ${ordered.join(",")} exceeds factor range [0, ${arity}).`);
    }
    if (ordered.length === 0) {
      continue;
    }
    if (!normalized.some((existing) => existing.length === ordered.length && existing.every((v, i) => v === ordered[i]))) {
      normalized.push(ordered);
    }
  }
  if (normalized.length === 0) {
    throw new Error("Top/Vietoris constant law: at least one finite subset is required to encode tail independence.");
  }
  return normalized;
}

function pointsAgreeOutsideSubset<Spaces extends ReadonlyArray<TopSpace<any>>>(
  factors: Spaces,
  subset: ReadonlyArray<number>,
  left: FactorPoints<Spaces>,
  right: FactorPoints<Spaces>,
): boolean {
  return factors.every((factor, index) => {
    if (subset.includes(index)) {
      return true;
    }
    const eq = factor?.points.eq ?? ((a: unknown, b: unknown) => a === b);
    return eq(left[index], right[index]);
  });
}

function valueInFin<T>(fin: Fin<T>, value: T): boolean {
  return fin.elems.filter(defined).some((candidate) => fin.eq(candidate, value));
}

export function makeClosedSubset<Point>(label: string, members: ReadonlyArray<Point>, eq: Eq<Point>): ClosedSubset<Point> {
  const support = [...members];
  return {
    label,
    members: support,
    contains: (candidate: Point) => support.some((member) => member !== undefined && eq(member, candidate)),
  };
}

export function makeDiscreteTopSpace<Point>(label: string, points: Fin<Point>): TopSpace<Point> {
  const closed: ClosedSubset<Point>[] = [makeClosedSubset(`${label} (all)`, points.elems, points.eq)];
  for (const point of points.elems) {
    if (point === undefined) continue;
    closed.push(makeClosedSubset(`${label} {${points.show?.(point) ?? String(point)}}`, [point], points.eq));
  }
  closed.push(makeClosedSubset(`${label} ∅`, [], points.eq));
  return {
    label,
    points,
    closedSubsets: closed,
  };
}

function enumerateProductPoints<Spaces extends ReadonlyArray<TopSpace<any>>>(
  spaces: Spaces,
): Array<FactorPoints<Spaces>> {
  const results: Array<FactorPoints<Spaces>> = [];
  const prefix: Array<unknown> = [];

  const build = (index: number) => {
    if (index === spaces.length) {
      results.push([...prefix] as unknown as FactorPoints<Spaces>);
      return;
    }
    const space = spaces[index];
    if (!space) return;
    for (const point of space.points.elems) {
      if (point === undefined) continue;
      prefix.push(point);
      build(index + 1);
      prefix.pop();
    }
  };

  build(0);
  return results;
}

export function makeKolmogorovProductSpace<Spaces extends ReadonlyArray<TopSpace<any>>>(
  spaces: Spaces,
  options: { readonly label?: string } = {},
): KolmogorovProductSpace<FactorPoints<Spaces>, Spaces> {
  if (spaces.length === 0) {
    throw new Error(`${options.label ?? DEFAULT_PRODUCT_LABEL}: at least one factor is required to form a product.`);
  }

  const tuples = enumerateProductPoints(spaces);
  const label = options.label ?? DEFAULT_PRODUCT_LABEL;
  const eq: Eq<FactorPoints<Spaces>> = (left, right) =>
    spaces.every((space, index) => space.points.eq(left[index], right[index]));
  const show = (value: FactorPoints<Spaces>) =>
    `[${value.map((component, index) => spaces[index]?.points.show?.(component) ?? String(component)).join(", ")}]`;
  const productFin = mkFin<FactorPoints<Spaces>>(tuples, eq, show);

  const closed: ClosedSubset<FactorPoints<Spaces>>[] = [
    makeClosedSubset(`${label} (all)`, productFin.elems, productFin.eq),
    makeClosedSubset(`${label} ∅`, [], productFin.eq),
  ];

  spaces.forEach((factor, index) => {
    for (const subset of factor.closedSubsets) {
      const members = productFin.elems.filter((point) => subset.contains(point[index]));
      closed.push({
        label: `${label} cylinder[${factor.label} :: ${subset.label}]`,
        members,
        contains: (candidate: FactorPoints<Spaces>) => subset.contains(candidate[index]),
      });
    }
  });

  const finiteMarginals = spaces.map((factor, index) => ({
    F: factor.label,
    piF: detK(productFin, factor.points, (point: FactorPoints<Spaces>) => point[index]),
  }));

  return {
    label,
    points: productFin,
    closedSubsets: closed,
    factors: spaces,
    finiteMarginals,
  };
}

// (Kolmogorov) — valid in Kl(H)
export function buildTopVietorisKolmogorovWitness<A, XJ, T = 0 | 1>(
  p: FinMarkov<A, XJ>,
  s: FinMarkov<XJ, T>,
  finiteMarginals: ReadonlyArray<KolmogorovFiniteMarginal<XJ, unknown>>,
  label = "Top/Vietoris Kolmogorov",
) {
  const carrierSize = p.Y.elems.filter(defined).length;
  const marginalLabels = finiteMarginals
    .map((entry) => entry.F)
    .filter((value): value is string => typeof value === "string" && value.length > 0);
  const heuristics: ReadonlyArray<string> = [
    `${label}: Kolmogorov product enumerates ${carrierSize} carrier point(s) via Top/Vietoris adapters.`,
    marginalLabels.length > 0
      ? `${label}: finite marginals reused for factors ${marginalLabels.join(", ")}.`
      : `${label}: no finite marginals supplied; witness defaults to deterministic heuristics.`,
  ];
  return buildKolmogorovZeroOneWitness(p, s, finiteMarginals, {
    label,
    metadata: { heuristics },
  });
}

export function checkTopVietorisKolmogorov<A, XJ, T = 0 | 1>(
  witness: ReturnType<typeof buildTopVietorisKolmogorovWitness<A, XJ, T>>,
  opts?: { tolerance?: number },
) {
  return checkKolmogorovZeroOne(witness, opts);
}

// (Hewitt–Savage) — NOT valid in Kl(H) (non-causal). Keep as explicit error.
export function buildTopVietorisHewittSavageWitness(): never {
  throw new Error(
    "Kl(H) is not causal, so Hewitt–Savage zero–one witnesses are intentionally unavailable. See LAWS.md Top/Vietoris entry.",
  );
}

export function checkTopVietorisHewittSavage(): never {
  throw new Error(
    "Kl(H) is not causal; no Hewitt–Savage witness/check available. See LAWS.md Top/Vietoris entry.",
  );
}

export function makeProductPrior<A, XJ>(mkInput: () => ProductPriorInput<A, XJ>): FinMarkov<A, XJ> {
  const input = mkInput();
  const descriptor = input.label ?? "Top/Vietoris product prior";
  if (input.support.length === 0) {
    throw new Error(`${descriptor}: support must include at least one point (${TOP_VIETORIS_STATUS}).`);
  }

  const { eq, elems, show } = input.product.points;
  const contains = (point: XJ) => elems.some((candidate) => candidate !== undefined && eq(candidate, point));
  const describePoint = (point: XJ): string => {
    if (show) {
      try {
        return show(point);
      } catch (error) {
        const fallback = JSON.stringify(point);
        return fallback === undefined ? String(point) : fallback;
      }
    }
    const rendered = JSON.stringify(point);
    return rendered === undefined ? String(point) : rendered;
  };

  for (const [point, weight] of input.support) {
    if (!contains(point)) {
      throw new Error(
        `${descriptor}: point ${describePoint(point)} is outside the encoded product space.`,
      );
    }
    if (!Number.isFinite(weight) || weight < 0) {
      throw new Error(`${descriptor}: weights must be finite and non-negative.`);
    }
  }

  const normalized = fromWeights(
    input.support.map(([point, weight]) => [point, weight] as [XJ, number]),
    true,
  );
  const kernel = (_: A) => new Map(normalized);
  const prior = new FinMarkov(input.domain, input.product.points, kernel);

  if (input.support.length === 1) {
    const determinism = isDeterministic(
      Prob,
      (a: A): Dist<number, XJ> => ({ R: Prob, w: prior.k(a) }),
      input.domain.elems,
    );
    if (!determinism.det) {
      throw new Error(`${descriptor}: deterministic support failed the Markov determinism oracle check.`);
    }
  }

  return prior;
}

export function makeDeterministicStatistic<XJ, T = 0 | 1>(
  mkInput: () => DeterministicStatisticInput<XJ, T>,
): FinMarkov<XJ, T> {
  const input = mkInput();
  const descriptor = input.label ?? "Top/Vietoris statistic";
  const { elems: domainPoints } = input.source.points;
  const { elems: codomainPoints, eq: codomainEq, show } = input.target;

  const inTarget = (value: T) => codomainPoints.some((candidate) => candidate !== undefined && codomainEq(candidate, value));
  for (const point of domainPoints) {
    if (point === undefined) continue;
    const value = input.statistic(point);
    if (!inTarget(value)) {
      throw new Error(`${descriptor}: image ${show?.(value) ?? String(value)} is outside the declared codomain.`);
    }
  }

  const morphism = detK(input.source.points, input.target, input.statistic);
  const determinism = isDeterministic(
    Prob,
    (point: XJ): Dist<number, T> => ({ R: Prob, w: morphism.k(point) }),
    input.source.points.elems,
  );
  if (!determinism.det) {
    throw new Error(`${descriptor}: determinism oracle rejected the statistic.`);
  }
  return morphism;
}

function evaluateConstantMap<XJ, Y>(
  witness: TopVietorisConstantFunctionWitness<XJ, Y>,
): Array<{ readonly point: XJ; readonly value: Y }> {
  const points = witness.product.points.elems.filter(defined) as XJ[];
  return points.map((point) => ({ point, value: witness.map(point) }));
}

function checkContinuity<XJ, Y>(
  witness: TopVietorisConstantFunctionWitness<XJ, Y>,
): { ok: boolean; details?: string; domain?: Top<XJ>; codomain?: Top<Y> } {
  try {
    const domain = spaceTopology(witness.product) as Top<XJ>;
    const codomain = spaceTopology(witness.target) as Top<Y>;
    const eqX = witness.product.points.eq as Eq<XJ>;
    const continuousReport = continuous(eqX, domain, codomain, witness.map, witness.target.points.eq);
    return continuousReport
      ? { ok: true, domain, codomain }
      : { ok: false, details: `${witness.label ?? "Top/Vietoris constant"}: map is not continuous.` };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, details: message };
  }
}

function independenceCheck<XJ, Y>(
  witness: TopVietorisConstantFunctionWitness<XJ, Y>,
  evaluations: ReadonlyArray<{ readonly point: XJ; readonly value: Y }>,
): {
  ok: boolean;
  counterexample?: {
    readonly subset: ReadonlyArray<number>;
    readonly points: readonly [XJ, XJ];
    readonly outputs: readonly [Y, Y];
  };
} {
  const eqY = witness.target.points.eq;
  const factors = witness.product.factors;
  for (const subset of witness.finiteSubsets) {
    for (let i = 0; i < evaluations.length; i += 1) {
      for (let j = i + 1; j < evaluations.length; j += 1) {
        const left = evaluations[i]!;
        const right = evaluations[j]!;
        if (pointsAgreeOutsideSubset(factors, subset, left.point as never, right.point as never)) {
          if (!eqY(left.value, right.value)) {
            return {
              ok: false,
              counterexample: {
                subset,
                points: [left.point, right.point],
                outputs: [left.value, right.value],
              },
            };
          }
        }
      }
    }
  }
  return { ok: true };
}

function checkConstantValue<XJ, Y>(
  witness: TopVietorisConstantFunctionWitness<XJ, Y>,
  evaluations: ReadonlyArray<{ readonly point: XJ; readonly value: Y }>,
): { constant: boolean; value?: Y } {
  const [first] = evaluations;
  if (!first) {
    return { constant: true };
  }
  const eqY = witness.target.points.eq;
  const constant = evaluations.every((entry) => eqY(entry.value, first.value));
  return constant ? { constant: true, value: first.value } : { constant: false };
}

export function buildTopVietorisConstantFunctionWitness<XJ, Y>(
  mkInput: () => {
    readonly product: KolmogorovProductSpace<XJ>;
    readonly target: TopSpace<Y>;
    readonly map: Cont<XJ, Y>;
    readonly label?: string;
    readonly finiteSubsets?: ReadonlyArray<ReadonlyArray<number>>;
  },
): TopVietorisConstantFunctionWitness<XJ, Y> {
  const input = mkInput();
  const descriptor = input.label ?? "Top/Vietoris constant";
  const arity = input.product.factors.length;
  if (arity === 0) {
    throw new Error(`${descriptor}: product requires at least one factor.`);
  }
  const finiteSubsets = normalizeFiniteSubsets(arity, input.finiteSubsets);
  const points = input.product.points.elems.filter(defined) as XJ[];
  for (const point of points) {
    const value = input.map(point);
    if (!valueInFin(input.target.points, value)) {
      const show = input.target.points.show ?? ((value: Y) => String(value));
      throw new Error(`${descriptor}: value ${show(value)} escapes the declared codomain.`);
    }
  }
  return {
    product: input.product,
    target: input.target,
    map: input.map,
    finiteSubsets,
    ...(input.label ? { label: input.label } : {}),
  };
}

export function checkTopVietorisConstantFunction<XJ, Y>(
  witness: TopVietorisConstantFunctionWitness<XJ, Y>,
): TopVietorisConstantFunctionReport<XJ, Y> {
  const evaluations = evaluateConstantMap(witness);

  const continuity = checkContinuity(witness);
  let hausdorff = false;
  let hausdorffDetails: string | undefined;
  try {
    const codomain = continuity.codomain ?? (spaceTopology(witness.target) as Top<Y>);
    hausdorff = isHausdorff(witness.target.points.eq, codomain);
    if (!hausdorff) {
      hausdorffDetails = `${witness.label ?? "Top/Vietoris constant"}: target is not Hausdorff.`;
    }
  } catch (error) {
    hausdorffDetails = error instanceof Error ? error.message : String(error);
  }

  const independence = independenceCheck(witness, evaluations);
  const constant = checkConstantValue(witness, evaluations);

  const holds = Boolean(continuity.ok && hausdorff && independence.ok && constant.constant);

  const detailParts: string[] = [];
  if (!continuity.ok && continuity.details) {
    detailParts.push(continuity.details);
  }
  if (!hausdorff && hausdorffDetails) {
    detailParts.push(hausdorffDetails);
  }
  if (!independence.ok && independence.counterexample) {
    const subset = independence.counterexample.subset.join(",");
    detailParts.push(`Independence failed on subset {${subset}}.`);
  }
  if (!constant.constant) {
    detailParts.push("Map is not constant.");
  }
  const details = detailParts.length > 0 ? detailParts.join(" ") : "All constant-function checks passed.";

  return {
    holds,
    hausdorff,
    continuous: continuity.ok,
    independence: independence.ok,
    constant: constant.constant,
    witness,
    ...(constant.constant && constant.value !== undefined ? { constantValue: constant.value } : {}),
    ...(!independence.ok && independence.counterexample
      ? { counterexample: independence.counterexample }
      : {}),
    details,
  };
}

export const topVietorisAdapters: TopVietorisAdapters = {
  makeClosedSubset,
  makeDiscreteTopSpace,
  makeKolmogorovProductSpace,
  makeProductPrior,
  makeDeterministicStatistic,
};

export function installTopVietorisAdapters(registry: MarkovOracleRegistry): void {
  registry.registerTopVietorisAdapters(topVietorisAdapters);
}
