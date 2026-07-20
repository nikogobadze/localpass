#!/usr/bin/env node
/* Build the self-hosted world map used by the city chooser.
 *
 *   node tools/build-worldmap.js
 *
 * Same rule as the fonts and the maps links: nothing on the page may call an
 * outside service. So instead of embedding Leaflet + tiles (which phone home
 * on every load), we render a plain vector map from public-domain geography
 * once, at build time, and ship the resulting SVG.
 *
 * Source: Natural Earth 1:110m land (public domain), via the mirror below.
 * Projection: equirectangular (plate carrée) — 1° lon = 1° lat in pixels — so a
 * pin's position is trivial arithmetic (see project() in render.js). Antarctica
 * is cropped off; there are no cities down there and it wastes vertical space.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const SRC = 'https://raw.githubusercontent.com/martynafford/natural-earth-geojson/master/110m/physical/ne_110m_land.json';
const OUT = path.join(__dirname, '..', 'assets', 'worldmap.svg');

// Viewport: full longitude, latitude cropped to [LAT_TOP .. LAT_BOTTOM].
const W = 1000;
const LAT_TOP = 83;      // a little above the northern coasts
const LAT_BOTTOM = -56;  // just below the tip of South America; cuts Antarctica
const SCALE = W / 360;   // pixels per degree
const H = Math.round((LAT_TOP - LAT_BOTTOM) * SCALE);

const px = (lon) => +( (lon + 180) * SCALE ).toFixed(1);
const py = (lat) => +( (LAT_TOP - lat) * SCALE ).toFixed(1);

const get = (url) =>
  new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return resolve(get(res.headers.location));
        }
        if (res.statusCode !== 200) return reject(new Error(`${res.statusCode} for ${url}`));
        const c = [];
        res.on('data', (d) => c.push(d));
        res.on('end', () => resolve(Buffer.concat(c).toString('utf8')));
      })
      .on('error', reject);
  });

/* One SVG subpath per ring. Points off the cropped viewport are still drawn
   (clipping is left to the SVG viewBox); we only skip rings that are entirely
   below the crop, i.e. Antarctica. */
function ring(coords) {
  if (coords.every(([, lat]) => lat < LAT_BOTTOM)) return '';
  let d = '';
  coords.forEach(([lon, lat], i) => {
    d += (i ? 'L' : 'M') + px(lon) + ' ' + py(lat) + ' ';
  });
  return d + 'Z';
}

(async () => {
  const gj = JSON.parse(await get(SRC));
  const feats = gj.type === 'FeatureCollection' ? gj.features : [gj];
  let d = '';
  for (const f of feats) {
    const g = f.geometry || f;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    for (const poly of polys) for (const r of poly) d += ring(r);
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="worldmap-svg" ` +
    `role="img" aria-label="World map" preserveAspectRatio="xMidYMid meet">` +
    `<path class="land" d="${d.trim()}"/></svg>\n`;

  fs.writeFileSync(OUT, svg);
  console.log(`✓ assets/worldmap.svg  ${(Buffer.byteLength(svg) / 1024).toFixed(0)} KB  viewBox 0 0 ${W} ${H}`);
  console.log(`  projection: equirectangular · lat crop [${LAT_TOP}, ${LAT_BOTTOM}]`);
  console.log(`  pin(lon,lat) => x=(lon+180)*${SCALE.toFixed(4)}  y=(${LAT_TOP}-lat)*${SCALE.toFixed(4)}`);
})();
