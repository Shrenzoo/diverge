import * as fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { defaults, preferences } from '../skills/diverge/scripts/config.mjs';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const source = path.join(root, 'skills', 'diverge');
