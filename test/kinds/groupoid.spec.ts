import { describe, it, expect } from "vitest"
import { catFromGroup, type FinGroup } from "../../kinds/group-as-category"
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
