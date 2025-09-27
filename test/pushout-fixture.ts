import type { FiniteCategory } from "../finite-cat"

type Obj = "X" | "Z" | "A" | "B" | "Qf" | "Qg"

type Arrow = {
  readonly name: string
  readonly src: Obj
  readonly dst: Obj
}

const objects: readonly Obj[] = ["X", "Z", "A", "B", "Qf", "Qg"]

const arrowByName = new Map<string, Arrow>()
const makeArrow = (name: string, src: Obj, dst: Obj): Arrow => {
  const arrow = { name, src, dst } as const
  arrowByName.set(name, arrow)
  return arrow
}

const arrows: readonly Arrow[] = [
  ...objects.map((object) => makeArrow(`id_${object}`, object, object)),
  makeArrow("f", "X", "A"),
  makeArrow("g", "X", "B"),
  makeArrow("h", "X", "Z"),
  makeArrow("j", "A", "B"),
  makeArrow("qAf", "A", "Qf"),
  makeArrow("qZf", "Z", "Qf"),
  makeArrow("liftF", "X", "Qf"),
  makeArrow("qBg", "B", "Qg"),
  makeArrow("qZg", "Z", "Qg"),
  makeArrow("liftG", "X", "Qg"),
  makeArrow("qBgJ", "A", "Qg"),
  makeArrow("u", "Qf", "Qg"),
]

export const getArrow = (name: string): Arrow => {
  const arrow = arrowByName.get(name)
  if (!arrow) throw new Error(`unknown arrow ${name}`)
  return arrow
}

const compose = (g: Arrow, f: Arrow): Arrow => {
  if (f.dst !== g.src) throw new Error(`compose mismatch for ${g.name} ∘ ${f.name}`)
  if (f.name.startsWith("id_")) return getArrow(g.name)
  if (g.name.startsWith("id_")) return getArrow(f.name)
  if (f.name === "f" && g.name === "j") return getArrow("g")
  if (f.name === "f" && g.name === "qAf") return getArrow("liftF")
  if (f.name === "h" && g.name === "qZf") return getArrow("liftF")
  if (f.name === "g" && g.name === "qBg") return getArrow("liftG")
  if (f.name === "h" && g.name === "qZg") return getArrow("liftG")
  if (f.name === "qAf" && g.name === "u") return getArrow("qBgJ")
  if (f.name === "j" && g.name === "qBg") return getArrow("qBgJ")
  if (f.name === "f" && g.name === "qBgJ") return getArrow("liftG")
  if (f.name === "qZf" && g.name === "u") return getArrow("qZg")
  if (f.name === "liftF" && g.name === "u") return getArrow("liftG")
  throw new Error(`unsupported composition ${g.name} ∘ ${f.name}`)
}

export const PushoutCategory: FiniteCategory<Obj, Arrow> = {
  objects,
  arrows,
  id: (object) => getArrow(`id_${object}`),
  compose,
  src: (arrow) => arrow.src,
  dst: (arrow) => arrow.dst,
  eq: (a, b) => a.name === b.name,
}

export type PushoutObj = Obj
export type PushoutArrow = Arrow
