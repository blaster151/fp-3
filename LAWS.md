# Algebraic Laws and Witnesses

This document catalogs the algebraic laws that our functional programming constructs must satisfy. Each law should have:
1. **Law** - The mathematical equation
2. **Shape** - The IR pattern it matches
3. **Witness** - A property test that verifies the law

## Core Algebraic Structures

### Initial tensor unit induces semicartesian structure

- **Domain**: Symmetric monoidal categories whose tensor unit is an initial object.
- **Statement**: For every object \(X\), the canonical arrow \(!_{X} : I \to X\) induced by initiality is unique, yielding a semicartesian structure.
- **Rationale**: These canonical global elements supply the discard-style maps required for the paper's weak infinite products.
- **Oracle**: `checkInitialUnitSemicartesian(data, targets, samples)` → `{ holds, witness, details, failures }`
- **Witness**: `SemicartesianStructure` exposing `globalElement(X)` for each object.
- **Tests**: `law.SemicartesianCRingPlus.spec.ts`
- **Examples**: `CRing_⊕` with initial object `ℤ` via `checkCRingPlusInitialSemicartesian`.
- **Implementation Notes**: Extendable to any category providing an `InitialObjectWitness` whose object matches the tensor unit.

### CRing⊕ causality counterexample

- **Domain**: Additive/unit-preserving morphisms between commutative rings regarded as objects of `CRing_⊕`.
- **Statement**: There exist morphisms \(h_1, h_2 : \mathbb{Z}[t] \to \mathbb{Z}[t]\), \(g : \mathbb{Z}[t] \to \mathbb{Z}[t]\), and \(f : \mathbb{Z}[t] \to \mathbb{Z}[t]\) such that \(f \circ g \circ h_1 = f \circ g \circ h_2\) yet \(g \circ h_1 \neq g \circ h_2\), demonstrating a failure of the causal no-signalling principle.
- **Rationale**: Demonstrates that semicartesian structure alone does not enforce the causal no-signalling principle, motivating the paper’s distinction between semicartesian and Markov infinite products.
- **Oracle**: `checkCRingPlusCausalityCounterexample()` → `{ holds, equalAfterObservation, equalBeforeObservation, witness, homChecks, details }`
- **Witness**: `buildCRingPlusCausalityScenario()` packages the canonical evaluation and shift morphisms on \(\mathbb{Z}[t]\) whose composites satisfy the counterexample.
- **Tests**: `law.CRingPlusCausalityCounterexample.spec.ts`
- **Examples**: Polynomial evaluation at 0 and 1 together with the substitution \(t \mapsto t+1\) supply the morphisms.
- **Implementation Notes**: Witness extraction records explicit polynomials separating \(g \circ h_1\) from \(g \circ h_2\) while confirming each morphism preserves 0, 1, addition, and negation.

### Complex numbers as a C*-algebra

- **Domain**: The C*-algebra of complex numbers with conjugation and the standard absolute-value norm.
- **Statement**: Complex conjugation is an involutive *-anti-automorphism, \(\|z^* z\| = \|z\|^2\) for every \(z \in \mathbb{C}\), and canonical *-homomorphisms are contractive.
- **Rationale**: Supplies the baseline C*-algebra promised in the paper so additional operator-algebra structures can reuse concrete witnesses and diagnostics.
- **Oracles**: `checkComplexCStarAxioms(samples, scalars, tolerance)` and `checkComplexIdentityHomomorphism(samples, scalars, tolerance)`.
- **Witness**: `ComplexCStarAlgebra` packages the algebraic operations, star, norm, and positivity; `identityComplexHom` exposes the canonical *-homomorphism.
- **Tests**: `law.CStarAlgebra.spec.ts`
- **Examples**: Default samples include \(0\), \(1\), \(i\), and \(-2 + 3i\) together with scalars \(1\), \(i\), and \(2 - i\).
- **Implementation Notes**: Diagnostics report the failing axiom along with tolerance-aware discrepancies whenever a user-supplied structure or morphism misbehaves.

### Spectral decomposition of complex C*-algebra elements

- **Domain**: The complex C*-algebra \(\mathbb{C}\) equipped with conjugation and the absolute-value norm.
- **Statement**: Every element \(z \in \mathbb{C}\) decomposes uniquely as \(z = y + i z'\) with \(y, z'\) self-adjoint (real-valued) and both \(y = \frac{1}{2}(z + z^*)\) and \(z' = -\frac{i}{2}(z - z^*)\) lying in the self-adjoint subspace.
- **Rationale**: Encodes the spectral-theory prerequisite that tail-event constructions rely on—showing that even in the base C*-algebra, self-adjoint parts and normal elements are observable with executable witnesses.
- **Oracle**: `checkComplexSpectralTheory(samples, tolerance)` and the general `checkCStarSpectralTheory(algebra, elements, tolerance)`.
- **Witness**: `ComplexCStarAlgebra` combined with `realPartCStar`/`imaginaryPartCStar` expose the decomposition, while `isSelfAdjoint` and `isNormal` certify structural properties.
- **Tests**: `law.CStarAlgebra.spec.ts` exercises decomposition, normality, and the canonical helper.
- **Examples**: Default samples \(0, 1, i, -2 + 3i\) illustrate real/imaginary projections and certify the normality of complex scalars.
- **Implementation Notes**: Reports include tolerance-aware discrepancy norms so alternative C*-algebra instances can diagnose failures in their spectral decomposition data.

### Copy/discard witness a commutative comonoid on every object

- **Domain**: Markov categories equipped with designated copy \(\Delta_X: X \to X \otimes X\) and discard \(!_{X}: X \to I\) morphisms.
- **Statement**: The chosen \(\Delta_X\) and \(!_{X}\) satisfy coassociativity, commutativity, and the left/right counit diagrams, making \(X\) a commutative comonoid.
- **Rationale**: Packages copy/discard data as law-checked structure rather than implicit assumptions, enabling reuse with inverse limits and other carriers.
- **Oracle**: `checkMarkovComonoid(witness)` → `{ holds, failures, details, copyCoassoc, copyCommut, copyCounitL, copyCounitR }`
- **Witness**: `MarkovComonoidWitness` bundling the object, copy, and discard morphisms (optionally relabelled).
- **Tests**: `law.MarkovCategory.spec.ts`
- **Examples**: Finite Markov kernels via `buildMarkovComonoidWitness(mkFin([...]))` and deterministic comonoid homomorphisms in the same spec.
- **Implementation Notes**: Homomorphisms validated with `checkMarkovComonoidHom(domain, codomain, f)` returning detailed preservation diagnostics.

### Deterministic morphisms are precisely comonoid homomorphisms

- **Domain**: Markov categories whose objects carry `MarkovComonoidWitness` data.
- **Statement**: A morphism \(f : X \to Y\) is deterministic iff it preserves copy and discard; equivalently, \(f\) is a comonoid homomorphism between \(X\) and \(Y\).
- **Rationale**: Characterizes the deterministic subcategory `C_det` highlighted in the paper and exposes executable checks for its cartesian behaviour.
- **Oracle**: `checkDeterministicComonoid(witness)` → `{ holds, deterministic, comonoidHom, equivalent, failures, details }`
- **Witness**: `MarkovDeterministicWitness` constructed via `buildMarkovDeterministicWitness` or `certifyDeterministicFunction` to pair kernels with their comonoid structures.
- **Tests**: `law.MarkovCategory.spec.ts`
- **Examples**: Dirac kernels over finite carriers, and nondeterministic mixtures that trigger the counterexample diagnostics.
- **Implementation Notes**: Equivalence failures report when deterministic recognition and comonoid preservation disagree, mirroring the paper’s discussion of deterministic subcategories.

### p-almost-sure equality relative to a kernel

- **Domain**: Markov categories equipped with explicit finite witnesses for morphisms \(p : A \to X\) and \(f, g : X \to Y\).
- **Statement**: Morphisms \(f\) and \(g\) are \(p\)-almost surely equal precisely when their composites with \(p\) coincide, i.e. \(f \circ p = g \circ p\), equivalently they agree on every point of \(X\) that occurs with non-zero weight under \(p\).
- **Rationale**: Encapsulates the “agree on the support of \(p\)” intuition so the notion becomes an executable predicate that can power zero-one law diagnostics and tail-event witnesses.
- **Oracle**: `checkAlmostSureEquality(witness, { tolerance })` → `{ holds, support, failures, composite, equalComposite, details }`
- **Witness**: `MarkovAlmostSureWitness` produced by `buildMarkovAlmostSureWitness(prior, left, right, { label })` bundling \(p, f, g\) and optional metadata.
- **Tests**: `law.MarkovAlmostSureEquality.spec.ts`
- **Examples**: Kernels that differ outside the support of \(p\) satisfy the law, while differing on a supported point yields diagnostic counterexamples listing the responsible inputs and output discrepancies.
- **Implementation Notes**: Support tracking aggregates which domain elements contribute to each support point, enabling downstream tooling to surface causal provenance when almost-sure equality breaks.

### Conditional independence via factorization

- **Domain**: Markov categories equipped with copy/discard structure on the conditioning object and output factors.
- **Statement**: A kernel \(p : A \to X_1 \otimes \dots \otimes X_n\) displays conditional independence \(X_1 \perp \dots \perp X_n \mid A\) precisely when it equals the tensor product of its marginals composed with the iterated copy of \(A\), and this equality is invariant under permutations of the tensor factors.
- **Rationale**: Makes conditional independence a law-checked, witness-driven notion so stochastic processes and tails reuse the factorization principle without diagram chasing.
- **Oracle**: `checkConditionalIndependence(witness, { permutations })` → `{ holds, equality, components, factorized, failures, permutations, details }`
- **Witness**: `buildMarkovConditionalWitness(domain, outputs, p, { projections, label })` supplying comonoid data, the kernel, and (optionally) custom projections.
- **Tests**: `law.MarkovConditionalIndependence.spec.ts`
- **Examples**: Independent stochastic kernels built via `pair` or correlated counterexamples that fail the factorization check.
- **Implementation Notes**: Default projections assume left-associated tensor products; exotic codomains can override them via the witness options.

### Deterministic composites from conditional independence

- **Domain**: Finite Markov categories carrying conditional-independence witnesses together with deterministic arrows between output factors.
- **Statement**: Whenever a witness records \(X \perp T \mid A\) for a joint kernel \(p_{XT} : A \to X \otimes T\) and the arrow \(s : X \to T\) is deterministic, the composite \(s \circ p\) coincides with the \(T\)-marginal and is itself deterministic.
- **Rationale**: Encodes the determinism lemma so that conditional independence immediately yields executable certification that downstream statistics remain deterministic—a key ingredient for zero–one laws.
- **Oracle**: `checkDeterminismLemma({ conditional, p, deterministic, xIndex, tIndex }, { permutations, tolerance })` → `{ holds, conditional, deterministic, composite, marginals, failures, details }`
- **Witness**: `DeterminismLemmaWitness` bundles the conditional witness, the marginal \(p\), the deterministic arrow \(s\), and optional factor indices.
- **Tests**: `law.MarkovConditionalIndependence.spec.ts`
- **Examples**: Constant statistics extracted from noisy measurements certify determinism, while identity statistics over non-degenerate marginals trigger the conditional-independence failure path.
- **Implementation Notes**: Reports validate marginal alignment, re-use `checkConditionalIndependence`, and surface detailed failure reasons for independence breaks, non-deterministic components, or mismatched composites.

### Semicartesian infinite tensor products

- **Domain**: Semicartesian symmetric monoidal categories equipped with finite tensor products over every finite subset of an index set.
- **Statement**: The chosen object \(X_J\) together with projections \(\pi_F : X_J \to X_F\) forms a cone compatible with all restriction maps and is universal among such cones.
- **Rationale**: Encodes the universal property underpinning infinite tensor products so that joint states can be reasoned about synthetically.
- **Oracles**: `checkSemicartesianProductCone(product, restrictions)` and `checkSemicartesianUniversalProperty(product, cones, subsets)`.
- **Witness**: `SemicartesianProductWitness` bundling the diagram, projections, and factorization builder; cones supplied via `SemicartesianCone`.
- **Tests**: `law.SemicartesianInfiniteProduct.spec.ts`
- **Examples**: Finite-set cones extending assignments by restriction and deterministic completions that witness uniqueness.
- **Implementation Notes**: Mediator candidates expose uniqueness diagnostics, while subset selections keep the compatibility checks tractable for large index sets.

### CRing⊕ infinite tensors as filtered colimits

- **Domain**: Commutative rings and additive/unit-preserving morphisms viewed inside `CRing_⊕` together with index families of tensor factors.
- **Statement**: The formal sum object generated by finitely supported elementary tensors realises the filtered colimit of the finite tensor diagram; inclusions from finite subsets commute with restrictions and every element is determined by a finite support.
- **Rationale**: Implements Example 3.4 by turning the folklore “finite sums of elementary tensors” description into executable colimit structure on the algebraic side of the paper.
- **Oracles**: `checkFilteredCompatibility(witness, inclusions)` and `checkColimitCoverage(witness, samples)`.
- **Witness**: `defaultFilteredWitness(family)` derived from `TensorFamily` data packages inclusions, restrictions, and support tracking for the filtered diagram.
- **Tests**: `law.CRingPlusInfiniteTensorColimit.spec.ts`
- **Examples**: Tensor families generated from copies of `ℤ` confirm that addition, multiplication, and inclusions respect the filtered system, with samples covering mixed-support sums.
- **Implementation Notes**: Normalisation removes unit-valued factors and merges duplicate elementary tensors so compatibility can be checked symbolically.

### Finite-index reduction for Kolmogorov products

- **Domain**: Projective families in Markov categories endowed with Kolmogorov-consistent marginals and a chosen distribution on the limit carrier.
- **Statement**: When the index set \(J\) is finite, pushing a projective family's measure forward along the universal projection \(\pi_J\) reproduces the canonical finite tensor marginal specified by the family.
- **Rationale**: Confirms Theorem 3.2 that the abstract infinite tensor coincides with the ordinary finite tensor product whenever only finitely many factors are involved.
- **Oracle**: `checkFiniteProductReduction(obj, measure, subset)` → `{ ok, expected, actual }`.
- **Witness**: Uses the family’s marginal distributions together with the supplied limit measure; no additional witness extraction is required.
- **Tests**: `law.MarkovInfinite.spec.ts`
- **Examples**: Independent Bernoulli product measures whose two-factor pushforwards yield the same \(\mathrm{Bernoulli}^{\otimes 2}\) distribution computed directly from coordinates.
- **Implementation Notes**: Raises whenever the provided measure’s semiring disagrees with the family, keeping cross-semiring reasoning sound.

### Copy/discard compatibility of infinite projections

- **Domain**: Infinite product objects in Markov categories equipped with commutative comonoid (copy/discard) structure.
- **Statement**: For every finite subset \(F \subseteq J\), the projection \(\pi_F\) factors through copy followed by discarding one leg and projecting the other, matching the canonical diagram from Remark 3.3.
- **Rationale**: Demonstrates that the universal projections cooperate with comonoid data, ensuring tail constructions respect the Markov-category copy/discard intuition.
- **Oracle**: `checkCopyDiscardCompatibility(obj, subsets, samples)` → `{ ok, failures }`.
- **Witness**: Diagnostics list offending samples together with direct and copy/discard-composed pushforwards when compatibility fails.
- **Tests**: `law.MarkovInfinite.spec.ts`
- **Examples**: IID Bernoulli cylinders where every tested section yields identical pushforwards whether projected directly or via copy/discard composition.
- **Implementation Notes**: Works with deterministic copy maps returned by `createInfObj`, but also surfaces violations for bespoke infinite carriers that implement non-standard copy semantics.

### Kolmogorov products via deterministic marginals

- **Domain**: Infinite tensor products in Markov categories whose canonical projections land in finite tensor factors.
- **Statement**: The projections \(\pi_F : X_J \to X_F\) of a Kolmogorov product are deterministic and commute with the copy/discard comonoid, so every tested sample yields a unique finite section and matches the copy–discard factorization.
- **Rationale**: Encodes the Kolmogorov compatibility requirement between infinite tensor products and comonoid structure, distinguishing Kolmogorov products from merely semicartesian cones.
- **Oracle**: `checkKolmogorovProduct(obj, subsets, samples)` → `{ ok, deterministic, copyDiscard, determinismFailures }`.
- **Witness**: Failure reports return the offending subset, sample, and aggregated marginal distribution whenever determinism breaks.
- **Tests**: `law.MarkovInfinite.spec.ts`
- **Examples**: Independent Bernoulli families satisfy the determinism and copy/discard conditions, whereas modified projective families with randomized projections fail the determinism check while keeping copy/discard data intact.
- **Implementation Notes**: Builds atop `checkCopyDiscardCompatibility`, reusing countability and measurability diagnostics already threaded through infinite product objects.

### Deterministic mediators for Kolmogorov products

- **Domain**: Kolmogorov product objects whose projective families carry positivity metadata and deterministic singleton projections.
- **Statement**: Any deterministic family of component arrows \((f_j)_{j\in F}\) into the coordinates of a Kolmogorov product factors uniquely through the universal deterministic mediator, and any competing mediator agreeing on the chosen coordinates coincides on all tested inputs.
- **Rationale**: Operationalises Proposition 4.3 by providing executable evidence for the categorical product universal property inside the deterministic subcategory, rather than relying on external reasoning.
- **Oracle**: `checkDeterministicProductUniversalProperty(witness, candidate, subset, options)` → `{ ok, components, factorization, mediatorAgreement, mismatches, uniqueness, partitions, … }`.
- **Witness**: Uses `DeterministicKolmogorovProductWitness` to assemble mediators via the projective-family extension; the oracle also records deterministic component checks performed with positivity-aware marginal diagnostics.
- **Tests**: `law.MarkovInfinite.spec.ts`
- **Examples**: Deterministic coin-flip mediators over independent Bernoulli coordinates certify unique factorisation, while non-deterministic components or perturbed mediators yield counterexamples with explicit cylinder sections.
- **Implementation Notes**: Reports reuse countability, measurability, and positivity metadata so downstream zero–one law tooling can consume the same diagnostics without recomputation.

### FinStoch infinite tensor obstruction

- **Domain**: Families of finite stochastic objects (`Fin`) indexed by a countable set inside the `FinStoch` Markov category.
- **Statement**: When no factor is empty and infinitely many factors have at least two elements, the FinStoch infinite tensor object fails to exist (Example 3.7).
- **Rationale**: Highlights the categorical limitation that prevents building path-space style objects inside FinStoch, motivating richer categories such as `BorelStoch` for infinite products.
- **Oracle**: `analyzeFinStochInfiniteTensor(index, carrier, options)` → `{ status, details, inspected, sampleLimit, exhausted, truncated, emptyFactors, multiValuedFactors, multiValuedCount, countability }`.
- **Witness**: Not required; the oracle samples the enumeration, recording empty factors and multi-valued examples as constructive evidence.
- **Tests**: `law.MarkovInfinite.spec.ts`
- **Examples**: Alternating singleton and two-point factors trigger a `likelyObstructed` status, while finite index sets and empty factors report the appropriate `ok` or `obstructed` statuses.
- **Implementation Notes**: Sampling is capped (`options.sampleLimit`) to keep diagnostics finite; callers can tighten `options.threshold` to demand more evidence before reporting the Example 3.7 obstruction.

### Kolmogorov extension witnesses for projective families

- **Domain**: Projective families in Markov categories that supply an extension operator turning finite cylinder sections into elements of the limit carrier.
- **Statement**: The Kolmogorov extension measure obtained from any finite subfamily reproduces every tested marginal, providing the “probability measures are consistent families” bijection stated in Remark 3.5.
- **Rationale**: Bridges the semicartesian definition with the probabilistic interpretation by packaging the Kolmogorov extension theorem as an executable universal property.
- **Oracle**: `checkKolmogorovExtensionUniversalProperty(obj, subsets)` → `{ ok, baseSubset, measure, reductions }`.
- **Witness**: Reuses the projective family’s marginals together with its extension adapter; no additional user-supplied witness is required.
- **Tests**: `law.MarkovInfinite.spec.ts`
- **Examples**: IID Bernoulli product families extend their one- and two-dimensional marginals to a global measure whose projections match the originals.
- **Implementation Notes**: Aggregates subsets into a controlling finite index so the constructed measure only depends on marginals that the caller requests.

### Tail independence for Kolmogorov products

- **Domain**: Kolmogorov product objects equipped with a global measure and deterministic tail-event predicates valued in booleans.
- **Statement**: Every tested tail event is independent from the σ-algebra generated by any chosen finite coordinate subset; concretely \(\mathbb{P}(E \wedge C) = \mathbb{P}(E)\mathbb{P}(C)\) for all sampled cylinder events \(C\).
- **Rationale**: Encodes Lemma 5.1’s “tail σ-algebra is independent of finite marginals” conclusion as an executable diagnostic feeding the zero–one law story.
- **Oracle**: `checkTailSigmaIndependence(obj, measure, tailEvent, subsets)` → `{ ok, tailProbability, subsets }` with per-subset factorizations and counterexamples.
- **Witness**: The oracle tabulates each cylinder section’s probability, the joint mass with the tail event, and the expected product; discrepancies surface explicit independence failures.
- **Tests**: `law.MarkovInfinite.spec.ts`
- **Examples**: Independent Bernoulli paths where tail events depending on later coordinates factor from early cylinders, while events tied to the head coordinate violate independence.
- **Implementation Notes**: Reuses countability and measurability metadata threaded through `InfObj`, so diagnostics still report when foundational hypotheses are absent.

### Kolmogorov zero-one law

- **Domain**: Kolmogorov product objects with a chosen measure, deterministic tail predicate, and conditional-independence witnesses relating the product mediator to the tail event.
- **Statement**: When the tail event is independent of every tested finite marginal and the determinism lemma hypotheses hold, the composite \(s \circ p\) becomes deterministic, so the tail event has probability 0 or 1.
- **Rationale**: Encodes Theorem 5.3’s categorical zero–one law as an executable report combining conditional independence, tail independence, and deterministic mediator diagnostics.
- **Oracle**: `checkKolmogorovZeroOneLaw(witness, options)` → `{ ok, zeroOne, tail, independence, tailConditional, determinism, universal }`.
- **Witness**: `KolmogorovZeroOneLawWitness` packages the deterministic Kolmogorov product, domain comonoid data, determinism-lemma witness, optional conditional-independence witnesses, and the tail predicate.
- **Tests**: `law.MarkovInfinite.spec.ts`
- **Implementation Notes**: Aggregates optional deterministic-product data so universal-property checks can be reused when provided.

### Hewitt–Savage zero-one law

- **Domain**: Kolmogorov zero–one witnesses paired with permutation actions exhibiting exchangeability of the chosen measure.
- **Statement**: If the underlying measure is exchangeable for the supplied finite permutations and the Kolmogorov zero–one diagnostics succeed, the tail event remains deterministic, mirroring Theorem 5.4.
- **Rationale**: Elevates the Hewitt–Savage zero–one law to an oracle that simultaneously checks exchangeability, permutation invariance of the tail event, and the Kolmogorov zero–one hypotheses.
- **Oracle**: `checkHewittSavageZeroOneLaw(witness, options)` → `{ ok, exchangeability, zeroOne, tail, determinism, … }`.
- **Witness**: `HewittSavageZeroOneLawWitness` extends the Kolmogorov witness with a permutation family, enabling reusable exchangeability diagnostics.
- **Tests**: `law.MarkovInfinite.spec.ts`
- **Implementation Notes**: Reuses the exchangeability witness from `hewittSavageZeroOneWitness` so permutation diagnostics stay consistent across oracles.

### Set-based multivalued morphisms and products

- **Domain**: The SetMult category of sets with multi-valued morphisms equipped with copy/discard structure and indexed products.
- **Statement**: Copy and discard maps satisfy the semicartesian comonoid laws on every sampled object; the cartesian product of a SetMult family projects to each finite coordinate subset; and a SetMult morphism is deterministic precisely when every fibre is singleton.
- **Rationale**: Implements the paper’s Set-based multi-valued morphisms so infinite products and determinism checks are executable alongside the Markov infrastructure.
- **Oracles**: `checkSetMultComonoid(obj, samples)`; `checkSetMultInfiniteProduct(family, assignment, tests)`; `checkSetMultDeterminism(witness)` and the lightweight `checkSetMultDeterministic(witness, samples)`.
- **Witness**: `buildSetMultDeterminismWitness(domain, codomain, morphism)` packages finite carriers with their SetMult morphisms for deterministic comparisons.
- **Tests**: `law.SetMult.spec.ts`
- **Examples**: Boolean carriers with copy/discard; deterministic indicator functions; finite Boolean products whose projections recover the original tuple.
- **Implementation Notes**: Determinism reports cross-check SetMult fibres against optional finite Markov kernels, providing explicit counterexamples when supports disagree.

### Monoid Laws
For any monoid `(M, ⊕, ε)`:

**Associativity**: `(a ⊕ b) ⊕ c = a ⊕ (b ⊕ c)`
**Identity**: `ε ⊕ a = a = a ⊕ ε`

**Witness**: Property test with random `a, b, c ∈ M`

### Functor Laws
For any functor `F`:

**Identity**: `map(id) = id`
**Composition**: `map(f ∘ g) = map(f) ∘ map(g)`

**Witness**: Property test with random functions `f, g` and random `fa ∈ F[A]`

### Applicative Laws
For any applicative `F`:

**Identity**: `pure(id) <*> v = v`
**Composition**: `pure(∘) <*> u <*> v <*> w = u <*> (v <*> w)`
**Homomorphism**: `pure(f) <*> pure(x) = pure(f(x))`
**Interchange**: `u <*> pure(y) = pure(λf.f(y)) <*> u`

**Witness**: Property test with random `f, x, y` and random `u ∈ F[A → B], v ∈ F[A]`

### Monad Laws
For any monad `M`:

**Left Identity**: `return(a) >>= f = f(a)`
**Right Identity**: `m >>= return = m`
**Associativity**: `(m >>= f) >>= g = m >>= (λx.f(x) >>= g)`

**Witness**: Property test with random `a, f, g` and random `m ∈ M[A]`

## Arrow Laws

### Category Laws
For any category `C`:

**Left Identity**: `id ∘ f = f`
**Right Identity**: `f ∘ id = f`
**Associativity**: `(f ∘ g) ∘ h = f ∘ (g ∘ h)`

**Witness**: Property test with random arrows `f, g, h`

### Arrow Laws
For any arrow `A`:

**Arrow Identity**: `arr(id) = id`
**Arrow Composition**: `arr(f ∘ g) = arr(f) ∘ arr(g)`
**Arrow Extension**: `first(arr(f)) = arr(f × id)`
**Arrow Exchange**: `first(f ∘ g) = first(f) ∘ first(g)`
**Arrow Unit**: `first(f) ∘ arr(λx.(x, ⊥)) = arr(λx.(f(x), ⊥))`
**Arrow Association**: `first(first(f)) ∘ arr(λx.((x, y), z)) = arr(λx.(x, (y, z))) ∘ first(f)`

**Witness**: Property test with random functions `f, g` and random arrows

### ArrowChoice Laws
For any ArrowChoice `A`:

**Left Identity**: `left(arr(f)) = arr(left(f))`
**Left Exchange**: `left(f ∘ g) = left(f) ∘ left(g)`
**Right Identity**: `right(arr(f)) = arr(right(f))`
**Right Exchange**: `right(f ∘ g) = right(f) ∘ right(g)`

**Witness**: Property test with random functions `f, g` and Either-like values

### ArrowLoop Laws
For any ArrowLoop `A`:

**Right-Tightening**: `loop(σ) ∘ arr(g) = loop(σ ∘ arr(g × id))`
**Loop Identity**: `loop(arr(λ(x,y).(y,x))) = id` (when well-defined)

**Witness**: Property test with random functions and loop bodies

### Profunctor Laws
For any profunctor `P`:

**Identity**: `dimap(id, id) = id`
**Composition**: `dimap(f ∘ g, h ∘ i) = dimap(g, h) ∘ dimap(f, i)`

**Witness**: Property test with random functions `f, g, h, i`

### Strong Laws
For any strong profunctor `P`:

**Naturality**: `first(f) ∘ dimap(g, h) = dimap(g, h) ∘ first(f)`
**Associativity**: `first(first(f)) ∘ assoc = assoc ∘ first(f)`
**Unitality**: `first(f) ∘ unitor = unitor ∘ f`

**Witness**: Property test with random functions and arrows

### ArrowApply Laws
For any ArrowApply `A`:

**Apply Identity**: `app ∘ arr(λx.(x, id)) = id`
**Apply Composition**: `app ∘ first(app) ∘ assoc = app ∘ arr(λx.(x, f ∘ g))`

**Witness**: Property test with random arrows `f, g`

## Kleisli Arrow Laws

### Kleisli Category Laws
For any monad `M`, the Kleisli category `Kl(M)` satisfies:

**Left Identity**: `return >=> f = f`
**Right Identity**: `f >=> return = f`
**Associativity**: `(f >=> g) >=> h = f >=> (g >=> h)`

**Witness**: Property test with random Kleisli arrows `f, g, h`

### Kleisli Arrow Laws
For Kleisli arrows `A → M[B]`:

**Arrow Identity**: `arr(id) = return`
**Arrow Composition**: `arr(f ∘ g) = arr(f) >=> arr(g)`
**Arrow Extension**: `first(f) = λ(x, y).f(x) >>= λa.return(a, y)`

**Witness**: Property test with random functions and Kleisli arrows

## State Laws

### State Monad Laws
For `State[S, A] = S → (A, S)`:

**Left Identity**: `put(s) >> get = put(s) >> return(s)`
**Right Identity**: `get >>= put = return(())`
**Put-Put**: `put(s) >> put(s') = put(s')`
**Get-Put**: `get >>= put = return(())`

**Witness**: Property test with random states `s, s'`

## Reader Laws

### Reader Monad Laws
For `Reader[R, A] = R → A`:

**Ask Identity**: `ask >>= return = return(())`
**Local Identity**: `local(id) = id`
**Local Composition**: `local(f) ∘ local(g) = local(f ∘ g)`
**Local Ask**: `local(f) ∘ ask = ask >>= return ∘ f`

**Witness**: Property test with random functions `f, g` and random environments

## Result/Validation Laws

### Result Monad Laws
For `Result[E, A]`:

**Left Identity**: `Ok(a) >>= f = f(a)`
**Right Identity**: `r >>= Ok = r`
**Associativity**: `(r >>= f) >>= g = r >>= (λx.f(x) >>= g)`
**Error Propagation**: `Err(e) >>= f = Err(e)`

**Witness**: Property test with random `a, f, g` and random results

### Validation Applicative Laws
For `Validation[E, A]`:

**Accumulation**: `Err(e1) <*> Err(e2) = Err(e1 ++ e2)`
**Success**: `Ok(f) <*> Ok(a) = Ok(f(a))`
**Mixed**: `Ok(f) <*> Err(e) = Err(e) = Err(e) <*> Ok(a)`

**Witness**: Property test with random errors and values

## Streaming/Iteration Laws

### Stream Fusion Laws
For streams `Stream[A]`:

**Map Fusion**: `map(f) ∘ map(g) = map(f ∘ g)`
**Filter Fusion**: `filter(p) ∘ filter(q) = filter(λx.p(x) ∧ q(x))`
**Map-Filter Commute**: `map(f) ∘ filter(p) = filter(p) ∘ map(f)` (when `f` is total)

**Witness**: Property test with random functions and predicates

### Fold Laws
For folds `Fold[A, B]`:

**Associativity**: `fold(f, z, xs ++ ys) = fold(f, fold(f, z, xs), ys)`
**Identity**: `fold(f, z, []) = z`
**Homomorphism**: `fold(f, z, map(g, xs)) = fold(f ∘ g, z, xs)`

**Witness**: Property test with random functions and lists

## Parallel/Concurrent Laws

### Parallel Applicative Laws
For parallel execution `Par[A]`:

**Commutativity**: `par(f, g) = par(g, f)` (when both succeed)
**Associativity**: `par(par(f, g), h) = par(f, par(g, h))`
**Identity**: `par(f, pure(id)) = f`

**Witness**: Property test with random parallel computations

### Concurrent Monad Laws
For concurrent execution `Concurrent[A]`:

**Race Identity**: `race(f, never) = f`
**Race Commutativity**: `race(f, g) = race(g, f)`
**Timeout Identity**: `timeout(∞, f) = f`

**Witness**: Property test with random concurrent computations

## Optimization Laws

### Fusion Laws
For any composable operations:

**Map Fusion**: `map(f) ∘ map(g) = map(f ∘ g)`
**Filter Fusion**: `filter(p) ∘ filter(q) = filter(λx.p(x) ∧ q(x))`
**Fold Fusion**: `fold(f, z) ∘ map(g) = fold(λx y.f(g(x), y), z)`

**Witness**: Property test ensuring semantic equivalence

### Commutation Laws
For operations that can be reordered:

**Map-Filter Commute**: `map(f) ∘ filter(p) = filter(p) ∘ map(f)` (when `f` is total)
**Filter-Filter Commute**: `filter(p) ∘ filter(q) = filter(q) ∘ filter(p)`

**Witness**: Property test with random functions and predicates

## Witness Implementation

Each law should have a corresponding property test that:

1. **Generates random inputs** of the appropriate types
2. **Applies both sides** of the law equation
3. **Compares results** for equality (or equivalence)
4. **Reports counterexamples** if the law fails
5. **Captures minimal reproducers** for debugging

### Example Witness Template

```typescript
export const witnessFunctorIdentity = <A>(
  genA: () => A,
  genFA: () => F<A>
): PropertyTest => ({
  name: "Functor Identity Law",
  test: () => {
    const fa = genFA()
    const left = map(id)(fa)
    const right = fa
    return equals(left, right)
  },
  shrink: (counterexample) => shrinkFA(counterexample)
})
```

## Law Verification

All laws should be verified with:
- **Property-based testing** using random generators
- **Edge case testing** with boundary values
- **Performance testing** to ensure laws don't introduce inefficiencies
- **Documentation** explaining when laws might not hold (e.g., floating-point precision)

## Recursion Scheme Laws

### Catamorphism Laws
For `cataArray<A, B>(nil, cons)`:

**Identity**: `cataArray(nil, cons)([]) = nil`
**Consistency**: `cataArray(nil, cons)([a, ...as]) = cons(a, cataArray(nil, cons)(as))`
**Fusion**: `cataArray(nil, cons) ∘ map(f) = cataArray(nil, λa b.cons(f(a), b))`

**Witness**: Property test with random `nil, cons, f` and random arrays

### Anamorphism Laws
For `anaArray<A, S>(step)`:

**Termination**: `anaArray(step)(s)` terminates when `step(s) = None`
**Consistency**: `anaArray(step)(s) = [a, ...anaArray(step)(s')]` when `step(s) = Some([a, s'])`
**Coalgebra Fusion**: `anaArray(step ∘ f) = anaArray(step) ∘ f`

**Witness**: Property test with random `step, f` and random seeds

### Hylomorphism Laws
For `hyloArray<A, S, B>(step, alg, nil)`:

**Efficiency**: `hyloArray(step, alg, nil)(s) = cataArray(nil, alg)(anaArray(step)(s))`
**Fusion**: `hyloArray(step, alg, nil) ∘ f = hyloArray(step ∘ f, alg, nil)`
**Algebra Fusion**: `f ∘ hyloArray(step, alg, nil) = hyloArray(step, λa b.f(alg(a, b)), f(nil))`

**Witness**: Property test ensuring semantic equivalence without intermediate structures

### Paramorphism Laws
For `paraArray<A, B>(nil, cons)`:

**Identity**: `paraArray(nil, cons)([]) = nil`
**Consistency**: `paraArray(nil, cons)([a, ...as]) = cons(a, as, paraArray(nil, cons)(as))`
**Tail Access**: `paraArray(nil, cons)` provides access to unprocessed tail

**Witness**: Property test with random `nil, cons` and random arrays

### Apomorphism Laws
For `apoArray<A, S>(step)`:

**Embedding**: `apoArray(step)(s) = [...prefix, ...tail]` when `step(s) = Err(tail)`
**Continuation**: `apoArray(step)(s) = [a, ...apoArray(step)(s')]` when `step(s) = Ok([a, s'])`
**Coalgebra Fusion**: `apoArray(step ∘ f) = apoArray(step) ∘ f`

**Witness**: Property test with random `step, f` and random seeds

### Endomorphism Monoid Laws
For `MonoidEndo<A>()`:

**Identity**: `empty ∘ f = f = f ∘ empty`
**Associativity**: `(f ∘ g) ∘ h = f ∘ (g ∘ h)`
**Composition**: `concat(f, g)(x) = g(f(x))`

**Witness**: Property test with random endomorphisms and random values

## Monoidal Functor Laws

### Monoidal Functor Laws
For any lax monoidal functor `F` on the category of types with tensor = product and unit = void:

**Functor Laws**:
- **Identity**: `F.map(id) = id`
- **Composition**: `F.map(g ∘ f) = F.map(g) ∘ F.map(f)`

**Unit Coherence**:
- **Left Unit**: `F.map(λ.from) = a => F.tensor(F.unit, a)` where `λ: A ≅ [void, A]`
- **Right Unit**: `F.map(ρ.from) = a => F.tensor(a, F.unit)` where `ρ: A ≅ [A, void]`

**Associativity Coherence**:
- **Associator**: `F.map(α.from) ∘ F.tensor(F.tensor(a, b), c) = F.tensor(a, F.tensor(b, c))` where `α: [A, [B, C]] ≅ [[A, B], C]`

**Naturality of Tensor**:
- **Tensor Naturality**: `F.tensor(F.map(f)(a), F.map(g)(b)) = F.map(bimap(f, g))(F.tensor(a, b))`

**Witness**: Property test with random functions `f, g` and random values `a, b, c`

### Monoidal Functor Instances
The following instances satisfy the monoidal functor laws:

**Option Monoidal Functor**:
- **Unit**: `Some(undefined)`
- **Tensor**: `zipOption(fa, fb) = fa <*> fb.map(b => a => [a, b])`

**Result Monoidal Functor** (short-circuiting):
- **Unit**: `Ok(undefined)`
- **Tensor**: `zipResult(fa, fb) = fa <*> fb.map(b => a => [a, b])`

**Reader Monoidal Functor**:
- **Unit**: `Reader.of(undefined)`
- **Tensor**: `zipReader(fa, fb) = r => [fa(r), fb(r)]`

**ReaderTask Monoidal Functor**:
- **Unit**: `ReaderTask.of(undefined)`
- **Tensor**: `zipReaderTask(fa, fb) = r => Promise.all([fa(r), fb(r)])`

**ReaderTaskEither Monoidal Functor**:
- **Unit**: `RTE.of(undefined)`
- **Tensor**: `zipRTE(fa, fb) = r => Promise.all([fa(r), fb(r)]).then(([ra, rb]) => ra <*> rb.map(b => a => [a, b]))`

**Validation Monoidal Functor** (accumulating):
- **Unit**: `VOk(undefined)`
- **Tensor**: `zipValidation(fa, fb) = fa <*> fb.map(b => a => [a, b])` (accumulates errors)

**Witness**: Property test for each instance with random generators and equality functions

## 2-Functor Laws

### Strict 2-Functor Laws
For any strict 2-functor `U: C → D` between 2-categories:

**on2 respects vertical composition**: `U(β ∘v α) = U(β) ∘v U(α)`
**on2 respects horizontal composition**: `U(β ⋆ α) = U(β) ⋆ U(α)`
**on2 preserves identity**: `U(id_F) = id_{U(F)}`

**Witness**: Property test with random natural transformations and endofunctors

### Lax 2-Functor Laws
For any lax 2-functor `U: C → D`:

**μ, η are natural in their arguments**
**Unit Coherence**: 
- `(U(F) ∘ η) ; μ_{F,Id} = id_{U(F)}`
- `(η ∘ U(F)) ; μ_{Id,F} = id_{U(F)}`
**Associativity Coherence**: 
- `(μ_{F,G} ⋆ id_{U(H)}) ; μ_{F∘G,H} = (id_{U(F)} ⋆ μ_{G,H}) ; μ_{F,G∘H}`

**Witness**: Property test with random endofunctors and natural transformations

### Oplax 2-Functor Laws (Dual)
For any oplax 2-functor `U: C → D`:

**η^op, μ^op are natural in their arguments**
**Unit Coherence**: 
- `η^op ; (U(F) ∘ μ^op_{F,Id}) = id_{U(F)}`
- `η^op ; (μ^op_{Id,F} ∘ U(F)) = id_{U(F)}`
**Associativity Coherence**: 
- `μ^op_{F∘G,H} ; (μ^op_{F,G} ⋆ id_{U(H)}) = μ^op_{F,G∘H} ; (id_{U(F)} ⋆ μ^op_{G,H})`

**Witness**: Property test with random endofunctors and natural transformations

### Concrete Instances

#### PostcomposeReader2<R> (Lax)
- **on1**: `F ↦ Reader<R, F<_>>`
- **on2**: `α ↦ Reader<R, α>`
- **η**: `a ↦ (_) => a` (unit)
- **μ**: `Reader<R, F<Reader<R, G<_>>>> ↦ Reader<R, F<G<_>>>` (evaluate inner Reader at same environment)

#### PrecomposeEnv2<E> (Oplax)
- **on1**: `F ↦ F ∘ Env<E, _>`
- **on2**: `α ↦ α` (applied to Env<E, A>)
- **η^op**: `[e, a] ↦ a` (counit - drop environment)
- **μ^op**: `F<G<Env<E, A>>> ↦ Env<E, F<G<A>>>` (using strength to pull Env outward)

**Witness**: Property test for each instance with random endofunctors and natural transformations

## Indexed Family Laws

### Reindexing Functoriality
For reindexing operation `u*` along `u: J → I`:

**Identity**: `id* = id`
**Composition**: `(v ∘ u)* = u* ∘ v*`

**Witness**: Property test with random functions `u, v` and random families

### Dependent Sum/Product Adjunction
For families `X: I → Set`:

**Σ ⊣ u* ⊣ Π**: `Σu ⊣ u* ⊣ Πu`
**Triangle Identities**: 
- `u* ε ∘ η = id` on `u*Y`
- `ε ∘ u* η = id` on `ΣuX`

**Witness**: Property test with pullback squares and fiber computations

### Beck-Chevalley Law
For pullback square of index maps:

**Substitution Commutes**: `f* Σw ≅ Σu v*`

**Witness**: Property test comparing counts over pullback indices

### Kan Extension Laws
For discrete index maps `u: J → I`:

**Left Kan**: `(Lanu F)(i) = ⨁{j | u(j)=i} F(j)`
**Right Kan**: `(Ranu F)(i) = ∏{j | u(j)=i} F(j)`
**Naturality**: Kan extensions are natural in the family

**Witness**: Property test with fiber size comparisons

## Diagram Laws

### Functoriality Laws
For diagrams `D: I → C`:

**Identity**: `D(id_i) = id_{D(i)}`
**Composition**: `D(g ∘ f) = D(g) ∘ D(f)`

**Witness**: Property test with `DiagramLaws.validateFunctoriality`

### Closure Laws
For diagram closure operations:

**Idempotence**: `saturate(saturate(D)) = saturate(D)`
**Preservation**: If `D` satisfies functoriality, so does `saturate(D)`

**Witness**: Property test with closure validation

## Markov Category Laws

### Faithfulness via monomorphisms

- **Domain**: Markov category with commutative semiring R
- **Statement**: ∇ is split mono ⇒ monic (Δ ∘ ∇ = id)
- **Rationale**: Establishes faithfulness of the distribution functor
- **Oracle**: `checkFaithfulness(R, samples, domain)` → `{splitMono: boolean, deltaMonic: boolean}`
- **Witness**: Split mono witness + δ monicity proof
- **Tests**: `law.PullbackCheck.spec.ts`

### Entirety implies representability

- **Domain**: Commutative semiring R with no zero divisors
- **Statement**: If R is entire, then the relevant pullback square always holds
- **Rationale**: Connects algebraic properties to categorical representability
- **Oracle**: `checkEntirety(R, domain, f, g)` → `boolean`
- **Witness**: Pullback square verification for entire semirings
- **Tests**: `law.EntiretyCheck.spec.ts`

### Pullback square uniqueness

- **Domain**: Deterministic morphisms f: A→X, g: A→Y in Markov category
- **Statement**: Only joint with Dirac marginals is the Dirac pair
- **Rationale**: Core representability property for Markov categories
- **Oracle**: `checkPullbackSquare(R, Avals, f, g, candidates?)` → `boolean`
- **Witness**: Counterexample detection for exotic semirings
- **Tests**: `law.PullbackSquare.spec.ts`

### Thunkability ⇔ determinism

- **Domain**: Kleisli morphisms f: A → P(B) in Markov category
- **Statement**: f is thunkable ⇔ f is deterministic (factors through δ)
- **Rationale**: Characterizes when morphisms respect the monoidal structure
- **Oracle**: `isThunkable(R, f, samples, probes)` → `{thunkable: boolean, base?: Function}`
- **Witness**: Extracted base function for deterministic morphisms
- **Tests**: `law.MarkovThunkable.spec.ts`

### Monoidal structure

- **Domain**: Symmetric monoidal Markov category
- **Statement**: δ and sampling are monoidal; strength is natural in second argument
- **Rationale**: Ensures independence properties work correctly
- **Oracle**: `checkAllMonoidalLaws(R, testData)` → `{diracMonoidal: boolean, strengthNaturality: boolean, ...}`
- **Witness**: Commuting diagrams for monoidal coherence
- **Tests**: `law.MarkovMonoidalSimple.spec.ts`

### Sampling cancellation

- **Domain**: Kleisli morphisms with sampling function in a.s.-compatible setting
- **Statement**: If samp∘f# = samp∘g# (a.s.), then f# = g# (a.s.)
- **Rationale**: Characterizes when sampling determines distributional equality
- **Oracle**: `samplingCancellation(R, Avals, f, g, samp, nullMask?)` → `boolean`
- **Witness**: Counterexample (Ghost semiring) where cancellation fails
- **Tests**: `law.ASEquality.spec.ts`, `law.GhostCounterexample.spec.ts`

### Ghost semiring counterexample

- **Domain**: Ghost semiring Rε = {0, ε, 1}
- **Statement**: Representable but not a.s.-compatible (f# ≠ g# but samp∘f# = samp∘g#)
- **Rationale**: Demonstrates limits of representability theory
- **Oracle**: `samplingCancellation(GhostRig, ...)` → `false` (counterexample)
- **Witness**: Concrete distributions differing by ε-weights
- **Tests**: `law.GhostCounterexample.spec.ts`

## Dominance Theory Laws

### SOSD via Dilation Witnesses

- **Domain**: Distributions with evaluation function e: P(A) → A
- **Statement**: p ⪯_SOSD q ⇔ ∃ dilation t: q = t#(p) ∧ e∘t = id
- **Rationale**: Characterizes second-order stochastic dominance constructively
- **Oracle**: `sosdFromWitness(R, p, q, e, t, samples, direction)` → `boolean`
- **Witness**: Mean-preserving dilation witnessing the dominance
- **Tests**: `law.SOSD.spec.ts`

### Dilation Validation

- **Domain**: Kernels t: A → P(A) with evaluation function e
- **Statement**: t is a dilation ⇔ e∘t = id (mean-preserving property)
- **Rationale**: Validates mean-preserving spread transformations
- **Oracle**: `isDilation(R, t, e, samples)` → `boolean`
- **Witness**: Verification that evaluation is preserved
- **Tests**: `law.SOSD.spec.ts`

## Information Theory Laws

### Blackwell Sufficiency (Informativeness)

- **Domain**: Experiments f, g: Θ → P(X), P(Y) with prior m
- **Statement**: f is more informative than g ⇔ ∃ garbling c: f = c∘g
- **Rationale**: Characterizes when one experiment provides more information
- **Oracle**: `moreInformativeClassic(R, Θvals, f, g, candidates)` → `{ok: boolean, c?: Function}`
- **Witness**: Garbling function c witnessing the information ordering
- **Tests**: `law.Garbling.spec.ts`

### Standard Experiments

- **Domain**: Prior m: P(Θ) and experiment f: Θ → P(X)
- **Statement**: Standard measure f̂_m distributes over posterior distributions
- **Rationale**: Canonical representation for Bayesian decision theory
- **Oracle**: `standardMeasure(m, f, xVals)` → `StandardMeasure<Θ>`
- **Witness**: Distribution over posterior distributions
- **Tests**: `law.StandardExperiment.spec.ts`

### BSS Equivalence

- **Domain**: Experiments f, g with prior m
- **Statement**: f ⪰ g ⟺ f̂_m ⪯_SOSD ĝ_m (informativeness ⇔ SOSD on standard measures)
- **Rationale**: Connects all three characterizations of informativeness
- **Oracle**: `bssCompare(m, f, g, xVals, yVals)` → `boolean`
- **Witness**: Equivalence of garbling, joint, and SOSD characterizations
- **Tests**: `law.BSS.spec.ts`

## Oracle Coverage Summary

| Domain | Laws Covered | Oracles Implemented | Tests |
|--------|--------------|-------------------|-------|
| **Foundational** | Faithfulness, entirety, pullbacks, thunkability, monoidal coherence, sampling cancellation | 15+ | 139 |
| **Dominance** | SOSD, dilations | 5+ | 25 |
| **Information** | Blackwell sufficiency, BSS equivalence | 8+ | 47 |
| **Counterexamples** | Ghost semiring | 3+ | 10 |
| **Infrastructure** | Semirings, distributions | 10+ | 23 |

**Total**: 41+ oracles, 244 tests, complete coverage of advanced probability theory

## Future Extensions

This document should grow to include:
- **Lens laws** (get-put, put-get, put-put)
- **Prism laws** (preview-review, review-preview)
- **Traversal laws** (traversal composition, traversal identity)
- **Comonad laws** (extract, duplicate, extend)
- **Distributive laws** (distributivity over products/coproducts)
- **Monad transformer laws** (lift laws, transformer composition)
- **Infinite-dimensional laws** (Kolmogorov extension, zero-one laws)
- **Ergodic theory laws** (invariant σ-algebras, ergodic decomposition)
