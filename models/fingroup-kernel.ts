import type { FinGrpObj, Hom } from "./fingroup-cat"

export function kernelElements(domain: FinGrpObj, codomain: FinGrpObj, f: Hom): string[] {
  if (f.dom !== domain.name) {
    throw new Error(`kernelElements: expected domain ${domain.name} for ${f.name}`)
  }
  if (f.cod !== codomain.name) {
    throw new Error(`kernelElements: expected codomain ${codomain.name} for ${f.name}`)
  }
  const ker: string[] = []
  for (const x of domain.elems) {
    if (f.map(x) === codomain.e) {
      ker.push(x)
    }
  }
  return ker
}

export function isInjectiveHom(domain: FinGrpObj, codomain: FinGrpObj, f: Hom): boolean {
  const seen = new Map<string, string>()
  for (const a of domain.elems) {
    const image = f.map(a)
    const prev = seen.get(image)
    if (prev && prev !== a) {
      return false
    }
    seen.set(image, a)
  }
  return true
}

export interface KernelWitness {
  readonly subgroup: FinGrpObj
  readonly inclusion: Hom
  readonly collapse: Hom
}

export function nonMonoWitness(
  domain: FinGrpObj,
  codomain: FinGrpObj,
  f: Hom,
  options?: { readonly kernelName?: string }
): KernelWitness | null {
  const kerElems = kernelElements(domain, codomain, f)
  if (kerElems.length <= 1) {
    return null
  }
  const kernelName = options?.kernelName ?? `Ker(${f.name})`
  const subgroup: FinGrpObj = {
    name: kernelName,
    elems: kerElems,
    mul: (a, b) => domain.mul(a, b),
    e: domain.e,
    inv: (a) => domain.inv(a),
  }
  const inclusion: Hom = {
    name: `ι_${kernelName}`,
    dom: kernelName,
    cod: domain.name,
    map: (x) => x,
  }
  const collapse: Hom = {
    name: `const_${domain.e}`,
    dom: kernelName,
    cod: domain.name,
    map: (_x: string) => domain.e,
  }
  return { subgroup, inclusion, collapse }
}
