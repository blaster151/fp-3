export type Top<X> = {
  readonly carrier: ReadonlyArray<X>;
  readonly opens: ReadonlyArray<ReadonlyArray<X>>;
  readonly show?: (x: X) => string;
};

function eqArr<X>(eq: (a: X, b: X) => boolean, A: ReadonlyArray<X>, B: ReadonlyArray<X>): boolean {
  return (
    A.length === B.length &&
    A.every((a) => B.some((b) => eq(a, b))) &&
    B.every((b) => A.some((a) => eq(a, b)))
  );
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
        subset.push(X[i]);
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

/** Continuity: f^{-1}(V) open in X for all open V in Y. */
export function continuous<X, Y>(
  eqX: (a: X, b: X) => boolean,
  TX: Top<X>,
  TY: Top<Y>,
  f: (x: X) => Y,
  eqY?: (a: Y, b: Y) => boolean,
): boolean {
  const eqCod = eqY ?? ((a: Y, b: Y) => a === b);
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
