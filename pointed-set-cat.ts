export interface PointedSetObj<A> {
  readonly label: string
  readonly elems: ReadonlyArray<A>
  readonly basepoint: A
  readonly eq: (x: A, y: A) => boolean
}

export interface PointedSetHom<A, B> {
  readonly dom: PointedSetObj<A>
  readonly cod: PointedSetObj<B>
  readonly map: (value: A) => B
}

const contains = <A>(obj: PointedSetObj<A>, value: A): boolean =>
  obj.elems.some((candidate) => obj.eq(candidate, value))

export const isPointedSetHom = <A, B>(hom: PointedSetHom<A, B>): boolean => {
  const { dom, cod, map } = hom
  if (!cod.eq(map(dom.basepoint), cod.basepoint)) {
    return false
  }
  return dom.elems.every((value) => contains(cod, map(value)))
}

export const idPointedSet = <A>(obj: PointedSetObj<A>): PointedSetHom<A, A> => ({
  dom: obj,
  cod: obj,
  map: (value: A) => value,
})

export const composePointedSet = <A, B, C>(
  g: PointedSetHom<B, C>,
  f: PointedSetHom<A, B>,
): PointedSetHom<A, C> => {
  if (f.cod !== g.dom) {
    throw new Error("PointedSet: compose expects matching codomain/domain")
  }
  return {
    dom: f.dom,
    cod: g.cod,
    map: (value: A) => g.map(f.map(value)),
  }
}

const SINGLETON_POINT = "⋆" as const
export type SingletonPoint = typeof SINGLETON_POINT

const createSingleton = (label = "𝟙⋆"): PointedSetObj<SingletonPoint> => ({
  label,
  elems: [SINGLETON_POINT],
  basepoint: SINGLETON_POINT,
  eq: Object.is,
})

export interface CreatePointedSetConfig<A> {
  readonly label: string
  readonly elems: ReadonlyArray<A>
  readonly basepoint: A
  readonly eq?: (x: A, y: A) => boolean
}

export const PointedSet = {
  create<A>({ label, elems, basepoint, eq = Object.is }: CreatePointedSetConfig<A>): PointedSetObj<A> {
    const carrier = [...elems]
    if (!carrier.some((candidate) => eq(candidate, basepoint))) {
      throw new Error(`PointedSet ${label}: basepoint must be an element of the carrier`)
    }
    return {
      label,
      elems: carrier,
      basepoint,
      eq,
    }
  },
  singleton: createSingleton,
  id: idPointedSet,
  compose: composePointedSet,
  isHom: isPointedSetHom,
  hom<A, B>(dom: PointedSetObj<A>, cod: PointedSetObj<B>, map: (value: A) => B): PointedSetHom<A, B> {
    const morphism: PointedSetHom<A, B> = { dom, cod, map }
    if (!isPointedSetHom(morphism)) {
      throw new Error("PointedSet: morphism must preserve basepoints and land in the codomain")
    }
    return morphism
  },
  fromSingleton<A>(
    cod: PointedSetObj<A>,
    singleton: PointedSetObj<SingletonPoint> = createSingleton(),
  ): PointedSetHom<SingletonPoint, A> {
    return {
      dom: singleton,
      cod,
      map: () => cod.basepoint,
    }
  },
  toSingleton<A>(
    dom: PointedSetObj<A>,
    singleton: PointedSetObj<SingletonPoint> = createSingleton(),
  ): PointedSetHom<A, SingletonPoint> {
    return {
      dom,
      cod: singleton,
      map: () => singleton.basepoint,
    }
  },
}
