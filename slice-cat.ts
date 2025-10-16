import type { FiniteCategory } from "./finite-cat";
import { pushUnique } from "./finite-cat";
import {
  makeBinaryProductComponentwise,
  makeBinaryProductDiagonal,
  makeBinaryProductSwap,
} from "./category-limits-helpers";
import type { FinSetCategory, FinSetName, FuncArr } from "./models/finset-cat";

export interface SliceObject<Obj, Arr> {
  readonly domain: Obj;
  readonly arrowToAnchor: Arr;
}

export interface SliceArrow<Obj, Arr> {
  readonly src: SliceObject<Obj, Arr>;
  readonly dst: SliceObject<Obj, Arr>;
  readonly mediating: Arr;
}

export interface CosliceObject<Obj, Arr> {
  readonly codomain: Obj;
  readonly arrowFromAnchor: Arr;
}

export interface CosliceArrow<Obj, Arr> {
  readonly src: CosliceObject<Obj, Arr>;
  readonly dst: CosliceObject<Obj, Arr>;
  readonly mediating: Arr;
}

export interface SlicePostcomposeFunctor<Obj, Arr> {
  readonly F0: (object: SliceObject<Obj, Arr>) => SliceObject<Obj, Arr>;
  readonly F1: (arrow: SliceArrow<Obj, Arr>) => SliceArrow<Obj, Arr>;
}

export interface SliceProductWitness {
  readonly object: SliceObject<FinSetName, FuncArr>;
  readonly projectionLeft: SliceArrow<FinSetName, FuncArr>;
  readonly projectionRight: SliceArrow<FinSetName, FuncArr>;
  readonly decode: (value: string) => readonly [string, string];
  readonly pair: (
    leftLeg: SliceArrow<FinSetName, FuncArr>,
    rightLeg: SliceArrow<FinSetName, FuncArr>,
  ) => SliceArrow<FinSetName, FuncArr>;
  readonly factors: readonly [SliceObject<FinSetName, FuncArr>, SliceObject<FinSetName, FuncArr>];
  readonly componentwise?: (
    target: SliceProductWitness,
    components: readonly [SliceArrow<FinSetName, FuncArr>, SliceArrow<FinSetName, FuncArr>],
  ) => SliceArrow<FinSetName, FuncArr>;
  readonly swap?: () => SliceProductSwap;
  readonly diagonal?: () => SliceProductDiagonal;
  readonly leftUnit?: () => SliceProductUnit;
  readonly rightUnit?: () => SliceProductUnit;
}

export interface SliceFiniteProductWitness {
  readonly object: SliceObject<FinSetName, FuncArr>;
  readonly projections: readonly SliceArrow<FinSetName, FuncArr>[];
  readonly decode: (value: string) => ReadonlyArray<string>;
  readonly tuple: (
    domain: SliceObject<FinSetName, FuncArr>,
    legs: ReadonlyArray<SliceArrow<FinSetName, FuncArr>>,
  ) => SliceArrow<FinSetName, FuncArr>;
  readonly factors: ReadonlyArray<SliceObject<FinSetName, FuncArr>>;
  readonly componentwise?: (
    target: SliceFiniteProductWitness,
    components: ReadonlyArray<SliceArrow<FinSetName, FuncArr>>,
  ) => SliceArrow<FinSetName, FuncArr>;
  readonly swap?: () => SliceProductSwap;
  readonly diagonal?: () => SliceProductDiagonal;
  readonly leftUnit?: () => SliceProductUnit;
  readonly rightUnit?: () => SliceProductUnit;
}

export interface SliceProductSwap {
  readonly target: SliceFiniteProductWitness;
  readonly forward: SliceArrow<FinSetName, FuncArr>;
  readonly backward: SliceArrow<FinSetName, FuncArr>;
}

export interface SliceProductDiagonal {
  readonly source: SliceObject<FinSetName, FuncArr>;
  readonly arrow: SliceArrow<FinSetName, FuncArr>;
}

export interface SliceProductUnit {
  readonly factor: SliceObject<FinSetName, FuncArr>;
  readonly forward: SliceArrow<FinSetName, FuncArr>;
  readonly backward: SliceArrow<FinSetName, FuncArr>;
}

interface SliceProductMetadata {
  readonly arity: number;
  readonly factors: ReadonlyArray<SliceObject<FinSetName, FuncArr>>;
  readonly tuple: (
    domain: SliceObject<FinSetName, FuncArr>,
    legs: ReadonlyArray<SliceArrow<FinSetName, FuncArr>>,
  ) => SliceArrow<FinSetName, FuncArr>;
}

const sliceProductMetadata = new WeakMap<
  SliceObject<FinSetName, FuncArr>,
  SliceProductMetadata
>();

const registerSliceProductMetadata = (
  object: SliceObject<FinSetName, FuncArr>,
  metadata: SliceProductMetadata,
) => {
  sliceProductMetadata.set(object, metadata);
  return metadata;
};

export const lookupSliceProductMetadata = (
  object: SliceObject<FinSetName, FuncArr>,
): SliceProductMetadata | undefined => sliceProductMetadata.get(object);

function sliceEq<Obj, Arr>(baseEq: (x: Arr, y: Arr) => boolean) {
  return (a: SliceArrow<Obj, Arr>, b: SliceArrow<Obj, Arr>) =>
    baseEq(a.mediating, b.mediating) &&
    baseEq(a.src.arrowToAnchor, b.src.arrowToAnchor) &&
    baseEq(a.dst.arrowToAnchor, b.dst.arrowToAnchor);
}

function cosliceEq<Obj, Arr>(baseEq: (x: Arr, y: Arr) => boolean) {
  return (a: CosliceArrow<Obj, Arr>, b: CosliceArrow<Obj, Arr>) =>
    baseEq(a.mediating, b.mediating) &&
    baseEq(a.src.arrowFromAnchor, b.src.arrowFromAnchor) &&
    baseEq(a.dst.arrowFromAnchor, b.dst.arrowFromAnchor);
}

export function makeSlice<Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  anchor: Obj
): FiniteCategory<SliceObject<Obj, Arr>, SliceArrow<Obj, Arr>> {
  const objects = base.arrows
    .filter((arrow) => base.dst(arrow) === anchor)
    .map((arrow) => ({ domain: base.src(arrow), arrowToAnchor: arrow }));

  const eq = sliceEq<Obj, Arr>(base.eq);
  const arrows: SliceArrow<Obj, Arr>[] = [];

  const id = (object: SliceObject<Obj, Arr>): SliceArrow<Obj, Arr> => ({
    src: object,
    dst: object,
    mediating: base.id(object.domain),
  });

  for (const object of objects) {
    pushUnique(arrows, id(object), eq);
  }

  for (const src of objects) {
    for (const dst of objects) {
      for (const mediating of base.arrows) {
        if (base.src(mediating) !== src.domain || base.dst(mediating) !== dst.domain) continue;
        const composed = base.compose(dst.arrowToAnchor, mediating);
        if (base.eq(composed, src.arrowToAnchor)) {
          pushUnique(arrows, { src, dst, mediating }, eq);
        }
      }
    }
  }

  const compose = (
    g: SliceArrow<Obj, Arr>,
    f: SliceArrow<Obj, Arr>
  ): SliceArrow<Obj, Arr> => {
    if (f.dst !== g.src) {
      throw new Error("makeSlice: domain/codomain mismatch");
    }
    const mediating = base.compose(g.mediating, f.mediating);
    return { src: f.src, dst: g.dst, mediating };
  };

  const src = (arrow: SliceArrow<Obj, Arr>) => arrow.src;
  const dst = (arrow: SliceArrow<Obj, Arr>) => arrow.dst;

  return {
    objects,
    arrows,
    id,
    compose,
    src,
    dst,
    eq,
  };
}

export function makeCoslice<Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  anchor: Obj
): FiniteCategory<CosliceObject<Obj, Arr>, CosliceArrow<Obj, Arr>> {
  const objects = base.arrows
    .filter((arrow) => base.src(arrow) === anchor)
    .map((arrow) => ({ codomain: base.dst(arrow), arrowFromAnchor: arrow }));

  const eq = cosliceEq<Obj, Arr>(base.eq);
  const arrows: CosliceArrow<Obj, Arr>[] = [];

  const id = (object: CosliceObject<Obj, Arr>): CosliceArrow<Obj, Arr> => ({
    src: object,
    dst: object,
    mediating: base.id(object.codomain),
  });

  for (const object of objects) {
    pushUnique(arrows, id(object), eq);
  }

  for (const srcObj of objects) {
    for (const dstObj of objects) {
      for (const mediating of base.arrows) {
        if (base.src(mediating) !== srcObj.codomain || base.dst(mediating) !== dstObj.codomain) continue;
        const composed = base.compose(mediating, srcObj.arrowFromAnchor);
        if (base.eq(composed, dstObj.arrowFromAnchor)) {
          pushUnique(arrows, { src: srcObj, dst: dstObj, mediating }, eq);
        }
      }
    }
  }

  const compose = (
    g: CosliceArrow<Obj, Arr>,
    f: CosliceArrow<Obj, Arr>
  ): CosliceArrow<Obj, Arr> => {
    if (f.dst !== g.src) {
      throw new Error("makeCoslice: domain/codomain mismatch");
    }
    const mediating = base.compose(g.mediating, f.mediating);
    return { src: f.src, dst: g.dst, mediating };
  };

  const src = (arrow: CosliceArrow<Obj, Arr>) => arrow.src;
  const dst = (arrow: CosliceArrow<Obj, Arr>) => arrow.dst;

  return {
    objects,
    arrows,
    id,
    compose,
    src,
    dst,
    eq,
  };
}

export function makePostcomposeOnSlice<Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  mediating: Arr,
  sourceAnchor: Obj,
  targetAnchor: Obj,
): SlicePostcomposeFunctor<Obj, Arr> {
  if (base.src(mediating) !== sourceAnchor || base.dst(mediating) !== targetAnchor) {
    throw new Error("makePostcomposeOnSlice: expected mediating arrow to match the supplied anchors.");
  }

  const F0 = (object: SliceObject<Obj, Arr>): SliceObject<Obj, Arr> => {
    if (base.dst(object.arrowToAnchor) !== sourceAnchor) {
      throw new Error("makePostcomposeOnSlice: slice object does not land in the expected source anchor.");
    }
    return {
      domain: object.domain,
      arrowToAnchor: base.compose(mediating, object.arrowToAnchor),
    };
  };

  const F1 = (arrow: SliceArrow<Obj, Arr>): SliceArrow<Obj, Arr> => ({
    src: F0(arrow.src),
    dst: F0(arrow.dst),
    mediating: arrow.mediating,
  });

  return { F0, F1 };
}

const encodePair = (left: string, right: string) => JSON.stringify([left, right]);

const decodePair = (value: string): readonly [string, string] => {
  const parsed = JSON.parse(value);
  if (!Array.isArray(parsed) || parsed.length !== 2) {
    throw new Error(`makeSliceProduct: element ${value} is not a valid pair`);
  }
  const [first, second] = parsed;
  if (typeof first !== "string" || typeof second !== "string") {
    throw new Error(`makeSliceProduct: element ${value} does not decode to set members`);
  }
  return [first, second] as const;
};

const sliceObjectsEqual = (
  base: FinSetCategory,
  left: SliceObject<FinSetName, FuncArr>,
  right: SliceObject<FinSetName, FuncArr>,
) => left.domain === right.domain && base.eq(left.arrowToAnchor, right.arrowToAnchor);

const ensureSliceObjectLandsInAnchor = (
  anchor: FinSetName,
  object: SliceObject<FinSetName, FuncArr>,
) => {
  if (object.arrowToAnchor.cod !== anchor) {
    throw new Error(
      `makeFiniteSliceProduct: object ${object.domain} does not map into anchor ${anchor}`,
    );
  }
};

const ensureSliceObjectsShareSource = (
  base: FinSetCategory,
  left: SliceObject<FinSetName, FuncArr>,
  right: SliceObject<FinSetName, FuncArr>,
) => {
  if (!sliceObjectsEqual(base, left, right)) {
    throw new Error("makeFiniteSliceProduct: legs must share a common source");
  }
};

const ensureSliceElement = (
  base: FinSetCategory,
  object: SliceObject<FinSetName, FuncArr>,
  value: string,
) => {
  const support = base.carrier(object.domain);
  if (!support.includes(value)) {
    throw new Error(
      `makeFiniteSliceProduct: element ${value} is not a member of ${object.domain}`,
    );
  }
};

const makeIdentityProjection = (
  base: FinSetCategory,
  object: SliceObject<FinSetName, FuncArr>,
): SliceArrow<FinSetName, FuncArr> => ({
  src: object,
  dst: object,
  mediating: base.id(object.domain),
});

const makeTerminalSliceObject = (
  base: FinSetCategory,
  anchor: FinSetName,
): SliceObject<FinSetName, FuncArr> => ({
  domain: anchor,
  arrowToAnchor: base.id(anchor),
});

const isTerminalSliceObject = (
  base: FinSetCategory,
  anchor: FinSetName,
  object: SliceObject<FinSetName, FuncArr>,
) => object.domain === anchor && base.eq(object.arrowToAnchor, base.id(anchor));

export function makeFiniteSliceProduct(
  base: FinSetCategory,
  anchor: FinSetName,
  inputs: ReadonlyArray<SliceObject<FinSetName, FuncArr>>,
  options: { readonly name?: string; readonly disableSwap?: boolean } = {},
): SliceFiniteProductWitness {
  inputs.forEach((object) => ensureSliceObjectLandsInAnchor(anchor, object));

  const factors = [...inputs];
  const arity = factors.length;

  if (arity === 0) {
    const terminal = makeTerminalSliceObject(base, anchor);
    const tuple = (
      domain: SliceObject<FinSetName, FuncArr>,
      legs: ReadonlyArray<SliceArrow<FinSetName, FuncArr>>,
    ): SliceArrow<FinSetName, FuncArr> => {
      if (legs.length !== 0) {
        throw new Error(
          `makeFiniteSliceProduct: expected 0 legs for the empty product, received ${legs.length}`,
        );
      }
      ensureSliceObjectLandsInAnchor(anchor, domain);
      return {
        src: domain,
        dst: terminal,
        mediating: domain.arrowToAnchor,
      };
    };

    const witness: SliceFiniteProductWitness = {
      object: terminal,
      projections: [],
      decode: () => [],
      tuple,
      factors: [],
    };
    registerSliceProductMetadata(terminal, { arity, factors, tuple });
    return witness;
  }

  if (arity === 1) {
    const [factor] = factors;
    if (!factor) {
      throw new Error("makeFiniteSliceProduct: missing factor for unary product");
    }

    const tuple = (
      domain: SliceObject<FinSetName, FuncArr>,
      legs: ReadonlyArray<SliceArrow<FinSetName, FuncArr>>,
    ): SliceArrow<FinSetName, FuncArr> => {
      if (legs.length !== 1) {
        throw new Error(
          `makeFiniteSliceProduct: expected 1 leg for product of ${factor.domain}, received ${legs.length}`,
        );
      }
      const [leg] = legs;
      if (!leg) {
        throw new Error("makeFiniteSliceProduct: missing unary leg");
      }
      if (!sliceObjectsEqual(base, leg.dst, factor)) {
        throw new Error(
          `makeFiniteSliceProduct: leg ${leg.mediating.name ?? "?"} does not target ${factor.domain}`,
        );
      }
      ensureSliceObjectLandsInAnchor(anchor, domain);
      ensureSliceObjectsShareSource(base, leg.src, domain);
      return leg;
    };

    const decode = (value: string): ReadonlyArray<string> => {
      ensureSliceElement(base, factor, value);
      return [value];
    };

    const witness: SliceFiniteProductWitness = {
      object: factor,
      projections: [makeIdentityProjection(base, factor)],
      decode,
      tuple,
      factors: [factor],
    };
    registerSliceProductMetadata(factor, { arity, factors, tuple });
    return witness;
  }

  const [first, second, ...rest] = factors;
  if (!first || !second) {
    throw new Error("makeFiniteSliceProduct: expected at least two factors");
  }

  const initial = makeSliceProduct(
    base,
    anchor,
    first,
    second,
    rest.length === 0 ? options : undefined,
  );

  let currentObject = initial.object;
  let projections: SliceArrow<FinSetName, FuncArr>[] = [
    initial.projectionLeft,
    initial.projectionRight,
  ];
  let decode: (value: string) => ReadonlyArray<string> = (value) => initial.decode(value);
  let pairCore = (
    _domain: SliceObject<FinSetName, FuncArr>,
    legs: ReadonlyArray<SliceArrow<FinSetName, FuncArr>>,
  ): SliceArrow<FinSetName, FuncArr> => {
    if (legs.length !== 2) {
      throw new Error(
        `makeFiniteSliceProduct: expected 2 legs for binary product, received ${legs.length}`,
      );
    }
    const [leftLeg, rightLeg] = legs;
    if (!leftLeg || !rightLeg) {
      throw new Error("makeFiniteSliceProduct: missing legs for binary product");
    }
    return initial.pair(leftLeg, rightLeg);
  };

  for (let index = 0; index < rest.length; index += 1) {
    const factor = rest[index]!;
    const previousDecode = decode;
    const previousProjections = projections;
    const previousPair = pairCore;

    const step = makeSliceProduct(
      base,
      anchor,
      currentObject,
      factor,
      index === rest.length - 1 ? options : undefined,
    );

    const decodeStep = (value: string): ReadonlyArray<string> => {
      const [prefix, tail] = step.decode(value);
      const prefixTuple = previousDecode(prefix);
      return [...prefixTuple, tail];
    };

    const composedLeft = step.projectionLeft;
    const updatedProjections = previousProjections.map((projection) => ({
      src: step.object,
      dst: projection.dst,
      mediating: base.compose(projection.mediating, composedLeft.mediating),
    }));
    updatedProjections.push(step.projectionRight);

    const newPairCore = (
      domain: SliceObject<FinSetName, FuncArr>,
      legs: ReadonlyArray<SliceArrow<FinSetName, FuncArr>>,
    ): SliceArrow<FinSetName, FuncArr> => {
      const expectedLegs = index + 3;
      if (legs.length !== expectedLegs) {
        throw new Error(
          `makeFiniteSliceProduct: expected ${expectedLegs} legs for product, received ${legs.length}`,
        );
      }
      const prefixLegs = legs.slice(0, expectedLegs - 1);
      const tailLeg = legs[expectedLegs - 1];
      if (!tailLeg) {
        throw new Error("makeFiniteSliceProduct: missing leg for iterated product");
      }
      const leftLeg = previousPair(domain, prefixLegs);
      return step.pair(leftLeg, tailLeg);
    };

    decode = decodeStep;
    projections = updatedProjections;
    pairCore = newPairCore;
    currentObject = step.object;
  }

  const tuple = (
    domain: SliceObject<FinSetName, FuncArr>,
    legs: ReadonlyArray<SliceArrow<FinSetName, FuncArr>>,
  ): SliceArrow<FinSetName, FuncArr> => {
    if (legs.length !== arity) {
      throw new Error(
        `makeFiniteSliceProduct: expected ${arity} legs, received ${legs.length}`,
      );
    }
    ensureSliceObjectLandsInAnchor(anchor, domain);
    for (let index = 0; index < legs.length; index += 1) {
      const leg = legs[index]!;
      const factor = factors[index]!;
      if (!leg || !factor) {
        throw new Error("makeFiniteSliceProduct: missing leg or factor");
      }
      if (!sliceObjectsEqual(base, leg.dst, factor)) {
        throw new Error(
          `makeFiniteSliceProduct: leg ${leg.mediating.name ?? "?"} does not target ${factor.domain}`,
        );
      }
      ensureSliceObjectsShareSource(base, leg.src, domain);
    }
    return pairCore(domain, legs);
  };

  const witness: SliceFiniteProductWitness = {
    object: currentObject,
    projections,
    decode,
    tuple,
    factors,
  };
  let swapAccessor: (() => SliceProductSwap) | undefined;
  let diagonalAccessor: (() => SliceProductDiagonal) | undefined;
  let leftUnitAccessor: (() => SliceProductUnit) | undefined;
  let rightUnitAccessor: (() => SliceProductUnit) | undefined;
  let componentwiseAccessor:
    | ((
        target: SliceFiniteProductWitness,
        components: ReadonlyArray<SliceArrow<FinSetName, FuncArr>>,
      ) => SliceArrow<FinSetName, FuncArr>)
    | undefined;

  if (arity === 2) {
    const leftFactor = factors[0];
    const rightFactor = factors[1];
    if (!leftFactor || !rightFactor) {
      throw new Error("makeFiniteSliceProduct: missing factors while analysing binary product");
    }

    const projectionFirst = projections[0];
    const projectionSecond = projections[1];
    if (!projectionFirst || !projectionSecond) {
      throw new Error("makeFiniteSliceProduct: binary product expects two projections");
    }

    if (!options.disableSwap) {
      const swappedWitness = makeFiniteSliceProduct(base, anchor, [rightFactor, leftFactor], {
        disableSwap: true,
      });

      const swappedProjectionFirst = swappedWitness.projections[0];
      const swappedProjectionSecond = swappedWitness.projections[1];
      if (!swappedProjectionFirst || !swappedProjectionSecond) {
        throw new Error("makeFiniteSliceProduct: swapped product missing projections");
      }

      const swapData = makeBinaryProductSwap<
        SliceObject<FinSetName, FuncArr>,
        SliceArrow<FinSetName, FuncArr>
      >(
        {
          object: currentObject,
          projections: [projectionFirst, projectionSecond],
          tuple: (domain, legs) => tuple(domain, legs),
        },
        {
          object: swappedWitness.object,
          projections: [swappedProjectionFirst, swappedProjectionSecond],
          tuple: (domain, legs) => swappedWitness.tuple(domain, legs),
        },
      );

      swapAccessor = () => ({
        target: swappedWitness,
        forward: swapData.forward,
        backward: swapData.backward,
      });
    }

    if (sliceObjectsEqual(base, leftFactor, rightFactor)) {
      const identity = makeIdentityProjection(base, leftFactor);
      const diagonal = makeBinaryProductDiagonal<
        SliceObject<FinSetName, FuncArr>,
        SliceArrow<FinSetName, FuncArr>
      >(
        {
          object: currentObject,
          projections: [projectionFirst, projectionSecond],
          tuple: (domain, legs) => tuple(domain, legs),
        },
        {
          object: leftFactor,
          identity,
        },
      );

      diagonalAccessor = () => ({ source: leftFactor, arrow: diagonal });
    }

    if (isTerminalSliceObject(base, anchor, leftFactor)) {
      const identityRight = makeIdentityProjection(base, rightFactor);
      const toTerminal: SliceArrow<FinSetName, FuncArr> = {
        src: rightFactor,
        dst: leftFactor,
        mediating: rightFactor.arrowToAnchor,
      };
      const backward = tuple(rightFactor, [toTerminal, identityRight]);
      leftUnitAccessor = () => ({
        factor: rightFactor,
        forward: projectionSecond,
        backward,
      });
    }

    if (isTerminalSliceObject(base, anchor, rightFactor)) {
      const identityLeft = makeIdentityProjection(base, leftFactor);
      const toTerminal: SliceArrow<FinSetName, FuncArr> = {
        src: leftFactor,
        dst: rightFactor,
        mediating: leftFactor.arrowToAnchor,
      };
      const backward = tuple(leftFactor, [identityLeft, toTerminal]);
      rightUnitAccessor = () => ({
        factor: leftFactor,
        forward: projectionFirst,
        backward,
      });
    }

    const composeSliceArrows = (
      g: SliceArrow<FinSetName, FuncArr>,
      f: SliceArrow<FinSetName, FuncArr>,
    ): SliceArrow<FinSetName, FuncArr> => {
      if (!sliceObjectsEqual(base, f.dst, g.src)) {
        throw new Error("makeFiniteSliceProduct.componentwise: incompatible arrow composition");
      }
      const composed: FuncArr = {
        name: `${g.mediating.name ?? "?"}∘${f.mediating.name ?? "?"}`,
        dom: f.mediating.dom,
        cod: g.mediating.cod,
        map: (value) => g.mediating.map(f.mediating.map(value)),
      };
      return { src: f.src, dst: g.dst, mediating: composed };
    };

    componentwiseAccessor = (target, components) => {
      if (components.length !== 2) {
        throw new Error(
          `makeFiniteSliceProduct.componentwise: expected 2 component legs, received ${components.length}`,
        );
      }
      if (target.factors.length !== 2) {
        throw new Error(
          "makeFiniteSliceProduct.componentwise: target witness must describe a binary product",
        );
      }

      const [leftComponent, rightComponent] = components as readonly [
        SliceArrow<FinSetName, FuncArr>,
        SliceArrow<FinSetName, FuncArr>,
      ];
      const [targetLeft, targetRight] = target.factors as readonly [
        SliceObject<FinSetName, FuncArr>,
        SliceObject<FinSetName, FuncArr>,
      ];

      if (!sliceObjectsEqual(base, leftComponent.src, leftFactor)) {
        throw new Error(
          "makeFiniteSliceProduct.componentwise: left component must originate at the left factor",
        );
      }
      if (!sliceObjectsEqual(base, rightComponent.src, rightFactor)) {
        throw new Error(
          "makeFiniteSliceProduct.componentwise: right component must originate at the right factor",
        );
      }

      if (!sliceObjectsEqual(base, leftComponent.dst, targetLeft)) {
        throw new Error(
          "makeFiniteSliceProduct.componentwise: left component must target the left factor of the destination product",
        );
      }
      if (!sliceObjectsEqual(base, rightComponent.dst, targetRight)) {
        throw new Error(
          "makeFiniteSliceProduct.componentwise: right component must target the right factor of the destination product",
        );
      }

      const targetProjectionFirst = target.projections[0];
      const targetProjectionSecond = target.projections[1];
      if (!targetProjectionFirst || !targetProjectionSecond) {
        throw new Error(
          "makeFiniteSliceProduct.componentwise: target witness missing binary projections",
        );
      }

      const arrow = makeBinaryProductComponentwise<
        SliceObject<FinSetName, FuncArr>,
        SliceArrow<FinSetName, FuncArr>
      >({
        category: { compose: composeSliceArrows },
        source: {
          object: currentObject,
          projections: [projectionFirst, projectionSecond],
          tuple: (domain, legs) => tuple(domain, legs),
        },
        target: {
          object: target.object,
          projections: [targetProjectionFirst, targetProjectionSecond],
          tuple: (domain, legs) => target.tuple(domain, legs),
        },
        components: [leftComponent, rightComponent],
      });

      return arrow;
    };
  }

  registerSliceProductMetadata(currentObject, { arity, factors, tuple });

  let extended: SliceFiniteProductWitness = witness;
  if (componentwiseAccessor) {
    extended = { ...extended, componentwise: componentwiseAccessor };
  }
  if (swapAccessor) {
    extended = { ...extended, swap: swapAccessor };
  }
  if (diagonalAccessor) {
    extended = { ...extended, diagonal: diagonalAccessor };
  }
  if (leftUnitAccessor) {
    extended = { ...extended, leftUnit: leftUnitAccessor };
  }
  if (rightUnitAccessor) {
    extended = { ...extended, rightUnit: rightUnitAccessor };
  }
  return extended;
}

export function makeSliceProduct(
  base: FinSetCategory,
  anchor: FinSetName,
  left: SliceObject<FinSetName, FuncArr>,
  right: SliceObject<FinSetName, FuncArr>,
  options: { readonly name?: string; readonly disableSwap?: boolean } = {},
): SliceProductWitness {
  if (left.arrowToAnchor.cod !== anchor || right.arrowToAnchor.cod !== anchor) {
    throw new Error("makeSliceProduct: both legs must land in the supplied anchor");
  }

  const leftCarrier = base.carrier(left.domain);
  const rightCarrier = base.carrier(right.domain);

  const support: string[] = [];
  for (const a of leftCarrier) {
    const aImage = left.arrowToAnchor.map(a);
    for (const b of rightCarrier) {
      const bImage = right.arrowToAnchor.map(b);
      if (aImage === bImage) {
        support.push(encodePair(a, b));
      }
    }
  }

  const supportSet = new Set(support);
  const ensureElement = (value: string) => {
    if (!supportSet.has(value)) {
      throw new Error(`makeSliceProduct: ${value} is not a point of the fiber product`);
    }
  };

  const name = options.name ?? `(${left.domain}×_${anchor}${right.domain})`;
  base.registerObject(name, support);

  const arrowToAnchor: FuncArr = {
    name: `${name}→${anchor}`,
    dom: name,
    cod: anchor,
    map: (value) => {
      ensureElement(value);
      const [a] = decodePair(value);
      return left.arrowToAnchor.map(a);
    },
  };

  const product: SliceObject<FinSetName, FuncArr> = {
    domain: name,
    arrowToAnchor,
  };

  const projectionLeft: SliceArrow<FinSetName, FuncArr> = {
    src: product,
    dst: left,
    mediating: {
      name: `π₁_${name}`,
      dom: name,
      cod: left.domain,
      map: (value) => {
        ensureElement(value);
        const [a] = decodePair(value);
        return a;
      },
    },
  };

  const projectionRight: SliceArrow<FinSetName, FuncArr> = {
    src: product,
    dst: right,
    mediating: {
      name: `π₂_${name}`,
      dom: name,
      cod: right.domain,
      map: (value) => {
        ensureElement(value);
        const [, b] = decodePair(value);
        return b;
      },
    },
  };

  const decode = (value: string): readonly [string, string] => {
    ensureElement(value);
    return decodePair(value);
  };

  const pair = (
    leftLeg: SliceArrow<FinSetName, FuncArr>,
    rightLeg: SliceArrow<FinSetName, FuncArr>,
  ): SliceArrow<FinSetName, FuncArr> => {
    if (!sliceObjectsEqual(base, leftLeg.dst, left)) {
      throw new Error("makeSliceProduct.pair: left leg does not target the expected object");
    }
    if (!sliceObjectsEqual(base, rightLeg.dst, right)) {
      throw new Error("makeSliceProduct.pair: right leg does not target the expected object");
    }
    if (!sliceObjectsEqual(base, leftLeg.src, rightLeg.src)) {
      throw new Error("makeSliceProduct.pair: legs must share a common source");
    }

    const domainCarrier = base.carrier(leftLeg.src.domain);
    const domainSet = new Set(domainCarrier);

    const mediating: FuncArr = {
      name: `⟨${leftLeg.mediating.name ?? "?"},${rightLeg.mediating.name ?? "?"}⟩`,
      dom: leftLeg.src.domain,
      cod: name,
      map: (value) => {
        if (!domainSet.has(value)) {
          throw new Error(
            `makeSliceProduct.pair: element ${value} does not belong to ${leftLeg.src.domain}`,
          );
        }
        const leftValue = leftLeg.mediating.map(value);
        const rightValue = rightLeg.mediating.map(value);
        const leftAnchor = left.arrowToAnchor.map(leftValue);
        const rightAnchor = right.arrowToAnchor.map(rightValue);
        if (leftAnchor !== rightAnchor) {
          throw new Error(
            "makeSliceProduct.pair: the supplied legs do not agree over the anchor",
          );
        }
        const encoded = encodePair(leftValue, rightValue);
        ensureElement(encoded);
        return encoded;
      },
    };

    return {
      src: leftLeg.src,
      dst: product,
      mediating,
    };
  };

  const tupleForDiagonal = (
    domain: SliceObject<FinSetName, FuncArr>,
    legs: readonly [SliceArrow<FinSetName, FuncArr>, SliceArrow<FinSetName, FuncArr>],
  ): SliceArrow<FinSetName, FuncArr> => {
    const [leftCandidate, rightCandidate] = legs;
    if (!sliceObjectsEqual(base, leftCandidate.src, domain)) {
      throw new Error("makeSliceProduct.diagonal: left leg does not originate from the supplied domain");
    }
    if (!sliceObjectsEqual(base, rightCandidate.src, domain)) {
      throw new Error("makeSliceProduct.diagonal: right leg does not originate from the supplied domain");
    }
    return pair(leftCandidate, rightCandidate);
  };

  let swapAccessor: (() => SliceProductSwap) | undefined;
  let diagonalAccessor: (() => SliceProductDiagonal) | undefined;
  let leftUnitAccessor: (() => SliceProductUnit) | undefined;
  let rightUnitAccessor: (() => SliceProductUnit) | undefined;
  let componentwiseAccessor:
    | ((
        target: SliceProductWitness,
        components: readonly [
          SliceArrow<FinSetName, FuncArr>,
          SliceArrow<FinSetName, FuncArr>,
        ],
      ) => SliceArrow<FinSetName, FuncArr>)
    | undefined;

  if (!options.disableSwap) {
    const swappedFinite = makeFiniteSliceProduct(base, anchor, [right, left], {
      disableSwap: true,
    });

    const swapData = makeBinaryProductSwap<
      SliceObject<FinSetName, FuncArr>,
      SliceArrow<FinSetName, FuncArr>
    >(
      {
        object: product,
        projections: [projectionLeft, projectionRight],
        tuple: (_domain, legs) => {
          if (legs.length !== 2) {
            throw new Error("makeSliceProduct.swap: expected 2 legs");
          }
          const [leftLegCandidate, rightLegCandidate] = legs as readonly [
            SliceArrow<FinSetName, FuncArr>,
            SliceArrow<FinSetName, FuncArr>,
          ];
          return pair(leftLegCandidate, rightLegCandidate);
        },
      },
      {
        object: swappedFinite.object,
        projections: [
          swappedFinite.projections[0]!,
          swappedFinite.projections[1]!,
        ],
        tuple: (domain, legs) => swappedFinite.tuple(domain, legs),
      },
    );

    swapAccessor = () => ({
      target: swappedFinite,
      forward: swapData.forward,
      backward: swapData.backward,
    });
  }

  if (sliceObjectsEqual(base, left, right)) {
    const identity = makeIdentityProjection(base, left);
    const diagonal = makeBinaryProductDiagonal<
      SliceObject<FinSetName, FuncArr>,
      SliceArrow<FinSetName, FuncArr>
    >(
      {
        object: product,
        projections: [projectionLeft, projectionRight],
        tuple: (domain, legs) => tupleForDiagonal(domain, legs),
      },
      {
        object: left,
        identity,
      },
    );

    diagonalAccessor = () => ({ source: left, arrow: diagonal });
  }

  if (isTerminalSliceObject(base, anchor, left)) {
    const identityRight = makeIdentityProjection(base, right);
    const toTerminal: SliceArrow<FinSetName, FuncArr> = {
      src: right,
      dst: left,
      mediating: right.arrowToAnchor,
    };
    const backward = pair(toTerminal, identityRight);
    leftUnitAccessor = () => ({
      factor: right,
      forward: projectionRight,
      backward,
    });
  }

  if (isTerminalSliceObject(base, anchor, right)) {
    const identityLeft = makeIdentityProjection(base, left);
    const toTerminal: SliceArrow<FinSetName, FuncArr> = {
      src: left,
      dst: right,
      mediating: left.arrowToAnchor,
    };
    const backward = pair(identityLeft, toTerminal);
    rightUnitAccessor = () => ({
      factor: left,
      forward: projectionLeft,
      backward,
    });
  }

  const composeSliceArrows = (
    g: SliceArrow<FinSetName, FuncArr>,
    f: SliceArrow<FinSetName, FuncArr>,
  ): SliceArrow<FinSetName, FuncArr> => {
    if (!sliceObjectsEqual(base, f.dst, g.src)) {
      throw new Error("makeSliceProduct.componentwise: attempted to compose incompatible legs");
    }
    const composed: FuncArr = {
      name: `${g.mediating.name ?? "?"}∘${f.mediating.name ?? "?"}`,
      dom: f.mediating.dom,
      cod: g.mediating.cod,
      map: (value) => g.mediating.map(f.mediating.map(value)),
    };
    return { src: f.src, dst: g.dst, mediating: composed };
  };

  componentwiseAccessor = (
    target: SliceProductWitness,
    components: readonly [SliceArrow<FinSetName, FuncArr>, SliceArrow<FinSetName, FuncArr>],
  ) => {
    if (components.length !== 2) {
      throw new Error(
        `makeSliceProduct.componentwise: expected 2 component legs, received ${components.length}`,
      );
    }
    const [leftComponent, rightComponent] = components;
    const [targetLeft, targetRight] = target.factors;

    if (!targetLeft || !targetRight) {
      throw new Error("makeSliceProduct.componentwise: target factors missing");
    }

    if (!sliceObjectsEqual(base, leftComponent.src, left)) {
      throw new Error(
        "makeSliceProduct.componentwise: left component must originate at the left factor",
      );
    }
    if (!sliceObjectsEqual(base, rightComponent.src, right)) {
      throw new Error(
        "makeSliceProduct.componentwise: right component must originate at the right factor",
      );
    }

    if (!sliceObjectsEqual(base, leftComponent.dst, targetLeft)) {
      throw new Error(
        "makeSliceProduct.componentwise: left component must target the left factor of the destination product",
      );
    }
    if (!sliceObjectsEqual(base, rightComponent.dst, targetRight)) {
      throw new Error(
        "makeSliceProduct.componentwise: right component must target the right factor of the destination product",
      );
    }

    const arrow = makeBinaryProductComponentwise<
      SliceObject<FinSetName, FuncArr>,
      SliceArrow<FinSetName, FuncArr>
    >({
      category: { compose: composeSliceArrows },
      source: {
        object: product,
        projections: [projectionLeft, projectionRight],
        tuple: (_domain, legs) => {
          if (legs.length !== 2) {
            throw new Error("makeSliceProduct.componentwise: expected 2 mediating legs");
          }
          const [candidateLeft, candidateRight] = legs as readonly [
            SliceArrow<FinSetName, FuncArr>,
            SliceArrow<FinSetName, FuncArr>,
          ];
          return pair(candidateLeft, candidateRight);
        },
      },
      target: {
        object: target.object,
        projections: [target.projectionLeft, target.projectionRight],
        tuple: (_domain, legs) => {
          if (legs.length !== 2) {
            throw new Error("makeSliceProduct.componentwise: target tuple expects 2 legs");
          }
          const [candidateLeft, candidateRight] = legs as readonly [
            SliceArrow<FinSetName, FuncArr>,
            SliceArrow<FinSetName, FuncArr>,
          ];
          return target.pair(candidateLeft, candidateRight);
        },
      },
      components: [leftComponent, rightComponent],
    });

    return arrow;
  };

  const witness: SliceProductWitness = {
    object: product,
    projectionLeft,
    projectionRight,
    decode,
    pair,
    factors: [left, right],
  };
  let extended: SliceProductWitness = witness;
  if (componentwiseAccessor) {
    extended = { ...extended, componentwise: componentwiseAccessor };
  }
  if (swapAccessor) {
    extended = { ...extended, swap: swapAccessor };
  }
  if (diagonalAccessor) {
    extended = { ...extended, diagonal: diagonalAccessor };
  }
  if (leftUnitAccessor) {
    extended = { ...extended, leftUnit: leftUnitAccessor };
  }
  if (rightUnitAccessor) {
    extended = { ...extended, rightUnit: rightUnitAccessor };
  }
  return extended;
}
