/**
 * Free tree monad over a signature Σ.  Each carrier stores genuine Tree_Σ
 * elements together with structural recursion helpers so downstream code can
 * fold/substitute by Definition 2.2.
 */
import type { MonadStructure } from "./monad-comonad-interaction-law";
import {
  SetCat,
  getCarrierSemantics,
  type SetCarrierSemantics,
  type SetHom,
  type SetObj,
} from "./set-cat";

export interface Signature {
  readonly operations: ReadonlyArray<{ readonly name: string; readonly arity: number }>;
}

export type Tree<A> =
  | { readonly _tag: "Return"; readonly value: A }
  | { readonly _tag: "Op"; readonly name: string; readonly children: ReadonlyArray<Tree<A>> };

export const Return = <A>(value: A): Tree<A> => ({ _tag: "Return", value });
export const Op = <A>(name: string, children: ReadonlyArray<Tree<A>>): Tree<A> => ({ _tag: "Op", name, children });

export interface TreeCarrierDiagnostics {
  readonly object: unknown;
  readonly sampledReturns: number;
  readonly sampledOperations: number;
  readonly maxDepth: number;
  readonly truncated: boolean;
}

export interface FreeTreeMonadOptions {
  readonly maxDepth?: number;
  readonly maxBaseSamples?: number;
  readonly maxNodesPerLayer?: number;
}

export interface FreeTreeMonad<Obj, Arr> extends MonadStructure<Obj, Arr> {
  readonly signature: Signature;
  readonly carriers: ReadonlyMap<Obj, SetObj<Tree<unknown>>>;
  readonly diagnostics: ReadonlyArray<TreeCarrierDiagnostics>;
  readonly mapTree: <A, B>(tree: Tree<A>, f: (a: A) => B) => Tree<B>;
  readonly bindTree: <A, B>(tree: Tree<A>, f: (a: A) => Tree<B>) => Tree<B>;
}

const DEFAULT_OPTIONS: Required<FreeTreeMonadOptions> = {
  maxDepth: 3,
  maxBaseSamples: 32,
  maxNodesPerLayer: 64,
};

const normalizeOptions = (options: FreeTreeMonadOptions = {}): Required<FreeTreeMonadOptions> => ({
  maxDepth: options.maxDepth ?? DEFAULT_OPTIONS.maxDepth,
  maxBaseSamples: options.maxBaseSamples ?? DEFAULT_OPTIONS.maxBaseSamples,
  maxNodesPerLayer: options.maxNodesPerLayer ?? DEFAULT_OPTIONS.maxNodesPerLayer,
});

const collectSamples = <A>(carrier: SetObj<A>, limit: number): { samples: A[]; truncated: boolean } => {
  const semantics = getCarrierSemantics(carrier);
  const result: A[] = [];
  if (semantics?.iterate) {
    for (const value of semantics.iterate()) {
      result.push(value);
      if (result.length >= limit) {
        return { samples: result, truncated: true };
      }
    }
    return { samples: result, truncated: false };
  }
  for (const value of carrier as Iterable<A>) {
    result.push(value);
    if (result.length >= limit) {
      return { samples: result, truncated: true };
    }
  }
  return { samples: result, truncated: false };
};

const enumerateCombinations = <T>(
  pool: ReadonlyArray<T>,
  arity: number,
  limit: number,
): ReadonlyArray<ReadonlyArray<T>> => {
  if (arity === 0) return [[]];
  if (pool.length === 0 || limit <= 0) return [];
  const indices = Array.from({ length: arity }, () => 0);
  const result: ReadonlyArray<T>[] = [];
  outer: while (result.length < limit) {
    result.push(indices.map((index) => pool[index]!) as ReadonlyArray<T>);
    for (let position = arity - 1; position >= 0; position -= 1) {
      const next = (indices[position] ?? 0) + 1;
      indices[position] = next;
      if (next < pool.length) {
        continue outer;
      }
      indices[position] = 0;
    }
    break;
  }
  return result;
};

const isTreeForSignature = <A>(value: Tree<A>, signature: Signature): boolean => {
  if (value._tag === "Return") return true;
  if (value._tag !== "Op") return false;
  const op = signature.operations.find((candidate) => candidate.name === value.name);
  if (!op) return false;
  if (value.children.length !== op.arity) return false;
  return value.children.every((child) => isTreeForSignature(child, signature));
};

const equalsTree = <A>(left: Tree<A>, right: Tree<A>): boolean => {
  if (left._tag !== right._tag) return false;
  if (left._tag === "Return" && right._tag === "Return") {
    return Object.is(left.value, right.value);
  }
  if (left._tag === "Op" && right._tag === "Op") {
    if (left.name !== right.name) return false;
    if (left.children.length !== right.children.length) return false;
    for (let index = 0; index < left.children.length; index += 1) {
      const leftChild = left.children[index];
      const rightChild = right.children[index];
      if (!leftChild || !rightChild) return false;
      if (!equalsTree(leftChild, rightChild)) {
        return false;
      }
    }
    return true;
  }
  return false;
};

const createTreeCarrier = (
  object: unknown,
  base: SetObj<unknown>,
  signature: Signature,
  options: Required<FreeTreeMonadOptions>,
): {
  readonly carrier: SetObj<Tree<unknown>>;
  readonly diagnostics: TreeCarrierDiagnostics;
} => {
  const { samples: baseSamples, truncated: baseTruncated } = collectSamples(base, options.maxBaseSamples);
  const layers: Tree<unknown>[][] = [];
  layers.push(baseSamples.map((value) => Return(value)));
  let truncated = baseTruncated;
  for (let depth = 1; depth <= options.maxDepth; depth += 1) {
    const available = layers.flat();
    const layer: Tree<unknown>[] = [];
    for (const op of signature.operations) {
      const combos = enumerateCombinations(available, op.arity, Math.max(0, options.maxNodesPerLayer - layer.length));
      if (combos.length === 0 && op.arity > 0) continue;
      for (const children of combos) {
        layer.push(Op(op.name, children));
      }
      if (layer.length >= options.maxNodesPerLayer) break;
    }
    if (layer.length === 0) {
      layers.push(layer);
      continue;
    }
    if (layer.length >= options.maxNodesPerLayer) {
      truncated = true;
    }
    layers.push(layer);
  }
  const samples = layers.flat();
  const semantics: SetCarrierSemantics<Tree<unknown>> = {
    iterate: function* iterate(): IterableIterator<Tree<unknown>> {
      for (const sample of samples) {
        yield sample;
      }
    },
    has: (candidate) => typeof candidate === "object" && candidate !== null && isTreeForSignature(candidate as Tree<unknown>, signature),
    equals: equalsTree,
    tag: `FreeTreeMonad(${String(object)})`,
  };
  const carrier = SetCat.obj<Tree<unknown>>([], { semantics }) as SetObj<Tree<unknown>>;
  return {
    carrier,
    diagnostics: {
      object,
      sampledReturns: layers[0]?.length ?? 0,
      sampledOperations: layers
        .slice(1)
        .reduce((acc, layer) => acc + layer.length, 0),
      maxDepth: options.maxDepth,
      truncated,
    },
  };
};

export const mapTree = <A, B>(tree: Tree<A>, f: (a: A) => B): Tree<B> => {
  switch (tree._tag) {
    case "Return":
      return Return(f(tree.value));
    case "Op":
      return Op(tree.name, tree.children.map((child) => mapTree(child, f)));
  }
};

export const bindTree = <A, B>(tree: Tree<A>, f: (a: A) => Tree<B>): Tree<B> => {
  switch (tree._tag) {
    case "Return":
      return f(tree.value);
    case "Op":
      return Op(tree.name, tree.children.map((child) => bindTree(child, f)));
  }
};

export const makeFreeTreeMonad = <Obj, Arr>(
  signature: Signature,
  base: ReadonlyMap<Obj, SetObj<unknown>>,
  options?: FreeTreeMonadOptions,
): FreeTreeMonad<Obj, Arr> => {
  const normalized = normalizeOptions(options);
  const carriers = new Map<Obj, SetObj<Tree<unknown>>>();
  const diagnostics: TreeCarrierDiagnostics[] = [];
  const baseLookup = new Map<SetObj<unknown>, Obj>();
  for (const [object, carrier] of base.entries()) {
    const { carrier: treeCarrier, diagnostics: diag } = createTreeCarrier(object, carrier, signature, normalized);
    carriers.set(object, treeCarrier);
    diagnostics.push(diag);
    baseLookup.set(carrier as SetObj<unknown>, object);
  }
  const functor = {
    functor: {
      F0: (object: Obj) => carriers.get(object) as SetObj<unknown>,
      F1: <X, Y>(_arrow: Arr, hom: SetHom<X, Y>) => {
        const domTree = baseLookup.has(hom.dom as SetObj<unknown>)
          ? (carriers.get(baseLookup.get(hom.dom as SetObj<unknown>)!) as SetObj<unknown>)
          : (hom.dom as SetObj<unknown>);
        const codTree = baseLookup.has(hom.cod as SetObj<unknown>)
          ? (carriers.get(baseLookup.get(hom.cod as SetObj<unknown>)!) as SetObj<unknown>)
          : (hom.cod as SetObj<unknown>);
        return SetCat.hom(
          domTree as SetObj<unknown>,
          codTree as SetObj<unknown>,
          (tree: unknown) => mapTree(tree as Tree<unknown>, hom.map as (value: unknown) => unknown) as unknown,
        ) as unknown as SetHom<unknown, unknown>;
      },
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
  const multiplication = {
    transformation: {
      component: (o: Obj): SetHom<unknown, unknown> => {
        const cod = carriers.get(o)! as SetObj<unknown>;
        const nested = createTreeCarrier(
          `${String(o)}.nested`,
          cod as SetObj<unknown>,
          signature,
          normalized,
        ).carrier as SetObj<unknown>;
        return SetCat.hom(
          nested,
          cod,
          (tree: unknown) => bindTree(tree as Tree<Tree<unknown>>, (inner) => inner) as unknown,
        );
      },
    },
  } as any;
  return {
    functor,
    unit,
    multiplication,
    signature,
    carriers,
    diagnostics,
    mapTree,
    bindTree,
    metadata: ["FreeTreeMonad"],
  };
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
