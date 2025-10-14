import * as AllTS from "../../allTS";
import type { ChainMap, Complex, Mat } from "../../allTS";
import type { RunnableExample } from "./types";

const {
  FieldReal,
  VS,
  idL,
  composeL,
  linToChain,
  complexSpaces,
  makeFinitePoset,
  makePosetDiagram,
  LanPoset,
  toVectAtDegree,
  arrowMatrixAtDegree,
  Pretty,
} = AllTS;

const complex0 = (dimension: number): Complex<number> => ({
  S: FieldReal,
  degrees: [0],
  dim: { 0: dimension },
  d: {},
});

const chain = (
  domain: Complex<number>,
  codomain: Complex<number>,
  matrix: Mat<number>,
): ChainMap<number> => ({
  S: FieldReal,
  X: domain,
  Y: codomain,
  f: { 0: matrix },
});

const formatMatrix = (matrix: ReadonlyArray<ReadonlyArray<number>>): ReadonlyArray<string> =>
  Pretty.matrix(FieldReal)(matrix).split("\n").map((line: string) => `  ${line}`);

const describeVectDiagram = (name: string, degree: number, diagram: any): ReadonlyArray<string> =>
  Pretty.vectDiagramAtDegree(FieldReal)(name, toVectAtDegree(FieldReal)(diagram, degree))
    .split("\n")
    .map((line: string) => `  ${line}`);

export const stage044VectorSpaceAndDiagrammaticCategoryUtilities: RunnableExample = {
  id: "044",
  title: "Vector space and diagrammatic category utilities",
  outlineReference: 44,
  summary:
    "Compose linear maps, inspect complex degrees, build poset-indexed diagrams, and observe Kan extensions alongside Vect views.",
  async run() {
    const vectorSpaceSection = (() => {
      const V2 = VS(FieldReal)(2);
      const V3 = VS(FieldReal)(3);

      const linearMap = {
        F: FieldReal,
        dom: V2,
        cod: V3,
        M: [
          [1, 2],
          [3, 4],
          [5, 6],
        ],
      } as const;

      const idV3 = idL(FieldReal)(V3);
      const composed = composeL(FieldReal)(idV3, linearMap);
      const lifted = linToChain(FieldReal)(0, linearMap);

      const matrixLines = formatMatrix(linearMap.M);
      const chainLines = Pretty.chainMap(FieldReal)("linToChain(f)", lifted)
        .split("\n")
        .map((line: string) => `  ${line}`);

      return [
        "== Linear bridges and composition ==",
        `V2 dimension → ${V2.dim}`,
        `V3 dimension → ${V3.dim}`,
        `composeL(id_V3, f) codomain dimension → ${composed.cod.dim}`,
        `linToChain degree-0 domain dimension → ${lifted.X.dim[0] ?? 0}`,
        `linToChain degree-0 codomain dimension → ${lifted.Y.dim[0] ?? 0}`,
        "Matrix for f:",
        ...matrixLines,
        "Chain-map lift:",
        ...chainLines,
      ];
    })();

    const complexSection = (() => {
      const sampleComplex: Complex<number> = {
        S: FieldReal,
        degrees: [0, 1],
        dim: { 0: 2, 1: 1 },
        d: {
          1: [
            [1],
            [-1],
          ] as Mat<number>,
        },
      };

      const spaces = complexSpaces(FieldReal)(sampleComplex);

      return [
        "== Degree-wise vector spaces from a complex ==",
        `Degrees present → ${Object.keys(spaces).join(", ")}`,
        `deg 0 dimension → ${spaces[0]?.dim ?? 0}`,
        `deg 1 dimension → ${spaces[1]?.dim ?? 0}`,
      ];
    })();

    const diagramSection = (() => {
      const cover: ReadonlyArray<readonly [string, string]> = [
        ["a", "b"],
        ["b", "c"],
      ];

      const poset = makeFinitePoset(["a", "b", "c"], cover);

      const Xa = complex0(1);
      const Xb = complex0(2);
      const Xc = complex0(1);

      const diagram = makePosetDiagram(FieldReal)(
        poset,
        { a: Xa, b: Xb, c: Xc },
        cover,
        (a: string, b: string) => {
          if (a === "a" && b === "b") {
            const edge: Mat<number> = [
              [1],
              [1],
            ];
            return chain(Xa, Xb, edge);
          }
          if (a === "b" && b === "c") {
            const edge: Mat<number> = [[1, -1]];
            return chain(Xb, Xc, edge);
          }
          throw new Error(`Unexpected cover edge ${a}→${b}`);
        },
      );

      const lan = LanPoset(FieldReal)((j: string) => j, poset, poset)(diagram);

      const vectLines = describeVectDiagram("Degree 0 view", 0, diagram);
      const acMatrix = arrowMatrixAtDegree(FieldReal)(diagram, 0, "a", "c");
      const acLines = formatMatrix(acMatrix);

      return [
        "== Poset-indexed diagram analytics ==",
        `Objects in poset → ${poset.objects.join(", ")}`,
        `Lan along identity preserves dim(a) → ${lan.X["a"]?.dim[0] ?? 0}`,
        `Lan along identity preserves dim(b) → ${lan.X["b"]?.dim[0] ?? 0}`,
        `Lan along identity preserves dim(c) → ${lan.X["c"]?.dim[0] ?? 0}`,
        "Vect view at degree 0:",
        ...vectLines,
        "Composite arrow a⇒c matrix:",
        ...acLines,
      ];
    })();

    return {
      logs: [...vectorSpaceSection, ...complexSection, ...diagramSection],
    };
  },
};
