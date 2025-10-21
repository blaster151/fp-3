# Future Enhancements

## Set Big Unlocks

### 1. Topos-level internal logic for `Set`
- ✅ Completed via the Ω classifier, characteristic combinators, CategoryLimits adapters, and runnable examples recorded in `set-subobject-classifier.ts`, `set-category-limits.ts`, and `examples/runnable/087-set-omega-internal-logic.ts`.

### 2. Robust infinite carriers instead of heuristics
- **Goal**: Replace the size-based heuristics and bespoke lookup tables that currently decide when to materialise products, coproducts, and exponentials with principled carrier semantics, so infinite constructions admit the same universal-property guarantees as finite ones.
- **Why it matters**: Lazily defined sets and large universes should compose without surprising cache invalidations or silent truncation; oracles and power objects must be able to witness infinite behaviour directly rather than delegating to hand-coded special cases.
- **Substeps**:
  1. **Carrier semantics abstraction** – Introduce a `SetCarrierSemantics` (or similarly named) interface in `set-cat.ts` that captures membership, iteration, and equality for both finite and infinite carriers; migrate existing `LazySet` guards to this interface and ensure all object constructors accept explicit semantics instances instead of inferring strategies from cardinalities.
  2. **Deterministic (co)limit builders** – Reimplement `SetCat.product`, `SetCat.coproduct`, and related helpers (`set-small-limits.ts`, `set-pullbacks.ts`) so they compute carriers through the new semantics rather than heuristics. This includes explicit iterators for potentially infinite tuples, projections/injections that do not rely on cached arrays, and universal-property witnesses that validate membership lazily but deterministically.
  3. **Exponential and power-object overhaul** – Refactor `SetCat.exponential`, `SetCat.powerObject`, and Ω-based helpers to build evaluation/currying data from the carrier semantics. Ensure characteristic maps, Heyting operations, and power-object enumerations can stream infinite fibres while still exposing finite snapshots for tests. Update `set-laws.ts` and oracle suites to consume the new representations.
  4. **Cache and witness stabilisation** – Replace ad-hoc lookup tables with memoisation keyed by semantics-aware hashes so repeated products/exponentials of infinite carriers reuse structure safely. Audit downstream modules (`set-subobject-tools.ts`, `set-small-limits.ts`, `set-category-limits.ts`, runnable examples) to ensure they no longer depend on implicit materialisation orders.
  5. **Verification and regression coverage** – Extend Vitest suites (e.g., `test/set-lazy-carriers.spec.ts`, `test/set-subobject-classifier.spec.ts`, `law.SetSubobjectTools.spec.ts`) with fixtures covering stream-based and probabilistic carriers. Add oracle checks that compare the new constructions against known infinite witnesses and document the behaviour in `LAWS.md`/`runnable-examples-outline.md` so downstream tooling understands the upgraded semantics.

### 3. Higher-level arithmetic and logic oracles for `Set`
- **Goal**: Promote the natural-numbers object diagnostics (zero/successor separation, inductive subobjects, primitive recursion, and initial-algebra witnesses) from the FinSet backend into raw `Set`, reusing the Ω classifier so the proofs run over infinite and lazily represented carriers.
- **Why it matters**: The arithmetic law suite validates Heyting logic against ℕ; extending it to `Set` unlocks reusable witnesses for successor splittings, recursion combinators, and Dedekind-infinite reasoning on arbitrary carriers.
- **Substeps**:
  1. **Construct the Set natural-numbers object** – Define a lazily enumerated ℕ carrier, zero arrow, and successor endomorphism in a dedicated module (e.g., `set-natural-numbers-object.ts`). Implement the `CategoryLimits.NaturalNumbersObjectWitness` interface by producing mediators via primitive recursion and validating sequences against the Ω-backed classifier guards.
  2. **Wire CategoryLimits diagnostics** – Expose `SetNaturalNumbersObject` through the Set limits barrel, then adapt the arithmetic oracles to run with `SetSubobjectClassifier`, ensuring zero/successor separation, inductive subobject checks, primitive recursion, and initial-algebra mediators derive their witnesses from the classifier rather than bespoke finite evidence.
  3. **Executable coverage** – Extend `set-oracles.ts`, `test/set-oracles.spec.ts`, and the runnable examples catalogue with fixtures that round-trip Set-based arithmetic witnesses, demonstrating that the infinite carrier respects the same logical identities as the FinSet backend.

## Virtual Equipment Dualisation for V-Cat^co
- **What could be implemented:** Proposition 8.22 identifies an isomorphism between the virtual double categories V-Cat^co and V^co-Cat. Once the virtual equipment API exposes a programmatic dualisation (on objects, tight morphisms, and loose cells), we can add witnesses/analyzers that replay this equivalence and compare the induced distributors.
- **Trigger factor:** Implemented support for forming the co equipment (reversing tight 1-cells and proarrows) together with automatic transport of enriched hom/tensor data.
- **Source:** User-supplied Section 8.5 excerpt detailing Proposition 8.22.

## Relative Comonad Partial Right Adjoints
- **What could be implemented:** Theorem 8.23 constructs partial right adjoints for V-functors with small domain by dualising the enriched relative monad machinery. We could expose a `RelativeComonadPartialRightAdjointWitness` that records the induced V-natural transformations and verifies the universal property against the Lemma 6.38 section data.
- **Trigger factor:** Availability of executable V-natural transformations for comonad-induced copresheaves plus a dual of the relative monad hom-isomorphism analyzer so we can form the comparison functor into V^co-Cat automatically.
- **Source:** User-provided Section 8 excerpt covering Theorem 8.23 and the surrounding discussion on V-copresheaves.

## Generalised MNNE Left Kan Extensions
- **What could be implemented:** Extend `analyzeFiniteVectorLeftKanExtension` to work with arbitrary finite semirings and to synthesise the required cocone data automatically from a recorded relative adjunction instead of brute-force enumeration.
- **Trigger factor:** Availability of executable relative adjunction -> Kan extension translators (or a reusable left Kan solver) so the analyzer can ingest large structured diagrams without combinatorial explosion.
- **Source:** Section 2 of *Monads Need Not Be Endofunctors* (user-supplied scans) discussing the FinSet → Set left Kan extension and its monoidal structure.

## Non-finitary MNNE relatives (Examples 8–10)
- **What could be implemented:** Bring the powerset, coordinatewise vector, and possibly infinite λ-term relative monads into the executable suite by supporting infinite (co)limits, finitary approximation heuristics, or symbolic enumeration of context growth.
- **Trigger factor:** Infrastructure for representing infinite sets/relations (e.g., lazy generators or algebraic data types with decidable equality) together with Kan-extension solvers that can certify the Example 8–10 κ\_T isomorphisms without exhaustive enumeration.
- **Source:** Examples 8–10 from *Monads Need Not Be Endofunctors* (user-provided excerpt highlighting the non-finitary behaviour of P, Vec, and Lam).

## Indexed Container Substitution Mechanics
- **What could be implemented:** Upgrade `analyzeIndexedContainerRelativeMonad` to accept arbitrary indexed container substitution data (shape composition, context reindexing, and variable binding) instead of the current focus-position simplification. This would allow Example 4’s reduction of strictly positive families to W-types to run with genuine κ/σ substitutions.
- **Trigger factor:** A structured witness for indexed container substitution (e.g., explicit composition operators or a programmable tree-building calculus) so the analyzer can synthesise the substituted shapes rather than projecting a single focused value.
- **Source:** Example 4 of *Monads Need Not Be Endofunctors* (user-supplied scan highlighting the indexed container construction).

## Typed λ-Calculus Relative Monad (Example 3)
- **What could be implemented:** Encode the typed λ-calculus Example 3 as an executable relative monad by representing contexts as finite lists of simple types, adding type-directed term constructors, and checking the substitution/prism diagrams highlighted in the paper.
- **Trigger factor:** Infrastructure for finite product categories of types (e.g., a small typed context equipment with automatic weakening/renaming) so the analyzer can generate well-scoped, well-typed terms and substitutions without hand-written enumerations.
- **Source:** Example 3 from *Monads Need Not Be Endofunctors* (user-provided excerpt covering the typed λ-calculus construction).

## General Splitting Morphisms for Theorem 3
- **What could be implemented:** Extend the new Kleisli diagnostics to a full category of splittings by recording the functorial action \(V : D → D'\) and comparing the induced mediating transformations against both Kleisli and Eilenberg–Moore presentations, making the initial/terminal claims of Theorem 3 executable.
- **Trigger factor:** Availability of executable transformation synthesis between relative Kleisli/Eilenberg–Moore witnesses (e.g., a reusable bridge that derives comparison functors from supplied adjunction data) so the analyzer can construct the morphism witnesses instead of accepting user-specified placeholders.
- **Source:** Theorem 3 from *Monads Need Not Be Endofunctors* (user-supplied scan outlining splitting morphisms).

## Lax Monoidal Functor Categories Beyond Identity Transformations
- **What could be implemented:** Generalise `analyzeMnneLaxMonoidalStructure` to accept non-trivial Lan\_j unitors/associators by synthesising the tensor of natural transformations rather than relying on identity comparisons, enabling future witnesses drawn from richer equipments.
- **Trigger factor:** Implemented support for whiskering Lan\_j across natural transformations (or a reusable constructor that evaluates `Lan_j` on arrow data) so the analyzer can build `ρ_F ⊙ id_G`, `id_F ⊙ λ_G`, and the pentagon composites instead of defaulting to identity arrows.
- **Source:** Section 3.2 of *Monads Need Not Be Endofunctors* (user-provided scan describing the lax monoidal structure on `[J,C]`).

## Well-Behaved Density and Lan Comparisons
- **What could be implemented:** Extend `analyzeMnneWellBehavedInclusion` with the remaining Definition 4.1 checks by replaying the Lan\_j comparison maps `L^F_{X,Y}` and the density factorisations so the oracle confirms the partial right adjoints demanded by Theorem 6. The analyzer should synthesise the Lan\_j colimits, compare them against the recorded functors, and certify that the canonical maps are isomorphisms.
- **Trigger factor:** Availability of a reusable finite Lan\_j solver (or adjunction-driven constructors) that can build the required colimit witnesses and comparison arrows automatically, allowing the analyzer to compute the red/green composites instead of relying solely on full-faithfulness checks.
- **Source:** Definition 4.1 and Theorem 6 from *Monads Need Not Be Endofunctors* (user-provided scans covering the well-behaved conditions).

## Reference Mining Candidates
- **Potential value:** Several references near the end of the paper (e.g., Altenkirch–Chapman–Uustalu on monads in computer science, Ahrens et al. on substitution systems, and Street’s enriched Yoneda work) likely contain reusable constructions for enriched (co)monads and partial adjoints.
- **Trigger factor:** Once the current Section 8 enrichments stabilise, revisit these citations to import additional examples (such as `Monads need not be endofunctors` or `Enriched Yoneda`s) into executable witnesses/oracles.
- **Source:** User-supplied reference list excerpt featuring entries like [ACU10], [AHR+21], [Str72], [DS97], [Kel05], alongside the lambda-calculus papers of Altenkirch–Reus and Altenkirch–Reus–Streicher cited in Examples 2–3.
