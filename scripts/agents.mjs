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
    'stream-json',
    '--verbose',
    '--model',
    model,
    '--',
    task,
  ];
}

export function isolatedEnv(home, agent, tmp) {
  const env = {};
  for (const k of ['PATH', 'SystemRoot', 'ComSpec', 'PATHEXT', 'LANG', 'LC_ALL', 'WINDIR'])
    if (process.env[k]) env[k] = process.env[k];
  Object.assign(env, {
    HOME: home,
    USERPROFILE: home,
    CODEX_HOME: path.join(home, '.codex'),
    CLAUDE_CONFIG_DIR: path.join(home, '.claude'),
    XDG_CONFIG_HOME: path.join(home, 'config'),
    XDG_DATA_HOME: path.join(home, 'data'),
    XDG_CACHE_HOME: path.join(home, 'cache'),
    APPDATA: path.join(home, 'appdata'),
    LOCALAPPDATA: path.join(home, 'local'),
    TMPDIR: tmp,
    TEMP: tmp,
    TMP: tmp,
    DISABLE_TELEMETRY: '1',
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
  });
  if (process.env[keyNames[agent]]) env[keyNames[agent]] = process.env[keyNames[agent]];
  return env;
}

// Bound runtime and trace volume; keep CLI output as evidence even when it exits unsuccessfully.
export function runProcess(command, args, cwd, env, timeoutMs) {
  return new Promise((resolve) => {
    const start = performance.now(),
      out = [],
      err = [];
    let bytes = 0,
      reason = null;
    const group = process.platform !== 'win32';
    const child = spawn(command, args, {
      cwd,
      env,
      shell: false,
      windowsHide: true,
      detached: group,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const stop = (why) => {
      reason ??= why;
      if (!child.pid) return;
      if (group) {
        try {
          process.kill(-child.pid, 'SIGKILL');
