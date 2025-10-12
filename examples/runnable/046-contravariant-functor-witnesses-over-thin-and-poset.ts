import { Contra, isContravariant } from "../../contravariant";
import type { SimpleCat } from "../../simple-cat";
import { RunnableExample } from "./types";

type BoolNatObj = "B" | "N";
type BoolNatMorph = {
  readonly src: BoolNatObj;
  readonly dst: BoolNatObj;
  readonly name: string;
  readonly fn: (value: unknown) => unknown;
};

type ThinObj = 0 | 1;
type ThinArrow = { readonly s: ThinObj; readonly t: ThinObj };

type PosetObj = 0 | 1 | 2;
type PosetArrow = { readonly s: PosetObj; readonly t: PosetObj };

const Set2: SimpleCat<BoolNatObj, BoolNatMorph> = {
  id: (object: BoolNatObj) => ({
    src: object,
    dst: object,
    name: `id_${object}`,
    fn: (value: unknown) => value,
  }),
  compose: (g: BoolNatMorph, f: BoolNatMorph) => {
    if (!Object.is(f.dst, g.src)) {
      throw new Error("Set2: domain/codomain mismatch");
    }
    return {
      src: f.src,
      dst: g.dst,
      name: `${g.name}∘${f.name}`,
      fn: (value: unknown) => g.fn(f.fn(value)),
    };
  },
  src: (arrow: BoolNatMorph) => arrow.src,
  dst: (arrow: BoolNatMorph) => arrow.dst,
};

const isEven: BoolNatMorph = {
  src: "N",
  dst: "B",
  name: "isEven",
  fn: (value) => typeof value === "number" && value % 2 === 0,
};

const toNat: BoolNatMorph = {
  src: "B",
  dst: "N",
  name: "toNat",
  fn: (value) => (value ? 1 : 0),
};

const boolMirror: BoolNatMorph = {
  src: "B",
  dst: "B",
  name: "boolMirror",
  fn: (value) => Boolean(value),
};

const Thin2: SimpleCat<ThinObj, ThinArrow> = {
  id: (object: ThinObj) => ({ s: object, t: object }),
  compose: (g: ThinArrow, f: ThinArrow) => ({ s: f.s, t: g.t }),
  src: (arrow: ThinArrow) => arrow.s,
  dst: (arrow: ThinArrow) => arrow.t,
};

const Poset3: SimpleCat<PosetObj, PosetArrow> = {
  id: (object: PosetObj) => ({ s: object, t: object }),
  compose: (g: PosetArrow, f: PosetArrow) => {
    if (f.t > g.s) {
      throw new Error("Poset3: arrows must be composable");
    }
    return { s: f.s, t: g.t };
  },
  src: (arrow: PosetArrow) => arrow.s,
  dst: (arrow: PosetArrow) => arrow.t,
};

export const stage046ContravariantFunctorWitnessesOverThinAndPoset: RunnableExample = {
  id: "046",
  title: "Contravariant functor witnesses over Thin₂ and Poset₃",
  outlineReference: 46,
  summary:
    "Build Set-valued contravariant functors from thin/poset categories, confirm reversed compositions, and inspect evaluation on samples.",
  async run() {
    const thinSection = (() => {
      const thinF = Contra(
        Thin2,
        Set2,
        (object: ThinObj): BoolNatObj => (object === 0 ? "B" : "N"),
        (arrow: ThinArrow): BoolNatMorph => {
          if (Object.is(arrow.s, arrow.t)) {
            return Set2.id(arrow.s === 0 ? "B" : "N");
          }
          return isEven;
        },
      );

      const objects: ReadonlyArray<ThinObj> = [0, 1];
      const arrows: ReadonlyArray<ThinArrow> = [
        { s: 0, t: 0 },
        { s: 1, t: 1 },
        { s: 0, t: 1 },
      ];

      const contravariant = isContravariant(Thin2, Set2, thinF, objects, arrows);
      const action = thinF.F1({ s: 0, t: 1 });

      return [
        "== Thin₂ contravariant witness ==",
        `Functor passes contravariant checks → ${contravariant ? "yes" : "no"}`,
        `F₁(0≤1) acts as → ${action.name}`,
        `F₁(0≤1) on 2,3 → ${JSON.stringify([action.fn(2), action.fn(3)])}`,
      ];
    })();

    const posetSection = (() => {
      const posetF = Contra(
        Poset3,
        Set2,
        (object: PosetObj): BoolNatObj => (object % 2 === 0 ? "B" : "N"),
        (arrow: PosetArrow): BoolNatMorph => {
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

      const objects: ReadonlyArray<PosetObj> = [0, 1, 2];
      const arrows: ReadonlyArray<PosetArrow> = [
        { s: 0, t: 0 },
        { s: 1, t: 1 },
        { s: 2, t: 2 },
        { s: 0, t: 1 },
        { s: 1, t: 2 },
        { s: 0, t: 2 },
      ];

      const contravariant = isContravariant(Poset3, Set2, posetF, objects, arrows);
      const arrow01 = { s: 0, t: 1 } as const;
      const arrow12 = { s: 1, t: 2 } as const;
      const composed = posetF.F1(Poset3.compose(arrow12, arrow01));
      const reversed = Set2.compose(posetF.F1(arrow01), posetF.F1(arrow12));
      const equality = composed.name === reversed.name && composed.fn(true) === reversed.fn(true);
      const direct = posetF.F1({ s: 0, t: 2 });

      return [
        "== Poset₃ contravariant witness ==",
        `Functor passes contravariant checks → ${contravariant ? "yes" : "no"}`,
        `Reversed composition respected → ${equality ? "yes" : "no"}`,
        `Direct vs composed action on true → ${JSON.stringify([direct.fn(true), reversed.fn(true)])}`,
      ];
    })();

    return {
      logs: [...thinSection, ...posetSection],
    };
  },
};
