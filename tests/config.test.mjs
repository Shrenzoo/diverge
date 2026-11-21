import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { defaults, preferences, loadConfig, schema } from '../skills/diverge/scripts/config.mjs';
import { source, validateSkill } from '../scripts/package.mjs';

test('the portable skill validates, including all local references', async () => {
  assert((await validateSkill()).includes('agents/openai.yaml'));
});

test('schema defaults and configured modes resolve independently', () => {
  assert.deepEqual(preferences({}), defaults());
  for (const mode of schema.properties.mode.enum)
    for (const interaction of schema.properties.interaction.enum) {
      const settings = preferences({ mode, interaction, creativity: 'experimental', maxRefinementPasses: 0 });
      assert.equal(settings.mode, mode);
      assert.equal(settings.interaction, interaction);
      assert.equal(settings.allowMajorRedesignWithoutApproval, false);
      assert.deepEqual(settings.excludedPaths, ['vendor', 'node_modules', 'dist']);
    }
  assert.deepEqual(preferences({ excludedPaths: ['docs/assets', 'a b'] }).excludedPaths, [
    'docs/assets',
    'a b',
  ]);
});

test('invalid configuration gets no partial effect', () => {
  for (const invalid of [
    null,
    [],
    false,
    { mode: 'aggressive' },
    { unknown: true },
    JSON.parse('{"__proto__":1}'),
    { maxCandidates: 0 },
    { maxCandidates: 2.5 },
    { maxCandidates: 6 },
    { maxRefinementPasses: 3 },
    { respectExistingDesignSystem: 'false' },
    ...['/tmp', '../data', 'a/..', 'x/./y', 'C:/etc', 'a\\b', 'a//b', ''].map((s) => ({
      excludedPaths: [s],
    })),
    { excludedPaths: ['a', 'a'] },
    { excludedPaths: [5] },
  ])
    assert.throws(() => preferences(invalid));
});

test('missing, malformed and valid project files yield documented results on CLI', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'diverge-config-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'diverge.config.json');
  const cli = () =>
    spawnSync(process.execPath, [path.join(source, 'scripts', 'config.mjs'), file], { encoding: 'utf8' });
  assert.deepEqual(loadConfig(file), { config: defaults() });
  await fs.writeFile(file, '{"mode":"wildcard",');
