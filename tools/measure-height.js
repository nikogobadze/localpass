/* Measure real rendered page height per city, and check for horizontal overflow. */
const puppeteer = require('puppeteer');
const BASE = 'http://127.0.0.1:5173/';
const VW = 1440, VH = 900;

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: VW, height: VH });

  const label = process.argv[2] || 'current';
  const out = {};

  for (const slug of ['prague', 'vienna', 'ljubljana']) {
    await page.goto(BASE + '?city=' + slug, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    // Force every reveal + lazy image into its final state so height is honest.
    await page.evaluate(async () => {
      document.querySelectorAll('.reveal').forEach((e) => e.classList.add('in'));
      document.querySelectorAll('img[loading="lazy"]').forEach((i) => i.setAttribute('loading', 'eager'));
      await new Promise((r) => setTimeout(r, 400));
    });
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

    const m = await page.evaluate(() => {
      const de = document.documentElement;
      const overflow = de.scrollWidth > de.clientWidth + 1;
      const secs = [...document.querySelectorAll('main > section.sec')].map((s) => ({
        id: s.id, h: Math.round(s.getBoundingClientRect().height),
      }));
      return { height: de.scrollHeight, overflow, scrollW: de.scrollWidth, clientW: de.clientWidth, secs };
    });
    out[slug] = m;
    const screens = (m.height / 900).toFixed(1);
    console.log(`${label.padEnd(8)} ${slug.padEnd(10)} ${String(m.height).padStart(6)}px  ${screens.padStart(4)} screens  h-overflow:${m.overflow ? 'YES ' + m.scrollW + '>' + m.clientW : 'no'}`);
    if (process.env.SECTIONS) console.log('          ' + m.secs.map((s) => `${s.id}=${s.h}`).join(' '));
  }

  require('fs').writeFileSync(`${__dirname}/height-${label}.json`, JSON.stringify(out, null, 2));
  await browser.close();
})();
