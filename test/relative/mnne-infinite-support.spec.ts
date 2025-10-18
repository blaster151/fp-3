import { describe, expect, it } from "vitest";

import {
  approximateKanExtension,
  createFiniteIndexedFamily,
  createReplayableIterableFromArray,
  createReplayableIterableFromWitness,
  materializeIndexedFamily,
  sliceLazyIterable,
  type KanExtensionSeed,
  type SymbolicArrow,
} from "../../relative/mnne-infinite-support";

describe("mnne infinite support helpers", () => {
  it("replays finite arrays without truncation", () => {
    const iterable = createReplayableIterableFromArray(["a", "b", "c"], {
      description: "letters",
    });

    const slice = sliceLazyIterable(iterable);
    expect(slice.values).toEqual(["a", "b", "c"]);
    expect(slice.truncated).toBe(false);

    const limited = sliceLazyIterable(iterable, { limit: 2 });
    expect(limited.values).toEqual(["a", "b"]);
    expect(limited.truncated).toBe(true);
  });

  it("tracks replay buffers for countably infinite witnesses", () => {
    const naturalsWitness = {
      kind: "countablyInfinite" as const,
      enumerate: () => ({
        [Symbol.iterator]: function* () {
          let index = 0;
          while (true) {
            yield index;
            index += 1;
          }
        },
      }),
      sample: [0, 1, 2],
      reason: "Natural numbers",
    };

    const iterable = createReplayableIterableFromWitness(naturalsWitness, {
      description: "naturals",
    });

    const slice = sliceLazyIterable(iterable, { limit: 5 });
    expect(slice.values).toEqual([0, 1, 2, 3, 4]);
    expect(slice.truncated).toBe(true);
    expect(iterable.replay(3)).toEqual([0, 1, 2]);
  });

  it("materializes indexed families and approximates Kan extensions", () => {
    const family = createFiniteIndexedFamily<string, string>({
      description: "toy family",
      indices: ["A", "B"],
      fibre: (index) =>
        index === "A"
          ? ["seed"]
          : ["target1", "target2"],
    });

    const materialized = materializeIndexedFamily(family);
    expect(materialized.indexSlice.truncated).toBe(false);
    expect(materialized.indices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          index: "A",
          elements: ["seed"],
        }),
      ]),
    );

    const arrows: ReadonlyArray<SymbolicArrow<string, string>> = [
      {
        source: "A",
        target: "B",
        map: (element) => (element === "seed" ? ["target1"] : []),
        description: "seed arrow",
      },
      {
        source: "B",
        target: "B",
        map: (element) => (element === "target1" ? ["target2"] : []),
        description: "propagate",
      },
    ];

    const seeds: ReadonlyArray<KanExtensionSeed<string, string>> = [
      { index: "A", element: "seed" },
    ];

    const approximation = approximateKanExtension(family, seeds, arrows, {
      depthLimit: 3,
    });

    expect(approximation.truncated).toBe(false);
    expect(approximation.explored).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ index: "A", element: "seed", depth: 0 }),
        expect.objectContaining({ index: "B", element: "target1", depth: 1 }),
        expect.objectContaining({ index: "B", element: "target2", depth: 2 }),
      ]),
    );
  });
});
