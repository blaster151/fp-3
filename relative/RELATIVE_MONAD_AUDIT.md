# Relative Monad – Classical Monad Audit

This note records the Step 1 audit described in `RELATIVE-MONAD-LAYER.md`. It summarises the
classical monad infrastructure that the relative layer must generalise and lists the concrete
files that require follow-up adapters.

## 1. Data models worth generalising

| Source file | Structure | Fields to mirror in the relative presentation |
| --- | --- | --- |
| `allTS.ts` (`CatMonad<C>`) | Ordinary categorical monads | `category`, `endofunctor`, `unit`, `mult` |
| `allTS.ts` (`MonadK1<F>`, `MonadK1Like<F>`) | Kleisli-style higher-kinded monads | `map`, `of`, `chain` / Kleisli composition helpers |
| `examples-mixed-distributive.ts`, `examples-sum-product.ts` | Concrete `CatMonad` instances | Witnesses used by documentation/tests when constructing sample monads |
| `pushforward-monads.ts` utilities in `allTS.ts` | Monad composition helpers driven by adjunction data | Compose ordinary monads via adjunctions and are exercised in pushforward tests |

*Observations*

- Every classical monad assumes an **endo** functor. The relative layer must isolate the
  identity-root special case so these helpers can call into `fromMonad` / `toMonadIfIdentity`
  without new plumbing.
- Kleisli helpers (`MonadK1Like`) repeatedly invoke `chain` and expect Kleisli composition to be
  available. The relative layer therefore needs pending counterparts for the Street-calculus
  extension/Kleisli helpers until Section 6 actions become executable.

## 2. Law and oracle hooks to parameterise

| Source file | Helper | Intended relative upgrade |
| --- | --- | --- |
| `algebra-oracles.ts` | `checkMonadLaws`, `checkMonadCoherence` | Already referenced by `checkRelativeMonadLaws`; future work replaces root-equality checks with relative framing inputs. |
| `markov-laws.ts` | `expectMonadLeftIdentity`, `expectMonadAssociativity` | Tests expect `bind`/`return`; the relative layer will redirect these to the structural witnesses produced by `analyzeRelativeMonadUnitCompatibility`/`ExtensionAssociativity`. |
| `test/pushforward-laws.spec.ts` & `test/core-adjunction.spec.ts` | Vitest suites exercising monad construction via adjunctions | Remain untouched; once adjunction-to-monad bridges land the relative variants will import these witnesses rather than duplicating cases. |

*Observations*

- Existing law helpers can continue to operate unchanged when the relative monad collapses to an
  identity root; we only need new overloads that accept the relative framing witnesses.
- No legacy tests need to be deleted. Instead, migration notes should point contributors at the
  relative enumerators once the new adapters exist.

## 3. Follow-up adapters recorded for future passes

- Catalogue how `pushforward` helpers in `allTS.ts` depend on the adjunction constructors so the
  Step 3 scaffolding can reuse their witnesses when deriving relative monads from equipment data.
- Note that `examples-advanced-functors.ts` supplies small runnable monad instances. These should
  be mirrored by relative examples after the `virtualizeCategory` helpers gain concrete Street
  action implementations.

---

This audit closes Step 1 of the roadmap; the remaining passes will build the actual adapters and
migrations tracked in the later sections of `RELATIVE-MONAD-LAYER.md`.

## 4. Migration TODOs and codemod notes

- **`allTS.ts` pushforward helpers** – now tagged with `@deprecated` comments.
  Future codemods should replace imports of `pushforwardMonad`,
  `pushforwardMonadEnhanced`, and friends with `relative/relative-monads`
  constructors plus the Street-action analyzers.
- **Adjunction-focused test suites** – add TODO comments in
  `test/pushforward-laws.spec.ts` and `test/pushforward-monad.spec.ts` when the
  relative adjunction bridges land so they assert against the relative law
  enumerators instead of the bespoke pushforward checks.
- **Examples** – `examples.ts` should migrate to the relative identity-root
  helpers once the canonical Street witnesses are executable; leave
  `TODO(relative)` breadcrumbs next time those examples are modified so the
  codemod can swap in the enumerator wiring automatically.
