import type { FiniteCategory } from "../finite-cat"
import { prettyArrow } from "../pretty"
import { twoSidedInverses, rightInverses } from "../kinds/inverses"
import { isMono, isEpi } from "../kinds/mono-epi"
import { findMutualMonicFactorizations } from "../kinds/monic-factorization"
import { epiMonoFactor } from "../kinds/epi-mono-factor"
import { detectBalancedPromotions } from "../oracles/balanced"

export interface NormalizeCompositeRewrite<Arr> {
  readonly kind: "NormalizeComposite"
  readonly path: readonly Arr[]
  readonly removeStart: number
  readonly removeCount: number
  readonly description: string
}

export interface UpgradeToIsoRewrite<Arr> {
  readonly kind: "UpgradeToIso"
  readonly arrow: Arr
  readonly inverse: Arr
}

export interface ReplaceWithIdentityRewrite<Arr> {
  readonly kind: "ReplaceWithIdentity"
  readonly composite: readonly [Arr, Arr]
  readonly description: string
}

export interface MergeSubobjectsRewrite<Obj, Arr> {
  readonly kind: "MergeSubobjects"
  readonly left: Obj
  readonly right: Obj
  readonly forward: Arr
  readonly backward: Arr
}

export interface MergeObjectsRewrite<Obj, Arr> {
  readonly kind: "MergeObjects"
  readonly left: Obj
  readonly right: Obj
  readonly forward: Arr
  readonly backward: Arr
}

export interface FactorThroughEpiMonoRewrite<Arr> {
  readonly kind: "FactorThroughEpiMono"
  readonly arrow: Arr
  readonly epi: Arr
  readonly mono: Arr
}

export type Rewrite<Obj, Arr> =
  | NormalizeCompositeRewrite<Arr>
  | UpgradeToIsoRewrite<Arr>
  | ReplaceWithIdentityRewrite<Arr>
  | MergeSubobjectsRewrite<Obj, Arr>
  | MergeObjectsRewrite<Obj, Arr>
  | FactorThroughEpiMonoRewrite<Arr>

export interface Suggestion<Obj, Arr> {
  readonly id: string
  readonly oracle: string
  readonly severity: "safe" | "hint"
  readonly message: string
  readonly rewrites: ReadonlyArray<Rewrite<Obj, Arr>>
}

export interface OperationContext<Obj, Arr> {
  readonly category: FiniteCategory<Obj, Arr>
  readonly path?: readonly Arr[]
  readonly focus?: Arr
}

export interface OperationRule<Obj, Arr> {
  readonly name: string
  readonly mode: "auto" | "suggest"
  applicable(context: OperationContext<Obj, Arr>): boolean
  apply(
    context: OperationContext<Obj, Arr>,
    makeId: () => string,
  ): Suggestion<Obj, Arr> | null
}

const isoCancellationRule = <Obj, Arr>(): OperationRule<Obj, Arr> => ({
  name: "IsoCancellation",
  mode: "auto",
  applicable: ({ path }) => Array.isArray(path) && path.length >= 2,
  apply: (context, makeId) => {
    const { category, path } = context
    if (!path) return null
    const rewrites: NormalizeCompositeRewrite<Arr>[] = []
    for (let index = 0; index < path.length - 1; index += 1) {
      const first = path[index]!
      const second = path[index + 1]!
      const inverses = twoSidedInverses(category, first)
      if (inverses.some((candidate) => category.eq(candidate, second))) {
        rewrites.push({
          kind: "NormalizeComposite",
          path,
          removeStart: index,
          removeCount: 2,
          description: `${prettyArrow(category, first)} cancels ${prettyArrow(category, second)}`,
        })
      }
    }
    if (rewrites.length === 0) return null
    const message =
      rewrites.length === 1
        ? `Cancel an inverse pair inside the composite.`
        : `Cancel ${rewrites.length} inverse pairs inside the composite.`
    return {
      id: makeId(),
      oracle: "IsoCancellation",
      severity: "safe",
      message,
      rewrites,
    }
  },
})

const monicRightInverseUpgrade = <Obj, Arr>(): OperationRule<Obj, Arr> => ({
  name: "MonoRightInverseUpgrade",
  mode: "suggest",
  applicable: ({ category, focus }) =>
    focus !== undefined && isMono(category, focus) && rightInverses(category, focus).length > 0,
  apply: (context, makeId) => {
    const { category, focus } = context
    if (!focus) return null
    const candidates = rightInverses(category, focus)
    for (const candidate of candidates) {
      const gf = category.compose(candidate, focus)
      const fg = category.compose(focus, candidate)
      const idSrc = category.id(category.src(focus))
      const idDst = category.id(category.dst(focus))
      const leftOk = category.eq(gf, idSrc)
      const rightOk = category.eq(fg, idDst)
      if (!leftOk || !rightOk) continue
      const rewrites: Rewrite<Obj, Arr>[] = [
        { kind: "UpgradeToIso", arrow: focus, inverse: candidate },
        {
          kind: "ReplaceWithIdentity",
          composite: [focus, candidate],
          description: `${prettyArrow(category, focus)} ∘ ${prettyArrow(category, candidate)} = id`,
        },
        {
          kind: "ReplaceWithIdentity",
          composite: [candidate, focus],
          description: `${prettyArrow(category, candidate)} ∘ ${prettyArrow(category, focus)} = id`,
        },
      ]
      const message = `Promote ${prettyArrow(category, focus)} to an isomorphism via ${prettyArrow(
        category,
        candidate,
      )}.`
      return {
        id: makeId(),
        oracle: "MonicWithRightInverseIsIso",
        severity: "hint",
        message,
        rewrites,
      }
    }
    return null
  },
})

const balancedMonoEpiUpgrade = <Obj, Arr>(): OperationRule<Obj, Arr> => ({
  name: "BalancedMonoEpiUpgrade",
  mode: "suggest",
  applicable: ({ category, focus }) => {
    if (!focus) return false
    if (!category.traits?.balanced) return false
    if (!isMono(category, focus) || !isEpi(category, focus)) return false
    const promotions = detectBalancedPromotions(category, isMono, isEpi)
    return promotions.some((promotion) => category.eq(promotion.arrow, focus))
  },
  apply: (context, makeId) => {
    const { category, focus } = context
    if (!focus) return null
    if (!category.traits?.balanced) return null
    const promotions = detectBalancedPromotions(category, isMono, isEpi).filter((promotion) =>
      category.eq(promotion.arrow, focus),
    )
    if (promotions.length === 0) return null
    const { inverse } = promotions[0]!
    const rewrites: Rewrite<Obj, Arr>[] = [
      { kind: "UpgradeToIso", arrow: focus, inverse },
      {
        kind: "ReplaceWithIdentity",
        composite: [focus, inverse],
        description: `${prettyArrow(category, focus)} ∘ ${prettyArrow(category, inverse)} = id`,
      },
      {
        kind: "ReplaceWithIdentity",
        composite: [inverse, focus],
        description: `${prettyArrow(category, inverse)} ∘ ${prettyArrow(category, focus)} = id`,
      },
    ]
    return {
      id: makeId(),
      oracle: "BalancedMonoEpicIsIso",
      severity: "hint",
      message: `Promote ${prettyArrow(category, focus)} to an isomorphism using balanced cancellability.`,
      rewrites,
    }
  },
})

const epiMonoFactorisationRule = <Obj, Arr>(): OperationRule<Obj, Arr> => ({
  name: "EpiMonoFactorisation",
  mode: "suggest",
  applicable: ({ category, focus }) => {
    if (!focus) return false
    return epiMonoFactor(category, focus) !== null
  },
  apply: (context, makeId) => {
    const { category, focus } = context
    if (!focus) return null
    const factor = epiMonoFactor(category, focus)
    if (!factor) return null
    const message = `Factor ${prettyArrow(category, focus)} as ${prettyArrow(
      category,
      factor.epi,
    )} followed by ${prettyArrow(category, factor.mono)}.`
    const rewrites: Rewrite<Obj, Arr>[] = [
      {
        kind: "FactorThroughEpiMono",
        arrow: focus,
        epi: factor.epi,
        mono: factor.mono,
      },
    ]
    return {
      id: makeId(),
      oracle: "EpiMonoFactorization",
      severity: "hint",
      message,
      rewrites,
    }
  },
})

const mutualMonicMerge = <Obj, Arr>(): OperationRule<Obj, Arr> => ({
  name: "MutualMonicFactorisation",
  mode: "suggest",
  applicable: ({ category }) => findMutualMonicFactorizations(category).length > 0,
  apply: (context, makeId) => {
    const { category } = context
    const witnesses = findMutualMonicFactorizations(category)
    if (witnesses.length === 0) return null
    const rewrites: MergeSubobjectsRewrite<Obj, Arr>[] = witnesses.map((witness) => ({
      kind: "MergeSubobjects",
      left: category.src(witness.left),
      right: category.src(witness.right),
      forward: witness.forward,
      backward: witness.backward,
    }))
    const fragments = witnesses.map(
      (witness) =>
        `${prettyArrow(category, witness.left)} ↔ ${prettyArrow(category, witness.right)}`,
    )
    const message = `Treat ${fragments.join(", ")} as isomorphic subobjects.`
    return {
      id: makeId(),
      oracle: "MonicFactorizationYieldsIso",
      severity: "hint",
      message,
      rewrites,
    }
  },
})

const mergeObjectsFromIsos = <Obj, Arr>(): OperationRule<Obj, Arr> => ({
  name: "MergeObjectsViaIso",
  mode: "suggest",
  applicable: ({ category }) =>
    category.arrows.some((arrow) => twoSidedInverses(category, arrow).length > 0),
  apply: (context, makeId) => {
    const { category } = context
    const rewrites: MergeObjectsRewrite<Obj, Arr>[] = []
    const seen: Array<{ left: Arr; right: Arr }> = []

    for (const arrow of category.arrows) {
      const inverses = twoSidedInverses(category, arrow)
      if (inverses.length === 0) continue

      const sourceIdentity = category.id(category.src(arrow))
      const targetIdentity = category.id(category.dst(arrow))

      const alreadySeen = seen.some(
        (entry) =>
          (category.eq(entry.left, sourceIdentity) && category.eq(entry.right, targetIdentity)) ||
          (category.eq(entry.left, targetIdentity) && category.eq(entry.right, sourceIdentity)),
      )
      if (alreadySeen) continue

      const inverse = inverses[0]!
      seen.push({ left: sourceIdentity, right: targetIdentity })
      rewrites.push({
        kind: "MergeObjects",
        left: category.src(arrow),
        right: category.dst(arrow),
        forward: arrow,
        backward: inverse,
      })
    }

    if (rewrites.length === 0) return null

    const description =
      rewrites.length === 1
        ? `Treat ${prettyArrow(category, rewrites[0]!.forward)} as an isomorphism of objects.`
        : `Merge ${rewrites.length} pairs of isomorphic objects.`

    return {
      id: makeId(),
      oracle: "IsoObjects",
      severity: "hint",
      message: description,
      rewrites,
    }
  },
})

export class Rewriter<Obj, Arr> {
  private readonly rules: OperationRule<Obj, Arr>[] = []

  private counter = 0

  constructor(rules: OperationRule<Obj, Arr>[] = []) {
    for (const rule of rules) {
      this.register(rule)
    }
  }

  register(rule: OperationRule<Obj, Arr>): void {
    this.rules.push(rule)
  }

  analyze(context: OperationContext<Obj, Arr>): Suggestion<Obj, Arr>[] {
    const suggestions: Suggestion<Obj, Arr>[] = []
    const makeId = () => {
      this.counter += 1
      return `rewrite-${this.counter}`
    }
    for (const rule of this.rules) {
      if (!rule.applicable(context)) continue
      const suggestion = rule.apply(context, makeId)
      if (suggestion) suggestions.push(suggestion)
    }
    return suggestions
  }
}

export const defaultOperationRules = <Obj, Arr>(): OperationRule<Obj, Arr>[] => [
  isoCancellationRule(),
  monicRightInverseUpgrade(),
  balancedMonoEpiUpgrade(),
  epiMonoFactorisationRule(),
  mergeObjectsFromIsos(),
  mutualMonicMerge(),
]
