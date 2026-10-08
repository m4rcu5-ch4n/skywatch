// Transparent heuristics, not predictions. Every score is 0..1 and every input
// is shown on the page, so you can see why a label appeared.

const clamp = (x) => Math.max(0, Math.min(1, x));

// How likely operations at a hub are disrupted right now / next 24h.
export function hubDisruption(hub, wx, fl) {
  const parts = {};
  if (wx && !wx.error) {
    parts.gust = clamp((wx.gustMax24 - 12) / 13);   // 12 m/s → 0, 25 m/s → 1
    parts.rain = clamp(wx.precip24 / 20);           // 20 mm/24h → 1
    parts.snow = clamp(wx.snow24 / 5);              // 5 mm water eq. → 1
  }
  const weather = parts.gust == null ? null : clamp(0.5 * parts.gust + 0.25 * parts.rain + 0.4 * parts.snow);
  const ratio = fl && !fl.error && hub.baseline ? fl.count / hub.baseline : null;
  const traffic = ratio == null ? null : clamp((1 - ratio) / 0.5); // 50% below baseline → 1

  const score = weather == null && traffic == null ? null
    : traffic == null ? weather
    : weather == null ? traffic
    : 0.6 * weather + 0.4 * traffic;
  return { score, weather, traffic, ratio };
}

export function airlineSignal(sym, hubs, disruption, quote) {
  const mine = hubs.filter((h) => h.tickers.includes(sym) && disruption[h.id]?.score != null);
  if (!mine.length) return null;
  const score = mine.reduce((s, h) => s + disruption[h.id].score, 0) / mine.length;
  const worst = mine.reduce((a, b) => (disruption[b.id].score > disruption[a.id].score ? b : a));

  let label = 'Mixed', tone = 'neutral';
  if (score >= 0.55) { label = 'Headwind'; tone = 'bad'; }
  else if (score < 0.25) { label = 'Clear skies'; tone = 'good'; }

  let note = `Hubs: ${mine.map((h) => h.id).join(', ')}. Worst: ${worst.id}.`;
  if (tone === 'bad' && quote?.changePct > 0) note += ' Price is up today despite disruption — worth a look.';
  if (tone === 'good' && quote?.changePct < -1) note += ' Price is down while operations look normal.';
  return { sym, score, label, tone, note };
}

// Heating degree days (base 18 °C) from the 72h average temperature.
export function heatingSignal(region, weather) {
  const temps = region.map((id) => weather[id]?.tempAvg72).filter((t) => typeof t === 'number');
  if (!temps.length) return null;
  const avg = temps.reduce((a, b) => a + b, 0) / temps.length;
  const hdd = Math.max(0, 18 - avg);
  let label = 'Low heating demand', tone = 'neutral';
  if (hdd >= 12) { label = 'Strong heating demand'; tone = 'good'; }
  else if (hdd >= 6) { label = 'Moderate heating demand'; tone = 'neutral'; }
  return { sym: 'UNG', score: Math.min(1, hdd / 18), label, tone, note: `72h avg ${avg.toFixed(1)} °C across ${region.join(', ')} → ${hdd.toFixed(1)} HDD/day.` };
}
