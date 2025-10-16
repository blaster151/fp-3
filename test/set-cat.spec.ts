import { describe, expect, it } from 'vitest';
import { SetCat, composeSet, idSet, isSetHom } from '../set-cat';
import {
  deterministicWitnessFromSetHom,
  isDeterministicSetMulti,
  setMultObjFromSet,
} from '../setmult-category';

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

  it('builds exponentials and evaluation maps', () => {
    const Bool = SetCat.obj([false, true]);
    const id = (value: boolean) => value;
    const flip = (value: boolean) => !value;
    const BoolExp = SetCat.exponential(Bool, Bool, { functions: [id, flip] });

    expect(BoolExp.size).toBe(2);

    const evaluate = SetCat.evaluate(Bool, Bool, BoolExp);
    expect(isSetHom(evaluate)).toBe(true);
    expect(evaluate.map([false, id])).toBe(false);
    expect(evaluate.map([true, flip])).toBe(false);
  });

  it('curries and uncurries morphisms', () => {
    const Letters = SetCat.obj(['L', 'R']);
    const Bool = SetCat.obj([false, true]);
    const product = SetCat.product(Letters, Bool);

    const f = SetCat.hom(product, Bool, ([letter, flag]) =>
      letter === 'L' ? flag : !flag,
    );

    const boolFns = SetCat.exponential(Bool, Bool, {
      functions: [
        (value: boolean) => value,
        (value: boolean) => !value,
      ],
    });

    const curried = SetCat.curry(Letters, Bool, Bool, f, { exponential: boolFns });
    expect(isSetHom(curried)).toBe(true);

    const leftBehaviour = curried.map('L');
    expect(leftBehaviour(true)).toBe(true);
    expect(leftBehaviour(false)).toBe(false);

    const rightBehaviour = curried.map('R');
    expect(rightBehaviour(true)).toBe(false);
    expect(rightBehaviour(false)).toBe(true);

    const uncurried = SetCat.uncurry(Letters, Bool, Bool, curried);
    expect(isSetHom(uncurried)).toBe(true);
    expect(uncurried.map(['L', true])).toBe(true);
    expect(uncurried.map(['R', true])).toBe(false);
  });

  it('packages SetCat maps as deterministic SetMult witnesses', () => {
    const Bool = SetCat.obj([false, true]);
    const flip = (value: boolean) => !value;
    const BoolExp = SetCat.exponential(Bool, Bool, {
      functions: [
        (value: boolean) => value,
        flip,
      ],
    });
    const evaluate = SetCat.evaluate(Bool, Bool, BoolExp);

    const witness = deterministicWitnessFromSetHom(evaluate, {
      label: 'eval',
      domain: setMultObjFromSet(SetCat.product(Bool, BoolExp), {
        label: 'Bool × Bool^Bool',
        samplesFromSet: true,
      }),
      codomain: setMultObjFromSet(Bool, { label: 'Bool', samplesFromSet: true }),
    });

    const result = isDeterministicSetMulti(witness);
    expect(result.holds).toBe(true);
    expect(result.base?.([true, flip])).toBe(false);
  });
});
