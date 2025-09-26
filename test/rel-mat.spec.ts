import { describe, expect, it } from 'vitest';
import { RelCat, composeRel, idRel, makeRel } from '../rel';
import { MatCat, composeMat, idMat } from '../mat';

describe('Rel category', () => {
  it('builds identities and composes relations', () => {
    const carrier = [1, 2, 3];
    const id = idRel(carrier);
    expect(Array.from(id)).toEqual([
      [1, 1],
      [2, 2],
      [3, 3],
    ]);

    const a = [1, 2];
    const b = ['a', 'b'];
    const c = ['X', 'Y'];

    const r = RelCat.hom(a, b, [
      [1, 'a'],
      [2, 'b'],
    ] as const);
    const s = RelCat.hom(b, c, [
      ['a', 'X'],
      ['b', 'Y'],
    ] as const);

    const composed = composeRel(r, s);
    expect(Array.from(composed)).toEqual([
      [1, 'X'],
      [2, 'Y'],
    ]);
  });

  it('supports direct construction via makeRel', () => {
    const rel = makeRel([
      ['left', 1],
      ['left', 2],
    ] as const);
    expect(rel.size).toBe(2);
  });
});

describe('Mat category', () => {
  it('creates identity matrices', () => {
    expect(idMat(2)).toEqual([
      [1, 0],
      [0, 1],
    ]);
  });

  it('multiplies matrices via composition', () => {
    const a = MatCat.hom(2, 2, [
      [1, 2],
      [3, 4],
    ]);
    const b = MatCat.hom(2, 2, [
      [0, 1],
      [1, 0],
    ]);
    expect(composeMat(a, b)).toEqual([
      [2, 1],
      [4, 3],
    ]);
  });
});
