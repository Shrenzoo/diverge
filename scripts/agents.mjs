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
        } catch (error) {
          if (error.code !== 'ESRCH') child.kill('SIGKILL');
        }
      } else
        spawnSync('taskkill.exe', ['/pid', String(child.pid), '/t', '/f'], {
          windowsHide: true,
          timeout: 5000,
        });
    };
    const timer = setTimeout(() => stop('Time limit exceeded'), timeoutMs);
    for (const [stream, chunks] of [
      [child.stdout, out],
      [child.stderr, err],
    ])
      stream.on('data', (chunk) => {
        bytes += chunk.length;
        if (bytes <= 12_000_000) chunks.push(chunk);
        else if (!reason) stop('Trace limit exceeded');
      });
    child.on('error', (e) => {
      reason = e.message;
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolve({
        code,
        signal,
        reason,
        ms: Math.round(performance.now() - start),
        stdout: Buffer.concat(out).toString(),
        stderr: Buffer.concat(err).toString(),
      });
    });
  });
}

export const runAgent = (agent, args, cwd, env, timeoutMs) =>
  runProcess(binary(agent), args, cwd, env, timeoutMs);

export function traceMetrics(agent, raw) {
  const events = raw.split(/\r?\n/).flatMap((line) => {
    try {
      return [JSON.parse(line)];
    } catch {
      return [];
    }
  });
  let tools = 0,
    failed = 0,
    tokens = null,
    invocationEvidence = null,
    denied = 0,
    edits = 0,
    error = false,
    discoverable = null;
  const editedPaths = new Set();
  let revisions = 0;
  function noteEdit(file) {
    if (typeof file !== 'string') return;
    if (editedPaths.has(file)) revisions++;
    editedPaths.add(file);
  }
  for (const event of events) {
    if (agent === 'codex') {
      if (event.type === 'turn.failed' || event.type === 'error') error = true;
      if (event.type === 'turn.completed' && event.usage)
        tokens = (tokens ?? 0) + event.usage.input_tokens + event.usage.output_tokens;
      const item = event.item;
      if (
        event.type !== 'item.completed' ||
        !item ||
        !['command_execution', 'file_change', 'mcp_tool_call', 'web_search'].includes(item.type)
      )
        continue;
      tools++;
      if (item.type === 'file_change') {
        edits++;
        for (const change of item.changes ?? []) noteEdit(change.path);
      }
      if (item.status === 'failed' || (item.exit_code != null && item.exit_code !== 0)) failed++;
      if (
        item.type === 'command_execution' &&
        item.exit_code === 0 &&
        /(?:^|[\s'"])(?:cat|Get-Content)\s+[^;&|\n]*[\\/]diverge[\\/]SKILL\.md(?:[\s'"]|$)/i.test(
          item.command ?? '',
        )
      )
        invocationEvidence = 'Successful command reading the entry point';
    } else {
      if (event.type === 'system' && event.subtype === 'init' && Array.isArray(event.skills))
        discoverable = event.skills.includes('diverge');
      if (event.type === 'assistant')
        for (const b of event.message?.content ?? [])
          if (b.type === 'tool_use') {
            tools++;
            if (['Write', 'Edit'].includes(b.name)) {
              edits++;
              noteEdit(b.input?.file_path);
            }
            if (b.name === 'Skill' && b.input?.skill === 'diverge')
              invocationEvidence = 'Skill tool requested diverge';
            if (b.name === 'Read' && /[\\/]diverge[\\/]SKILL\.md$/.test(b.input?.file_path ?? ''))
              invocationEvidence = 'Read tool requested the entry point';
          }
      if (event.type === 'user')
        failed += (event.message?.content ?? []).filter((b) => b.type === 'tool_result' && b.is_error).length;
      if (event.type === 'result') {
        error ||= !!event.is_error;
        denied += event.permission_denials?.length ?? 0;
        if (event.usage)
          tokens = [
            'input_tokens',
            'output_tokens',
            'cache_creation_input_tokens',
            'cache_read_input_tokens',
          ].reduce((s, k) => s + (event.usage[k] ?? 0), 0);
      }
    }
  }
