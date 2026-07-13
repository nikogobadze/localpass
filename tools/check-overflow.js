/* `overflow:clip` on .sec silently hides a card that overflows its grid.
   Check every grid's own scrollWidth, and every child's right edge. */
const puppeteer = require('puppeteer');
const BASE = 'http://127.0.0.1:5173/';

const GRIDS = ['.ess-top', '.facts-grid', '.hoods', '.hotels-grid', '.places-grid', '.sights', '.free-grid', '.phrases'];

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  let bad = 0;

  for (const width of [1440, 1280, 1100, 900, 700, 480, 380]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 900 });
    await page.goto(BASE + '?city=prague', { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      document.querySelectorAll('.reveal').forEach((e) => e.classList.add('in'));
      document.querySelectorAll('img[loading="lazy"]').forEach((i) => i.setAttribute('loading', 'eager'));
    });
    await page.evaluate(() => new Promise((r) => setTimeout(r, 500)));

    const problems = await page.evaluate((GRIDS) => {
      const out = [];
      const de = document.documentElement;
      if (de.scrollWidth > de.clientWidth + 1) out.push(`document ${de.scrollWidth} > ${de.clientWidth}`);

      for (const sel of GRIDS) {
        document.querySelectorAll(sel).forEach((g) => {
          if (g.scrollWidth > g.clientWidth + 1) out.push(`${sel} scrollW ${g.scrollWidth} > clientW ${g.clientWidth}`);
          const gr = g.getBoundingClientRect();
          [...g.children].forEach((c, i) => {
            const cr = c.getBoundingClientRect();
            if (cr.right > gr.right + 1.5) out.push(`${sel} child ${i} right ${Math.round(cr.right)} > grid right ${Math.round(gr.right)}`);
            if (cr.width < 40) out.push(`${sel} child ${i} collapsed to ${Math.round(cr.width)}px`);
          });
        });
      }
      return out;
    }, GRIDS);

    const tag = String(width).padStart(4) + 'px';
    if (problems.length) { bad += problems.length; console.log(`✗ ${tag}`); problems.forEach((p) => console.log('    ' + p)); }
    else console.log(`✓ ${tag}  no grid overflow, no collapsed cards`);
    await page.close();
  }

  await browser.close();
  console.log(bad ? `\nFAIL — ${bad} problems` : '\nPASS — nothing clipped at any width');
  process.exit(bad ? 1 : 0);
})();
