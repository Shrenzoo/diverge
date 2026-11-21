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
    assert.equal(env.SSH_AUTH_SOCK, undefined);
  }
});

test('trace interpretation separates host discovery, observed calls, denials and absent evidence', () => {
  const lines = (...xs) => xs.map((x) => JSON.stringify(x)).join('\n');
  const raw = lines(
    { type: 'system', subtype: 'init', skills: ['diverge'] },
    {
      type: 'assistant',
      message: { content: [{ type: 'tool_use', name: 'Skill', input: { skill: 'diverge' } }] },
    },
    {
      type: 'result',
      usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 2 },
      permission_denials: [{}],
    },
  );
  const claude = traceMetrics('claude', raw);
  assert.equal(claude.tokens, 17);
  assert.equal(claude.discoverable, true);
  assert.equal(claude.permissionDenials, 1);
  assert.equal(activation('baseline', 'consider', claude), 'contaminated baseline');
  assert.equal(activation('implicit', 'avoid', claude), 'unexpected activation');
  assert.equal(activation('explicit', 'avoid', claude), 'observed');
  assert.equal(activation('implicit', 'consider', { discoverable: false }), 'skill missing');
  const events = lines(
    {
      type: 'item.completed',
      item: { type: 'command_execution', command: 'cat .agents/skills/diverge/SKILL.md', exit_code: 0 },
    },
    { type: 'turn.completed', usage: { input_tokens: 12, output_tokens: 6 } },
  );
  assert.equal(traceMetrics('codex', events).tokens, 18);
  assert(traceMetrics('codex', events).invocationEvidence);
  const missing = traceMetrics('codex', 'Agent says it used Diverge.');
  assert.equal(missing.toolCalls, null);
  assert.equal(activation('explicit', 'consider', missing), 'unobserved');
});

test('timeout terminates the CLI and returns captured evidence', async (t) => {
  const dir = await scratch(t);
  const output = await runProcess(process.execPath, ['-e', 'setInterval(() => {},10000)'], dir, {}, 200);
  assert.equal(output.reason, 'Time limit exceeded');
});

test('report separates quality, gate disagreement and paired inefficiency', () => {
  const sim = {
    format: 1,
    agent: 'test',
    runs: ['baseline', 'explicit'].map((condition, i) => ({
      case: 'item',
      repeat: 1,
      id: condition,
      condition,
      status: 'passed',
      runtime: { ms: 1000 + i * 700 },
      metrics: { tokens: 100 },
    })),
  };
  const rate = (id, reviewer, value) => ({
    id,
    reviewer,
    scores: Object.fromEntries(dimensions.map((k) => [k, value])),
    constraints: true,
    safety: reviewer === 'Q',
    note: 'Test-only observation',
  });
  const ratings = [rate('baseline', 'Q', 2), rate('explicit', 'Q', 3), rate('explicit', 'R', 5)];
  const output = report(sim, ratings);
  assert.match(output, /time flagged. Originality delta 2.00/);
  assert.match(output, /originality 3–5/);
  assert.match(output, /safety false/);
  assert.throws(() => report(sim, [...ratings, ratings[0]]), /Duplicate/);
  assert.throws(() => report(sim, [{ ...ratings[0], id: 'unknown' }]), /Invalid/);
});

test('preflight writes valid JSON and Markdown without starting a trial', async (t) => {
  const dir = await scratch(t);
  const out = spawnSync(
    process.execPath,
    [path.join(root, 'scripts', 'run-evals.mjs'), '--agent', 'codex', '--case', 'button-fix', '--out', dir],
    { encoding: 'utf8' },
  );
  assert.equal(out.status, 0, out.stderr);
  const folder = path.join(dir, (await fs.readdir(dir))[0]);
  const results = JSON.parse(await fs.readFile(path.join(folder, 'results.json')));
  assert.equal(results.runs.length, 3);
  assert(results.runs.every((r) => r.status === 'skipped' && !r.metrics));
  assert.match(await fs.readFile(path.join(folder, 'summary.md'), 'utf8'), /3 skipped/);
});

// Transport fixture exercises the live runner's orchestration without a model or external network.
test(
  'synthetic transport runs a full three-arm trial with private traces and blinded outputs',
  { skip: process.platform === 'win32' },
  async (t) => {
    const dir = await scratch(t);
    const file = path.join(dir, 'claude');
    await fs.writeFile(
      file,
      `#!/usr/bin/env node
const fs = require('node:fs');
if(process.argv.includes('--version')) {console.log('test-transport');process.exit(0);}
if(process.argv.includes('--help')) {console.log('--setting-sources --tools --permission-mode --output-format --no-session-persistence --strict-mcp-config');process.exit(0);}
const installed = fs.existsSync('.claude/skills/diverge/SKILL.md');
console.log(JSON.stringify({type:'system',subtype:'init',skills:installed?['diverge']:[]}));
const f='index.html';fs.writeFileSync(f,fs.readFileSync(f,'utf8').replace('Click here','Request a repair'));
console.log(JSON.stringify({type:'result',is_error:false,usage:{input_tokens:1,output_tokens:1}}));\n`,
      { mode: 0o700 },
    );
    const out = path.join(dir, 'results');
    const run = spawnSync(
      process.execPath,
      [
        path.join(root, 'scripts', 'run-evals.mjs'),
        '--live',
        '--model',
        'test-model',
        '--agent',
        'claude',
        '--case',
        'exact-label',
        '--out',
        out,
      ],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: dir + path.delimiter + process.env.PATH,
          ANTHROPIC_API_KEY: 'synthetic-test-value',
        },
      },
    );
    assert.equal(run.status, 0, run.stdout + run.stderr);
    const folder = path.join(out, (await fs.readdir(out))[0]);
    const data = JSON.parse(await fs.readFile(path.join(folder, 'results.json')));
    assert.equal(data.runs.length, 3);
    for (const r of data.runs) {
      assert.equal(r.status, 'passed');
      assert.deepEqual(r.deterministic.unexpected, []);
      assert.match(
        await fs.readFile(path.join(folder, 'blind', r.id, 'deliverables', 'index.html'), 'utf8'),
        /Request a repair/,
      );
      await fs.access(path.join(folder, 'raw', r.id, 'stdout.jsonl'));
    }
  },
);
