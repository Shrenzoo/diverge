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
