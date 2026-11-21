import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import { digest, filesIn, source, stat, validateSkill } from './package.mjs';
