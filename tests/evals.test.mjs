import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { root } from '../scripts/package.mjs';
import { loadCases, fixtures, snapshot, grade } from '../scripts/cases.mjs';
import { activation, invocation, traceMetrics, isolatedEnv, runProcess } from '../scripts/agents.mjs';
import { report, dimensions } from '../scripts/report.mjs';

async function scratch(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'diverge-eval-test-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return dir;
}
test('each evaluation budget and both selection expectations are exercised', async () => {
  const cases = await loadCases();
  assert.equal(new Set(cases.map((c) => c.budget)).size, 4);
  assert.equal(new Set(cases.map((c) => c.activation)).size, 2);
