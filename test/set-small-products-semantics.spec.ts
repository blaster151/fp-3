import { describe, expect, it } from "vitest";

import {
  SetCat,
  semanticsAwareEquals,
  semanticsAwareHas,
  type SetHom,
  type SetObj,
} from "../set-cat";
import { SetSmallProducts } from "../set-small-limits";
import { type AnySetHom, type AnySetObj } from "../set-subobject-classifier";

const toAnySetObj = <A>(obj: SetObj<A>): AnySetObj => obj as unknown as AnySetObj;
const toAnySetHom = <A, B>(hom: SetHom<A, B>): AnySetHom =>
  ({
    dom: hom.dom as SetObj<unknown>,
    cod: hom.cod as SetObj<unknown>,
    map: (value: unknown) => hom.map(value as A),
  });

interface WithId {
  readonly id: number;
  readonly label: string;
}

describe("SetSmallProducts semantics integration", () => {
  it("reuses factor semantics when materializing finite product carriers", () => {
    const leftSeed: ReadonlyArray<WithId> = [
      Object.freeze({ id: 1, label: "left-1" }),
      Object.freeze({ id: 2, label: "left-2" }),
    ];
    const equalsById = (left: WithId, right: WithId): boolean => left.id === right.id;
    const leftSemantics = SetCat.createMaterializedSemantics(leftSeed, {
      equals: equalsById,
      tag: "SetSmallProductsSemantics.left",
    });
    const left = SetCat.obj(leftSeed, { semantics: leftSemantics });

    const rightSeed: ReadonlyArray<WithId> = [
      Object.freeze({ id: 3, label: "right-3" }),
      Object.freeze({ id: 4, label: "right-4" }),
    ];
    const rightSemantics = SetCat.createMaterializedSemantics(rightSeed, {
      equals: equalsById,
      tag: "SetSmallProductsSemantics.right",
    });
    const right = SetCat.obj(rightSeed, { semantics: rightSemantics });

    const product = SetSmallProducts.product([left, right].map(toAnySetObj));
    const productSemantics = SetCat.semantics(product.obj);
    expect(productSemantics).toBeDefined();
    expect(productSemantics?.tag).toBe("SetSmallFiniteProduct");

    const hasProduct = semanticsAwareHas(product.obj);
    const candidate: ReadonlyArray<WithId> = [
      { id: 1, label: "fresh-left" },
      { id: 3, label: "fresh-right" },
    ];
    expect(hasProduct(candidate)).toBe(true);

    const equalsProduct = semanticsAwareEquals(product.obj);
    const canonical = Array.from(product.obj)[0] as ReadonlyArray<WithId> | undefined;
    expect(canonical).toBeDefined();
    expect(equalsProduct(canonical as ReadonlyArray<WithId>, candidate)).toBe(true);

    const domainSeed = [Symbol("source")] as const;
    const domain = SetCat.obj(domainSeed);
    const firstLeg = SetCat.hom(domain, left, () => ({ id: 2, label: "domain-left" }));
    const secondLeg = SetCat.hom(domain, right, () => ({ id: 4, label: "domain-right" }));
    const tuple = SetSmallProducts.tuple(
      toAnySetObj(domain),
      [firstLeg, secondLeg].map(toAnySetHom),
      product.obj,
    );
    const source = domainSeed[0];
    const tupleImage = tuple.map(source) as ReadonlyArray<WithId>;

    const validation: ReadonlyArray<WithId> = [
      { id: 2, label: "check-left" },
      { id: 4, label: "check-right" },
    ];
    expect(hasProduct(validation)).toBe(true);
    expect(equalsProduct(tupleImage, validation)).toBe(true);
  });
});
