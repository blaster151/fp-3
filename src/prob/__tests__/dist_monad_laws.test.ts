import { describe, it, expect } from "vitest";
import { DistMonad, eqDist } from "../Dist";

const eqNum = (a:number,b:number)=>a===b;

describe("Dist monad laws (sampled)", () => {
  const of = DistMonad.of, ch = DistMonad.chain;

  it("left identity: of(a) >>= f == f(a)", () => {
    const f = (a:number)=> [{x:a+1,p:0.4},{x:a+2,p:0.6}];
    for (const a of [0,1,2,5]) {
      const lhs = ch(of(a), f);
      const rhs = f(a);
      expect(eqDist(eqNum, lhs, rhs)).toBe(true);
    }
  });

  it("right identity: m >>= of == m", () => {
    const ms = [
      of(1),
      [{x:1,p:0.3},{x:2,p:0.7}],
      [{x:0,p:0.2},{x:0,p:0.8}]
    ];
    for (const m of ms) {
      const lhs = ch(m, of);
      expect(eqDist(eqNum, lhs, m)).toBe(true);
    }
  });

  it("associativity: (m >>= f) >>= g == m >>= (a => f(a) >>= g)", () => {
    const f = (a:number)=> [{x:a+1,p:0.5},{x:a*2,p:0.5}];
    const g = (b:number)=> [{x:b-1,p:0.3},{x:b+3,p:0.7}];
    const ms = [
      [{x:1,p:1}],
      [{x:2,p:0.4},{x:3,p:0.6}],
    ];
    for (const m of ms) {
      const lhs = ch(ch(m,f), g);
      const rhs = ch(m, a => ch(f(a), g));
      expect(eqDist(eqNum, lhs, rhs)).toBe(true);
    }
  });

  it("map respects identity", () => {
    const m = [{x:1,p:0.4},{x:2,p:0.6}];
    const id = (x:number)=>x;
    expect(eqDist(eqNum, DistMonad.map(m,id), m)).toBe(true);
  });
});
