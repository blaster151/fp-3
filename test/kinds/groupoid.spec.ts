import { describe, it, expect } from "vitest"
import { catFromGroup, groupFromOneObjectGroupoid, type FinGroup } from "../../kinds/group-as-category"
import { isGroupoid, actionGroupoid } from "../../kinds/groupoid"

describe("kinds/groupoid", () => {
  const z2: FinGroup = {
    elements: ["e", "s"],
    unit: "e",
    multiply: (a, b) => (a === "s" ? (b === "s" ? "e" : "s") : b),
    inverse: (a) => a,
  }

  it("treats a group as a one-object groupoid", () => {
    const category = catFromGroup(z2)
    expect(isGroupoid(category)).toBe(true)
  })

  it("recovers the original group from its one-object groupoid", () => {
    const category = catFromGroup(z2)
    const { group } = groupFromOneObjectGroupoid(category)

    const names = group.elements.map((arrow) => arrow.element).sort()
    expect(names).toEqual(["e", "s"])

    const elementByName = (name: string) =>
      group.elements.find((arrow) => arrow.element === name)!

    const s = elementByName("s")
    const product = group.multiply(s, s)
    expect(product.element).toBe("e")
    const inverse = group.inverse(s)
    expect(inverse.element).toBe("s")
  })

  it("builds an action groupoid for Z2 acting on three points", () => {
    const act = (g: string, u: string): string => (g === "s" ? (u === "x" ? "y" : u === "y" ? "x" : "z") : u)
    const groupoid = actionGroupoid(z2, ["x", "y", "z"], act)
    expect(isGroupoid(groupoid)).toBe(true)

    const flipX = groupoid.arrows.find((arrow) => arrow.name === "s:x")
    const flipY = groupoid.arrows.find((arrow) => arrow.name === "s:y")
    expect(flipX).toBeDefined()
    expect(flipY).toBeDefined()
    const composed = groupoid.compose(flipY!, flipX!)
    expect(groupoid.eq(composed, groupoid.id("x"))).toBe(true)
  })
})
