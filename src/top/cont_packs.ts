import { registerCont } from "./ContRegistry";
import { discrete, indiscrete, product } from "./Topology";
import { subspace } from "./Subspace";
import { inclusion } from "./Embeddings";
import { pair, proj1, proj2 } from "./ProductUP";

const eqNum = (a: number, b: number) => a === b;

const X = [0, 1, 2] as const;
const Y = [10, 20, 30] as const;
const Z = [42, 99] as const;

const TXd = discrete(X);
const TYd = discrete(Y);
const TZd = discrete(Z);
const TXi = indiscrete(X);

const S = [0, 2] as const;
const TS = subspace(eqNum, TXd, S);
registerCont({
  tag: "Top/cont/subspace-inclusion:S↪X",
  eqDom: eqNum,
  TA: TS,
  TB: TXd,
  f: inclusion(eqNum, S, X),
  eqCod: eqNum,
});

const eqPair = (p: { readonly x: number; readonly y: number }, q: { readonly x: number; readonly y: number }) =>
  p.x === q.x && p.y === q.y;

const Tprod = product(eqNum, eqNum, TXd, TYd);
registerCont({
  tag: "Top/cont/proj1:X×Y→X",
  eqDom: eqPair,
  TA: Tprod,
  TB: TXd,
  f: proj1,
  eqCod: eqNum,
});
registerCont({
  tag: "Top/cont/proj2:X×Y→Y",
  eqDom: eqPair,
  TA: Tprod,
  TB: TYd,
  f: proj2,
  eqCod: eqNum,
});

const f = (z: number) => (z === 42 ? 0 : 1);
const g = (_: number) => 20;
registerCont({
  tag: "Top/cont/pair:Z→X×Y",
  eqDom: eqNum,
  TA: TZd,
  TB: Tprod,
  f: pair(f, g),
  eqCod: eqPair,
});

const h = (_: number) => 2;
registerCont({
  tag: "Top/cont/to-indiscrete:Z→Xi",
  eqDom: eqNum,
  TA: TZd,
  TB: TXi,
  f: h,
  eqCod: eqNum,
});
