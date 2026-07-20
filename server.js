/**
 * LocalPass — local dev + admin server.
 *
 * Zero dependencies. Serves the static public site and exposes a small
 * JSON API that the admin page uses to create / edit / delete cities.
 *
 * The public site only ever performs GETs, so it can be deployed to any
 * static host by copying index.html, render.js, styles.css and data/.
 * The write endpoints below exist for local authoring only.
 */

'use strict';

const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const CITY_DIR = path.join(DATA_DIR, 'cities');
const INDEX_FILE = path.join(DATA_DIR, 'cities.json');
const TOKEN_FILE = path.join(ROOT, '.admin-token');

const PORT = Number(process.env.PORT) || 5173;
const HOST = '127.0.0.1';

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/;

/* English is canonical and lives in data/cities/<slug>.json.
   Each translation lives in data/cities/<lang>/<slug>.json. Keeping them in a
   subdirectory means listCities()'s `.json` filter never sees them as cities. */
const LANGS = ['en', 'ka'];
const isLang = (l) => LANGS.includes(l);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
};

/* ── Admin token ──────────────────────────────────────────────
   Generated once, kept out of git. This gates writes on a
   loopback-only server; it is not a real auth system and is not
   meant to survive exposure to the internet. */
function loadToken() {
  try {
    const existing = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
    if (existing) return existing;
  } catch {
    /* first run */
  }
  const token = crypto.randomBytes(24).toString('base64url');
  fs.writeFileSync(TOKEN_FILE, token + '\n', { mode: 0o600 });
  return token;
}
const ADMIN_TOKEN = loadToken();

const TOKEN_BUF = Buffer.from(ADMIN_TOKEN, 'utf8');

function authorized(req) {
  const sent = req.headers['x-admin-token'];
  if (typeof sent !== 'string') return false;
  const buf = Buffer.from(sent, 'utf8');
  // Compare byte length, not string length: a same-length multibyte string
  // would otherwise reach timingSafeEqual and make it throw.
  if (buf.length !== TOKEN_BUF.length) return false;
  return crypto.timingSafeEqual(buf, TOKEN_BUF);
}

/* ── Helpers ─────────────────────────────────────────────────── */
function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(body);
}

function sendJson(res, status, obj) {
  send(res, status, JSON.stringify(obj, null, 2), {
    'Content-Type': 'application/json; charset=utf-8',
  });
}

function readBody(req, limit = 1_000_000) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(Object.assign(new Error('Payload too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const cityPath = (slug, lang = 'en') =>
  lang === 'en' ? path.join(CITY_DIR, `${slug}.json`) : path.join(CITY_DIR, lang, `${slug}.json`);

async function listCities() {
  const files = await fsp.readdir(CITY_DIR);
  const slugs = files.filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));

  const cities = [];
  for (const slug of slugs) {
    try {
      const city = JSON.parse(await fsp.readFile(cityPath(slug), 'utf8'));
      const names = { en: city.name };
      const countries = { en: city.country || '' };
      const blurbs = city.blurb ? { en: city.blurb } : {};

      // Pick up whatever translations exist beside it.
      for (const lang of LANGS.filter((l) => l !== 'en')) {
        try {
          const tr = JSON.parse(await fsp.readFile(cityPath(slug, lang), 'utf8'));
          if (tr.name) names[lang] = tr.name;
          if (tr.country) countries[lang] = tr.country;
          if (tr.blurb) blurbs[lang] = tr.blurb;
        } catch {
          /* no translation for this city yet — the site falls back to English */
        }
      }

      cities.push({
        slug,
        name: city.name,
        localName: city.localName || city.name,
        country: city.country || '',
        names,
        countries,
        langs: Object.keys(names),
        accent: city.theme?.accent || '#A93B2B',
        verified: city.verified || '',
        // Geography for the chooser map (optional; a city without it just
        // won't get a pin, only a chip).
        ...(typeof city.lat === 'number' ? { lat: city.lat } : {}),
        ...(typeof city.lng === 'number' ? { lng: city.lng } : {}),
        ...(Object.keys(blurbs).length ? { blurbs } : {}),
      });
    } catch (err) {
      console.warn(`  ! skipping ${slug}.json — ${err.message}`);
    }
  }
  cities.sort((a, b) => a.name.localeCompare(b.name));
  return cities;
}

/** Rebuild data/cities.json so the static site can discover cities without the API. */
async function writeIndex() {
  const cities = await listCities();
  await fsp.writeFile(INDEX_FILE, JSON.stringify({ cities }, null, 2) + '\n');
  return cities;
}

/** Minimum viable city. Anything else the renderer treats as optional. */
function validateCity(city) {
  const errors = [];
  if (!city || typeof city !== 'object' || Array.isArray(city)) return ['Body must be a JSON object'];
  if (!SLUG_RE.test(city.slug || '')) {
    errors.push('slug must be lowercase letters, digits and hyphens (1–48 chars)');
  }
  if (typeof city.name !== 'string' || !city.name.trim()) {
    errors.push('name is required and cannot be blank');
  }
  if (!city.currency || typeof city.currency.code !== 'string' || !city.currency.code.trim()) {
    errors.push('currency.code is required (e.g. "EUR")');
  }
  return errors;
}

/* ── Static files ────────────────────────────────────────────── */

/** Never served, even though they live in the web root. */
const PRIVATE = new Set(['server.js', 'package.json', 'package-lock.json', 'node_modules', 'tools', 'readme.md']);

async function serveStatic(req, res, urlPath) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, 'Method not allowed', { Allow: 'GET, HEAD' });
  }

  let rel;
  try {
    rel = decodeURIComponent(urlPath);
  } catch {
    return send(res, 400, 'Bad request'); // malformed percent-encoding
  }
  if (rel === '/' || rel === '') rel = '/index.html';
  if (rel === '/admin' || rel === '/admin/') rel = '/admin.html';

  // Contain every request inside ROOT, regardless of what the client sent.
  const full = path.resolve(ROOT, '.' + rel);
  if (full !== ROOT && !full.startsWith(ROOT + path.sep)) {
    return send(res, 403, 'Forbidden');
  }

  // Dotfiles (.admin-token, .gitignore, .git/…) and source files are not content.
  const segments = path.relative(ROOT, full).split(path.sep);
  if (segments.some((s) => s.startsWith('.') || PRIVATE.has(s.toLowerCase()))) {
    return send(res, 403, 'Forbidden');
  }

  try {
    const stat = await fsp.stat(full);
    if (stat.isDirectory()) return send(res, 404, 'Not found');
    const body = await fsp.readFile(full);
    send(res, 200, body, {
      'Content-Type': MIME[path.extname(full).toLowerCase()] || 'application/octet-stream',
    });
  } catch {
    send(res, 404, 'Not found');
  }
}

/* ── API ─────────────────────────────────────────────────────── */
async function handleApi(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean); // ['api','cities', slug?]
  const slug = parts[2];

  if (parts[1] !== 'cities') return sendJson(res, 404, { error: 'Unknown endpoint' });

  /* GET /api/cities — the switcher's menu */
  if (req.method === 'GET' && !slug) {
    return sendJson(res, 200, { cities: await listCities() });
  }

  /* GET /api/cities/:slug?lang=ka */
  if (req.method === 'GET' && slug) {
    if (!SLUG_RE.test(slug)) return sendJson(res, 400, { error: 'Bad slug' });
    const lang = url.searchParams.get('lang') || 'en';
    if (!isLang(lang)) return sendJson(res, 400, { error: `Unknown language "${lang}"` });
    try {
      const raw = await fsp.readFile(cityPath(slug, lang), 'utf8');
      return send(res, 200, raw, { 'Content-Type': 'application/json; charset=utf-8' });
    } catch {
      return sendJson(res, 404, { error: `No "${lang}" file for city "${slug}"` });
    }
  }

  /* Everything below writes. */
  if (!authorized(req)) {
    return sendJson(res, 401, { error: 'Missing or invalid X-Admin-Token' });
  }

  if (req.method === 'PUT' && slug) {
    if (!SLUG_RE.test(slug)) return sendJson(res, 400, { error: 'Bad slug' });
    const lang = url.searchParams.get('lang') || 'en';
    if (!isLang(lang)) return sendJson(res, 400, { error: `Unknown language "${lang}"` });

    let raw;
    try {
      raw = await readBody(req);
    } catch (err) {
      if (err.status === 413) return sendJson(res, 413, { error: 'City file too large (limit 1 MB)' });
      return sendJson(res, 400, { error: `Could not read body: ${err.message}` });
    }

    let city;
    try {
      city = JSON.parse(raw);
    } catch (err) {
      return sendJson(res, 400, { error: `Invalid JSON: ${err.message}` });
    }

    city.slug = slug;
    const errors = validateCity(city);
    if (errors.length) return sendJson(res, 422, { error: 'Validation failed', errors });

    // Write to a temp file then rename, so a crash mid-write can't leave a
    // half-written city that breaks the public site.
    const dest = cityPath(slug, lang);
    await fsp.mkdir(path.dirname(dest), { recursive: true });
    const tmp = dest + '.tmp';
    try {
      await fsp.writeFile(tmp, JSON.stringify(city, null, 2) + '\n');
      await fsp.rename(tmp, dest);
    } catch (err) {
      await fsp.rm(tmp, { force: true }); // don't strand the temp file
      throw err;
    }
    const cities = await writeIndex();

    console.log(`  ✓ saved ${path.relative(ROOT, dest)}`);
    return sendJson(res, 200, { ok: true, slug, lang, cities });
  }

  if (req.method === 'DELETE' && slug) {
    if (!SLUG_RE.test(slug)) return sendJson(res, 400, { error: 'Bad slug' });
    const all = await listCities();
    if (all.length <= 1) {
      return sendJson(res, 409, { error: 'Refusing to delete the last remaining city' });
    }
    try {
      await fsp.unlink(cityPath(slug));
    } catch {
      return sendJson(res, 404, { error: `No city "${slug}"` });
    }
    // Take the translations with it, or they become orphans.
    for (const lang of LANGS.filter((l) => l !== 'en')) {
      await fsp.rm(cityPath(slug, lang), { force: true });
    }
    const cities = await writeIndex();
    console.log(`  ✗ deleted ${slug} (all languages)`);
    return sendJson(res, 200, { ok: true, cities });
  }

  sendJson(res, 405, { error: 'Method not allowed' });
}

/* ── Server ──────────────────────────────────────────────────── */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url);
    } else {
      await serveStatic(req, res, url.pathname);
    }
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: 'Internal error' });
  }
});

(async () => {
  await fsp.mkdir(CITY_DIR, { recursive: true });
  const cities = await writeIndex();

  server.listen(PORT, HOST, () => {
    const line = '─'.repeat(58);
    console.log(`\n${line}`);
    console.log('  LocalPass');
    console.log(line);
    console.log(`  Site   →  http://${HOST}:${PORT}`);
    console.log(`  Admin  →  http://${HOST}:${PORT}/admin`);
    console.log(`  Token  →  ${ADMIN_TOKEN}`);
    console.log(`\n  Cities (${cities.length}): ${cities.map((c) => c.name).join(', ')}`);
    console.log(`${line}\n`);
  });
})();
