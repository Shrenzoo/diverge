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
