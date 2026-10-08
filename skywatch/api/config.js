// Exposes the public watchlist (no secrets) so the browser can label things.
import { HUBS, TICKERS, HEATING_REGION } from '../lib/config.js';

export default function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=3600');
  res.status(200).json({ hubs: HUBS, tickers: TICKERS, heatingRegion: HEATING_REGION });
}
