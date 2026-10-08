// Local development server: serves public/ and runs api/*.js the way Vercel does.
// No dependencies. Run with `npm start`, then open http://localhost:3000
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

// Minimal .env loader
if (existsSync(path.join(root, '.env'))) {
  for (const line of readFileSync(path.join(root, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (o) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); };

  try {
    const api = url.pathname.match(/^\/api\/([a-z0-9-]+)$/);
    if (api) {
      const file = path.join(root, 'api', `${api[1]}.js`);
      if (!existsSync(file)) return res.status(404).json({ error: 'Not found' });
      req.query = Object.fromEntries(url.searchParams);
      const mod = await import(file);
      return await mod.default(req, res);
    }
    let p = path.normalize(path.join(root, 'public', decodeURIComponent(url.pathname)));
    if (!p.startsWith(path.join(root, 'public'))) return res.status(403).end();
    if ((await stat(p).catch(() => null))?.isDirectory()) p = path.join(p, 'index.html');
    const body = await readFile(p);
    res.setHeader('Content-Type', TYPES[path.extname(p)] || 'application/octet-stream');
    res.end(body);
  } catch (e) {
    if (e.code === 'ENOENT') return res.status(404).end('Not found');
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}).listen(PORT, () => console.log(`Skywatch running at http://localhost:${PORT}`));
