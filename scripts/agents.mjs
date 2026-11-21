import { spawn, spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import path from 'node:path';

export const keyNames = { codex: 'CODEX_API_KEY', claude: 'ANTHROPIC_API_KEY' };
const binary = (agent) => (process.platform === 'win32' ? agent + '.exe' : agent);

