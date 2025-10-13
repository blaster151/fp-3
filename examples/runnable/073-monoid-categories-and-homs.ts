import type { Monoid } from "../../monoid-cat";
import type { MonoidHom } from "../../mon-cat";
import type { RunnableExample } from "./types";

declare function require(id: string): any;

type MonoidCategoryModule = {
  readonly MonoidCat: <M>(monoid: Monoid<M>) => {
    readonly obj: () => { readonly _tag: "★" };
    readonly id: () => { readonly elt: M };
    readonly hom: (m: M) => { readonly elt: M };
    readonly compose: (g: { readonly elt: M }, f: { readonly elt: M }) => { readonly elt: M };
  };
};

type MonCatModule = {
  readonly MonCat: {
    readonly hom: <A, B>(
      dom: Monoid<A>,
      cod: Monoid<B>,
      map: (value: A) => B,
    ) => MonoidHom<A, B>;
    readonly id: <M>(monoid: Monoid<M>) => MonoidHom<M, M>;
    readonly compose: <A, B, C>(g: MonoidHom<B, C>, f: MonoidHom<A, B>) => MonoidHom<A, C>;
    readonly isHom: <A, B>(h: MonoidHom<A, B>) => boolean;
  };
};

const { MonoidCat } = require("../../monoid-cat") as MonoidCategoryModule;
const { MonCat } = require("../../mon-cat") as MonCatModule;

const Z4: Monoid<number> = {
  e: 0,
  op: (a, b) => (a + b) % 4,
  elements: [0, 1, 2, 3],
};

const parity: Monoid<number> = {
  e: 0,
  op: (a, b) => (a + b) % 2,
  elements: [0, 1],
};

const boolAnd: Monoid<boolean> = {
  e: true,
  op: (a, b) => a && b,
  elements: [true, false],
};

function describeHom<A, B>(label: string, hom: MonoidHom<A, B>, samples: readonly A[]): readonly string[] {
  const unitImage = hom.map(hom.dom.e);
  const table = samples.map((value) => {
    const image = hom.map(value);
    const pair = hom.dom.op(value, hom.dom.e);
    const composite = hom.cod.op(hom.map(value), hom.map(hom.dom.e));
    return `  • ${String(value)} ↦ ${String(image)}  (x·e ↦ ${String(pair)}; f(x)·f(e) = ${String(composite)})`;
  });
  return [`${label}:`, `  unit ↦ ${String(unitImage)}`, ...table];
}

function exploreMonCat(): readonly string[] {
  const toParity = MonCat.hom(Z4, parity, (n) => n % 2);
  const parityId = MonCat.id(parity);
  const doubling = MonCat.hom(Z4, Z4, (n) => (2 * n) % 4);
  const composed = MonCat.compose(toParity, doubling);
  const boolFromParity = MonCat.hom(parity, boolAnd, (bit) => bit === 0);

  const checks = [
    `toParity is hom: ${MonCat.isHom(toParity)}`,
    `parityId is hom: ${MonCat.isHom(parityId)}`,
    `doubling is hom: ${MonCat.isHom(doubling)}`,
    `composed (double then parity) is hom: ${MonCat.isHom(composed)}`,
    `boolFromParity is hom: ${MonCat.isHom(boolFromParity)}`,
  ];

  return [
    "== MonCat homomorphisms ==",
    ...describeHom("Z4 → Parity", toParity, Z4.elements ?? []),
    ...describeHom("Z4 doubling", doubling, Z4.elements ?? []),
    ...describeHom("Z4 doubling followed by parity", composed, Z4.elements ?? []),
    ...describeHom("Parity → Bool∧", boolFromParity, parity.elements ?? []),
    ...checks,
  ];
}

function exploreMonoidCategory(): readonly string[] {
  const category = MonoidCat(Z4);
  const one = category.hom(1);
  const two = category.hom(2);
  const composed = category.compose(two, one);
  const identity = category.id();
  const table = [
    `id★ element: ${identity.elt}`,
    `arrow for 1: ${one.elt}`,
    `arrow for 2: ${two.elt}`,
    `two ∘ one element: ${composed.elt}`,
  ];
  return ["== One-object category from Z4 ==", ...table];
}

export const stage073MonoidCategoriesAndHoms: RunnableExample = {
  id: "073",
  title: "Monoid categories and homomorphisms",
  outlineReference: 73,
  summary:
    "Inspect monoid homomorphisms in MonCat and the induced one-object category for Z₄, verifying unit preservation and composition.",
  run: async () => ({
    logs: [
      ...exploreMonCat(),
      "",
      ...exploreMonoidCategory(),
    ],
  }),
};

