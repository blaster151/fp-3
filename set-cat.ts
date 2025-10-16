export type SetObj<A> = Set<A>;

/**
 * Generic readonly view of a set.
 *
 * Historically various modules imported `AnySet` when working with
 * categorified set operations.  Re-introducing it as a `ReadonlySet`
 * preserves that API surface while ensuring callers don't rely on
 * mutation, which keeps future Markov/category adapters honest about
 * variance.
 */
export type AnySet<A> = ReadonlySet<A>;

export interface SetHom<A, B> {
  readonly dom: SetObj<A>;
  readonly cod: SetObj<B>;
  readonly map: (a: A) => B;
}

const ensureFunctionLandsInCodomain = <A, B>(
  dom: SetObj<A>,
  cod: SetObj<B>,
  fn: (a: A) => B,
): void => {
  for (const a of dom) {
    const image = fn(a);
    if (!cod.has(image)) {
      throw new Error("SetCat: exponential element escapes declared codomain");
    }
  }
};

export function isSetHom<A, B>(h: SetHom<A, B>): boolean {
  const { dom, cod, map } = h;
  for (const a of dom) {
    if (!cod.has(map(a))) {
      return false;
    }
  }
  return true;
}

export function idSet<A>(carrier: SetObj<A>): SetHom<A, A> {
  return { dom: carrier, cod: carrier, map: (a) => a };
}

export function composeSet<A, B, C>(g: SetHom<B, C>, f: SetHom<A, B>): SetHom<A, C> {
  if (f.cod !== g.dom) {
    throw new Error('SetCat: domain/codomain mismatch');
  }
  return {
    dom: f.dom,
    cod: g.cod,
    map: (a) => g.map(f.map(a)),
  };
}

export function productSet<A, B>(left: SetObj<A>, right: SetObj<B>): SetObj<readonly [A, B]> {
  const pairs: Array<readonly [A, B]> = [];
  for (const a of left) {
    for (const b of right) {
      pairs.push([a, b] as const);
    }
  }
  return new Set(pairs);
}

export type SetCoproductValue<A, B> =
  | { readonly tag: "left"; readonly value: A }
  | { readonly tag: "right"; readonly value: B };

export interface SetCoproductWitness<A, B> {
  readonly object: SetObj<SetCoproductValue<A, B>>;
  readonly injections: readonly [SetHom<A, SetCoproductValue<A, B>>, SetHom<B, SetCoproductValue<A, B>>];
  readonly cotuple: <X>(
    codomain: SetObj<X>,
    legs: readonly [SetHom<A, X>, SetHom<B, X>],
  ) => SetHom<SetCoproductValue<A, B>, X>;
}

export function coproductSet<A, B>(left: SetObj<A>, right: SetObj<B>): SetCoproductWitness<A, B> {
  const elements: Array<SetCoproductValue<A, B>> = [];
  const leftLookup = new Map<A, SetCoproductValue<A, B>>();
  const rightLookup = new Map<B, SetCoproductValue<A, B>>();

  for (const value of left) {
    const tagged: SetCoproductValue<A, B> = { tag: "left", value };
    elements.push(tagged);
    leftLookup.set(value, tagged);
  }

  for (const value of right) {
    const tagged: SetCoproductValue<A, B> = { tag: "right", value };
    elements.push(tagged);
    rightLookup.set(value, tagged);
  }

  const coproduct: SetObj<SetCoproductValue<A, B>> = new Set(elements);

  const inl: SetHom<A, SetCoproductValue<A, B>> = {
    dom: left,
    cod: coproduct,
    map: (a) => {
      const tagged = leftLookup.get(a);
      if (!tagged) {
        throw new Error("SetCat: coproduct injection received element outside left summand");
      }
      return tagged;
    },
  };

  const inr: SetHom<B, SetCoproductValue<A, B>> = {
    dom: right,
    cod: coproduct,
    map: (b) => {
      const tagged = rightLookup.get(b);
      if (!tagged) {
        throw new Error("SetCat: coproduct injection received element outside right summand");
      }
      return tagged;
    },
  };

  const cotuple = <X>(
    codomain: SetObj<X>,
    legs: readonly [SetHom<A, X>, SetHom<B, X>],
  ): SetHom<SetCoproductValue<A, B>, X> => {
    const [leftLeg, rightLeg] = legs;
    if (leftLeg.dom !== left) {
      throw new Error("SetCat: cotuple expects left leg to source the left summand");
    }
    if (leftLeg.cod !== codomain) {
      throw new Error("SetCat: cotuple expects left leg to target declared codomain");
    }
    if (rightLeg.dom !== right) {
      throw new Error("SetCat: cotuple expects right leg to source the right summand");
    }
    if (rightLeg.cod !== codomain) {
      throw new Error("SetCat: cotuple expects right leg to target declared codomain");
    }

    return {
      dom: coproduct,
      cod: codomain,
      map: (value) => {
        if (!coproduct.has(value)) {
          throw new Error("SetCat: cotuple received element outside coproduct carrier");
        }
        if (value.tag === "left") {
          return leftLeg.map(value.value);
        }
        return rightLeg.map(value.value);
      },
    };
  };

  return { object: coproduct, injections: [inl, inr], cotuple };
}

export interface ExponentialOptions<A, B> {
  readonly functions?: Iterable<(a: A) => B>;
}

export function exponentialSet<A, B>(
  dom: SetObj<A>,
  cod: SetObj<B>,
  options: ExponentialOptions<A, B> = {},
): SetObj<(a: A) => B> {
  const carrier: SetObj<(a: A) => B> = new Set();
  if (options.functions) {
    for (const fn of options.functions) {
      ensureFunctionLandsInCodomain(dom, cod, fn);
      carrier.add(fn);
    }
  }
  return carrier;
}

export function ensureExponentialMember<A, B>(
  exponential: SetObj<(a: A) => B>,
  dom: SetObj<A>,
  cod: SetObj<B>,
  fn: (a: A) => B,
): void {
  ensureFunctionLandsInCodomain(dom, cod, fn);
  if (!exponential.has(fn)) {
    exponential.add(fn);
  }
}

export function evaluateSet<A, B>(
  dom: SetObj<A>,
  cod: SetObj<B>,
  exponential: SetObj<(a: A) => B>,
): SetHom<readonly [A, (a: A) => B], B> {
  const product = productSet(dom, exponential);
  return {
    dom: product,
    cod,
    map: ([a, fn]) => {
      if (!exponential.has(fn)) {
        throw new Error("SetCat: evaluation received function outside exponential");
      }
      const value = fn(a);
      if (!cod.has(value)) {
        throw new Error("SetCat: evaluation escaped codomain");
      }
      return value;
    },
  };
}

export interface CurryOptions<A, B, C> {
  readonly exponential?: SetObj<(b: B) => C>;
}

export function currySet<A, B, C>(
  left: SetObj<A>,
  right: SetObj<B>,
  cod: SetObj<C>,
  morphism: SetHom<readonly [A, B], C>,
  options: CurryOptions<A, B, C> = {},
): SetHom<A, (b: B) => C> {
  if (morphism.cod !== cod) {
    throw new Error("SetCat: curry expects codomain to match target");
  }
  for (const [a, b] of morphism.dom) {
    if (!left.has(a) || !right.has(b)) {
      throw new Error("SetCat: curry expects domain pairs drawn from declared factors");
    }
  }
  const exponential = options.exponential ?? exponentialSet(right, cod);
  return {
    dom: left,
    cod: exponential,
    map: (a) => {
      if (!left.has(a)) {
        throw new Error("SetCat: curry invoked on element outside domain");
      }
      const fn = (b: B) => {
        if (!right.has(b)) {
          throw new Error("SetCat: curried function received argument outside domain");
        }
        return morphism.map([a, b]);
      };
      ensureExponentialMember(exponential, right, cod, fn);
      return fn;
    },
  };
}

export function uncurrySet<A, B, C>(
  left: SetObj<A>,
  right: SetObj<B>,
  cod: SetObj<C>,
  morphism: SetHom<A, (b: B) => C>,
): SetHom<readonly [A, B], C> {
  if (morphism.dom !== left) {
    throw new Error("SetCat: uncurry expects matching domain");
  }
  const exponential = morphism.cod;
  const product = productSet(left, right);
  return {
    dom: product,
    cod,
    map: ([a, b]) => {
      if (!left.has(a)) {
        throw new Error("SetCat: uncurry received element outside left factor");
      }
      if (!right.has(b)) {
        throw new Error("SetCat: uncurry received element outside right factor");
      }
      const fn = morphism.map(a);
      if (!exponential.has(fn)) {
        throw new Error("SetCat: uncurry accessed function outside exponential");
      }
      const value = fn(b);
      if (!cod.has(value)) {
        throw new Error("SetCat: uncurry escaped codomain");
      }
      return value;
    },
  };
}

export const SetCat = {
  obj: <A>(elements: Iterable<A>): SetObj<A> => new Set(elements),
  id: idSet,
  hom: <A, B>(dom: SetObj<A>, cod: SetObj<B>, map: (a: A) => B): SetHom<A, B> => {
    const morphism = { dom, cod, map } as const;
    if (!isSetHom(morphism)) {
      throw new Error('SetCat: morphism image must land in declared codomain');
    }
    return morphism;
  },
  compose: composeSet,
  isHom: isSetHom,
  product: productSet,
  coproduct: coproductSet,
  exponential: exponentialSet,
  evaluate: evaluateSet,
  curry: currySet,
  uncurry: uncurrySet,
};
