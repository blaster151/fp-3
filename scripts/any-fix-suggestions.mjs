#!/usr/bin/env node

import fs from 'node:fs'

const content = fs.readFileSync('allTS.ts', 'utf8')
const lines = content.split('\n')

console.log('🎯 Concrete "any" Fix Suggestions\n')

// Specific fixable patterns with concrete replacements
const fixes = [
  {
    pattern: /Array<\(x: any\) => any>/,
    before: 'Array<(x: any) => any>',
    after: 'Array<(x: unknown) => unknown>',
    reason: 'More precise than any, allows type narrowing',
    impact: 'HIGH'
  },
  {
    pattern: /\(fa: any\) => any/,
    before: '(fa: any) => any',
    after: '(fa: HK.Kind1<F, A>) => HK.Kind1<F, B>',
    reason: 'Use HKT types for functor operations',
    impact: 'HIGH'
  },
  {
    pattern: /\(f: \(a: A\) => any\)/,
    before: '(f: (a: A) => any)',
    after: '(f: (a: A) => HK.Kind1<F, B>)',
    reason: 'Specify the functor context',
    impact: 'HIGH'
  },
  {
    pattern: /: any \/\* [^*]+ \*\//,
    before: ': any /* comment */',
    after: ': HK.Kind1<F, A> /* comment */',
    reason: 'HKT placeholders should use proper types',
    impact: 'MEDIUM'
  },
  {
    pattern: /as any$/,
    before: 'expr as any',
    after: 'expr as SpecificType',
    reason: 'Use the most specific type possible',
    impact: 'MEDIUM'
  }
]

// Find specific examples
fixes.forEach((fix, i) => {
  console.log(`${i + 1}️⃣  **${fix.impact} IMPACT**: ${fix.reason}`)
  console.log(`   Before: ${fix.before}`)
  console.log(`   After:  ${fix.after}`)
  
  // Find examples in the code
  const examples = []
  lines.forEach((line, idx) => {
    if (fix.pattern.test(line) && !line.includes('/*') && examples.length < 3) {
      examples.push({ lineNum: idx + 1, line: line.trim() })
    }
  })
  
  if (examples.length > 0) {
    console.log('   Examples:')
    examples.forEach(({ lineNum, line }) => {
      console.log(`     ${lineNum}: ${line}`)
    })
  }
  console.log('')
})

// Specific actionable recommendations
console.log('🚀 **Immediate Action Plan:**\n')

console.log('**Phase 1: Function Parameters (Highest ROI)**')
console.log('• Replace `(f: any) => ...` with `<T>(f: (x: A) => T) => ...`')
console.log('• Replace `(fa: any) => any` with `(fa: HK.Kind1<F, A>) => HK.Kind1<F, B>`')
console.log('• This alone could eliminate ~71 any usages!\n')

console.log('**Phase 2: Property Types**') 
console.log('• Find properties like `result: any`')
console.log('• Check usage sites to determine actual types')
console.log('• Replace with unions like `result: Success<T> | Error<E>`\n')

console.log('**Phase 3: Type Assertions**')
console.log('• Replace `expr as any` with `expr as SpecificType`')
console.log('• Use TypeScript "Go to Definition" to find expected types')
console.log('• Consider branded types for domain-specific cases\n')

console.log('**Tools for Semi-Automated Fixing:**')
console.log('• ESLint with --fix flag for simple patterns')
console.log('• TypeScript Language Server "Infer type from usage"')
console.log('• VS Code "TypeScript Importer" extension')
console.log('• Search & replace with regex for systematic patterns\n')

console.log('**Example Fix Session:**')
console.log('```typescript')
console.log('// Before:')
console.log('const mapArray = (f: any) => (arr: any[]) => arr.map(f)')
console.log('')
console.log('// After:')
console.log('const mapArray = <A, B>(f: (a: A) => B) => (arr: A[]) => arr.map(f)')
console.log('```')
console.log('')

console.log('**Measuring Progress:**')
console.log('• Run this script periodically to track improvement')
console.log('• Set a goal: reduce "any" count by 50% over time')
console.log('• Focus on one category at a time for systematic progress')

const totalFixable = findings.length
const potentialReduction = Math.round((totalFixable / 686) * 100)

console.log(`\n📈 **Potential Impact**: Fix ${totalFixable} "any"s = ${potentialReduction}% reduction in total any usage!`)