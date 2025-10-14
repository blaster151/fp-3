export type Law<Context> = {
  readonly name: string;
  readonly check: () => boolean;
};

export type Lawful<Element, Struct> = {
  readonly tag: string;
  readonly eq: (a: Element, b: Element) => boolean;
  readonly struct: Struct;
  readonly laws: ReadonlyArray<Law<Element>>;
};

export type Iso<A, B> = {
  readonly to: (a: A) => B;
  readonly from: (b: B) => A;
};

type IsoLawContext<A, B> = {
  readonly samplesA: ReadonlyArray<A>;
  readonly samplesB: ReadonlyArray<B>;
};

type LawContext = unknown;

let currentContext: LawContext;

function withLawContext<T>(context: LawContext, fn: () => T): T {
  const prev = currentContext;
  currentContext = context;
  try {
    return fn();
  } finally {
    currentContext = prev;
  }
}

export function getLawContext<S>(): S {
  if (currentContext === undefined) {
    throw new Error("Law context requested outside of runLaws");
  }
  return currentContext as S;
}

export type LawCheckResult = {
  readonly name: string;
  readonly ok: boolean;
};

export function runLaws<S>(laws: ReadonlyArray<Law<S>>, context: S): ReadonlyArray<LawCheckResult> {
  return withLawContext(context, () => laws.map((law) => ({ name: law.name, ok: law.check() })));
}

export function isoLaws<A, B>(
  eqA: (a: A, b: A) => boolean,
  eqB: (a: B, b: B) => boolean,
  iso: Iso<A, B>,
  fallback?: IsoLawContext<A, B>,
): ReadonlyArray<Law<IsoLawContext<A, B>>> {
  const resolveContext = (): IsoLawContext<A, B> => {
    try {
      return getLawContext<IsoLawContext<A, B>>();
    } catch (error) {
      if (fallback) {
        return fallback;
      }
      throw error;
    }
  };
  return [
    {
      name: "from ∘ to = id",
      check: () => {
        const { samplesA } = resolveContext();
        return samplesA.every((a) => eqA(iso.from(iso.to(a)), a));
      },
    },
    {
      name: "to ∘ from = id",
      check: () => {
        const { samplesB } = resolveContext();
        return samplesB.every((b) => eqB(iso.to(iso.from(b)), b));
      },
    },
  ];
}
