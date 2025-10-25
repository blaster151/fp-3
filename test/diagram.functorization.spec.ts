import { describe, expect, test } from "vitest";

import {
  CategoryLimits,
  constructFunctorWithWitness,
  IndexedFamilies,
} from "../allTS";
import type { FiniteCategory as FiniteCategoryT } from "../finite-cat";
import type { FunctorCheckSamples } from "../functor";
import type { SimpleCat } from "../simple-cat";
import type { SmallCategory } from "../subcategory";

type Node = "A" | "B" | "C";

interface Arrow {
  readonly name: string;
  readonly src: Node;
  readonly dst: Node;
}

const idArrow = (object: Node): Arrow => ({
  name: `id_${object}`,
  src: object,
  dst: object,
});

const arrowA: Arrow = { name: "a", src: "A", dst: "B" };
const arrowB: Arrow = { name: "b", src: "B", dst: "C" };
const arrowC: Arrow = { name: "c", src: "A", dst: "C" };

const identityA = idArrow("A");
const identityB = idArrow("B");
const identityC = idArrow("C");

const allArrows: readonly Arrow[] = [
  identityA,
  identityB,
  identityC,
  arrowA,
  arrowB,
  arrowC,
];

const compose = (g: Arrow, f: Arrow): Arrow => {
  if (f.dst !== g.src) {
    throw new Error("compose: non-composable arrows");
  }
  if (f.name.startsWith("id_")) {
    return g;
  }
  if (g.name.startsWith("id_")) {
    return f;
  }
  if (f === arrowA && g === arrowB) {
    return arrowC;
  }
  if (f === arrowA && g === arrowC) {
    return arrowC;
  }
  if (f === identityA && g === arrowC) {
    return arrowC;
  }
  if (f === arrowC && g === identityC) {
    return arrowC;
  }
  throw new Error(`compose: missing composite for ${f.name};${g.name}`);
};

const finiteShape: FiniteCategoryT<Node, Arrow> = {
  objects: ["A", "B", "C"],
  arrows: allArrows,
  id: idArrow,
  compose,
  src: (arrow) => arrow.src,
  dst: (arrow) => arrow.dst,
  eq: (left: Arrow, right: Arrow): boolean => left.name === right.name,
};

const smallShape: SmallCategory<Node, Arrow> = {
  objects: new Set<Node>(finiteShape.objects),
  arrows: new Set<Arrow>(finiteShape.arrows),
  id: idArrow,
  compose,
  src: (arrow) => arrow.src,
  dst: (arrow) => arrow.dst,
};

const simpleCategory: SimpleCat<Node, Arrow> = {
  id: idArrow,
  compose,
  src: (arrow) => arrow.src,
  dst: (arrow) => arrow.dst,
};

const baseCategory = {
  ...simpleCategory,
  dom: (arrow: Arrow): Node => arrow.src,
  cod: (arrow: Arrow): Node => arrow.dst,
  eq: (left: Arrow, right: Arrow): boolean => left.name === right.name,
};

const samples: FunctorCheckSamples<Node, Arrow> = {
  objects: ["A", "B", "C"],
  arrows: allArrows,
  composablePairs: [{ f: arrowA, g: arrowB }],
};

describe("diagram functorization helpers", () => {
  const functor = constructFunctorWithWitness(
    simpleCategory,
    simpleCategory,
    {
      F0: (object: Node): Node => object,
      F1: (arrow: Arrow): Arrow => arrow,
    },
    samples,
  );

  test("functorToDiagram produces small diagram with expected assignments", () => {
    const result = CategoryLimits.functorToDiagram({ functor, source: smallShape });
    const { diagram, objectIndex, arrowIndex } = result;

    expect(objectIndex.carrier).toEqual(["A", "B", "C"]);
    expect(arrowIndex.carrier).toEqual(allArrows);
    expect(diagram.onObjects("A")).toBe("A");
    expect(diagram.onMorphisms(arrowA)).toBe(arrowA);
  });

  test("diagramToFunctorWitness reconstructs the identity functor", () => {
    const diagram = CategoryLimits.makeFiniteDiagram<Node, Arrow, Node, Arrow>({
      shape: finiteShape,
      onObjects: (object) => object,
      onMorphisms: (arrow) => arrow,
    });

    const reconstruction = CategoryLimits.diagramToFunctorWitness({
      base: baseCategory,
      diagram,
    });

    expect(reconstruction.analysis.holds).toBe(true);
    expect(reconstruction.functor.report.preservesIdentities).toBe(true);
    expect(reconstruction.functor.report.preservesComposition).toBe(true);
  });

  test("diagramToFunctorWitness surfaces arrow endpoint failures", () => {
    const brokenDiagram = CategoryLimits.makeFiniteDiagram<Node, Arrow, Node, Arrow>({
      shape: finiteShape,
      onObjects: (object) => object,
      onMorphisms: (arrow) => (arrow === arrowA ? arrowB : arrow),
    });

    const reconstruction = CategoryLimits.diagramToFunctorWitness({
      base: baseCategory,
      diagram: brokenDiagram,
    });

    expect(reconstruction.analysis.holds).toBe(false);
    const failing = reconstruction.analysis.arrowDiagnostics.find((diag) => !diag.holds);
    expect(failing).toBeDefined();
    expect(failing?.sourceIndex).toBe("A");
    expect(failing?.targetIndex).toBe("B");
  });

  test("analyzeConeNaturality validates commutativity and reports failures", () => {
    const indices = IndexedFamilies.finiteIndex<Node>(["A", "B", "C"]);
    const onObjects = (index: Node): Node => index;

    const cone: CategoryLimits.Cone<Node, Node, Arrow> = {
      tip: "A",
      legs: (index: Node): Arrow => {
        if (index === "A") {
          return identityA;
        }
        if (index === "B") {
          return arrowA;
        }
        return arrowC;
      },
      diagram: CategoryLimits.makeFiniteDiagram<Node, Arrow, Node, Arrow>({
        shape: finiteShape,
        onObjects,
        onMorphisms: (arrow) => arrow,
      }),
    };

    const analysis = CategoryLimits.analyzeConeNaturality({
      category: baseCategory,
      eq: baseCategory.eq,
      indices,
      onObjects,
      cone,
    });

    expect(analysis.holds).toBe(true);

    const brokenCone: CategoryLimits.Cone<Node, Node, Arrow> = {
      ...cone,
      legs: (index: Node): Arrow => {
        if (index === "C") {
          return identityC;
        }
        return cone.legs(index);
      },
    };

    const failure = CategoryLimits.analyzeConeNaturality({
      category: baseCategory,
      eq: baseCategory.eq,
      indices,
      onObjects,
      cone: brokenCone,
    });

    expect(failure.holds).toBe(false);
    expect(failure.arrowDiagnostics.some((diag) => !diag.holds)).toBe(true);
  });

  test("analyzeCoconeNaturality validates dual coherence", () => {
    const indices = IndexedFamilies.finiteIndex<Node>(["A", "B", "C"]);
    const onObjects = (index: Node): Node => index;

    const cocone: CategoryLimits.Cocone<Node, Node, Arrow> = {
      coTip: "C",
      legs: (index: Node): Arrow => {
        if (index === "A") {
          return arrowC;
        }
        if (index === "B") {
          return arrowB;
        }
        return identityC;
      },
      diagram: CategoryLimits.makeFiniteDiagram<Node, Arrow, Node, Arrow>({
        shape: finiteShape,
        onObjects,
        onMorphisms: (arrow) => arrow,
      }),
    };

    const analysis = CategoryLimits.analyzeCoconeNaturality({
      category: baseCategory,
      eq: baseCategory.eq,
      indices,
      onObjects,
      cocone,
    });

    expect(analysis.holds).toBe(true);

    const brokenCocone: CategoryLimits.Cocone<Node, Node, Arrow> = {
      ...cocone,
      legs: (index: Node): Arrow => {
        if (index === "A") {
          return arrowA;
        }
        if (index === "B") {
          return arrowB;
        }
        return cocone.legs(index);
      },
    };

    const failure = CategoryLimits.analyzeCoconeNaturality({
      category: baseCategory,
      eq: baseCategory.eq,
      indices,
      onObjects,
      cocone: brokenCocone,
    });

    expect(failure.holds).toBe(false);
    expect(failure.arrowDiagnostics.some((diag) => !diag.holds)).toBe(true);
  });
});

