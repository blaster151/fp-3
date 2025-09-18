#!/usr/bin/env node

/**
 * Task Scheduler - Recurring task system for LLM conversations
 * 
 * Usage:
 *   node pdi/task-scheduler.js check
 *   node pdi/task-scheduler.js run [task-name]
 *   node pdi/task-scheduler.js add [task-name] [type] [config]
 *   node pdi/task-scheduler.js list
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TASK_FILE = '.ai-context/tasks.json';

// Task types and their configurations
const TASK_TYPES = {
  counter: {
    description: 'Run after N prompts',
    config: { threshold: 5, current: 0 }
  },
  daily: {
    description: 'Run once per day',
    config: { lastRun: null }
  },
  weekly: {
    description: 'Run once per week', 
    config: { lastRun: null }
  },
  on_change: {
    description: 'Run when code changes',
    config: { lastRun: null, lastHash: null }
  },
  on_commit: {
    description: 'Run on each commit',
    config: { lastCommit: null }
  }
};

// Predefined task actions
const TASK_ACTIONS = {
  read_guidelines: {
    command: 'echo "📚 Refreshing AI guidelines..."',
    description: 'Re-read AI_DEV_GUIDELINES.md'
  },
  run_vitest: {
    command: 'npm run test:laws',
    description: 'Run full test suite'
  },
  check_coverage: {
    command: 'npm run coverage',
    description: 'Check law coverage'
  },
  analyze_upgrades: {
    command: 'npm run upgrade:analyze "new Map<"',
    description: 'Analyze upgrade opportunities'
  },
  update_backlog: {
    command: 'npm run upgrade:backlog',
    description: 'Review upgrade backlog'
  },
  check_maintenance: {
    command: 'npm run maintenance:check',
    description: 'Check maintenance status'
  }
};

function loadTasks() {
  if (!fs.existsSync(TASK_FILE)) {
    return { tasks: {} };
  }
  
  try {
    return JSON.parse(fs.readFileSync(TASK_FILE, 'utf8'));
  } catch (error) {
    console.log('⚠️  Could not load tasks, creating new file');
    return { tasks: {} };
  }
}

function saveTasks(tasks) {
  const dir = path.dirname(TASK_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(TASK_FILE, JSON.stringify(tasks, null, 2));
}

function checkTasks() {
  const data = loadTasks();
  const tasks = data.tasks || {};
  
  console.log('🔍 Checking recurring tasks...\n');
  
  let runnableTasks = [];
  
  for (const [name, task] of Object.entries(tasks)) {
    const shouldRun = shouldTaskRun(task);
    const status = shouldRun ? '🚀 READY' : '⏳ WAITING';
    
    console.log(`${status} ${name}: ${task.description || 'No description'}`);
    
    if (shouldRun) {
      runnableTasks.push({ name, task });
    }
  }
  
  if (runnableTasks.length === 0) {
    console.log('\n✅ No tasks ready to run');
    return;
  }
  
  console.log(`\n🎯 ${runnableTasks.length} task(s) ready to run:`);
  for (const { name, task } of runnableTasks) {
    console.log(`   • ${name}: ${task.action}`);
  }
  
  return runnableTasks;
}

function shouldTaskRun(task) {
  const now = new Date();
  
  switch (task.type) {
    case 'counter':
      return task.current >= task.threshold;
      
    case 'daily':
      if (!task.lastRun) return true;
      const lastRun = new Date(task.lastRun);
      const daysDiff = (now - lastRun) / (1000 * 60 * 60 * 24);
      return daysDiff >= 1;
      
    case 'weekly':
      if (!task.lastRun) return true;
      const lastRunWeek = new Date(task.lastRun);
      const weeksDiff = (now - lastRunWeek) / (1000 * 60 * 60 * 24 * 7);
      return weeksDiff >= 1;
      
    case 'on_change':
      // This would need to check git status or file hashes
      return false; // Simplified for now
      
    case 'on_commit':
      // This would need to check git log
      return false; // Simplified for now
      
    default:
      return false;
  }
}

function runTask(taskName) {
  const data = loadTasks();
  const task = data.tasks[taskName];
  
  if (!task) {
    console.log(`❌ Task '${taskName}' not found`);
    return;
  }
  
  if (!shouldTaskRun(task)) {
    console.log(`⏳ Task '${taskName}' is not ready to run`);
    return;
  }
  
  console.log(`🚀 Running task: ${taskName}`);
  console.log(`   Action: ${task.action}`);
  console.log(`   Description: ${task.description || 'No description'}\n`);
  
  // Execute the task action
  const action = TASK_ACTIONS[task.action];
  if (action) {
    try {
      console.log(`   Command: ${action.command}`);
      const output = execSync(action.command, { encoding: 'utf8' });
      console.log(`   Output:\n${output}`);
    } catch (error) {
      console.log(`   Error: ${error.message}`);
    }
  } else {
    console.log(`   ⚠️  Unknown action: ${task.action}`);
  }
  
  // Update task state
  updateTaskState(data, taskName);
  saveTasks(data);
  
  console.log(`\n✅ Task '${taskName}' completed`);
}

function updateTaskState(data, taskName) {
  const task = data.tasks[taskName];
  const now = new Date().toISOString();
  
  switch (task.type) {
    case 'counter':
      task.current = 0; // Reset counter
      task.lastRun = now;
      break;
      
    case 'daily':
    case 'weekly':
      task.lastRun = now;
      break;
      
    case 'on_change':
      // Would update file hash here
      task.lastRun = now;
      break;
      
    case 'on_commit':
      // Would update commit hash here
      task.lastRun = now;
      break;
  }
}

function addTask(taskName, taskType, config = {}) {
  const data = loadTasks();
  
  if (data.tasks[taskName]) {
    console.log(`❌ Task '${taskName}' already exists`);
    return;
  }
  
  if (!TASK_TYPES[taskType]) {
    console.log(`❌ Unknown task type: ${taskType}`);
    console.log(`   Available types: ${Object.keys(TASK_TYPES).join(', ')}`);
    return;
  }
  
  const taskConfig = { ...TASK_TYPES[taskType].config, ...config };
  
  data.tasks[taskName] = {
    type: taskType,
    description: TASK_TYPES[taskType].description,
    ...taskConfig
  };
  
  saveTasks(data);
  console.log(`✅ Added task '${taskName}' (${taskType})`);
}

function listTasks() {
  const data = loadTasks();
  const tasks = data.tasks || {};
  
  console.log('📋 Recurring Tasks:\n');
  
  if (Object.keys(tasks).length === 0) {
    console.log('   No tasks configured');
    return;
  }
  
  for (const [name, task] of Object.entries(tasks)) {
    const shouldRun = shouldTaskRun(task);
    const status = shouldRun ? '🚀' : '⏳';
    
    console.log(`${status} ${name}`);
    console.log(`   Type: ${task.type}`);
    console.log(`   Description: ${task.description || 'No description'}`);
    console.log(`   Last Run: ${task.lastRun || 'Never'}`);
    
    if (task.type === 'counter') {
      console.log(`   Progress: ${task.current}/${task.threshold}`);
    }
    
    console.log('');
  }
}

function incrementCounters() {
  const data = loadTasks();
  let updated = false;
  
  for (const [name, task] of Object.entries(data.tasks)) {
    if (task.type === 'counter') {
      task.current = (task.current || 0) + 1;
      updated = true;
    }
  }
  
  if (updated) {
    saveTasks(data);
    console.log('📈 Incremented task counters');
  }
}

function showHelp() {
  console.log(`
🔄 Task Scheduler

Usage:
  node pdi/task-scheduler.js check              - Check which tasks are ready
  node pdi/task-scheduler.js run [task-name]    - Run a specific task
  node pdi/task-scheduler.js add [name] [type]  - Add a new task
  node pdi/task-scheduler.js list               - List all tasks
  node pdi/task-scheduler.js increment          - Increment counters
  node pdi/task-scheduler.js help               - Show this help

Task Types:
  counter    - Run after N prompts
  daily      - Run once per day
  weekly     - Run once per week
  on_change  - Run when code changes
  on_commit  - Run on each commit

Examples:
  node pdi/task-scheduler.js add guidelines_refresh counter 5
  node pdi/task-scheduler.js add vitest_rerun counter 7
  node pdi/task-scheduler.js add coverage_check daily
  node pdi/task-scheduler.js check
  node pdi/task-scheduler.js run guidelines_refresh
`);
}

// Main execution
const command = process.argv[2];
const arg1 = process.argv[3];
const arg2 = process.argv[4];
const arg3 = process.argv[5];

switch (command) {
  case 'check':
    checkTasks();
    break;
  case 'run':
    if (!arg1) {
      console.log('❌ Please provide a task name');
      process.exit(1);
    }
    runTask(arg1);
    break;
  case 'add':
    if (!arg1 || !arg2) {
      console.log('❌ Please provide task name and type');
      process.exit(1);
    }
    const config = arg3 ? { threshold: parseInt(arg3) } : {};
    addTask(arg1, arg2, config);
    break;
  case 'list':
    listTasks();
    break;
  case 'increment':
    incrementCounters();
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
