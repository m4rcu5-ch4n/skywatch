// Windy Point Forecast API → per-hub summary for the next 24h / 72h.
// Docs: https://api.windy.com/point-forecast/docs
import { seeded } from './demo.js';

const URL = 'https://api.windy.com/api/point-forecast/v2';

export async function getHubWeather(hub) {
  const key = process.env.WINDY_API_KEY;
  if (!key) return demoWeather(hub);

  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lat: hub.lat,
      lon: hub.lon,
      model: 'gfs',
      parameters: ['temp', 'wind', 'windGust', 'precip', 'snowPrecip'],
      levels: ['surface'],
      key,
    }),
  });
  if (!res.ok) throw new Error(`Windy ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return summarize(hub, await res.json());
}

export function summarize(hub, d) {
  const now = Date.now();
  const ts = d.ts || [];
  const idx = (hours) => ts.map((t, i) => (t >= now - 3 * 3600e3 && t <= now + hours * 3600e3 ? i : -1)).filter((i) => i >= 0);
  const i24 = idx(24);
  const i72 = idx(72);

  const tempK = d['temp-surface'] || [];
  const toC = (v) => (d.units?.['temp-surface'] === 'K' || v > 150 ? v - 273.15 : v);
  const mm = (v) => (d.units?.['past3hprecip-surface'] === 'm' ? v * 1000 : v);
  const u = d['wind_u-surface'] || [];
  const v = d['wind_v-surface'] || [];
  const gust = d['gust-surface'] || [];
  const precip = d['past3hprecip-surface'] || [];
  const snow = d['past3hsnowprecip-surface'] || [];

  const pick = (arr, ids) => ids.map((i) => arr[i]).filter((x) => typeof x === 'number');
  const max = (a) => (a.length ? Math.max(...a) : 0);
  const sum = (a) => a.reduce((s, x) => s + x, 0);
  const avg = (a) => (a.length ? sum(a) / a.length : null);

  const temps72 = pick(tempK, i72).map(toC);
  const wind24 = i24.map((i) => Math.hypot(u[i] ?? 0, v[i] ?? 0));

  return {
    hub: hub.id,
    gustMax24: round(max(pick(gust, i24))),                 // m/s
    windMax24: round(max(wind24)),                          // m/s
    precip24: round(sum(pick(precip, i24).map(mm))),        // mm
    snow24: round(sum(pick(snow, i24).map(mm))),            // mm water equivalent
    tempNow: temps72.length ? round(temps72[0]) : null,     // °C
    tempAvg72: round(avg(temps72)),                         // °C
  };
}

function demoWeather(hub) {
  const r = seeded(hub.id + 'wx');
  return {
    hub: hub.id,
    gustMax24: round(6 + r() * 16),
    windMax24: round(4 + r() * 10),
    precip24: round(r() < 0.5 ? 0 : r() * 18),
    snow24: 0,
    tempNow: round(4 + r() * 18),
    tempAvg72: round(3 + r() * 16),
    demo: true,
  };
}

const round = (x) => (x == null ? null : Math.round(x * 10) / 10);
