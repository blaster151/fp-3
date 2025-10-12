import { RunnableExample } from "./types";

declare function require(id: string): any;

const all = require("../../allTS") as any;

const {
  RingReal,
  FieldReal,
  shift1,
  complexIsValid,
  isChainMap,
  triangleFromMap,
  triangleIsSane,
  smithNormalForm,
  checkExactnessForFunctor,
} = all;

type Complex<R> = {
  readonly S: unknown;
  readonly degrees: ReadonlyArray<number>;
  readonly dim: Record<number, number>;
  readonly d: Record<number, ReadonlyArray<ReadonlyArray<R>>>;
};

type ChainMap<R> = {
  readonly S: unknown;
  readonly X: Complex<R>;
  readonly Y: Complex<R>;
  readonly f: Record<number, ReadonlyArray<ReadonlyArray<R>>>;
};

type ComplexFunctor<R> = {
  onComplex(complex: Complex<R>): Complex<R>;
  onMap(map: ChainMap<R>): ChainMap<R>;
};

function formatDimensions(complex: Complex<number>): string {
  return complex.degrees.map((degree) => `${degree}:${complex.dim[degree] ?? 0}`).join(" ");
}

function formatMatrix(matrix: ReadonlyArray<ReadonlyArray<number>>): string {
  if (matrix.length === 0) {
    return "[]";
  }
  return matrix
    .map((row) => `[${row.map((value) => value.toFixed(2)).join(", ")}]`)
    .join("; ");
}

export const stage042TriangulatedCategoriesAndHomologicalAlgebra: RunnableExample = {
  id: "042",
  title: "Triangulated categories and homological algebra",
  outlineReference: 42,
  summary:
    "Construct cones, verify distinguished triangles, compute Smith normal forms, and exercise exactness diagnostics for chain complexes.",
  async run() {
    // ===== Basic complexes and chain maps =====
    const complexX: Complex<number> = {
      S: RingReal,
      degrees: [-1, 0],
      dim: { [-1]: 1, [0]: 1 },
      d: { [0]: [[0]] },
    };

    const complexY: Complex<number> = {
      S: RingReal,
      degrees: [-1, 0],
      dim: { [-1]: 1, [0]: 1 },
      d: { [0]: [[0]] },
    };

    const chainMapXY: ChainMap<number> = {
      S: RingReal,
      X: complexX,
      Y: complexY,
      f: {
        [-1]: [[1]],
        [0]: [[1]],
      },
    };

    const coneTriangle = triangleFromMap(chainMapXY);
    const shiftedX = shift1(complexX);

    const triangleSection = [
      "== Distinguished triangle diagnostics ==",
      `Complex X valid → ${complexIsValid(complexX)}`,
      `Complex Y valid → ${complexIsValid(complexY)}`,
      `Chain map conditions satisfied → ${isChainMap(chainMapXY)}`,
      `Triangle sanity check → ${triangleIsSane(coneTriangle)}`,
      `Cone degrees → ${coneTriangle.Z.degrees.join(", ")}`,
      `Cone dimensions → ${formatDimensions(coneTriangle.Z)}`,
      `Shifted X degrees → ${shiftedX.degrees.join(", ")}`,
    ];

    // ===== Smith normal form computations =====
    const integerMatrix = [
      [4, 6, 8],
      [2, 4, 6],
      [0, 2, 2],
    ];
    const snf = smithNormalForm(integerMatrix);

    const smithSection = [
      "== Smith normal form ==",
      `Invariant factors → ${snf.diag.join(", ")}`,
      `Diagonal matrix sample → ${formatMatrix(snf.D.slice(0, 2))}`,
      `Left unimodular matrix (U) sample → ${formatMatrix(snf.U.slice(0, 2))}`,
      `Right unimodular matrix (V) sample → ${formatMatrix(snf.V.slice(0, 2))}`,
    ];

    // ===== Exactness diagnostic scaffold =====
    const identityFunctor: ComplexFunctor<number> = {
      onComplex: (complex) => complex,
      onMap: (map) => map,
    };

    const exactness = checkExactnessForFunctor(FieldReal)(identityFunctor, chainMapXY);

    const exactnessSection = [
      "== Exactness checker interface ==",
      `Dimension preservation placeholder → ${exactness.dimsOk}`,
      `Coimage-image isomorphism placeholder → ${exactness.isoOk}`,
      `Status message → ${exactness.message}`,
    ];

    const logs = [...triangleSection, ...smithSection, ...exactnessSection];

    return { logs };
  },
};
