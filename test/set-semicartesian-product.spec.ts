import { describe, expect, it } from 'vitest';
import { SetCat } from '../set-cat';
import {
  createSetMultInfObj,
  createSetMultObj,
  type SetMultIndexedFamily,
  type SetMultTuple,
} from '../setmult-category';
import {
  checkSemicartesianProductCone,
  checkSemicartesianUniversalProperty,
  type SemicartesianCone,
  type SubsetRestriction,
} from '../semicartesian-infinite-product';
import type { SetHom, SetObj } from '../set-cat';

const subset = <T extends readonly string[]>(values: T): T => values;

type AnySetHom = SetHom<any, any>;

describe('Set semicartesian infinite products', () => {
  const bool = createSetMultObj<boolean>({
    eq: (left, right) => left === right,
    show: (value) => (value ? '⊤' : '⊥'),
    samples: [false, true],
    label: '𝟚',
  });

  const family: SetMultIndexedFamily<'x' | 'y', boolean> = {
    index: ['x', 'y'],
    coordinate: () => bool,
  };

  const buildProduct = () => createSetMultInfObj(family, { label: 'Bool×Bool' });

  it('certifies Set product projection compatibility', () => {
    const product = buildProduct();
    const witness = product.semicartesian;
    const xy = subset(['x', 'y'] as const);
    const restrictions: ReadonlyArray<SubsetRestriction<'x' | 'y'>> = [
      { larger: xy, smaller: subset(['x'] as const) },
      { larger: xy, smaller: subset(['y'] as const) },
    ];

    const report = checkSemicartesianProductCone(witness, restrictions);
    expect(report.holds).toBe(true);
    expect(report.failures).toHaveLength(0);
    expect(product.samples.length).toBe(4);
  });

  it('reports incompatible Set product restrictions', () => {
    const product = buildProduct();
    const witness = product.semicartesian;
    const badRestrictions: ReadonlyArray<SubsetRestriction<'x' | 'y'>> = [
      { larger: subset(['x'] as const), smaller: subset(['x', 'y'] as const) },
    ];

    const report = checkSemicartesianProductCone(witness, badRestrictions);
    expect(report.holds).toBe(false);
    expect(report.failures).not.toHaveLength(0);
    expect(report.failures[0]?.reason).toContain('not contained');
  });

  it('certifies the universal property of the Set product', () => {
    const product = buildProduct();
    const witness = product.semicartesian;
    const apex = SetCat.obj([0, 1]);
    const subsetX = subset(['x'] as const);
    const subsetY = subset(['y'] as const);
    const subsetXY = subset(['x', 'y'] as const);
    const tuple00 = product.carrier((index) => (index === 'x' ? false : false));
    const tuple11 = product.carrier((index) => (index === 'x' ? true : true));

    const legX = SetCat.hom(apex, witness.diagram.tensor(subsetX), (value: number) =>
      product.project(value === 0 ? tuple00 : tuple11, subsetX),
    ) as unknown as AnySetHom;
    const legY = SetCat.hom(apex, witness.diagram.tensor(subsetY), (value: number) =>
      product.project(value === 0 ? tuple00 : tuple11, subsetY),
    ) as unknown as AnySetHom;
    const legXY = SetCat.hom(apex, witness.diagram.tensor(subsetXY), (value: number) =>
      product.project(value === 0 ? tuple00 : tuple11, subsetXY),
    ) as unknown as AnySetHom;

    const cone: SemicartesianCone<'x' | 'y', SetObj<unknown>, AnySetHom> = {
      apex,
      leg: (subsetIndices) => {
        if (subsetIndices.length === 1 && subsetIndices[0] === 'x') return legX;
        if (subsetIndices.length === 1 && subsetIndices[0] === 'y') return legY;
        if (subsetIndices.length === 2) return legXY;
        throw new Error('Unexpected subset request');
      },
    };

    const subsets = [subsetX, subsetY, subsetXY];
    const universal = checkSemicartesianUniversalProperty(witness, [cone], subsets);
    expect(universal.holds).toBe(true);
    expect(universal.failures).toHaveLength(0);
    expect(universal.mediators).toHaveLength(1);
  });

  it('detects cones whose legs disagree on Set projections', () => {
    const product = buildProduct();
    const witness = product.semicartesian;
    const apex = SetCat.obj([0, 1]);
    const subsetX = subset(['x'] as const);
    const subsetY = subset(['y'] as const);
    const subsetXY = subset(['x', 'y'] as const);
    const tuple00 = product.carrier((index) => (index === 'x' ? false : false));
    const tuple11 = product.carrier((index) => (index === 'x' ? true : true));
    const tuple01 = product.carrier((index) => (index === 'x' ? false : true));

    const legX = SetCat.hom(apex, witness.diagram.tensor(subsetX), (value: number) =>
      product.project(value === 0 ? tuple00 : tuple11, subsetX),
    ) as unknown as AnySetHom;
    const legY = SetCat.hom(apex, witness.diagram.tensor(subsetY), (value: number) =>
      product.project(value === 0 ? tuple00 : tuple11, subsetY),
    ) as unknown as AnySetHom;
    const inconsistentXY = SetCat.hom(apex, witness.diagram.tensor(subsetXY), (value: number) =>
      product.project(value === 0 ? tuple00 : tuple01, subsetXY),
    ) as unknown as AnySetHom;

    const badCone: SemicartesianCone<'x' | 'y', SetObj<unknown>, AnySetHom> = {
      apex,
      leg: (subsetIndices) => {
        if (subsetIndices.length === 1 && subsetIndices[0] === 'x') return legX;
        if (subsetIndices.length === 1 && subsetIndices[0] === 'y') return legY;
        if (subsetIndices.length === 2) return inconsistentXY;
        throw new Error('Unexpected subset request');
      },
    };

    const subsets = [subsetX, subsetY, subsetXY];
    const universal = checkSemicartesianUniversalProperty(witness, [badCone], subsets);
    expect(universal.holds).toBe(false);
    expect(universal.failures.some((failure) => failure.reason.includes('Mediator failed'))).toBe(true);
  });
});
