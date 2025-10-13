import { describe, expect, it } from "vitest";

import {
  describeTrivialRelativeMonad,
  embedRelativeMonadIntoFiber,
  analyzeRelativeMonadRepresentableRecovery,
  fromMonad,
  type RelativeMonadData,
} from "../../relative/relative-monads";
import { checkRelativeMonadLaws } from "../../algebra-oracles";
import {
  identityVerticalBoundary,
  frameFromProarrow,
  promoteFunctor,
  virtualizeFiniteCategory,
  type Tight,
  type TightCategory,
  type TightCellEvidence,
} from "../../virtual-equipment";
import {
  TwoObjectCategory,
  nonIdentity,
  type TwoObject,
  type TwoArrow,
} from "../../two-object-cat";
import type { CatMonad } from "../../allTS";
import { composeFun, idFun } from "../../allTS";

type RelativeObjects = TwoObject;
type RelativeArrows = TwoArrow;

type TightPayload = Tight<
  TightCategory<RelativeObjects, RelativeArrows>,
  TightCategory<RelativeObjects, RelativeArrows>
>;
type RelativeEvidence = TightCellEvidence<RelativeObjects, RelativeArrows>;
type RelativeMonad = RelativeMonadData<
  RelativeObjects,
  RelativeArrows,
  TightPayload,
  RelativeEvidence
>;

const makeIdentityCatMonad = (): CatMonad<typeof TwoObjectCategory> => {
  const identityEndofunctor = {
    source: TwoObjectCategory,
    target: TwoObjectCategory,
    onObj: (object: TwoObject) => object,
    onMor: (arrow: TwoArrow) => arrow,
  };

  return {
    category: TwoObjectCategory,
    endofunctor: identityEndofunctor,
    unit: {
      source: idFun(TwoObjectCategory),
      target: identityEndofunctor,
      component: (object: TwoObject) => TwoObjectCategory.id(object),
    },
    mult: {
      source: composeFun(identityEndofunctor, identityEndofunctor),
      target: identityEndofunctor,
      component: (object: TwoObject) => TwoObjectCategory.id(object),
    },
  };
};

const buildTrivialRelativeMonad = () => {
  const equipment = virtualizeFiniteCategory(TwoObjectCategory);
  const trivial = describeTrivialRelativeMonad(equipment, "•");
  const restriction = equipment.restrictions.left(
    trivial.root.tight,
    trivial.looseCell,
  );
  if (!restriction?.representability) {
    throw new Error("Expected representability witness for the identity loose arrow.");
  }
  return { equipment, trivial, witness: restriction.representability } as const;
};

const buildConstantRootRelativeMonad = (): RelativeMonad => {
  const equipment = virtualizeFiniteCategory(TwoObjectCategory);
  const constantStar = promoteFunctor(
    TwoObjectCategory,
    TwoObjectCategory,
    {
      F0: () => "★" as const,
      F1: () => TwoObjectCategory.id("★"),
    },
    {
      objects: TwoObjectCategory.objects,
      composablePairs: [
        { f: TwoObjectCategory.id("•"), g: TwoObjectCategory.id("•") },
        { f: nonIdentity, g: TwoObjectCategory.id("★") },
      ],
    },
  ).functor;

  const root = {
    from: "•" as const,
    to: "★" as const,
    tight: constantStar,
    details: "Constant-star functor used as a non-identity root.",
  };

  const carrier = identityVerticalBoundary(
    equipment,
    "★",
    "Carrier chosen as the identity on ★.",
  );

  const looseCell = {
    from: "•" as const,
    to: "★" as const,
    payload: constantStar,
  };

  const frame = frameFromProarrow(looseCell);
  const boundaries = { left: root, right: carrier } as const;
  const identityEvidence = equipment.cells.identity(frame, boundaries);

  return {
    equipment,
    root,
    carrier,
    looseCell,
    unit: {
      source: frame,
      target: frame,
      boundaries,
      evidence: identityEvidence,
    },
    extension: {
      source: frame,
      target: frame,
      boundaries,
      evidence: identityEvidence,
    },
  };
};

describe("Relative monad law aggregation", () => {
  it("confirms identity-root embeddings satisfy the structural laws", () => {
    const classical = makeIdentityCatMonad();
    const relative = fromMonad(classical, {
      rootObject: "•" as const,
      objects: TwoObjectCategory.objects,
    });

    const result = checkRelativeMonadLaws(relative);
    expect(result.pending).toBe(true);
    expect(result.analysis.framing.holds).toBe(true);
    expect(result.analysis.unitCompatibility.issues).toHaveLength(0);
    expect(result.analysis.extensionAssociativity.issues).toHaveLength(0);
    expect(result.analysis.rootIdentity.issues).toHaveLength(0);
  });

  it("accepts a constant-root relative monad with non-trivial boundaries", () => {
    const relative = buildConstantRootRelativeMonad();
    const result = checkRelativeMonadLaws(relative);

    expect(result.analysis.framing.holds).toBe(true);
    expect(result.analysis.unitCompatibility.holds).toBe(true);
    expect(result.analysis.extensionAssociativity.holds).toBe(true);
    expect(result.analysis.rootIdentity.holds).toBe(true);
  });
});

describe("Fiber embedding and representable recovery", () => {
  it("produces a pending fiber embedding for the trivial relative monad", () => {
    const { trivial, witness } = buildTrivialRelativeMonad();
    const embedding = embedRelativeMonadIntoFiber(trivial, witness);

    expect(embedding.holds).toBe(true);
    expect(embedding.pending).toBe(true);
    expect(embedding.fiberMonad?.baseObject).toBe(trivial.root.from);
    expect(embedding.details).toContain("embeds into the Street fiber X[j]");
  });

  it("aggregates representable recovery diagnostics", () => {
    const { trivial, witness } = buildTrivialRelativeMonad();
    const recovery = analyzeRelativeMonadRepresentableRecovery(trivial, witness);

    expect(recovery.embedding.holds).toBe(true);
    expect(recovery.holds).toBe(true);
    expect(recovery.pending).toBe(true);
    expect(recovery.details).toContain("Representable root");
  });
});
