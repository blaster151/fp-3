# Topology diagnostics and limit reporters

The topology toolkit now ships with a uniform continuity descriptor, registry reporters,
and reusable sample spaces. Together they make it easy to script demos and tests that
exercise the enriched witnesses powering our oracles.

## Continuity descriptors and enriched witnesses

Continuous maps are constructed with `makeContinuousMap`, which normalises any supplied
source/target topologies, optionally derives initial/final structures, and packages the
resulting morphism with a `ContinuityWitness`. The witness exposes whether continuity
holds, a `verify` callback that recomputes the check, and the precise open-set
preimages that failed so diagnostics can surface counterexamples. Successful
certificates include an enriched payload (currently a note plus every preimage) so
compositions can inherit human-readable explanations.【F:src/top/ContinuousMap.ts†L24-L205】【F:src/top/ContinuousMap.ts†L206-L323】

The `compose` helper reuses those enriched payloads: when both components carry witness
notes the composite aggregates them and appends a `"composition witness"` marker so any
registry consumer can see which stages supplied evidence. This makes the oracle output
stable even when several constructions share the same underlying witnesses.【F:src/top/ContinuousMap.ts†L323-L371】

## Registry reporters and descriptors

`ContRegistry` records featured continuous maps under stable descriptor tags. The
`createContRegistry` factory hides the registry entries inside a closure and returns
methods (`register`, `runAll`, `summarize`, plus Markdown/JSON renderers) so demos can
surface the same continuity evidence that our tests assert on. Each registry entry
stores the raw witness (including any enriched payload) so downstream tooling can
inspect open-set failures or human-authored notes without re-running the check.【F:src/top/ContRegistry.ts†L33-L96】

The catalogue in `cont_packs.ts` populates a registry instance with the continuity
demos showcased in the runnable examples. Because every entry is constructed with
`makeContinuousMap`, the registry reports inherit the enriched witnesses described
above, and the tags double as human-readable descriptors for documentation and
diagnostics.【F:src/top/cont_packs.ts†L19-L224】

## Sample spaces and limit reporters

`Spaces.ts` offers canonical finite spaces—Sierpiński, co-Sierpiński, excluded point
variants, and their discrete/indiscrete relatives—so examples and tests can build
continuous maps without redefining fixtures. Each accessor returns a `TopStructure`,
enabling structured verification and consistent pretty-printing across demos.【F:src/top/Spaces.ts†L1-L116】【F:src/top/Spaces.ts†L117-L170】

For universal properties, `limits.ts` provides a unified builder that aggregates cone
and cocone leg checks together with mediator diagnostics. `makeUniversalPropertyReport`
carries failures forward with descriptive labels, giving runnable scripts a single
reporting surface for limits, colimits, and any custom diagram that needs the same
shape of feedback.【F:src/top/limits.ts†L1-L84】

## Putting it together

The new runnable stages `082` and `083` demonstrate these features in practice: the
continuity diagnostics stage catches a non-continuous map, inspects the enriched
witness, and shows how registry summaries stay in sync with the descriptors; the limit
reporting stage builds both successful and failing universal-property reports using the
shared reporters. Both follow the existing topology demo style so they can slot directly
into the runnable catalogue.
