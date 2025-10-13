import { describe, expect, it } from 'vitest';
import { FreeCategory, arrows } from '../freecat';
import { makeGraph } from '../graph';
import { underlyingGraph } from '../cat-to-graph';
import type { SmallCategory } from '../cat-to-graph';

describe('Free category on a directed graph', () => {
  it('treats edges as composable paths', () => {
    const graph = makeGraph(['A', 'B', 'C'], [
      { id: 'f', src: 'A', dst: 'B' },
      { id: 'g', src: 'B', dst: 'C' },
      { id: 'h', src: 'A', dst: 'C' },
    ]);
    const free = FreeCategory(graph);
    const idA = free.id('A');
    expect(idA.edgeIds).toHaveLength(0);
    expect(idA.src).toBe('A');
    expect(idA.dst).toBe('A');

    const maybeF = arrows(graph).find((p) => p.edgeIds[0] === 'f');
    expect(maybeF).toBeDefined();
    if (!maybeF) {
      throw new Error('Expected to find arrow f in the generated paths');
    }
    const maybeG = arrows(graph).find((p) => p.edgeIds[0] === 'g');
    expect(maybeG).toBeDefined();
    if (!maybeG) {
      throw new Error('Expected to find arrow g in the generated paths');
    }
    const f = maybeF;
    const g = maybeG;
    const gof = free.compose(g, f);
    expect(gof.src).toBe('A');
    expect(gof.dst).toBe('C');
    expect(gof.edgeIds).toEqual(['f', 'g']);

    const rightUnit = free.compose(f, free.id('A'));
    expect(rightUnit.edgeIds).toEqual(['f']);
  });

  it('enumerates paths up to the given length', () => {
    const graph = makeGraph([1, 2], [{ id: 'e', src: 1, dst: 2 }]);
    const free = FreeCategory(graph);
    const paths = free.pathsFrom?.(1, 2) ?? [];
    expect(paths.some((p) => p.edgeIds.length === 0)).toBe(true);
    expect(paths.some((p) => p.edgeIds.length === 1)).toBe(true);
  });

  it('extracts the underlying graph of a small category', () => {
    const cat: SmallCategory<string> = {
      objects: () => ['A', 'B'],
      morphisms: () => [
        { id: 'idA', src: 'A', dst: 'A' },
        { id: 'idB', src: 'B', dst: 'B' },
        { id: 'f', src: 'A', dst: 'B' },
      ],
    };
    const graph = underlyingGraph(cat);
    expect(graph.nodes.size).toBe(2);
    expect(graph.edges.some((edge) => edge.id === 'f')).toBe(true);
  });
});
