import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const schema = JSON.parse(
  readFileSync(new URL('../references/config.schema.json', import.meta.url), 'utf8'),
);
export function defaults() {
  return Object.fromEntries(
    Object.entries(schema.properties).map(([key, rule]) => [key, structuredClone(rule.default)]),
  );
}

// Implement the small, closed set of JSON Schema keywords used by this package.
function check(value, rule, field) {
  if (rule.type === 'integer') {
    if (!Number.isInteger(value) || value < rule.minimum || value > rule.maximum)
      throw new Error(`${field} must be an integer from ${rule.minimum} to ${rule.maximum}`);
  } else if (rule.type === 'array') {
    if (!Array.isArray(value)) throw new Error(`${field} must be an array`);
    value.forEach((entry, i) => check(entry, rule.items, `${field}[${i}]`));
    if (rule.uniqueItems && new Set(value).size !== value.length)
      throw new Error(`${field} contains duplicates`);
  } else if (typeof value !== rule.type) {
    throw new Error(`${field} must be a ${rule.type}`);
  }
  if (rule.enum && !rule.enum.includes(value))
    throw new Error(`${field} must be one of ${rule.enum.join(', ')}`);
  if (rule.pattern && !new RegExp(rule.pattern, 'u').test(value))
    throw new Error(`${field} must be a relative project path`);
}

export function preferences(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Expected a JSON object');
  const result = defaults();
  for (const [key, value] of Object.entries(input)) {
    if (!Object.hasOwn(schema.properties, key)) throw new Error(`Unknown preference: ${key}`);
    check(value, schema.properties[key], key);
    result[key] = value;
  }
  return result;
}

export function loadConfig(file) {
  let raw;
  try {
    raw = readFileSync(file, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return { config: defaults() };
    return { config: defaults(), error: error.message };
  }
  try {
    return { config: preferences(JSON.parse(raw)) };
  } catch (error) {
    return { config: defaults(), error: error.message };
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const { config, error } = loadConfig(process.argv[2] ?? 'diverge.config.json');
  if (error) {
