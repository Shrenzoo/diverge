import * as fs from 'node:fs/promises';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { root, digest, filesIn } from './package.mjs';

export const fixtures = path.join(root, 'evals', 'fixtures');
const simple = /^[a-z][a-z0-9-]*$/;
export async function loadCases() {
  const cases = JSON.parse(await fs.readFile(path.join(root, 'evals', 'cases.json'), 'utf8'));
  assert(
    cases.length >= 20 && new Set(cases.map((c) => c.id)).size === cases.length,
    'Expected at least 20 unique cases',
  );
  for (const c of cases) {
    assert(simple.test(c.id) && simple.test(c.fixture), 'Invalid case or fixture ID');
    assert(
      c.prompt?.trim() && c.review?.trim() && ['SKIP', 'LIGHT', 'STANDARD', 'DEEP'].includes(c.budget),
      c.id,
    );
    assert(c.activation === (c.budget === 'SKIP' ? 'avoid' : 'consider'), c.id);
    assert(
      c.outputs.length && c.outputs.every((f) => /^[a-z][a-z0-9-]*\.(html|json|md|txt|mjs)$/.test(f)),
      c.id,
    );
    const input = await filesIn(path.join(fixtures, c.fixture));
    assert(input.length, c.fixture);
    for (const check of c.checks) {
      assert(
        c.outputs.includes(check.file) &&
          ['pattern', 'equals', 'actions', 'replace'].filter((k) => Object.hasOwn(check, k)).length === 1,
        c.id,
      );
      if (check.pattern) new RegExp(check.pattern, 'iu');
      if (check.replace) assert(input.includes(check.file) && check.replace.length === 2, c.id);
    }
  }
  return cases;
}

// Inventory dotfiles as well. Never dereference links or copy device nodes into review bundles.
export async function snapshot(dir) {
  const entries = new Map();
  let bytes = 0;
  async function visit(relative) {
    for (const name of await fs.readdir(path.join(dir, relative))) {
      const key = path.posix.join(relative, name);
      const file = path.join(dir, key);
      const info = await fs.lstat(file);
      if (entries.size > 3000 || key.split('/').length > 32)
        throw new Error('Workspace inventory limit exceeded');
      if (info.isDirectory()) {
        entries.set(key, { kind: 'directory' });
        await visit(key);
      } else if (info.isFile() && info.nlink === 1) {
        bytes += info.size;
        if (info.size > 4_000_000 || bytes > 30_000_000) throw new Error('Workspace size limit exceeded');
        const body = await fs.readFile(file);
        entries.set(key, { kind: 'file', hash: digest(body), body });
      } else
        entries.set(key, {
          kind: 'unsafe',
          hash: info.isSymbolicLink() ? digest(await fs.readlink(file)) : 'special',
        });
    }
  }
  await visit('');
  return entries;
}

function passed(check, body, initial) {
  if ('pattern' in check) return new RegExp(check.pattern, 'iu').test(body);
  if ('replace' in check)
    return initial?.includes(check.replace[0]) && body === initial.replace(...check.replace);
  const data = JSON.parse(body);
  if ('equals' in check) return isDeepStrictEqual(data, check.equals);
  let current = data.start;
  for (const action of check.actions) current = data.screens[current]?.[action];
  return current === check.end && Object.hasOwn(data.screens, current);
}

export function grade(c, before, after) {
  const changed = [...new Set([...before.keys(), ...after.keys()])]
    .filter((key) => {
      const first = before.get(key),
        last = after.get(key);
      return first?.kind !== last?.kind || first?.hash !== last?.hash;
    })
    .sort();
  const unexpected = changed.filter((name) => !c.outputs.includes(name));
  const checks = c.outputs.map((file) => ({
    name: `Deliver ${file}`,
    pass:
      changed.includes(file) && after.get(file)?.kind === 'file' && !!after.get(file).body.toString().trim(),
  }));
  for (const check of c.checks) {
    let pass = false;
    try {
      pass = !!passed(check, after.get(check.file).body.toString(), before.get(check.file)?.body?.toString());
    } catch {
      /* Missing or malformed output cannot satisfy the case. */
    }
    checks.push({
      name:
        check.what ??
        (check.actions
          ? check.actions.join(' / ') + ' ends at ' + check.end
          : check.replace
            ? 'Exact byte-preserving replacement'
