import { hubDisruption, airlineSignal, heatingSignal } from './signals.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (v, d = 1, unit = '') => (v == null ? '—' : `${Number(v).toFixed(d)}${unit}`);
const pct = (v) => (v == null ? '—' : `<span class="${v >= 0 ? 'pos' : 'neg'}">${v >= 0 ? '+' : ''}${v.toFixed(2)}%</span>`);

async function getJSON(url) {
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error(`${url} ${r.status}`);
    return await r.json();
  } catch (e) {
    return { error: e.message };
  }
}

async function load() {
  const [cfg, wx, fl, mk] = await Promise.all([
    getJSON('/api/config'), getJSON('/api/weather'), getJSON('/api/flights'), getJSON('/data/market.json'),
  ]);
  if (cfg.error) { $('#status').innerHTML = `<span class="badge err">Config failed to load</span>`; return; }

  const byHub = (feed) => Object.fromEntries((feed.hubs || []).map((h) => [h.hub, h]));
  const weather = byHub(wx), flights = byHub(fl);
  const quotes = mk.quotes || {};

  // Status badges
  const badges = [];
  for (const [name, feed] of [['Weather', wx], ['Flights', fl], ['Market', mk]]) {
    if (feed.error) badges.push(`<span class="badge err">${name}: offline</span>`);
    else if (feed.demo) badges.push(`<span class="badge demo">${name}: demo data</span>`);
    else badges.push(`<span class="badge">${name}: live</span>`);
  }
  $('#status').innerHTML = badges.join('');

  // Hubs
  const disruption = {};
  $('#hubs tbody').innerHTML = cfg.hubs.map((h) => {
    const w = weather[h.id] || {}, f = flights[h.id] || {};
    const d = (disruption[h.id] = hubDisruption(h, w, f));
    const color = d.score == null ? 'var(--neutral)' : d.score >= 0.55 ? 'var(--bad)' : d.score < 0.25 ? 'var(--good)' : 'var(--neutral)';
    return `<tr>
      <td>${esc(h.id)}<span class="name">${esc(h.name)}</span></td>
      <td>${fmt(w.gustMax24, 1, ' m/s')}</td>
      <td>${fmt(w.precip24, 1, ' mm')}</td>
      <td>${fmt(w.tempNow, 0, '°')}</td>
      <td title="Baseline ${h.baseline}">${f.count ?? '—'} <span class="name">${d.ratio == null ? '' : Math.round(d.ratio * 100) + '% of normal'}</span></td>
      <td><span class="pill" style="background:${color}">${d.score == null ? '—' : Math.round(d.score * 100)}</span></td>
    </tr>`;
  }).join('');

  // Signals
  const sigs = Object.entries(cfg.tickers)
    .filter(([, t]) => t.theme === 'airline')
    .map(([sym]) => airlineSignal(sym, cfg.hubs, disruption, quotes[sym]))
    .filter(Boolean);
  const heat = heatingSignal(cfg.heatingRegion, weather);
  if (heat) sigs.push(heat);

  $('#signals').innerHTML = sigs.map((s) => {
    const q = quotes[s.sym] || {};
    return `<article class="card ${s.tone}">
      <div class="row"><span class="sym">${esc(s.sym)}</span><span class="chg">${pct(q.changePct)}</span></div>
      <div class="label">${esc(s.label)}</div>
      <div class="meter" aria-label="Score ${Math.round(s.score * 100)} of 100"><span style="width:${Math.round(s.score * 100)}%"></span></div>
      <p class="note">${esc(s.note)}</p>
    </article>`;
  }).join('') || '<p class="fine">No signals yet.</p>';

  // Market table
  $('#market tbody').innerHTML = Object.entries(cfg.tickers).map(([sym, t]) => {
    const q = quotes[sym] || {};
    return `<tr><td>${esc(sym)}</td><td>${esc(t.name)}</td><td>${fmt(q.last, 2)}</td><td>${pct(q.changePct)}</td></tr>`;
  }).join('');
  $('#market-note').textContent = mk.updated
    ? `Snapshot from ${mk.source === 'ibkr' ? 'Interactive Brokers' : mk.source} at ${new Date(mk.updated).toLocaleString()}.`
    : 'Placeholder prices. Run the IBKR sync script to publish real quotes.';
}

load();
setInterval(load, 5 * 60e3);
