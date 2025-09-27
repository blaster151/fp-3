import type { FiniteCategory } from "./finite-cat"

type MonoEpiAware<Obj, Arr> = FiniteCategory<Obj, Arr> & {
  readonly isMono?: (arrow: Arr) => boolean
  readonly isEpi?: (arrow: Arr) => boolean
}

const arrowName = (arrow: unknown): string => {
  const candidate = (arrow as { name?: unknown }).name
  return typeof candidate === "string" ? candidate : String(arrow)
}

export const arrowGlyph = <Obj, Arr>(
  category: MonoEpiAware<Obj, Arr>,
  arrow: Arr,
): string => {
  const mono = category.isMono?.(arrow) ?? false
  const epi = category.isEpi?.(arrow) ?? false
  if (mono && epi) return "⇄"
  if (mono) return "↪"
  if (epi) return "↠"
  return "→"
}

export const prettyArrow = <Obj, Arr>(
  category: MonoEpiAware<Obj, Arr>,
  arrow: Arr,
): string => `${arrowGlyph(category, arrow)} ${arrowName(arrow)}`
