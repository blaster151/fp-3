import { describe, expect, it } from "vitest";

import { SetCat } from "../set-cat";

describe("SetCat lazy carriers", () => {
  const makeRange = (size: number): ReadonlyArray<number> => Array.from({ length: size }, (_, index) => index);

  it("falls back to a lazy product when the cross cardinality exceeds the cutoff", () => {
    const left = SetCat.obj(makeRange(200));
    const right = SetCat.obj(makeRange(200));
    const product = SetCat.product(left, right);

    expect(SetCat.isLazy(product.object)).toBe(true);
    expect(product.object.size).toBe(40_000);

    const iterator = product.object[Symbol.iterator]();
    const first = iterator.next();
    const second = iterator.next();
    const third = iterator.next();

    expect(first.done).toBe(false);
    expect(first.value).toStrictEqual([0, 0]);
    expect(second.value).toStrictEqual([0, 1]);
    expect(third.value).toStrictEqual([0, 2]);

    const canonical = product.lookup(0, 1);
    expect(canonical).toBe(second.value);
    expect(product.object.has(canonical)).toBe(true);
  });

  it("materialises a small product eagerly", () => {
    const left = SetCat.obj(["a", "b"] as const);
    const right = SetCat.obj([0, 1] as const);
    const product = SetCat.product(left, right);

    expect(SetCat.isLazy(product.object)).toBe(false);
    expect(product.object.size).toBe(4);

    const values = Array.from(product.object.values());
    expect(values).toContainEqual(["a", 0]);
    expect(values).toContainEqual(["a", 1]);
    expect(values).toContainEqual(["b", 0]);
    expect(values).toContainEqual(["b", 1]);
  });

  it("streams coproduct elements lazily when necessary", () => {
    const left = SetCat.obj(makeRange(12_000));
    const right = SetCat.obj(makeRange(12_000));
    const coproduct = SetCat.coproduct(left, right);

    expect(SetCat.isLazy(coproduct.object)).toBe(true);
    expect(coproduct.object.size).toBe(24_000);

    const iterator = coproduct.object[Symbol.iterator]();
    const first = iterator.next();
    const second = iterator.next();

    expect(first.done).toBe(false);
    expect(first.value).toStrictEqual({ tag: "inl", value: 0 });
    expect(second.value).toStrictEqual({ tag: "inl", value: 1 });

    const fromRight = coproduct.inrLookup(3);
    expect(fromRight).toStrictEqual({ tag: "inr", value: 3 });
    expect(coproduct.object.has(fromRight)).toBe(true);
  });

  it("supports explicit lazy carriers for infinite iterables", () => {
    const naturals = SetCat.lazyObj<number>({
      iterate: () =>
        (function* naturalsIterator() {
          let index = 0;
          while (true) {
            yield index;
            index += 1;
          }
        })(),
      has: (value) => Number.isInteger(value) && value >= 0,
      cardinality: Number.POSITIVE_INFINITY,
      tag: "ℕ",
    });

    const booleans = SetCat.obj([false, true] as const);
    const product = SetCat.product(naturals, booleans);

    expect(SetCat.isLazy(naturals)).toBe(true);
    expect(SetCat.isLazy(product.object)).toBe(true);
    expect(product.object.size).toBe(Number.POSITIVE_INFINITY);

    const iterator = product.object[Symbol.iterator]();
    const first = iterator.next();
    const second = iterator.next();

    expect(first.done).toBe(false);
    expect(first.value).toStrictEqual([0, false]);
    expect(second.value).toStrictEqual([0, true]);
  });
});
