import type { FiniteCategory } from "../finite-cat"

export interface HasGeneralizedElements<Obj, Arr> {
  readonly generalizedElements: (shape: Obj, target: Obj) => ReadonlyArray<Arr>
}

export interface GeneralizedElementWitness<Obj, Arr> {
  readonly domain: Obj
  readonly codomain: Obj
  readonly shape: Obj
  readonly element: Arr
  readonly left: Arr
  readonly right: Arr
  readonly leftComposite: Arr
  readonly rightComposite: Arr
}

export type GeneralizedElementFailure<Obj, Arr> =
  | { readonly kind: "domainMismatch"; readonly leftDomain: Obj; readonly rightDomain: Obj }
  | { readonly kind: "codomainMismatch"; readonly leftCodomain: Obj; readonly rightCodomain: Obj }
  | { readonly kind: "noShapes"; readonly domain: Obj; readonly codomain: Obj }
  | { readonly kind: "noElements"; readonly domain: Obj; readonly codomain: Obj; readonly shapes: ReadonlyArray<Obj> }
  | {
      readonly kind: "invalidElement"
      readonly domain: Obj
      readonly codomain: Obj
      readonly shape: Obj
      readonly element: Arr
      readonly reason: "domain" | "codomain"
    }
  | { readonly kind: "indistinguishable"; readonly domain: Obj; readonly codomain: Obj }
  | { readonly kind: "noSeparator"; readonly domain: Obj; readonly codomain: Obj; readonly shapes: ReadonlyArray<Obj> }

export interface GeneralizedElementAnalysis<Obj, Arr> {
  readonly holds: boolean
  readonly details: string
  readonly witness?: GeneralizedElementWitness<Obj, Arr>
  readonly failure?: GeneralizedElementFailure<Obj, Arr>
  readonly sampledShapes: ReadonlyArray<Obj>
}

export interface GeneralizedElementOptions<Obj> {
  readonly shapes?: ReadonlyArray<Obj>
}

export function checkGeneralizedElementSeparation<Obj, Arr>(
  category: FiniteCategory<Obj, Arr> & HasGeneralizedElements<Obj, Arr>,
  left: Arr,
  right: Arr,
  options: GeneralizedElementOptions<Obj> = {},
): GeneralizedElementAnalysis<Obj, Arr> {
  const leftDomain = category.src(left)
  const rightDomain = category.src(right)
  if (leftDomain !== rightDomain) {
    return {
      holds: false,
      details: `checkGeneralizedElementSeparation: parallel arrows must share a domain; received ${String(leftDomain)} and ${String(rightDomain)}`,
      failure: { kind: "domainMismatch", leftDomain, rightDomain },
      sampledShapes: options.shapes ?? [],
    }
  }

  const leftCodomain = category.dst(left)
  const rightCodomain = category.dst(right)
  if (leftCodomain !== rightCodomain) {
    return {
      holds: false,
      details: `checkGeneralizedElementSeparation: parallel arrows must share a codomain; received ${String(leftCodomain)} and ${String(rightCodomain)}`,
      failure: { kind: "codomainMismatch", leftCodomain, rightCodomain },
      sampledShapes: options.shapes ?? [],
    }
  }

  const domain = leftDomain
  const codomain = leftCodomain
  const shapes = options.shapes ?? category.objects

  if (shapes.length === 0) {
    return {
      holds: false,
      details: `checkGeneralizedElementSeparation: no shapes were supplied to probe ${String(domain)}→${String(codomain)}`,
      failure: { kind: "noShapes", domain, codomain },
      sampledShapes: shapes,
    }
  }

  const barren: Obj[] = []
  let enumerated = 0

  for (const shape of shapes) {
    const generalized = category.generalizedElements(shape, domain)
    if (generalized.length === 0) {
      barren.push(shape)
      continue
    }

    for (const element of generalized) {
      const elementDomain = category.src(element)
      if (elementDomain !== shape) {
        return {
          holds: false,
          details: `checkGeneralizedElementSeparation: generalized element ${String(element)} has domain ${String(elementDomain)} but expected ${String(shape)}`,
          failure: { kind: "invalidElement", domain, codomain, shape, element, reason: "domain" },
          sampledShapes: shapes,
        }
      }

      const elementCodomain = category.dst(element)
      if (elementCodomain !== domain) {
        return {
          holds: false,
          details: `checkGeneralizedElementSeparation: generalized element ${String(element)} targets ${String(elementCodomain)} but expected ${String(domain)}`,
          failure: { kind: "invalidElement", domain, codomain, shape, element, reason: "codomain" },
          sampledShapes: shapes,
        }
      }

      enumerated += 1
      const leftComposite = category.compose(left, element)
      const rightComposite = category.compose(right, element)

      if (!category.eq(leftComposite, rightComposite)) {
        return {
          holds: true,
          details: `checkGeneralizedElementSeparation: shape ${String(shape)} distinguishes the sampled arrows on ${String(domain)}→${String(codomain)}`,
          witness: { domain, codomain, shape, element, left, right, leftComposite, rightComposite },
          sampledShapes: shapes,
        }
      }
    }
  }

  if (enumerated === 0) {
    const failedShapes = barren.length > 0 ? barren : shapes
    return {
      holds: false,
      details: `checkGeneralizedElementSeparation: no generalized elements were available from the supplied shapes to probe ${String(domain)}→${String(codomain)}`,
      failure: { kind: "noElements", domain, codomain, shapes: failedShapes },
      sampledShapes: shapes,
    }
  }

  if (category.eq(left, right)) {
    return {
      holds: false,
      details: `checkGeneralizedElementSeparation: sampled arrows agree on all ${enumerated} generalized element(s) considered`,
      failure: { kind: "indistinguishable", domain, codomain },
      sampledShapes: shapes,
    }
  }

  return {
    holds: false,
    details: `checkGeneralizedElementSeparation: ${enumerated} generalized element(s) across ${shapes.length} shape(s) failed to distinguish the sampled arrows`,
    failure: { kind: "noSeparator", domain, codomain, shapes },
    sampledShapes: shapes,
  }
}
