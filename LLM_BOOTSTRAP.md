# LLM Bootstrap Guide: Getting Up to Speed Quickly

## Project Overview

This is **tiny-fp** - a TypeScript-first functional programming library that has evolved into a comprehensive **categorical theory toolkit**. What started as basic FP utilities (Option, Result, pipe/flow) has grown into a mathematically rigorous framework for:

- **Category theory** (functors, natural transformations, monads)
- **Homological algebra** (chain complexes, triangulated categories)
- **Algebraic structures** (semirings, rings, algebras, corings)
- **Practical algorithms** (graph analytics, automata, HMMs, regex engines)

## Architecture & Codebase Structure

### **Single-File Architecture**
- **`allTS.ts`** - Main implementation (13,000+ lines)
- **`examples.ts`** - Runnable demonstrations
- **`test/`** - Comprehensive test suites (50+ tests)
- **Documentation** - Multiple specialized guides

### **Key Design Principles**
1. **Zero dependencies** - Self-contained, tree-shakeable
2. **Type-driven development** - TypeScript inference guides design
3. **Law-checked abstractions** - Mathematical correctness verified at runtime
4. **Practical applicability** - Abstract theory with concrete implementations

## Core Mathematical Infrastructure

### **Foundation Layer**
```typescript
// Basic algebraic structures
Semiring<R>     // (R, +, ×, 0, 1) - basis for all matrix operations
Ring<R>         // Semiring + additive inverses
Mat<R>          // R[][] matrices with semiring operations
```

### **Categorical Theory**
```typescript
// Core structures
Algebra<R>      // (A, μ: A⊗A→A, η: R→A) 
Coring<R>       // (C, Δ: C→C⊗C, ε: C→R)
Entwining<R>    // Ψ: A⊗C → C⊗A with 4 compatibility laws
```

### **Module Theory**
```typescript
// Modules and comodules
Comodule<R>     // Right C-comodule with coaction ρ: M→M⊗C
Bicomodule<R>   // Left + right coactions that commute
EntwinedModule<R> // Module + comodule compatible via entwining
```

### **Practical Algorithms**
```typescript
// Real-world applications
WeightedAutomaton<R,Sym> // Finite automata over semirings
HMM<R,Obs>              // Hidden Markov Models
Graph utilities         // Path counting, reachability, shortest paths
Regex compiler          // Pattern → weighted automaton
```

## How to Navigate the Codebase

### **Finding Functionality**
1. **Search by mathematical concept** - Types are well-named (`Entwining`, `Bicomodule`)
2. **Search by application** - Look for domain keywords (`waRun`, `hmmForward`, `shortestPaths`)
3. **Follow the examples** - `examples.ts` demonstrates usage patterns
4. **Check the tests** - `test/` shows expected behavior

### **Understanding the Mathematics**
1. **Law checkers** - Functions ending in `*Holds` verify mathematical properties
2. **Diagonal constructors** - `makeDiagonal*` functions provide canonical examples
3. **Comments** - Mathematical notation and references included
4. **Documentation** - `CATEGORICAL_TOOLKIT.md` and `USAGE_CHEATSHEET.md`

## Key Patterns & Conventions

### **Naming Conventions**
- `make*` - Constructors for mathematical objects
- `*Holds` - Law checkers that return boolean
- `*Unchecked` - Performance variants that skip validation
- Semiring prefixes - `SemiringNat`, `SemiringMinPlus`, etc.

### **Function Signatures**
```typescript
// Curried style for partial application
export const matMul = <R>(S: Semiring<R>) => (A: Mat<R>, B: Mat<R>): Mat<R>

// Law checkers take the structure and return boolean
export const comoduleCoassocHolds = <R>(M: Comodule<R>): boolean

// Safe vs unsafe variants
export const composeEntwinedHoms = <R>(...) => (...): Result<string, Mat<R>>
export const composeEntwinedHomsUnchecked = <R>(...) => (...): Mat<R>
```

### **Error Handling**
- `Result<E, A>` types for fallible operations
- Dimension checking in matrix operations
- Law validation in categorical constructions
- TypeScript compile-time safety + runtime verification

## Getting Started Quickly

### **For Mathematical Exploration**
1. Start with `examples.ts` - see what's possible
2. Use law checkers to verify constructions
3. Build on diagonal examples (they're always lawful)
4. Check `CATEGORICAL_TOOLKIT.md` for theoretical background

### **For Practical Applications**
1. Check `USAGE_CHEATSHEET.md` - problem → solution lookup
2. Pick the right semiring for your domain
3. Use the graph/automata/HMM utilities directly
4. Extend with custom semirings as needed

### **For Contributing/Extending**
1. Follow the law-checked pattern - implement structure + law checker
2. Add diagonal/canonical constructors for examples
3. Include comprehensive tests with edge cases
4. Document the mathematical meaning and practical applications

## Understanding the Evolution

### **Phase 1: Basic FP** (Historical)
- Option, Result, pipe/flow
- Basic monadic structures
- Type-safe error handling

### **Phase 2: Category Theory** (Core)
- Functors, natural transformations
- Monads, comonads
- Kleisli categories, distributive laws

### **Phase 3: Algebraic Structures** (Advanced)
- Semirings, algebras, corings
- Entwining structures
- Bimodules and tensor products

### **Phase 4: Practical Applications** (Current)
- Graph algorithms via semirings
- Weighted automata and regex engines
- HMMs and probabilistic models
- Matrix-based dynamic programming

### **Phase 5: Homological Algebra** (Next)
- Chain complexes and triangulated categories
- Derived categories and homotopy theory
- Spectral sequences and cohomology

## Common Gotchas & Solutions

### **Dimension Mismatches**
- **Problem:** Matrix operations fail with shape errors
- **Solution:** Use TypeScript strictly, check dimensions in tests
- **Debug:** Add logging to see actual vs expected shapes

### **Law Violations**
- **Problem:** Categorical structures fail law checks
- **Solution:** Start with diagonal examples, use law checkers during development
- **Debug:** Law checkers provide specific failure information

### **Performance Issues**
- **Problem:** Matrix operations too slow for large problems
- **Solution:** Use `*Unchecked` variants, consider sparse representations
- **Optimization:** Batch operations, use appropriate semirings

### **Type Complexity**
- **Problem:** TypeScript inference struggles with complex generic types
- **Solution:** Add explicit type annotations, use helper types
- **Simplify:** Break complex operations into smaller, well-typed pieces

## Useful Search Patterns

### **Finding Examples**
```
grep -n "console.log" examples.ts    # Find example outputs
grep -n "expect.*toBe" test/         # Find test assertions
grep -n "makeDiagonal" allTS.ts      # Find canonical constructors
```

### **Finding Law Checkers**
```
grep -n "*Holds" allTS.ts           # All law verification functions
grep -n "law.*=" allTS.ts           # Law checking patterns
```

### **Finding Semiring Applications**
```
grep -n "Semiring.*=" allTS.ts      # Semiring definitions
grep -n "matMul.*Semiring" allTS.ts # Matrix operations over semirings
```

## Integration Points

### **Adding New Semirings**
1. Implement `Semiring<R>` interface
2. Add to practical semirings section
3. Test with existing matrix operations
4. Document use cases in cheat sheet

### **Adding New Categorical Structures**
1. Define the type with required operations
2. Implement law checkers (`*Holds` functions)
3. Create diagonal/canonical constructors
4. Add comprehensive tests
5. Document mathematical meaning

### **Adding New Applications**
1. Identify the underlying algebraic structure
2. Use existing semiring/matrix infrastructure
3. Add domain-specific utilities
4. Create examples showing different semiring applications

## Mental Model for LLMs

Think of this codebase as **three interconnected layers**:

1. **Mathematical Foundation** - Abstract algebraic structures with law checking
2. **Computational Infrastructure** - Matrix operations, semiring abstractions  
3. **Practical Applications** - Graph algorithms, automata, HMMs, regex engines

The power comes from how **abstract mathematics** becomes **practical computation** through **semiring abstraction** - the same algorithm solves different problems by changing the algebraic structure.

## Quick Orientation Commands

```bash
# See what's available
grep "export.*=" allTS.ts | head -20

# Find examples
ls examples*.ts

# Run examples
npx tsx examples.ts

# Run tests
npx vitest run

# Check types
npx tsc --noEmit
```

This codebase represents a unique approach to **mathematical programming** - where category theory and practical computation converge into a unified, law-checked, type-safe framework. The goal is making abstract mathematics **immediately useful** while maintaining **mathematical rigor**.