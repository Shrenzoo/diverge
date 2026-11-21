import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import { digest, filesIn, source, stat, validateSkill } from './package.mjs';

const receipt = '.diverge-install.json';
const hosts = { codex: '.agents', claude: '.claude' };
const instructions = { codex: 'In Codex, use $diverge.', claude: 'In Claude Code, use /diverge.' };

async function directory(dir, create = false) {
  if (create) {
    try {
      await fs.mkdir(dir);
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  }
  const info = await stat(dir);
  if (info && !info.isDirectory()) throw new Error(`Expected a real directory: ${dir}`);
  return !!info;
}

async function parentsOK(root, name) {
  let parent = root;
  for (const segment of name.split('/').slice(0, -1)) {
    parent = path.join(parent, segment);
    if (!(await stat(parent))?.isDirectory()) return false;
  }
  return true;
}

async function matches(dir, name, hash) {
  if (!(await parentsOK(dir, name))) return false;
  const file = path.join(dir, name);
  return (await stat(file))?.isFile() && digest(await fs.readFile(file)) === hash;
}

async function readReceipt(dir, names) {
  const file = path.join(dir, receipt);
  const info = await stat(file);
  if (!info) return null;
  if (!info.isFile()) throw new Error(`Unsafe receipt: ${file}`);
  const data = JSON.parse(await fs.readFile(file, 'utf8'));
  if (
    data?.format !== 1 ||
    data.skill !== 'diverge' ||
    !data.files ||
    Array.isArray(data.files) ||
    typeof data.files !== 'object'
  )
    throw new Error(`Invalid receipt: ${file}`);
