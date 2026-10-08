# Skywatch

A small public website that turns **Windy** weather forecasts and **Flightradar24** air-traffic counts into simple, transparent signals for airline and natural-gas stocks, with prices from **Interactive Brokers**.

> Signals are heuristics for research and education, not financial advice.

It works immediately with **demo data**. Each feed switches to live data as soon as you add its key.

## How it fits together

```
Browser ──► /api/weather  ──► Windy Point Forecast API   (key stays on the server)
        ──► /api/flights  ──► Flightradar24 API           (key stays on the server)
        ──► /data/market.json  ◄── git push ◄── scripts/ibkr-sync.mjs ◄── IBKR Gateway on YOUR computer
```

Interactive Brokers' Web API for individual accounts runs through a gateway program that you sign into on your own machine. Exposing that to a public website would put your brokerage session on the internet. Instead, a sync script on your computer reads quotes from the gateway and commits a small JSON snapshot to GitHub, which redeploys the site. No IBKR login or account details ever reach the public site.

## 1. Run it locally (2 minutes)

Requires Node.js 18 or newer. No `npm install` needed; there are no dependencies.

```bash
npm start          # http://localhost:3000
npm test           # signal math + Windy parsing tests
```

## 2. Put it on GitHub

```bash
git init -b main
git add .
git commit -m "Initial Skywatch site"
# create an empty repo on github.com named skywatch, then:
git remote add origin https://github.com/<you>/skywatch.git
git push -u origin main
```

`.env` is in `.gitignore`. Never commit keys.

## 3. Deploy (free) on Vercel

1. Sign in at vercel.com with GitHub → **Add New → Project** → import `skywatch`.
2. Framework preset: **Other**. No build command. Deploy.
3. Every `git push` to `main` redeploys automatically.

Netlify or Cloudflare Pages also work, but the `api/` folder uses Vercel's function format.

## 4. Add the API keys

Set these in Vercel → Project → **Settings → Environment Variables** (and in a local `.env`, copied from `.env.example`), then redeploy.

| Variable | Where to get it | Cost |
|---|---|---|
| `WINDY_API_KEY` | api.windy.com/keys → **Point Forecast** key | Free testing tier: 500 requests/day, returns slightly shuffled data (fine for development). Professional tier is paid. |
| `FR24_API_KEY` | fr24api.flightradar24.com → subscribe → API token | Paid subscription, billed in credits. |

Caching (`lib/config.js → CACHE_SECONDS`) keeps you inside quotas: weather refreshes every 30 min (6 hubs × 48 = 288 calls/day), flights every 10 min. Raise these if you're near limits.

## 5. Interactive Brokers quotes

1. You need an IBKR account (a **paper trading** account works) and market-data subscriptions for the tickers you want.
2. Download the **Client Portal Gateway** from IBKR's Web API docs, unzip it, and start it:
   `bin/run.sh root/conf.yaml` (macOS/Linux) or `bin\run.bat root\conf.yaml` (Windows).
3. Open https://localhost:5000 and log in (accept the self-signed certificate warning).
4. In this project:

```bash
npm run sync:ibkr                       # writes public/data/market.json
npm run sync:ibkr -- --push             # also commits and pushes → site redeploys
npm run sync:ibkr -- --push --every 15  # keep running, update every 15 minutes
```

Gateway sessions time out, so expect to log in again roughly daily.

## 6. Tune the signals

Everything lives in two files:

- `lib/config.js` — hubs, which tickers each hub affects, traffic **baselines**, cache times. Baselines are starting estimates; watch the "% of normal" column for a few days and adjust.
- `public/js/signals.js` — the scoring:
  - **Hub disruption (0–100)** = 60% weather (gusts over 12 m/s, rain, snow) + 40% traffic shortfall vs baseline.
  - **Airline signal** = average disruption across that airline's hubs → *Clear skies* / *Mixed* / *Headwind*. Flags when price moves against operations.
  - **Heating demand** = heating degree days (base 18 °C) from the 72h average temperature in Toronto, Chicago and New York → natural gas (UNG).

## Project layout

```
api/            serverless endpoints (weather, flights, config)
lib/            API clients, config, demo data
public/         the website (HTML, CSS, JS, data/market.json)
scripts/        ibkr-sync.mjs (runs on your computer only)
server.mjs      local dev server
test/           node:test unit tests
```

## Notes and limits

- The Flightradar24 count endpoint's response shape is parsed defensively; if you see 0 aircraft everywhere with a valid key, check the raw response at `/api/flights` and adjust `lib/flights.js`.
- The wind map is Windy's free embed and needs no key.
- Respect each provider's terms, especially on redistributing data publicly. Windy and Flightradar24 both require attribution (included in the footer).
