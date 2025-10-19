import type { BinaryProductTuple } from "../../category-limits-helpers";
import type { CategoryOps, TerminalWitness } from "../../internal-group";
import {
  compose as composeContinuous,
  identity as identityContinuous,
  makeContinuousMap,
  pairing,
  productStructure,
  type ContinuousMap,
  type ProductPoint,
} from "./ContinuousMap";
import { forgetStructure, topStructure, type Top, type TopStructure } from "./Topology";

export type Eq<X> = (a: X, b: X) => boolean;

export interface TopObject<Point> {
  readonly structure: TopStructure<Point>;
  readonly topology: Top<Point>;
  readonly eq: Eq<Point>;
}

const toTopology = <Point>(structure: TopStructure<Point>): Top<Point> => forgetStructure(structure);

export const makeTopObject = <Point>(structure: TopStructure<Point>): TopObject<Point> => ({
  structure,
  topology: toTopology(structure),
  eq: structure.eq,
});

const equalContinuousMaps = (
  left: ContinuousMap<any, any>,
  right: ContinuousMap<any, any>,
): boolean => {
  if (left.source !== right.source) {
    return false;
  }
  if (left.target !== right.target) {
    return false;
  }
  if (left.eqSource !== right.eqSource || left.eqTarget !== right.eqTarget) {
    return false;
  }
  const carrier = left.source.carrier;
  return carrier.every((value) => left.eqTarget(left.map(value), right.map(value)));
};

const composeAny = (
  g: ContinuousMap<any, any>,
  f: ContinuousMap<any, any>,
): ContinuousMap<any, any> => composeContinuous(g, f);

const identityAny = (object: TopObject<any>): ContinuousMap<any, any> =>
  identityContinuous(object.eq, object.topology);

export const makeTopCategoryOps = (): CategoryOps<TopObject<any>, ContinuousMap<any, any>> => ({
  compose: composeAny,
  eq: equalContinuousMaps,
  id: identityAny,
});

export const makeTopTerminal = (): TerminalWitness<TopObject<any>, ContinuousMap<any, any>> => {
  const terminalPoint = "⋆";
  const structure = topStructure({
    carrier: [terminalPoint],
    opens: [[], [terminalPoint]],
    eq: (left: string, right: string) => left === right,
  });
  const object = makeTopObject(structure);

  return {
    object,
    terminate: (domain) =>
      makeContinuousMap({
        source: domain.topology,
        target: object.topology,
        eqSource: domain.eq,
        eqTarget: object.eq,
        map: () => terminalPoint,
      }),
  };
};

export const makeTopBinaryProduct = <Left, Right>(input: {
  readonly left: TopObject<Left>;
  readonly right: TopObject<Right>;
}): {
  readonly object: TopObject<ProductPoint<Left, Right>>;
  readonly tuple: BinaryProductTuple<TopObject<any>, ContinuousMap<any, any>>;
} => {
  const { left, right } = input;
  const base = productStructure(left.structure, right.structure);
  const productStructureArgs = {
    carrier: base.topology.carrier,
    opens: base.topology.opens,
    eq: base.eq,
  } as const;
  const structure = topStructure(productStructureArgs);
  const object = makeTopObject(structure);

  const tuple: BinaryProductTuple<TopObject<any>, ContinuousMap<any, any>> = {
    object,
    projections: [base.proj1, base.proj2],
    tuple: (domain, legs) => {
      if (legs.length !== 2) {
        throw new Error(
          `makeTopBinaryProduct: expected 2 legs for a binary product, received ${legs.length}`,
        );
      }
      const [leftLeg, rightLeg] = legs as readonly [ContinuousMap<any, any>, ContinuousMap<any, any>];
      if (leftLeg.eqSource !== domain.eq || rightLeg.eqSource !== domain.eq) {
        throw new Error("makeTopBinaryProduct: leg equality witnesses must match the domain");
      }
      return pairing(leftLeg, rightLeg, { topology: base.topology, eq: base.eq });
    },
  };

  return { object, tuple };
};
