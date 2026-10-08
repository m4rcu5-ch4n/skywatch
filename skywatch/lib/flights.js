// Flightradar24 API → number of aircraft currently inside a box around each hub.
// Docs: https://fr24api.flightradar24.com/docs
import { BOX_DEG } from './config.js';
import { seeded } from './demo.js';

const BASE = 'https://fr24api.flightradar24.com';

export async function getHubTraffic(hub) {
  const key = process.env.FR24_API_KEY;
  if (!key) return demoTraffic(hub);

  // FR24 bounds order: north,south,west,east
  const b = [hub.lat + BOX_DEG, hub.lat - BOX_DEG, hub.lon - BOX_DEG, hub.lon + BOX_DEG]
    .map((x) => x.toFixed(3)).join(',');
  const headers = { Accept: 'application/json', 'Accept-Version': 'v1', Authorization: `Bearer ${key}` };

  // The count endpoint is the cheapest way to get a number.
  let res = await fetch(`${BASE}/api/live/flight-positions/count?bounds=${b}`, { headers });
  if (res.ok) {
    const body = await res.json();
    const n = firstNumber(body);
    if (n != null) return { hub: hub.id, count: n };
  }
  // Fallback: the light positions endpoint, counting returned rows.
  res = await fetch(`${BASE}/api/live/flight-positions/light?bounds=${b}`, { headers });
  if (!res.ok) throw new Error(`FR24 ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = await res.json();
  return { hub: hub.id, count: (body.data || []).length };
}

function firstNumber(o) {
  if (typeof o === 'number') return o;
  if (o && typeof o === 'object') {
    for (const k of ['record_count', 'count', 'total']) if (typeof o[k] === 'number') return o[k];
    for (const v of Object.values(o)) { const n = firstNumber(v); if (n != null) return n; }
  }
  return null;
}

function demoTraffic(hub) {
  const r = seeded(hub.id + 'fl');
  return { hub: hub.id, count: Math.round(hub.baseline * (0.55 + r() * 0.65)), demo: true };
}
