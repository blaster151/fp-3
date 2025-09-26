import { describe, it, expect } from "vitest"
import { makeToyCategory, arrows } from "./toy-category"
import { inverse, isIso, areIsomorphic } from "../../kinds/iso"

describe("kinds/iso", () => {
  const category = makeToyCategory()

  it("finds identity inverses", () => {
    expect(inverse(category, arrows.idA)).toEqual(arrows.idA)
    expect(isIso(category, arrows.idB)).toBe(true)
  })

  it("detects that A and B are isomorphic via f and g", () => {
    expect(inverse(category, arrows.f)?.name).toBe("g")
    const witness = areIsomorphic(category, "A", "B")
    expect(witness).not.toBeNull()
    expect(witness?.forward.name).toBe("f")
    expect(witness?.inverse.name).toBe("g")
  })
})
