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
