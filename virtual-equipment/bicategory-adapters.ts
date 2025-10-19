import type { ObjectEquality } from "./virtual-equipment";
import {
  frameFromSequence,
  horizontalComposeManyProarrows,
  horizontalComposeProarrows,
  identityVerticalBoundary,
  frameFromProarrow,
} from "./virtual-equipment";
import type {
  Equipment2Cell,
  EquipmentCellBoundaries,
  EquipmentFrame,
  EquipmentProarrow,
  VirtualEquipment,
  EquipmentWeakComposition,
} from "./virtual-equipment";
import { defaultTightLayer } from "./virtual-equipment";
import type { TightCategory, TightIdentity } from "./tight-primitives";
import { composeFun } from "../allTS";
import type { Bicategory } from "./bicategory";
import { bicategoryFromEquipment } from "./bicategory";

export type FiniteSet = ReadonlyArray<string>;

const compareFiniteSets: ObjectEquality<FiniteSet> = (left, right) => {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((value, index) => value === right[index]);
};

interface SpanPayload {
  readonly spanId: string;
  readonly apexIds: ReadonlyArray<string>;
  readonly leftLeg: ReadonlyArray<number>;
  readonly rightLeg: ReadonlyArray<number>;
  readonly leaves: ReadonlyArray<ReadonlyArray<string>>;
  readonly factors?: ReadonlyArray<{ readonly left: number; readonly right: number }>;
}

interface Span2CellEvidence {
  readonly kind: "spanIso";
  readonly mapping: ReadonlyArray<number>;
  readonly details: string;
}

type SpanProarrow = EquipmentProarrow<FiniteSet, SpanPayload>;

type SpanCell = Equipment2Cell<FiniteSet, FiniteSet, SpanPayload, Span2CellEvidence>;

const IDENTITY_PREFIX = "id:";

const makeIdentityToken = (objectIndex: number, elementIndex: number): string =>
  `${IDENTITY_PREFIX}${objectIndex}:${elementIndex}`;

const normalizeLeaves = (sequence: ReadonlyArray<string>): ReadonlyArray<string> =>
  sequence.filter((token) => !token.startsWith(IDENTITY_PREFIX));

const buildMapping = (
  source: ReadonlyArray<ReadonlyArray<string>>,
  target: ReadonlyArray<ReadonlyArray<string>>,
  options?: { readonly ignoreIdentity?: boolean },
): ReadonlyArray<number> | undefined => {
  const buckets = new Map<string, Array<number>>();
  const normalize = options?.ignoreIdentity === true ? normalizeLeaves : (value: ReadonlyArray<string>) => value;
  target.forEach((sequence, index) => {
    const key = normalize(sequence).join("|");
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.push(index);
    } else {
      buckets.set(key, [index]);
    }
  });
  const mapping: number[] = [];
  for (const [index, sequence] of source.entries()) {
    const key = normalize(sequence).join("|");
    const bucket = buckets.get(key);
    if (!bucket || bucket.length === 0) {
      return undefined;
    }
    const candidate = bucket.shift();
    if (candidate === undefined) {
      return undefined;
    }
    mapping[index] = candidate;
  }
  return mapping;
};

const nextSpanId = (() => {
  let counter = 0;
  return () => `span#${counter++}`;
})();

const createSpanPayload = (
  spanId: string,
  leftLeg: ReadonlyArray<number>,
  rightLeg: ReadonlyArray<number>,
  leaves: ReadonlyArray<ReadonlyArray<string>>,
  factors?: ReadonlyArray<{ readonly left: number; readonly right: number }>,
): SpanPayload => {
  const apexIds = leftLeg.map((_, index) => `${spanId}@${index}`);
  return { spanId, apexIds, leftLeg, rightLeg, leaves, ...(factors ? { factors } : {}) };
};

const createIdentitySpan = (object: FiniteSet, objectIndex: number): SpanPayload => {
  const size = object.length;
  const leftLeg = Array.from({ length: size }, (_, index) => index);
  const rightLeg = Array.from({ length: size }, (_, index) => index);
  const leaves = leftLeg.map((_, index) => [makeIdentityToken(objectIndex, index)]);
  return createSpanPayload(nextSpanId(), leftLeg, rightLeg, leaves);
};

const composeSpanPayload = (
  left: SpanProarrow,
  right: SpanProarrow,
): SpanPayload | undefined => {
  const factors: Array<{ readonly left: number; readonly right: number }> = [];
  const leftLeg: number[] = [];
  const rightLeg: number[] = [];
  const leaves: Array<ReadonlyArray<string>> = [];
  const leftPayload = left.payload;
  const rightPayload = right.payload;
  if (leftPayload.rightLeg.length === 0 || rightPayload.leftLeg.length === 0) {
    return createSpanPayload(nextSpanId(), [], [], [], []);
  }
  for (const [leftIndex, leftCod] of leftPayload.rightLeg.entries()) {
    for (const [rightIndex, rightDom] of rightPayload.leftLeg.entries()) {
      if (leftCod !== rightDom) {
        continue;
      }
      const combinedLeaves = [
        ...leftPayload.leaves[leftIndex]!,
        ...rightPayload.leaves[rightIndex]!,
      ];
      leaves.push(combinedLeaves);
      leftLeg.push(leftPayload.leftLeg[leftIndex]!);
      rightLeg.push(rightPayload.rightLeg[rightIndex]!);
      factors.push({ left: leftIndex, right: rightIndex });
    }
  }
  return createSpanPayload(nextSpanId(), leftLeg, rightLeg, leaves, factors);
};

const makeBoundaries = (
  equipment: VirtualEquipment<FiniteSet, FiniteSet, SpanPayload, Span2CellEvidence>,
  source: SpanProarrow,
  target: SpanProarrow,
): EquipmentCellBoundaries<FiniteSet, FiniteSet> => ({
  left: identityVerticalBoundary(
    equipment,
    source.from,
    "Span 2-cell left boundary is an identity function on the domain.",
  ),
  right: identityVerticalBoundary(
    equipment,
    target.to,
    "Span 2-cell right boundary is an identity function on the codomain.",
  ),
});

const makeSpanCell = (
  equipment: VirtualEquipment<FiniteSet, FiniteSet, SpanPayload, Span2CellEvidence>,
  sourceArrows: ReadonlyArray<SpanProarrow>,
  targetArrows: ReadonlyArray<SpanProarrow>,
  mapping: ReadonlyArray<number>,
  details: string,
): SpanCell => {
  const sourceFrame: EquipmentFrame<FiniteSet, SpanPayload> =
    sourceArrows.length === 1
      ? frameFromProarrow(sourceArrows[0]!)
      : frameFromSequence(
          sourceArrows,
          sourceArrows[0]!.from,
          sourceArrows[sourceArrows.length - 1]!.to,
        );
  const targetFrame: EquipmentFrame<FiniteSet, SpanPayload> =
    targetArrows.length === 1
      ? frameFromProarrow(targetArrows[0]!)
      : frameFromSequence(
          targetArrows,
          targetArrows[0]!.from,
          targetArrows[targetArrows.length - 1]!.to,
        );
  const sourceComposite = horizontalComposeManyProarrows(
    equipment,
    sourceArrows,
  );
  const targetComposite = horizontalComposeManyProarrows(
    equipment,
    targetArrows,
  );
  const sourceProarrow = sourceComposite ?? sourceArrows[sourceArrows.length - 1]!;
  const targetProarrow = targetComposite ?? targetArrows[targetArrows.length - 1]!;
  const boundaries = makeBoundaries(equipment, sourceProarrow, targetProarrow);
  return {
    source: sourceFrame,
    target: targetFrame,
    boundaries,
    evidence: {
      kind: "spanIso",
      mapping,
      details,
    },
  };
};

const composeMappings = (
  upper: ReadonlyArray<number>,
  lower: ReadonlyArray<number>,
): ReadonlyArray<number> | undefined => {
  if (upper.length !== lower.length) {
    return undefined;
  }
  const result: number[] = [];
  for (const [index, value] of lower.entries()) {
    const upperValue = upper[value];
    if (upperValue === undefined) {
      return undefined;
    }
    result[index] = upperValue;
  }
  return result;
};

const composeHorizontalMapping = (
  source: SpanPayload,
  target: SpanPayload,
  leftMapping: ReadonlyArray<number>,
  rightMapping: ReadonlyArray<number>,
): ReadonlyArray<number> | undefined => {
  if (!source.factors || !target.factors) {
    return undefined;
  }
  const mapping: number[] = [];
  for (const [index, factor] of source.factors.entries()) {
    const leftTarget = leftMapping[factor.left];
    const rightTarget = rightMapping[factor.right];
    if (leftTarget === undefined || rightTarget === undefined) {
      return undefined;
    }
    const candidate = target.factors.findIndex(
      (entry) => entry.left === leftTarget && entry.right === rightTarget,
    );
    if (candidate < 0) {
      return undefined;
    }
    mapping[index] = candidate;
  }
  return mapping;
};

const makeWeakComposition = (
  equipment: VirtualEquipment<FiniteSet, FiniteSet, SpanPayload, Span2CellEvidence>,
): EquipmentWeakComposition<FiniteSet, FiniteSet, SpanPayload, Span2CellEvidence> => ({
  associator: (h, g, f) => {
    const hg = horizontalComposeProarrows(equipment, h, g);
    const gh = horizontalComposeProarrows(equipment, g, f);
    if (!hg || !gh) {
      return undefined;
    }
    const left = horizontalComposeProarrows(equipment, hg, f);
    const right = horizontalComposeProarrows(equipment, h, gh);
    if (!left || !right) {
      return undefined;
    }
    const mapping = buildMapping(left.payload.leaves, right.payload.leaves);
    if (!mapping) {
      return undefined;
    }
    const leftFrame = [hg, f];
    const rightFrame = [h, gh];
    return makeSpanCell(
      equipment,
      leftFrame,
      rightFrame,
      mapping,
      "Canonical span associator rearranges the pullback apex indexing.",
    );
  },
  leftUnitor: (f) => {
    const id = equipment.proarrows.identity(f.to);
    const left = horizontalComposeProarrows(equipment, id, f);
    if (!left) {
      return undefined;
    }
    const mapping = buildMapping(left.payload.leaves, f.payload.leaves, {
      ignoreIdentity: true,
    });
    if (!mapping) {
      return undefined;
    }
    return makeSpanCell(
      equipment,
      [left],
      [f],
      mapping,
      "Span left unitor drops the identity leg from the pullback apex.",
    );
  },
  rightUnitor: (f) => {
    const id = equipment.proarrows.identity(f.from);
    const left = horizontalComposeProarrows(equipment, f, id);
    if (!left) {
      return undefined;
    }
    const mapping = buildMapping(left.payload.leaves, f.payload.leaves, {
      ignoreIdentity: true,
    });
    if (!mapping) {
      return undefined;
    }
    return makeSpanCell(
      equipment,
      [left],
      [f],
      mapping,
      "Span right unitor drops the identity leg from the pullback apex.",
    );
  },
});

const makeSpanTightCategory = (): TightCategory<FiniteSet, { readonly from: FiniteSet; readonly to: FiniteSet }> => ({
  id: (set) => ({ from: set, to: set }),
  compose: (g, f) => {
    if (f.to !== g.from) {
      throw new Error("Span tight layer attempted to compose mismatched functions.");
    }
    return { from: f.from, to: g.to };
  },
  src: (arrow) => arrow.from,
  dst: (arrow) => arrow.to,
});

const makeSpanIdentityFunctor = (
  category: TightCategory<FiniteSet, { readonly from: FiniteSet; readonly to: FiniteSet }>,
): TightIdentity<TightCategory<FiniteSet, { readonly from: FiniteSet; readonly to: FiniteSet }>> => ({
  source: category,
  target: category,
  onObj: (object) => object,
  onMor: (arrow) => arrow,
});

const spanCells = (
  equipment: VirtualEquipment<FiniteSet, FiniteSet, SpanPayload, Span2CellEvidence>,
) => ({
  identity: (frame: EquipmentFrame<FiniteSet, SpanPayload>): Span2CellEvidence => {
    const composite = horizontalComposeManyProarrows(
      equipment,
      frame.arrows,
    );
    const payload = composite?.payload ?? frame.arrows[frame.arrows.length - 1]?.payload;
    const size = payload?.apexIds.length ?? 0;
    const mapping = Array.from({ length: size }, (_, index) => index);
    return {
      kind: "spanIso",
      mapping,
      details: "Identity span 2-cell keeps each pullback apex fixed.",
    };
  },
  verticalCompose: (upper: SpanCell, lower: SpanCell): Span2CellEvidence | undefined => {
    const composed = composeMappings(upper.evidence.mapping, lower.evidence.mapping);
    if (!composed) {
      return undefined;
    }
    return {
      kind: "spanIso",
      mapping: composed,
      details: "Composite of span maps along vertical composition.",
    };
  },
  horizontalCompose: (right: SpanCell, left: SpanCell): Span2CellEvidence | undefined => {
    const sourceComposite = horizontalComposeManyProarrows(
      equipment,
      [...left.source.arrows, ...right.source.arrows],
    );
    const targetComposite = horizontalComposeManyProarrows(
      equipment,
      [...left.target.arrows, ...right.target.arrows],
    );
    if (!sourceComposite || !targetComposite) {
      return undefined;
    }
    const mapping = composeHorizontalMapping(
      sourceComposite.payload,
      targetComposite.payload,
      left.evidence.mapping,
      right.evidence.mapping,
    );
    if (!mapping) {
      return undefined;
    }
    return {
      kind: "spanIso",
      mapping,
      details: "Horizontal composition of span maps respects pullback apex indexing.",
    };
  },
  whiskerLeft: (
    frame: EquipmentFrame<FiniteSet, SpanPayload>,
    cell: SpanCell,
  ): Span2CellEvidence | undefined => {
    const sourceComposite = horizontalComposeManyProarrows(equipment, [
      ...frame.arrows,
      ...cell.source.arrows,
    ]);
    const targetComposite = horizontalComposeManyProarrows(equipment, [
      ...frame.arrows,
      ...cell.target.arrows,
    ]);
    if (!sourceComposite || !targetComposite) {
      return undefined;
    }
    const frameComposite = horizontalComposeManyProarrows(equipment, frame.arrows);
    const identityMapping = Array.from(
      { length: frameComposite?.payload.apexIds.length ?? 0 },
      (_, index) => index,
    );
    const mapping = composeHorizontalMapping(
      sourceComposite.payload,
      targetComposite.payload,
      identityMapping,
      cell.evidence.mapping,
    );
    if (!mapping) {
      return undefined;
    }
    return {
      kind: "spanIso",
      mapping,
      details: "Left whiskering inserts a fixed span before the span map.",
    };
  },
  whiskerRight: (
    cell: SpanCell,
    frame: EquipmentFrame<FiniteSet, SpanPayload>,
  ): Span2CellEvidence | undefined => {
    const sourceComposite = horizontalComposeManyProarrows(equipment, [
      ...cell.source.arrows,
      ...frame.arrows,
    ]);
    const targetComposite = horizontalComposeManyProarrows(equipment, [
      ...cell.target.arrows,
      ...frame.arrows,
    ]);
    if (!sourceComposite || !targetComposite) {
      return undefined;
    }
    const frameComposite = horizontalComposeManyProarrows(equipment, frame.arrows);
    const identityMapping = Array.from(
      { length: frameComposite?.payload.apexIds.length ?? 0 },
      (_, index) => index,
    );
    const mapping = composeHorizontalMapping(
      sourceComposite.payload,
      targetComposite.payload,
      cell.evidence.mapping,
      identityMapping,
    );
    if (!mapping) {
      return undefined;
    }
    return {
      kind: "spanIso",
      mapping,
      details: "Right whiskering appends a fixed span after the span map.",
    };
  },
});

export const makeFiniteSpanEquipment = (
  objects: ReadonlyArray<FiniteSet>,
  equals: ObjectEquality<FiniteSet> = compareFiniteSets,
): VirtualEquipment<FiniteSet, FiniteSet, SpanPayload, Span2CellEvidence> => {
  const category = makeSpanTightCategory();
  const identityFunctor = makeSpanIdentityFunctor(category);
  const tight = defaultTightLayer(category, identityFunctor, composeFun);
  const equipment: VirtualEquipment<FiniteSet, FiniteSet, SpanPayload, Span2CellEvidence> = {
    objects,
    equalsObjects: equals,
    tight,
    proarrows: {
      identity: (object) => ({
        from: object,
        to: object,
        payload: createIdentitySpan(object, objects.indexOf(object)),
      }),
      horizontalCompose: (g, f) => {
        if (!equals(f.to, g.from)) {
          return undefined;
        }
        const payload = composeSpanPayload(g, f);
        if (!payload) {
          return undefined;
        }
        return { from: f.from, to: g.to, payload };
      },
      horizontalComposeMany: (chain) => {
        if (chain.length === 0) {
          return undefined;
        }
        let accumulator = chain[0];
        if (!accumulator) {
          return undefined;
        }
        for (let index = 1; index < chain.length; index += 1) {
          const next = chain[index];
          if (!next) {
            return undefined;
          }
          const composed = horizontalComposeProarrows(
            equipment,
            next,
            accumulator,
          );
          if (!composed) {
            return undefined;
          }
          accumulator = composed;
        }
        return accumulator;
      },
    },
    restrictions: {
      left: () => undefined,
      right: () => undefined,
    },
    cells: undefined as unknown as ReturnType<typeof spanCells>,
    weakComposition: undefined,
  };
  (equipment as {
    cells: ReturnType<typeof spanCells>;
    weakComposition: EquipmentWeakComposition<FiniteSet, FiniteSet, SpanPayload, Span2CellEvidence>;
  }).cells = spanCells(equipment);
  (equipment as {
    cells: ReturnType<typeof spanCells>;
    weakComposition: EquipmentWeakComposition<FiniteSet, FiniteSet, SpanPayload, Span2CellEvidence>;
  }).weakComposition = makeWeakComposition(equipment);
  return equipment;
};

export const makeFiniteSpanBicategory = (
  objects: ReadonlyArray<FiniteSet>,
  equals: ObjectEquality<FiniteSet> = compareFiniteSets,
): Bicategory<FiniteSet, FiniteSet, SpanPayload, Span2CellEvidence> => {
  const equipment = makeFiniteSpanEquipment(objects, equals);
  const result = bicategoryFromEquipment(equipment);
  if (!result.bicategory) {
    throw new Error(`Failed to construct span bicategory: ${result.details}`);
  }
  return result.bicategory;
};

export const createFiniteSpan = (
  domain: FiniteSet,
  codomain: FiniteSet,
  leftLeg: ReadonlyArray<number>,
  rightLeg: ReadonlyArray<number>,
): SpanProarrow => {
  if (leftLeg.length !== rightLeg.length) {
    throw new Error("Span construction expects the same number of left/right legs.");
  }
  const spanId = nextSpanId();
  const leaves = leftLeg.map((_, index) => [`${spanId}:leaf#${index}`]);
  return {
    from: domain,
    to: codomain,
    payload: createSpanPayload(spanId, [...leftLeg], [...rightLeg], leaves),
  };
};

export type { SpanPayload, Span2CellEvidence };
