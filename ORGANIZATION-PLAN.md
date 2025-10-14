# Code Organization Plan for allTS.ts

## 🎯 Goal
Split the monolithic `allTS.ts` (420KB+) into manageable, cohesive modules while maintaining:
- ✅ All existing functionality
- ✅ Type safety and exports
- ✅ Test compatibility
- ✅ Example compatibility

## 🔄 System-wide TODOs (post-relative monad rollout)

- **Street-calculus witnesses.** Thread the Definition 6.9–6.29 Street
  action comparison data into the analyzers in
  `relative/relative-algebras.ts` so the currently pending diagnostics
  become executable equalities once the diagrammatic witnesses are
  available.
- **Adjunction-derived constructors.** ✅ `relative/relative-monads.ts`
  now includes `relativeMonadFromAdjunction`, deriving relative monads and
  resolution diagnostics directly from relative adjunction data so the
  Theorem 5.24 comparisons execute without manual wiring.

## 📦 Module Structure


### Equipment & relative layers (top-level helpers)

- **`virtual-equipment/`** — Core interfaces, restriction helpers, and analyzers
  for companions, conjoints, loose monads, skew multicategory substitution, and
  weighted limit/extension witnesses.  Serves as the ambient double-category
  scaffolding for upcoming relative constructions.
- **`relative/`** — Relative staging area covering Definition 4.1 monad framing,
  Definition 5.1 adjunction data, the Definition 5.14/5.18/5.23 morphism
  analyzers (left/right/strict morphisms plus the Lemma 5.17/5.21 embeddings),
  Section 6 Kleisli/Eilenberg–Moore presentations, Corollary 5.34/5.40
  composition analyzers, loose-monoid conversion helpers, and the dual
  relative-comonad analyzers from Section 7.  The folder exposes
  `RelativeAdjunctionData`, framing/hom-isomorphism oracles, morphism checks,
  universal-property analyzers, composition oracles, and Lemma 5.5
  unit/counit analyzers that validate boundary data whenever a presentation
  accompanies the adjunction. Proposition 5.8/5.10/5.11 executables recover
  relative adjoints from pointwise left lifts, left extensions along fully
  faithful roots, and shared colimit preservation data, while the new Theorem
  5.24 resolution registry entry and the remaining strengthened universal
  properties promised by Theorem 6.49 stay visible as follow-up work.  Street
  action analyzers, canonical (op)algebra constructors, and
  `enumerateRelativeMonadOracles`/`enumerateRelativeAlgebraOracles` now live
  alongside the helpers so documentation, tests, and downstream packages can
  discover the pending Definition 6.9–6.29 witnesses directly from the
  barrel export.


### CORE (`src/core`)

- **`hkt.ts`**: Higher-kinded type system and utilities
  - Extract from: `// HKT (Higher-Kinded Types)` to `// =======================`

- **`basic-types.ts`**: Core data types: Option, Result, Task, Validation
  - Extract from: `// Basic types: Option, Result, etc.` to `// Functor instances`

- **`functors.ts`**: Functor, Apply, Applicative instances
  - Extract from: `// Functor instances` to `// =======================`

- **`combinators.ts`**: pipe, compose, curry functions and utilities
  - Extract from: `// Function composition and utilities` to `// =======================`


### CATEGORY (`src/category`)

- **`endofunctors.ts`**: EndofunctorK1, Sum, Product, composition
  - Extract from: `// =============== Endofunctors ===============` to `// =============== Natural Transformations ===============`

- **`natural-trans.ts`**: NatK1, natural transformations, Sum/Product nats
  - Extract from: `// =============== Natural Transformations ===============` to `// ---------- Traversable ----------`

- **`traversable.ts`**: TraversableK1, distributive laws, Promise/Task
  - Extract from: `// ---------- Traversable ----------` to `// ---------- Free endofunctor term ----------`

- **`free-algebra.ts`**: EndoTerm, evaluation, hoisting, structure alignment
  - Extract from: `// ---------- Free endofunctor term ----------` to `// =============== Coalgebras for W ===============`


### COMONADS (`src/comonads`)

- **`comonad.ts`**: ComonadK1 interface, mixed distributive laws
  - Extract from: `// =============== Comonads ===============` to `// Mixed distributive law instances`

- **`pair.ts`**: Pair/Env comonad implementation
  - Extract from: `// =============== Pair Comonad ===============` to `// =============== Store Comonad ===============`

- **`store.ts`**: Store comonad, Lens integration, utilities
  - Extract from: `// =============== Store Comonad ===============` to `// =============== Co-Kleisli ===============`

- **`coalgebras.ts`**: Coalgebra, ForgetfulFromCoalgebras
  - Extract from: `// =============== Coalgebras for W ===============` to `// =============== Simplicial Objects ===============`

- **`cokleisli.ts`**: Co-Kleisli category, DoComonad builders
  - Extract from: `// =============== Co-Kleisli ===============` to `// =============== Simplicial Objects ===============`


### TOPOLOGY (`src/topology`)

- **`simplicial.ts`**: Simplicial objects from comonads
  - Extract from: `// =============== Simplicial Objects ===============` to `// ===================================================================`

- **`chain-complex.ts`**: Chain complexes, boundary operators, Betti numbers
  - Extract from: `// Chain complex from the simplicial object of Pair<E,_>` to `// Smith Normal Form`

- **`homology.ts`**: Rational homology computation
  - Extract from: `// Betti numbers and homology computation` to `// Smith Normal Form`

- **`smith-normal.ts`**: SNF, exact integer homology with torsion
  - Extract from: `// Smith Normal Form` to `// Discoverable API`


### SHEAVES (`src/sheaves`)

- **`glue-kit.ts`**: Generic descent/glue framework
  - Extract from: `// Generic descent/glue kit` to `// Record-based gluing`

- **`record-glue.ts`**: Record specialization of gluing
  - Extract from: `// Record-based gluing` to `// ---------- Fused hylo demo`



## 🚀 Migration Steps (for older LLM execution)

### Phase 1: Analysis & Setup
1. ```bash
   mkdir -p src/core src/category src/comonads src/topology src/sheaves
   ```

2. Analyze current structure:
   ```bash
   node scripts/organize-allts.mjs analyze
   ```

### Phase 2: Module Extraction
For each module, execute these steps **in order**:

1. **Extract code section**:
   - Find `startMarker` and `endMarker` in allTS.ts
   - Copy everything between (including exports)
   - Save to new module file

2. **Add module header**:
   ```typescript
   // Generated from allTS.ts - do not edit manually
   // Description: [module description]
   ```

3. **Fix imports**:
   - Add imports for dependencies from other modules
   - Use relative imports: `../core/hkt`

4. **Test compilation**:
   ```bash
   npx tsc --noEmit src/[category]/[file]
   ```

### Phase 3: Barrel Exports
Create `index.ts` files for each category:

```typescript
// src/core/index.ts
export * from './hkt'
export * from './basic-types'
export * from './functors'
export * from './combinators'
```

### Phase 4: Main File Update
Replace allTS.ts content with:

```typescript
// allTS.ts - Unified export barrel
export * from './src/core'
export * from './src/category'
export * from './src/comonads'
export * from './src/topology'
export * from './src/sheaves'
```

### Phase 5: Update Imports
Update all files that import from './allTS':
- `test/*.spec.ts` (11 files)
- `examples-*.ts` (5 files)

No changes needed - they still import from './allTS'

### Phase 6: Verification
```bash
npm run test:new        # All tests pass
npx tsc --noEmit        # No type errors
npm run precommit       # Full validation
```

## 🛡️ Safety Checklist
- [ ] No logic changes, only code movement
- [ ] All exports preserved exactly
- [ ] All type signatures maintained
- [ ] All comments and docs preserved
- [ ] No circular dependencies introduced
- [ ] All tests still pass
- [ ] All examples still work

## 📊 Expected Results
- **Modularity**: Clear separation of concerns
- **Maintainability**: Easier to navigate and modify
- **Performance**: Faster IDE loading and type checking
- **Collaboration**: Multiple developers can work on different modules
- **Testing**: More targeted test coverage

## 🔄 Rollback Plan
If anything breaks:
1. `git checkout HEAD -- allTS.ts` (restore original)
2. `rm -rf src/` (remove modules)
3. All functionality restored

---

*Generated by organize-allts.mjs - Safe for execution by older LLM*
