import type { ContRegistry } from "./ContRegistry";
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
import { topPullback, topFactorThroughPullback } from "./pullbacks";
import { topPushout, topFactorThroughPushout } from "./pushouts";

export function registerContinuityPacks(registry: ContRegistry): void {
  const { register } = registry;
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
  register({
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
  register({
    tag: "Top/cont/proj1:X×Y→X",
    morphism: projection1(productInfo),
  });
  register({
    tag: "Top/cont/proj2:X×Y→Y",
    morphism: projection2(productInfo),
  });

  const coproductInfo = coproductStructure(eqNum, eqNum, TXd, TYd);
  register({
    tag: "Top/cont/inl:X→X⊔Y",
    morphism: injectionLeft(coproductInfo),
  });
  register({
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
  register({
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
  register({
    tag: "Top/cont/pair:Z→X×Y",
    morphism: pairing(fMap, gMap, { topology: productInfo.topology, eq: productInfo.eq }),
  });

  const h = (_: number) => 2;
  register({
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
  register({
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
  register({
    tag: "Top/cont/coequalizer-mediator:Y∼→axes",
    morphism: mediatorReport.mediator,
  });

  const pullA = discrete([0, 1, 2]);
  const pullB = discrete([10, 11, 12]);
  const pullTarget = discrete([0, 1]);
  const pullToTargetA = makeContinuousMap({
    source: pullA,
    target: pullTarget,
    eqSource: eqNum,
    eqTarget: eqNum,
    map: (x: number) => x % 2,
  });
  const pullToTargetB = makeContinuousMap({
    source: pullB,
    target: pullTarget,
    eqSource: eqNum,
    eqTarget: eqNum,
    map: (y: number) => (y - 10) % 2,
  });
  const pullbackWitness = topPullback(pullToTargetA, pullToTargetB);
  register({
    tag: "Top/cont/pullback:π₁",
    morphism: pullbackWitness.proj1,
  });
  register({
    tag: "Top/cont/pullback:π₂",
    morphism: pullbackWitness.proj2,
  });
  const pullConeDomain = discrete([0, 1, 2]);
  const pullConeLeft = makeContinuousMap({
    source: pullConeDomain,
    target: pullA,
    eqSource: eqNum,
    eqTarget: eqNum,
    map: (w: number) => w,
  });
  const pullConeRight = makeContinuousMap({
    source: pullConeDomain,
    target: pullB,
    eqSource: eqNum,
    eqTarget: eqNum,
    map: (w: number) => (w === 0 ? 10 : w === 1 ? 11 : 12),
  });
  const pullMediatorReport = topFactorThroughPullback(
    pullToTargetA,
    pullToTargetB,
    pullbackWitness,
    pullConeLeft,
    pullConeRight,
  );
  if (!pullMediatorReport.mediator) {
    throw new Error(
      `Failed to build pullback mediator: ${pullMediatorReport.failures.join("; ") || "unknown reason"}`,
    );
  }
  register({
    tag: "Top/cont/pullback-mediator:W→PB",
    morphism: pullMediatorReport.mediator,
  });

  const spanSource = discrete([0, 1]);
  const spanLeft = makeContinuousMap({
    source: spanSource,
    target: TXd,
    eqSource: eqNum,
    eqTarget: eqNum,
    map: (s: number) => (s === 0 ? 0 : 1),
  });
  const spanRight = makeContinuousMap({
    source: spanSource,
    target: TYd,
    eqSource: eqNum,
    eqTarget: eqNum,
    map: (s: number) => (s === 0 ? 10 : 30),
  });
  const pushoutWitness = topPushout(spanLeft, spanRight);
  register({
    tag: "Top/cont/pushout:inl",
    morphism: pushoutWitness.inl,
  });
  register({
    tag: "Top/cont/pushout:inr",
    morphism: pushoutWitness.inr,
  });
  const pushMediatorReport = topFactorThroughPushout(
    spanLeft,
    spanRight,
    pushoutWitness,
    leftFold,
    rightFold,
  );
  if (!pushMediatorReport.mediator) {
    throw new Error(
      `Failed to build pushout mediator: ${pushMediatorReport.failures.join("; ") || "unknown reason"}`,
    );
  }
  register({
    tag: "Top/cont/pushout-mediator:P→Z",
    morphism: pushMediatorReport.mediator,
  });

  const componentCarrier = [0, 1, 2, 3];
  const componentTopology = {
    carrier: componentCarrier,
    opens: [[], [0, 1], [2, 3], componentCarrier],
  } as const;
  const constantOnComponents = makeContinuousMap({
    source: componentTopology,
    target: discrete([0, 1]),
    eqSource: eqNum,
    eqTarget: eqNum,
    map: (x: number) => (x < 2 ? 0 : 1),
  });
  register({
    tag: "Top/cont/components:constant",
    morphism: constantOnComponents,
  });
}
