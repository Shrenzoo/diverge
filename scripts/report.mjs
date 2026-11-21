import * as fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

export const dimensions = [
  'originality',
  'usefulness',
  'alignment',
  'feasibility',
