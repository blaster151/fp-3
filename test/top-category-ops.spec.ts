import { describe, expect, it } from "vitest";
import {
  makeTopBinaryProduct,
  makeTopCategoryOps,
  makeTopObject,
  makeTopTerminal,
} from "../src/top/categoryOps";
import { makeContinuousMap } from "../src/top/ContinuousMap";
import { topStructure } from "../src/top/Topology";

describe("Top category operations helpers", () => {
  const eqNumber = (a: number, b: number) => a === b;
  const eqBoolean = (a: boolean, b: boolean) => a === b;

  const leftStructure = topStructure({
    carrier: [0, 1],
    opens: [[], [0], [1], [0, 1]],
    eq: eqNumber,
  });
  const rightStructure = topStructure({
    carrier: [false, true],
    opens: [[], [false], [true], [false, true]],
    eq: eqBoolean,
  });

  const leftObject = makeTopObject(leftStructure);
  const rightObject = makeTopObject(rightStructure);
  const category = makeTopCategoryOps();

  it("supplies identities and composition equality", () => {
    const identity = category.id(leftObject);
    expect(category.eq(identity, identity)).toBe(true);

    const flip = makeContinuousMap({
      source: leftObject.topology,
      target: leftObject.topology,
      eqSource: leftObject.eq,
      eqTarget: leftObject.eq,
      map: (value: number) => (value === 0 ? 1 : 0),
    });

    const rightComposite = category.compose(identity, flip);
    expect(category.eq(rightComposite, flip)).toBe(true);

    const leftComposite = category.compose(flip, identity);
    expect(category.eq(leftComposite, flip)).toBe(true);

    const flipTwice = category.compose(flip, flip);
    expect(category.eq(flipTwice, identity)).toBe(true);
  });

  it("provides a canonical terminal arrow", () => {
    const terminal = makeTopTerminal();
    const terminate = terminal.terminate(leftObject);

    expect(terminal.object.topology.carrier).toEqual(["⋆"]);
    const image = leftObject.topology.carrier.map((value) => terminate.map(value));
    expect(image.every((point) => point === "⋆")).toBe(true);
    expect(terminate.eqSource).toBe(leftObject.eq);
    expect(terminate.eqTarget).toBe(terminal.object.eq);
  });

  it("constructs binary product witnesses shared across adapters", () => {
    const { object: product, tuple } = makeTopBinaryProduct({
      left: leftObject,
      right: rightObject,
    });

    expect(tuple.projections).toHaveLength(2);

    const leftLeg = category.id(leftObject);
    const rightLeg = makeContinuousMap({
      source: leftObject.topology,
      target: rightObject.topology,
      eqSource: leftObject.eq,
      eqTarget: rightObject.eq,
      map: (value: number) => value === 0,
    });

    const mediator = tuple.tuple(leftObject, [leftLeg, rightLeg]);

    leftObject.topology.carrier.forEach((value) => {
      const paired = mediator.map(value);
      expect(leftObject.eq(paired.x, value)).toBe(true);
      expect(rightObject.eq(paired.y, value === 0)).toBe(true);

      const projectedLeft = tuple.projections[0].map(paired);
      const projectedRight = tuple.projections[1].map(paired);

      expect(leftObject.eq(projectedLeft, paired.x)).toBe(true);
      expect(rightObject.eq(projectedRight, paired.y)).toBe(true);
    });

    const badLeg = {
      ...rightLeg,
      eqSource: rightObject.eq,
    } as unknown as typeof rightLeg;

    expect(() => tuple.tuple(leftObject, [leftLeg, badLeg])).toThrow(
      /leg equality witnesses must match the domain/,
    );

    expect(product.topology.carrier).toEqual(tuple.projections[0].source.carrier);
  });
});
