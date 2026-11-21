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
  for (const entry of await fs.readdir(path.join(directory, relative), { withFileTypes: true })) {
    const name = path.posix.join(relative, entry.name);
    if (entry.isDirectory()) files.push(...(await filesIn(directory, name)));
    else if (entry.isFile()) files.push(name);
    else throw new Error(`Unexpected link or special file: ${name}`);
  }
  return files.sort();
}

export async function validateSkill() {
  const files = await filesIn(source);
  const required = [
    'SKILL.md',
    'agents/openai.yaml',
    'scripts/config.mjs',
    'references/config.schema.json',
    ...[
      'activation',
      'creative-workflow',
      'evaluation',
      'autonomy',
      'frontend',
      'product',
      'startup',
      'architecture',
      'problem-solving',
      'configuration',
    ].map((x) => `references/${x}.md`),
  ];
  for (const name of required) assert(files.includes(name), `Missing ${name}`);
  assert.deepEqual(
    await fs.readFile(path.join(source, 'LICENSE')),
    await fs.readFile(path.join(root, 'LICENSE')),
    'Bundled license differs from repository license',
  );
  const skill = await fs.readFile(path.join(source, 'SKILL.md'), 'utf8');
