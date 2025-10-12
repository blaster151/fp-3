import { composeFun } from "../allTS";
import type {
  Tight,
  Tight1Cell,
  Tight2Cell,
  TightCategory,
  TightComposition,
  TightIdentity,
} from "./tight-primitives";
import {
  tightHorizontalCompose2,
  tightIdentity2,
  tightVerticalCompose2,
  tightWhiskerLeft,
  tightWhiskerRight,
} from "./tight-primitives";

export type ObjectEquality<Obj> = (left: Obj, right: Obj) => boolean;

export const defaultObjectEquality = <Obj>(
  left: Obj,
  right: Obj,
): boolean => left === right;

const proarrowsComposable = <Obj, Payload>(
  equality: ObjectEquality<Obj>,
  g: EquipmentProarrow<Obj, Payload>,
  f: EquipmentProarrow<Obj, Payload>,
): boolean => equality(f.to, g.from);

const framesShareBoundaries = <Obj>(
  equality: ObjectEquality<Obj>,
  left: EquipmentFrame<Obj, unknown>,
  right: EquipmentFrame<Obj, unknown>,
): boolean =>
  equality(left.leftBoundary, right.leftBoundary) &&
  equality(left.rightBoundary, right.rightBoundary);

const framesComposableHorizontally = <Obj>(
  equality: ObjectEquality<Obj>,
  left: EquipmentFrame<Obj, unknown>,
  right: EquipmentFrame<Obj, unknown>,
): boolean => equality(left.rightBoundary, right.leftBoundary);

const framesComposableWithProarrow = <Obj, Payload>(
  equality: ObjectEquality<Obj>,
  frame: EquipmentFrame<Obj, Payload>,
  proarrow: EquipmentProarrow<Obj, Payload>,
  position: "left" | "right",
): boolean =>
  position === "left"
    ? equality(proarrow.to, frame.leftBoundary)
    : equality(frame.rightBoundary, proarrow.from);

/** Generic payload describing a proarrow in a virtual equipment. */
export interface EquipmentProarrow<Obj, Payload = unknown> {
  readonly from: Obj;
  readonly to: Obj;
  readonly payload: Payload;
}

export interface EquipmentFrame<Obj, Payload = unknown> {
  readonly arrows: ReadonlyArray<EquipmentProarrow<Obj, Payload>>;
  readonly leftBoundary: Obj;
  readonly rightBoundary: Obj;
}

/** 2-cells relate framed loose composites and carry evidence for the relationship. */
export interface EquipmentVerticalBoundary<Obj, Arr> {
  readonly from: Obj;
  readonly to: Obj;
  readonly tight: Tight1Cell<TightCategory<Obj, Arr>, TightCategory<Obj, Arr>>;
  readonly details?: string;
}

export interface EquipmentCellBoundaries<Obj, Arr> {
  readonly left: EquipmentVerticalBoundary<Obj, Arr>;
  readonly right: EquipmentVerticalBoundary<Obj, Arr>;
}

export interface Equipment2Cell<
  Obj,
  Arr,
  Payload = unknown,
  Evidence = unknown,
> {
  readonly source: EquipmentFrame<Obj, Payload>;
  readonly target: EquipmentFrame<Obj, Payload>;
  readonly boundaries: EquipmentCellBoundaries<Obj, Arr>;
  readonly evidence: Evidence;
}

export type RestrictionDirection = "left" | "right";

export interface EquipmentCartesianBoundary<Obj, Arr> {
  readonly direction: RestrictionDirection;
  readonly vertical: EquipmentVerticalBoundary<Obj, Arr>;
  readonly details: string;
}

export interface RepresentabilityWitness<Obj, Arr> {
  readonly orientation: RestrictionDirection;
  readonly tight: Tight1Cell<
    TightCategory<Obj, Arr>,
    TightCategory<Obj, Arr>
  >;
  readonly object: Obj;
  readonly details: string;
}

export interface EquipmentCartesian2Cell<
  Obj,
  Arr,
  Payload = unknown,
  Evidence = unknown,
> extends Equipment2Cell<Obj, Arr, Payload, Evidence> {
  readonly cartesian: true;
  readonly boundary: EquipmentCartesianBoundary<Obj, Arr>;
}

export interface EquipmentRestrictionResult<Obj, Arr, Payload, Evidence> {
  readonly restricted: EquipmentProarrow<Obj, Payload>;
  readonly cartesian: EquipmentCartesian2Cell<Obj, Arr, Payload, Evidence>;
  readonly representability?: RepresentabilityWitness<Obj, Arr>;
  readonly details: string;
}

/**
 * The tight layer packages the classical 2-categorical data that already
 * exists inside the codebase (`CatFunctor`, `CatNatTrans`, …).  The extra
 * helpers expose the natural-transformation calculus so equipment-level
 * constructions can reuse the same implementations.
 */
export interface EquipmentTightLayer<Obj, Arr> {
  readonly category: TightCategory<Obj, Arr>;
  readonly identity: TightIdentity<TightCategory<Obj, Arr>>;
  readonly compose: <
    F extends Tight1Cell<unknown, unknown>,
    G extends Tight1Cell<unknown, unknown>,
  >(
    g: G,
    f: F,
  ) => TightComposition<F, G>;
  readonly identity2: <F extends Tight1Cell<unknown, unknown>>(f: F) => Tight2Cell<F, F>;
  readonly verticalCompose2: <
    F extends Tight1Cell<unknown, unknown>,
    G extends Tight1Cell<unknown, unknown>,
    H extends Tight1Cell<unknown, unknown>,
  >(
    alpha: Tight2Cell<F, G>,
    beta: Tight2Cell<G, H>,
  ) => Tight2Cell<F, H>;
  readonly horizontalCompose2: <
    F1 extends Tight1Cell<unknown, unknown>,
    F2 extends Tight1Cell<unknown, unknown>,
    G1 extends Tight1Cell<unknown, unknown>,
    G2 extends Tight1Cell<unknown, unknown>,
  >(
    alpha: Tight2Cell<F1, F2>,
    beta: Tight2Cell<G1, G2>,
  ) => Tight2Cell<TightComposition<F1, G1>, TightComposition<F2, G2>>;
  readonly whiskerLeft: <
    F extends Tight1Cell<unknown, unknown>,
    G extends Tight1Cell<unknown, unknown>,
    H extends Tight1Cell<unknown, unknown>,
  >(
    functor: F,
    cell: Tight2Cell<G, H>,
  ) => Tight2Cell<TightComposition<F, G>, TightComposition<F, H>>;
  readonly whiskerRight: <
    F extends Tight1Cell<unknown, unknown>,
    G extends Tight1Cell<unknown, unknown>,
    H extends Tight1Cell<unknown, unknown>,
  >(
    cell: Tight2Cell<G, H>,
    functor: F,
  ) => Tight2Cell<TightComposition<G, F>, TightComposition<H, F>>;
}

/**
 * Virtual equipments collect tight data, proarrows, and 2-cell calculus.  The
 * combinators return partial results (`undefined`) when endpoints do not align,
 * mirroring how limits/colimits helpers behave elsewhere in the repository.
 */
export interface VirtualEquipment<Obj, Arr, Payload, Evidence> {
  readonly objects: ReadonlyArray<Obj>;
  readonly equalsObjects?: ObjectEquality<Obj>;
  readonly tight: EquipmentTightLayer<Obj, Arr>;
  readonly proarrows: {
    readonly identity: (object: Obj) => EquipmentProarrow<Obj, Payload>;
    readonly horizontalCompose: (
      g: EquipmentProarrow<Obj, Payload>,
      f: EquipmentProarrow<Obj, Payload>,
    ) => EquipmentProarrow<Obj, Payload> | undefined;
    readonly horizontalComposeMany: (
      chain: ReadonlyArray<EquipmentProarrow<Obj, Payload>>,
    ) => EquipmentProarrow<Obj, Payload> | undefined;
  };
  readonly restrictions: {
    readonly left: (
      tight: Tight1Cell<TightCategory<Obj, Arr>, TightCategory<Obj, Arr>>,
      proarrow: EquipmentProarrow<Obj, Payload>,
    ) => EquipmentRestrictionResult<Obj, Arr, Payload, Evidence> | undefined;
    readonly right: (
      proarrow: EquipmentProarrow<Obj, Payload>,
      tight: Tight1Cell<TightCategory<Obj, Arr>, TightCategory<Obj, Arr>>,
    ) => EquipmentRestrictionResult<Obj, Arr, Payload, Evidence> | undefined;
  };
  readonly cells: {
    readonly identity: (
      frame: EquipmentFrame<Obj, Payload>,
      boundaries: EquipmentCellBoundaries<Obj, Arr>,
    ) => Evidence;
    readonly verticalCompose: (
      beta: Equipment2Cell<Obj, Arr, Payload, Evidence>,
      alpha: Equipment2Cell<Obj, Arr, Payload, Evidence>,
    ) => Evidence | undefined;
    readonly horizontalCompose: (
      beta: Equipment2Cell<Obj, Arr, Payload, Evidence>,
      alpha: Equipment2Cell<Obj, Arr, Payload, Evidence>,
    ) => Evidence | undefined;
    readonly whiskerLeft: (
      frame: EquipmentFrame<Obj, Payload>,
      cell: Equipment2Cell<Obj, Arr, Payload, Evidence>,
    ) => Evidence | undefined;
    readonly whiskerRight: (
      cell: Equipment2Cell<Obj, Arr, Payload, Evidence>,
      frame: EquipmentFrame<Obj, Payload>,
    ) => Evidence | undefined;
  };
}

const makeCell = <Obj, Arr, Payload, Evidence>(
  source: EquipmentFrame<Obj, Payload>,
  target: EquipmentFrame<Obj, Payload>,
  boundaries: EquipmentCellBoundaries<Obj, Arr>,
  evidence: Evidence,
): Equipment2Cell<Obj, Arr, Payload, Evidence> => ({
  source,
  target,
  boundaries,
  evidence,
});

const makeCartesianCell = <Obj, Arr, Payload, Evidence>(
  source: EquipmentFrame<Obj, Payload>,
  target: EquipmentFrame<Obj, Payload>,
  boundaries: EquipmentCellBoundaries<Obj, Arr>,
  evidence: Evidence,
  boundary: EquipmentCartesianBoundary<Obj, Arr>,
): EquipmentCartesian2Cell<Obj, Arr, Payload, Evidence> => ({
  source,
  target,
  boundaries,
  evidence,
  cartesian: true,
  boundary,
});

export const identityProarrow = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  object: Obj,
): EquipmentProarrow<Obj, Payload> => {
  const identity = equipment.proarrows.identity(object);
  return { ...identity, from: object, to: object };
};

const makeVerticalBoundary = <Obj, Arr>(
  from: Obj,
  to: Obj,
  tight: Tight1Cell<TightCategory<Obj, Arr>, TightCategory<Obj, Arr>>,
  details?: string,
): EquipmentVerticalBoundary<Obj, Arr> => (details !== undefined ? { from, to, tight, details } : { from, to, tight });

const makeBoundaries = <Obj, Arr>(
  left: EquipmentVerticalBoundary<Obj, Arr>,
  right: EquipmentVerticalBoundary<Obj, Arr>,
): EquipmentCellBoundaries<Obj, Arr> => ({ left, right });

export const identityVerticalBoundary = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  object: Obj,
  details?: string,
): EquipmentVerticalBoundary<Obj, Arr> =>
  makeVerticalBoundary(
    object,
    object,
    equipment.tight.identity,
    details ?? "Identity vertical boundary supplied by the tight layer.",
  );

const boundariesVerticallyComposable = <Obj, Arr>(
  equality: ObjectEquality<Obj>,
  upper: EquipmentVerticalBoundary<Obj, Arr>,
  lower: EquipmentVerticalBoundary<Obj, Arr>,
): boolean => equality(lower.to, upper.from);

const composeVerticalBoundaries = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  upper: EquipmentVerticalBoundary<Obj, Arr>,
  lower: EquipmentVerticalBoundary<Obj, Arr>,
): EquipmentVerticalBoundary<Obj, Arr> =>
  makeVerticalBoundary(
    lower.from,
    upper.to,
    equipment.tight.compose(upper.tight, lower.tight),
    "Vertical composite boundary induced by stacked 2-cells.",
  );

export const verticalBoundariesEqual = <Obj, Arr>(
  equality: ObjectEquality<Obj>,
  left: EquipmentVerticalBoundary<Obj, Arr>,
  right: EquipmentVerticalBoundary<Obj, Arr>,
): boolean =>
  equality(left.from, right.from) &&
  equality(left.to, right.to) &&
  left.tight === right.tight;

export const isIdentityVerticalBoundary = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  object: Obj,
  boundary: EquipmentVerticalBoundary<Obj, Arr>,
): boolean => {
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  return (
    equality(boundary.from, object) &&
    equality(boundary.to, object) &&
    boundary.tight === equipment.tight.identity
  );
};

export const juxtaposeIdentityProarrows = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  objects: ReadonlyArray<Obj>,
): ReadonlyArray<EquipmentProarrow<Obj, Payload>> =>
  objects.map((object) => identityProarrow(equipment, object));

export const frameFromProarrow = <Obj, Payload>(
  proarrow: EquipmentProarrow<Obj, Payload>,
): EquipmentFrame<Obj, Payload> => ({
  arrows: [proarrow],
  leftBoundary: proarrow.from,
  rightBoundary: proarrow.to,
});

export const frameFromSequence = <Obj, Payload>(
  arrows: ReadonlyArray<EquipmentProarrow<Obj, Payload>>,
  fallbackLeft: Obj,
  fallbackRight: Obj,
): EquipmentFrame<Obj, Payload> =>
  arrows.length === 0
    ? { arrows, leftBoundary: fallbackLeft, rightBoundary: fallbackRight }
    : (() => {
        const firstArrow = arrows[0];
        const lastArrow = arrows[arrows.length - 1];
        if (!firstArrow || !lastArrow) {
          return { arrows, leftBoundary: fallbackLeft, rightBoundary: fallbackRight };
        }
        return {
          arrows,
          leftBoundary: firstArrow.from,
          rightBoundary: lastArrow.to,
        };
      })();

const composeFramePayloads = <Obj, Arr>(
  tight: EquipmentTightLayer<Obj, Arr>,
  arrows: ReadonlyArray<
    EquipmentProarrow<
      Obj,
      Tight<TightCategory<Obj, Arr>, TightCategory<Obj, Arr>>
    >
  >,
): Tight<TightCategory<Obj, Arr>, TightCategory<Obj, Arr>> => {
  if (arrows.length === 0) {
    return tight.identity;
  }
  const firstArrow = arrows[0];
  if (!firstArrow) {
    return tight.identity;
  }
  let accumulator = firstArrow.payload;
  for (let index = 1; index < arrows.length; index += 1) {
    const arrow = arrows[index];
    if (!arrow) continue;
    accumulator = tight.compose(arrow.payload, accumulator);
  }
  return accumulator;
};

export const horizontalComposeProarrows = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  g: EquipmentProarrow<Obj, Payload>,
  f: EquipmentProarrow<Obj, Payload>,
): EquipmentProarrow<Obj, Payload> | undefined => {
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  if (!proarrowsComposable(equality, g, f)) {
    return undefined;
  }
  const composed = equipment.proarrows.horizontalCompose(g, f);
  if (!composed) {
    return undefined;
  }
  return { ...composed, from: f.from, to: g.to };
};

export const horizontalComposeManyProarrows = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  chain: ReadonlyArray<EquipmentProarrow<Obj, Payload>>,
): EquipmentProarrow<Obj, Payload> | undefined => {
  if (chain.length === 0) {
    return undefined;
  }
  if (chain.length === 1) {
    const [single] = chain;
    return single ? { from: single.from, to: single.to, payload: single.payload } : undefined;
  }
  const composed = equipment.proarrows.horizontalComposeMany(chain);
  if (composed) {
    return composed;
  }
  let accumulator: EquipmentProarrow<Obj, Payload> | undefined = chain[0];
  for (let index = 1; index < chain.length; index += 1) {
    if (!accumulator) {
      return undefined;
    }
    const nextArrow = chain[index];
    if (!nextArrow) {
      return undefined;
    }
    accumulator = horizontalComposeProarrows(
      equipment,
      nextArrow,
      accumulator,
    );
  }
  return accumulator ? { ...accumulator } : undefined;
};

export const identityCell = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  proarrow: EquipmentProarrow<Obj, Payload>,
): Equipment2Cell<Obj, Arr, Payload, Evidence> => {
  const frame = frameFromProarrow(proarrow);
  const boundaries = makeBoundaries(
    identityVerticalBoundary(
      equipment,
      proarrow.from,
      "Identity left boundary induced by the proarrow domain.",
    ),
    identityVerticalBoundary(
      equipment,
      proarrow.to,
      "Identity right boundary induced by the proarrow codomain.",
    ),
  );
  return makeCell(
    frame,
    frame,
    boundaries,
    equipment.cells.identity(frame, boundaries),
  );
};

export const verticalComposeCells = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  beta: Equipment2Cell<Obj, Arr, Payload, Evidence>,
  alpha: Equipment2Cell<Obj, Arr, Payload, Evidence>,
): Equipment2Cell<Obj, Arr, Payload, Evidence> | undefined => {
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  if (!framesShareBoundaries(equality, alpha.target, beta.source)) {
    return undefined;
  }
  if (
    !boundariesVerticallyComposable(
      equality,
      beta.boundaries.left,
      alpha.boundaries.left,
    ) ||
    !boundariesVerticallyComposable(
      equality,
      beta.boundaries.right,
      alpha.boundaries.right,
    )
  ) {
    return undefined;
  }
  const evidence = equipment.cells.verticalCompose(beta, alpha);
  if (!evidence) {
    return undefined;
  }
  const boundaries = makeBoundaries(
    composeVerticalBoundaries(
      equipment,
      beta.boundaries.left,
      alpha.boundaries.left,
    ),
    composeVerticalBoundaries(
      equipment,
      beta.boundaries.right,
      alpha.boundaries.right,
    ),
  );
  return makeCell(alpha.source, beta.target, boundaries, evidence);
};

export const horizontalComposeCells = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  beta: Equipment2Cell<Obj, Arr, Payload, Evidence>,
  alpha: Equipment2Cell<Obj, Arr, Payload, Evidence>,
): Equipment2Cell<Obj, Arr, Payload, Evidence> | undefined => {
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  if (
    !framesComposableHorizontally(equality, alpha.source, beta.source) ||
    !framesComposableHorizontally(equality, alpha.target, beta.target)
  ) {
    return undefined;
  }
  if (
    !verticalBoundariesEqual(
      equality,
      alpha.boundaries.right,
      beta.boundaries.left,
    )
  ) {
    return undefined;
  }
  const sourceComposite = horizontalComposeManyProarrows(
    equipment,
    [...alpha.source.arrows, ...beta.source.arrows],
  );
  const targetComposite = horizontalComposeManyProarrows(
    equipment,
    [...alpha.target.arrows, ...beta.target.arrows],
  );
  if (!sourceComposite || !targetComposite) {
    return undefined;
  }
  const evidence = equipment.cells.horizontalCompose(beta, alpha);
  if (!evidence) {
    return undefined;
  }
  const boundaries = makeBoundaries(
    alpha.boundaries.left,
    beta.boundaries.right,
  );
  return makeCell(
    frameFromSequence(
      [...alpha.source.arrows, ...beta.source.arrows],
      alpha.source.leftBoundary,
      beta.source.rightBoundary,
    ),
    frameFromSequence(
      [...alpha.target.arrows, ...beta.target.arrows],
      alpha.target.leftBoundary,
      beta.target.rightBoundary,
    ),
    boundaries,
    evidence,
  );
};

export const whiskerLeftCell = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  proarrow: EquipmentProarrow<Obj, Payload>,
  cell: Equipment2Cell<Obj, Arr, Payload, Evidence>,
): Equipment2Cell<Obj, Arr, Payload, Evidence> | undefined => {
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  if (
    !framesComposableWithProarrow(equality, cell.source, proarrow, "left") ||
    !framesComposableWithProarrow(equality, cell.target, proarrow, "left")
  ) {
    return undefined;
  }
  const sourceComposite = horizontalComposeManyProarrows(
    equipment,
    [proarrow, ...cell.source.arrows],
  );
  const targetComposite = horizontalComposeManyProarrows(
    equipment,
    [proarrow, ...cell.target.arrows],
  );
  if (!sourceComposite || !targetComposite) {
    return undefined;
  }
  const frame = frameFromProarrow(proarrow);
  const evidence = equipment.cells.whiskerLeft(frame, cell);
  if (!evidence) {
    return undefined;
  }
  return makeCell(
    frameFromSequence(
      [proarrow, ...cell.source.arrows],
      proarrow.from,
      cell.source.rightBoundary,
    ),
    frameFromSequence(
      [proarrow, ...cell.target.arrows],
      proarrow.from,
      cell.target.rightBoundary,
    ),
    cell.boundaries,
    evidence,
  );
};

export const whiskerRightCell = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  cell: Equipment2Cell<Obj, Arr, Payload, Evidence>,
  proarrow: EquipmentProarrow<Obj, Payload>,
): Equipment2Cell<Obj, Arr, Payload, Evidence> | undefined => {
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  if (
    !framesComposableWithProarrow(equality, cell.source, proarrow, "right") ||
    !framesComposableWithProarrow(equality, cell.target, proarrow, "right")
  ) {
    return undefined;
  }
  const sourceComposite = horizontalComposeManyProarrows(
    equipment,
    [...cell.source.arrows, proarrow],
  );
  const targetComposite = horizontalComposeManyProarrows(
    equipment,
    [...cell.target.arrows, proarrow],
  );
  if (!sourceComposite || !targetComposite) {
    return undefined;
  }
  const frame = frameFromProarrow(proarrow);
  const evidence = equipment.cells.whiskerRight(cell, frame);
  if (!evidence) {
    return undefined;
  }
  return makeCell(
    frameFromSequence(
      [...cell.source.arrows, proarrow],
      cell.source.leftBoundary,
      proarrow.to,
    ),
    frameFromSequence(
      [...cell.target.arrows, proarrow],
      cell.target.leftBoundary,
      proarrow.to,
    ),
    cell.boundaries,
    evidence,
  );
};

/**
 * Virtualise an ordinary tight category as a degenerate equipment where
 * proarrows are functors and 2-cells are natural transformations.  The helper
 * enforces endpoint checks and forwards all diagrammatic structure to the tight
 * layer.
 */
export const virtualiseTightCategory = <Obj, Arr>(
  tight: EquipmentTightLayer<Obj, Arr>,
  objects: ReadonlyArray<Obj> = [],
  equalsObjects: ObjectEquality<Obj> = defaultObjectEquality,
): VirtualEquipment<
  Obj,
  Arr,
  Tight<TightCategory<Obj, Arr>, TightCategory<Obj, Arr>>,
  TightCellEvidence<Obj, Arr>
> => ({
  objects,
  equalsObjects,
  tight,
  proarrows: {
    identity: (object) => ({
      from: object,
      to: object,
      payload: tight.identity,
    }),
    horizontalCompose: (g, f) =>
      equalsObjects(f.to, g.from)
        ? {
            from: f.from,
            to: g.to,
            payload: tight.compose(g.payload, f.payload),
          }
        : undefined,
    horizontalComposeMany: (chain) => {
      if (chain.length === 0) {
        return undefined;
      }
      if (chain.length === 1) {
        const [single] = chain;
        return single ? { from: single.from, to: single.to, payload: single.payload } : undefined;
      }
      let accumulator = chain[0];
      if (!accumulator) {
        return undefined;
      }
      for (let index = 1; index < chain.length; index += 1) {
        const next = chain[index];
        if (!next || !accumulator) {
          return undefined;
        }
        if (!equalsObjects(accumulator.to, next.from)) {
          return undefined;
        }
        accumulator = {
          from: accumulator.from,
          to: next.to,
          payload: tight.compose(next.payload, accumulator.payload),
        };
      }
      return accumulator;
    },
  },
  restrictions: {
    left: (tightCell, proarrow) => {
      const equality = equalsObjects ?? defaultObjectEquality<Obj>;
      const payloadRespectsBoundary = equality(
        proarrow.payload.onObj(proarrow.from),
        proarrow.to,
      );
      if (!payloadRespectsBoundary) {
        return undefined;
      }

      const preimage = objects.find((object) =>
        equality(tightCell.onObj(object), proarrow.from),
      );
      if (preimage === undefined) {
        return undefined;
      }

      const restrictedPayload = tight.compose(proarrow.payload, tightCell);
      const restrictedTo = restrictedPayload.onObj(preimage);
      if (!equality(restrictedTo, proarrow.to)) {
        return undefined;
      }

      const restricted: EquipmentProarrow<Obj, Tight<
        TightCategory<Obj, Arr>,
        TightCategory<Obj, Arr>
      >> = {
        from: preimage,
        to: restrictedTo,
        payload: restrictedPayload,
      };

      const leftBoundary = makeVerticalBoundary(
        preimage,
        proarrow.from,
        tightCell,
        "Left restriction boundary induced by the supplied tight 1-cell.",
      );
      const rightBoundary = makeVerticalBoundary(
        restrictedTo,
        proarrow.to,
        tight.identity,
        "Right boundary remains the identity because the codomain is unchanged.",
      );

      const boundaries = makeBoundaries(leftBoundary, rightBoundary);

      const evidence: TightCellEvidence<Obj, Arr> = {
        kind: "cartesian",
        direction: "left",
        tight: tightCell,
        details:
          "Cartesian witness for the left restriction B(f,1) obtained by precomposing the loose arrow with the tight 1-cell.",
        boundary: leftBoundary,
        cell: tight.identity2(restrictedPayload),
      };

      const representability: RepresentabilityWitness<Obj, Arr> | undefined =
        proarrow.payload === tight.identity
          ? {
              orientation: "left",
              tight: tightCell,
              object: proarrow.from,
              details:
                "Restriction of the identity loose arrow exhibits the representable companion B(-,f).",
            }
          : undefined;

      return {
        restricted,
        cartesian: makeCartesianCell(
          frameFromProarrow(restricted),
          frameFromProarrow(proarrow),
          boundaries,
          evidence,
          {
            direction: "left",
            vertical: leftBoundary,
            details:
              "Left restriction reuses the supplied tight 1-cell as the cartesian boundary witness.",
          },
        ),
        ...(representability !== undefined && { representability }),
        details:
          "Successfully computed the left restriction by precomposing the proarrow payload with the supplied tight 1-cell.",
      };
    },
    right: (proarrow, tightCell) => {
      const equality = equalsObjects ?? defaultObjectEquality<Obj>;
      const payloadRespectsBoundary = equality(
        proarrow.payload.onObj(proarrow.from),
        proarrow.to,
      );
      if (!payloadRespectsBoundary) {
        return undefined;
      }

      const restrictedPayload = tight.compose(tightCell, proarrow.payload);
      const restrictedTo = restrictedPayload.onObj(proarrow.from);

      const leftBoundary = makeVerticalBoundary(
        proarrow.from,
        proarrow.from,
        tight.identity,
        "Left boundary remains the identity because the domain is unchanged.",
      );
      const rightBoundary = makeVerticalBoundary(
        proarrow.to,
        restrictedTo,
        tightCell,
        "Right restriction boundary induced by the supplied tight 1-cell.",
      );

      const boundaries = makeBoundaries(leftBoundary, rightBoundary);

      const restricted: EquipmentProarrow<Obj, Tight<
        TightCategory<Obj, Arr>,
        TightCategory<Obj, Arr>
      >> = {
        from: proarrow.from,
        to: restrictedTo,
        payload: restrictedPayload,
      };

      const evidence: TightCellEvidence<Obj, Arr> = {
        kind: "cartesian",
        direction: "right",
        tight: tightCell,
        details:
          "Cartesian witness for the right restriction B(1,g) obtained by postcomposing the loose arrow with the tight 1-cell.",
        boundary: rightBoundary,
        cell: tight.identity2(restrictedPayload),
      };

      const representability: RepresentabilityWitness<Obj, Arr> | undefined =
        proarrow.payload === tight.identity
          ? {
              orientation: "right",
              tight: tightCell,
              object: proarrow.to,
              details:
                "Restriction of the identity loose arrow exhibits the representable conjoint B(f,-).",
            }
          : undefined;

      return {
        restricted,
        cartesian: makeCartesianCell(
          frameFromProarrow(restricted),
          frameFromProarrow(proarrow),
          boundaries,
          evidence,
          {
            direction: "right",
            vertical: rightBoundary,
            details:
              "Right restriction reuses the supplied tight 1-cell as the cartesian boundary witness.",
          },
        ),
        ...(representability !== undefined && { representability }),
        details:
          "Successfully computed the right restriction by postcomposing the proarrow payload with the supplied tight 1-cell.",
      };
    },
  },
  cells: {
    identity: (frame, _boundaries) => ({
      kind: "tight",
      cell: tight.identity2(composeFramePayloads(tight, frame.arrows)),
    }),
    verticalCompose: (beta, alpha) =>
      beta.evidence.kind === "tight" &&
      alpha.evidence.kind === "tight" &&
      equalsObjects(alpha.target.leftBoundary, beta.source.leftBoundary) &&
      equalsObjects(alpha.target.rightBoundary, beta.source.rightBoundary) &&
      equalsObjects(alpha.boundaries.left.to, beta.boundaries.left.from) &&
      equalsObjects(alpha.boundaries.right.to, beta.boundaries.right.from)
        ? {
            kind: "tight" as const,
            cell: tight.verticalCompose2(alpha.evidence.cell, beta.evidence.cell),
          }
        : undefined,
    horizontalCompose: (beta, alpha) =>
      beta.evidence.kind === "tight" &&
      alpha.evidence.kind === "tight" &&
      equalsObjects(alpha.source.rightBoundary, beta.source.leftBoundary) &&
      equalsObjects(alpha.target.rightBoundary, beta.target.leftBoundary) &&
      equalsObjects(alpha.boundaries.right.from, beta.boundaries.left.from) &&
      equalsObjects(alpha.boundaries.right.to, beta.boundaries.left.to)
        ? {
            kind: "tight" as const,
            cell: tight.horizontalCompose2(alpha.evidence.cell, beta.evidence.cell),
          }
        : undefined,
    whiskerLeft: (frame, cell) =>
      cell.evidence.kind === "tight" &&
      equalsObjects(frame.rightBoundary, cell.source.leftBoundary) &&
      equalsObjects(frame.rightBoundary, cell.target.leftBoundary)
        ? {
            kind: "tight" as const,
            cell: tight.whiskerLeft(
              composeFramePayloads(tight, frame.arrows),
              cell.evidence.cell,
            ),
          }
        : undefined,
    whiskerRight: (cell, frame) =>
      cell.evidence.kind === "tight" &&
      equalsObjects(cell.source.rightBoundary, frame.leftBoundary) &&
      equalsObjects(cell.target.rightBoundary, frame.leftBoundary)
        ? {
            kind: "tight" as const,
            cell: tight.whiskerRight(
              cell.evidence.cell,
              composeFramePayloads(tight, frame.arrows),
            ),
          }
        : undefined,
  },
});

/**
 * Default tight layer that simply re-exports the canonical `CatFunctor`
 * operations.  Most callers can start from this value and customise if they
 * need instrumentation.
 */
export const defaultTightLayer = <Obj, Arr>(
  category: TightCategory<Obj, Arr>,
  identity: TightIdentity<TightCategory<Obj, Arr>>,
  compose: <
    F extends Tight1Cell<unknown, unknown>,
    G extends Tight1Cell<unknown, unknown>,
  >(
    g: G,
    f: F,
  ) => TightComposition<F, G>,
): EquipmentTightLayer<Obj, Arr> => ({
  category,
  identity,
  compose,
  identity2: tightIdentity2,
  verticalCompose2: tightVerticalCompose2,
  horizontalCompose2: tightHorizontalCompose2,
  whiskerLeft: tightWhiskerLeft,
  whiskerRight: tightWhiskerRight,
});

export interface VirtualizeCategoryOptions<Obj> {
  readonly objects?: ReadonlyArray<Obj>;
  readonly equalsObjects?: ObjectEquality<Obj>;
}

export const virtualizeCategory = <Obj, Arr>(
  category: TightCategory<Obj, Arr>,
  options: VirtualizeCategoryOptions<Obj> = {},
): VirtualEquipment<
  Obj,
  Arr,
  Tight<TightCategory<Obj, Arr>, TightCategory<Obj, Arr>>,
  TightCellEvidence<Obj, Arr>
> => {
  const identity: TightIdentity<TightCategory<Obj, Arr>> = {
    source: category,
    target: category,
    onObj: (object) => object,
    onMor: (arrow) => arrow,
  };

  const tight = defaultTightLayer(
    category,
    identity,
    <
      F extends Tight1Cell<unknown, unknown>,
      G extends Tight1Cell<unknown, unknown>
    >(
      g: G,
      f: F,
    ) => composeFun(g, f),
  );

  const equalsObjects = options.equalsObjects ?? defaultObjectEquality<Obj>;
  const objects = options.objects ?? [];

  return virtualiseTightCategory(tight, objects, equalsObjects);
};

export type TightCellEvidence<Obj, Arr> =
  | {
      readonly kind: "tight";
      readonly cell: Tight2Cell<
        Tight<TightCategory<Obj, Arr>, TightCategory<Obj, Arr>>,
        Tight<TightCategory<Obj, Arr>, TightCategory<Obj, Arr>>
      >;
    }
  | {
      readonly kind: "cartesian";
      readonly direction: RestrictionDirection;
      readonly tight: Tight1Cell<
        TightCategory<Obj, Arr>,
        TightCategory<Obj, Arr>
      >;
      readonly details: string;
      readonly boundary: EquipmentVerticalBoundary<Obj, Arr>;
      readonly cell?: Tight2Cell<
        Tight<TightCategory<Obj, Arr>, TightCategory<Obj, Arr>>,
        Tight<TightCategory<Obj, Arr>, TightCategory<Obj, Arr>>
      >;
    };
