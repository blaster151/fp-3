#!/usr/bin/env node
/**
 * Automated Code Organization Script for allTS.ts
 * 
 * This script can be executed by an older/cheaper LLM to modularize the codebase.
 * It uses clear markers and safe patterns to avoid breaking changes.
 * 
 * Strategy:
 * 1. Parse allTS.ts into logical sections using comment markers
 * 2. Create module files with proper exports
 * 3. Generate barrel exports (index.ts files)
 * 4. Update import paths in examples and tests
 * 5. Verify no circular dependencies
 */

import fs from 'fs/promises'
import path from 'path'

const WORKSPACE_ROOT = '/workspace'
const SOURCE_FILE = path.join(WORKSPACE_ROOT, 'allTS.ts')
const SRC_DIR = path.join(WORKSPACE_ROOT, 'src')

// Module organization plan
const MODULE_PLAN = {
  'core': {
    dir: 'src/core',
    files: {
      'hkt.ts': {
        startMarker: '// HKT (Higher-Kinded Types)',
        endMarker: '// =======================',
        description: 'Higher-kinded type system and utilities'
      },
      'basic-types.ts': {
        startMarker: '// Basic types: Option, Result, etc.',
        endMarker: '// Functor instances',
        description: 'Core data types: Option, Result, Task, Validation'
      },
      'functors.ts': {
        startMarker: '// Functor instances',
        endMarker: '// =======================',
        description: 'Functor, Apply, Applicative instances'
      },
      'combinators.ts': {
        startMarker: '// Function composition and utilities',
        endMarker: '// =======================',
        description: 'pipe, compose, curry functions and utilities'
      }
    }
  },
  'category': {
    dir: 'src/category',
    files: {
      'endofunctors.ts': {
        startMarker: '// =============== Endofunctors ===============',
        endMarker: '// =============== Natural Transformations ===============',
        description: 'EndofunctorK1, Sum, Product, composition'
      },
      'natural-trans.ts': {
        startMarker: '// =============== Natural Transformations ===============',
        endMarker: '// ---------- Traversable ----------',
        description: 'NatK1, natural transformations, Sum/Product nats'
      },
      'traversable.ts': {
        startMarker: '// ---------- Traversable ----------',
        endMarker: '// ---------- Free endofunctor term ----------',
        description: 'TraversableK1, distributive laws, Promise/Task'
      },
      'free-algebra.ts': {
        startMarker: '// ---------- Free endofunctor term ----------',
        endMarker: '// =============== Coalgebras for W ===============',
        description: 'EndoTerm, evaluation, hoisting, structure alignment'
      }
    }
  },
  'comonads': {
    dir: 'src/comonads',
    files: {
      'comonad.ts': {
        startMarker: '// =============== Comonads ===============',
        endMarker: '// Mixed distributive law instances',
        description: 'ComonadK1 interface, mixed distributive laws'
      },
      'pair.ts': {
        startMarker: '// =============== Pair Comonad ===============',
        endMarker: '// =============== Store Comonad ===============',
        description: 'Pair/Env comonad implementation'
      },
      'store.ts': {
        startMarker: '// =============== Store Comonad ===============',
        endMarker: '// =============== Co-Kleisli ===============',
        description: 'Store comonad, Lens integration, utilities'
      },
      'coalgebras.ts': {
        startMarker: '// =============== Coalgebras for W ===============',
        endMarker: '// =============== Simplicial Objects ===============',
        description: 'Coalgebra, ForgetfulFromCoalgebras'
      },
      'cokleisli.ts': {
        startMarker: '// =============== Co-Kleisli ===============',
        endMarker: '// =============== Simplicial Objects ===============',
        description: 'Co-Kleisli category, DoComonad builders'
      }
    }
  },
  'topology': {
    dir: 'src/topology',
    files: {
      'simplicial.ts': {
        startMarker: '// =============== Simplicial Objects ===============',
        endMarker: '// ===================================================================',
        description: 'Simplicial objects from comonads'
      },
      'chain-complex.ts': {
        startMarker: '// Chain complex from the simplicial object of Pair<E,_>',
        endMarker: '// Smith Normal Form',
        description: 'Chain complexes, boundary operators, Betti numbers'
      },
      'homology.ts': {
        startMarker: '// Betti numbers and homology computation',
        endMarker: '// Smith Normal Form',
        description: 'Rational homology computation'
      },
      'smith-normal.ts': {
        startMarker: '// Smith Normal Form',
        endMarker: '// Discoverable API',
        description: 'SNF, exact integer homology with torsion'
      }
    }
  },
  'sheaves': {
    dir: 'src/sheaves',
    files: {
      'glue-kit.ts': {
        startMarker: '// Generic descent/glue kit',
        endMarker: '// Record-based gluing',
        description: 'Generic descent/glue framework'
      },
      'record-glue.ts': {
        startMarker: '// Record-based gluing',
        endMarker: '// ---------- Fused hylo demo',
        description: 'Record specialization of gluing'
      }
    }
  }
}

/**
 * Instructions for older LLM:
 * 
 * 1. READ the source file allTS.ts
 * 2. For each module in MODULE_PLAN:
 *    a. Create the directory structure
 *    b. Extract code between startMarker and endMarker
 *    c. Add proper TypeScript module headers
 *    d. Create index.ts barrel exports
 * 3. Generate a new main allTS.ts that imports from modules
 * 4. Update all example and test files to import from the new structure
 * 
 * SAFETY RULES:
 * - Never modify the actual logic, only move code
 * - Preserve all exports exactly
 * - Maintain all type signatures
 * - Keep all comments and documentation
 * - Test compilation after each module
 * 
 * VERIFICATION:
 * - Run `npm run test:new` after completion
 * - Check that all examples still work
 * - Ensure no circular dependencies
 */

async function analyzeCurrentStructure() {
  console.log('📊 Analyzing current allTS.ts structure...')
  
  try {
    const content = await fs.readFile(SOURCE_FILE, 'utf-8')
    const lines = content.split('\n')
    
    console.log(`📈 Current stats:`)
    console.log(`  Lines: ${lines.length}`)
    console.log(`  Size: ${Math.round(content.length / 1024)}KB`)
    
    // Find major section markers
    const sections = []
    lines.forEach((line, i) => {
      if (line.includes('// ===============') || line.includes('// ----------')) {
        sections.push({ line: i + 1, marker: line.trim() })
      }
    })
    
    console.log(`\n🏷️  Found ${sections.length} section markers:`)
    sections.slice(0, 10).forEach(s => {
      console.log(`  Line ${s.line}: ${s.marker}`)
    })
    if (sections.length > 10) {
      console.log(`  ... and ${sections.length - 10} more`)
    }
    
    // Analyze exports
    const exportLines = lines.filter(line => line.startsWith('export '))
    console.log(`\n📤 Found ${exportLines.length} exports`)
    
    // Analyze imports in test/example files
    const testFiles = await fs.readdir(path.join(WORKSPACE_ROOT, 'test'))
    const exampleFiles = await fs.readdir(WORKSPACE_ROOT)
    
    const relevantFiles = [
      ...testFiles.filter(f => f.endsWith('.spec.ts')).map(f => `test/${f}`),
      ...exampleFiles.filter(f => f.startsWith('examples-') && f.endsWith('.ts'))
    ]
    
    console.log(`\n🔗 Files that import from allTS.ts: ${relevantFiles.length}`)
    relevantFiles.slice(0, 5).forEach(f => console.log(`  ${f}`))
    if (relevantFiles.length > 5) {
      console.log(`  ... and ${relevantFiles.length - 5} more`)
    }
    
  } catch (error) {
    console.error('❌ Error analyzing structure:', error.message)
  }
}

async function generateOrganizationPlan() {
  console.log('\n📋 Generating detailed organization plan...')
  
  // Get relevant files that import from allTS
  const testFiles = await fs.readdir(path.join(WORKSPACE_ROOT, 'test'))
  const exampleFiles = await fs.readdir(WORKSPACE_ROOT)
  
  const relevantFiles = [
    ...testFiles.filter(f => f.endsWith('.spec.ts')).map(f => `test/${f}`),
    ...exampleFiles.filter(f => f.startsWith('examples-') && f.endsWith('.ts'))
  ]
  
  const planFile = path.join(WORKSPACE_ROOT, 'ORGANIZATION-PLAN.md')
  const plan = `# Code Organization Plan for allTS.ts

## 🎯 Goal
Split the monolithic \`allTS.ts\` (420KB+) into manageable, cohesive modules while maintaining:
- ✅ All existing functionality
- ✅ Type safety and exports
- ✅ Test compatibility
- ✅ Example compatibility

## 📦 Module Structure

${Object.entries(MODULE_PLAN).map(([category, config]) => `
### ${category.toUpperCase()} (\`${config.dir}\`)
${Object.entries(config.files).map(([file, info]) => `
- **\`${file}\`**: ${info.description}
  - Extract from: \`${info.startMarker}\` to \`${info.endMarker}\`
`).join('')}
`).join('')}

## 🚀 Migration Steps (for older LLM execution)

### Phase 1: Analysis & Setup
1. \`\`\`bash
   mkdir -p src/core src/category src/comonads src/topology src/sheaves
   \`\`\`

2. Analyze current structure:
   \`\`\`bash
   node scripts/organize-allts.mjs analyze
   \`\`\`

### Phase 2: Module Extraction
For each module, execute these steps **in order**:

1. **Extract code section**:
   - Find \`startMarker\` and \`endMarker\` in allTS.ts
   - Copy everything between (including exports)
   - Save to new module file

2. **Add module header**:
   \`\`\`typescript
   // Generated from allTS.ts - do not edit manually
   // Description: [module description]
   \`\`\`

3. **Fix imports**:
   - Add imports for dependencies from other modules
   - Use relative imports: \`../core/hkt\`

4. **Test compilation**:
   \`\`\`bash
   npx tsc --noEmit src/[category]/[file]
   \`\`\`

### Phase 3: Barrel Exports
Create \`index.ts\` files for each category:

\`\`\`typescript
// src/core/index.ts
export * from './hkt'
export * from './basic-types'
export * from './functors'
export * from './combinators'
\`\`\`

### Phase 4: Main File Update
Replace allTS.ts content with:

\`\`\`typescript
// allTS.ts - Unified export barrel
export * from './src/core'
export * from './src/category'
export * from './src/comonads'
export * from './src/topology'
export * from './src/sheaves'
\`\`\`

### Phase 5: Update Imports
Update all files that import from './allTS':
- \`test/*.spec.ts\` (${relevantFiles.filter(f => f.startsWith('test/')).length} files)
- \`examples-*.ts\` (${relevantFiles.filter(f => f.startsWith('examples-')).length} files)

No changes needed - they still import from './allTS'

### Phase 6: Verification
\`\`\`bash
npm run test:new        # All tests pass
npx tsc --noEmit        # No type errors
npm run precommit       # Full validation
\`\`\`

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
1. \`git checkout HEAD -- allTS.ts\` (restore original)
2. \`rm -rf src/\` (remove modules)
3. All functionality restored

---

*Generated by organize-allts.mjs - Safe for execution by older LLM*
`
  
  await fs.writeFile(planFile, plan)
  console.log(`✅ Organization plan written to: ${planFile}`)
}

async function main() {
  const command = process.argv[2] || 'plan'
  
  console.log('🏗️  allTS.ts Organization Tool')
  console.log('================================\n')
  
  switch (command) {
    case 'analyze':
      await analyzeCurrentStructure()
      break
      
    case 'plan':
      await analyzeCurrentStructure()
      await generateOrganizationPlan()
      break
      
    case 'execute':
      console.log('🚨 EXECUTE mode not implemented - use older LLM with ORGANIZATION-PLAN.md')
      console.log('📋 Plan available at: /workspace/ORGANIZATION-PLAN.md')
      break
      
    default:
      console.log('Usage: node organize-allts.mjs [analyze|plan|execute]')
      console.log('  analyze - Show current structure analysis')
      console.log('  plan    - Generate organization plan (default)')
      console.log('  execute - Execute organization (use older LLM)')
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}