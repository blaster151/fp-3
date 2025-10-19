import { describe, expect, it } from "vitest";
import { SetCat } from "../set-cat";

describe("SetCat exponentials", () => {
  it("enumerates function objects and evaluates correctly", () => {
    const base = SetCat.obj([0, 1]);
    const codomain = SetCat.obj(["a", "b"]);
    const data = SetCat.exponential(base, codomain);

    expect(data.object.size).toBe(4);
    expect(data.evaluation.dom).toBe(data.evaluationProduct.object);

    data.evaluation.dom.forEach(pair => {
      const [fn, input] = pair;
      expect(fn(input)).toBe(data.evaluation.map(pair));
    });
  });

  it("curries and uncurries mediators over shared products", () => {
    const base = SetCat.obj([0, 1]);
    const codomain = SetCat.obj(["a", "b", "c"]);
    const data = SetCat.exponential(base, codomain);

    const domain = SetCat.obj(["x", "y"]);
    const product = SetCat.product(domain, base);
    const mediator = SetCat.hom(product.object, codomain, ([label, index]) => {
      if (label === "x" && index === 0) return "a";
      if (label === "y" && index === 1) return "c";
      return "b";
    });

    const transpose = data.curry({ domain, product, morphism: mediator });
    expect(transpose.dom).toBe(domain);
    expect(transpose.cod).toBe(data.object);
    expect(transpose.map("x")(0)).toBe("a");
    expect(transpose.map("y")(1)).toBe("c");

    const reconstructed = data.uncurry({ product, morphism: transpose });
    expect(reconstructed.dom).toBe(product.object);
    product.object.forEach(pair => {
      expect(reconstructed.map(pair)).toBe(mediator.map(pair));
    });
  });

  it("rejects mediators that are incompatible with the supplied product", () => {
    const base = SetCat.obj([0]);
    const codomain = SetCat.obj(["a"]);
    const data = SetCat.exponential(base, codomain);

    const domain = SetCat.obj(["x"]);
    const product = SetCat.product(domain, base);
    const mediator = SetCat.hom(product.object, codomain, () => "a");

    const skewDomain = SetCat.obj(["z"]);
    const skewProduct = SetCat.product(skewDomain, base);

    expect(() =>
      data.curry({ domain: skewDomain, product: skewProduct, morphism: mediator }),
    ).toThrow(/mediator must have the supplied product/);
  });
});
