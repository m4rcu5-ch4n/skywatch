import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hubDisruption, airlineSignal, heatingSignal } from '../public/js/signals.js';
import { summarize } from '../lib/weather.js';

const hub = { id: 'ORD', baseline: 100, tickers: ['UAL'] };

test('calm weather and normal traffic → low disruption', () => {
  const d = hubDisruption(hub, { gustMax24: 8, precip24: 0, snow24: 0 }, { count: 100 });
  assert.equal(d.score, 0);
});

test('storm and half traffic → headwind', () => {
  const d = hubDisruption(hub, { gustMax24: 25, precip24: 20, snow24: 0 }, { count: 50 });
  assert.ok(d.score > 0.55);
  const s = airlineSignal('UAL', [hub], { ORD: d }, { changePct: 1 });
  assert.equal(s.label, 'Headwind');
  assert.match(s.note, /despite disruption/);
});

test('cold region → strong heating demand', () => {
  const s = heatingSignal(['YYZ'], { YYZ: { tempAvg72: 2 } });
  assert.equal(s.label, 'Strong heating demand');
});

test('Windy response parsing converts units', () => {
  const now = Date.now();
  const raw = {
    ts: [now, now + 3 * 3600e3],
    units: { 'temp-surface': 'K', 'past3hprecip-surface': 'm' },
    'temp-surface': [283.15, 285.15],
    'wind_u-surface': [3, 4], 'wind_v-surface': [4, 3],
    'gust-surface': [10, 14],
    'past3hprecip-surface': [0.002, 0.001],
  };
  const s = summarize({ id: 'X' }, raw);
  assert.equal(s.tempNow, 10);
  assert.equal(s.gustMax24, 14);
  assert.equal(s.windMax24, 5);
  assert.equal(s.precip24, 3);
});
