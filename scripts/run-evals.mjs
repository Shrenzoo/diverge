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
