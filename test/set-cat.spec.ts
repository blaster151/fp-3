import { describe, expect, it } from 'vitest';
import { SetCat, composeSet, idSet, isSetHom, type SetHom } from '../set-cat';

const expectMorphismsEqual = <A, B>(left: SetHom<A, B>, right: SetHom<A, B>): void => {
  expect(left.dom).toBe(right.dom);
  expect(left.cod).toBe(right.cod);
  for (const value of left.dom) {
    expect(left.map(value)).toBe(right.map(value));
  }
};

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

  it('realises the universal property of products', () => {
    const Left = SetCat.obj(['L', 'R'] as const);
    const Right = SetCat.obj([0, 1] as const);
    const X = SetCat.obj([10, 11, 12] as const);

    const { object: product, projections, pair } = SetCat.product(Left, Right);

    const toLeft = SetCat.hom(X, Left, (value) => (value % 2 === 0 ? 'L' : 'R'));
    const toRight = SetCat.hom(X, Right, (value) => (value % 2 === 0 ? 0 : 1));

    const mediator = pair(toLeft, toRight);
    expectMorphismsEqual(SetCat.compose(projections.fst, mediator), toLeft);
    expectMorphismsEqual(SetCat.compose(projections.snd, mediator), toRight);

    const reconstructed = pair(
      SetCat.compose(projections.fst, mediator),
      SetCat.compose(projections.snd, mediator),
    );
    expectMorphismsEqual(reconstructed, mediator);

    const wrongRight = SetCat.hom(X, SetCat.obj([true, false] as const), () => true) as unknown as SetHom<
      10 | 11 | 12,
      0 | 1
    >;
    expect(() => pair(toLeft, wrongRight)).toThrow(
      'SetCat: product pairing expects morphisms into the declared factors',
    );
    const otherDomain = SetCat.obj(['extra'] as const);
    const wrongDomain = SetCat.hom(otherDomain, Left, () => 'L') as unknown as SetHom<10 | 11 | 12, 'L' | 'R'>;
    expect(() => pair(wrongDomain, toRight)).toThrow('SetCat: product pairing requires shared domain');

    for (const tuple of product) {
      expect(projections.fst.map(tuple)).toBe(tuple[0]);
      expect(projections.snd.map(tuple)).toBe(tuple[1]);
    }
  });

  it('realises the universal property of coproducts', () => {
    const Left = SetCat.obj(['L', 'R'] as const);
    const Right = SetCat.obj([0, 1] as const);
    const Target = SetCat.obj(['even', 'odd'] as const);

    const { object: sum, injections, copair } = SetCat.coproduct(Left, Right);

    const fromLeft = SetCat.hom(Left, Target, (value) => (value === 'L' ? 'even' : 'odd'));
    const fromRight = SetCat.hom(Right, Target, (value) => (value === 0 ? 'even' : 'odd'));

    const mediator = copair(fromLeft, fromRight);
    expectMorphismsEqual(SetCat.compose(mediator, injections.inl), fromLeft);
    expectMorphismsEqual(SetCat.compose(mediator, injections.inr), fromRight);

    const reconstructed = copair(
      SetCat.compose(mediator, injections.inl),
      SetCat.compose(mediator, injections.inr),
    );
    expectMorphismsEqual(reconstructed, mediator);

    const wrongCod = SetCat.hom(Right, SetCat.obj([true, false] as const), () => true) as unknown as SetHom<
      0 | 1,
      'even' | 'odd'
    >;
    expect(() => copair(fromLeft, wrongCod)).toThrow(
      'SetCat: coproduct copairing requires a shared codomain',
    );
    const wrongSummand = SetCat.hom(SetCat.obj(['extra'] as const), Target, () => 'even') as unknown as SetHom<
      'L' | 'R',
      'even' | 'odd'
    >;
    expect(() => copair(wrongSummand, fromRight)).toThrow(
      'SetCat: coproduct copairing expects morphisms from the declared summands',
    );

    for (const tagged of sum) {
      if (tagged.tag === 'inl') {
        expect(injections.inl.map(tagged.value)).toBe(tagged);
      } else {
        expect(injections.inr.map(tagged.value)).toBe(tagged);
      }
    }
  });

  it('provides a unique arrow into the terminal object', () => {
    const { object: terminal, terminate } = SetCat.terminal();
    const Dom = SetCat.obj([0, 1, 2] as const);
    const arrow = terminate(Dom);
    expect(isSetHom(arrow)).toBe(true);

    const candidate = SetCat.hom(Dom, terminal, () => [...terminal][0]);
    expectMorphismsEqual(candidate, arrow);
  });

  it('provides a unique arrow from the initial object', () => {
    const { object: initial, initialize } = SetCat.initial();
    const Cod = SetCat.obj(['a', 'b'] as const);
    const arrow = initialize(Cod);
    expect(isSetHom(arrow)).toBe(true);

    const candidate = SetCat.hom(initial, Cod, (value) => value);
    expectMorphismsEqual(candidate, arrow);
  });
});
