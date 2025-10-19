import { isoLaws, runLaws, type Iso } from "./Witness";
import { type Kernel } from "../prob/Kleisli";
import {
  kernelToMatrix,
  matrixToKernel,
  approxEqMatrix,
  kernelsEq,
  Samples,
} from "../prob/MarkovKernelIso";
import type { Stoch } from "../prob/Markov";

const eqNum = (a: number, b: number) => a === b;

type IsoSamples = {
  readonly samplesA: ReadonlyArray<Kernel<number, number>>;
  readonly samplesB: ReadonlyArray<Stoch>;
};

export function lawfulKernelMatrixIso_Iso() {
  const tag = "Prob/KernelMatrixIso/Iso";

  const A = [0, 1, 2];
  const B = [10, 20];

  const eqKernel = (k1: Kernel<number, number>, k2: Kernel<number, number>) => kernelsEq(A, eqNum, k1, k2);
  const eqMatrix = (P: Stoch, Q: Stoch) => approxEqMatrix(P, Q, 1e-7);

  const samples: IsoSamples = {
    samplesA: [
      Samples.pointFirst<number, number>(B),
      Samples.uniform<number, number>(B),
      Samples.addOneMod<number, number>(B),
    ],
    samplesB: [
      [
        [1, 0],
        [0.2, 0.8],
        [0.5, 0.5],
      ],
      [
        [0.3, 0.7],
        [1, 0],
        [0.0, 1.0],
      ],
    ],
  };

  const iso: Iso<Kernel<number, number>, Stoch> = {
    to: (k) => kernelToMatrix(A, B, eqNum, k),
    from: (P) => matrixToKernel(A, B, P),
  };

  const laws = isoLaws(eqKernel, eqMatrix, iso);

  return {
    tag,
    eq: (_a: unknown, _b: unknown) => true,
    struct: iso,
    laws,
    run: () => runLaws(laws, samples),
  };
}
