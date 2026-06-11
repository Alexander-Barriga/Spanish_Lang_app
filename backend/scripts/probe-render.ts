/**
 * Probe a deployed HTTP API to characterize cold-start vs warm-path latency.
 *
 * Usage:
 *   npm run probe-render
 *   npm run probe-render -- https://my-other-deploy.example.com 8 250
 *
 * Args (all optional):
 *   1. baseUrl       (default https://spanish-lang-app.onrender.com)
 *   2. warmCount     (default 6 — number of warm samples after the first hit)
 *   3. warmDelayMs   (default 250 — pause between warm samples)
 *
 * Interpretation:
 *   - Render free-tier Web Services sleep after ~15 min idle and take 30-60s
 *     to wake. The first hit after a sleep can therefore be 8-60s while warm
 *     hits stay sub-second.
 *   - Run this once cold (first request of the morning, etc.) and the verdict
 *     block at the end will tell you whether you have free-tier-style sleep.
 */
import { performance } from 'perf_hooks';

const DEFAULT_BASE = 'https://spanish-lang-app.onrender.com';
const HEALTH_PATH = '/health';

type Sample = { ms: number; status: number; ok: boolean; bytes: number };

async function timed(url: string, timeoutMs: number = 120_000): Promise<Sample> {
  const ctrl = new AbortController();
  const t0 = performance.now();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    const body = await res.arrayBuffer();
    return {
      ms: performance.now() - t0,
      status: res.status,
      ok: res.ok,
      bytes: body.byteLength,
    };
  } finally {
    clearTimeout(timer);
  }
}

function fmtMs(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[m - 1] + sorted[m]) / 2 : sorted[m];
}

function percentile(arr: number[], pct: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((pct / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

async function main() {
  const baseUrl = (process.argv[2] || DEFAULT_BASE).replace(/\/$/, '');
  const warmCount = Math.max(1, parseInt(process.argv[3] || '6', 10));
  const warmDelayMs = Math.max(0, parseInt(process.argv[4] || '250', 10));

  const url = baseUrl + HEALTH_PATH;

  console.log('Render cold-start probe');
  console.log('─'.repeat(60));
  console.log(`Target:        ${url}`);
  console.log(`Warm samples:  ${warmCount}, spaced ${warmDelayMs}ms`);
  console.log('');

  console.log('Probe 1 — first hit (cold if instance was idle 15+ min):');
  let cold: Sample;
  try {
    cold = await timed(url);
  } catch (err) {
    console.error('  request failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
  console.log(`  status=${cold.status} ok=${cold.ok} bytes=${cold.bytes} latency=${fmtMs(cold.ms)}`);
  console.log('');

  const warm: Sample[] = [];
  for (let i = 0; i < warmCount; i++) {
    if (warmDelayMs) await new Promise((r) => setTimeout(r, warmDelayMs));
    try {
      const s = await timed(url);
      warm.push(s);
      console.log(`Probe ${i + 2} (warm): status=${s.status} latency=${fmtMs(s.ms)}`);
    } catch (err) {
      console.log(`Probe ${i + 2} (warm): FAILED — ${err instanceof Error ? err.message : err}`);
    }
  }
  console.log('');

  if (warm.length === 0) {
    console.log('No successful warm samples — aborting.');
    process.exit(2);
  }

  const warmMs = warm.map((s) => s.ms);
  const warmMedian = median(warmMs);
  const warmP95 = percentile(warmMs, 95);
  const warmMin = Math.min(...warmMs);
  const warmMax = Math.max(...warmMs);

  console.log('Summary');
  console.log('─'.repeat(60));
  console.log(`First hit:        ${fmtMs(cold.ms)}`);
  console.log(`Warm median:      ${fmtMs(warmMedian)}`);
  console.log(`Warm p95:         ${fmtMs(warmP95)}`);
  console.log(`Warm min / max:   ${fmtMs(warmMin)} / ${fmtMs(warmMax)}`);
  console.log(`First-hit overhead vs warm median: ${fmtMs(cold.ms - warmMedian)}`);
  console.log('');

  console.log('Verdict');
  console.log('─'.repeat(60));
  const overhead = cold.ms - warmMedian;
  if (cold.ms > 8000) {
    console.log('🛑  First-hit latency is in classic Render free-tier cold-start range.');
    console.log('    Real users opening the app would see a multi-second blank loading');
    console.log('    screen before the very first API call returns.');
    console.log('    Apple App Review reviewers hit cold instances; expect a 2.1 rejection.');
    console.log('    Recommendation: upgrade to Render Starter ($7/mo) before submission.');
  } else if (overhead > 2000) {
    console.log('⚠️   First hit was slower than warm by >2s. Could be a free-tier wake-up,');
    console.log('    a TLS/DNS cold path, or an upstream CDN miss. To confirm:');
    console.log('      1. Leave the server idle 20+ minutes (no app traffic).');
    console.log('      2. Rerun this probe.');
    console.log('      3. If the new first hit > 10s, it is almost certainly free-tier sleep.');
  } else {
    console.log('✅  No cold-start signal observed in this run.');
    console.log('    Either the instance was already warm, or you are on a non-sleeping plan.');
    console.log('    To verify tier-independence, leave the server idle 20+ min and rerun;');
    console.log('    a Render free-tier instance will show 30-60s on the first hit.');
  }

  if (warmP95 > 1500) {
    console.log('');
    console.log('⚠️   Warm p95 > 1.5s on /health. The instance may be undersized or');
    console.log('    contending for CPU. /health is dependency-free, so anything above');
    console.log('    ~500ms warm suggests a small Render free-tier shape (0.1 CPU).');
  }
}

main().catch((err) => {
  console.error('probe-render failed:', err);
  process.exit(1);
});
