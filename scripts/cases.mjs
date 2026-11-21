import * as fs from 'node:fs/promises';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { root, digest, filesIn } from './package.mjs';

export const fixtures = path.join(root, 'evals', 'fixtures');
