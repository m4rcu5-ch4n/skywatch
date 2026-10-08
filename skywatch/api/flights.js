import { HUBS, CACHE_SECONDS } from '../lib/config.js';
import { getHubTraffic } from '../lib/flights.js';

export default async function handler(req, res) {
  const results = await Promise.allSettled(HUBS.map(getHubTraffic));
  const hubs = results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : { hub: HUBS[i].id, error: r.reason.message });
  res.setHeader('Cache-Control', `s-maxage=${CACHE_SECONDS.flights}, stale-while-revalidate=120`);
  res.status(200).json({ updated: new Date().toISOString(), demo: !process.env.FR24_API_KEY, hubs });
}
