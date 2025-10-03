#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const TARGET_FILE = 'allTS.ts'

console.log('🔍 Auditing "any" usage in', TARGET_FILE)

const content = fs.readFileSync(TARGET_FILE, 'utf8')
const lines = content.split('\n')

// Categories of any usage
const categories = {
  unavoidable: {
    patterns: [
      /\/\* .* \*\/.*any/,  // /* F<A> */ any - HKT placeholders
      /any \/\* .* \*\//,   // any /* F<A> */ - HKT placeholders
      /satisfies.*as any/,  // satisfies SomeInterface as any
      /return.*as any/,     // return expr as any (often for complex type inference)
      /CoreFunctor<any, any>/, // Type constraint definitions - necessary for variance
      /CoreFunctor<.*any.*>/,  // Generic type constraints with any - necessary for variance
    ],
    description: 'HKT placeholders, complex type inference workarounds, and necessary type constraints'
  },
  
  typeAssertions: {
    patterns: [
      /\) as any$/,         // (expr) as any
      /\] as any$/,         // [expr] as any  
      /\} as any$/,         // {expr} as any
      /as any\)/,           // expr as any)
      /as any\]/,           // expr as any]
      /as any\}/,           // expr as any}
    ],
    description: 'Type assertions - could potentially be narrowed'
  },
  
  parameters: {
    patterns: [
      /\(.*: any\)/,        // (param: any)
      /\<.*: any\>/,        // <T: any>
      /, any\)/,            // , any)
      /, any\]/,            // , any]
      /, any>/,             // , any>
    ],
    description: 'Function parameters and generics - high improvement potential'
  },
  
  properties: {
    patterns: [
      /: any[^\/]/,         // : any (not followed by comment)
      /readonly .*: any/,   // readonly prop: any
      /\[.*\]: any/,        // [key]: any
    ],
    description: 'Object properties and type definitions'
  },
  
  casts: {
    patterns: [
      /as any as/,          // as any as T - double casting
      /any\[\]/,            // any[]
      /Array<any>/,         // Array<any>
      /Record<.*any.*>/,    // Record with any
    ],
    description: 'Complex casts and collection types'
  }
}

const results = {
  total: 0,
  byCategory: {},
  byLine: []
}

// Initialize category counts
Object.keys(categories).forEach(cat => {
  results.byCategory[cat] = { count: 0, lines: [] }
})
results.byCategory.unclassified = { count: 0, lines: [] }

// Scan each line
lines.forEach((line, idx) => {
  const lineNum = idx + 1
  const anyMatches = line.match(/\bany\b/g)
  
  if (anyMatches) {
    results.total += anyMatches.length
    
    let categorized = false
    
    // Try to categorize each any
    for (const [catName, category] of Object.entries(categories)) {
      for (const pattern of category.patterns) {
        if (pattern.test(line)) {
          results.byCategory[catName].count += anyMatches.length
          results.byCategory[catName].lines.push({ lineNum, line: line.trim() })
          categorized = true
          break
        }
      }
      if (categorized) break
    }
    
    if (!categorized) {
      results.byCategory.unclassified.count += anyMatches.length
      results.byCategory.unclassified.lines.push({ lineNum, line: line.trim() })
    }
    
    results.byLine.push({ lineNum, line: line.trim(), count: anyMatches.length })
  }
})

// Report results
console.log(`\n📊 Total "any" usage: ${results.total} occurrences\n`)

console.log('📋 By Category:')
Object.entries(results.byCategory).forEach(([name, data]) => {
  if (data.count > 0) {
    console.log(`\n${name.toUpperCase()}: ${data.count} occurrences`)
    console.log(`  ${categories[name]?.description || 'Miscellaneous usage'}`)
    
    if (data.lines.length <= 5) {
      data.lines.forEach(({ lineNum, line }) => {
        console.log(`    ${lineNum}: ${line}`)
      })
    } else {
      console.log(`    ${data.lines[0].lineNum}: ${data.lines[0].line}`)
      console.log(`    ... (${data.lines.length - 2} more lines)`)
      console.log(`    ${data.lines[data.lines.length - 1].lineNum}: ${data.lines[data.lines.length - 1].line}`)
    }
  }
})

// Improvement suggestions
console.log('\n💡 Improvement Suggestions:')

const improvable = results.byCategory.parameters.count + 
                  results.byCategory.properties.count + 
                  results.byCategory.unclassified.count

const unavoidable = results.byCategory.unavoidable.count
const assertions = results.byCategory.typeAssertions.count

console.log(`  🎯 High Priority: ${improvable} "any"s in parameters/properties/unclassified`)
console.log(`  🔧 Medium Priority: ${assertions} type assertions (could be narrowed)`)
console.log(`  ✅ Low Priority: ${unavoidable} HKT placeholders (likely unavoidable)`)

const improvementPct = Math.round((improvable / results.total) * 100)
console.log(`\n📈 Potential improvement: ~${improvementPct}% of "any"s could be narrowed`)

if (improvable > 0) {
  console.log('\n🚀 Next Steps:')
  console.log('  1. Focus on parameters with "any" - often can be generic <T>')
  console.log('  2. Replace property ": any" with specific union types')
  console.log('  3. Use type assertions like "as SomeSpecificType" instead of "as any"')
  console.log('  4. Consider branded types for domain-specific any usage')
}