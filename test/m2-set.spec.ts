import { describe, expect, it } from 'vitest';
import { DynCat, isDynHom } from '../dynsys';
import type { DynSys } from '../dynsys';
import { checkAction, isMSetHom } from '../mset';
import {
  checkM2BinaryProduct,
  dynHomToM2,
  dynToM2,
  equalM2Morphisms,
  makeM2Morphism,
  makeM2Object,
  type M2Morphism,
  type M2Object,
  M2SetCat,
  m2HomToDyn,
  m2ToDyn,
  makeM2Exponential,
  curryM2Exponential,
  composeM2,
  isM2Morphism,
  productM2,
} from '../m2-set';

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

describe('M2 binary products', () => {
  const eqNumber = (a: number, b: number) => a === b;
  const eqLetter = (a: string, b: string) => a === b;

  const X = makeM2Object({
    carrier: [0, 1, 2],
    endo: (n: number) => (n === 2 ? 1 : n),
    eq: eqNumber,
  });

  const Y = makeM2Object({
    carrier: ['a', 'b'],
    endo: (letter: string) => (letter === 'b' ? 'a' : letter),
    eq: eqLetter,
  });

  const domain = makeM2Object({
    carrier: ['left', 'right', 'fixed'],
    endo: (tag: string) => (tag === 'right' ? 'fixed' : tag),
  });

  const leftLeg = makeM2Morphism({
    dom: domain,
    cod: X,
    map: (tag) => (tag === 'left' ? 2 : tag === 'right' ? 1 : 0),
  });

  const rightLeg = makeM2Morphism({
    dom: domain,
    cod: Y,
    map: (tag) => (tag === 'left' ? 'b' : 'a'),
  });

  const product = productM2({
    left: X,
    right: Y,
    equaliser: ([x, y]) => X.eq(X.endo(x), x) && Y.eq(Y.endo(y), y),
  });

  it('confirms the universal property for valid legs', () => {
    const check = checkM2BinaryProduct({ product, domain, legs: [leftLeg, rightLeg] });
    expect(check.holds).toBe(true);
    expect(check.issues).toHaveLength(0);
  });

  it('detects equivariance failures in the legs', () => {
    const distortedRight = {
      ...rightLeg,
      map: (tag: string) => (tag === 'left' ? 'a' : 'b'),
    } as unknown as typeof rightLeg;

    const check = checkM2BinaryProduct({ product, domain, legs: [leftLeg, distortedRight] });
    expect(check.holds).toBe(false);
    expect(check.issues.some((issue) => issue.includes('right leg fails equivariance'))).toBe(true);
  });

  it('flags mediators that leave the subset of fixed points', () => {
    const brokenObject: M2Object<readonly [number, string]> = {
      carrier: [[2, 'b']],
      endo: product.object.endo,
      eq: product.object.eq,
      contains: (value) => value[0] === 2 && value[1] === 'b',
    };

    const distortedProduct = {
      ...product,
      object: brokenObject,
    };

    const check = checkM2BinaryProduct({
      product: distortedProduct,
      domain,
      legs: [leftLeg, rightLeg],
    });
    expect(check.holds).toBe(false);
    expect(check.issues.some((issue) => issue.includes('preserve the chosen subset'))).toBe(true);
  });
});

describe('M2 exponentials', () => {
  const eq = <T>(a: T, b: T) => Object.is(a, b);

  const B = makeM2Object({
    carrier: ['stable', 'unstable'] as const,
    endo: (value: 'stable' | 'unstable') => (value === 'unstable' ? 'stable' : value),
    eq,
  });

  const C = makeM2Object({
    carrier: ['base', 'shift', 'fixed'] as const,
    endo: (value: 'base' | 'shift' | 'fixed') => (value === 'shift' ? 'base' : value),
    eq,
  });

  const exponential = makeM2Exponential({ base: B, codomain: C });

  it('enumerates equivariant maps and provides a monotone evaluation arrow', () => {
    const carrier = exponential.object.carrier;
    expect(carrier.length).toBeGreaterThan(0);
    for (const func of carrier) {
      expect(isM2Morphism(func)).toBe(true);
    }
    expect(isM2Morphism(exponential.evaluation)).toBe(true);
    expect(exponential.base).toBe(B);
    expect(exponential.codomain).toBe(C);
  });

  const A = makeM2Object({
    carrier: ['left', 'right'] as const,
    endo: (value: 'left' | 'right') => (value === 'right' ? 'left' : value),
    eq,
  });

  const productAB = productM2({ left: A, right: B });

  const arrow = makeM2Morphism({
    dom: productAB.object,
    cod: C,
    map: ([a, b]: readonly ['left' | 'right', 'stable' | 'unstable']) => {
      if (a === 'left') {
        return b === 'stable' ? 'base' : 'shift';
      }
      return b === 'stable' ? 'base' : 'shift';
    },
  });

  it('curries equivariant arrows and recovers them via evaluation', () => {
    const lambda = exponential.curry({ domain: A, product: productAB, arrow });
    expect(isM2Morphism(lambda)).toBe(true);

    const viaHelper = curryM2Exponential({ exponential, domain: A, product: productAB, arrow });
    expect(equalM2Morphisms(viaHelper, lambda)).toBe(true);

    const leftProjection = productAB.projections[0];
    const rightProjection = productAB.projections[1];
    const lambdaTimesId = exponential.product.tuple(productAB.object, [
      composeM2(lambda, leftProjection),
      rightProjection,
    ]);

    const mediated = composeM2(exponential.evaluation, lambdaTimesId);
    expect(equalM2Morphisms(mediated, arrow)).toBe(true);

    const candidates: M2Morphism<'left' | 'right', typeof exponential.object.carrier[number]>[] = [];
    const selection: typeof exponential.object.carrier[number][] = new Array(A.carrier.length);

    const enumerate = (index: number) => {
      if (index === A.carrier.length) {
        const table = selection.slice();
        try {
          const candidate = makeM2Morphism({
            dom: A,
            cod: exponential.object,
            map: (value: 'left' | 'right') => {
              const position = A.carrier.findIndex((candidate) => A.eq(candidate, value));
              if (position < 0) {
                throw new Error('enumeration: unexpected element');
              }
              return table[position]!;
            },
          });
          candidates.push(candidate);
        } catch {
          // Skip non-equivariant assignments
        }
        return;
      }

      for (const func of exponential.object.carrier) {
        selection[index] = func;
        enumerate(index + 1);
      }
    };

    enumerate(0);

    const factors = candidates.filter((candidate) => {
      const candidateTimesId = exponential.product.tuple(productAB.object, [
        composeM2(candidate, leftProjection),
        rightProjection,
      ]);
      const comparison = composeM2(exponential.evaluation, candidateTimesId);
      return equalM2Morphisms(comparison, arrow);
    });

    expect(factors).toHaveLength(1);
    expect(equalM2Morphisms(factors[0]!, lambda)).toBe(true);
  });

  it('rejects non-equivariant factoring attempts', () => {
    const distorted = {
      dom: productAB.object,
      cod: C,
      map: ([a, b]: readonly ['left' | 'right', 'stable' | 'unstable']) =>
        a === 'right' && b === 'unstable' ? 'fixed' : arrow.map([a, b]),
    } as unknown as typeof arrow;

    expect(() => exponential.curry({ domain: A, product: productAB, arrow: distorted })).toThrow(
      /equivariant/,
    );
  });
});
