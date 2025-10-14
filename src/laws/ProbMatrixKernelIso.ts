import type { Law, Lawful } from "./Witness";
import {
  kernelToMatrix,
  matrixToKernel,
  approxEqMatrix,
  kernelsEq,
  Samples,
} from "../prob/MarkovKernelIso";

const eqNum = (a: number, b: number) => a === b;

export function lawfulKernelMatrixIso(): Lawful<any, { to: unknown; from: unknown }> {
  const tag = "Prob/KernelMatrixIso";

  const A = [0, 1, 2];
  const B = [10, 20];

  const laws: Law<any>[] = [
    {
      name: "to ∘ from = id (matrices)",
      check: () => {
        const P = [
          [0.3, 0.7],
          [1.0, 0.0],
          [0.25, 0.75],
        ];
        const tofrom = kernelToMatrix(A, B, eqNum, matrixToKernel(A, B, P));
        return approxEqMatrix(P, tofrom);
      },
    },
    {
      name: "from ∘ to = id (kernels) on representatives",
      check: () => {
        const ks = [
          Samples.pointFirst<number, number>(B),
          Samples.uniform<number, number>(B),
          Samples.addOneMod<number, number>(B),
        ];
        return ks.every((k) => {
          const P = kernelToMatrix(A, B, eqNum, k);
          const kBack = matrixToKernel(A, B, P);
          return kernelsEq(A, eqNum, k, kBack);
        });
      },
    },
  ];

  return { tag, eq: (a: any, b: any) => a === b, struct: { to: kernelToMatrix, from: matrixToKernel }, laws };
}
