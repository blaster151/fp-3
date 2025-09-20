# Indexed Families + Discrete Categories

Tiny, composable building blocks to model **indexed families** as functors out of a **discrete category**, with handy Set/Vect realizations, (co)limits for finite families, **Kan extensions along index maps**, and **universal-property** helpers.

---

## Install (dev setup)

```bash
# deps you probably already have
pnpm add -D typescript vitest fast-check

# run tests
pnpm vitest
```

## Core ideas

- **Indexed family**: a function `I -> X`, or in a category `C`, a functor `Disc(I) -> C`.
- **Reindexing**: change indices via `u:J->I` (`reindex(u, fam)`).
- **(Co)limits for discrete diagrams**: finite products / coproducts over `I`.
- **Kan over discrete**: along `u:J->I`
  - **Left Kan** `Lan_u F` = coproducts over fibers `u^{-1}(i)`.
  - **Right Kan** `Ran_u F` = products over fibers.

## Quick glossary (main exports)

- **Families**: `IndexedFamily`, `familyFromArray`, `familyFromRecord`, `reindex`.
- **Set-like (enumerable)**: `EnumFamily`, `sigmaEnum` (Σ), `piEnum` (Π), `lanEnum` (Σ over fibers), `ranEnum` (Π over fibers).
- **Kan (generic)**: `lanDiscretePre`, `ranDiscretePre` with traits `HasFiniteCoproducts`, `HasFiniteProducts`.
- **Vect**: `Vect` (cat), `VectHasFiniteProducts`, `VectHasFiniteCoproducts`, `tupleVect`, `cotupleVect`, mediators from cones/cocones, and uniqueness helpers.
- **Arrow category**: `ArrowCategory`, `domFam`/`codFam`/`composeFam`.
- **Tests**: property tests for reindexing, Σ/Π triangles, Beck–Chevalley, Kan (Vect), universal properties & uniqueness.

## Tiny examples

### From arrays or records to families
```ts
const { I, Ifin, fam, Idisc } = familyFromArray(['a','b','c']); // I = [0,1,2]
const rec = { x: 2, y: 5 } as const;
const { keys, Ifin: IfinK, fam: famK } = familyFromRecord(rec);
```

### Reindex (substitution)
```ts
const u = (j: number) => j % 2;
const famJ = reindex(u, fam); // J-indexed family
```

### Σ / Π in Set-style (enumerable)
```ts
const enumFam = (i: number) => ({ enumerate: () => [i, i+1] });
const sum = sigmaEnum(Ifin, enumFam); // array of { i, x }
const prod = piEnum(Ifin, enumFam);   // array of dependent choices (I×…)
```

### Kan along indices (generic)
```ts
// In a category C with finite (co)products
const Lan = lanDiscretePre(IfinI, IfinJ, u, F, CWithCoproducts);
const Ran = ranDiscretePre(IfinI, IfinJ, u, F, CWithProducts);
```

### Vect: finite products/coproducts (direct sums)
```ts
const F: IndexedFamily<number, VectObj> = (i) => ({ dim: i+1 });
const { product, projections }  = finiteProduct(Ifin, F, VectHasFiniteProducts);
const { coproduct, injections } = finiteCoproduct(Ifin, F, VectHasFiniteCoproducts);
```

### Universal properties & uniqueness (Vect)
```ts
// Build canonical mediators from a cone/cocone
const tuple = tupleVectFromCone(Ifin, cone, product);
const cotup = cotupleVectFromCocone(Ifin, cocone, coproduct);

// Check triangles + uniqueness
productMediates(Vect, Vect.equalMor!, projections, tuple, {...cone, index: Ifin});
productUniquenessGivenTrianglesVect(Ifin, projections, product, cone, tuple, tuple);
```

## Laws we check (property tests)

- **Reindex**: `id* = id`, `(v∘u)* = u*∘v*`.
- **Adjunctions over discrete indices**:
  - **Σ ⊣ pullback**: both triangles; Beck–Chevalley (Σ).
  - **pullback ⊣ Π**: both triangles; Beck–Chevalley (Π).
- **Kan (Vect)**: object shapes & arity match expected fibers.
- **Universal properties (Vect)**: triangles commute; canonical mediators are unique.

## Project Structure

```
├── allTS.ts                           # Main mathematical toolkit
├── examples.ts                        # Comprehensive examples
├── test/
│   ├── indexed-families.spec.ts       # Core indexed family tests
│   ├── adjunction-right.spec.ts       # Π-side first triangle
│   ├── adjunction-right-2nd.spec.ts   # Π-side second triangle  
│   ├── adjunction-left-2nd.spec.ts    # Σ-side second triangle
│   ├── beck-chevalley-right-enum.spec.ts  # Beck-Chevalley Π (enumerable)
│   ├── beck-chevalley-right-vect.spec.ts  # Beck-Chevalley Π (Vect)
│   ├── universal-properties.spec.ts   # Universal property verification
│   └── uniqueness.spec.ts            # Mediator uniqueness tests
├── LAWS.md                           # Categorical laws documentation
└── README.md                         # This file
```

## Mathematical Background

This toolkit implements a complete theory of **indexed families** and **Kan extensions** over discrete categories, providing:

- **Complete adjunction theory**: Σ ⊣ u* ⊣ Π with explicit units/counits
- **Beck-Chevalley verification**: Substitution commutes with Kan extensions  
- **Universal property verification**: Existence + uniqueness for all constructions
- **Generic categorical framework**: Works with any category having finite (co)products
- **Concrete implementations**: Full verification in vector spaces (Vect)

The implementation bridges abstract category theory with practical computation, making advanced mathematical constructions immediately usable while maintaining complete theoretical rigor.