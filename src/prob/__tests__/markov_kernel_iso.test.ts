import { describe, it, expect } from "vitest";
import {
  kernelToMatrix,
  matrixToKernel,
  approxEqMatrix,
  kernelsEq,
  Samples,
} from "../MarkovKernelIso";

const eqNum = (a: number, b: number) => a === b;

describe("Kernel ↔ Matrix isomorphism (finite enumerations)", () => {
  const A = [0, 1, 2];
  const B = [10, 20];

  it("round-trips: to ∘ from = id (matrices)", () => {
    const P = [
      [0.3, 0.7],
      [1.0, 0.0],
      [0.25, 0.75],
    ];
    const Q = [
      [0.5, 0.5],
      [0.2, 0.8],
      [0.0, 1.0],
    ];

    const fromP = matrixToKernel(A, B, P);
    const fromQ = matrixToKernel(A, B, Q);
    const toFromP = kernelToMatrix(A, B, eqNum, fromP);
    const toFromQ = kernelToMatrix(A, B, eqNum, fromQ);

    expect(approxEqMatrix(toFromP, P)).toBe(true);
    expect(approxEqMatrix(toFromQ, Q)).toBe(true);
  });

  it("round-trips: from ∘ to = id (kernels) on representatives", () => {
    const k1 = Samples.pointFirst<number, number>(B);
    const k2 = Samples.uniform<number, number>(B);
    const k3 = Samples.addOneMod<number, number>(B);

    for (const k of [k1, k2, k3]) {
      const P = kernelToMatrix(A, B, eqNum, k);
      const kBack = matrixToKernel(A, B, P);
      expect(kernelsEq(A, eqNum, k, kBack)).toBe(true);
    }
  });
});
