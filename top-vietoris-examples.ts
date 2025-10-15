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
import { MarkovOracles } from "./markov-oracles";
import type { KolmogorovFiniteMarginal } from "./markov-zero-one";
import type { Dist } from "./dist";
import { Prob } from "./semiring-utils";

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

export interface KolmogorovProductSpace<Point, Factors extends ReadonlyArray<TopSpace<unknown>> = ReadonlyArray<TopSpace<unknown>>>
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

type FactorPoints<Spaces extends ReadonlyArray<TopSpace<unknown>>> = {
  readonly [Index in keyof Spaces]: Spaces[Index] extends TopSpace<infer Point> ? Point : never;
};

const DEFAULT_PRODUCT_LABEL = "Top/Vietoris product" as const;

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

function enumerateProductPoints<Spaces extends ReadonlyArray<TopSpace<unknown>>>(
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

export function makeKolmogorovProductSpace<Spaces extends ReadonlyArray<TopSpace<unknown>>>(
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
  return MarkovOracles.zeroOne.kolmogorov.witness(p, s, finiteMarginals, { label });
}

export function checkTopVietorisKolmogorov<A, XJ, T = 0 | 1>(
  witness: ReturnType<typeof buildTopVietorisKolmogorovWitness<A, XJ, T>>,
  opts?: { tolerance?: number },
) {
  return MarkovOracles.zeroOne.kolmogorov.check(witness, opts);
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
    throw new Error(`${descriptor}: support must include at least one point (${MarkovOracles.top.vietoris.status}).`);
  }

  const { eq, elems, show } = input.product.points;
  const contains = (point: XJ) => elems.some((candidate) => candidate !== undefined && eq(candidate, point));
  for (const [point, weight] of input.support) {
    if (!contains(point)) {
      throw new Error(
        `${descriptor}: point ${show?.(point) ?? String(point)} is outside the encoded product space.`,
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
    const determinism = MarkovOracles.determinism.recognizer(
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
  const determinism = MarkovOracles.determinism.recognizer(
    Prob,
    (point: XJ): Dist<number, T> => ({ R: Prob, w: morphism.k(point) }),
    input.source.points.elems,
  );
  if (!determinism.det) {
    throw new Error(`${descriptor}: determinism oracle rejected the statistic.`);
  }
  return morphism;
}
