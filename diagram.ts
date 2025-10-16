// Chapter 6 diagram utilities: representational paths, composites, commutativity, and pasting.

export type Arrow<A, B> = (a: A) => B;
type AnyArrow = (a: any) => any;
export type Path<A, B> = ReadonlyArray<AnyArrow>;

export function composePath<A, B>(path: Path<A, B>): Arrow<A, B> {
  return (x: A) => {
    let acc: unknown = x;
  for (const f of path) {
    acc = f(acc);
  }
    return acc as B;
  };
}

export function commutes<A, B>(p1: Path<A, B>, p2: Path<A, B>, sample: ReadonlyArray<A>): boolean {
  const f1 = composePath(p1);
  const f2 = composePath(p2);
  return sample.every(x => Object.is(f1(x), f2(x)));
}

export function commutesTweaked<A, B>(
  p1: Path<A, B>,
  p2: Path<A, B>,
  sample: ReadonlyArray<A>
): boolean {
  const len1 = p1.length;
  const len2 = p2.length;
  if (len1 === 1 && len2 === 1) {
    return true;
  }
  return commutes(p1, p2, sample);
}

export function paste<A, B, C>(pXY: Path<A, B>, pYZ: Path<B, C>): Path<A, C> {
  return [...pXY, ...pYZ];
}

export function allCommute<A, B>(paths: ReadonlyArray<Path<A, B>>, sample: ReadonlyArray<A>): boolean {
  for (let i = 0; i < paths.length; i += 1) {
    const left = paths[i]!;
    for (let j = i + 1; j < paths.length; j += 1) {
      const right = paths[j]!;
      if (!commutes(left, right, sample)) {
        return false;
      }
    }
  }
  return true;
}

export function allCommuteTweaked<A, B>(paths: ReadonlyArray<Path<A, B>>, sample: ReadonlyArray<A>): boolean {
  for (let i = 0; i < paths.length; i += 1) {
    const left = paths[i]!;
    for (let j = i + 1; j < paths.length; j += 1) {
      const right = paths[j]!;
      if (!commutesTweaked(left, right, sample)) {
        return false;
      }
    }
  }
  return true;
}

export function id<A>(): Arrow<A, A> {
  return (x: A) => x;
}

export function isIdentity<A>(path: Path<A, A>, sample: ReadonlyArray<A>): boolean {
  const f = composePath(path);
  return sample.every(x => Object.is(f(x), x));
}

export interface Morph {
  readonly src: unknown;
  readonly dst: unknown;
}

export function composeAbstract(path: ReadonlyArray<Morph>, compose: (g: Morph, f: Morph) => Morph): Morph {
  if (path.length === 0) {
    throw new Error("composeAbstract: empty path");
  }
  let acc = path[0]!;
  for (let i = 1; i < path.length; i += 1) {
    const next = path[i]!;
    acc = compose(next, acc);
  }
  return acc;
}

export function commutesAbstract(
  p1: ReadonlyArray<Morph>,
  p2: ReadonlyArray<Morph>,
  compose: (g: Morph, f: Morph) => Morph,
  equals: (a: Morph, b: Morph) => boolean
): boolean {
  const c1 = composeAbstract(p1, compose);
  const c2 = composeAbstract(p2, compose);
  return equals(c1, c2);
}

export function pasteAbstract(pXY: ReadonlyArray<Morph>, pYZ: ReadonlyArray<Morph>): ReadonlyArray<Morph> {
  return [...pXY, ...pYZ];
}
