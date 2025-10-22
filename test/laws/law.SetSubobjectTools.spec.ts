import { describe, expect, it } from "vitest";

import {
  listSetSubobjects,
  setSubobjectIntersection,
  compareSetSubobjectIntersections,
  setSubobjectLeq,
  setSubobjectPartialOrder,
  setIdentitySubobject,
  setZeroSubobject,
  setTopSubobject,
  setBottomSubobject,
  setCharacteristicComplement,
  setComplementSubobject,
  setMonomorphismEqualizer,
  setMonicEpicIso,
  SetOmega,
  type AnySetHom,
  type SetHom,
} from "../../set-subobject-classifier";
import { SetCat } from "../../set-cat";

const expectSetEqual = <A>(left: ReadonlySet<A>, right: ReadonlySet<A>) => {
  expect(left.size).toBe(right.size);
  for (const value of left) {
    expect(right.has(value)).toBe(true);
  }
};

const toAny = <A, B>(hom: SetHom<A, B>): AnySetHom => hom as unknown as AnySetHom;

type WithId = { readonly id: number };

describe("Set subobject toolbox", () => {
  it("enumerates canonical subobjects of finite ambients", () => {
    const ambient = SetCat.obj(["a0"]);
    const enumeration = listSetSubobjects(ambient);
    expect(enumeration).toHaveLength(2);

    const empty = enumeration.find((entry) => entry.witness.subobject.size === 0);
    const total = enumeration.find((entry) => entry.witness.subobject.size === 1);
    expect(empty?.witness.inclusion.dom.size).toBe(0);
    expect(total?.witness.inclusion.dom.size).toBe(1);

    const triple = SetCat.obj(["x0", "x1", "x2"]);
    const tripleEnumeration = listSetSubobjects(triple);
    expect(tripleEnumeration).toHaveLength(8);
  });

  it("computes intersections via pullbacks", () => {
    const ambient = SetCat.obj(["a0", "a1", "a2"]);
    const leftSubset = SetCat.obj(["a0", "a1"]);
    const rightSubset = SetCat.obj(["a1", "a2"]);

    const includeLeft: SetHom<string, string> = SetCat.hom(
      leftSubset,
      ambient,
      (value: string) => value,
    );
    const includeRight: SetHom<string, string> = SetCat.hom(
      rightSubset,
      ambient,
      (value: string) => value,
    );

    const witness = setSubobjectIntersection(toAny(includeLeft), toAny(includeRight));

    expect(witness.intersection.subobject.size).toBe(1);
    expect(witness.intersection.subobject.has("a1")).toBe(true);

    const identityCone = witness.factorCone(witness.pullback);
    expect(identityCone.factored).toBe(true);
    expect(identityCone.mediator).toBeDefined();
  });

  it("compares intersection witnesses via pullback isomorphisms", () => {
    const ambient = SetCat.obj(["a0", "a1", "a2"]);
    const leftSubset = SetCat.obj(["a0", "a1"]);
    const rightSubset = SetCat.obj(["a1", "a2"]);

    const includeLeft = SetCat.hom(leftSubset, ambient, (value: string) => value);
    const includeRight = SetCat.hom(rightSubset, ambient, (value: string) => value);

    const canonical = setSubobjectIntersection(toAny(includeLeft), toAny(includeRight));
    const manual = setSubobjectIntersection(toAny(includeLeft), toAny(includeRight));

    const iso = compareSetSubobjectIntersections(
      toAny(includeLeft),
      toAny(includeRight),
      canonical,
      manual,
    );

    const leftRoundTrip = SetCat.compose(iso.backward, iso.forward);
    expect(leftRoundTrip.dom).toBe(canonical.pullback.apex);
    expect(leftRoundTrip.cod).toBe(canonical.pullback.apex);
  });

  it("detects the subobject preorder via factorisations", () => {
    const ambient = SetCat.obj(["a0", "a1", "a2"]);
    const small = SetCat.obj(["a0"]);
    const medium = SetCat.obj(["a0", "a1"]);

    const includeSmall = SetCat.hom(small, ambient, (value: string) => value);
    const includeMedium = SetCat.hom(medium, ambient, (value: string) => value);

    const verdict = setSubobjectLeq(toAny(includeSmall), toAny(includeMedium));
    expect(verdict.holds).toBe(true);
    expect(verdict.mediator).toBeDefined();

    const failure = setSubobjectLeq(toAny(includeMedium), toAny(includeSmall));
    expect(failure.holds).toBe(false);
    expect(failure.reason).toMatch(/lower subobject/i);
  });

  it("respects registered semantics when comparing subobject membership", () => {
    const equals = (left: WithId, right: WithId): boolean => left.id === right.id;
    const ambientSeed: ReadonlyArray<WithId> = [{ id: 0 }, { id: 1 }];
    const ambient = SetCat.obj<WithId>(ambientSeed, { equals, tag: "SemanticAmbient" });

    const [representative] = Array.from(ambient);
    if (!representative) {
      throw new Error("Semantic ambient must expose at least one element.");
    }

    const upperSeed: ReadonlyArray<WithId> = [representative];
    const upper = SetCat.obj<WithId>(upperSeed, { equals, tag: "SemanticUpper" });
    const lowerSeed: ReadonlyArray<WithId> = [{ id: representative.id }];
    const lower = SetCat.obj<WithId>(lowerSeed, { equals, tag: "SemanticLower" });

    const includeUpper = SetCat.hom<WithId, WithId>(upper, ambient, (value) => value);
    const includeLower = SetCat.hom<WithId, WithId>(lower, ambient, (value) => ({
      id: value.id,
    } as WithId));

    const verdict = setSubobjectLeq(toAny(includeLower), toAny(includeUpper));
    expect(verdict.holds).toBe(true);
    expect(verdict.mediator).toBeDefined();

    const mediator = verdict.mediator as SetHom<WithId, WithId>;
    const recomposed = SetCat.compose(includeUpper, mediator);
    const ambientSemantics = SetCat.semantics(ambient);
    for (const element of lower) {
      const recomposedImage = recomposed.map(element);
      const originalImage = includeLower.map(element);
      if (!ambientSemantics?.equals) {
        expect(recomposedImage).toBe(originalImage);
      } else {
        expect(ambientSemantics.equals(recomposedImage, originalImage)).toBe(true);
      }
    }
  });

  it("builds the subobject partial order isomorphism when inclusions factor both ways", () => {
    const ambient = SetCat.obj(["a0", "a1"]);
    const left = SetCat.hom(ambient, ambient, (value: string) => value);
    const right = SetCat.hom(ambient, ambient, (value: string) => value);

    const verdict = setSubobjectPartialOrder(toAny(left), toAny(right));
    expect(verdict.leftLeqRight.holds).toBe(true);
    expect(verdict.rightLeqLeft.holds).toBe(true);
    expect(verdict.isomorphic).toBeDefined();
  });

  it("exposes the top and bottom subobjects", () => {
    const ambient = SetCat.obj(["a0", "a1"]);
    const top = setTopSubobject(ambient);
    const bottom = setBottomSubobject(ambient);

    expectSetEqual(top.top.subobject, ambient);
    expect(bottom.bottom.subobject.size).toBe(0);

    const dominance = top.dominates(top.top.inclusion);
    expect(dominance.holds).toBe(true);

    const subordination = bottom.subordinate(bottom.bottom.inclusion);
    expect(subordination.holds).toBe(true);
  });

  it("computes characteristic complements and complement subobjects", () => {
    const ambient = SetCat.obj(["a0", "a1", "a2"]);
    const subset = SetCat.obj(["a0", "a1"]);
    const inclusion = SetCat.hom(subset, ambient, (value: string) => value);

    const characteristic = SetCat.hom(ambient, SetOmega, (value: string) => subset.has(value));
    const complementCharacteristic = setCharacteristicComplement(characteristic);

    expect(complementCharacteristic.dom).toBe(ambient);
    expect(complementCharacteristic.cod).toBe(SetOmega);
    expect(complementCharacteristic.map("a2")).toBe(true);

    const complement = setComplementSubobject(toAny(inclusion));
    expect(complement.complement.subobject.has("a2")).toBe(true);
    expect(complement.complement.subobject.size).toBe(1);
  });

  it("exhibits monomorphisms as equalizers", () => {
    const domain = SetCat.obj(["d0", "d1"]);
    const codomain = SetCat.obj(["c0", "c1", "c2"]);

    const monomorphism: SetHom<string, string> = SetCat.hom(
      domain,
      codomain,
      (value: string) => (value === "d0" ? "c2" : "c0"),
    );

    const witness = setMonomorphismEqualizer(toAny(monomorphism));
    expect(witness.canonical.subobject.size).toBe(2);
    expect(witness.equalizer.equalize.dom).toBe(witness.canonical.subobject);

    const wedge = SetCat.obj(["w0"]);
    const fork = SetCat.hom(wedge, codomain, () => "c2");

    const factoring = witness.factorMonomorphism({
      left: toAny(witness.characteristic as SetHom<unknown, boolean>),
      right: toAny(witness.truthComposite as SetHom<unknown, boolean>),
      inclusion: toAny(monomorphism),
      fork: toAny(fork),
    });
    expect(factoring.factored).toBe(true);
    expect(factoring.mediator).toBeDefined();
  });

  it("constructs inverses for bijective Set arrows", () => {
    const domain = SetCat.obj(["x0", "x1"]);
    const codomain = SetCat.obj(["y0", "y1"]);

    const bijection = SetCat.hom(
      domain,
      codomain,
      (value: string) => (value === "x0" ? "y1" : "y0"),
    );
    const isoVerdict = setMonicEpicIso(toAny(bijection));

    expect(isoVerdict.found).toBe(true);
    const witness = isoVerdict.witness!;

    const leftComposite = SetCat.compose(witness.backward, witness.forward);
    expect(leftComposite.dom).toBe(domain);
    expect(leftComposite.cod).toBe(domain);

    const rightComposite = SetCat.compose(witness.forward, witness.backward);
    expect(rightComposite.dom).toBe(codomain);
    expect(rightComposite.cod).toBe(codomain);
  });

  it("inverts bijections using codomain equality semantics", () => {
    const equals = (left: WithId, right: WithId): boolean => left.id === right.id;

    const domainSeed: ReadonlyArray<WithId> = [{ id: 0 }, { id: 1 }];
    const codomainSeed: ReadonlyArray<WithId> = [{ id: 0 }, { id: 1 }];

    const domain = SetCat.obj<WithId>(domainSeed, { equals, tag: "SemanticIsoDomain" });
    const codomain = SetCat.obj<WithId>(codomainSeed, { equals, tag: "SemanticIsoCodomain" });

    const bijection = SetCat.hom<WithId, WithId>(domain, codomain, (value) =>
      ({ id: value.id === 0 ? 1 : 0 } as WithId),
    );

    const verdict = setMonicEpicIso(toAny(bijection));
    expect(verdict.found).toBe(true);
    const witness = verdict.witness!;

    const backward = witness.backward as SetHom<WithId, WithId>;
    const forward = witness.forward as SetHom<WithId, WithId>;

    const codSemantics = SetCat.semantics(codomain);
    const domainSemantics = SetCat.semantics(domain);

    for (const element of codomain) {
      const preimage = backward.map(element);
      const roundTrip = forward.map(preimage);
      if (!codSemantics?.equals) {
        expect(roundTrip).toBe(element);
      } else {
        expect(codSemantics.equals(roundTrip, element)).toBe(true);
      }
    }

    for (const element of domain) {
      const image = forward.map(element);
      const recovered = backward.map(image);
      if (!domainSemantics?.equals) {
        expect(recovered).toBe(element);
      } else {
        expect(domainSemantics.equals(recovered, element)).toBe(true);
      }
    }
  });

  it("rejects non-epic monomorphisms", () => {
    const domain = SetCat.obj(["x0", "x1"]);
    const codomain = SetCat.obj(["y0", "y1", "y2"]);

    const mono = SetCat.hom(
      domain,
      codomain,
      (value: string) => (value === "x0" ? "y0" : "y1"),
    );
    const verdict = setMonicEpicIso(toAny(mono));

    expect(verdict.found).toBe(false);
    expect(verdict.reason).toMatch(/not epic/i);
  });

  it("recognises identity and zero subobjects", () => {
    const ambient = SetCat.obj(["a0", "a1"]);
    const identity = setIdentitySubobject(ambient);
    const zero = setZeroSubobject(ambient);

    expect(identity.inclusion.dom).toBe(ambient);
    expect(zero.subobject.size).toBe(0);
  });
});
