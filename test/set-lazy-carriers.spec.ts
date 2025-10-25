import { describe, expect, it } from "vitest";

import { SetCat, type SetCarrierSemantics } from "../set-cat";
import { SetLaws } from "../set-laws";

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
    expect(first.value).toEqual([0, 0]);
    expect(second.value).toEqual([0, 1]);
    expect(third.value).toEqual([0, 2]);

    if (!second.value) {
      throw new Error("SetCat lazy product iterator failed to yield a second element");
    }
    expect(product.object.has(second.value)).toBe(true);
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
    expect(first.value).toEqual({ tag: "inl", value: 0 });
    expect(second.value).toEqual({ tag: "inl", value: 1 });

    const fromRight = coproduct.injections.inr.map(3);
    expect(fromRight).toEqual({ tag: "inr", value: 3 });
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
    expect(first.value).toEqual([0, false]);
    expect(second.value).toEqual([0, true]);
  });

  it("registers semantics witnesses provided to lazy carriers", () => {
    const semantics: SetCarrierSemantics<number> = {
      iterate: function* iterate(): IterableIterator<number> {
        yield 2;
        yield 4;
      },
      has: (value) => value === 2 || value === 4,
      equals: (left, right) => left === right,
      cardinality: 2,
      tag: "EvenPair",
    };

    const carrier = SetCat.lazyObj<number>({ semantics });
    const retrieved = SetCat.semantics(carrier);

    expect(retrieved).toBe(semantics);
    expect(Array.from(retrieved?.iterate() ?? [])).toEqual([2, 4]);
    expect(retrieved?.has(2)).toBe(true);
    expect(retrieved?.has(3)).toBe(false);
    expect(retrieved?.equals?.(2, 2)).toBe(true);
  });

  it("attaches semantics to power set evidence carriers", () => {
    const ambient = SetCat.obj(["a", "b"] as const);
    const evidence = SetLaws.powerSetEvidence(ambient);

    const ambientSemantics = SetCat.semantics(evidence.ambient);
    expect(ambientSemantics?.tag).toBe("SetLaws.cloneToSet");

    const subsetCarrierSemantics = SetCat.semantics(evidence.subsetCarrier);
    expect(subsetCarrierSemantics?.tag).toBe("SetLaws.powerSet.subsets");

    const characteristicCarrierSemantics = SetCat.semantics(evidence.characteristicCarrier);
    expect(characteristicCarrierSemantics?.tag).toBe("SetLaws.powerSet.characteristics");

    evidence.subsets.forEach(({ subset }) => {
      const subsetSemantics = SetCat.semantics(subset);
      expect(subsetSemantics?.tag).toBe("SetLaws.enumerateSubsetWitness");
    });
  });

  it("derives subset semantics that inherit ambient equality", () => {
    const ambient = SetCat.obj(
      [
        { id: 1, label: "one" },
        { id: 2, label: "two" },
        { id: 3, label: "three" },
      ] as const,
      {
        equals: (left, right) => left.id === right.id,
        tag: "AmbientById",
      },
    );

    const subsetElements = [{ id: 2, label: "duplicate" }];
    const subsetSemantics = SetCat.createSubsetSemantics(ambient, subsetElements, {
      tag: "SubsetById",
    });
    const subset = SetCat.obj(subsetElements, { semantics: subsetSemantics });
    const retrieved = SetCat.semantics(subset);

    expect(retrieved?.tag).toBe("SubsetById");
    expect(
      retrieved?.equals?.(
        { id: 2, label: "duplicate" },
        { id: 2, label: "duplicate" },
      ),
    ).toBe(true);
    expect(retrieved?.has({ id: 2, label: "two" })).toBe(true);
    expect(retrieved?.has({ id: 4, label: "four" })).toBe(false);
  });
});
