#!/usr/bin/env node

import { ESLint } from 'eslint';

const eslint = new ESLint();
const results = await eslint.lintFiles(['.']);

// Count errors and warnings by rule
const ruleCounts = {};
let totalErrors = 0;
let totalWarnings = 0;

for (const result of results) {
  for (const message of result.messages) {
    const ruleId = message.ruleId || 'unknown';
    const severity = message.severity === 2 ? 'error' : 'warning';
    
    if (!ruleCounts[ruleId]) {
      ruleCounts[ruleId] = { errors: 0, warnings: 0 };
    }
    
    if (severity === 'error') {
      ruleCounts[ruleId].errors++;
      totalErrors++;
    } else {
      ruleCounts[ruleId].warnings++;
      totalWarnings++;
    }
  }
}

// Sort by total count (errors + warnings)
const sortedRules = Object.entries(ruleCounts)
  .sort(([, a], [, b]) => (b.errors + b.warnings) - (a.errors + a.warnings));

console.log('\n📊 ESLint Summary by Rule\n');
console.log('─'.repeat(70));

for (const [rule, counts] of sortedRules) {
  const total = counts.errors + counts.warnings;
  const errorStr = counts.errors > 0 ? `${counts.errors} error${counts.errors !== 1 ? 's' : ''}` : '';
  const warnStr = counts.warnings > 0 ? `${counts.warnings} warning${counts.warnings !== 1 ? 's' : ''}` : '';
  const parts = [errorStr, warnStr].filter(Boolean).join(', ');
  
  console.log(`${rule.padEnd(50)} ${String(total).padStart(4)} (${parts})`);
}

console.log('─'.repeat(70));
console.log(`Total: ${totalErrors + totalWarnings} (${totalErrors} errors, ${totalWarnings} warnings)`);
console.log();
