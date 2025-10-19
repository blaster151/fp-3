import {
  analyzeInternalGroup,
  type CategoryOps,
  type InternalGroupAnalysis,
  type InternalGroupWitness,
  type TerminalWitness,
  enrichInternalGroupDiagonal,
} from './internal-group'
import {
  analyzeInternalMonoid,
  enrichInternalMonoidDiagonal,
  type InternalMonoidAnalysis,
  type InternalMonoidWitness,
} from './internal-monoid'
import type { BinaryProductTuple } from './category-limits-helpers'
import {
  FinGrp,
  FinGrpCat,
  createFinGrpProductMetadataStore,
  type FinGrpCategory,
  type FinGrpObj,
  type Hom,
  type FinGrpProductWitness,
} from './models/fingroup-cat'

const toBinaryTuple = (
  witness: FinGrpProductWitness,
): BinaryProductTuple<FinGrpObj, Hom> => ({
  object: witness.object,
  projections: [witness.projection1, witness.projection2],
  tuple: (domain, legs) => {
    if (legs.length !== 2) {
      throw new Error(
        `makeFinGrpInternalGroupWitness: binary tuple expects 2 legs, received ${legs.length}`,
      )
    }
    const [left, right] = legs
    return witness.pair(domain, left, right)
  },
})

const makeCategoryOps = (objects: readonly FinGrpObj[]) => {
  const category = FinGrpCat(objects)
  const ops: CategoryOps<FinGrpObj, Hom> = {
    compose: category.compose,
    eq: category.eq,
    id: (object) => category.id(object.name),
  }
  return { category, ops }
}

type FinGrpWitnessKind = 'Group' | 'Monoid'

const formatFinGrpElement = (object: FinGrpObj, value: string): string => {
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed) && parsed.every((entry) => typeof entry === 'string')) {
      return `⟨${parsed.join(', ')}⟩`
    }
  } catch {
    // Ignore JSON parsing failures—fall back to the raw element label.
  }
  return value
}

const describeHomomorphismFailure = (
  domain: FinGrpObj,
  codomain: FinGrpObj,
  arrow: Hom,
): string => {
  const formatDomain = (value: string) => formatFinGrpElement(domain, value)
  const formatCodomain = (value: string) => formatFinGrpElement(codomain, value)

  const imageCache = new Map<string, string>()
  const mapElement = (value: string): string => {
    const cached = imageCache.get(value)
    if (cached !== undefined) {
      return cached
    }
    const image = arrow.map(value)
    imageCache.set(value, image)
    return image
  }

  const ensureCodomainMembership = (source: string, image: string): string | undefined => {
    if (!codomain.elems.includes(image)) {
      return `${formatDomain(source)} maps to ${image}, which is not an element of ${codomain.name}`
    }
    return undefined
  }

  const imageOfIdentity = mapElement(domain.e)
  const identityMembership = ensureCodomainMembership(domain.e, imageOfIdentity)
  if (identityMembership) {
    return identityMembership
  }
  if (imageOfIdentity !== codomain.e) {
    return `sends the identity ${formatDomain(domain.e)} to ${formatCodomain(imageOfIdentity)} instead of ${formatCodomain(
      codomain.e,
    )}`
  }

  for (const a of domain.elems) {
    const imageA = mapElement(a)
    const membershipA = ensureCodomainMembership(a, imageA)
    if (membershipA) {
      return membershipA
    }

    for (const b of domain.elems) {
      const imageB = mapElement(b)
      const membershipB = ensureCodomainMembership(b, imageB)
      if (membershipB) {
        return membershipB
      }

      const product = domain.mul(a, b)
      const imageProduct = mapElement(product)
      const membershipProduct = ensureCodomainMembership(product, imageProduct)
      if (membershipProduct) {
        return membershipProduct
      }

      const combined = codomain.mul(imageA, imageB)
      if (imageProduct !== combined) {
        return `fails to preserve products on ${formatDomain(a)} ⋅ ${formatDomain(b)}: f(${formatDomain(
          product,
        )}) = ${formatCodomain(imageProduct)} but f(${formatDomain(a)}) ⋅ f(${formatDomain(b)}) = ${formatCodomain(combined)}`
      }
    }
  }

  return 'violates the FinGrp homomorphism laws'
}

const ensureFinGrpHomomorphism = (
  category: FinGrpCategory,
  arrow: Hom,
  kind: FinGrpWitnessKind,
  role: 'multiplication' | 'inversion',
  carrier: FinGrpObj,
): Hom => {
  const witnessLabel = `makeFinGrpInternal${kind}Witness`
  const base = `${witnessLabel}(${carrier.name}): ${role}`

  const lookup = (name: string, slot: 'domain' | 'codomain'): FinGrpObj => {
    try {
      return category.lookup(name)
    } catch (error) {
      const detail = error instanceof Error ? ` ${error.message}` : ''
      throw new Error(`${base} references an unknown ${slot} ${name}.${detail}`)
    }
  }

  const domain = lookup(arrow.dom, 'domain')
  const codomain = lookup(arrow.cod, 'codomain')

  if (!category.isHom(arrow)) {
    const detail = describeHomomorphismFailure(domain, codomain, arrow)
    const requirement =
      kind === 'Group'
        ? 'internal groups in Grp require abelian carriers'
        : 'internal monoids in Grp require abelian carriers'
    throw new Error(
      `${base} must be a FinGrp homomorphism; ${requirement} (dom=${domain.name}, cod=${codomain.name}): ${detail}`,
    )
  }

  return arrow
}

const makeMultiplication = (group: FinGrpObj, product: FinGrpProductWitness): Hom => ({
  name: `mul_${group.name}`,
  dom: product.object.name,
  cod: group.name,
  map: (value) => {
    const [left, right] = product.decompose(value)
    return group.mul(left, right)
  },
})

const makeInverse = (group: FinGrpObj): Hom => ({
  name: `inv_${group.name}`,
  dom: group.name,
  cod: group.name,
  map: (value) => group.inv(value),
})

const makeUnit = (group: FinGrpObj, terminal: FinGrpObj): Hom => ({
  name: `e_${group.name}`,
  dom: terminal.name,
  cod: group.name,
  map: () => group.e,
})

const makeTerminate = (terminal: FinGrpObj): ((domain: FinGrpObj) => Hom) =>
  (domain) => ({
    name: `!_${domain.name}`,
    dom: domain.name,
    cod: terminal.name,
    map: () => terminal.e,
  })

export interface FinGrpInternalGroupWitness {
  readonly group: FinGrpObj
  readonly category: CategoryOps<FinGrpObj, Hom>
  readonly witness: InternalGroupWitness<FinGrpObj, Hom>
}

export const makeFinGrpInternalGroupWitness = (group: FinGrpObj): FinGrpInternalGroupWitness => {
  const store = createFinGrpProductMetadataStore()
  const product = FinGrp.product(group, group, store, { name: `${group.name}×${group.name}` })
  const productLeft = FinGrp.product(product.object, group, store, {
    name: `(${product.object.name})×${group.name}`,
  })
  const productRight = FinGrp.product(group, product.object, store, {
    name: `${group.name}×(${product.object.name})`,
  })

  const { category, ops } = makeCategoryOps([
    group,
    product.object,
    productLeft.object,
    productRight.object,
  ])

  const terminal = category.lookup('1')
  const unit: TerminalWitness<FinGrpObj, Hom> = {
    object: terminal,
    terminate: makeTerminate(terminal),
  }

  const multiplication = ensureFinGrpHomomorphism(
    category,
    makeMultiplication(group, product),
    'Group',
    'multiplication',
    group,
  )

  const inverse = ensureFinGrpHomomorphism(
    category,
    makeInverse(group),
    'Group',
    'inversion',
    group,
  )

  const unitArrow = makeUnit(group, terminal)

  const witness: InternalGroupWitness<FinGrpObj, Hom> = {
    object: group,
    product: toBinaryTuple(product),
    multiplication,
    unit: {
      terminal: unit,
      arrow: unitArrow,
    },
    inverse,
    productLeft: toBinaryTuple(productLeft),
    productRight: toBinaryTuple(productRight),
    diagonal: enrichInternalGroupDiagonal(ops, toBinaryTuple(product), {
      object: group,
      identity: ops.id(group),
    }),
  }

  return { group, category: ops, witness }
}

export interface FinGrpInternalMonoidWitness {
  readonly monoid: FinGrpObj
  readonly category: CategoryOps<FinGrpObj, Hom>
  readonly witness: InternalMonoidWitness<FinGrpObj, Hom>
}

export const makeFinGrpInternalMonoidWitness = (group: FinGrpObj): FinGrpInternalMonoidWitness => {
  const store = createFinGrpProductMetadataStore()
  const product = FinGrp.product(group, group, store, { name: `${group.name}×${group.name}` })
  const productLeft = FinGrp.product(product.object, group, store, {
    name: `(${product.object.name})×${group.name}`,
  })
  const productRight = FinGrp.product(group, product.object, store, {
    name: `${group.name}×(${product.object.name})`,
  })

  const { category, ops } = makeCategoryOps([
    group,
    product.object,
    productLeft.object,
    productRight.object,
  ])

  const terminal = category.lookup('1')
  const unit: TerminalWitness<FinGrpObj, Hom> = {
    object: terminal,
    terminate: makeTerminate(terminal),
  }

  const multiplication = ensureFinGrpHomomorphism(
    category,
    makeMultiplication(group, product),
    'Monoid',
    'multiplication',
    group,
  )

  const unitArrow = makeUnit(group, terminal)

  const witness: InternalMonoidWitness<FinGrpObj, Hom> = {
    object: group,
    product: toBinaryTuple(product),
    multiplication,
    unit: {
      terminal: unit,
      arrow: unitArrow,
    },
    productLeft: toBinaryTuple(productLeft),
    productRight: toBinaryTuple(productRight),
    diagonal: enrichInternalMonoidDiagonal(ops, toBinaryTuple(product), {
      object: group,
      identity: ops.id(group),
    }),
  }

  return { monoid: group, category: ops, witness }
}

type FinGrpInternalGroupAnalysisContext =
  InternalGroupAnalysis<FinGrpObj, Hom>['context'] & {
    readonly group: FinGrpObj
  }

export type FinGrpInternalGroupAnalysis = InternalGroupAnalysis<FinGrpObj, Hom> & {
  readonly context: FinGrpInternalGroupAnalysisContext
}

type FinGrpInternalMonoidAnalysisContext =
  InternalMonoidAnalysis<FinGrpObj, Hom>['context'] & {
    readonly monoid: FinGrpObj
  }

export type FinGrpInternalMonoidAnalysis = InternalMonoidAnalysis<FinGrpObj, Hom> & {
  readonly context: FinGrpInternalMonoidAnalysisContext
}

export const analyzeFinGrpInternalGroup = (
  input: FinGrpInternalGroupWitness,
): FinGrpInternalGroupAnalysis => {
  const analysis = analyzeInternalGroup(input)
  const { category, witness } = analysis.context
  const context: FinGrpInternalGroupAnalysisContext = {
    category,
    witness,
    group: input.group,
  }

  return { ...analysis, context }
}

export const analyzeFinGrpInternalMonoid = (
  input: FinGrpInternalMonoidWitness,
): FinGrpInternalMonoidAnalysis => {
  const analysis = analyzeInternalMonoid(input)
  const { category, witness } = analysis.context
  const context: FinGrpInternalMonoidAnalysisContext = {
    category,
    witness,
    monoid: input.monoid,
  }

  return { ...analysis, context }
}
