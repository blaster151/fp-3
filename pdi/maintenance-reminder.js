#!/usr/bin/env node

/**
 * Maintenance Reminder - Helps humans remember regular maintenance tasks
 * 
 * Usage:
 *   node scripts/maintenance-reminder.js check
 *   node scripts/maintenance-reminder.js remind
 */

const fs = require('fs');
const path = require('path');

const BACKLOG_FILE = 'UPGRADE_BACKLOG.md';
const REMINDERS_FILE = 'REMINDERS.md';

function checkBacklogStatus() {
  if (!fs.existsSync(BACKLOG_FILE)) {
    console.log('❌ UPGRADE_BACKLOG.md not found');
    return;
  }
  
  const content = fs.readFileSync(BACKLOG_FILE, 'utf8');
  
  const needsAnalysis = (content.match(/🔍/g) || []).length;
  const readyForReview = (content.match(/⏳/g) || []).length;
  const inProgress = (content.match(/🚧/g) || []).length;
  
  console.log('📋 Maintenance Status Check:\n');
  
  if (needsAnalysis > 0) {
    console.log(`🔍 ${needsAnalysis} items need analysis`);
  }
  
  if (readyForReview > 0) {
    console.log(`⏳ ${readyForReview} items ready for review`);
  }
  
  if (inProgress > 0) {
    console.log(`🚧 ${inProgress} items in progress`);
  }
  
  if (needsAnalysis === 0 && readyForReview === 0 && inProgress === 0) {
    console.log('✅ All backlog items are up to date!');
  } else {
    console.log('\n💡 Consider running: npm run upgrade:backlog');
  }
}

function showReminders() {
  if (!fs.existsSync(REMINDERS_FILE)) {
    console.log('❌ REMINDERS.md not found');
    return;
  }
  
  const content = fs.readFileSync(REMINDERS_FILE, 'utf8');
  const lines = content.split('\n');
  
  console.log('📝 Development Reminders:\n');
  
  let inSection = false;
  let currentSection = '';
  
  for (const line of lines) {
    if (line.startsWith('## ')) {
      currentSection = line.replace('## ', '');
      inSection = true;
      console.log(`\n${currentSection}`);
      console.log('─'.repeat(currentSection.length));
    } else if (line.startsWith('- [ ]')) {
      const task = line.replace('- [ ]', '').trim();
      console.log(`  ☐ ${task}`);
    } else if (line.startsWith('- [x]')) {
      const task = line.replace('- [x]', '').trim();
      console.log(`  ☑ ${task}`);
    }
  }
  
  console.log('\n💡 Update REMINDERS.md to check off completed tasks');
}

function showHelp() {
  console.log(`
🔔 Maintenance Reminder

Usage:
  node scripts/maintenance-reminder.js check   - Check backlog status
  node scripts/maintenance-reminder.js remind  - Show development reminders
  node scripts/maintenance-reminder.js help    - Show this help

Examples:
  node scripts/maintenance-reminder.js check
  node scripts/maintenance-reminder.js remind
`);
}

// Main execution
const command = process.argv[2];

switch (command) {
  case 'check':
    checkBacklogStatus();
    break;
  case 'remind':
    showReminders();
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
