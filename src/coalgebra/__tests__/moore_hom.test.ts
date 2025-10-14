import { describe, it, expect } from "vitest";
import type { Moore } from "../Coalgebra";
import { isCoalgebraHom } from "../Coalgebra";

/** Tiny example: states {A,B}, Sigma={0,1}, outputs O={0,1}. */
type X = "A" | "B";
const M: Moore<number, 0|1, X> = {
  carrier: ["A","B"],
  out: (x)=> x==="A"? 0 : 1,
  step: (x,a)=> (x==="A"? (a===0? "A":"B") : (a===0? "B":"A"))
};
const N: Moore<number, 0|1, X> = {
  carrier: ["A","B"],
  out: (x)=> x==="A"? 0 : 1,
  step: (x,a)=> (a===0? x : (x==="A"?"B":"A"))
};

describe("Coalgebra homomorphism preserves output and step", () => {
  const h = (x:X)=> x; // identity is trivially a hom
  it("id is a coalgebra hom M→M", () => {
    expect(isCoalgebraHom(M, M, h)).toBe(true);
  });
  it("id is a hom N→N", () => {
    expect(isCoalgebraHom(N, N, h)).toBe(true);
  });
});
