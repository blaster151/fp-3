import {
  coproduct,
  type CoproductPoint,
  product,
  type Top,
  continuous,
  type TopStructure,
  forgetStructure,
} from "./Topology";
import {
  finalTopology,
  initialTopology,
  type FinalLeg,
  type InitialLeg,
} from "./InitialFinal";
import { pair, proj1, proj2 } from "./ProductUP";

type Eq<X> = (a: X, b: X) => boolean;

export type ProductPoint<X, Y> = { readonly x: X; readonly y: Y };

export type SumPoint<X, Y> = CoproductPoint<X, Y>;

export type ContinuityWitnessEntry<X, Y> = {
  readonly open: ReadonlyArray<Y>;
  readonly preimage: ReadonlyArray<X>;
};

export type ContinuityWitnessPayload<X, Y> = {
  readonly preimages: ReadonlyArray<ContinuityWitnessEntry<X, Y>>;
  readonly note?: string;
};

export type ContinuityWitness<X, Y> = {
  readonly holds: boolean;
  readonly verify: () => boolean;
  readonly failures: ReadonlyArray<ContinuityWitnessEntry<X, Y>>;
  readonly witness?: ContinuityWitnessPayload<X, Y>;
};

export type ContinuousMap<X, Y> = {
  readonly source: Top<X>;
  readonly target: Top<Y>;
  readonly eqSource: Eq<X>;
  readonly eqTarget: Eq<Y>;
  readonly map: (x: X) => Y;
  readonly witness: ContinuityWitness<X, Y>;
  readonly sourceStructure?: TopStructure<X>;
  readonly targetStructure?: TopStructure<Y>;
};

type InitialTopologyRequest<X, Y> = {
  readonly carrier: ReadonlyArray<X>;
  readonly extraLegs?: ReadonlyArray<InitialLeg<X, any>>;
  readonly includeMapLeg?: boolean;
};

type FinalTopologyRequest<Y> = {
  readonly carrier: ReadonlyArray<Y>;
  readonly extraLegs?: ReadonlyArray<FinalLeg<any, Y>>;
  readonly includeMapLeg?: boolean;
};

type ResolvedContinuousMapData<X, Y> = {
  readonly source: Top<X>;
  readonly target: Top<Y>;
  readonly eqSource: Eq<X>;
  readonly eqTarget: Eq<Y>;
  readonly map: (x: X) => Y;
  readonly sourceStructure?: TopStructure<X>;
  readonly targetStructure?: TopStructure<Y>;
};

type TopInput<X> = Top<X> | TopStructure<X>;

type ContinuousMapData<X, Y> = {
  readonly source?: TopInput<X>;
  readonly target?: TopInput<Y>;
  readonly eqSource?: Eq<X>;
  readonly eqTarget?: Eq<Y>;
  readonly map: (x: X) => Y;
  readonly initialSource?: InitialTopologyRequest<X, Y>;
  readonly finalTarget?: FinalTopologyRequest<Y>;
};

function isTopStructure<X>(input: TopInput<X> | undefined): input is TopStructure<X> {
  return Boolean(input && typeof (input as TopStructure<X>).eq === "function");
}

type NormalizedTopology<X> = {
  readonly topology?: Top<X>;
  readonly eq?: Eq<X>;
  readonly structure?: TopStructure<X>;
};

function normalizeTopology<X>(input: TopInput<X> | undefined, eqHint?: Eq<X>): NormalizedTopology<X> {
  if (!input) {
    return eqHint === undefined ? {} : { eq: eqHint };
  }
  if (isTopStructure(input)) {
    return { topology: forgetStructure(input), eq: input.eq, structure: input };
  }
  return eqHint === undefined ? { topology: input } : { topology: input, eq: eqHint };
}

function resolveInitialTopology<X, Y>(
  data: ContinuousMapData<X, Y>,
  target: Top<Y>,
  eqSource: Eq<X>,
  eqTarget: Eq<Y>,
): Top<X> {
  const request = data.initialSource;
  if (!request) {
    throw new Error("makeContinuousMap: source topology missing and no initial topology request provided");
  }
  const legs: InitialLeg<X, any>[] = [
    ...(request.extraLegs ?? []),
  ];
  if (request.includeMapLeg ?? true) {
    legs.push({ target, map: data.map, eqTarget });
  }
  return initialTopology(eqSource, request.carrier, legs);
}

function resolveFinalTopology<X, Y>(
  data: ContinuousMapData<X, Y>,
  source: Top<X>,
  eqSource: Eq<X>,
  eqTarget: Eq<Y>,
): Top<Y> {
  const request = data.finalTarget;
  if (!request) {
    throw new Error("makeContinuousMap: target topology missing and no final topology request provided");
  }
  const legs: FinalLeg<any, Y>[] = [
    ...(request.extraLegs ?? []),
  ];
  if (request.includeMapLeg ?? true) {
    legs.push({ source, map: data.map, eqSource });
  }
  return finalTopology(eqTarget, request.carrier, legs);
}

function resolveTopologies<X, Y>(data: ContinuousMapData<X, Y>): ResolvedContinuousMapData<X, Y> {
  const normalizedSource = normalizeTopology(data.source, data.eqSource);
  const normalizedTarget = normalizeTopology(data.target, data.eqTarget);

  let source = normalizedSource.topology;
  let target = normalizedTarget.topology;
  let eqSource = normalizedSource.eq;
  let eqTarget = normalizedTarget.eq;

  const { structure: sourceStructure } = normalizedSource;
  const { structure: targetStructure } = normalizedTarget;

  if (!eqSource && sourceStructure) {
    eqSource = sourceStructure.eq;
  }
  if (!eqTarget && targetStructure) {
    eqTarget = targetStructure.eq;
  }

  if (!eqSource) {
    throw new Error(
      "makeContinuousMap: source equality required (provide eqSource or a TopStructure source)",
    );
  }
  if (!eqTarget) {
    throw new Error(
      "makeContinuousMap: target equality required (provide eqTarget or a TopStructure target)",
    );
  }

  if (!target && !data.finalTarget) {
    throw new Error("makeContinuousMap: target topology required when no final topology request is provided");
  }
  if (!source) {
    if (!target) {
      throw new Error("makeContinuousMap: cannot compute initial topology without target");
    }
    source = resolveInitialTopology(data, target, eqSource, eqTarget);
  }
  if (!target) {
    target = resolveFinalTopology(data, source, eqSource, eqTarget);
  }
  return {
    source,
    target,
    eqSource,
    eqTarget,
    map: data.map,
    ...(sourceStructure ? { sourceStructure } : {}),
    ...(targetStructure ? { targetStructure } : {}),
  };
}

export function certifyContinuity<X, Y>({
  source,
  target,
  eqSource,
  eqTarget,
  map,
  sourceStructure,
  targetStructure,
}: ResolvedContinuousMapData<X, Y>): ContinuityWitness<X, Y> {
  const eqCod = targetStructure?.eq ?? eqTarget;
  const verify = () =>
    sourceStructure && targetStructure
      ? continuous(sourceStructure, targetStructure, map)
      : continuous(eqSource, source, target, map, eqTarget);

  const eqSet = (A: ReadonlyArray<X>, B: ReadonlyArray<X>) =>
    A.length === B.length &&
    A.every((a) => B.some((b) => eqSource(a, b))) &&
    B.every((b) => A.some((a) => eqSource(a, b)));

  const records = target.opens.map((open) => {
    const openCopy = open.slice();
    const preimage = source.carrier.filter((x) => open.some((y) => eqCod(map(x), y)));
    const isOpen = source.opens.some((candidate) => eqSet(candidate, preimage));
    return { open: openCopy, preimage, isOpen };
  });

  const failures = records
    .filter((record) => !record.isOpen)
    .map<ContinuityWitnessEntry<X, Y>>(({ open, preimage }) => ({ open, preimage }));

  const holds = failures.length === 0;
  const witnessPayload: ContinuityWitnessPayload<X, Y> | undefined = holds
    ? {
        preimages: records.map(({ open, preimage }) => ({ open, preimage })),
        note: sourceStructure || targetStructure ? "via structured verification" : "computed directly",
      }
    : undefined;

  const result: ContinuityWitness<X, Y> = {
    holds,
    verify,
    failures,
    ...(witnessPayload ? { witness: witnessPayload } : {}),
  };

  if (!holds) {
    const error = new Error("map is not continuous");
    (error as Error & { witness: ContinuityWitness<X, Y> }).witness = result;
    throw error;
  }
  return result;
}

export function makeContinuousMap<X, Y>(data: ContinuousMapData<X, Y>): ContinuousMap<X, Y> {
  const resolved = resolveTopologies(data);
  return {
    ...resolved,
    witness: certifyContinuity(resolved),
  };
}

export function identity<X>(structure: TopStructure<X>): ContinuousMap<X, X>;
export function identity<X>(eqX: Eq<X>, TX: Top<X>): ContinuousMap<X, X>;
export function identity<X>(
  arg1: Eq<X> | TopStructure<X>,
  arg2?: Top<X>,
): ContinuousMap<X, X> {
  if (typeof arg1 === "function") {
    const eqX = arg1;
    const TX = arg2 as Top<X>;
    return makeContinuousMap({
      source: TX,
      target: TX,
      eqSource: eqX,
      eqTarget: eqX,
      map: (x) => x,
    });
  }
  const structure = arg1;
  return makeContinuousMap({
    source: structure,
    target: structure,
    map: (x) => x,
  });
}

export function compose<X, Y, Z>(
  g: ContinuousMap<Y, Z>,
  f: ContinuousMap<X, Y>,
): ContinuousMap<X, Z> {
  if (f.target !== g.source) {
    throw new Error("compose: target/source topology mismatch");
  }
  if (f.eqTarget !== g.eqSource) {
    throw new Error("compose: equality witness mismatch");
  }
  const composed = makeContinuousMap({
    source: f.source,
    target: g.target,
    eqSource: f.eqSource,
    eqTarget: g.eqTarget,
    map: (x) => g.map(f.map(x)),
  });
  if (composed.witness.holds && composed.witness.witness) {
    const inheritedNotes = [
      composed.witness.witness.note,
      g.witness.witness?.note,
      f.witness.witness?.note,
    ].filter((note): note is string => Boolean(note));
    const note = [
      ...inheritedNotes,
      "composition witness",
    ].join("; ");
    return {
      ...composed,
      witness: {
        ...composed.witness,
        witness: {
          ...composed.witness.witness,
          note,
        },
      },
    };
  }
  return composed;
}

function eqPair<X, Y>(eqX: Eq<X>, eqY: Eq<Y>, a: ProductPoint<X, Y>, b: ProductPoint<X, Y>): boolean {
  return eqX(a.x, b.x) && eqY(a.y, b.y);
}

function eqSum<X, Y>(eqX: Eq<X>, eqY: Eq<Y>, a: SumPoint<X, Y>, b: SumPoint<X, Y>): boolean {
  if (a.tag !== b.tag) {
    return false;
  }
  return a.tag === "inl" ? eqX(a.value, (b as typeof a).value) : eqY(a.value, (b as typeof a).value);
}

export function productTopology<X, Y>(
  TX: TopStructure<X>,
  TY: TopStructure<Y>,
): { readonly topology: Top<ProductPoint<X, Y>>; readonly eq: Eq<ProductPoint<X, Y>> };
export function productTopology<X, Y>(
  eqX: Eq<X>,
  eqY: Eq<Y>,
  TX: Top<X>,
  TY: Top<Y>,
): { readonly topology: Top<ProductPoint<X, Y>>; readonly eq: Eq<ProductPoint<X, Y>> };
export function productTopology<X, Y>(
  arg1: Eq<X> | TopStructure<X>,
  arg2: Eq<Y> | TopStructure<Y>,
  arg3?: Top<X>,
  arg4?: Top<Y>,
): { readonly topology: Top<ProductPoint<X, Y>>; readonly eq: Eq<ProductPoint<X, Y>> } {
  if (typeof arg1 === "function") {
    const eqX = arg1;
    const eqY = arg2 as Eq<Y>;
    const TX = arg3 as Top<X>;
    const TY = arg4 as Top<Y>;
    const topology = product(eqX, eqY, TX, TY);
    return {
      topology,
      eq: (a, b) => eqPair(eqX, eqY, a, b),
    };
  }
  const TXStructure = arg1;
  if (!isTopStructure(arg2 as TopInput<Y>)) {
    throw new Error(
      "productTopology: second argument must be a TopStructure when the first argument is a TopStructure",
    );
  }
  const TYStructure = arg2 as TopStructure<Y>;
  return productTopology(
    TXStructure.eq,
    TYStructure.eq,
    forgetStructure(TXStructure),
    forgetStructure(TYStructure),
  );
}

export type ProductStructure<X, Y> = {
  readonly topology: Top<ProductPoint<X, Y>>;
  readonly eq: Eq<ProductPoint<X, Y>>;
  readonly proj1: ContinuousMap<ProductPoint<X, Y>, X>;
  readonly proj2: ContinuousMap<ProductPoint<X, Y>, Y>;
};

export type CoproductStructure<X, Y> = {
  readonly topology: Top<SumPoint<X, Y>>;
  readonly eq: Eq<SumPoint<X, Y>>;
  readonly inl: ContinuousMap<X, SumPoint<X, Y>>;
  readonly inr: ContinuousMap<Y, SumPoint<X, Y>>;
};

export function productStructure<X, Y>(TX: TopStructure<X>, TY: TopStructure<Y>): ProductStructure<X, Y>;
export function productStructure<X, Y>(
  eqX: Eq<X>,
  eqY: Eq<Y>,
  TX: Top<X>,
  TY: Top<Y>,
): ProductStructure<X, Y>;
export function productStructure<X, Y>(
  arg1: Eq<X> | TopStructure<X>,
  arg2: Eq<Y> | TopStructure<Y>,
  arg3?: Top<X>,
  arg4?: Top<Y>,
): ProductStructure<X, Y> {
  if (typeof arg1 === "function") {
    const eqX = arg1;
    const eqY = arg2 as Eq<Y>;
    const TX = arg3 as Top<X>;
    const TY = arg4 as Top<Y>;
    const { topology, eq } = productTopology(eqX, eqY, TX, TY);
    return {
      topology,
      eq,
      proj1: makeContinuousMap({
        source: topology,
        target: TX,
        eqSource: eq,
        eqTarget: eqX,
        map: proj1,
      }),
      proj2: makeContinuousMap({
        source: topology,
        target: TY,
        eqSource: eq,
        eqTarget: eqY,
        map: proj2,
      }),
    };
  }
  const TXStructure = arg1;
  if (!isTopStructure(arg2 as TopInput<Y>)) {
    throw new Error(
      "productStructure: second argument must be a TopStructure when the first argument is a TopStructure",
    );
  }
  const TYStructure = arg2 as TopStructure<Y>;
  const { topology, eq } = productTopology(TXStructure, TYStructure);
  return {
    topology,
    eq,
    proj1: makeContinuousMap({
      source: topology,
      target: TXStructure,
      eqSource: eq,
      map: proj1,
    }),
    proj2: makeContinuousMap({
      source: topology,
      target: TYStructure,
      eqSource: eq,
      map: proj2,
    }),
  };
}

export function projection1<X, Y>(structure: ProductStructure<X, Y>): ContinuousMap<ProductPoint<X, Y>, X> {
  return structure.proj1;
}

export function projection2<X, Y>(structure: ProductStructure<X, Y>): ContinuousMap<ProductPoint<X, Y>, Y> {
  return structure.proj2;
}

export function pairing<Z, X, Y>(
  f: ContinuousMap<Z, X>,
  g: ContinuousMap<Z, Y>,
  productInfo?: { readonly topology: Top<ProductPoint<X, Y>>; readonly eq: Eq<ProductPoint<X, Y>> },
): ContinuousMap<Z, ProductPoint<X, Y>> {
  if (f.source !== g.source) {
    throw new Error("pairing: domain topology mismatch");
  }
  if (f.eqSource !== g.eqSource) {
    throw new Error("pairing: domain equality mismatch");
  }
  const { topology, eq } =
    productInfo ?? productTopology(f.eqTarget, g.eqTarget, f.target, g.target);
  return makeContinuousMap({
    source: f.source,
    target: topology,
    eqSource: f.eqSource,
    eqTarget: eq,
    map: pair(f.map, g.map),
  });
}

export function coproductTopology<X, Y>(
  TX: TopStructure<X>,
  TY: TopStructure<Y>,
): { readonly topology: Top<SumPoint<X, Y>>; readonly eq: Eq<SumPoint<X, Y>> };
export function coproductTopology<X, Y>(
  eqX: Eq<X>,
  eqY: Eq<Y>,
  TX: Top<X>,
  TY: Top<Y>,
): { readonly topology: Top<SumPoint<X, Y>>; readonly eq: Eq<SumPoint<X, Y>> };
export function coproductTopology<X, Y>(
  arg1: Eq<X> | TopStructure<X>,
  arg2: Eq<Y> | TopStructure<Y>,
  arg3?: Top<X>,
  arg4?: Top<Y>,
): { readonly topology: Top<SumPoint<X, Y>>; readonly eq: Eq<SumPoint<X, Y>> } {
  if (typeof arg1 === "function") {
    const eqX = arg1;
    const eqY = arg2 as Eq<Y>;
    const TX = arg3 as Top<X>;
    const TY = arg4 as Top<Y>;
    const topology = coproduct(eqX, eqY, TX, TY);
    return {
      topology,
      eq: (a, b) => eqSum(eqX, eqY, a, b),
    };
  }
  const TXStructure = arg1;
  if (!isTopStructure(arg2 as TopInput<Y>)) {
    throw new Error(
      "coproductTopology: second argument must be a TopStructure when the first argument is a TopStructure",
    );
  }
  const TYStructure = arg2 as TopStructure<Y>;
  return coproductTopology(
    TXStructure.eq,
    TYStructure.eq,
    forgetStructure(TXStructure),
    forgetStructure(TYStructure),
  );
}

export function coproductStructure<X, Y>(
  TX: TopStructure<X>,
  TY: TopStructure<Y>,
): CoproductStructure<X, Y>;
export function coproductStructure<X, Y>(
  eqX: Eq<X>,
  eqY: Eq<Y>,
  TX: Top<X>,
  TY: Top<Y>,
): CoproductStructure<X, Y>;
export function coproductStructure<X, Y>(
  arg1: Eq<X> | TopStructure<X>,
  arg2: Eq<Y> | TopStructure<Y>,
  arg3?: Top<X>,
  arg4?: Top<Y>,
): CoproductStructure<X, Y> {
  if (typeof arg1 === "function") {
    const eqX = arg1;
    const eqY = arg2 as Eq<Y>;
    const TX = arg3 as Top<X>;
    const TY = arg4 as Top<Y>;
    const { topology, eq } = coproductTopology(eqX, eqY, TX, TY);
    return {
      topology,
      eq,
      inl: makeContinuousMap({
        source: TX,
        target: topology,
        eqSource: eqX,
        eqTarget: eq,
        map: (x) => ({ tag: "inl" as const, value: x }),
      }),
      inr: makeContinuousMap({
        source: TY,
        target: topology,
        eqSource: eqY,
        eqTarget: eq,
        map: (y) => ({ tag: "inr" as const, value: y }),
      }),
    };
  }
  const TXStructure = arg1;
  if (!isTopStructure(arg2 as TopInput<Y>)) {
    throw new Error(
      "coproductStructure: second argument must be a TopStructure when the first argument is a TopStructure",
    );
  }
  const TYStructure = arg2 as TopStructure<Y>;
  const { topology, eq } = coproductTopology(TXStructure, TYStructure);
  return {
    topology,
    eq,
    inl: makeContinuousMap({
      source: TXStructure,
      target: topology,
      eqTarget: eq,
      map: (x) => ({ tag: "inl" as const, value: x }),
    }),
    inr: makeContinuousMap({
      source: TYStructure,
      target: topology,
      eqTarget: eq,
      map: (y) => ({ tag: "inr" as const, value: y }),
    }),
  };
}

export function injectionLeft<X, Y>(structure: CoproductStructure<X, Y>): ContinuousMap<X, SumPoint<X, Y>> {
  return structure.inl;
}

export function injectionRight<X, Y>(structure: CoproductStructure<X, Y>): ContinuousMap<Y, SumPoint<X, Y>> {
  return structure.inr;
}

export function copair<X, Y, Z>(
  f: ContinuousMap<X, Z>,
  g: ContinuousMap<Y, Z>,
  coproductInfo?: { readonly topology: Top<SumPoint<X, Y>>; readonly eq: Eq<SumPoint<X, Y>> },
): ContinuousMap<SumPoint<X, Y>, Z> {
  if (f.target !== g.target) {
    throw new Error("copair: codomain topology mismatch");
  }
  if (f.eqTarget !== g.eqTarget) {
    throw new Error("copair: codomain equality mismatch");
  }
  const { topology, eq } =
    coproductInfo ?? coproductTopology(f.eqSource, g.eqSource, f.source, g.source);
  return makeContinuousMap({
    source: topology,
    target: f.target,
    eqSource: eq,
    eqTarget: f.eqTarget,
    map: (pt) => (pt.tag === "inl" ? f.map(pt.value) : g.map(pt.value)),
  });
}
