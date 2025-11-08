/**
 * Minimal free tree monad over a signature Σ capturing return and n-ary Op nodes.
 * This is a pragmatic placeholder sufficient for wiring runner ⇔ monad translators.
 */
import type { MonadStructure } from "./monad-comonad-interaction-law";
import { SetCat, type SetHom, type SetObj } from "./set-cat";

export interface Signature {
  readonly operations: ReadonlyArray<{ readonly name: string; readonly arity: number }>;
}

export type Tree<A> =
  | { readonly _tag: "Return"; readonly value: A }
  | { readonly _tag: "Op"; readonly name: string; readonly children: ReadonlyArray<Tree<A>> };

export const Return = <A>(value: A): Tree<A> => ({ _tag: "Return", value });
export const Op = <A>(name: string, children: ReadonlyArray<Tree<A>>): Tree<A> => ({ _tag: "Op", name, children });

export interface FreeTreeMonad<Obj, Arr> extends MonadStructure<Obj, Arr> {
  readonly signature: Signature;
  readonly carriers: ReadonlyMap<Obj, SetObj<Tree<unknown>>>;
}

export const makeFreeTreeMonad = <Obj, Arr>(
  signature: Signature,
  base: ReadonlyMap<Obj, SetObj<unknown>>,
): FreeTreeMonad<Obj, Arr> => {
  const carriers = new Map<Obj, SetObj<Tree<unknown>>>();
  for (const [o, carrier] of base.entries()) {
    const elements: Tree<unknown>[] = [];
    let n = 0;
    for (const v of carrier as Iterable<unknown>) {
      elements.push(Return(v));
      if (++n >= 16) break;
    }
    carriers.set(o, SetCat.obj(elements) as SetObj<Tree<unknown>>);
  }
  const functor = {
    functor: {
      F0: (o: Obj) => carriers.get(o) as SetObj<unknown>,
      F1: <X, Y>(_a: Arr, x: SetHom<X, Y>) => x as unknown as SetHom<unknown, unknown>,
    },
    objects: Array.from(carriers.keys()),
  } as any;
  const unit = {
    transformation: {
      component: (o: Obj): SetHom<unknown, unknown> => {
        const dom = base.get(o)!;
        const cod = carriers.get(o)! as SetObj<unknown>;
        return SetCat.hom(dom, cod, (x: unknown) => Return(x) as unknown);
      },
    },
  } as any;
  const flatten = <A>(t: Tree<Tree<A>>): Tree<A> => {
    switch (t._tag) {
      case "Return": return t.value;
      case "Op": return Op(t.name, t.children.map(flatten));
    }
  };
  const multiplication = {
    transformation: {
      component: (o: Obj): SetHom<unknown, unknown> => {
        const cod = carriers.get(o)! as SetObj<unknown>;
        return SetCat.hom(cod, cod, (tree: unknown) => flatten(tree as Tree<Tree<unknown>>) as unknown);
      },
    },
  } as any;
  return { functor, unit, multiplication, signature, carriers, metadata: ["FreeTreeMonad"] };
};

export const foldTree = <A, R>(
  alg: {
    onReturn: (a: A) => R;
    onOp: (name: string, args: ReadonlyArray<R>) => R;
  },
) => (t: Tree<A>): R => {
  switch (t._tag) {
    case "Return": return alg.onReturn(t.value);
    case "Op": return alg.onOp(t.name, t.children.map(foldTree(alg)));
  }
};
