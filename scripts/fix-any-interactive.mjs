#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const TARGET_FILE = 'allTS.ts'

console.log('🎯 Interactive "any" Fixer - Focus on High-Impact Improvements\n')

const content = fs.readFileSync(TARGET_FILE, 'utf8')
const lines = content.split('\n')

// High-impact patterns to fix first
const fixablePatterns = [
  {
    name: 'Function Parameters',
    pattern: /\(([^)]*): any\)/g,
    suggestion: 'Replace with generic <T> or specific type',
    priority: 'HIGH',
    examples: ['(f: any) => ...', '(value: any) => ...']
  },
  {
    name: 'Array/Object Properties', 
    pattern: /:\s*any(?![\/\*])/g, // : any (not followed by comment)
    suggestion: 'Use specific type or union',
    priority: 'HIGH',
    examples: ['prop: any', 'result: any']
  },
  {
    name: 'Generic Constraints',
    pattern: /<[^>]*:\s*any>/g,
    suggestion: 'Add proper constraint like <T extends SomeType>',
    priority: 'MEDIUM',
    examples: ['<T: any>', '<F: any>']
  },
  {
    name: 'Return Type Annotations',
    pattern: /\):\s*any/g,
    suggestion: 'Add explicit return type',
    priority: 'MEDIUM', 
    examples: ['function(): any', '=> (): any']
  },
  {
    name: 'Simple Type Assertions',
    pattern: /\s+as any(?![\/\*])/g,
    suggestion: 'Use specific type assertion',
    priority: 'LOW',
    examples: ['expr as any', 'value as any']
  }
]

// Scan and categorize
const findings = []

lines.forEach((line, idx) => {
  const lineNum = idx + 1
  
  fixablePatterns.forEach(pattern => {
    const matches = [...line.matchAll(pattern.pattern)]
    matches.forEach(match => {
      // Skip if it's in a comment or HKT placeholder
      if (line.includes('/*') || line.includes('Kind1') || line.includes('HKT')) {
        return
      }
      
      findings.push({
        lineNum,
        line: line.trim(),
        pattern: pattern.name,
        match: match[0],
        suggestion: pattern.suggestion,
        priority: pattern.priority
      })
    })
  })
})

// Group by priority
const byPriority = {
  HIGH: findings.filter(f => f.priority === 'HIGH'),
  MEDIUM: findings.filter(f => f.priority === 'MEDIUM'),
  LOW: findings.filter(f => f.priority === 'LOW')
}

console.log(`📊 Found ${findings.length} potentially fixable "any" usages:\n`)

Object.entries(byPriority).forEach(([priority, items]) => {
  if (items.length > 0) {
    console.log(`${priority} PRIORITY: ${items.length} items`)
    
    // Group by pattern
    const byPattern = {}
    items.forEach(item => {
      if (!byPattern[item.pattern]) byPattern[item.pattern] = []
      byPattern[item.pattern].push(item)
    })
    
    Object.entries(byPattern).forEach(([patternName, patternItems]) => {
      console.log(`\n  📌 ${patternName}: ${patternItems.length} occurrences`)
      console.log(`     💡 ${patternItems[0].suggestion}`)
      
      // Show first few examples
      const examples = patternItems.slice(0, 3)
      examples.forEach(({ lineNum, line, match }) => {
        const highlighted = line.replace(match, `🔴${match}🔴`)
        console.log(`     ${lineNum}: ${highlighted}`)
      })
      
      if (patternItems.length > 3) {
        console.log(`     ... and ${patternItems.length - 3} more`)
      }
    })
    console.log('')
  }
})

// Specific improvement strategies
console.log('🛠️  Specific Improvement Strategies:\n')

console.log('1️⃣  **Function Parameters** (Highest Impact)')
console.log('   Replace: (f: any) => ...')
console.log('   With:    <T>(f: (x: T) => U) => ...')
console.log('   Example: (f: any) => (x: A) => f(x)')
console.log('   Becomes: <T>(f: (x: A) => T) => (x: A) => f(x)\n')

console.log('2️⃣  **Property Types**')
console.log('   Replace: { result: any }')
console.log('   With:    { result: T } or { result: A | B | C }')
console.log('   Strategy: Look at usage sites to infer actual types\n')

console.log('3️⃣  **Type Assertions**')
console.log('   Replace: expr as any')
console.log('   With:    expr as SpecificType')
console.log('   Strategy: Use TypeScript\'s "Go to Definition" to find the expected type\n')

console.log('4️⃣  **Generic Constraints**')
console.log('   Replace: <T: any>')
console.log('   With:    <T extends SomeInterface>')
console.log('   Strategy: Define minimal interfaces for your domain\n')

// Generate a focused fix list
const highPriorityFixes = byPriority.HIGH.slice(0, 10)
if (highPriorityFixes.length > 0) {
  console.log('🎯 **Top 10 High-Priority Fixes:**\n')
  highPriorityFixes.forEach(({ lineNum, line, suggestion }, i) => {
    console.log(`${i + 1}. Line ${lineNum}: ${suggestion}`)
    console.log(`   ${line}\n`)
  })
}

console.log('💻 **Tools to Help:**')
console.log('   • Run: npx eslint allTS.ts -c .eslintrc.any-detection.js')
console.log('   • Use: TypeScript strict mode in your editor')
console.log('   • Try: "Go to Definition" on any usage to see expected types')
console.log('   • Consider: Branded types for domain-specific any usage')