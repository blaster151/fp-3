import { describe, expect, it } from "vitest"

import {
  FinPos,
  FinPosSubobjectClassifier,
  type FinPosObj,
  type MonoMap,
} from "../../models/finpos-cat"

const makeChain = (name: string, labels: readonly string[]): FinPosObj => {
  const order = new Map(labels.map((label, index) => [label, index]))
  return {
    name,
    elems: [...labels],
    leq: (left: string, right: string) => {
      const leftIndex = order.get(left)
      const rightIndex = order.get(right)
      if (leftIndex === undefined || rightIndex === undefined) {
        return false
      }
      return leftIndex <= rightIndex
    },
  }
}

describe("FinPosSubobjectClassifier", () => {
  const terminal = FinPos.one()
  const terminalPoint = terminal.elems[0] ?? TERMINAL_POINT_PLACEHOLDER
  const truthValues = FinPos.truthValues()

  it("provides monotone truth and false arrows", () => {
    const truth = FinPosSubobjectClassifier.truthArrow
    const falsity = FinPosSubobjectClassifier.falseArrow

    expect(truth.dom).toBe(terminal.name)
    expect(truth.cod).toBe(truthValues.name)
    expect(truth.map(terminalPoint)).toBe("⊤")

    expect(falsity.dom).toBe(terminal.name)
    expect(falsity.cod).toBe(truthValues.name)
    expect(falsity.map(terminalPoint)).toBe("⊥")

    expect(
      FinPos.isMonotone(
        terminal,
        truthValues,
        FinPosSubobjectClassifier.truthArrow,
      ),
    ).toBe(true)
    expect(
      FinPos.isMonotone(
        terminal,
        truthValues,
        FinPosSubobjectClassifier.falseArrow,
      ),
    ).toBe(true)
  })

  it("classifies downward-closed inclusions and reconstructs subposets", () => {
    const ambient = makeChain("Ambient", ["0", "1", "2"])
    const downSet: FinPosObj = {
      name: "Down",
      elems: ["0", "1"],
      leq: (left, right) => ambient.leq(left, right),
    }

    FinPos.registerObject(ambient)
    FinPos.registerObject(downSet)

    const inclusion: MonoMap = {
      name: "ι",
      dom: downSet.name,
      cod: ambient.name,
      map: (value: string) => value,
    }

    const chi = FinPosSubobjectClassifier.characteristic(inclusion)
    expect(chi.dom).toBe(ambient.name)
    expect(chi.cod).toBe(truthValues.name)
    expect(chi.map("0")).toBe("⊤")
    expect(chi.map("1")).toBe("⊤")
    expect(chi.map("2")).toBe("⊥")

    const reconstructed = FinPosSubobjectClassifier.subobjectFromCharacteristic(chi)
    expect(reconstructed.inclusion.dom).toBe(downSet.name)
    expect(reconstructed.inclusion.cod).toBe(ambient.name)
    const inclusionMatches =
      FinPosSubobjectClassifier.equalMor?.(
        reconstructed.inclusion,
        inclusion,
      ) ?? FinPosSubobjectClassifier.eq?.(reconstructed.inclusion, inclusion) ?? false
    expect(inclusionMatches).toBe(true)
    expect([...reconstructed.subobject.elems].sort()).toEqual(
      [...downSet.elems].sort(),
    )
  })

  it("derives negation from the false characteristic", () => {
    const negation = FinPosSubobjectClassifier.negation
    const falseCharacteristic = FinPos.characteristic(FinPos.falseArrow())
    const negationMatches =
      FinPosSubobjectClassifier.equalMor?.(negation, falseCharacteristic) ??
      FinPosSubobjectClassifier.eq?.(negation, falseCharacteristic) ??
      false
    expect(negationMatches).toBe(true)
    expect(negation.map("⊤")).toBe("⊤")
    expect(negation.map("⊥")).toBe("⊤")
  })
})

const TERMINAL_POINT_PLACEHOLDER = "⋆"
