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

## Future Extensions

This document should grow to include:
- **Lens laws** (get-put, put-get, put-put)
- **Prism laws** (preview-review, review-preview)
- **Traversal laws** (traversal composition, traversal identity)
- **Comonad laws** (extract, duplicate, extend)
- **Distributive laws** (distributivity over products/coproducts)
- **Monad transformer laws** (lift laws, transformer composition)
