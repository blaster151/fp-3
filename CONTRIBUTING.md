# Contributing to fp-3

Thank you for your interest in contributing! This guide outlines our principles, conventions, and practical considerations.

---

## 🎯 Project Philosophy

**fp-3** is a functional programming toolkit demonstrating category-theoretic concepts in TypeScript. We balance **mathematical rigor** with **practical usability**.

### Core Values

1. **Correctness First** - Mathematical laws must hold
2. **Type Safety** - Leverage TypeScript's type system fully
3. **Educational Value** - Code should teach concepts
4. **Pragmatic FP** - Functional principles with real-world practicality

---

## 🔒 Immutability Policy

### Domain Immutability (STRICT)

**All mathematical structures MUST be immutable.** No exceptions.

This includes:
- Categories, functors, natural transformations
- Arrows, objects, morphisms
- Monads, comonads, adjunctions
- Virtual equipment, proarrows
- Any data representing mathematical entities

```typescript
// ❌ NEVER ALLOWED: Mutating domain data
category.objects.push(newObject)
functor.mapping[key] = value
arrow.source = newSource

// ✅ CORRECT: Create new structures
const newCategory = { ...category, objects: [...category.objects, newObject] }
```

### Infrastructure Pragmatism (ALLOWED)

**Performance-critical helpers MAY use localized mutation** for non-domain concerns.

Valid use cases:
- Validation issue collection
- Temporary computation buffers
- Algorithm workspace (e.g., matrix operations)
- Performance-critical hot paths

**Requirements for infrastructure mutation:**

1. ✅ **Localized** - Created and consumed within same function
2. ✅ **Contained** - Must not escape function boundaries
3. ✅ **Documented** - Mark with `// INTENTIONAL_MUTATION:` comment
4. ✅ **Return readonly** - If returning, use `ReadonlyArray` or `Readonly<T>`

```typescript
// ✅ ALLOWED: Local accumulator for validation
const analyzeEquipmentLaw = (...): ValidationReport => {
  // INTENTIONAL_MUTATION: Local accumulator for validation issues
  const issues: string[] = []
  
  validateFraming(issues)
  validateCoherence(issues)
  validateIdentities(issues)
  
  return { issues }  // Returned as readonly via return type
}

// ✅ ALLOWED: Temporary computation buffer
const smithNormalForm = (matrix: Mat<number>): SNF => {
  // INTENTIONAL_MUTATION: Gaussian elimination workspace
  const A = matrix.map(row => [...row])  // Local copy
  // ... mutate A for algorithm ...
  return { U, S, V }  // Return readonly results
}
```

### The Boundary Rule

**Think of it like `console.log()`** - we don't worry about it mutating stdout because:
- It's infrastructure, not domain logic
- The mutation doesn't affect our program state
- It serves a pragmatic purpose

Same applies here: mutation that doesn't affect mathematical correctness is acceptable if contained.

---

## 📋 Type Safety Standards

### Strict Compiler Options

We use strict TypeScript settings. All code must pass:

```bash
npm run typecheck:prod  # Production code (zero errors required)
# Runnable examples stay under quarantine but have a dedicated audit gate:
npm run typecheck:prod:runnable  # Production settings applied to runnable suites
```

Key settings:
- `strict: true`
- `noUncheckedIndexedAccess: true` - Array access requires undefined checks
- `exactOptionalPropertyTypes: true` - Can't assign `undefined` to optional properties
- `verbatimModuleSyntax: true` - Explicit type-only imports

### Common Patterns

**Array Access Safety:**
```typescript
// ❌ Unsafe
const [item] = array
item.property  // Error: possibly undefined

// ✅ Safe
const [item] = array
if (!item) {
  return { holds: false, issues: ["Missing item"] }
}
item.property  // OK
```

**Optional Properties:**
```typescript
// ❌ Wrong
return {
  required: value,
  optional: maybeUndefined,  // Error with exactOptionalPropertyTypes
}

// ✅ Correct
return {
  required: value,
  ...(maybeUndefined !== undefined && { optional: maybeUndefined }),
}
```

**Type-Only Imports:**
```typescript
// ❌ Mixed imports with verbatimModuleSyntax
import { Type, value } from './module'

// ✅ Separated
import type { Type } from './module'
import { value } from './module'
```

---

## 🧪 Testing Requirements

### Law Testing

Mathematical laws MUST be tested:

```typescript
describe('Functor Laws', () => {
  it('preserves identity', () => {
    const F = createFunctor(...)
    expect(F.map(id)).toEqual(id)
  })
  
  it('preserves composition', () => {
    const F = createFunctor(...)
    expect(F.map(compose(g, f))).toEqual(compose(F.map(g), F.map(f)))
  })
})
```

### Validation Testing

Equipment validation must be comprehensive:

```typescript
it('detects invalid framing', () => {
  const result = analyzeComonadFraming(invalidData)
  expect(result.holds).toBe(false)
  expect(result.issues).toContain("expected issue message")
})
```

---

## 📝 Code Style

### Naming Conventions

- **Types/Interfaces**: `PascalCase` - `Category`, `EquipmentProarrow`
- **Functions**: `camelCase` - `analyzeFraming`, `restrictProarrow`
- **Constants**: `camelCase` or `PascalCase` for exports - `FieldReal`, `SemiringNat`
- **Type parameters**: Single capital letter or `PascalCase` - `<T>`, `<Obj, Arr>`

### Mathematical Terminology

Use standard category theory terms:
- ✅ "functor", "natural transformation", "adjunction"
- ✅ "monad", "comonad", "Kleisli"
- ❌ Don't invent new terminology without justification

### Comments

```typescript
// Good: Explains WHY or references theory
// This implements Proposition 5.10: left extensions along fully faithful roots

// Good: Documents intentional pragmatism
// INTENTIONAL_MUTATION: Local accumulator for performance

// Avoid: Explains WHAT (code should be self-documenting)
// Loop through the objects  ← Don't do this
```

---

## 🚀 Contribution Workflow

### 1. **Start with an Issue**

Discuss significant changes before implementing:
- New abstractions
- API changes
- Performance optimizations
- Architectural refactors

### 2. **Create a Branch**

```bash
git checkout -b feature/add-kan-extensions
```

### 3. **Make Changes**

- Keep commits focused and atomic
- Write meaningful commit messages
- Ensure `npm run typecheck:prod` passes
- Add tests for new functionality

### 4. **Submit a PR**

Include:
- **What**: Brief description of changes
- **Why**: Motivation or issue reference
- **Tests**: Evidence of correctness
- **Docs**: Update README or add examples if needed

### 5. **Pre-commit Checklist**

```bash
npm run typecheck:prod    # Zero errors required
npm run test:new          # All tests pass
npm run precommit         # Full pre-commit check
```

---

## 📚 Learning Resources

### Category Theory
- *Category Theory for Programmers* by Bartosz Milewski
- *Basic Category Theory* by Tom Leinster (arXiv:1612.09375)
- nLab: https://ncatlab.org/

### Functional Programming in TypeScript
- *Functional Programming in TypeScript* by Remo Jansen
- fp-ts documentation: https://gcanti.github.io/fp-ts/

---

## 🤝 Code of Conduct

- **Be respectful** - Constructive feedback only
- **Be patient** - Not everyone has the same CT background
- **Be collaborative** - We're learning together
- **Cite sources** - Reference papers/proofs when discussing theory

---

## ❓ Questions?

Open an issue for:
- Clarification on design decisions
- Discussion of new features
- Help with category theory concepts
- Contribution guidance

---

**Thank you for contributing to fp-3!** 🎉

Every PR, issue, and discussion helps make category theory more accessible to the TypeScript community.

