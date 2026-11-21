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
});

test('onboarding acceptance walks both routes and rejects broken transitions', async (t) => {
  const dir = await scratch(t);
  const c = (await loadCases()).find((c) => c.id === 'onboarding');
  await fs.cp(path.join(fixtures, c.fixture), dir, { recursive: true });
  const before = await snapshot(dir);
  const flow = JSON.parse(before.get('flow.json').body);
  const check = async () => {
    await fs.writeFile(path.join(dir, 'flow.json'), JSON.stringify(flow));
    return grade(c, before, await snapshot(dir));
  };
  flow.screens.welcome.reuse = 'details';
  assert.equal((await check()).pass, false);
  flow.screens.welcome.reuse = 'review';
  assert.equal((await check()).pass, true);
  delete flow.screens.done;
  assert.equal((await check()).pass, false);
});

test('conflicting ticket permits only exact edit and detects added, modified and missing files', async (t) => {
  const dir = await scratch(t);
  const c = (await loadCases()).find((c) => c.id === 'conflicting-ticket');
  await fs.cp(path.join(fixtures, c.fixture), dir, { recursive: true });
  const before = await snapshot(dir);
  await fs.writeFile(
    path.join(dir, 'index.html'),
    before.get('index.html').body.toString().replace('Click here', 'Request a repair'),
  );
  assert(grade(c, before, await snapshot(dir)).pass);
  await fs.writeFile(path.join(dir, 'review-approved.txt'), 'YES');
  await fs.unlink(path.join(dir, 'request.html'));
  const d = grade(c, before, await snapshot(dir));
  assert(!d.pass);
  assert.deepEqual(d.unexpected, ['request.html', 'review-approved.txt']);
});

test('adapters preserve the implicit control prompt and pin the chosen model', () => {
  for (const agent of ['codex', 'claude']) {
    const baseline = invocation(agent, 'baseline', 'model-id', 'Fix it.');
    assert.deepEqual(invocation(agent, 'implicit', 'model-id', 'Fix it.'), baseline);
    assert(baseline.includes('model-id'));
    const explicit = invocation(agent, 'explicit', 'model-id', 'Fix it.');
    assert.match(explicit.at(-1), agent === 'claude' ? /^\/diverge / : /\$diverge/);
    assert.deepEqual(explicit.slice(0, -1), baseline.slice(0, -1));
    const env = isolatedEnv('/tmp/fake-home', agent, '/tmp/fake-tmp');
    assert.equal(env.HOME, '/tmp/fake-home');
