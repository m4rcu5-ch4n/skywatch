// Watchlist: airport hubs, the tickers they influence, and tuning knobs.
// Baselines are rough starting estimates of aircraft inside each hub's box at
// a busy time of day. Watch the dashboard for a few days and adjust them.

export const HUBS = [
  { id: 'YYZ', name: 'Toronto Pearson', lat: 43.6777, lon: -79.6248, baseline: 60, tickers: ['AC'] },
  { id: 'ORD', name: "Chicago O'Hare", lat: 41.9742, lon: -87.9073, baseline: 90, tickers: ['UAL', 'AAL'] },
  { id: 'ATL', name: 'Atlanta', lat: 33.6407, lon: -84.4277, baseline: 95, tickers: ['DAL'] },
  { id: 'JFK', name: 'New York JFK', lat: 40.6413, lon: -73.7781, baseline: 80, tickers: ['DAL', 'JBLU', 'AAL'] },
  { id: 'DFW', name: 'Dallas/Fort Worth', lat: 32.8998, lon: -97.0403, baseline: 85, tickers: ['AAL', 'LUV'] },
  { id: 'DEN', name: 'Denver', lat: 39.8561, lon: -104.6737, baseline: 75, tickers: ['UAL', 'LUV'] },
];

// Half-size of the box (degrees) around each hub used to count aircraft.
export const BOX_DEG = 0.5;

// Hubs whose temperatures drive the heating-demand (natural gas) signal.
export const HEATING_REGION = ['YYZ', 'ORD', 'JFK'];

// Tickers shown on the dashboard. `exchange` helps the IBKR sync pick the
// right contract; set `conid` to skip the lookup entirely.
export const TICKERS = {
  AC:   { name: 'Air Canada',          exchange: 'TSE',   theme: 'airline' },
  AAL:  { name: 'American Airlines',   exchange: 'SMART', theme: 'airline' },
  DAL:  { name: 'Delta Air Lines',     exchange: 'SMART', theme: 'airline' },
  UAL:  { name: 'United Airlines',     exchange: 'SMART', theme: 'airline' },
  LUV:  { name: 'Southwest Airlines',  exchange: 'SMART', theme: 'airline' },
  JBLU: { name: 'JetBlue',             exchange: 'SMART', theme: 'airline' },
  JETS: { name: 'US Global Jets ETF',  exchange: 'SMART', theme: 'airline' },
  UNG:  { name: 'US Natural Gas Fund', exchange: 'SMART', theme: 'energy' },
};

// How long the CDN may cache each feed (seconds). Keeps you inside free quotas:
// Windy's testing key allows 500 requests/day; each refresh costs one per hub.
export const CACHE_SECONDS = { weather: 1800, flights: 600 };
