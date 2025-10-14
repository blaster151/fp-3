import { describe, expect, it } from 'vitest';
import { composeDyn, DynCat, idDyn, isDynHom } from '../dynsys';
import type { DynHom, DynSys } from '../dynsys';

describe('Set^circle discrete dynamical systems', () => {
  const makeCycle = (): DynSys<number> => ({
    carrier: [0, 1, 2],
    step: (x) => (x + 1) % 3,
  });

  const makeLetters = (): DynSys<string> => ({
    carrier: ['a', 'b', 'c'],
    step: (y) => ({ a: 'b', b: 'c', c: 'a' }[y] ?? 'a'),
  });

  it('recognises commuting morphisms', () => {
    const X = makeCycle();
    const Y = makeLetters();
    const letters: ['a', 'b', 'c'] = ['a', 'b', 'c'];
    const map = (x: number): string => letters[x] ?? 'a';
    const j: DynHom<number, string> = { dom: X, cod: Y, map };
    expect(isDynHom(j)).toBe(true);
    expect(isDynHom(idDyn(X))).toBe(true);
  });

  it('rejects non-commuting maps', () => {
    const X = makeCycle();
    const Y: DynSys<number> = {
      carrier: [10, 20, 30],
      step: (y) => ({ 10: 20, 20: 30, 30: 10 }[y] ?? 10),
    };
    const bad: DynHom<number, number> = {
      dom: X,
      cod: Y,
      map: (x) => (x === 2 ? 10 : 20),
    };
    expect(isDynHom(bad)).toBe(false);
  });

  it('composes commuting morphisms', () => {
    const X = makeCycle();
    const Y = makeLetters();
    const Z: DynSys<string> = {
      carrier: ['alpha', 'beta', 'gamma'],
      step: (z) => ({ alpha: 'beta', beta: 'gamma', gamma: 'alpha' }[z] ?? 'alpha'),
    };

    const letters: ['a', 'b', 'c'] = ['a', 'b', 'c'];
    const j = DynCat.hom(X, Y, (x) => letters[x] ?? 'a');
    const k = DynCat.hom(Y, Z, (y) => ({ a: 'alpha', b: 'beta', c: 'gamma' }[y] ?? 'alpha'));

    const composed = composeDyn(k, j);
    expect(isDynHom(j)).toBe(true);
    expect(isDynHom(k)).toBe(true);
    expect(isDynHom(composed)).toBe(true);
  });
});
