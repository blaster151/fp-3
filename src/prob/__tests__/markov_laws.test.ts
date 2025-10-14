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
    expect(lhs.length).toBe(rhs.length);
    lhs.forEach((lhsRow, i) => {
      const rhsRow = rhs[i];
      expect(rhsRow).toBeDefined();
      if (!rhsRow) throw new Error("rhs row missing");
      expect(lhsRow.length).toBe(rhsRow.length);
      lhsRow.forEach((lhsValue, j) => {
        const rhsValue = rhsRow[j];
        expect(rhsValue).toBeDefined();
        if (rhsValue === undefined) throw new Error("rhs column missing");
        expect(Math.abs(lhsValue - rhsValue)).toBeLessThan(1e-7);
      });
    });

    const I = idStoch(2);
    const PI = compose(P, I);
    const IP = compose(I, P);
    PI.forEach((piRow, i) => {
      const pRow = P[i];
      const ipRow = IP[i];
      expect(pRow).toBeDefined();
      expect(ipRow).toBeDefined();
      if (!pRow || !ipRow) throw new Error("expected stochastic rows");
      piRow.forEach((piValue, j) => {
        const pValue = pRow[j];
        const ipValue = ipRow[j];
        expect(pValue).toBeDefined();
        expect(ipValue).toBeDefined();
        if (pValue === undefined || ipValue === undefined) throw new Error("expected entries");
        expect(Math.abs(piValue - pValue)).toBeLessThan(1e-7);
        expect(Math.abs(ipValue - pValue)).toBeLessThan(1e-7);
      });
    });
  });

  it("push acts on distributions and respects identity", () => {
    const P = [[0.3, 0.7], [0.9, 0.1]];
    const I = idStoch(2);
    const d = [0.4, 0.6];
    const out = push(d, P);
    const idOut = push(d, I);
    const [idOut0 = 0, idOut1 = 0] = idOut;
    const [d0 = 0, d1 = 0] = d;
    const [out0 = 0, out1 = 0] = out;
    expect(Math.abs(idOut0 - d0) + Math.abs(idOut1 - d1)).toBeLessThan(1e-9);
    expect(Math.abs(out0 + out1 - 1)).toBeLessThan(1e-9);
  });
});
