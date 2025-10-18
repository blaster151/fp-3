export type Law<Context> = {
  readonly name: string;
  readonly check: (context: Context) => boolean;
};

export type Lawful<Element, Struct, Context = Element> = {
  readonly tag: string;
  readonly eq: (a: Element, b: Element) => boolean;
  readonly struct: Struct;
  readonly laws: ReadonlyArray<Law<Context>>;
};

export type Iso<A, B> = {
  readonly to: (a: A) => B;
  readonly from: (b: B) => A;
};

type IsoLawContext<A, B> = {
  readonly samplesA: ReadonlyArray<A>;
  readonly samplesB: ReadonlyArray<B>;
};

export type LawCheckResult = {
  readonly name: string;
  readonly ok: boolean;
};

export function runLaws<S>(laws: ReadonlyArray<Law<S>>, context: S): ReadonlyArray<LawCheckResult> {
  return laws.map((law) => ({ name: law.name, ok: law.check(context) }));
}

export function isoLaws<A, B>(
  eqA: (a: A, b: A) => boolean,
  eqB: (a: B, b: B) => boolean,
  iso: Iso<A, B>,
  fallback?: IsoLawContext<A, B>,
): ReadonlyArray<Law<IsoLawContext<A, B>>> {
  const resolveContext = (context: IsoLawContext<A, B> | undefined): IsoLawContext<A, B> => {
    const resolved = context ?? fallback;
    if (!resolved) {
      throw new Error("Law context requested outside of runLaws");
    }
    return resolved;
  };
  return [
    {
      name: "from ∘ to = id",
      check: (context) => {
        const { samplesA } = resolveContext(context);
        return samplesA.every((a) => eqA(iso.from(iso.to(a)), a));
      },
    },
    {
      name: "to ∘ from = id",
      check: (context) => {
        const { samplesB } = resolveContext(context);
        return samplesB.every((b) => eqB(iso.to(iso.from(b)), b));
      },
    },
  ];
}
