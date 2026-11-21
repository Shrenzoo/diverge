import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { root, validateSkill, filesIn } from './package.mjs';
import { loadCases } from './cases.mjs';

try {
  const files = await validateSkill();
  const cases = await loadCases();
  for (const name of [
    'README.md',
    'LICENSE',
    'CONTRIBUTING.md',
    'SECURITY.md',
    'package.json',
    '.github/workflows/ci.yml',
    '.github/ISSUE_TEMPLATE/bug.md',
    '.github/ISSUE_TEMPLATE/evaluation.md',
    'evals/rubric.md',
    'evals/README.md',
  ]) {
    assert((await fs.stat(path.join(root, name))).size > 0, name + ' is empty');
  }
  for (const directory of ['scripts', 'skills', 'tests']) {
    for (const file of (await filesIn(path.join(root, directory))).filter((f) => f.endsWith('.mjs'))) {
      const result = spawnSync(process.execPath, ['--check', path.join(root, directory, file)], {
        encoding: 'utf8',
      });
      assert.equal(result.status, 0, result.stderr);
    }
  }
  console.log(
    `Validated ${files.length} skill files, ${cases.length} cases, release files, and JavaScript syntax.`,
