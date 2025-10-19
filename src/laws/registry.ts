import type { Law, Lawful } from "./Witness";

type RegisteredLawful = Lawful<unknown, unknown, unknown>;

const widenLaw = <Context>(law: Law<Context>): Law<unknown> => ({
  name: law.name,
  check: (context: unknown) => law.check(context as Context),
});

export interface LawRegistry {
  registerLawful<Element, Struct, Context = Element>(entry: Lawful<Element, Struct, Context>): void;
  getRegisteredLawfuls(): ReadonlyArray<RegisteredLawful>;
  clearRegistry(): void;
}

export const createLawRegistry = (): LawRegistry => {
  let registry: RegisteredLawful[] = [];

  return {
    registerLawful<Element, Struct, Context = Element>(entry: Lawful<Element, Struct, Context>) {
      const eq = (a: unknown, b: unknown): boolean => entry.eq(a as Element, b as Element);
      const struct: unknown = entry.struct;
      const laws = entry.laws.map(widenLaw);
      const registered: RegisteredLawful = { tag: entry.tag, eq, struct, laws };
      registry = [...registry, registered];
    },
    getRegisteredLawfuls() {
      return [...registry];
    },
    clearRegistry() {
      registry = [];
    },
  };
};
