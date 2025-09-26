import { Contra, isContravariant } from "../contravariant";
import type { SimpleCat } from "../simple-cat";

type Obj = "B" | "N";
type Morph = {
  readonly src: Obj;
  readonly dst: Obj;
  readonly name: string;
  readonly fn: (value: unknown) => unknown;
};

const Set2: SimpleCat<Obj, Morph> = {
  id: (object) => ({
    src: object,
    dst: object,
    name: `id_${object}`,
    fn: (value) => value,
  }),
  compose: (g, f) => {
    if (!Object.is(f.dst, g.src)) {
      throw new Error("Set2: domain/codomain mismatch");
    }
    return {
      src: f.src,
      dst: g.dst,
      name: `${g.name}∘${f.name}`,
      fn: (value) => g.fn(f.fn(value)),
    };
  },
  src: (arrow) => arrow.src,
  dst: (arrow) => arrow.dst,
};

const isEven: Morph = {
  src: "N",
  dst: "B",
  name: "isEven",
  fn: (value) => typeof value === "number" && value % 2 === 0,
};

const toNat: Morph = {
  src: "B",
  dst: "N",
  name: "toNat",
  fn: (value) => (value ? 1 : 0),
};

const boolMirror: Morph = {
  src: "B",
  dst: "B",
  name: "boolMirror",
  fn: (value) => Boolean(value),
};

type ThinObj = 0 | 1;
type ThinArrow = { readonly s: ThinObj; readonly t: ThinObj };

const Thin2: SimpleCat<ThinObj, ThinArrow> = {
  id: (object) => ({ s: object, t: object }),
  compose: (g, f) => ({ s: f.s, t: g.t }),
  src: (arrow) => arrow.s,
  dst: (arrow) => arrow.t,
};

const thinF = Contra(
  Thin2,
  Set2,
  (object: ThinObj): Obj => (object === 0 ? "B" : "N"),
  (arrow: ThinArrow): Morph => {
    if (Object.is(arrow.s, arrow.t)) {
      return Set2.id(arrow.s === 0 ? "B" : "N");
    }
    return isEven;
  },
);

const thinObjects: ReadonlyArray<ThinObj> = [0, 1];
const thinArrows: ReadonlyArray<ThinArrow> = [
  { s: 0, t: 0 },
  { s: 1, t: 1 },
  { s: 0, t: 1 },
];

console.log("Thin2 example contravariant?", isContravariant(Thin2, Set2, thinF, thinObjects, thinArrows));
console.log("F1(u) src/dst", thinF.F1({ s: 0, t: 1 }).src, thinF.F1({ s: 0, t: 1 }).dst);
console.log("isEven(2), isEven(3)", [thinF.F1({ s: 0, t: 1 }).fn(2), thinF.F1({ s: 0, t: 1 }).fn(3)]);

// --- Less-thin source with genuine composites ---
type PosetObj = 0 | 1 | 2;
type PosetArrow = { readonly s: PosetObj; readonly t: PosetObj };

const Poset3: SimpleCat<PosetObj, PosetArrow> = {
  id: (object) => ({ s: object, t: object }),
  compose: (g, f) => {
    if (f.t > g.s) {
      throw new Error("Poset3: arrows must be composable");
    }
    return { s: f.s, t: g.t };
  },
  src: (arrow) => arrow.s,
  dst: (arrow) => arrow.t,
};

const posetF = Contra(
  Poset3,
  Set2,
  (object: PosetObj): Obj => (object % 2 === 0 ? "B" : "N"),
  (arrow: PosetArrow): Morph => {
    if (Object.is(arrow.s, arrow.t)) {
      return Set2.id(arrow.s % 2 === 0 ? "B" : "N");
    }
    if (arrow.s === 0 && arrow.t === 1) {
      return isEven;
    }
    if (arrow.s === 1 && arrow.t === 2) {
      return toNat;
    }
    if (arrow.s === 0 && arrow.t === 2) {
      return Set2.compose(isEven, toNat);
    }
    return boolMirror;
  },
);

const posetObjects: ReadonlyArray<PosetObj> = [0, 1, 2];
const posetArrows: ReadonlyArray<PosetArrow> = [
  { s: 0, t: 0 },
  { s: 1, t: 1 },
  { s: 2, t: 2 },
  { s: 0, t: 1 },
  { s: 1, t: 2 },
  { s: 0, t: 2 },
];

console.log("Poset3 example contravariant?", isContravariant(Poset3, Set2, posetF, posetObjects, posetArrows));
const arrow01 = { s: 0, t: 1 } as const;
const arrow12 = { s: 1, t: 2 } as const;
const arrow02 = { s: 0, t: 2 } as const;
const lhs = posetF.F1(Poset3.compose(arrow12, arrow01));
const rhs = Set2.compose(posetF.F1(arrow01), posetF.F1(arrow12));
console.log("Reversed composition holds?", lhs.name === rhs.name && lhs.fn(true) === rhs.fn(true));
console.log("Direct vs composed action on true", [posetF.F1(arrow02).fn(true), rhs.fn(true)]);
