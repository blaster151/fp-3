import type { FiniteCategory } from "../finite-cat";
import { isMono as computeMono, isEpi as computeEpi } from "./mono-epi";

export interface MonoEpiCache<Obj, Arr> {
  readonly isMono: (f: Arr) => boolean;
  readonly isEpi: (f: Arr) => boolean;
  clear(): void;
}

export function withMonoEpiCache<Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
): MonoEpiCache<Obj, Arr> {
  const mono = new Map<Arr, boolean>();
  const epi = new Map<Arr, boolean>();

  const memoise = (store: Map<Arr, boolean>, arrow: Arr, calc: () => boolean): boolean => {
    const cached = store.get(arrow);
    if (cached !== undefined) return cached;
    const value = calc();
    store.set(arrow, value);
    return value;
  };

  const isMono = (f: Arr): boolean => memoise(mono, f, () => computeMono(category, f));
  const isEpi = (f: Arr): boolean => memoise(epi, f, () => computeEpi(category, f));

  return {
    isMono,
    isEpi,
    clear() {
      mono.clear();
      epi.clear();
    },
  };
}
