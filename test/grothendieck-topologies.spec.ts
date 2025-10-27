import { describe, expect, it } from "vitest"
import {
  CommutativeRingSamples,
  buildZariskiSiteTopology,
  checkEtaleCover,
  checkGrothendieckTopology,
  checkZariskiPrincipalOpenCover,
  type EtaleCover,
  type GrothendieckTopology,
  type IdentitySample,
  type PrincipalOpenCover,
  type PullbackSample,
  type RefinementSample,
  type Site,
  type TransitivitySample,
  type Ring,
  type RingHomomorphism,
  type ZariskiInclusion,
} from "../allTS"
import type { SimpleCat } from "../simple-cat"

type Open = "A" | "B" | "C"

interface Inclusion {
  readonly from: Open
  readonly to: Open
}

type CoveringFamily<Obj, Arr> = ReturnType<Site<Obj, Arr>["coverings"]>[number]

const makeInclusion = (from: Open, to: Open): Inclusion => ({ from, to })

const inclusionCategory: SimpleCat<Open, Inclusion> = {
  id: (object) => makeInclusion(object, object),
  compose: (g, f) => makeInclusion(f.from, g.to),
  src: (arrow) => arrow.from,
  dst: (arrow) => arrow.to,
}

const buildSite = (): Site<Open, Inclusion> => {
  const site: Site<Open, Inclusion> = {
    category: inclusionCategory,
    coverings: (object) => {
      const identityCover: CoveringFamily<Open, Inclusion> = {
        site,
        target: object,
        arrows: [site.category.id(object)],
        label: `${object} identity`,
      }

      if (object === "C") {
        return [
          identityCover,
          {
            site,
            target: "C",
            arrows: [makeInclusion("A", "C"), makeInclusion("B", "C")],
            label: "{A, B} → C",
          },
        ]
      }

      return [identityCover]
    },
    objectEq: (left, right) => left === right,
    arrowEq: (left, right) => left.from === right.from && left.to === right.to,
    label: "Finite open cover site",
  }
  return site
}

const buildGrothendieckTopology = (
  site: Site<Open, Inclusion>,
): GrothendieckTopology<Open, Inclusion> => ({
  site,
  coverings: site.coverings,
  label: "Finite open Grothendieck topology",
})

const integersMod = (modulus: number): Ring<number> => ({
  zero: 0,
  one: 1,
  add: (left, right) => (left + right) % modulus,
  mul: (left, right) => (left * right) % modulus,
  neg: (value) => (modulus - value) % modulus,
  sub: (left, right) => (left - right + modulus) % modulus,
  eq: (left, right) => ((left - right) % modulus + modulus) % modulus === 0,
})

const ring5 = integersMod(5)

const identityHom: RingHomomorphism<number, number> = {
  source: ring5,
  target: ring5,
  map: (value) => value % 5,
  label: "id",
}

const doublingHom: RingHomomorphism<number, number> = {
  source: ring5,
  target: ring5,
  map: (value) => (2 * value) % 5,
  label: "×2",
}

describe("Grothendieck topologies", () => {
  const site = buildSite()
  const topology = buildGrothendieckTopology(site)
  const uvCover = topology.coverings("C").find(cover => cover.label === "{A, B} → C")!

  const identitySamples: IdentitySample<Open>[] = [{ object: "A" }, { object: "B" }, { object: "C" }]

  const pullbackSamples: PullbackSample<Open, Inclusion>[] = [
    {
      arrow: site.category.id("C"),
      covering: uvCover,
      pullback: uvCover,
      lifts: [
        { original: makeInclusion("A", "C"), lift: makeInclusion("A", "C") },
        { original: makeInclusion("B", "C"), lift: makeInclusion("B", "C") },
      ],
    },
  ]

  const refinementA: RefinementSample<Open, Inclusion> = {
    original: makeInclusion("A", "C"),
    covering: {
      site,
      target: "A",
      arrows: [site.category.id("A")],
      label: "A identity",
    },
    composites: [
      {
        refined: site.category.id("A"),
        composite: makeInclusion("A", "C"),
      },
    ],
  }

  const refinementB: RefinementSample<Open, Inclusion> = {
    original: makeInclusion("B", "C"),
    covering: {
      site,
      target: "B",
      arrows: [site.category.id("B")],
      label: "B identity",
    },
    composites: [
      {
        refined: site.category.id("B"),
        composite: makeInclusion("B", "C"),
      },
    ],
  }

  const transitivitySamples: TransitivitySample<Open, Inclusion>[] = [
    {
      covering: uvCover,
      refinements: [refinementA, refinementB],
      composite: uvCover,
    },
  ]

  it("verifies the sampled Grothendieck topology axioms", () => {
    const result = checkGrothendieckTopology(topology, {
      identitySamples,
      pullbackSamples,
      transitivitySamples,
    })

    expect(result.holds).toBe(true)
    expect(result.metadata.identitiesTested).toBe(identitySamples.length)
    expect(result.witnesses.length).toBeGreaterThan(0)
  })

  it("detects missing identities in Grothendieck topology samples", () => {
    const identitylessTopology: GrothendieckTopology<Open, Inclusion> = {
      site,
      coverings: (object) => (object === "C" ? [uvCover] : []),
      label: "Identityless",
    }

    const flawedResult = checkGrothendieckTopology(identitylessTopology, {
      identitySamples,
      pullbackSamples,
      transitivitySamples,
    })

    expect(flawedResult.holds).toBe(false)
    expect(flawedResult.violations.some(v => v.kind === "identityMissing")).toBe(true)
  })
})

describe("Zariski site topology builder", () => {
  const integerSample = CommutativeRingSamples.integers.ring
  const spectrum = {
    ring: integerSample.ring,
    points: integerSample.primeSpectrum,
    label: integerSample.label,
  }

  const topologyResult = buildZariskiSiteTopology(spectrum, {
    maxCoverSize: 2,
    principalCoverOptions: {
      coefficientSamples: [-2n, -1n, 0n, 1n, 2n],
    },
  })

  const eq = integerSample.ring.eq ?? ((left: bigint, right: bigint) => left === right)

  it("derives principal open coverings and enriches the Grothendieck topology", () => {
    const specOpen = topologyResult.site.opens.find(open => open.id === "Spec")!

    expect(topologyResult.principalCoverings.length).toBeGreaterThan(0)

    const specCovering = topologyResult.principalCoverings.find(cover => {
      if (cover.target.id !== specOpen.id || cover.generators.length !== 2) {
        return false
      }
      const has2 = cover.generators.some(generator => eq(generator, 2n))
      const has3 = cover.generators.some(generator => eq(generator, 3n))
      return has2 && has3
    })

    expect(specCovering).toBeDefined()
    expect(specCovering?.validation.holds).toBe(true)
    expect(specCovering?.covering.arrows.length).toBe(2)

    const specCoverings = topologyResult.topology.coverings(specOpen)
    expect(specCoverings).toContain(specCovering!.covering)
  })

  it("validates the enriched topology using sampled Grothendieck axioms", () => {
    const specOpen = topologyResult.site.opens.find(open => open.id === "Spec")!

    const specCovering = topologyResult.principalCoverings.find(cover => cover.target.id === specOpen.id && cover.covering.arrows.length === 2)
    expect(specCovering).toBeDefined()

    const identitySamples: IdentitySample<typeof specOpen>[] = [{ object: specOpen }]

    const pullbackSamples: PullbackSample<typeof specOpen, ZariskiInclusion<bigint>>[] = [
      {
        arrow: topologyResult.site.category.id(specOpen),
        covering: specCovering!.covering,
        pullback: specCovering!.covering,
        lifts: specCovering!.covering.arrows.map(arrow => ({ original: arrow, lift: arrow })),
      },
    ]

    const transitivitySamples: TransitivitySample<typeof specOpen, ZariskiInclusion<bigint>>[] = [
      {
        covering: specCovering!.covering,
        refinements: specCovering!.covering.arrows.map(arrow => {
          const identity = topologyResult.site.category.id(arrow.from)
          return {
            original: arrow,
            covering: {
              site: topologyResult.site,
              target: arrow.from,
              arrows: [identity],
              label: `${arrow.from.label ?? arrow.from.id} identity`,
            },
            composites: [
              {
                refined: identity,
                composite: arrow,
              },
            ],
          }
        }),
        composite: specCovering!.covering,
      },
    ]

    const result = checkGrothendieckTopology(topologyResult.topology, {
      identitySamples,
      pullbackSamples,
      transitivitySamples,
    })

    expect(result.holds).toBe(true)
    expect(result.metadata.pullbackSamples).toBe(pullbackSamples.length)
    expect(result.metadata.transitivitySamples).toBe(transitivitySamples.length)
  })
})

describe("Zariski principal open covers", () => {
  it("witnesses the unit ideal for a basic open cover", () => {
    const cover: PrincipalOpenCover<number> = {
      ring: ring5,
      generators: [1, 2],
      label: "D(1) ∪ D(2)",
    }

    const result = checkZariskiPrincipalOpenCover(cover, {
      coefficientSamples: [2, 3, 4],
    })

    expect(result.holds).toBe(true)
    expect(result.metadata.generatorCount).toBe(2)
    expect(result.witnesses[0]?.coefficients.length).toBe(2)
  })

  it("reports failure when coefficients cannot witness the unit ideal", () => {
    const cover: PrincipalOpenCover<number> = {
      ring: ring5,
      generators: [2],
      label: "D(2)",
    }

    const result = checkZariskiPrincipalOpenCover(cover, {
      coefficientSamples: [0, 2, 4],
    })

    expect(result.holds).toBe(false)
    expect(result.violations[0]?.kind).toBe("unitIdealNotWitnessed")
  })
})

describe("étale covers", () => {
  const etaleCover: EtaleCover<number, number> = {
    base: ring5,
    maps: [
      {
        hom: identityHom,
        section: (value) => value,
        label: "identity",
      },
    ],
    label: "Identity étale cover",
  }

  const nonEtaleCover: EtaleCover<number, number> = {
    base: ring5,
    maps: [
      {
        hom: doublingHom,
        section: (value) => value,
        label: "×2",
      },
    ],
    label: "Doubling cover",
  }

  it("confirms étale covers with identity sections", () => {
    const domainSamples = [0, 1, 2, 3, 4]
    const sectionSamples = [0, 1, 2, 3, 4]
    const result = checkEtaleCover(etaleCover, {
      domainSamples,
      sectionSamples,
    })

    expect(result.holds).toBe(true)
    expect(result.metadata.homomorphismsChecked).toBe(1)
    expect(result.witnesses.length).toBe(sectionSamples.length)
  })

  it("detects failures when sections do not split the morphisms", () => {
    const domainSamples = [0, 1, 2]
    const sectionSamples = [0, 1, 2]
    const result = checkEtaleCover(nonEtaleCover, {
      domainSamples,
      sectionSamples,
    })

    expect(result.holds).toBe(false)
    expect(result.violations.some(v => v.kind === "sectionMismatch")).toBe(true)
  })
})
