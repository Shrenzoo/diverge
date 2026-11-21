import * as fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { defaults, preferences } from '../skills/diverge/scripts/config.mjs';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const source = path.join(root, 'skills', 'diverge');
export const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');

export async function stat(file) {
  try {
    return await fs.lstat(file);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return null;
  }
}

export async function filesIn(directory, relative = '') {
  const files = [];
