import { subspace } from "./Subspace";
import {
  compose,
  makeContinuousMap,
  type ContinuousMap,
} from "./ContinuousMap";
import type { Top } from "./Topology";
import { mapsEqual } from "./Embeddings";
import { makeMediator, makeUniversalPropertyReport, type UniversalPropertyReport } from "./limits";

export type TopEqualizerWitness<X, Y> = {
  readonly obj: Top<X>;
  readonly equalize: ContinuousMap<X, X>;
};

export interface EqualizerMediatorMetadata {
  readonly reproducesFork: boolean;
}

export interface EqualizerFactorizationResult<W, X, Y>
  extends UniversalPropertyReport<never, ContinuousMap<W, X>, never, EqualizerMediatorMetadata> {
  readonly mediator?: ContinuousMap<W, X>;
}

function formatPoint<X>(space: Top<X>, value: X): string {
  const { show } = space;
  if (show !== undefined) {
    return show(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function assertParallelPair<X, Y>(f: ContinuousMap<X, Y>, g: ContinuousMap<X, Y>): void {
  if (f.source !== g.source || f.target !== g.target) {
    throw new Error(
      "topEqualizer: expected a parallel pair with matching domain and codomain topologies.",
    );
  }
  if (f.eqSource !== g.eqSource || f.eqTarget !== g.eqTarget) {
    throw new Error(
      "topEqualizer: expected a parallel pair with consistent equality witnesses.",
    );
  }
}

export function topEqualizer<X, Y>(f: ContinuousMap<X, Y>, g: ContinuousMap<X, Y>): TopEqualizerWitness<X, Y> {
  assertParallelPair(f, g);

  const eqX = f.eqSource;
  const eqY = f.eqTarget;
  const carrier = f.source.carrier.filter((x) => eqY(f.map(x), g.map(x)));
  const equalizer = subspace(eqX, f.source, carrier);
  const equalize = makeContinuousMap({
    source: equalizer,
    target: f.source,
    eqSource: eqX,
    eqTarget: eqX,
    map: (x) => x,
  });

  return { obj: equalizer, equalize };
}

function assertInclusion<X, Y>(
  f: ContinuousMap<X, Y>,
  inclusion: ContinuousMap<X, X>,
): void {
  if (inclusion.target !== f.source) {
    throw new Error(
      "topFactorThroughEqualizer: inclusion target must match the shared domain topology.",
    );
  }
  if (inclusion.eqTarget !== f.eqSource) {
    throw new Error(
      "topFactorThroughEqualizer: inclusion codomain equality witness must match the parallel pair's domain witness.",
    );
  }
}

function assertForkShape<W, X, Y>(
  f: ContinuousMap<X, Y>,
  fork: ContinuousMap<W, X>,
): void {
  if (fork.target !== f.source) {
    throw new Error(
      "topFactorThroughEqualizer: fork codomain must match the parallel pair's domain topology.",
    );
  }
  if (fork.eqTarget !== f.eqSource) {
    throw new Error(
      "topFactorThroughEqualizer: fork codomain equality witness must match the parallel pair's domain witness.",
    );
  }
}

function ensureForkCommutes<W, X, Y>(
  f: ContinuousMap<X, Y>,
  g: ContinuousMap<X, Y>,
  fork: ContinuousMap<W, X>,
): void {
  const eqY = f.eqTarget;
  fork.source.carrier.forEach((point) => {
    const viaF = f.map(fork.map(point));
    const viaG = g.map(fork.map(point));
    if (!eqY(viaF, viaG)) {
      const pointLabel = formatPoint(fork.source, point);
      const imageF = formatPoint(f.target, viaF);
      const imageG = formatPoint(g.target, viaG);
      throw new Error(
        `topFactorThroughEqualizer: fork does not commute at ${pointLabel} (f maps to ${imageF} while g maps to ${imageG}).`,
      );
    }
  });
}

export function topFactorThroughEqualizer<W, X, Y>(
  f: ContinuousMap<X, Y>,
  g: ContinuousMap<X, Y>,
  inclusion: ContinuousMap<X, X>,
  fork: ContinuousMap<W, X>,
): EqualizerFactorizationResult<W, X, Y> {
  try {
    assertParallelPair(f, g);
    assertInclusion(f, inclusion);
    assertForkShape(f, fork);
    ensureForkCommutes(f, g, fork);

    const eqX = f.eqSource;
    const mediatorMap = (point: W): X => {
      const image = fork.map(point);
      const witness = inclusion.source.carrier.find((candidate) => eqX(inclusion.map(candidate), image));
      if (witness === undefined) {
        const pointLabel = formatPoint(fork.source, point);
        const imageLabel = formatPoint(f.source, image);
        throw new Error(
          `topFactorThroughEqualizer: fork lands outside the equalizer at ${pointLabel} -> ${imageLabel}.`,
        );
      }
      return witness;
    };

    const mediator = makeContinuousMap({
      source: fork.source,
      target: inclusion.source,
      eqSource: fork.eqSource,
      eqTarget: inclusion.eqSource,
      map: mediatorMap,
    });

    const recomposed = compose(inclusion, mediator);
    if (!mapsEqual(eqX, fork.source.carrier, recomposed.map, fork.map)) {
      throw new Error(
        "topFactorThroughEqualizer: constructed mediator does not reproduce the supplied fork.",
      );
    }

    const mediatorEntry = {
      mediator: makeMediator<ContinuousMap<W, X>, EqualizerMediatorMetadata>(
        "equalizer mediator",
        mediator,
        { reproducesFork: true },
      ),
      holds: true,
      metadata: { reproducesFork: true },
    };

    const report = makeUniversalPropertyReport<
      never,
      ContinuousMap<W, X>,
      never,
      EqualizerMediatorMetadata
    >({
      mediators: [mediatorEntry],
    });

    return { ...report, mediator } satisfies EqualizerFactorizationResult<W, X, Y>;
  } catch (error) {
    const failure = error instanceof Error ? error.message : String(error);
    const mediatorEntry = {
      mediator: makeMediator<ContinuousMap<W, X>, EqualizerMediatorMetadata>(
        "equalizer mediator",
        undefined,
        { reproducesFork: false },
      ),
      holds: false,
      failure,
      metadata: { reproducesFork: false },
    };

    const report = makeUniversalPropertyReport<
      never,
      ContinuousMap<W, X>,
      never,
      EqualizerMediatorMetadata
    >({
      mediators: [mediatorEntry],
    });

    return { ...report, mediator: undefined } satisfies EqualizerFactorizationResult<W, X, Y>;
  }
}

export interface TopEqualizerComparison<X> {
  readonly forward: ContinuousMap<X, X>;
  readonly backward: ContinuousMap<X, X>;
}

export function topEqualizerComparison<X, Y>(
  f: ContinuousMap<X, Y>,
  g: ContinuousMap<X, Y>,
  first: ContinuousMap<X, X>,
  second: ContinuousMap<X, X>,
): TopEqualizerComparison<X> {
  const forwardReport = topFactorThroughEqualizer(f, g, second, first);
  if (!forwardReport.mediator) {
    throw new Error(
      `topEqualizerComparison: unable to construct forward mediator (${forwardReport.failures.join(
        "; ",
      )}).`,
    );
  }
  const backwardReport = topFactorThroughEqualizer(f, g, first, second);
  if (!backwardReport.mediator) {
    throw new Error(
      `topEqualizerComparison: unable to construct backward mediator (${backwardReport.failures.join(
        "; ",
      )}).`,
    );
  }

  const forward = forwardReport.mediator;
  const backward = backwardReport.mediator;

  const eqX = f.eqSource;
  const eqFirst = first.eqSource;
  const eqSecond = second.eqSource;
  const composedFirst = compose(second, forward);
  if (!mapsEqual(eqX, first.source.carrier, composedFirst.map, first.map)) {
    throw new Error(
      "topEqualizerComparison: forward mediator does not reproduce the first inclusion.",
    );
  }

  const composedSecond = compose(first, backward);
  if (!mapsEqual(eqX, second.source.carrier, composedSecond.map, second.map)) {
    throw new Error(
      "topEqualizerComparison: backward mediator does not reproduce the second inclusion.",
    );
  }

  const roundTripFirst = compose(backward, forward);
  const roundTripSecond = compose(forward, backward);

  const idFirst = (x: X) => x;
  if (!mapsEqual(eqFirst, first.source.carrier, roundTripFirst.map, idFirst)) {
    throw new Error("topEqualizerComparison: backward ∘ forward is not the identity on the first equalizer.");
  }

  const idSecond = (x: X) => x;
  if (!mapsEqual(eqSecond, second.source.carrier, roundTripSecond.map, idSecond)) {
    throw new Error("topEqualizerComparison: forward ∘ backward is not the identity on the second equalizer.");
  }

  return { forward, backward };
}

export type {
  EqualizerFactorizationResult,
  EqualizerMediatorMetadata,
  TopEqualizerComparison,
  TopEqualizerWitness,
};
