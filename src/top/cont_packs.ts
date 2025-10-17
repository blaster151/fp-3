import { registerCont } from "./ContRegistry";
import { discrete, indiscrete } from "./Topology";
import { subspace } from "./Subspace";
import { inclusion } from "./Embeddings";
import {
  makeContinuousMap,
  copair,
  coproductStructure,
  injectionLeft,
  injectionRight,
  pairing,
  productStructure,
  projection1,
  projection2,
} from "./ContinuousMap";
import { topCoequalizer, topFactorThroughCoequalizer } from "./coequalizers";

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

const coproductInfo = coproductStructure(eqNum, eqNum, TXd, TYd);
registerCont({
  tag: "Top/cont/inl:X→X⊔Y",
  morphism: injectionLeft(coproductInfo),
});
registerCont({
  tag: "Top/cont/inr:Y→X⊔Y",
  morphism: injectionRight(coproductInfo),
});

const leftFold = makeContinuousMap({
  source: TXd,
  target: TZd,
  eqSource: eqNum,
  eqTarget: eqNum,
  map: (x: number) => (x === 0 ? 42 : 99),
});
const rightFold = makeContinuousMap({
  source: TYd,
  target: TZd,
  eqSource: eqNum,
  eqTarget: eqNum,
  map: (y: number) => (y === 10 ? 42 : 99),
});
registerCont({
  tag: "Top/cont/copair:X⊔Y→Z",
  morphism: copair(leftFold, rightFold, { topology: coproductInfo.topology, eq: coproductInfo.eq }),
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

const QX: ReadonlyArray<number> = [0, 1];
const QY: ReadonlyArray<number> = [7, 8, 9, 10];
const TXq = discrete(QX);
const TYq = discrete(QY);
const qf = makeContinuousMap({
  source: TXq,
  target: TYq,
  eqSource: eqNum,
  eqTarget: eqNum,
  map: (x: number) => (x === 0 ? 7 : 8),
});
const qg = makeContinuousMap({
  source: TXq,
  target: TYq,
  eqSource: eqNum,
  eqTarget: eqNum,
  map: (x: number) => (x === 0 ? 9 : 10),
});
const qCoeq = topCoequalizer(qf, qg);
registerCont({
  tag: "Top/cont/coequalize:Y→Y∼",
  morphism: qCoeq.coequalize,
});
const TYaxis = discrete([0, 1]);
const categorize = makeContinuousMap({
  source: TYq,
  target: TYaxis,
  eqSource: eqNum,
  eqTarget: eqNum,
  map: (y: number) => (y === 7 || y === 9 ? 0 : 1),
});
const mediatorReport = topFactorThroughCoequalizer(qf, qg, qCoeq.coequalize, categorize);
if (!mediatorReport.mediator) {
  throw new Error(
    `Failed to build coequalizer mediator: ${mediatorReport.failures.join("; ") || "unknown reason"}`,
  );
}
registerCont({
  tag: "Top/cont/coequalizer-mediator:Y∼→axes",
  morphism: mediatorReport.mediator,
});
