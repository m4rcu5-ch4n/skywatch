#!/usr/bin/env node
// Pulls quotes from your local IBKR Client Portal Gateway and writes them to
// public/data/market.json, which the public site reads as a static file.
// Your brokerage login never leaves your computer.
//
// Usage:
//   npm run sync:ibkr                 one snapshot
//   npm run sync:ibkr -- --push       snapshot, then git commit + push (triggers redeploy)
//   npm run sync:ibkr -- --every 15   repeat every 15 minutes (combine with --push)

import https from 'node:https';
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { TICKERS } from '../lib/config.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'public', 'data', 'market.json');
const BASE = process.env.IBKR_GATEWAY_URL || 'https://localhost:5000/v1/api';
const args = process.argv.slice(2);
const PUSH = args.includes('--push');
const EVERY = Number(args[args.indexOf('--every') + 1]) || 0;

// The gateway uses a self-signed certificate. Only relax verification for a
// gateway running on this machine.
const host = new URL(BASE).hostname;
const local = ['localhost', '127.0.0.1', '::1'].includes(host);
const agent = new https.Agent({ rejectUnauthorized: !local });

function call(p, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = https.request(BASE + p, { method, agent, headers: { 'User-Agent': 'skywatch-sync' } }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`${p} → ${res.statusCode} ${body.slice(0, 200)}`));
        try { resolve(body ? JSON.parse(body) : {}); } catch { resolve({}); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const num = (v) => (v == null ? null : Number(String(v).replace(/[^0-9.\-]/g, '')) || null);

async function conidFor(sym, info) {
  if (info.conid) return info.conid;
  const r = await call(`/trsrv/stocks?symbols=${sym}`);
  const contracts = (r[sym] || []).flatMap((x) => x.contracts || []);
  const want = info.exchange === 'SMART' ? contracts.find((c) => c.isUS) : contracts.find((c) => c.exchange === info.exchange);
  const c = want || contracts[0];
  if (!c) throw new Error(`No IBKR contract found for ${sym}`);
  return c.conid;
}

async function snapshot() {
  const auth = await call('/iserver/auth/status', 'POST');
  if (!auth.authenticated) {
    throw new Error('Gateway is running but not logged in. Open https://localhost:5000 in your browser and sign in.');
  }
  await call('/iserver/accounts'); // required once per session before market data

  const conids = {};
  for (const [sym, info] of Object.entries(TICKERS)) conids[sym] = await conidFor(sym, info);
  const list = Object.values(conids).join(',');

  // 31 = last price, 83 = change %. The first request only opens the stream.
  let rows = [];
  for (let attempt = 0; attempt < 4; attempt++) {
    rows = await call(`/iserver/marketdata/snapshot?conids=${list}&fields=31,83`);
    if (rows.every((r) => r['31'] != null)) break;
    await sleep(1500);
  }

  const quotes = {};
  for (const [sym, conid] of Object.entries(conids)) {
    const r = rows.find((x) => String(x.conid) === String(conid)) || {};
    quotes[sym] = { last: num(r['31']), changePct: num(r['83']) };
  }
  const data = { updated: new Date().toISOString(), source: 'ibkr', demo: false, quotes };
  writeFileSync(OUT, JSON.stringify(data, null, 2) + '\n');
  console.log(`Wrote ${Object.keys(quotes).length} quotes to public/data/market.json`);

  if (PUSH) {
    const git = (...a) => execFileSync('git', a, { cwd: root, stdio: 'inherit' });
    git('add', 'public/data/market.json');
    try { git('commit', '-m', `Market snapshot ${data.updated}`); git('push'); }
    catch { console.log('Nothing new to commit.'); }
  }
}

do {
  try { await snapshot(); } catch (e) { console.error('Sync failed:', e.message); if (!EVERY) process.exit(1); }
  if (EVERY) await sleep(EVERY * 60e3);
} while (EVERY);
