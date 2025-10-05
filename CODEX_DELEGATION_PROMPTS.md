# TypeScript Error Fix Delegation Prompts

These prompts can be used with ChatGPT/Codex agents to fix mechanical TypeScript errors in the codebase.

## Context for All Prompts

**Project**: fp-3 - A category theory functional programming library in TypeScript  
**TypeScript Version**: 5.9.2  
**Compiler Options**: `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`, `verbatimModuleSyntax: true`

## Prompt 1: Array Access Safety Fixes

```
I need help fixing TypeScript errors caused by noUncheckedIndexedAccess in a file. This compiler option makes array/map access return `T | undefined` instead of `T`.

FILE: [paste filename here]

ERRORS TO FIX:
- "Object is possibly 'undefined'" (error TS2532)
- "is possibly 'undefined'" (error TS18048)
- Type 'X | undefined' is not assignable to type 'X' (error TS2345/TS2322)

RULES:
1. For array access `arr[i]`, extract to variable and check:
   ```typescript
   const item = arr[i];
   if (item === undefined) continue; // or return, or handle appropriately
   ```

2. For nested access `arr[i][j]`, check each level:
   ```typescript
   const row = arr[i];
   if (!row) continue;
   const item = row[j];
   if (item === undefined) continue;
   ```

3. For Map/object access in loops:
   ```typescript
   for (let i = 0; i < arr.length; i++) {
     const ai = arr[i];
     if (ai === undefined) continue;
     // use ai safely
   }
   ```

4. PRESERVE mathematical correctness - this is a math/category theory library
5. DO NOT change algorithm logic, only add safety checks
6. PREFER continue/return over nested conditionals for readability

Apply these fixes to the file.
```

## Prompt 2: Type-Only Import Fixes

```
I need help fixing TypeScript verbatimModuleSyntax errors in import statements.

FILE: [paste filename here]

ERROR PATTERN:
- "is a type and must be imported using a type-only import when 'verbatimModuleSyntax' is enabled" (error TS1484)

RULE:
Split imports into two statements:
- `import type { ... }` for types (interfaces, type aliases, type parameters)
- `import { ... }` for runtime values (functions, constants, classes)

EXAMPLE:
```typescript
// BEFORE
import { Functor, map, Monad, bind } from './types'

// AFTER  
import type { Functor, Monad } from './types'
import { map, bind } from './types'
```

HOW TO IDENTIFY:
- Types: interfaces, type aliases, generic type parameters
- Values: functions, const declarations, class constructors

Apply this fix to all imports in the file.
```

## Prompt 3: exactOptionalPropertyTypes Fixes

```
I need help fixing TypeScript exactOptionalPropertyTypes errors.

FILE: [paste filename here]

ERROR PATTERN:
- "Consider adding 'undefined' to the types of the target's properties" (error TS2375/TS2379)
- Property 'X | undefined' is not assignable to optional property 'X?'

ISSUE: With exactOptionalPropertyTypes, these are different:
- `prop?: string` - property may be absent
- `prop: string | undefined` - property must exist, value may be undefined

FIX: Use conditional spreading to omit undefined values:
```typescript
// BEFORE
return {
  required: value,
  optional: optionalValue  // might be undefined
}

// AFTER
return {
  required: value,
  ...(optionalValue !== undefined && { optional: optionalValue })
}
```

Apply this fix to all affected return statements and object literals.
```

## Prompt 4: Comprehensive Array + Map Safety

```
I need comprehensive undefined-safety fixes for array and map operations.

FILE: [paste filename here]

PATTERNS TO FIX:

1. Array.map/reduce accessing array elements:
```typescript
// BEFORE
arr.map((x, i) => arr2[i] * x)

// AFTER
arr.map((x, i) => {
  const y = arr2[i];
  return y !== undefined ? y * x : 0; // or appropriate default
})
```

2. Destructuring arrays:
```typescript
// BEFORE
const [a, b, c] = arr;
doSomething(a, b, c);

// AFTER
const [a, b, c] = arr;
if (!a || !b || !c) return null; // or handle appropriately
doSomething(a, b, c);
```

3. Array swapping:
```typescript
// BEFORE
[arr[i], arr[j]] = [arr[j], arr[i]];

// AFTER
const ai = arr[i];
const aj = arr[j];
if (ai !== undefined && aj !== undefined) {
  arr[i] = aj;
  arr[j] = ai;
}
```

4. Map.get() without default:
```typescript
// BEFORE
const value = map.get(key);
doSomething(value);

// AFTER
const value = map.get(key);
if (value !== undefined) doSomething(value);
```

Apply all applicable fixes while preserving algorithm correctness.
```

## Files Ready for Delegation

Based on error patterns, these files are good candidates for automated fixing:

### Simple Array Access (Use Prompt 1):
- `examples-store-lens.ts` (20 errors)
- `examples-sum-product.ts` (17 errors)  
- `test/laws/law-helpers.ts` (20 errors)

### Type Import Issues (Use Prompt 2):
- `examples.ts` (43 errors - likely mixed)
- Test files in `test/laws/` (many have import issues)

### Mixed (Use Prompts 1 + 2 together):
- Most files have a combination of array access and import issues

## Verification After Fixes

After applying fixes, run:
```bash
npm run typecheck 2>&1 | grep "^[filename].ts"
```

If no output = success! ✅

## Notes for Delegating Agents

1. **Preserve Semantics**: This is a mathematical library - don't change logic
2. **Follow Patterns**: Match the existing code style (see `bss.ts` and `lin-alg.ts` for examples)
3. **Test Incrementally**: Fix one file at a time and verify
4. **Ask If Uncertain**: Complex type system issues may need human review
5. **Skip if Stuck**: Mark file for manual review rather than guessing

## Example Success: bss.ts (79 errors → 0)

See `bss.ts` in the repository for a complete example of array access safety fixes applied correctly to a mathematical algorithm file.

## Example Success: lin-alg.ts (55 errors → 0)

See `lin-alg.ts` for another complete example focusing on matrix/vector operations with comprehensive safety checks.

