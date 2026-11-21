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
