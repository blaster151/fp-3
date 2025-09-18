#!/usr/bin/env node

/**
 * Documentation Checker - Keep README-style docs in sync with code
 * 
 * Usage:
 *   node pdi/docs-checker.js check
 *   node pdi/docs-checker.js update
 *   node pdi/docs-checker.js stale
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function findDocumentationFiles() {
  try {
    const result = execSync('find . -name "*.md" -not -path "./node_modules/*" -not -path "./.git/*"', { encoding: 'utf8' });
    return result.split('\n').filter(file => file.trim() && fs.existsSync(file));
  } catch (error) {
    console.log('❌ Error finding documentation files:', error.message);
    return [];
  }
}

function findCodeReferences(docFile) {
  const content = fs.readFileSync(docFile, 'utf8');
  const references = [];
  
  // Find import statements
  const importMatches = content.match(/import\s+.*\s+from\s+['"]([^'"]+)['"]/g);
  if (importMatches) {
    references.push(...importMatches.map(match => ({ type: 'import', match })));
  }
  
  // Find function calls
  const functionMatches = content.match(/\b\w+\(/g);
  if (functionMatches) {
    references.push(...functionMatches.map(match => ({ type: 'function', match })));
  }
  
  // Find class references
  const classMatches = content.match(/new\s+\w+/g);
  if (classMatches) {
    references.push(...classMatches.map(match => ({ type: 'class', match })));
  }
  
  // Find code blocks
  const codeBlocks = content.match(/```[\s\S]*?```/g);
  if (codeBlocks) {
    references.push(...codeBlocks.map(block => ({ type: 'code_block', match: block.substring(0, 100) + '...' })));
  }
  
  return references;
}

function checkStaleReferences(docFile) {
  const references = findCodeReferences(docFile);
  const staleRefs = [];
  
  for (const ref of references) {
    if (ref.type === 'import') {
      // Check if import path exists
      const importPath = ref.match.match(/from\s+['"]([^'"]+)['"]/);
      if (importPath) {
        const path = importPath[1];
        if (!fs.existsSync(path) && !path.startsWith('http')) {
          staleRefs.push({
            type: 'import',
            reference: ref.match,
            issue: `Import path '${path}' not found`
          });
        }
      }
    }
    
    if (ref.type === 'function') {
      // Check if function exists in codebase
      const funcName = ref.match.replace('(', '');
      try {
        const result = execSync(`grep -r "function ${funcName}\\|const ${funcName}\\|export.*${funcName}" . --include="*.ts" --include="*.js"`, { encoding: 'utf8' });
        if (!result.trim()) {
          staleRefs.push({
            type: 'function',
            reference: ref.match,
            issue: `Function '${funcName}' not found in codebase`
          });
        }
      } catch (error) {
        // Function not found
        staleRefs.push({
          type: 'function',
          reference: ref.match,
          issue: `Function '${funcName}' not found in codebase`
        });
      }
    }
  }
  
  return staleRefs;
}

function checkDocumentation() {
  console.log('🔍 Checking documentation staleness...\n');
  
  const docFiles = findDocumentationFiles();
  let totalIssues = 0;
  
  for (const docFile of docFiles) {
    const staleRefs = checkStaleReferences(docFile);
    
    if (staleRefs.length > 0) {
      console.log(`📄 ${docFile}:`);
      for (const ref of staleRefs) {
        console.log(`   ❌ ${ref.type}: ${ref.reference}`);
        console.log(`      Issue: ${ref.issue}`);
        totalIssues++;
      }
      console.log('');
    }
  }
  
  if (totalIssues === 0) {
    console.log('✅ No stale references found in documentation');
  } else {
    console.log(`⚠️  Found ${totalIssues} potential issues in documentation`);
  }
  
  return totalIssues;
}

function findStaleFiles() {
  console.log('🔍 Finding potentially stale documentation...\n');
  
  const docFiles = findDocumentationFiles();
  const staleFiles = [];
  
  for (const docFile of docFiles) {
    const stats = fs.statSync(docFile);
    const daysSinceModified = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceModified > 30) {
      staleFiles.push({
        file: docFile,
        daysSinceModified: Math.round(daysSinceModified),
        lastModified: stats.mtime.toISOString().split('T')[0]
      });
    }
  }
  
  if (staleFiles.length === 0) {
    console.log('✅ No stale documentation files found');
  } else {
    console.log('📄 Potentially stale documentation:');
    for (const file of staleFiles) {
      console.log(`   📅 ${file.file} (${file.daysSinceModified} days old, last modified: ${file.lastModified})`);
    }
  }
  
  return staleFiles;
}

function updateDocumentation() {
  console.log('🔄 Updating documentation...\n');
  
  // This would be where we'd implement automatic updates
  // For now, just provide suggestions
  
  const docFiles = findDocumentationFiles();
  
  for (const docFile of docFiles) {
    const staleRefs = checkStaleReferences(docFile);
    
    if (staleRefs.length > 0) {
      console.log(`📄 ${docFile} needs attention:`);
      for (const ref of staleRefs) {
        console.log(`   • ${ref.issue}`);
      }
      console.log('');
    }
  }
  
  console.log('💡 Consider running: npm run docs:check for detailed analysis');
}

function showHelp() {
  console.log(`
📚 Documentation Checker

Usage:
  node pdi/docs-checker.js check   - Check for stale references
  node pdi/docs-checker.js stale   - Find old documentation files
  node pdi/docs-checker.js update  - Update documentation (suggestions)
  node pdi/docs-checker.js help    - Show this help

Examples:
  node pdi/docs-checker.js check
  node pdi/docs-checker.js stale
  node pdi/docs-checker.js update
`);
}

// Main execution
const command = process.argv[2];

switch (command) {
  case 'check':
    checkDocumentation();
    break;
  case 'stale':
    findStaleFiles();
    break;
  case 'update':
    updateDocumentation();
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
