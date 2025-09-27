import { describe, it, expect } from "vitest"
import { makeToyPushouts } from "../pushout-toy"
import { isEpi } from "../kinds/mono-epi"
import { PushoutCategory } from "./pushout-fixture"

const C = PushoutCategory
const pushouts = makeToyPushouts(C)

const epis = C.arrows.filter((arrow) => isEpi(C, arrow))
const hs = C.arrows

describe("epis are stable under pushouts in the fixture category", () => {
  it("co-legs of pushouts preserve epimorphisms", () => {
    for (const e of epis) {
      for (const h of hs) {
        if (C.src(e) !== C.src(h)) continue
        const data = pushouts.pushout(e, h)
        expect(isEpi(C, data.iZ)).toBe(true)
      }
    }
  })
})
