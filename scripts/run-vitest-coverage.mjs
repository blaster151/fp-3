#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = process.cwd();
const coverageDir = path.join(repoRoot, 'coverage');

if (existsSync(coverageDir)) {
  rmSync(coverageDir, { recursive: true, force: true });
}
mkdirSync(coverageDir, { recursive: true });

const require = createRequire(import.meta.url);
let coveragePluginAvailable = false;
try {
  require.resolve('@vitest/coverage-v8');
  coveragePluginAvailable = true;
} catch {
  coveragePluginAvailable = false;
}

const forwardedArgs = process.argv.slice(2);
const vitestCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const summary = [];
let grandTotal = 0;
let grandCovered = 0;

function recordCoverage(file, covered, total, metric) {
  if (total === 0) return;
  summary.push({ file, covered, total, coverage: covered / total, metric });
  grandTotal += total;
  grandCovered += covered;
}

function mergeRanges(ranges, maxLength) {
  if (!ranges.length) return [];
  const normalized = ranges
    .map(({ start, end }) => {
      const clampedStart = Math.max(0, Math.min(start, maxLength ?? start));
      const clampedEnd = Math.max(clampedStart, Math.min(end, maxLength ?? end));
      return { start: clampedStart, end: clampedEnd };
    })
    .filter((range) => range.end > range.start)
    .sort((a, b) => (a.start === b.start ? a.end - b.end : a.start - b.start));

  const merged = [normalized[0]];
  for (let i = 1; i < normalized.length; i++) {
    const current = normalized[i];
    const last = merged[merged.length - 1];
    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push(current);
    }
  }
  return merged;
}

function sumRanges(ranges) {
  return ranges.reduce((total, range) => total + (range.end - range.start), 0);
}

if (coveragePluginAvailable) {
  const vitestArgs = ['vitest', 'run', '--coverage', ...forwardedArgs];
  const result = spawnSync(vitestCommand, vitestArgs, {
    stdio: 'inherit',
    env: { ...process.env, VITEST_COVERAGE: 'true' },
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  const finalJson = path.join(coverageDir, 'tmp', 'coverage-final.json');
  if (existsSync(finalJson)) {
    const payload = JSON.parse(readFileSync(finalJson, 'utf8'));
    for (const [filePathRaw, metrics] of Object.entries(payload)) {
      const filePath = path.resolve(repoRoot, filePathRaw);
      if (!filePath.startsWith(repoRoot)) continue;
      if (filePath.split(path.sep).includes('node_modules')) continue;

      const statements = metrics?.statements;
      if (!statements) continue;

      const relative = path.relative(repoRoot, filePath);
      recordCoverage(relative, statements.covered ?? 0, statements.total ?? 0, 'statements');
    }
  }
} else {
  const v8Dir = path.join(coverageDir, 'v8');
  mkdirSync(v8Dir, { recursive: true });

  const vitestArgs = ['vitest', 'run', ...forwardedArgs];
  const result = spawnSync(vitestCommand, vitestArgs, {
    stdio: 'inherit',
    env: { ...process.env, NODE_V8_COVERAGE: v8Dir, VITEST_COVERAGE: 'false' },
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  const files = readdirSync(v8Dir);
  for (const file of files) {
    const payload = JSON.parse(readFileSync(path.join(v8Dir, file), 'utf8'));
    for (const entry of payload.result ?? []) {
      if (!entry.url || !entry.url.startsWith('file://')) continue;

      let filePath;
      try {
        filePath = fileURLToPath(entry.url);
      } catch {
        continue;
      }

      if (!filePath.startsWith(repoRoot)) continue;
      if (filePath.split(path.sep).includes('node_modules')) continue;

      let source;
      try {
        source = readFileSync(filePath, 'utf8');
      } catch {
        continue;
      }

      const fileLength = source.length;
      const totalRanges = [];
      const coveredRanges = [];

      for (const fn of entry.functions ?? []) {
        for (const range of fn.ranges ?? []) {
          const segment = { start: range.startOffset, end: range.endOffset };
          totalRanges.push(segment);
          if (range.count > 0) {
            coveredRanges.push(segment);
          }
        }
      }

      if (!totalRanges.length) continue;

      const mergedTotal = mergeRanges(totalRanges, fileLength);
      const mergedCovered = mergeRanges(coveredRanges, fileLength);
      const totalBytes = sumRanges(mergedTotal);
      const coveredBytes = sumRanges(mergedCovered);

      const relative = path.relative(repoRoot, filePath);
      recordCoverage(relative, coveredBytes, totalBytes, 'bytes');
    }
  }
}

summary.sort((a, b) => a.file.localeCompare(b.file));

const overall = grandTotal === 0 ? 0 : grandCovered / grandTotal;

console.log('\nVitest Coverage Summary');
if (summary.length === 0) {
  console.log('  No application files were executed.');
} else {
  for (const entry of summary) {
    console.log(
      `  ${entry.file.padEnd(60)} ${(entry.coverage * 100).toFixed(2)}% (${entry.covered}/${entry.total})`,
    );
  }
}
console.log(`\nOverall coverage: ${(overall * 100).toFixed(2)}% (${grandCovered}/${grandTotal})`);

writeFileSync(
  path.join(coverageDir, 'summary.json'),
  JSON.stringify({ overall, grandTotal, grandCovered, files: summary }, null, 2),
  'utf8',
);
