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
  for (const [name, hash] of Object.entries(data.files)) {
    if (!names.includes(name) || typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash))
      throw new Error(`Unrecognized receipt entry: ${name}. Original files preserved.`);
  }
  return data.files;
}

async function inspect(target, operation, replace, hashes) {
  const { parent, meta, dest } = target;
  await directory(meta);
  await directory(parent);
  if (!(await directory(dest))) return { action: operation === 'install' ? 'install' : 'absent' };
  let old;
  try {
    old = await readReceipt(dest, Object.keys(hashes));
  } catch (error) {
    if (operation !== 'install' || !replace) throw error;
    // Only a full-directory backup authorizes replacing an unreadable or older receipt.
    console.warn(`Backing up conflicting installation with unrecognized receipt: ${dest}`);
  }
  if (operation === 'uninstall') {
    if (!old) throw new Error(`Unmanaged installation: ${dest}. Review its files manually.`);
    const remove = [];
    for (const [name, hash] of Object.entries(old)) if (await matches(dest, name, hash)) remove.push(name);
    return { action: 'uninstall', remove, old };
  }
  if (old && Object.keys(old).length === Object.keys(hashes).length) {
    let identical = true;
    for (const [name, hash] of Object.entries(hashes))
      if (old[name] !== hash || !(await matches(dest, name, hash))) {
        identical = false;
        break;
      }
    if (identical) return { action: 'up to date' };
  }
  if (!replace)
    throw new Error(`Conflicting installation: ${dest}. Review first, then use --replace to back it up.`);
  const extras = (await filesIn(dest)).filter((name) => name !== receipt && !Object.hasOwn(hashes, name));
  return { action: 'replace', extras };
}

async function copyFile(from, to, name) {
  await fs.mkdir(path.dirname(path.join(to, name)), { recursive: true });
  await fs.copyFile(path.join(from, name), path.join(to, name), fs.constants.COPYFILE_EXCL);
}

async function install(target, plan, hashes) {
  const stage = await fs.mkdtemp(path.join(target.meta, '.diverge-stage-'));
  let backup;
  try {
    for (const [name, hash] of Object.entries(hashes)) {
      await copyFile(source, stage, name);
      if (!(await matches(stage, name, hash))) throw new Error(`Source changed while copying: ${name}`);
    }
    for (const name of plan.extras ?? []) await copyFile(target.dest, stage, name);
    await fs.writeFile(
      path.join(stage, receipt),
      JSON.stringify({ format: 1, skill: 'diverge', files: hashes }, null, 2) + '\n',
      { flag: 'wx' },
    );
    if (plan.action === 'replace') {
      backup = path.join(target.meta, `.diverge-backup-${randomUUID()}`);
      await fs.rename(target.dest, backup);
      console.log(`Backup: ${backup}`);
    }
    try {
      await fs.rename(stage, target.dest);
    } catch (error) {
      if (backup && !(await stat(target.dest))) await fs.rename(backup, target.dest);
      throw error;
    }
  } finally {
    // Only the private directory created by mkdtemp above is eligible for recursive cleanup.
