import type { FiniteCategory } from "../../finite-cat"

type Obj = "A" | "B"

type Arrow = {
  readonly name: string
  readonly source: Obj
  readonly target: Obj
}

const makeArrow = (name: string, source: Obj, target: Obj): Arrow => ({ name, source, target })

const idA = makeArrow("id_A", "A", "A")
const idB = makeArrow("id_B", "B", "B")
const f = makeArrow("f", "A", "B")
const g = makeArrow("g", "B", "A")

const compose = (first: Arrow, second: Arrow): Arrow => {
  if (second.target !== first.source) {
    throw new Error(`Domain mismatch composing ${first.name} after ${second.name}`)
  }
  if (second === idA && first === idA) return idA
  if (second === idB && first === idB) return idB
  if (second === idA && first === f) return f
  if (second === f && first === idB) return f
  if (second === idB && first === g) return g
  if (second === g && first === idA) return g
  if (first === g && second === f) return idA
  if (first === f && second === g) return idB
  if (second === f && first === f) return makeArrow("ff", "A", "B")
  if (second === g && first === g) return makeArrow("gg", "B", "A")
  return makeArrow(`${first.name}∘${second.name}`, second.source, first.target)
}

export const makeToyCategory = (): FiniteCategory<Obj, Arrow> => {
  const arrows = [idA, idB, f, g]
  const eq = (x: Arrow, y: Arrow) => x.name === y.name && x.source === y.source && x.target === y.target
  const ensureArrow = (arrow: Arrow): Arrow => arrows.find((a) => eq(a, arrow)) ?? arrow
  return {
    objects: ["A", "B"],
    arrows,
    id: (object) => (object === "A" ? idA : idB),
    compose: (first, second) => ensureArrow(compose(first, second)),
    src: (arrow) => arrow.source,
    dst: (arrow) => arrow.target,
    eq,
  }
}

export const arrows = { idA, idB, f, g }
