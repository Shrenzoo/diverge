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
