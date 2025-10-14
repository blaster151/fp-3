import { registerCont } from "./ContRegistry";
import { discrete, indiscrete, product } from "./Topology";
import { subspace } from "./Subspace";
import { inclusion } from "./Embeddings";
import { pair, proj1, proj2 } from "./ProductUP";

const eqNum = (a: number, b: number) => a === b;

const X: ReadonlyArray<number> = [0, 1, 2];
const Y: ReadonlyArray<number> = [10, 20, 30];
const Z: ReadonlyArray<number> = [42, 99];

const TXd = discrete(X);
const TYd = discrete(Y);
const TZd = discrete(Z);
const TXi = indiscrete(X);

const S: ReadonlyArray<number> = [0, 2];
const TS = subspace(eqNum, TXd, S);
registerCont({
  tag: "Top/cont/subspace-inclusion:S↪X",
  eqDom: eqNum,
  TA: TS,
  TB: TXd,
  f: inclusion(eqNum, S, X),
  eqCod: eqNum,
});

type XYPair = { readonly x: number; readonly y: number };

const eqPair = (p: XYPair, q: XYPair) => p.x === q.x && p.y === q.y;

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
