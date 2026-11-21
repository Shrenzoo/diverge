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
