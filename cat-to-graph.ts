import { DiGraph, makeGraph } from './graph';

export interface SmallCategory<O> {
  objects(): ReadonlyArray<O>;
  morphisms(): ReadonlyArray<{ id: string; src: O; dst: O }>;
}

export function underlyingGraph<O>(category: SmallCategory<O>): DiGraph {
  const objects = category.objects();
  const morphisms = category.morphisms();
  const labels = objects.map((obj, idx) => `${idx}:${String(obj)}`);
  const indexByObject = new Map<O, string>();
  objects.forEach((obj, idx) => {
    indexByObject.set(obj, labels[idx]);
  });
  const edges = morphisms.map((morphism, idx) => {
    const src = indexByObject.get(morphism.src);
    const dst = indexByObject.get(morphism.dst);
    if (!src || !dst) {
      throw new Error('underlyingGraph: morphism endpoints must be known objects');
    }
    return {
      id: morphism.id ?? `m${idx}`,
      src,
      dst,
    };
  });
  return makeGraph(labels, edges);
}
