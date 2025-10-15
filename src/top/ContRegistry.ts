import type { ContinuousMap } from "./Category";

export type ContEntry<A, B> = {
  readonly tag: string;
  readonly morphism: ContinuousMap<A, B>;
};

const entries: ContEntry<unknown, unknown>[] = [];

export function registerCont<A, B>(entry: ContEntry<A, B>): void {
  entries.push(entry);
}

export function clearCont(): void {
  entries.length = 0;
}

export function allCont(): ReadonlyArray<ContEntry<unknown, unknown>> {
  return entries.slice();
}

export function runContAll(): ReadonlyArray<{ readonly tag: string; readonly ok: boolean }> {
  return entries.map((entry) => ({
    tag: entry.tag,
    ok: entry.morphism.witness.verify(),
  }));
}
