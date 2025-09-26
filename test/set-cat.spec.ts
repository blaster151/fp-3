import { describe, expect, it } from 'vitest';
import { SetCat, composeSet, idSet, isSetHom } from '../set-cat';

describe('SetCat', () => {
  it('builds identities and composes morphisms', () => {
    const A = SetCat.obj([1, 2, 3]);
    const B = SetCat.obj(['x', 'y']);
    const C = SetCat.obj([true, false]);

    const f = SetCat.hom(A, B, (n) => (n % 2 === 0 ? 'x' : 'y'));
    const g = SetCat.hom(B, C, (s) => s === 'x');

    const idA = SetCat.id(A);
    expect(idA.map(2)).toBe(2);
    expect(isSetHom(idA)).toBe(true);

    const gf = SetCat.compose(g, f);
    expect(gf.map(2)).toBe(true);
    expect(gf.map(3)).toBe(false);
    expect(isSetHom(gf)).toBe(true);

    const viaStandalone = composeSet(g, f);
    expect(viaStandalone.map(1)).toBe(false);
  });

  it('rejects morphisms that escape the codomain', () => {
    const dom = SetCat.obj([0]);
    const cod = SetCat.obj([1]);
    expect(() => SetCat.hom(dom, cod, () => 2 as 1)).toThrow('SetCat: morphism image must land in declared codomain');
  });

  it('guards against mismatched composition', () => {
    const A = SetCat.obj([1]);
    const B = SetCat.obj([2]);
    const C = SetCat.obj([3]);
    const f = SetCat.hom(A, B, () => 2);
    const g = { dom: SetCat.obj([99]), cod: C, map: () => 3 };
    expect(() => SetCat.compose(g, f)).toThrow('SetCat: domain/codomain mismatch');
  });
});
