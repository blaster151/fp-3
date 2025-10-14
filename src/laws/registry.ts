import type { Lawful } from "./Witness";

const registry: Lawful<unknown, unknown>[] = [];

export function registerLawful(entry: Lawful<unknown, unknown>): void {
  registry.push(entry);
}

export function getRegisteredLawfuls(): ReadonlyArray<Lawful<unknown, unknown>> {
  return registry;
}

export function clearRegistry(): void {
  registry.length = 0;
}
