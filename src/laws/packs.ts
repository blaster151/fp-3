import { registerLawful } from "./registry";
import { lawfulMonoid } from "./Monoid";
import { lawfulDistNumber } from "./Prob";
import { lawfulKleisliCategory } from "./ProbKleisli";
import { lawfulKernelMatrixIso } from "./ProbMatrixKernelIso";
import { lawfulKernelMatrixIso_Iso } from "./ProbKernelMatrixIso_Iso";
import { lawfulTopContinuity } from "./TopContinuity";
import { lawfulTopProductUP } from "./TopProductUP";

const eqNum = (a: number, b: number) => a === b;
const Sum = { empty: 0, concat: (x: number, y: number) => x + y };
registerLawful(lawfulMonoid("Monoid/number/sum", eqNum, Sum, [0, 1, 2, 3]));

registerLawful(lawfulDistNumber());
registerLawful(lawfulKleisliCategory());
registerLawful(lawfulKernelMatrixIso());
registerLawful(lawfulKernelMatrixIso_Iso());
registerLawful(lawfulTopProductUP());
registerLawful(lawfulTopContinuity());
