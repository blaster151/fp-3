import { describe, expect, it } from "vitest"

import { lens, prism } from "../src/optics/lens-prism"
import { composeOptional, optional, optionalProp, prismToOptional } from "../src/optics/optional-traversal"
import { None, Some, isSome } from "../option"
import { checkLensLaws, checkOptionalLaws, checkPrismLaws } from "../oracles/optics"
import { readOptionalWitness, readPrismWitness } from "../src/optics/witness"

import type { Lens, Prism } from "../src/optics/lens-prism"
import type { Optional } from "../src/optics/optional-traversal"
import type { Applicative, FunctorValue } from "../typeclasses"
import {
  fromLens,
  fromOptional,
  fromPrism,
  starWander,
  toLens,
  toOptional,
  toPrism,
  toTraversal,
} from "../src/optics/profunctor"
import type {
  HKP,
  LensLike,
  OptionalLike,
  PrismLike,
  TraversalLike,
} from "../src/optics/profunctor"

type Person = { readonly name: string; readonly age: number; readonly nickname?: string }

type Shape =
  | { readonly kind: "circle"; readonly radius: number }
  | { readonly kind: "square"; readonly side: number }

const eqPerson = (left: Person, right: Person): boolean =>
  left.name === right.name && left.age === right.age && left.nickname === right.nickname

const eqShape = (left: Shape, right: Shape): boolean => {
  if (left.kind !== right.kind) return false
  if (left.kind === "circle" && right.kind === "circle") {
    return left.radius === right.radius
  }
  if (left.kind === "square" && right.kind === "square") {
    return left.side === right.side
  }
  return false
}

describe("Profunctor optics", () => {
  describe("witness surfaces", () => {
    it("captures focus misses for base optionals", () => {
      const nickname: Optional<Person, string> = optional<Person, string>(
        (person) => (person.nickname == null ? None : Some(person.nickname)),
        (nick, person) => ({ ...person, nickname: nick }),
      )

      const witness = readOptionalWitness(nickname)
      expect(witness).toBeDefined()

      const miss = witness!.focus({ name: "Ada", age: 32 })
      expect(miss.tag).toBe("miss")
      if (miss.tag !== "miss") {
        throw new Error("Expected optional focus to miss when nickname is absent")
      }
      expect(miss.reason.tag).toBe("absent")
    })

    it("threads composition misses from outer optionals", () => {
      type Alias = { readonly short?: string }
      type AliasHolder = Person & { readonly alias?: Alias }

      const aliasOptional = optionalProp<AliasHolder>()("alias")
      const shortOptional = optionalProp<Alias>()("short")
      const composed: Optional<AliasHolder, string> =
        composeOptional<AliasHolder, Alias, string>(shortOptional)(aliasOptional)

      const witness = readOptionalWitness(composed)
      expect(witness).toBeDefined()

      const miss = witness!.focus({ name: "Ada", age: 32 } as AliasHolder)
      expect(miss.tag).toBe("miss")
      if (miss.tag !== "miss") {
        throw new Error("Expected composed optional to miss when alias is absent")
      }
      expect(miss.reason.tag).toBe("absent")
    })

    it("propagates prism rejection details into optional updates", () => {
      const circle: Prism<Shape, number> = prism<Shape, number>(
        (shape) => (shape.kind === "circle" ? Some(shape.radius) : None),
        (radius) => ({ kind: "circle", radius }),
      )

      const optionalCircle = prismToOptional(circle)
      const witness = readOptionalWitness(optionalCircle)
      expect(witness).toBeDefined()

      const update = witness!.update({ kind: "square", side: 3 }, 5)
      expect(update.tag).toBe("skipped")
      if (update.tag !== "skipped") {
        throw new Error("Expected optional update to skip when prism rejects the focus")
      }
      expect(update.reason.tag).toBe("absent")

      const prismWitness = readPrismWitness(circle)
      expect(prismWitness).toBeDefined()

      const reject = prismWitness!.match({ kind: "square", side: 3 })
      expect(reject.tag).toBe("reject")
      if (reject.tag !== "reject") {
        throw new Error("Expected prism witness to reject non-circle shapes")
      }
      expect(reject.reason.tag).toBe("absent")
    })
  })

  it("round-trips a lens", () => {
    const original: Lens<Person, string> = lens(
      (person) => person.name,
      (name, person) => ({ ...person, name }),
    )

    const lifted: LensLike<Person, Person, string, string> = fromLens(original)
    const roundTripped = toLens(lifted)

    const sample: Person = { name: "Ada", age: 32 }

    expect(roundTripped.get(sample)).toBe(original.get(sample))
    expect(roundTripped.set("Grace")(sample)).toEqual({ name: "Grace", age: 32 })
  })

  it("round-trips a prism", () => {
    const circle: Prism<Shape, number> = prism<Shape, number>(
      (shape) => (shape.kind === "circle" ? Some(shape.radius) : None),
      (radius) => ({ kind: "circle", radius }),
    )

    const lifted: PrismLike<Shape, Shape, number, number> = fromPrism(circle)
    const roundTripped = toPrism(lifted)

    const square: Shape = { kind: "square", side: 2 }
    const disk: Shape = { kind: "circle", radius: 5 }

    const squareFocus = roundTripped.getOption(square)
    expect(squareFocus).toBe(None)

    const diskFocus = roundTripped.getOption(disk)
    expect(isSome(diskFocus) && diskFocus.value).toBe(5)
    expect(roundTripped.reverseGet(7)).toEqual({ kind: "circle", radius: 7 })
  })

  it("round-trips an optional", () => {
    const nickname: Optional<Person, string> = optional<Person, string>(
      (person) => (person.nickname == null ? None : Some(person.nickname)),
      (nick, person) => ({ ...person, nickname: nick }),
    )

    const lifted: OptionalLike<Person, Person, string, string> = fromOptional(nickname)
    const roundTripped = toOptional(lifted)

    const withNick: Person = { name: "Ada", age: 32, nickname: "Ace" }
    const withoutNick: Person = { name: "Emmy", age: 27 }

    expect(roundTripped.getOption(withoutNick)).toBe(None)

    const nick = roundTripped.getOption(withNick)
    expect(isSome(nick) && nick.value).toBe("Ace")

    expect(roundTripped.set("Cloud")(withNick)).toEqual({ name: "Ada", age: 32, nickname: "Cloud" })
    expect(roundTripped.set("Cloud")(withoutNick)).toEqual({ name: "Emmy", age: 27, nickname: "Cloud" })
  })

  it("interprets a traversal via Identity applicative", () => {
    const lifted: TraversalLike<ReadonlyArray<number>, ReadonlyArray<number>, number, number> =
      <F>(app: Applicative<F>) => {
        const Star = starWander(app)
        return (pab: HKP.Kind<HKP.StarId<F>, number, number>) =>
          Star.wander(pab, (afb) => (numbers) => {
            return numbers.reduce<FunctorValue<F, ReadonlyArray<number>>>(
              (acc, value) => {
                const liftedCons = app.map((accumulator: ReadonlyArray<number>) => (n: number) =>
                  [...accumulator, n] as const,
                )(acc)
                return app.ap(liftedCons)(afb(value))
              },
              app.of<ReadonlyArray<number>>([]),
            )
          })
      }

    const original = toTraversal(lifted)
    const incremented = original.modify((n) => n + 1)([1, 2, 3])
    expect(incremented).toEqual([2, 3, 4])
  })

  describe("law oracles", () => {
    it("verifies the lens laws for name lens", () => {
      const nameLens: Lens<Person, string> = lens(
        (person) => person.name,
        (name, person) => ({ ...person, name }),
      )

      const report = checkLensLaws({
        lens: nameLens,
        structure: { name: "Ada", age: 32 },
        first: "Grace",
        second: "Hypatia",
        equalsStructure: eqPerson,
      })

      expect(report.holds).toBe(true)
      expect(report.failures).toHaveLength(0)
    })

    it("verifies the optional laws for nickname optional", () => {
      const nickname: Optional<Person, string> = optional<Person, string>(
        (person) => (person.nickname == null ? None : Some(person.nickname)),
        (nick, person) => ({ ...person, nickname: nick }),
      )

      const absentReport = checkOptionalLaws({
        optional: nickname,
        structure: { name: "Ada", age: 32 },
        first: "Ace",
        second: "Cloud",
        equalsStructure: eqPerson,
      })

      expect(absentReport.holds).toBe(true)
      expect(absentReport.getSet.skipped).toBe(true)
      expect(absentReport.failures).toHaveLength(0)
      expect(absentReport.witness.originalFocusWitness.tag).toBe("miss")
      const firstAbsentUpdate = absentReport.witness.firstUpdate
      expect(firstAbsentUpdate.tag).toBe("skipped")
      if (firstAbsentUpdate.tag !== "skipped") {
        throw new Error("Expected absent optional law witness to record a skipped update")
      }
      expect(firstAbsentUpdate.reason.tag).toBe("absent")

      const presentReport = checkOptionalLaws({
        optional: nickname,
        structure: { name: "Grace", age: 38, nickname: "Amazing" },
        first: "Brilliant",
        second: "Bold",
        equalsStructure: eqPerson,
      })

      expect(presentReport.holds).toBe(true)
      expect(presentReport.getSet.skipped).toBe(false)
      expect(presentReport.failures).toHaveLength(0)
      expect(presentReport.witness.originalFocusWitness.tag).toBe("hit")
      expect(presentReport.witness.restoredUpdate?.tag).toBe("updated")
      expect(presentReport.witness.firstUpdate.tag).toBe("updated")
      expect(presentReport.witness.firstFocusWitness.tag).toBe("hit")
      const firstFocus = presentReport.witness.firstFocus
      expect(isSome(firstFocus) && firstFocus.value).toBe("Brilliant")
    })

    it("verifies the prism laws for circle prism", () => {
      const circle: Prism<Shape, number> = prism<Shape, number>(
        (shape) => (shape.kind === "circle" ? Some(shape.radius) : None),
        (radius) => ({ kind: "circle", radius }),
      )

      const report = checkPrismLaws({
        prism: circle,
        matchSample: { kind: "circle", radius: 5 },
        reviewSample: 7,
        missSample: { kind: "square", side: 3 },
        equalsStructure: eqShape,
      })

      expect(report.holds).toBe(true)
      expect(report.reviewPreview.skipped).toBe(false)
      expect(report.failures).toHaveLength(0)
      expect(report.witness.matchWitness.tag).toBe("match")
      expect(report.witness.reviewPreviewWitness.tag).toBe("match")
      expect(report.witness.missWitness?.tag).toBe("reject")
    })
  })
})
