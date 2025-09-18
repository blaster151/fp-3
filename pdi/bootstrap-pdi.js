#!/usr/bin/env node

/**
 * PDI Bootstrap - Set up Pattern Discovery & Integration in a new project
 * 
 * Usage:
 *   node pdi/bootstrap-pdi.js init
 *   node pdi/bootstrap-pdi.js check
 *   node pdi/bootstrap-pdi.js help
 */

const fs = require('fs');
const path = require('path');

const PDI_FILES = [
  'AI_DEV_GUIDELINES.md',
  'HUMAN_DEV_GUIDELINES.md',
  'KNOWLEDGE_BASE.md',
  'UPGRADE_BACKLOG.md',
  'REMINDERS.md',
  'DEVELOPMENT_STRUCTURE.md',
  'RECOVERY_STRATEGY.md',
  'evergreen-docs.md',
  'upgrade-analyzer.js',
  'maintenance-reminder.js'
];

function initPDI() {
  console.log('🚀 Initializing PDI system...\n');
  
  // Check if we're in a project root
  if (!fs.existsSync('package.json')) {
    console.log('❌ No package.json found. Please run this from your project root.');
    process.exit(1);
  }
  
  // Create pdi directory if it doesn't exist
  if (!fs.existsSync('pdi')) {
    fs.mkdirSync('pdi');
    console.log('✅ Created pdi/ directory');
  }
  
  // Copy PDI files
  let copied = 0;
  for (const file of PDI_FILES) {
    const sourcePath = path.join(__dirname, file);
    const destPath = path.join('pdi', file);
    
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`✅ Copied ${file}`);
      copied++;
    } else {
      console.log(`⚠️  ${file} not found in source`);
    }
  }
  
  // Update package.json scripts
  updatePackageJson();
  
  // Create .gitignore entry
  updateGitignore();
  
  // Create initial knowledge base
  createInitialKnowledgeBase();
  
  console.log(`\n🎉 PDI system initialized! Copied ${copied} files.`);
  console.log('\nNext steps:');
  console.log('1. Review pdi/HUMAN_DEV_GUIDELINES.md');
  console.log('2. Customize pdi/KNOWLEDGE_BASE.md for your project');
  console.log('3. Run npm run maintenance:check');
}

function updatePackageJson() {
  const packagePath = 'package.json';
  if (!fs.existsSync(packagePath)) return;
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }
    
    // Add PDI scripts
    packageJson.scripts['upgrade:analyze'] = 'node pdi/upgrade-analyzer.js analyze';
    packageJson.scripts['upgrade:backlog'] = 'node pdi/upgrade-analyzer.js backlog';
    packageJson.scripts['upgrade:stats'] = 'node pdi/upgrade-analyzer.js stats';
    packageJson.scripts['maintenance:check'] = 'node pdi/maintenance-reminder.js check';
    packageJson.scripts['maintenance:remind'] = 'node pdi/maintenance-reminder.js remind';
    
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    console.log('✅ Updated package.json scripts');
  } catch (error) {
    console.log('⚠️  Could not update package.json:', error.message);
  }
}

function updateGitignore() {
  const gitignorePath = '.gitignore';
  const pdiIgnore = '\n# PDI system\n.ai-context/\n';
  
  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, 'utf8');
    if (!content.includes('.ai-context/')) {
      fs.appendFileSync(gitignorePath, pdiIgnore);
      console.log('✅ Updated .gitignore');
    }
  } else {
    fs.writeFileSync(gitignorePath, pdiIgnore);
    console.log('✅ Created .gitignore');
  }
}

function createInitialKnowledgeBase() {
  const kbPath = 'pdi/KNOWLEDGE_BASE.md';
  if (!fs.existsSync(kbPath)) return;
  
  try {
    let content = fs.readFileSync(kbPath, 'utf8');
    
    // Add project-specific section
    const projectSection = `
## Project-Specific Patterns

*Add your project's specific patterns here*

### Common Patterns
- **Pattern Name**: Description of when to use
- **Another Pattern**: Another description

### Project Utilities
- **Utility Name**: Description of what it does
- **Another Utility**: Another description

### Integration Points
- **Integration Point**: Description of how to integrate
- **Another Integration**: Another description
`;

    // Insert before the last section
    const lastSectionIndex = content.lastIndexOf('## ');
    if (lastSectionIndex > 0) {
      content = content.slice(0, lastSectionIndex) + projectSection + '\n' + content.slice(lastSectionIndex);
      fs.writeFileSync(kbPath, content);
      console.log('✅ Added project-specific section to knowledge base');
    }
  } catch (error) {
    console.log('⚠️  Could not update knowledge base:', error.message);
  }
}

function checkPDI() {
  console.log('🔍 Checking PDI system status...\n');
  
  let status = {
    pdiDir: fs.existsSync('pdi'),
    files: 0,
    scripts: 0,
    gitignore: false
  };
  
  // Check PDI directory
  if (status.pdiDir) {
    console.log('✅ pdi/ directory exists');
    
    // Check PDI files
    for (const file of PDI_FILES) {
      if (fs.existsSync(path.join('pdi', file))) {
        status.files++;
      }
    }
    console.log(`✅ ${status.files}/${PDI_FILES.length} PDI files present`);
  } else {
    console.log('❌ pdi/ directory missing');
  }
  
  // Check package.json scripts
  if (fs.existsSync('package.json')) {
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const scripts = packageJson.scripts || {};
      
      if (scripts['upgrade:analyze']) status.scripts++;
      if (scripts['upgrade:backlog']) status.scripts++;
      if (scripts['upgrade:stats']) status.scripts++;
      if (scripts['maintenance:check']) status.scripts++;
      if (scripts['maintenance:remind']) status.scripts++;
      
      console.log(`✅ ${status.scripts}/5 PDI scripts in package.json`);
    } catch (error) {
      console.log('❌ Could not read package.json');
    }
  }
  
  // Check .gitignore
  if (fs.existsSync('.gitignore')) {
    const content = fs.readFileSync('.gitignore', 'utf8');
    if (content.includes('.ai-context/')) {
      status.gitignore = true;
      console.log('✅ .gitignore includes PDI entries');
    }
  }
  
  // Overall status
  console.log('\n📊 PDI System Status:');
  console.log(`   PDI Directory: ${status.pdiDir ? '✅' : '❌'}`);
  console.log(`   PDI Files: ${status.files}/${PDI_FILES.length}`);
  console.log(`   Package Scripts: ${status.scripts}/5`);
  console.log(`   Gitignore: ${status.gitignore ? '✅' : '❌'}`);
  
  if (status.pdiDir && status.files >= PDI_FILES.length * 0.8 && status.scripts >= 4) {
    console.log('\n🎉 PDI system is properly set up!');
  } else {
    console.log('\n⚠️  PDI system needs attention. Run "node pdi/bootstrap-pdi.js init" to fix.');
  }
}

function showHelp() {
  console.log(`
🔧 PDI Bootstrap

Usage:
  node pdi/bootstrap-pdi.js init   - Initialize PDI system in current project
  node pdi/bootstrap-pdi.js check  - Check PDI system status
  node pdi/bootstrap-pdi.js help   - Show this help

Examples:
  node pdi/bootstrap-pdi.js init
  node pdi/bootstrap-pdi.js check
`);
}

// Main execution
const command = process.argv[2];

switch (command) {
  case 'init':
    initPDI();
    break;
  case 'check':
    checkPDI();
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
