import * as AllTS from "../../allTS";
import type { RunnableExample } from "./types";

const { FieldQ, Qof, QtoString, solveLinear, nullspace, colspace, smithNormalForm } = AllTS;

type Q = { readonly num: bigint; readonly den: bigint };

function formatQ(value: Q): string {
  return QtoString(value);
}

function formatQVector(vector: ReadonlyArray<Q>): string {
  return `[${vector.map(formatQ).join(", ")}]`;
}

function formatQMatrix(matrix: ReadonlyArray<ReadonlyArray<Q>>): string {
  if (matrix.length === 0) {
    return "[]";
  }
  return matrix.map((row) => `[${row.map(formatQ).join(", ")}]`).join("; ");
}

export const stage043RationalArithmeticAndLinearAlgebraOver: RunnableExample = {
  id: "043",
  title: "Rational arithmetic and linear algebra over ℚ",
  outlineReference: 43,
  summary:
    "Demonstrate exact rational arithmetic, solve linear systems, compute nullspaces and column spaces, and inspect Smith normal forms in ℚ-linear algebra.",
  async run() {
    // ===== Exact arithmetic samples =====
    const q1 = Qof(3, 4);
    const q2 = Qof(5, 6);
    const sum = FieldQ.add(q1, q2);
    const product = FieldQ.mul(q1, q2);
    const inverse = FieldQ.inv(q1);

    const arithmeticSection = [
      "== Exact rational arithmetic ==",
      `q1 = ${formatQ(q1)}`,
      `q2 = ${formatQ(q2)}`,
      `q1 + q2 = ${formatQ(sum)}`,
      `q1 × q2 = ${formatQ(product)}`,
      `q1⁻¹ = ${formatQ(inverse)}`,
    ];

    // ===== Linear system solving =====
    const toQ = (n: number, d = 1): Q => Qof(n, d);
    const linearMatrix: ReadonlyArray<ReadonlyArray<Q>> = [
      [toQ(2), toQ(1), toQ(-1)],
      [toQ(-3), toQ(-1), toQ(2)],
      [toQ(-2), toQ(1), toQ(2)],
    ];
    const linearVector: ReadonlyArray<Q> = [toQ(8), toQ(-11), toQ(-3)];
    const solution = solveLinear(FieldQ)(linearMatrix, linearVector);

    const linearSection = [
      "== Solving Ax = b with exact rationals ==",
      `Matrix A → ${formatQMatrix(linearMatrix)}`,
      `Vector b → ${formatQVector(linearVector)}`,
      `Solution x → ${formatQVector(solution)}`,
    ];

    // ===== Nullspace and column space =====
    const dependentMatrix: ReadonlyArray<ReadonlyArray<Q>> = [
      [toQ(1), toQ(2), toQ(3)],
      [toQ(2), toQ(4), toQ(6)],
    ];
    const kernelBasis = nullspace(FieldQ)(dependentMatrix);
    const columnBasis = colspace(FieldQ)(dependentMatrix);

    const nullspaceSection = [
      "== Nullspace and column space diagnostics ==",
      `Input matrix → ${formatQMatrix(dependentMatrix)}`,
      `Nullspace basis vectors → ${kernelBasis.map(formatQVector).join("; ") || "[]"}`,
      `Column space basis → ${formatQMatrix(columnBasis)}`,
    ];

    // ===== Smith normal form over integers with rational inspection =====
    const integerMatrix = [
      [6, 4, 2],
      [2, 6, 4],
      [0, 2, 6],
    ];
    const snf = smithNormalForm(integerMatrix);

    const smithSection = [
      "== Smith normal form (integer input) ==",
      `Invariant factors → ${snf.diag.join(", ")}`,
      `Diagonal matrix sample → ${snf.D.slice(0, 2)
        .map((row: ReadonlyArray<number>) => `[${row.join(", ")}]`)
        .join("; ")}`,
    ];

    const logs = [...arithmeticSection, ...linearSection, ...nullspaceSection, ...smithSection];

    return { logs };
  },
};
