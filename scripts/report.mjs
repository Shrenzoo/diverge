import * as fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

export const dimensions = [
  'originality',
  'usefulness',
  'alignment',
  'feasibility',
  'execution',
  'simplicity',
];
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
function stats(xs) {
  const ns = xs.filter(Number.isFinite);
  if (!ns.length) return 'unavailable';
  const avg = mean(ns);
  const sd =
    ns.length > 1
      ? Math.sqrt(ns.reduce((s, n) => s + (n - avg) ** 2, 0) / (ns.length - 1)).toFixed(2)
      : 'n/a';
  return `n=${ns.length}, mean ${avg.toFixed(2)}, sample SD ${sd}`;
}
const safe = (s) =>
  String(s ?? '—')
    .replace(/[|\r\n]/g, ' ')
    .replaceAll('<', '&lt;');
function validateRatings(runs, ratings) {
  if (!Array.isArray(ratings)) throw new Error('Ratings must be a JSON array');
  const seen = new Set();
  for (const r of ratings) {
    if (
      !runs.some((x) => x.id === r.id && x.status !== 'skipped') ||
      typeof r.reviewer !== 'string' ||
      !r.reviewer.trim() ||
      !dimensions.every((k) => Number.isInteger(r.scores?.[k]) && r.scores[k] >= 0 && r.scores[k] <= 5) ||
      ![true, false, null].includes(r.constraints) ||
      ![true, false, null].includes(r.safety) ||
      typeof r.note !== 'string' ||
      !r.note.trim()
    )
      throw new Error('Invalid reviewer, artifact ID, scores, gates, or evidence note');
    const key = JSON.stringify([r.id, r.reviewer]);
    if (seen.has(key)) throw new Error('Duplicate artifact/reviewer rating');
    seen.add(key);
  }
}

export function report(manifest, ratings = []) {
  const { runs } = manifest;
  if (manifest.format !== 1 || !Array.isArray(runs)) throw new Error('Unsupported run manifest');
  validateRatings(runs, ratings);
  const scored = (r) => ratings.filter((x) => x.id === r.id);
  const lines = [
    '# Diverge evaluation',
    '',
    `Host ${safe(manifest.agent)} · CLI ${safe(manifest.cli)} · model ${safe(manifest.model)} · ${safe(manifest.platform)} · per-trial limit ${manifest.timeoutSeconds}s`,
    '',
    `${runs.length} assigned trials, ${runs.filter((r) => r.status === 'passed').length} deterministic passes, ${runs.filter((r) => r.status === 'failed').length} failures, ${runs.filter((r) => r.status === 'skipped').length} skipped. ${ratings.length} review sheets.`,
    '',
    '## Per-task evidence',
    '',
    '| Case / repetition | Condition | Result | Changed files | Build / parse | Contract checks | Seconds | Tokens | Calls / failed | Edits / revisions | Permission denials | Invocation evidence or skip reason |',
    '|---|---|---|---|---|---|---:|---:|---|---|---|---|',
  ];
  for (const r of runs) {
    const d = r.deterministic,
      m = r.metrics;
    const builds = d?.builds?.length ? (d.builds.every((x) => x.pass) ? 'pass' : 'fail') : 'n/a';
    lines.push(
      `| ${r.case} / ${r.repeat} | ${r.condition} | ${r.status} | ${safe(d?.changed.join(', '))} | ${builds} | ${d ? d.checks.filter((c) => c.pass).length + '/' + d.checks.length : '—'} | ${r.runtime ? (r.runtime.ms / 1000).toFixed(2) : '—'} | ${safe(m?.tokens)} | ${safe(m?.toolCalls)} / ${safe(m?.failedAttempts)} | ${safe(m?.editCalls)} / ${safe(m?.revisions)} | ${safe(m?.permissionDenials)} | ${safe(r.reason ?? r.runtime?.reason ?? [r.activation, m?.invocationEvidence].filter(Boolean).join(' / '))} |`,
    );
  }
  lines.push(
    '',
    '## Descriptive statistics',
    '',
    'Timing includes failed executions with measured duration. Scores below give each rated artifact equal weight, averaging its independent reviews first.',
  );
  for (const arm of [...new Set(runs.map((r) => r.condition))]) {
    const group = runs.filter((r) => r.condition === arm);
    lines.push(
      '',
      `### ${arm}`,
      '',
      `Seconds: ${stats(group.map((r) => r.runtime && r.runtime.ms / 1000))}. Tokens: ${stats(group.map((r) => r.metrics?.tokens))}.`,
    );
    for (const k of dimensions)
      lines.push(
        `- ${k}: ${stats(group.filter((r) => scored(r).length).map((r) => mean(scored(r).map((x) => x.scores[k]))))}`,
      );
  }
  lines.push(
    '',
    '## Paired efficiency flags',
    '',
    'Flag at 1.5× baseline time or tokens on a completed pair. This threshold is a review trigger. An originality gain requires a higher mean blinded originality rating.',
  );
  let flags = 0;
  for (const r of runs.filter((x) => x.condition !== 'baseline' && x.status === 'passed')) {
    const b = runs.find(
      (x) =>
        x.case === r.case && x.repeat === r.repeat && x.condition === 'baseline' && x.status === 'passed',
    );
    if (!b) continue;
    const slow = r.runtime.ms >= b.runtime.ms * 1.5 && b.runtime.ms > 0;
    const costly = b.metrics.tokens > 0 && r.metrics.tokens >= b.metrics.tokens * 1.5;
    if (slow || costly) {
      flags++;
      const gain =
        scored(r).length && scored(b).length
          ? mean(scored(r).map((x) => x.scores.originality)) -
            mean(scored(b).map((x) => x.scores.originality))
          : null;
      lines.push(
        `- ${r.case} / ${r.repeat} / ${r.condition}: ${[slow && 'time', costly && 'tokens'].filter(Boolean).join(' and ')} flagged. Originality delta ${gain === null ? 'unrated' : gain.toFixed(2)}.`,
      );
    }
  }
  if (!flags)
    lines.push(
      '',
      'No observed pair crossed the threshold. Skipped and incomplete pairs provide no cost comparison.',
    );
  lines.push('', '## Independent review', '');
  if (!ratings.length) lines.push('No ratings supplied. Creative quality is unassessed.');
  for (const r of runs.filter((x) => scored(x).length)) {
    const rows = scored(r);
    lines.push(`### ${r.case} / ${r.condition} / ${r.repeat}`, '');
    for (const x of rows)
      lines.push(
        `- ${safe(x.reviewer)}: ${dimensions.map((k) => k + ' ' + x.scores[k]).join(', ')}. Constraints ${safe(x.constraints)}, safety ${safe(x.safety)}. ${safe(x.note)}`,
      );
    if (rows.length > 1)
      lines.push(
        '',
        'Reviewer ranges: ' +
          dimensions
            .map((k) => {
              const xs = rows.map((x) => x.scores[k]);
              return k + ' ' + Math.min(...xs) + '–' + Math.max(...xs);
            })
            .join(', ') +
          '.',
      );
    lines.push('');
  }
  lines.push(
    '',
    '## Limits',
    '',
    'Artifact checks cover only declared contracts. Build is n/a where no build step applies. Tool requests and entry-point reads are partial evidence of activation. Missing events, permission observability, and unknown revision counts remain unassessed. Inspect raw traces for failures. Host sandboxes and models differ. These descriptive results do not establish statistical significance.',
    '',
  );
  return lines.join('\n');
}

export async function saveReport(folder, manifest, ratings) {
  await fs.writeFile(path.join(folder, 'summary.md'), report(manifest, ratings));
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const { values } = parseArgs({ options: { run: { type: 'string' }, ratings: { type: 'string' } } });
    if (!values.run) throw new Error('Usage: node scripts/report.mjs --run DIR [--ratings FILE]');
    const manifest = JSON.parse(await fs.readFile(path.join(values.run, 'results.json'), 'utf8'));
    const ratings = values.ratings ? JSON.parse(await fs.readFile(values.ratings, 'utf8')) : [];
    await saveReport(values.run, manifest, ratings);
    console.log(path.join(values.run, 'summary.md'));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
