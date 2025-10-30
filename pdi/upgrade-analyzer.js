#!/usr/bin/env node

/**
 * Upgrade Analyzer - Helps identify and track upgrade opportunities
 * 
 * Usage:
 *   node scripts/upgrade-analyzer.js analyze [pattern]
 *   node scripts/upgrade-analyzer.js backlog
 *   node scripts/upgrade-analyzer.js stats
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BACKLOG_FILE = 'pdi/UPGRADE_BACKLOG.md';
const KNOWLEDGE_BASE = 'pdi/KNOWLEDGE_BASE.md';

function analyzePattern(pattern) {
  try {
    console.log(`🔍 Analyzing pattern: ${pattern}`);
    const result = execSync(`grep -r "${pattern}" allTS.ts run-runnable-examples.ts examples/runnable`, { encoding: 'utf8' });
    const lines = result.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      console.log('❌ No matches found');
      return;
    }
    
    console.log(`✅ Found ${lines.length} potential opportunities:`);
    lines.forEach((line, i) => {
      const [file, content] = line.split(':');
      console.log(`  ${i + 1}. ${file}:${content.trim()}`);
    });
    
    console.log('\n💡 Consider adding to UPGRADE_BACKLOG.md if these could benefit from existing patterns');
    
  } catch (error) {
    console.log('❌ Error analyzing pattern:', error.message);
  }
}

function showBacklog() {
  if (!fs.existsSync(BACKLOG_FILE)) {
    console.log('❌ UPGRADE_BACKLOG.md not found');
    return;
  }
  
  const content = fs.readFileSync(BACKLOG_FILE, 'utf8');
  const lines = content.split('\n');
  
  console.log('📋 Current Upgrade Backlog:\n');
  
  let inSection = false;
  let currentSection = '';
  
  for (const line of lines) {
    if (line.startsWith('### ')) {
      currentSection = line.replace('### ', '');
      inSection = true;
      console.log(`\n${currentSection}`);
      console.log('─'.repeat(currentSection.length));
    } else if (line.startsWith('#### ')) {
      const item = line.replace('#### ', '');
      console.log(`  • ${item}`);
    } else if (line.startsWith('**Status**:')) {
      const status = line.replace('**Status**:', '').trim();
      const emoji = status.includes('🔍') ? '🔍' : 
                   status.includes('⏳') ? '⏳' : 
                   status.includes('🚧') ? '🚧' : 
                   status.includes('✅') ? '✅' : 
                   status.includes('❌') ? '❌' : '❓';
      console.log(`    ${emoji} ${status}`);
    }
  }
}

function generateFileReference(analysisType) {
  const timestamp = new Date().toISOString().split('T')[0];
  const fileName = `PDI_ANALYSIS_${analysisType.toUpperCase()}.md`;
  return `- **📄 Detailed Analysis**: [\`${fileName}\`](./${fileName})`;
}

function showStats() {
  if (!fs.existsSync(BACKLOG_FILE)) {
    console.log('❌ UPGRADE_BACKLOG.md not found');
    return;
  }
  
  const content = fs.readFileSync(BACKLOG_FILE, 'utf8');
  
  const needsAnalysis = (content.match(/🔍/g) || []).length;
  const readyForReview = (content.match(/⏳/g) || []).length;
  const inProgress = (content.match(/🚧/g) || []).length;
  const completed = (content.match(/✅/g) || []).length;
  const rejected = (content.match(/❌/g) || []).length;
  
  const total = needsAnalysis + readyForReview + inProgress + completed + rejected;
  
  console.log('📊 Upgrade Backlog Statistics:\n');
  console.log(`🔍 Needs Analysis: ${needsAnalysis}`);
  console.log(`⏳ Ready for Review: ${readyForReview}`);
  console.log(`🚧 In Progress: ${inProgress}`);
  console.log(`✅ Completed: ${completed}`);
  console.log(`❌ Rejected: ${rejected}`);
  console.log(`📈 Total: ${total}`);
  
  if (total > 0) {
    const completionRate = ((completed / total) * 100).toFixed(1);
    console.log(`\n🎯 Completion Rate: ${completionRate}%`);
  }
}

function generateReference(analysisType) {
  console.log(`📄 File reference for ${analysisType}:`);
  console.log(generateFileReference(analysisType));
  console.log('\n💡 Copy this line to your UPGRADE_BACKLOG.md under the appropriate item');
}

function showHelp() {
  console.log(`
🔧 Upgrade Analyzer

Usage:
  node scripts/upgrade-analyzer.js analyze [pattern]  - Find potential upgrade opportunities
  node scripts/upgrade-analyzer.js backlog           - Show current backlog
  node scripts/upgrade-analyzer.js stats             - Show backlog statistics
  node scripts/upgrade-analyzer.js reference [type]  - Generate file reference for analysis
  node scripts/upgrade-analyzer.js help              - Show this help

Examples:
  node scripts/upgrade-analyzer.js analyze "new Map<"
  node scripts/upgrade-analyzer.js analyze "cache.*Map"
  node scripts/upgrade-analyzer.js backlog
  node scripts/upgrade-analyzer.js stats
`);
}

// Main execution
const command = process.argv[2];
const pattern = process.argv[3];

switch (command) {
  case 'analyze':
    if (!pattern) {
      console.log('❌ Please provide a pattern to analyze');
      console.log('Example: node scripts/upgrade-analyzer.js analyze "new Map<"');
      process.exit(1);
    }
    analyzePattern(pattern);
    break;
  case 'backlog':
    showBacklog();
    break;
  case 'stats':
    showStats();
    break;
  case 'reference':
    if (process.argv[3]) {
      generateReference(process.argv[3]);
    } else {
      console.log('❌ Please specify analysis type: npm run upgrade:reference [analysisType]');
    }
    break;
  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;
  default:
    console.log('❌ Unknown command. Use "help" for usage information.');
    process.exit(1);
}
