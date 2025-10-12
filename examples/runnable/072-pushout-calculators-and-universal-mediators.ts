import type { FiniteCategory } from "../../finite-cat";
import type { PushoutCalc, PushoutData } from "../../pushout";
import { RunnableExample } from "./types";

declare function require(id: string): any;

type PushoutArrow = { readonly name: string; readonly src: string; readonly dst: string };

type PushoutFixture = {
  readonly PushoutCategory: FiniteCategory<string, PushoutArrow>;
  readonly getArrow: (name: string) => PushoutArrow;
};

type PushoutModule = {
  readonly makeFinitePushoutCalc: <Obj, Arr>(base: FiniteCategory<Obj, Arr>) => PushoutCalc<Obj, Arr>;
};

type PushoutToyModule = {
  readonly makeToyPushouts: <Obj, Arr>(base: FiniteCategory<Obj, Arr>) => PushoutCalc<Obj, Arr>;
};

const { makeFinitePushoutCalc } = require("../../pushout") as PushoutModule;
const { makeToyPushouts } = require("../../pushout-toy") as PushoutToyModule;
const { PushoutCategory, getArrow } = require("../../test/pushout-fixture") as PushoutFixture;

function describePushout(label: string, data: PushoutData<string, PushoutArrow>): readonly string[] {
  return [
    `${label}: apex ${data.apex}`,
    `  • induced from domain: ${data.fromDomain.name}: ${data.fromDomain.src} → ${data.fromDomain.dst}`,
    `  • induced from anchor: ${data.fromAnchor.name}: ${data.fromAnchor.src} → ${data.fromAnchor.dst}`,
  ];
}

function compareLegs(
  finite: PushoutData<string, PushoutArrow>,
  toy: PushoutData<string, PushoutArrow>,
): readonly string[] {
  const sameApex = finite.apex === toy.apex;
  const sameDomainLeg = finite.fromDomain.name === toy.fromDomain.name;
  const sameAnchorLeg = finite.fromAnchor.name === toy.fromAnchor.name;
  return [
    `Apex alignment: ${finite.apex} ${sameApex ? "matches" : "differs from"} toy apex ${toy.apex}`,
    `Domain leg alignment: ${finite.fromDomain.name} ${sameDomainLeg ? "matches" : "differs from"} toy ${toy.fromDomain.name}`,
    `Anchor leg alignment: ${finite.fromAnchor.name} ${sameAnchorLeg ? "matches" : "differs from"} toy ${toy.fromAnchor.name}`,
  ];
}

function runPushoutComparisons(): readonly string[] {
  const calculator = makeFinitePushoutCalc(PushoutCategory);
  const toyCalculator = makeToyPushouts(PushoutCategory);

  const f = getArrow("f");
  const g = getArrow("g");
  const h = getArrow("h");
  const j = getArrow("j");

  const qf = calculator.pushout(f, h);
  const qg = calculator.pushout(g, h);
  const toyQf = toyCalculator.pushout(f, h);
  const toyQg = toyCalculator.pushout(g, h);

  const mediator = calculator.coinduce(j, qg, qf);
  const toyMediator = toyCalculator.coinduce(j, toyQg, toyQf);

  return [
    "== Finite pushout calculator ==",
    ...describePushout("Pushout(f,h)", qf),
    ...describePushout("Pushout(g,h)", qg),
    "Mediator induced along j: " + mediator.name,
    "",
    "== Toy pushout calculator ==",
    ...describePushout("Pushout(f,h)", toyQf),
    ...describePushout("Pushout(g,h)", toyQg),
    "Mediator induced along j: " + toyMediator.name,
    "",
    "== Alignment between calculators ==",
    ...compareLegs(qf, toyQf),
    ...compareLegs(qg, toyQg),
  ];
}

export const stage072PushoutCalculatorsAndUniversalMediators: RunnableExample = {
  id: "072",
  title: "Pushout calculators and universal mediators",
  outlineReference: 72,
  summary:
    "Contrast the finite pushout search with the toy calculator and replay the universal mediating map in the standard pushout fixture.",
  run: async () => ({ logs: runPushoutComparisons() }),
};

