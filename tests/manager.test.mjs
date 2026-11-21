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
  });
}
function ok(output) {
  assert.equal(output.status, 0, output.stderr);
}
const both = ['--agent', 'both', '--scope', 'project'];
const codex = ['--agent', 'codex', '--scope', 'project'];

for (const [agent, base] of [
  ['codex', '.agents'],
  ['claude', '.claude'],
])
  for (const scope of ['project', 'user']) {
    test(agent + ' ' + scope + ' lifecycle in a path with spaces', async (t) => {
      const home = await sandbox(t);
      const project = path.join(home, 'consumer project');
      await fs.mkdir(project);
      const args = ['--agent', agent, '--scope', scope];
      if (scope === 'project') args.push('--project-dir', project);
      const dest = path.join(scope === 'project' ? project : home, base, 'skills', 'diverge');
      ok(command(home, 'install', [...args, '--dry-run']));
      await assert.rejects(fs.access(dest), { code: 'ENOENT' });
      ok(command(home, 'install', args));
      for (const name of await filesIn(source))
        assert.deepEqual(
          await fs.readFile(path.join(dest, name)),
          await fs.readFile(path.join(source, name)),
        );
      assert.match(command(home, 'install', args).stdout, /up to date/);
      ok(command(home, 'uninstall', [...args, '--dry-run']));
      await fs.access(path.join(dest, 'SKILL.md'));
      ok(command(home, 'uninstall', args));
      await assert.rejects(fs.access(dest), { code: 'ENOENT' });
      ok(command(home, 'uninstall', args));
    });
  }

test('replacement retains backup and extra files; uninstall retains edited and unowned content', async (t) => {
  const dir = await sandbox(t);
  ok(command(dir, 'install', both));
  const parent = path.join(dir, '.agents');
  const dest = path.join(parent, 'skills', 'diverge');
  await fs.writeFile(path.join(dest, 'SKILL.md'), 'local customization');
  await fs.writeFile(path.join(dest, 'mine.txt'), 'keep');
  assert.notEqual(command(dir, 'install', both).status, 0);
  ok(command(dir, 'install', [...both, '--replace']));
