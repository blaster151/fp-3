# Algebraic Laws and Witnesses

This document catalogs the algebraic laws that our functional programming constructs must satisfy. Each law should have:
1. **Law** - The mathematical equation
2. **Shape** - The IR pattern it matches
3. **Witness** - A property test that verifies the law

## Core Algebraic Structures

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

### Law 3.4: Faithfulness via Monomorphisms

- **Domain**: Markov category with commutative semiring R
- **Statement**: ∇ is split mono ⇒ monic (Δ ∘ ∇ = id)
- **Rationale**: Establishes faithfulness of the distribution functor
- **Oracle**: `checkFaithfulness(R, samples, domain)` → `{splitMono: boolean, deltaMonic: boolean}`
- **Witness**: Split mono witness + δ monicity proof
- **Tests**: `law.PullbackCheck.spec.ts`

### Law 3.6: Entirety Implies Representability

- **Domain**: Commutative semiring R with no zero divisors
- **Statement**: If R is entire, then pullback square (3.8) always holds
- **Rationale**: Connects algebraic properties to categorical representability
- **Oracle**: `checkEntirety(R, domain, f, g)` → `boolean`
- **Witness**: Pullback square verification for entire semirings
- **Tests**: `law.EntiretyCheck.spec.ts`

### Law 3.8: Pullback Square Uniqueness

- **Domain**: Deterministic morphisms f: A→X, g: A→Y in Markov category
- **Statement**: Only joint with Dirac marginals is the Dirac pair
- **Rationale**: Core representability property for Markov categories
- **Oracle**: `checkPullbackSquare(R, Avals, f, g, candidates?)` → `boolean`
- **Witness**: Counterexample detection for exotic semirings
- **Tests**: `law.PullbackSquare.spec.ts`

### Law 3.14: Thunkability ⇔ Determinism

- **Domain**: Kleisli morphisms f: A → P(B) in Markov category
- **Statement**: f is thunkable ⇔ f is deterministic (factors through δ)
- **Rationale**: Characterizes when morphisms respect the monoidal structure
- **Oracle**: `isThunkable(R, f, samples, probes)` → `{thunkable: boolean, base?: Function}`
- **Witness**: Extracted base function for deterministic morphisms
- **Tests**: `law.MarkovThunkable.spec.ts`

### Laws 3.15-3.16: Monoidal Structure

- **Domain**: Symmetric monoidal Markov category
- **Statement**: δ and sampling are monoidal; strength is natural in second argument
- **Rationale**: Ensures independence properties work correctly
- **Oracle**: `checkAllMonoidalLaws(R, testData)` → `{diracMonoidal: boolean, strengthNaturality: boolean, ...}`
- **Witness**: Commuting diagrams for monoidal coherence
- **Tests**: `law.MarkovMonoidalSimple.spec.ts`

### Law 5.15: Sampling Cancellation

- **Domain**: Kleisli morphisms with sampling function in a.s.-compatible setting
- **Statement**: If samp∘f# = samp∘g# (a.s.), then f# = g# (a.s.)
- **Rationale**: Characterizes when sampling determines distributional equality
- **Oracle**: `samplingCancellation(R, Avals, f, g, samp, nullMask?)` → `boolean`
- **Witness**: Counterexample (Ghost semiring) where cancellation fails
- **Tests**: `law.ASEquality.spec.ts`, `law.GhostCounterexample.spec.ts`

### Example 3.26: Ghost Semiring Counterexample

- **Domain**: Ghost semiring Rε = {0, ε, 1}
- **Statement**: Representable but not a.s.-compatible (f# ≠ g# but samp∘f# = samp∘g#)
- **Rationale**: Demonstrates limits of representability theory
- **Oracle**: `samplingCancellation(GhostRig, ...)` → `false` (counterexample)
- **Witness**: Concrete distributions differing by ε-weights
- **Tests**: `law.GhostCounterexample.spec.ts`

## Dominance Theory Laws (Section 4)

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

## Information Theory Laws (Section 5)

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
| **Foundational** | 3.4, 3.6, 3.8, 3.14, 3.15-3.16, 5.15 | 15+ | 139 |
| **Dominance** | Section 4 (SOSD, dilations) | 5+ | 25 |
| **Information** | Section 5 (Blackwell, BSS) | 8+ | 47 |
| **Counterexamples** | 3.26 (Ghost semiring) | 3+ | 10 |
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
