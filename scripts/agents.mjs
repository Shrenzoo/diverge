import { spawn, spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import path from 'node:path';

export const keyNames = { codex: 'CODEX_API_KEY', claude: 'ANTHROPIC_API_KEY' };
const binary = (agent) => (process.platform === 'win32' ? agent + '.exe' : agent);

export function probe(agent) {
  const run = (args) =>
    spawnSync(binary(agent), args, { encoding: 'utf8', timeout: 10000, windowsHide: true });
  const version = run(['--version']);
  if (version.error || version.status !== 0)
    return { reason: version.error?.message ?? 'Version probe failed' };
  const help = run(agent === 'codex' ? ['exec', '--help'] : ['--help']);
  const required =
    agent === 'codex'
      ? ['--json', '--sandbox', '--ignore-user-config', '--ephemeral']
      : [
          '--setting-sources',
          '--tools',
          '--permission-mode',
          '--output-format',
          '--no-session-persistence',
          '--strict-mcp-config',
        ];
  const missing = required.filter((option) => !help.stdout?.includes(option));
  return {
    version: version.stdout.trim(),
    reason: missing.length ? 'Missing CLI options: ' + missing.join(', ') : null,
  };
}

export function invocation(agent, condition, model, prompt) {
  const explicit = agent === 'codex' ? 'Use $diverge. ' : '/diverge ';
  const task = (condition === 'explicit' ? explicit : '') + prompt;
  if (agent === 'codex')
    return [
      '-a',
      'never',
      'exec',
      '--json',
      '--ephemeral',
      '--ignore-user-config',
      '--sandbox',
      'workspace-write',
      '--skip-git-repo-check',
      '-c',
      'shell_environment_policy.inherit="none"',
      '-m',
      model,
      task,
    ];
  return [
    '-p',
    '--setting-sources',
    'project',
    '--strict-mcp-config',
    '--tools',
    'Read,Glob,Grep,Skill,Edit,Write',
    '--permission-mode',
    'acceptEdits',
    '--no-session-persistence',
    '--output-format',
