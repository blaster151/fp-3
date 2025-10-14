import { describe, it, expect } from "vitest";
import { isRowStochastic, compose, idStoch, push } from "../Markov";

describe("Markov kernels (row-stochastic matrices)", () => {
  it("associativity of composition and identity", () => {
    const P = [[0.2, 0.8], [0.5, 0.5]];
    const Q = [[1, 0], [0.3, 0.7]];
    const R = [[0.6, 0.4], [0.1, 0.9]];

    expect(isRowStochastic(P) && isRowStochastic(Q) && isRowStochastic(R)).toBe(true);

    const lhs = compose(compose(P, Q), R);
    const rhs = compose(P, compose(Q, R));
    // compare rows approximately
    for (let i = 0; i < lhs.length; i++)
      for (let j = 0; j < lhs[0].length; j++)
        expect(Math.abs(lhs[i][j] - rhs[i][j])).toBeLessThan(1e-7);

    const I = idStoch(2);
    const PI = compose(P, I);
    const IP = compose(I, P);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      expect(Math.abs(PI[i][j] - P[i][j])).toBeLessThan(1e-7);
      expect(Math.abs(IP[i][j] - P[i][j])).toBeLessThan(1e-7);
    }
  });

  it("push acts on distributions and respects identity", () => {
    const P = [[0.3, 0.7], [0.9, 0.1]];
    const I = idStoch(2);
    const d = [0.4, 0.6];
    const out = push(d, P);
    const idOut = push(d, I);
    expect(Math.abs(idOut[0] - d[0]) + Math.abs(idOut[1] - d[1])).toBeLessThan(1e-9);
    expect(Math.abs(out[0] + out[1] - 1)).toBeLessThan(1e-9);
  });
});
