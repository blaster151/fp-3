import type { Law, Lawful } from "./Witness";

type RegisteredLawful = Lawful<unknown, unknown, unknown>;

const registry: RegisteredLawful[] = [];

const widenLaw = <Context>(law: Law<Context>): Law<unknown> => ({
  name: law.name,
  check: (context: unknown) => law.check(context as Context),
});

export function registerLawful<Element, Struct, Context = Element>(entry: Lawful<Element, Struct, Context>): void {
  const eq = (a: unknown, b: unknown): boolean => entry.eq(a as Element, b as Element);
  const struct: unknown = entry.struct;
  const laws = entry.laws.map(widenLaw);
  registry.push({ tag: entry.tag, eq, struct, laws });
}

export function getRegisteredLawfuls(): ReadonlyArray<RegisteredLawful> {
  return registry;
}

export function clearRegistry(): void {
  registry.length = 0;
}
