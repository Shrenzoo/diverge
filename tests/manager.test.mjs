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
  const backup = (await fs.readdir(parent)).find((s) => s.startsWith('.diverge-backup-'));
  assert.equal(await fs.readFile(path.join(parent, backup, 'SKILL.md'), 'utf8'), 'local customization');
  await fs.writeFile(path.join(dest, 'references', 'frontend.md'), 'local guide');
  ok(command(dir, 'uninstall', both));
  assert.equal(await fs.readFile(path.join(dest, 'mine.txt'), 'utf8'), 'keep');
  assert.equal(await fs.readFile(path.join(dest, 'references', 'frontend.md'), 'utf8'), 'local guide');
  await assert.rejects(fs.access(path.join(dest, 'SKILL.md')), { code: 'ENOENT' });
});

test('two-host preflight detects an unmanaged second target before replacing the first', async (t) => {
  const dir = await sandbox(t);
  const unmanaged = path.join(dir, '.claude', 'skills', 'diverge');
  await fs.mkdir(unmanaged, { recursive: true });
  await fs.writeFile(path.join(unmanaged, 'notes'), 'mine');
  assert.notEqual(command(dir, 'install', both).status, 0);
  await assert.rejects(fs.access(path.join(dir, '.agents', 'skills', 'diverge')), { code: 'ENOENT' });
  assert.notEqual(command(dir, 'uninstall', ['--agent', 'claude', '--scope', 'project']).status, 0);
  ok(command(dir, 'install', [...both, '--replace']));
  assert.equal(await fs.readFile(path.join(unmanaged, 'notes'), 'utf8'), 'mine');
});

test('host roots and installed parent links cannot redirect writes or removal', async (t) => {
  const dir = await sandbox(t),
    elsewhere = await sandbox(t);
  await fs.symlink(elsewhere, path.join(dir, '.agents'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.notEqual(command(dir, 'install', codex).status, 0);
  assert.deepEqual(await fs.readdir(elsewhere), []);
  const claude = ['--agent', 'claude', '--scope', 'project'];
  ok(command(dir, 'install', claude));
  const dest = path.join(dir, '.claude', 'skills', 'diverge');
  await fs.rename(path.join(dest, 'references'), path.join(elsewhere, 'references'));
  await fs.symlink(
    path.join(elsewhere, 'references'),
    path.join(dest, 'references'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  ok(command(dir, 'uninstall', claude));
  await fs.access(path.join(elsewhere, 'references', 'activation.md'));
});

test('forged receipt cannot select unrelated paths', async (t) => {
  const dir = await sandbox(t);
  ok(command(dir, 'install', codex));
  const receipt = path.join(dir, '.agents', 'skills', 'diverge', '.diverge-install.json');
  const data = JSON.parse(await fs.readFile(receipt));
  data.files['../../../../victim'] = '0'.repeat(64);
  await fs.writeFile(receipt, JSON.stringify(data));
  await fs.writeFile(path.join(dir, 'victim'), 'keep');
  assert.notEqual(command(dir, 'uninstall', codex).status, 0);
  assert.equal(await fs.readFile(path.join(dir, 'victim'), 'utf8'), 'keep');
});

test('concurrent installers leave a complete readable copy', async (t) => {
  const dir = await sandbox(t);
  const install = () =>
    new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [path.join(root, 'scripts', 'install.mjs'), ...codex], {
        cwd: dir,
        stdio: 'ignore',
      });
      child.on('error', reject);
      child.on('exit', resolve);
    });
  const codes = await Promise.all([install(), install(), install()]);
