import { describe, expect, it } from 'vitest';
import { DynCat, isDynHom } from '../dynsys';
import type { DynSys } from '../dynsys';
import { checkAction, isMSetHom } from '../mset';
import { dynHomToM2, dynToM2, M2SetCat, m2HomToDyn, m2ToDyn } from '../m2-set';

describe('M2-Set and Set^circle correspondence', () => {
  const cycle: DynSys<number> = DynCat.obj([0, 1, 2], (x) => (x + 1) % 3);
  const letters: DynSys<string> = DynCat.obj(
    ['a', 'b', 'c'],
    (y) => ({ a: 'b', b: 'c', c: 'a' }[y] ?? 'a'),
  );

  it('round-trips objects', () => {
    const asM2 = dynToM2(cycle);
    expect(checkAction(asM2)).toBe(true);
    expect(asM2.act(0, 1)).toBe(1);
    expect(asM2.act(1, 1)).toBe(2);
    expect(asM2.act(2, 1)).toBe(0);

    const back = m2ToDyn(asM2);
    expect(back.step(2)).toBe(0);
  });

  it('equivariant morphisms coincide with commuting maps', () => {
    const j = DynCat.hom(
      cycle,
      letters,
      (x) => (x === 0 ? 'a' : x === 1 ? 'b' : 'c')
    );
    expect(isDynHom(j)).toBe(true);

    const jM2 = dynHomToM2(j);
    expect(checkAction(jM2.dom)).toBe(true);
    expect(checkAction(jM2.cod)).toBe(true);
    expect(isMSetHom(jM2)).toBe(true);

    const backToDyn = m2HomToDyn(jM2);
    expect(isDynHom(backToDyn)).toBe(true);
  });

  it('detects non-equivariant maps', () => {
    const badMap = DynCat.hom(cycle, letters, (x) => (x === 0 ? 'a' : 'a'));
    const badM2 = dynHomToM2(badMap);
    expect(isMSetHom(badM2)).toBe(false);
  });

  it('provides a category façade', () => {
    const C = M2SetCat;
    const obj = C.obj([0, 1], (m, x) => ((x + m) % 2));
    expect(checkAction(obj)).toBe(true);
    const id = C.id(obj);
    expect(isMSetHom(id)).toBe(true);
    const hom = C.hom(obj, obj, (x) => (x === 0 ? 0 : 1));
    expect(isMSetHom(hom)).toBe(true);
    const comp = C.compose(id, hom);
    expect(isMSetHom(comp)).toBe(true);
  });
});
