import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { defaults, preferences, loadConfig, schema } from '../skills/diverge/scripts/config.mjs';
import { source, validateSkill } from '../scripts/package.mjs';

test('the portable skill validates, including all local references', async () => {
