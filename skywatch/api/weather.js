import { HUBS, CACHE_SECONDS } from '../lib/config.js';
import { getHubWeather } from '../lib/weather.js';

export default async function handler(req, res) {
  const results = await Promise.allSettled(HUBS.map(getHubWeather));
  const hubs = results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : { hub: HUBS[i].id, error: r.reason.message });
  res.setHeader('Cache-Control', `s-maxage=${CACHE_SECONDS.weather}, stale-while-revalidate=300`);
  res.status(200).json({ updated: new Date().toISOString(), demo: !process.env.WINDY_API_KEY, hubs });
}
