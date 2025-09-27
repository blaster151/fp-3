import type { FiniteCategory } from "../finite-cat"
import { isMono, isEpi } from "./mono-epi"
import { withMonoEpiCache } from "./mono-epi-cache"

export const identityIsMono = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  object: Obj,
): boolean => isMono(category, category.id(object))

export const identityIsEpi = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  object: Obj,
): boolean => isEpi(category, category.id(object))

export const composeMonosAreMono = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  g: Arr,
  f: Arr,
): boolean => {
  if (category.src(g) !== category.dst(f)) {
    throw new Error("composeMonosAreMono: arrows must be composable")
  }
  if (!isMono(category, f) || !isMono(category, g)) return true
  const composite = category.compose(g, f)
  return isMono(category, composite)
}

export const composeEpisAreEpi = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  g: Arr,
  f: Arr,
): boolean => {
  if (category.src(g) !== category.dst(f)) {
    throw new Error("composeEpisAreEpi: arrows must be composable")
  }
  if (!isEpi(category, f) || !isEpi(category, g)) return true
  const composite = category.compose(g, f)
  return isEpi(category, composite)
}

export const rightFactorOfMono = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  g: Arr,
  f: Arr,
): boolean => {
  if (category.src(g) !== category.dst(f)) {
    throw new Error("rightFactorOfMono: arrows must be composable")
  }
  const composite = category.compose(g, f)
  if (!isMono(category, composite)) return true
  return isMono(category, f)
}

export const leftFactorOfEpi = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  g: Arr,
  f: Arr,
): boolean => {
  if (category.src(g) !== category.dst(f)) {
    throw new Error("leftFactorOfEpi: arrows must be composable")
  }
  const composite = category.compose(g, f)
  if (!isEpi(category, composite)) return true
  return isEpi(category, g)
}

export interface MonoEpiClosure<Obj, Arr> {
  readonly idMonos: ReadonlySet<Obj>
  readonly idEpis: ReadonlySet<Obj>
  readonly monos: ReadonlySet<Arr>
  readonly epis: ReadonlySet<Arr>
}

export const saturateMonoEpi = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
): MonoEpiClosure<Obj, Arr> => {
  const cache = withMonoEpiCache(category)
  const idMonos = new Set<Obj>()
  const idEpis = new Set<Obj>()
  const monos = new Set<Arr>()
  const epis = new Set<Arr>()

  const canonical = (arrow: Arr): Arr | undefined =>
    category.arrows.find((candidate) => category.eq(candidate, arrow))

  const ensureMono = (arrow: Arr): boolean => {
    const canon = canonical(arrow)
    if (!canon) return false
    if (monos.has(canon)) return false
    if (!cache.isMono(canon)) return false
    monos.add(canon)
    return true
  }

  const ensureEpi = (arrow: Arr): boolean => {
    const canon = canonical(arrow)
    if (!canon) return false
    if (epis.has(canon)) return false
    if (!cache.isEpi(canon)) return false
    epis.add(canon)
    return true
  }

  const ensureIdentityMono = (object: Obj): boolean => {
    if (idMonos.has(object)) return false
    const identity = category.id(object)
    const canonicalId = canonical(identity)
    const holds = canonicalId ? cache.isMono(canonicalId) : isMono(category, identity)
    if (!holds) return false
    idMonos.add(object)
    if (canonicalId) monos.add(canonicalId)
    return true
  }

  const ensureIdentityEpi = (object: Obj): boolean => {
    if (idEpis.has(object)) return false
    const identity = category.id(object)
    const canonicalId = canonical(identity)
    const holds = canonicalId ? cache.isEpi(canonicalId) : isEpi(category, identity)
    if (!holds) return false
    idEpis.add(object)
    if (canonicalId) epis.add(canonicalId)
    return true
  }

  let changed = true
  while (changed) {
    changed = false

    for (const object of category.objects) {
      if (ensureIdentityMono(object)) changed = true
      if (ensureIdentityEpi(object)) changed = true
    }

    for (const arrow of category.arrows) {
      if (ensureMono(arrow)) changed = true
      if (ensureEpi(arrow)) changed = true
    }

    for (const g of category.arrows) {
      for (const f of category.arrows) {
        if (category.src(g) !== category.dst(f)) continue

        const canonF = canonical(f)
        const canonG = canonical(g)
        const composite = category.compose(g, f)

        if (canonF && canonG && monos.has(canonF) && monos.has(canonG)) {
          if (ensureMono(composite)) changed = true
        }
        if (canonF && cache.isMono(composite)) {
          if (ensureMono(canonF)) changed = true
        }

        if (canonF && canonG && epis.has(canonF) && epis.has(canonG)) {
          if (ensureEpi(composite)) changed = true
        }
        if (canonG && cache.isEpi(composite)) {
          if (ensureEpi(canonG)) changed = true
        }
      }
    }
  }

  return {
    idMonos,
    idEpis,
    monos,
    epis,
  }
}
