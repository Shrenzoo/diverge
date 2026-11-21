import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const schema = JSON.parse(
  readFileSync(new URL('../references/config.schema.json', import.meta.url), 'utf8'),
);
export function defaults() {
