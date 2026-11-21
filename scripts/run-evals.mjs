import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomInt, randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import { root, source, validateSkill } from './package.mjs';
import { loadCases, fixtures, snapshot, grade } from './cases.mjs';
import { probe, keyNames, invocation, isolatedEnv, runAgent, traceMetrics, activation } from './agents.mjs';
import { saveReport } from './report.mjs';

const conditions = ['baseline', 'implicit', 'explicit'];
const json = (value) => JSON.stringify(value, null, 2) + '\n';

async function runOne({ c, condition, repeat, agent, model, timeout, folder, skip }) {
  const id = randomUUID();
  const record = { id, case: c.id, condition, repeat, agent, model, expectedActivation: c.activation };
  if (skip) return { ...record, status: 'skipped', reason: skip };
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'diverge-trial-'));
  const workspace = path.join(temp, 'workspace'),
    home = path.join(temp, 'home'),
    tmp = path.join(temp, 'tmp');
  const raw = path.join(folder, 'raw', id);
  try {
    await fs.mkdir(raw, { recursive: true });
    await fs.mkdir(path.join(home, '.codex'), { recursive: true });
    await fs.mkdir(tmp);
    await fs.cp(path.join(fixtures, c.fixture), workspace, { recursive: true });
    if (condition !== 'baseline') {
      const skill = path.join(workspace, agent === 'codex' ? '.agents' : '.claude', 'skills', 'diverge');
      await fs.mkdir(path.dirname(skill), { recursive: true });
      await fs.cp(source, skill, { recursive: true });
    }
    const before = await snapshot(workspace);
    const args = invocation(agent, condition, model, c.prompt);
    const env = isolatedEnv(home, agent, tmp);
    // Keep unrelated credentials and CLI settings out of the process. Only the selected provider key is passed.
    const output = await runAgent(agent, args, workspace, env, timeout * 1000);
    const clean = (s) => s.split(env[keyNames[agent]]).join('[redacted provider key]');
    await fs.writeFile(path.join(raw, 'stdout.jsonl'), clean(output.stdout));
    await fs.writeFile(path.join(raw, 'stderr.txt'), clean(output.stderr));
    record.runtime = { ms: output.ms, code: output.code, signal: output.signal, reason: output.reason };
    record.metrics = traceMetrics(agent, output.stdout);
    record.activation = activation(condition, c.activation, record.metrics);
    const after = await snapshot(workspace);
    record.deterministic = grade(c, before, after);
    const blind = path.join(folder, 'blind', id);
    await fs.mkdir(blind, { recursive: true });
    await fs.writeFile(path.join(blind, 'task.txt'), c.prompt + '\n');
    await fs.cp(path.join(fixtures, c.fixture), path.join(blind, 'starter'), { recursive: true });
    const deliverables = path.join(blind, 'deliverables');
    await fs.mkdir(deliverables);
    for (const name of c.outputs)
      if (after.get(name)?.kind === 'file')
        await fs.writeFile(path.join(deliverables, name), after.get(name).body);
    // Record extra artifact contents privately. Never traverse links or export host skill/config files.
    for (const name of record.deterministic.unexpected) {
      if (name.split('/').some((x) => x.startsWith('.')) || after.get(name)?.kind !== 'file') continue;
      const file = path.join(raw, 'unexpected', name);
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, after.get(name).body);
    }
    const ok =
      output.code === 0 &&
      !output.reason &&
      record.metrics.traceComplete &&
      !record.metrics.agentError &&
      !record.metrics.permissionDenials &&
      !['contaminated baseline', 'skill missing', 'unexpected activation'].includes(record.activation) &&
      record.deterministic.pass;
    return { ...record, status: ok ? 'passed' : 'failed' };
  } catch (error) {
    return { ...record, status: 'failed', reason: error.message };
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
}

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

async function main() {
  const { values: v } = parseArgs({
    options: {
      agent: { type: 'string' },
      model: { type: 'string' },
      condition: { type: 'string', default: 'all' },
      case: { type: 'string', multiple: true },
      repeat: { type: 'string', default: '1' },
      timeout: { type: 'string', default: '180' },
      out: { type: 'string', default: path.join(root, 'eval-results') },
      list: { type: 'boolean' },
      live: { type: 'boolean' },
      help: { type: 'boolean' },
    },
  });
  if (v.help)
    return console.log(
      'run-evals.mjs --list | --agent codex|claude [--model ID --live] [--condition all|baseline|implicit|explicit] [--case ID ...] [--repeat N] [--timeout SECONDS] [--out DIR]',
    );
  const cases = await loadCases();
  if (v.list) return console.log(cases.map((c) => `${c.id}\t${c.budget}\t${c.activation}`).join('\n'));
  if (!Object.hasOwn(keyNames, v.agent) || (v.live && !v.model))
    throw new Error('Choose --agent codex|claude. Live trials also require --model ID.');
  const n = Number(v.repeat),
    timeout = Number(v.timeout);
