import { registerCont } from "./ContRegistry";
import { discrete, indiscrete } from "./Topology";
import { subspace } from "./Subspace";
import { inclusion } from "./Embeddings";
import {
  makeContinuousMap,
  pairing,
  productStructure,
  projection1,
  projection2,
} from "./ContinuousMap";

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
  morphism: makeContinuousMap({
    source: TS,
    target: TXd,
    eqSource: eqNum,
    eqTarget: eqNum,
    map: inclusion(eqNum, S, X),
  }),
});

const productInfo = productStructure(eqNum, eqNum, TXd, TYd);
registerCont({
  tag: "Top/cont/proj1:X×Y→X",
  morphism: projection1(productInfo),
});
registerCont({
  tag: "Top/cont/proj2:X×Y→Y",
  morphism: projection2(productInfo),
});

const f = (z: number) => (z === 42 ? 0 : 1);
const g = (_: number) => 20;
const fMap = makeContinuousMap({
  source: TZd,
  target: TXd,
  eqSource: eqNum,
  eqTarget: eqNum,
  map: f,
});
const gMap = makeContinuousMap({
  source: TZd,
  target: TYd,
  eqSource: eqNum,
  eqTarget: eqNum,
  map: g,
});
registerCont({
  tag: "Top/cont/pair:Z→X×Y",
  morphism: pairing(fMap, gMap, { topology: productInfo.topology, eq: productInfo.eq }),
});

const h = (_: number) => 2;
registerCont({
  tag: "Top/cont/to-indiscrete:Z→Xi",
  morphism: makeContinuousMap({
    source: TZd,
    target: TXi,
    eqSource: eqNum,
    eqTarget: eqNum,
    map: h,
  }),
});
