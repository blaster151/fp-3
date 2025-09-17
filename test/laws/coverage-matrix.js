#!/usr/bin/env node

/**
 * Law Coverage Matrix
 * 
 * Prints a coverage matrix showing which laws are implemented, witnessed, or todo.
 * Run this in CI to track progress on law implementation and testing.
 */

const fs = require('fs')
const path = require('path')

// Read the law registry
const registryPath = path.join(__dirname, 'registry.json')
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'))

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

// Status formatting
const formatStatus = (status) => {
  if (status === 'implemented|witnessed') {
    return `${colors.green}✓✓${colors.reset}`
  } else if (status === 'implemented') {
    return `${colors.yellow}✓${colors.reset}`
  } else if (status === 'witnessed') {
    return `${colors.blue}⚡${colors.reset}`
  } else if (status === 'todo') {
    return `${colors.red}✗${colors.reset}`
  } else {
    return status
  }
}

// Calculate coverage statistics
const calculateCoverage = (category) => {
  const laws = Object.entries(category).filter(([key, _]) => !key.startsWith('_'))
  const total = laws.length
  const implemented = laws.filter(([_, status]) => 
    status.includes('implemented') || status.includes('witnessed')
  ).length
  const witnessed = laws.filter(([_, status]) => 
    status.includes('witnessed')
  ).length
  
  return { total, implemented, witnessed }
}

// Print the coverage matrix
console.log(`${colors.bright}${colors.cyan}Law Coverage Matrix${colors.reset}\n`)

let totalLaws = 0
let totalImplemented = 0
let totalWitnessed = 0

for (const [categoryName, category] of Object.entries(registry)) {
  if (categoryName.startsWith('_')) continue
  
  const { total, implemented, witnessed } = calculateCoverage(category)
  totalLaws += total
  totalImplemented += implemented
  totalWitnessed += witnessed
  
  const coverage = total > 0 ? Math.round((implemented / total) * 100) : 0
  const witnessCoverage = total > 0 ? Math.round((witnessed / total) * 100) : 0
  
  console.log(`${colors.bright}${categoryName}${colors.reset} (${implemented}/${total} implemented, ${witnessed}/${total} witnessed)`)
  console.log(`  Implementation: ${coverage}% | Witness: ${witnessCoverage}%`)
  
  for (const [lawName, status] of Object.entries(category)) {
    if (lawName.startsWith('_')) continue
    
    const formattedStatus = formatStatus(status)
    console.log(`    ${lawName}: ${formattedStatus}`)
  }
  
  console.log()
}

// Print overall statistics
const overallCoverage = Math.round((totalImplemented / totalLaws) * 100)
const overallWitnessCoverage = Math.round((totalWitnessed / totalLaws) * 100)

console.log(`${colors.bright}Overall Coverage${colors.reset}`)
console.log(`  Total Laws: ${totalLaws}`)
console.log(`  Implemented: ${totalImplemented} (${overallCoverage}%)`)
console.log(`  Witnessed: ${totalWitnessed} (${overallWitnessCoverage}%)`)
console.log()

// Print legend
console.log(`${colors.bright}Legend${colors.reset}`)
console.log(`  ${colors.green}✓✓${colors.reset} Implemented & Witnessed`)
console.log(`  ${colors.yellow}✓${colors.reset} Implemented only`)
console.log(`  ${colors.blue}⚡${colors.reset} Witnessed only`)
console.log(`  ${colors.red}✗${colors.reset} Todo`)

// Exit with appropriate code
if (overallCoverage < 50) {
  console.log(`\n${colors.red}Warning: Less than 50% of laws are implemented${colors.reset}`)
  process.exit(1)
} else if (overallWitnessCoverage < 25) {
  console.log(`\n${colors.yellow}Warning: Less than 25% of laws are witnessed${colors.reset}`)
  process.exit(1)
} else {
  console.log(`\n${colors.green}Coverage looks good!${colors.reset}`)
  process.exit(0)
}
