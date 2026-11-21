import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync, spawn } from 'node:child_process';
import { root, source, filesIn } from '../scripts/package.mjs';

async function sandbox(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'diverge test '));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return dir;
}
function command(dir, script, args) {
  return spawnSync(process.execPath, [path.join(root, 'scripts', script + '.mjs'), ...args], {
    cwd: dir,
    env: { ...process.env, HOME: dir, USERPROFILE: dir },
    encoding: 'utf8',
