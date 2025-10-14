import { continuous, type Top } from "./Topology";

export type ContEntry<A, B> = {
  readonly tag: string;
  readonly eqDom: (a: A, b: A) => boolean;
  readonly TA: Top<A>;
  readonly TB: Top<B>;
  readonly f: (a: A) => B;
  readonly eqCod?: (b: B, c: B) => boolean;
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
    ok: continuous(entry.eqDom, entry.TA, entry.TB, entry.f, entry.eqCod),
  }));
}
