import type { Category } from "./stdlib/category"
import { ArrowFamilies } from "./stdlib/arrow-families"
import type { PullbackCalculator } from "./pullback"

export interface MonicObject<O, M> {
  readonly domain: O
  readonly codomain: O
  readonly monic: M
}

export interface MonicMorphism<O, M> {
  readonly from: MonicObject<O, M>
  readonly to: MonicObject<O, M>
  readonly codomainArrow: M
  readonly mediator: M
}

export interface MonicMorphismInput<O, M> {
  readonly from: MonicObject<O, M>
  readonly to: MonicObject<O, M>
  readonly codomainArrow: M
  readonly mediator: M
}

export interface MakeMonicCategoryInput<O, M> {
  readonly base: Category<O, M> & ArrowFamilies.HasDomCod<O, M>
  readonly isMonomorphism: (arrow: M) => boolean
  readonly pullbacks: PullbackCalculator<O, M>
  readonly equalMor?: (left: M, right: M) => boolean
}

export interface MonicCategory<O, M>
  extends Category<MonicObject<O, M>, MonicMorphism<O, M>>,
    ArrowFamilies.HasDomCod<MonicObject<O, M>, MonicMorphism<O, M>> {
  readonly makeObject: (monic: M) => MonicObject<O, M>
  readonly makeMorphism: (input: MonicMorphismInput<O, M>) => MonicMorphism<O, M>
}

const ensureEquality = <M>(
  eq: ((left: M, right: M) => boolean) | undefined,
  fallback: ((left: M, right: M) => boolean) | undefined,
): ((left: M, right: M) => boolean) => {
  if (eq) return eq
  if (fallback) return fallback
  throw new Error(
    "makeMonicCategory: base category must provide an equality predicate for morphisms.",
  )
}

export const makeMonicCategory = <O, M>({
  base,
  isMonomorphism,
  pullbacks,
  equalMor,
}: MakeMonicCategoryInput<O, M>): MonicCategory<O, M> => {
  const baseEq = ensureEquality<M>(equalMor, base.equalMor ?? base.eq)

  const makeObject = (monic: M): MonicObject<O, M> => {
    if (!isMonomorphism(monic)) {
      throw new Error("makeMonicCategory.makeObject: supplied arrow is not a monomorphism.")
    }
    const domain = base.dom(monic)
    const codomain = base.cod(monic)
    return { domain, codomain, monic }
  }

  const makeMorphism = ({
    from,
    to,
    codomainArrow,
    mediator,
  }: MonicMorphismInput<O, M>): MonicMorphism<O, M> => {
    if (base.dom(codomainArrow) !== from.codomain) {
      throw new Error(
        "makeMonicCategory.makeMorphism: codomain arrow must originate at the source codomain.",
      )
    }
    if (base.cod(codomainArrow) !== to.codomain) {
      throw new Error(
        "makeMonicCategory.makeMorphism: codomain arrow must land in the target codomain.",
      )
    }
    if (base.dom(mediator) !== from.domain) {
      throw new Error(
        "makeMonicCategory.makeMorphism: mediator must originate at the source domain.",
      )
    }
    if (base.cod(mediator) !== to.domain) {
      throw new Error(
        "makeMonicCategory.makeMorphism: mediator must land in the target domain.",
      )
    }

    const viaCodomain = base.compose(codomainArrow, from.monic)
    const viaTarget = base.compose(to.monic, mediator)
    if (!baseEq(viaCodomain, viaTarget)) {
      throw new Error(
        "makeMonicCategory.makeMorphism: square must commute with the advertised monomorphisms.",
      )
    }

    const certification = pullbacks.certify(codomainArrow, to.monic, {
      apex: from.domain,
      toDomain: from.monic,
      toAnchor: mediator,
    })
    if (!certification.valid) {
      throw new Error(
        certification.reason ??
          "makeMonicCategory.makeMorphism: candidate square failed pullback certification.",
      )
    }

    return { from, to, codomainArrow, mediator }
  }

  const id = (object: MonicObject<O, M>): MonicMorphism<O, M> =>
    makeMorphism({
      from: object,
      to: object,
      codomainArrow: base.id(object.codomain),
      mediator: base.id(object.domain),
    })

  const compose = (
    g: MonicMorphism<O, M>,
    f: MonicMorphism<O, M>,
  ): MonicMorphism<O, M> => {
    if (f.to !== g.from) {
      throw new Error("makeMonicCategory.compose: morphisms must be composable.")
    }
    return makeMorphism({
      from: f.from,
      to: g.to,
      codomainArrow: base.compose(g.codomainArrow, f.codomainArrow),
      mediator: base.compose(g.mediator, f.mediator),
    })
  }

  const dom = (morphism: MonicMorphism<O, M>): MonicObject<O, M> => morphism.from
  const cod = (morphism: MonicMorphism<O, M>): MonicObject<O, M> => morphism.to

  const equalMonicMorphism = (
    left: MonicMorphism<O, M>,
    right: MonicMorphism<O, M>,
  ): boolean =>
    left === right ||
    (left.from === right.from &&
      left.to === right.to &&
      baseEq(left.codomainArrow, right.codomainArrow) &&
      baseEq(left.mediator, right.mediator))

  return {
    id,
    compose,
    dom,
    cod,
    equalMor: equalMonicMorphism,
    makeObject,
    makeMorphism,
  }
}
