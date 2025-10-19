import { describe, expect, it } from 'vitest';
import { DynCat, isDynHom } from '../dynsys';
import type { DynSys } from '../dynsys';
import { checkAction, isMSetHom } from '../mset';
import {
  checkM2BinaryProduct,
  composeM2,
  curryM2,
  dynHomToM2,
  dynToM2,
  equalM2Morphisms,
  exponentialM2,
  isM2Morphism,
  makeM2Morphism,
  makeM2Object,
  type M2EquivariantFunction,
  type M2ExponentialWitness,
  type M2Object,
  M2SetCat,
  m2HomToDyn,
  m2ToDyn,
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
  const eqNumber = (a: number, b: number) => a === b;

  const A = makeM2Object({
    carrier: ['idle', 'pulse'] as const,
    endo: (value: 'idle' | 'pulse') => (value === 'pulse' ? 'idle' : value),
  });

  const B = makeM2Object({
    carrier: ['quiet', 'ring'] as const,
    endo: (value: 'quiet' | 'ring') => (value === 'ring' ? 'quiet' : value),
  });

  const C = makeM2Object({
    carrier: [0, 1] as const,
    endo: (value: number) => (value === 1 ? 0 : value),
    eq: eqNumber,
  });

  const product = productM2({
    left: A,
    right: B,
  });

  const f = makeM2Morphism({
    dom: product.object,
    cod: C,
    map: ([a, b]: readonly ['idle' | 'pulse', 'quiet' | 'ring']) =>
      a === 'pulse' || b === 'ring' ? 1 : 0,
  });

  const exponential: M2ExponentialWitness<'quiet' | 'ring', number> = exponentialM2({
    base: B,
    codomain: C,
  });

  it('enumerates equivariant maps and provides an evaluation morphism', () => {
    expect(exponential.object.carrier.length).toBe(2);
    const nonEquivariant: M2EquivariantFunction<'quiet' | 'ring', number> = {
      table: [1, 0] as const,
      apply: (value) => (value === 'ring' ? 0 : 1),
    };
    expect(exponential.object.contains(nonEquivariant)).toBe(false);

    const attemptBadMediator = () =>
      makeM2Morphism({
        dom: A,
        cod: exponential.object,
        map: (value: 'idle' | 'pulse') =>
          value === 'pulse' ? nonEquivariant : exponential.locate([0, 0]),
      });
    expect(attemptBadMediator).toThrowError(/makeM2Morphism/);
  });

  it('curries morphisms and evaluation recovers the original map', () => {
    const lambda = curryM2({
      product,
      morphism: f,
      exponential,
    });
    expect(isM2Morphism(lambda)).toBe(true);

    const [piA, piB] = product.projections;
    const mediator = exponential.product.tuple(product.object, [composeM2(lambda, piA), piB]);
    const recovered = composeM2(exponential.evaluation, mediator);

    expect(equalM2Morphisms(recovered, f)).toBe(true);
  });

  it('detects alternative mediators and enforces uniqueness', () => {
    const lambda = curryM2({
      product,
      morphism: f,
      exponential,
    });

    const duplicate = makeM2Morphism({
      dom: lambda.dom,
      cod: lambda.cod,
      map: lambda.map,
    });
    expect(equalM2Morphisms(duplicate, lambda)).toBe(true);

    const [piA, piB] = product.projections;
    const zeroFunction = exponential.locate(exponential.base.carrier.map(() => 0));
    const skewLambda = makeM2Morphism({
      dom: lambda.dom,
      cod: lambda.cod,
      map: (value: 'idle' | 'pulse') => (value === 'pulse' ? zeroFunction : lambda.map(value)),
    });

    const skewMediator = exponential.product.tuple(product.object, [composeM2(skewLambda, piA), piB]);
    const skewRecovered = composeM2(exponential.evaluation, skewMediator);

    expect(equalM2Morphisms(skewRecovered, f)).toBe(false);
  });
});
