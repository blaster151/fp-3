#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = process.cwd();
const coverageDir = path.join(repoRoot, 'coverage');
const v8Dir = path.join(coverageDir, 'v8');

if (existsSync(coverageDir)) {
  rmSync(coverageDir, { recursive: true, force: true });
}
mkdirSync(v8Dir, { recursive: true });

const forwardedArgs = process.argv.slice(2);
const vitestCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const vitestArgs = ['vitest', 'run', ...forwardedArgs];

const result = spawnSync(vitestCommand, vitestArgs, {
  stdio: 'inherit',
  env: { ...process.env, NODE_V8_COVERAGE: v8Dir },
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
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

const coverageMap = new Map();
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

    if (!coverageMap.has(filePath)) {
      coverageMap.set(filePath, { total: 0, covered: 0 });
    }
    const aggregate = coverageMap.get(filePath);
    aggregate.total += totalBytes;
    aggregate.covered += coveredBytes;
  }
}

const summary = [];
let grandTotal = 0;
let grandCovered = 0;

for (const [filePath, stats] of [...coverageMap.entries()].sort((a, b) =>
  a[0].localeCompare(b[0]),
)) {
  if (stats.total === 0) continue;
  const relative = path.relative(repoRoot, filePath);
  const coverage = stats.covered / stats.total;
  grandTotal += stats.total;
  grandCovered += stats.covered;
  summary.push({
    file: relative,
    coveredBytes: stats.covered,
    totalBytes: stats.total,
    coverage,
  });
}

const overall = grandTotal === 0 ? 0 : grandCovered / grandTotal;

console.log('\nVitest V8 Coverage Summary');
if (summary.length === 0) {
  console.log('  No application files were executed.');
} else {
  for (const entry of summary) {
    console.log(
      `  ${entry.file.padEnd(60)} ${(entry.coverage * 100).toFixed(2)}% (${entry.coveredBytes}/${entry.totalBytes})`,
    );
  }
}
console.log(`\nOverall coverage: ${(overall * 100).toFixed(2)}% (${grandCovered}/${grandTotal})`);

writeFileSync(
  path.join(coverageDir, 'summary.json'),
  JSON.stringify({ overall, grandTotal, grandCovered, files: summary }, null, 2),
  'utf8',
);
