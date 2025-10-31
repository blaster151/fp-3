export type Top<X> = {
  readonly carrier: ReadonlyArray<X>;
  readonly opens: ReadonlyArray<ReadonlyArray<X>>;
  readonly show?: (x: X) => string;
};

export type TopStructure<X> = {
  readonly carrier: ReadonlyArray<X>;
  readonly opens: ReadonlyArray<ReadonlyArray<X>>;
  readonly eq: (a: X, b: X) => boolean;
  readonly show?: (x: X) => string;
};

export function topStructure<X>({
  carrier,
  opens,
  eq,
  show,
}: {
  readonly carrier: ReadonlyArray<X>;
  readonly opens: ReadonlyArray<ReadonlyArray<X>>;
  readonly eq: (a: X, b: X) => boolean;
  readonly show?: (x: X) => string;
}): TopStructure<X> {
  const base = {
    carrier: [...carrier],
    opens: opens.map((U) => [...U]),
    eq,
  } as const;
  return show === undefined ? base : { ...base, show };
}

export function structureFromTop<X>(
  eq: (a: X, b: X) => boolean,
  topology: Top<X>,
  options?: { readonly show?: (x: X) => string },
): TopStructure<X> {
  const { carrier, opens, show } = topology;
  const showFn = options?.show ?? show;
  return showFn === undefined
    ? topStructure({ carrier, opens, eq })
    : topStructure({ carrier, opens, eq, show: showFn });
}

export function forgetStructure<X>(structure: TopStructure<X>): Top<X> {
  const { carrier, opens, show } = structure;
  const base = {
    carrier: [...carrier],
    opens: opens.map((U) => [...U]),
  } as const;
  return show === undefined ? base : { ...base, show };
}

export type CoproductPoint<X, Y> =
  | { readonly tag: "inl"; readonly value: X }
  | { readonly tag: "inr"; readonly value: Y };

function eqArr<X>(eq: (a: X, b: X) => boolean, A: ReadonlyArray<X>, B: ReadonlyArray<X>): boolean {
  return (
    A.length === B.length &&
    A.every((a) => B.some((b) => eq(a, b))) &&
    B.every((b) => A.some((a) => eq(a, b)))
  );
}

function dedupeSets<X>(
  eqX: (a: X, b: X) => boolean,
  sets: ReadonlyArray<ReadonlyArray<X>>,
): ReadonlyArray<ReadonlyArray<X>> {
  const eqSet = (A: ReadonlyArray<X>, B: ReadonlyArray<X>) => eqArr(eqX, A, B);
  const unique: Array<ReadonlyArray<X>> = [];
  for (const candidate of sets) {
    if (!unique.some((existing) => eqSet(existing, candidate))) {
      unique.push([...candidate]);
    }
  }
  return unique;
}

function eqSet<X>(
  eqX: (a: X, b: X) => boolean,
  A: ReadonlyArray<X>,
  B: ReadonlyArray<X>,
): boolean {
  return eqArr(eqX, A, B);
}

function complement<X>(
  eqX: (a: X, b: X) => boolean,
  carrier: ReadonlyArray<X>,
  subset: ReadonlyArray<X>,
): ReadonlyArray<X> {
  return carrier.filter((x) => !subset.some((y) => eqX(x, y)));
}

function neighborhoods<X>(
  eqX: (a: X, b: X) => boolean,
  T: Top<X>,
  point: X,
): ReadonlyArray<ReadonlyArray<X>> {
  return T.opens.filter((U) => U.some((u) => eqX(u, point)));
}

export function isTopology<X>(eqX: (a: X, b: X) => boolean, T: Top<X>): boolean {
  const { carrier: Xs, opens } = T;
  const inCarrier = (U: ReadonlyArray<X>) => U.every((x) => Xs.some((y) => eqX(x, y)));
  const hasEmpty = opens.some((U) => U.length === 0);
  const hasAll = opens.some((U) => eqArr(eqX, U, Xs));
  if (!hasEmpty || !hasAll) {
    return false;
  }
  for (const U of opens) {
    for (const V of opens) {
      const UuV = Array.from(new Set([...U, ...V]));
      if (!opens.some((W) => eqArr(eqX, W, UuV))) {
        return false;
      }
      const UiV = U.filter((x) => V.some((y) => eqX(x, y)));
      if (!opens.some((W) => eqArr(eqX, W, UiV))) {
        return false;
      }
    }
  }
  return opens.every(inCarrier);
}

export function discrete<X>(X: ReadonlyArray<X>): Top<X> {
  const n = X.length;
  const opens: Array<X[]> = [];
  for (let m = 0; m < 1 << n; m += 1) {
    const subset: X[] = [];
    for (let i = 0; i < n; i += 1) {
      if (m & (1 << i)) {
        const xi = X[i];
        if (xi !== undefined) {
          subset.push(xi);
        }
      }
    }
    opens.push(subset);
  }
  return { carrier: [...X], opens };
}

export function indiscrete<X>(X: ReadonlyArray<X>): Top<X> {
  return { carrier: [...X], opens: [[], [...X]] };
}

function eqProduct<X, Y>(
  eqX: (a: X, b: X) => boolean,
  eqY: (a: Y, b: Y) => boolean,
  a: { readonly x: X; readonly y: Y },
  b: { readonly x: X; readonly y: Y },
): boolean {
  return eqX(a.x, b.x) && eqY(a.y, b.y);
}

function eqCoproductPoint<X, Y>(
  eqX: (a: X, b: X) => boolean,
  eqY: (a: Y, b: Y) => boolean,
  a: CoproductPoint<X, Y>,
  b: CoproductPoint<X, Y>,
): boolean {
  if (a.tag !== b.tag) {
    return false;
  }
  return a.tag === "inl" ? eqX(a.value, (b as typeof a).value) : eqY(a.value, (b as typeof a).value);
}

/** Product topology on X×Y (finite). */
export function product<X, Y>(
  eqX: (a: X, b: X) => boolean,
  eqY: (a: Y, b: Y) => boolean,
  TX: Top<X>,
  TY: Top<Y>,
): Top<{ readonly x: X; readonly y: Y }> {
  const Xs = TX.carrier;
  const Ys = TY.carrier;
  const carrier = Xs.flatMap((x) => Ys.map((y) => ({ x, y })));
  const base: Array<Array<{ readonly x: X; readonly y: Y }>> = [];
  for (const U of TX.opens) {
    for (const V of TY.opens) {
      const UV = U.flatMap((x) => V.map((y) => ({ x, y })));
      base.push(UV);
    }
  }
  const opens: Array<Array<{ readonly x: X; readonly y: Y }>> = [];
  const pushUnique = (S: Array<{ readonly x: X; readonly y: Y }>) => {
    if (!opens.some((W) => eqArr((a, b) => eqProduct(eqX, eqY, a, b), W, S))) {
      opens.push(S);
    }
  };
  const seed = [[], ...base];
  for (const U of seed) {
    pushUnique(U);
  }
  for (let changed = true; changed;) {
    changed = false;
    outer: for (const U of opens) {
      for (const V of opens) {
        const UuV = Array.from(new Set([...U, ...V]));
        const UiV = U.filter((a) => V.some((b) => eqProduct(eqX, eqY, a, b)));
        const before = opens.length;
        pushUnique(UuV);
        pushUnique(UiV);
        if (opens.length > before) {
          changed = true;
          break outer;
        }
      }
    }
  }
  return { carrier, opens };
}

/** Coproduct topology on X⊔Y (finite disjoint union). */
export function coproduct<X, Y>(
  eqX: (a: X, b: X) => boolean,
  eqY: (a: Y, b: Y) => boolean,
  TX: Top<X>,
  TY: Top<Y>,
): Top<CoproductPoint<X, Y>> {
  const left = TX.carrier.map((value) => ({ tag: "inl" as const, value }));
  const right = TY.carrier.map((value) => ({ tag: "inr" as const, value }));
  const carrier: Array<CoproductPoint<X, Y>> = [...left, ...right];
  const liftLeft = (U: ReadonlyArray<X>): Array<CoproductPoint<X, Y>> =>
    U.map((value) => ({ tag: "inl" as const, value }));
  const liftRight = (V: ReadonlyArray<Y>): Array<CoproductPoint<X, Y>> =>
    V.map((value) => ({ tag: "inr" as const, value }));
  const eqPoint = (a: CoproductPoint<X, Y>, b: CoproductPoint<X, Y>) =>
    eqCoproductPoint(eqX, eqY, a, b);
  const opens: Array<Array<CoproductPoint<X, Y>>> = [];
  const pushUnique = (S: Array<CoproductPoint<X, Y>>) => {
    if (!opens.some((W) => eqArr(eqPoint, W, S))) {
      opens.push(S);
    }
  };
  for (const U of TX.opens) {
    for (const V of TY.opens) {
      pushUnique([...liftLeft(U), ...liftRight(V)]);
    }
  }
  pushUnique([]);
  return { carrier, opens };
}

/** Continuity: f^{-1}(V) open in X for all open V in Y. */
export function continuous<X, Y>(
  source: TopStructure<X>,
  target: TopStructure<Y>,
  f: (x: X) => Y,
): boolean;
export function continuous<X, Y>(
  eqX: (a: X, b: X) => boolean,
  TX: Top<X>,
  TY: Top<Y>,
  f: (x: X) => Y,
  eqY?: (a: Y, b: Y) => boolean,
): boolean;
export function continuous<X, Y>(
  arg1:
    | TopStructure<X>
    | ((a: X, b: X) => boolean),
  arg2: TopStructure<Y> | Top<X>,
  arg3: ((x: X) => Y) | Top<Y>,
  arg4?: ((x: X) => Y) | ((a: Y, b: Y) => boolean),
  arg5?: (a: Y, b: Y) => boolean,
): boolean {
  if (typeof arg1 !== "function") {
    const source = arg1;
    const target = arg2 as TopStructure<Y>;
    const f = arg3 as (x: X) => Y;
    return continuous(source.eq, forgetStructure(source), forgetStructure(target), f, target.eq);
  }
  const eqX = arg1;
  const TX = arg2 as Top<X>;
  const TY = arg3 as Top<Y>;
  const f = arg4 as (x: X) => Y;
  const eqCod = arg5 ?? ((a: Y, b: Y) => a === b);
  const eqSetX = (A: ReadonlyArray<X>, B: ReadonlyArray<X>) => eqArr(eqX, A, B);
  for (const V of TY.opens) {
    const fInvV = TX.carrier.filter((x) => V.some((y) => eqCod(f(x), y)));
    if (!TX.opens.some((U) => eqSetX(U, fInvV))) {
      return false;
    }
  }
  return true;
}

/** Finite: every finite topological space is compact. */
export function isCompact<X>(_: Top<X>): boolean {
  return true;
}

/** Hausdorff (T2): points can be separated by disjoint neighborhoods. */
export function isHausdorff<X>(eqX: (a: X, b: X) => boolean, T: Top<X>): boolean {
  const { carrier: Xs, opens } = T;
  const disjoint = (A: ReadonlyArray<X>, B: ReadonlyArray<X>) =>
    A.every((a) => !B.some((b) => eqX(a, b)));
  for (const x of Xs) {
    for (const y of Xs) {
      if (!eqX(x, y)) {
        const Uc = opens.filter((U) => U.some((u) => eqX(u, x)));
        const Vc = opens.filter((V) => V.some((v) => eqX(v, y)));
        let ok = false;
        for (const U of Uc) {
          for (const V of Vc) {
            if (disjoint(U, V)) {
              ok = true;
              break;
            }
          }
          if (ok) {
            break;
          }
        }
        if (!ok) {
          return false;
        }
      }
    }
  }
  return true;
}

export function closedSets<X>(eqX: (a: X, b: X) => boolean, T: Top<X>): ReadonlyArray<ReadonlyArray<X>> {
  const { carrier, opens } = T;
  const complements = opens.map((U) => complement(eqX, carrier, U));
  return dedupeSets(eqX, complements);
}

function subspaceTopology<X>(
  eqX: (a: X, b: X) => boolean,
  T: Top<X>,
  subset: ReadonlyArray<X>,
): Top<X> {
  const restrictedOpens = T.opens.map((U) => U.filter((u) => subset.some((s) => eqX(s, u))));
  const opens = dedupeSets(eqX, restrictedOpens);
  return { carrier: [...subset], opens };
}

export function isT0<X>(eqX: (a: X, b: X) => boolean, T: Top<X>): boolean {
  const { carrier } = T;
  for (const x of carrier) {
    for (const y of carrier) {
      if (!eqX(x, y)) {
        const xHas = neighborhoods(eqX, T, x).some((U) => !U.some((u) => eqX(u, y)));
        const yHas = neighborhoods(eqX, T, y).some((U) => !U.some((u) => eqX(u, x)));
        if (!xHas && !yHas) {
          return false;
        }
      }
    }
  }
  return true;
}

export function isT1<X>(eqX: (a: X, b: X) => boolean, T: Top<X>): boolean {
  const { carrier } = T;
  for (const x of carrier) {
    for (const y of carrier) {
      if (!eqX(x, y)) {
        const xHas = neighborhoods(eqX, T, x).some((U) => !U.some((u) => eqX(u, y)));
        const yHas = neighborhoods(eqX, T, y).some((U) => !U.some((u) => eqX(u, x)));
        if (!xHas || !yHas) {
          return false;
        }
      }
    }
  }
  return true;
}

function disjoint<X>(eqX: (a: X, b: X) => boolean, A: ReadonlyArray<X>, B: ReadonlyArray<X>): boolean {
  return A.every((a) => !B.some((b) => eqX(a, b)));
}

export function isRegular<X>(eqX: (a: X, b: X) => boolean, T: Top<X>): boolean {
  if (!isT1(eqX, T)) {
    return false;
  }
  const closed = closedSets(eqX, T);
  const { carrier } = T;
  for (const x of carrier) {
    for (const F of closed) {
      if (F.some((f) => eqX(f, x)) || F.length === 0) {
        continue;
      }
      const neighborhoodsOfX = neighborhoods(eqX, T, x);
      const opensContainingF = T.opens.filter((U) => F.every((f) => U.some((u) => eqX(f, u))));
      const separated = neighborhoodsOfX.some((U) =>
        opensContainingF.some((V) => disjoint(eqX, U, V)),
      );
      if (!separated) {
        return false;
      }
    }
  }
  return true;
}

export function isNormal<X>(eqX: (a: X, b: X) => boolean, T: Top<X>): boolean {
  const closed = closedSets(eqX, T);
  for (const A of closed) {
    for (const B of closed) {
      const disjointClosed = A.every((a) => !B.some((b) => eqX(a, b)));
      if (!disjointClosed) {
        continue;
      }
      if (A.length === 0 || B.length === 0) {
        continue;
      }
      const opensContainingA = T.opens.filter((U) => A.every((a) => U.some((u) => eqX(a, u))));
      const opensContainingB = T.opens.filter((U) => B.every((b) => U.some((u) => eqX(b, u))));
      const separated = opensContainingA.some((U) =>
        opensContainingB.some((V) => disjoint(eqX, U, V)),
      );
      if (!separated) {
        return false;
      }
    }
  }
  return true;
}

export function closure<X>(
  eqX: (a: X, b: X) => boolean,
  T: Top<X>,
  subset: ReadonlyArray<X>,
): ReadonlyArray<X> {
  const { carrier } = T;
  return carrier.filter((x) =>
    neighborhoods(eqX, T, x).every((U) => U.some((u) => subset.some((s) => eqX(u, s)))),
  );
}

export function interior<X>(
  eqX: (a: X, b: X) => boolean,
  T: Top<X>,
  subset: ReadonlyArray<X>,
): ReadonlyArray<X> {
  const contained = T.opens.filter((U) => U.every((u) => subset.some((s) => eqX(u, s))));
  const points: X[] = [];
  for (const U of contained) {
    for (const u of U) {
      if (!points.some((p) => eqX(p, u))) {
        points.push(u);
      }
    }
  }
  return points;
}

export function boundary<X>(
  eqX: (a: X, b: X) => boolean,
  T: Top<X>,
  subset: ReadonlyArray<X>,
): ReadonlyArray<X> {
  const cl = closure(eqX, T, subset);
  const int = interior(eqX, T, subset);
  return cl.filter((x) => !int.some((y) => eqX(x, y)));
}

export function isConnected<X>(eqX: (a: X, b: X) => boolean, T: Top<X>): boolean {
  const { carrier, opens } = T;
  for (const U of opens) {
    if (U.length === 0 || eqSet(eqX, U, carrier)) {
      continue;
    }
    const complementOpen = opens.some((V) => eqSet(eqX, V, complement(eqX, carrier, U)));
    if (complementOpen) {
      return false;
    }
  }
  return true;
}

export type SpecializationRelation<X> = ReadonlyArray<readonly [X, X]>;

export function specializationOrder<X>(
  eqX: (a: X, b: X) => boolean,
  T: Top<X>,
): SpecializationRelation<X> {
  const { carrier } = T;
  const relation: Array<readonly [X, X]> = [];
  const pushPair = (a: X, b: X) => {
    if (!relation.some(([x, y]) => eqX(x, a) && eqX(y, b))) {
      relation.push([a, b]);
    }
  };
  for (const x of carrier) {
    for (const y of carrier) {
      const xNeighborhoods = neighborhoods(eqX, T, x);
      const everyContainsY = xNeighborhoods.every((U) => U.some((u) => eqX(u, y)));
      if (everyContainsY) {
        pushPair(x, y);
      }
    }
  }
  return relation;
}

export function isT0<X>(eqX: (a: X, b: X) => boolean, T: Top<X>): boolean {
  const { carrier } = T;
  for (const x of carrier) {
    for (const y of carrier) {
      if (!eqX(x, y)) {
        const xHas = neighborhoods(eqX, T, x).some((U) => !U.some((u) => eqX(u, y)));
        const yHas = neighborhoods(eqX, T, y).some((U) => !U.some((u) => eqX(u, x)));
        if (!xHas && !yHas) {
          return false;
        }
      }
    }
  }
  return true;
}

export function isT1<X>(eqX: (a: X, b: X) => boolean, T: Top<X>): boolean {
  const { carrier } = T;
  for (const x of carrier) {
    for (const y of carrier) {
      if (!eqX(x, y)) {
        const xHas = neighborhoods(eqX, T, x).some((U) => !U.some((u) => eqX(u, y)));
        const yHas = neighborhoods(eqX, T, y).some((U) => !U.some((u) => eqX(u, x)));
        if (!xHas || !yHas) {
          return false;
        }
      }
    }
  }
  return true;
}

function disjoint<X>(eqX: (a: X, b: X) => boolean, A: ReadonlyArray<X>, B: ReadonlyArray<X>): boolean {
  return A.every((a) => !B.some((b) => eqX(a, b)));
}

export function isRegular<X>(eqX: (a: X, b: X) => boolean, T: Top<X>): boolean {
  if (!isT1(eqX, T)) {
    return false;
  }
  const closed = closedSets(eqX, T);
  const { carrier } = T;
  for (const x of carrier) {
    for (const F of closed) {
      if (F.some((f) => eqX(f, x)) || F.length === 0) {
        continue;
      }
      const neighborhoodsOfX = neighborhoods(eqX, T, x);
      const opensContainingF = T.opens.filter((U) => F.every((f) => U.some((u) => eqX(f, u))));
      const separated = neighborhoodsOfX.some((U) =>
        opensContainingF.some((V) => disjoint(eqX, U, V)),
      );
      if (!separated) {
        return false;
      }
    }
  }
  return true;
}

export function isNormal<X>(eqX: (a: X, b: X) => boolean, T: Top<X>): boolean {
  const closed = closedSets(eqX, T);
  for (const A of closed) {
    for (const B of closed) {
      const disjointClosed = A.every((a) => !B.some((b) => eqX(a, b)));
      if (!disjointClosed) {
        continue;
      }
      if (A.length === 0 || B.length === 0) {
        continue;
      }
      const opensContainingA = T.opens.filter((U) => A.every((a) => U.some((u) => eqX(a, u))));
      const opensContainingB = T.opens.filter((U) => B.every((b) => U.some((u) => eqX(b, u))));
      const separated = opensContainingA.some((U) =>
        opensContainingB.some((V) => disjoint(eqX, U, V)),
      );
      if (!separated) {
        return false;
      }
    }
  }
  return true;
}

function powerSet<X>(items: ReadonlyArray<X>): ReadonlyArray<ReadonlyArray<X>> {
  const subsets: Array<ReadonlyArray<X>> = [[]];
  for (const item of items) {
    const newSubsets = subsets.map((subset) => [...subset, item]);
    subsets.push(...newSubsets);
  }
  return subsets;
}

function pushUnique<X>(eqX: (a: X, b: X) => boolean, xs: X[], x: X): void {
  if (!xs.some((y) => eqX(x, y))) {
    xs.push(x);
  }
}

export function connectedComponents<X>(
  eqX: (a: X, b: X) => boolean,
  T: Top<X>,
): ReadonlyArray<ReadonlyArray<X>> {
  const { carrier } = T;
  const subsets = powerSet(carrier).filter((subset) => subset.length > 0);
  const connectedSubsets = subsets.filter((subset) => isConnected(eqX, subspaceTopology(eqX, T, subset)));
  const components: Array<ReadonlyArray<X>> = [];
  const seen: X[] = [];

  for (const x of carrier) {
    if (seen.some((y) => eqX(x, y))) {
      continue;
    }
    const component: X[] = [x];
    let changed = true;
    while (changed) {
      changed = false;
      for (const subset of connectedSubsets) {
        if (!subset.some((s) => eqX(s, x))) {
          continue;
        }
        const hasNewPoint = subset.some((s) => !component.some((c) => eqX(c, s)));
        if (hasNewPoint) {
          for (const s of subset) {
            pushUnique(eqX, component, s);
          }
          changed = true;
        }
      }
    }
    for (const s of component) {
      pushUnique(eqX, seen, s);
    }
    components.push([...component]);
  }

  return components;
}

export function isTotallyDisconnected<X>(
  eqX: (a: X, b: X) => boolean,
  T: Top<X>,
): boolean {
  return connectedComponents(eqX, T).every((component) => component.length <= 1);
}

function subspaceTopology<X>(
  eqX: (a: X, b: X) => boolean,
  T: Top<X>,
  subset: ReadonlyArray<X>,
): Top<X> {
  const restrictedOpens = T.opens.map((U) => U.filter((u) => subset.some((s) => eqX(s, u))));
  const opens = dedupeSets(eqX, restrictedOpens);
  return { carrier: [...subset], opens };
}

function powerSet<X>(items: ReadonlyArray<X>): ReadonlyArray<ReadonlyArray<X>> {
  const subsets: Array<ReadonlyArray<X>> = [[]];
  for (const item of items) {
    const newSubsets = subsets.map((subset) => [...subset, item]);
    subsets.push(...newSubsets);
  }
  return subsets;
}

function pushUnique<X>(eqX: (a: X, b: X) => boolean, xs: X[], x: X): void {
  if (!xs.some((y) => eqX(x, y))) {
    xs.push(x);
  }
}

export function connectedComponents<X>(eqX: (a: X, b: X) => boolean, T: Top<X>): ReadonlyArray<ReadonlyArray<X>> {
  const { carrier } = T;
  const subsets = powerSet(carrier).filter((subset) => subset.length > 0);
  const connectedSubsets = subsets.filter((subset) => isConnected(eqX, subspaceTopology(eqX, T, subset)));
  const components: Array<ReadonlyArray<X>> = [];
  const seen: X[] = [];

  for (const x of carrier) {
    if (seen.some((y) => eqX(x, y))) {
      continue;
    }
    const component: X[] = [x];
    let changed = true;
    while (changed) {
      changed = false;
      for (const subset of connectedSubsets) {
        if (!subset.some((s) => eqX(s, x))) {
          continue;
        }
        const hasNewPoint = subset.some((s) => !component.some((c) => eqX(c, s)));
        if (hasNewPoint) {
          for (const s of subset) {
            pushUnique(eqX, component, s);
          }
          changed = true;
        }
      }
    }
    for (const s of component) {
      pushUnique(eqX, seen, s);
    }
    components.push([...component]);
  }

  return components;
}

export function isTotallyDisconnected<X>(eqX: (a: X, b: X) => boolean, T: Top<X>): boolean {
  return connectedComponents(eqX, T).every((component) => component.length <= 1);
}
