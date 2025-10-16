import type { ContinuousMap } from "./ContinuousMap";

export type ContEntry<A, B> = {
  readonly tag: string;
  readonly morphism: ContinuousMap<A, B>;
};

const entries: ContEntry<any, any>[] = [];

export function registerCont<A, B>(entry: ContEntry<A, B>): void {
  entries.push(entry);
}

export function clearCont(): void {
  entries.length = 0;
}

export function allCont(): ReadonlyArray<ContEntry<any, any>> {
  return entries.slice();
}

export function runContAll(): ReadonlyArray<{ readonly tag: string; readonly ok: boolean }> {
  return entries.map((entry) => ({
    tag: entry.tag,
    ok: entry.morphism.witness.verify(),
  }));
}
