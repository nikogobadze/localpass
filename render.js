/**
 * LocalPass — renderer.
 *
 * Builds the whole page from one city JSON. Reads only static files, so the
 * public site works on any host with no server behind it.
 *
 * Trust model: city JSON is authored by the site owner (repo file or /admin),
 * and prose fields are injected as HTML so copy can carry <strong>, <em> and
 * links. Treat a city file as trusted content, exactly like a template.
 */
(function () {
  'use strict';

  const BRAND = 'LocalPass';
  const SECTION_IDS = ['essentials', 'arrive', 'stay', 'eat', 'see', 'free', 'speak'];

  /* Every UI string that isn't city data. Kept plain in Georgian on purpose:
     shorter clauses are easier to get right than the English voice. */
  const UI = {
    en: {
      nav: ['Essentials', 'Arrive', 'Stay', 'Eat', 'See', 'Free', 'Speak'],
      skip: 'Skip to content',
      verified: (d) => `Prices checked ${d}`,
      badges: ['No signup', 'No ads', 'No affiliate links'],
      startReading: 'Start reading',
      ratesSummary: "Rates are approximate — set today's",
      ratesNote: 'We ship sensible defaults, but exchange rates move daily and we refuse to pretend otherwise. Check a live rate before a large purchase.',
      copied: (t) => `"${t}" copied to your clipboard`,
      footBlurb: 'A single page. No account, no cookie banner, no affiliate links, nothing tracking you. We make no money if you book a hotel, and we have therefore recommended no hotels.',
      sourcesHead: 'Where these numbers come from',
      photosHead: 'Photographs',
      photosBlurb: (n) => `All ${n} photographs on this page come from Wikimedia Commons under a free licence. We did not take them, and we do not own them.`,
      legal: (d, city) => `Last verified ${d} · Not affiliated with the City of ${city} or any business named on this page.`,
      loadFail: (slug) => `Couldn't load ${slug}`,
      loadFailBody: (slug, err) => `The file <code>data/cities/${slug}.json</code> is missing or invalid (${err}).`,
      noCities: 'No cities yet',
      langLabel: 'Language',
      fallbackNote: null,
      essentialsTitle: 'The essentials',
      essentialsLede: 'What money to carry, what it converts to, and how to get in from the airport.',
      goodToKnow: 'Good to know',
      freeLede: 'A surprising amount of the best of this city costs nothing. These are the free things genuinely worth your time.',
      carPrev: 'Previous',
      carNext: 'More options',
      expandHint: 'Tap to read the full details',
      closeLabel: 'Close',
      mapLink: 'Open in Maps',
      mapSights: 'See the sights on a map',
      chooseTitle: 'Where are you going?',
      chooseLede: (n) => `${n} cities so far — tap a pin to see what's inside. Real local prices, no tourist markup.`,
      chooseCta: (city) => `Open the ${city} guide`,
      chooseWhole: 'Whole world',
      chooseFocus: 'Back to the cities',
      chooseHint: 'Choose a city',
      backToMap: 'All cities',
    },
    ka: {
      nav: ['მთავარი', 'ჩასვლა', 'დარჩენა', 'საჭმელი', 'სანახავი', 'უფასო', 'ენა'],
      skip: 'პირდაპირ ტექსტზე გადასვლა',
      verified: (d) => `ფასები შემოწმდა: ${d}`,
      badges: ['რეგისტრაცია არ არის', 'რეკლამა არ არის', 'აფილირებული ბმულები არ არის'],
      startReading: 'დაიწყეთ კითხვა',
      ratesSummary: 'კურსი მიახლოებითია — შეცვალეთ დღევანდელით',
      ratesNote: 'ჩვენ ვწერთ გონივრულ საწყის კურსს, მაგრამ ვალუტის კურსი ყოველდღე იცვლება. დიდი შესყიდვის წინ შეამოწმეთ დღევანდელი კურსი.',
      copied: (t) => `„${t}“ დაკოპირდა`,
      footBlurb: 'ერთი გვერდი. ანგარიში არ გჭირდებათ. ქუქიების ფანჯარა არ არის, რეკლამა არ არის, თვალყურს არავინ გადევნებთ. სასტუმროს დაჯავშნაზე ფულს არ ვიღებთ და სწორედ ამიტომ სასტუმროებს არ გირჩევთ.',
      sourcesHead: 'საიდან არის ეს ციფრები',
      photosHead: 'ფოტოები',
      photosBlurb: (n) => `ამ გვერდზე ყველა ${n} ფოტო აღებულია Wikimedia Commons-იდან, თავისუფალი ლიცენზიით. ეს ფოტოები ჩვენ არ გადაგვიღია და ჩვენი არ არის.`,
      legal: (d, city) => `ბოლოს შემოწმდა: ${d} · ჩვენ არ ვართ დაკავშირებული ${city}-ის მერიასთან ან ამ გვერდზე ნახსენებ არცერთ ბიზნესთან.`,
      loadFail: (slug) => `${slug} ვერ ჩაიტვირთა`,
      loadFailBody: (slug, err) => `ფაილი <code>data/cities/${slug}.json</code> აკლია ან დაზიანებულია (${err}).`,
      noCities: 'ქალაქები ჯერ არ არის',
      langLabel: 'ენა',
      fallbackNote: 'ამ ქალაქის ქართული თარგმანი ჯერ არ არის. ტექსტი ინგლისურად ჩანს.',
      essentialsTitle: 'მთავარი',
      essentialsLede: 'რა ვალუტა იქონიოთ, რას უდრის ის და როგორ ჩახვიდეთ აეროპორტიდან.',
      goodToKnow: 'კარგია, იცოდეთ',
      freeLede: 'ამ ქალაქში საუკეთესოს გასაკვირად დიდი ნაწილი უფასოა. აი, უფასო ადგილები, რომლებიც ნამდვილად ღირს.',
      carPrev: 'წინა',
      carNext: 'მეტი ვარიანტი',
      expandHint: 'დააჭირეთ სრული ინფორმაციისთვის',
      closeLabel: 'დახურვა',
      mapLink: 'რუკაზე ნახვა',
      mapSights: 'ნახეთ ღირსშესანიშნაობები რუკაზე',
      chooseTitle: 'სად მიემგზავრებით?',
      chooseLede: (n) => `${n} ქალაქი ჯერ — დააჭირეთ პინს, რომ ნახოთ რა არის შიგნით. რეალური ადგილობრივი ფასები, ტურისტული ზედნადების გარეშე.`,
      chooseCta: (city) => `გახსენით ${city}-ის გზამკვლევი`,
      chooseWhole: 'მთელი მსოფლიო',
      chooseFocus: 'ქალაქებთან დაბრუნება',
      chooseHint: 'აირჩიეთ ქალაქი',
      backToMap: 'ყველა ქალაქი',
    },
  };

  const STORE_KEY = 'honestguide.city';
  const LANG_KEY = 'honestguide.lang';
  const THEME_KEY = 'localpass.theme';
  let THEME = 'light';           // set from storage / OS in boot(), before first paint
  let CURRENT_THEME = {};        // the active city's palette, so theme swaps recompute --wash
  const app = document.getElementById('app');

  let LANG = 'en';
  const t = () => UI[LANG];
  /* Sections are id + translated label, rebuilt whenever the language changes. */
  const sections = () => SECTION_IDS.map((id, i) => ({ id, label: t().nav[i] }));

  /* Default silhouette for a city whose art.skyline hasn't been drawn yet. */
  const FALLBACK_SKYLINE = `
    <g class="sky-mid">
      <rect x="180" y="180" width="80" height="60"/><path d="M172 182 L220 152 L268 182 Z"/>
      <rect x="900" y="188" width="70" height="52"/><path d="M892 190 L935 162 L978 190 Z"/>
    </g>
    <g class="sky-near">
      <rect x="0" y="196" width="70" height="44"/><path d="M-6 198 L35 172 L76 198 Z"/>
      <rect x="90" y="186" width="30" height="54"/><path d="M84 188 L105 160 L126 188 Z"/>
      <rect x="300" y="192" width="90" height="48"/><path d="M292 194 L345 166 L398 194 Z"/>
      <rect x="420" y="150" width="90" height="90"/><path d="M412 152 L465 116 L518 152 Z"/>
      <rect x="452" y="60" width="16" height="58"/><path d="M447 62 L460 24 L473 62 Z"/>
      <circle cx="460" cy="20" r="3.5"/>
      <rect x="560" y="200" width="60" height="40"/><path d="M552 202 L590 178 L628 202 Z"/>
      <rect x="650" y="184" width="40" height="56"/><path d="M644 186 L670 160 L696 186 Z"/>
      <rect x="740" y="198" width="110" height="42"/><path d="M732 200 L795 172 L858 200 Z"/>
      <rect x="1000" y="194" width="60" height="46"/><path d="M992 196 L1030 170 L1068 196 Z"/>
      <rect x="1090" y="204" width="50" height="36"/><path d="M1082 206 L1115 184 L1148 206 Z"/>
      <rect x="1150" y="190" width="50" height="50"/>
    </g>`;

  /* ── DOM helpers ─────────────────────────────────────────── */
  const h = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const svgEl = (tag, attrs = {}) => {
    const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    return n;
  };
  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ── Decorative shapes ───────────────────────────────────
     Purely ornamental, aria-hidden, and dropped below 1240px. */
  const SHAPES = {
    ring: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="none" stroke="var(--pop)" stroke-width="7" opacity=".28"/></svg>`,
    arc: `<svg viewBox="0 0 100 100"><path d="M6 94 A44 44 0 0 1 94 94 Z" fill="var(--gold)" opacity=".3"/></svg>`,
    dots: `<svg viewBox="0 0 100 100">${Array.from({ length: 36 }, (_, i) =>
      `<circle cx="${8 + (i % 6) * 17}" cy="${8 + Math.floor(i / 6) * 17}" r="3" fill="var(--accent)" opacity=".26"/>`
    ).join('')}</svg>`,
    squiggle: `<svg viewBox="0 0 120 40"><path d="M2 20 q15 -18 30 0 t30 0 t30 0 t26 0" fill="none" stroke="var(--accent)" stroke-width="6" stroke-linecap="round" opacity=".3"/></svg>`,
    star: `<svg viewBox="0 0 100 100"><path d="M50 4 L58 42 L96 50 L58 58 L50 96 L42 58 L4 50 L42 42 Z" fill="var(--gold)" opacity=".38"/></svg>`,
    tri: `<svg viewBox="0 0 100 100"><path d="M50 8 L94 88 L6 88 Z" fill="none" stroke="var(--good)" stroke-width="7" stroke-linejoin="round" opacity=".3"/></svg>`,
    blob: `<svg viewBox="0 0 100 100"><path d="M52 6c22 0 42 16 42 40S72 96 48 94 4 72 6 46 30 6 52 6z" fill="var(--pop)" opacity=".18"/></svg>`,
  };

  /* Which ornaments sit in which section. */
  const DECOR = {
    essentials: [['ring', 'deco-tr'], ['dots', 'deco-bl']],
    arrive: [['arc', 'deco-tr']],
    stay: [['squiggle', 'deco-tr']],
    eat: [['dots', 'deco-tl'], ['ring', 'deco-br']],
    see: [['tri', 'deco-tr']],
    free: [['blob', 'deco-tl'], ['star', 'deco-br']],
    speak: [['star', 'deco-tl'], ['arc', 'deco-br']],
  };

  function deco(kind, where) {
    const s = h('span', `deco ${where}`, SHAPES[kind]);
    s.setAttribute('aria-hidden', 'true');
    return s;
  }

  /* ── Photography ─────────────────────────────────────────
     Every image is a freely-licensed Commons file, credited in the footer.
     aspect-ratio in CSS reserves the box, so nothing shifts as they load. */
  /* setAttribute, not property assignment: `loading` and `decoding` are
     reflected attributes, and not every engine reflects a property write. */
  function photo(src, alt) {
    const img = h('img');
    img.setAttribute('src', src);
    img.setAttribute('alt', alt || '');
    img.setAttribute('loading', 'lazy');
    img.setAttribute('decoding', 'async');
    return img;
  }

  function bandFigure(band) {
    if (!band?.src) return null;
    const fig = h('figure', 'photo-band reveal');
    fig.append(photo(band.src, band.alt));
    if (band.caption) fig.append(h('figcaption', null, band.caption));
    return fig;
  }

  /* `caption` matters most on the restaurant cards: a photo above a named
     address reads as a photo OF that address. The caption says when it isn't. */
  function cardImage(image) {
    if (!image?.src) return null;
    const fig = h('figure', 'card-figure');
    fig.append(photo(image.src, image.alt));
    if (image.caption) fig.append(h('figcaption', null, image.caption));
    return fig;
  }

  /* ── Expandable cards ────────────────────────────────────
     Carousel/grid cards clamp their prose so a row fits a laptop screen.
     Marking a card expandable lets a tap open it full-size in the overlay
     (see bindExpand): the full text is already in the DOM, just clipped. */
  const EXPAND_ICON =
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9 2h5v5M14 2 8.5 7.5M7 14H2V9M2 14l5.5-5.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function markExpandable(card) {
    card.classList.add('expandable');
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    const title = (card.querySelector('h2, h3, h4, dt')?.textContent || '').trim();
    card.setAttribute('aria-label', title ? `${title} — ${t().expandHint}` : t().expandHint);
    card.setAttribute('title', t().expandHint);
    const cue = h('span', 'expand-cue', EXPAND_ICON);
    cue.setAttribute('aria-hidden', 'true');
    card.append(cue);
    return card;
  }

  /* ── Expanded-only detail ────────────────────────────────
     Content that belongs in the popover, not the thumbnail: a structured
     label/value list, tag chips, and any extra prose. Everything is optional,
     so a card with nothing extra simply renders no .card-more. */
  function detailList(rows) {
    const clean = (rows || []).filter((r) => r && r.value != null && r.value !== '');
    if (!clean.length) return null;
    const dl = h('dl', 'detail-list');
    clean.forEach((r) => {
      dl.append(h('dt', null, esc(r.label)));
      const dd = h('dd');
      if (r.html) dd.innerHTML = r.value; else dd.textContent = r.value;
      dl.append(dd);
    });
    return dl;
  }
  function tagRow(tags) {
    if (!Array.isArray(tags) || !tags.length) return null;
    const ul = h('ul', 'card-tags');
    tags.forEach((s) => ul.append(h('li', null, esc(s))));
    return ul;
  }
  /* Build a .card-more from a list of nodes; returns null if all are empty so
     callers can `const m = moreBlock(...); if (m) card.append(m);`. */
  function moreBlock(...nodes) {
    const kids = nodes.flat().filter(Boolean);
    if (!kids.length) return null;
    const box = h('div', 'card-more');
    kids.forEach((n) => box.append(n));
    return box;
  }
  /* Free-authored extra prose for the popover: an optional heading + one or
     more paragraphs, taken from item.more (string or string[]). */
  function moreProse(more) {
    if (!more) return [];
    const paras = Array.isArray(more) ? more : [more];
    return paras.filter(Boolean).map((p) => h('p', 'more-p', p));
  }

  /* ── Maps ────────────────────────────────────────────────
     Plain Google Maps URLs (no key, no account, nothing embedded) — they open
     in a new tab only when tapped, so the page itself still loads nothing and
     tracks nothing. `search` drops a pin on one place; `dir` shows several. */
  const PIN_ICON =
    '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M8 1.4c-2.6 0-4.6 2-4.6 4.6 0 3.3 4.6 8.6 4.6 8.6s4.6-5.3 4.6-8.6C12.6 3.4 10.6 1.4 8 1.4z" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="6" r="1.7" fill="currentColor"/></svg>';
  const mapSearchUrl = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  const mapDirUrl = (stops) => `https://www.google.com/maps/dir/${stops.map(encodeURIComponent).join('/')}`;

  /* A place → its location on the map. Name + city (plus a street where we have
     one) is enough for Maps to resolve the real spot. */
  function mapLinkNode(parts) {
    const q = parts.filter(Boolean).join(', ');
    const a = h('a', 'map-link');
    a.href = mapSearchUrl(q);
    a.target = '_blank';
    a.rel = 'noopener';
    a.innerHTML = `${PIN_ICON}<span>${esc(t().mapLink)}</span> ↗`;
    return a;
  }

  /* ── Section shell ───────────────────────────────────────── */
  function section(id, num, title, lede, extraClass = '') {
    const sec = h('section', `sec ${extraClass}`);
    sec.id = id;
    (DECOR[id] || []).forEach(([kind, where]) => sec.append(deco(kind, where)));

    const wrap = h('div', 'wrap');
    const head = h('div', 'sec-head reveal');
    head.append(h('span', 'sec-num', num), h('h2', null, title || ''));
    if (lede) head.append(h('p', 'sec-lede', lede));
    wrap.append(head);
    sec.append(wrap);
    return { sec, wrap };
  }

  /* ── Hero ────────────────────────────────────────────────── */

  /* An engraved sunburst: a disc setting behind the skyline, ringed with
     hairlines and a fan of fine rays. Drawn, not blurred. */
  function heroArt() {
    const CX = 300, CY = 300;
    const RAY_IN = 198, RAY_OUT = 286, COUNT = 48;

    let rays = '';
    for (let i = 0; i < COUNT; i++) {
      const a = (i / COUNT) * Math.PI * 2;
      // Alternate ray length — an even fan reads mechanical, this reads engraved.
      const out = RAY_OUT - (i % 2 ? 26 : 0);
      const cos = Math.cos(a), sin = Math.sin(a);
      rays += `<line x1="${(CX + cos * RAY_IN).toFixed(1)}" y1="${(CY + sin * RAY_IN).toFixed(1)}"` +
              ` x2="${(CX + cos * out).toFixed(1)}" y2="${(CY + sin * out).toFixed(1)}"/>`;
    }

    const svg = svgEl('svg', { class: 'hero-art', viewBox: '0 0 600 600', 'aria-hidden': 'true' });
    svg.innerHTML = `
      <defs>
        <!-- Stop colours live in CSS: var() in a presentation attribute is
             not reliably supported, but a CSS stop-color rule always is. -->
        <radialGradient id="discFill" cx="50%" cy="42%" r="62%">
          <stop class="disc-a" offset="0%"/>
          <stop class="disc-b" offset="100%"/>
        </radialGradient>
      </defs>
      <g class="art-rings">
        <circle cx="${CX}" cy="${CY}" r="294" class="art-ring-dash"/>
        <circle cx="${CX}" cy="${CY}" r="256"/>
        <circle cx="${CX}" cy="${CY}" r="198"/>
      </g>
      <g class="art-rays">${rays}</g>
      <circle class="art-disc" cx="${CX}" cy="${CY}" r="190" fill="url(#discFill)"/>`;
    return svg;
  }

  function renderHero(city) {
    const hero = h('section', 'hero');
    hero.id = 'top';
    hero.append(heroArt(), h('div', 'hero-grain'));

    const wordmark = city.hero?.title || city.localName || city.name;
    const title = h('h1', 'hero-title', esc(wordmark));

    const inner = h('div', 'hero-inner');
    inner.append(
      h('p', 'eyebrow', esc(city.hero?.eyebrow || `${city.country}`)),
      title,
      h('div', 'hero-rule', '<span></span><b>◆</b><span></span>'),
      h('p', 'hero-sub', city.hero?.sub || '')
    );

    const meta = h('div', 'hero-meta');
    meta.innerHTML = `
      <span class="verified">
        <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M6.3 11.4 3.2 8.3l1.1-1.1 2 2 4.4-4.4 1.1 1.1z" fill="currentColor"/><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>
        ${esc(t().verified(city.verified || '—'))}
      </span>
      ${t().badges.map((b) => `<span class="dot">·</span><span>${esc(b)}</span>`).join('')}`;
    inner.append(meta);

    const scroll = h('a', 'hero-scroll');
    scroll.href = `#${SECTION_IDS[0]}`;
    scroll.innerHTML = `${esc(t().startReading)} <svg viewBox="0 0 12 20" width="10" height="16" aria-hidden="true"><path d="M6 1v17m0 0-4.5-4.5M6 18l4.5-4.5" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"/></svg>`;
    inner.append(scroll);

    hero.append(inner);

    const sky = svgEl('svg', {
      class: 'skyline',
      viewBox: '0 0 1200 240',
      preserveAspectRatio: 'xMidYMax slice',
      'aria-hidden': 'true',
    });
    sky.innerHTML = city.art?.skyline || FALLBACK_SKYLINE;
    hero.append(sky);
    return hero;
  }

  /* ── Carousel ────────────────────────────────────────────
     A horizontal, swipeable row of cards with prev/next arrows, so a section
     can hold more options without getting taller. Cards keep their normal
     markup; the helper just wraps them and strips the vertical `reveal` (a
     card scrolled off to the right would otherwise stay invisible). */
  function carousel(cards) {
    const wrap = h('div', 'carousel reveal');
    const prev = h('button', 'car-arrow car-prev');
    const next = h('button', 'car-arrow car-next');
    prev.type = next.type = 'button';
    prev.innerHTML = next.innerHTML = '';
    prev.setAttribute('aria-label', t().carPrev);
    next.setAttribute('aria-label', t().carNext);
    prev.append(arrowIcon(true));
    next.append(arrowIcon(false));

    const track = h('div', 'car-track');
    cards.forEach((c) => {
      c.classList.remove('reveal', 'in');
      markExpandable(c);
      track.append(c);
    });
    wrap.append(prev, track, next);
    return wrap;
  }

  function arrowIcon(left) {
    const s = svgEl('svg', { viewBox: '0 0 10 16', width: '11', height: '16', 'aria-hidden': 'true' });
    s.innerHTML = left
      ? '<path d="M8 1 1 8l7 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'
      : '<path d="M2 1l7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>';
    return s;
  }

  function bindCarousels() {
    document.querySelectorAll('.carousel').forEach((car) => {
      const track = car.querySelector('.car-track');
      const prev = car.querySelector('.car-prev');
      const next = car.querySelector('.car-next');
      const step = () => Math.max(240, track.clientWidth * 0.85);

      prev.onclick = () => track.scrollBy({ left: -step(), behavior: 'smooth' });
      next.onclick = () => track.scrollBy({ left: step(), behavior: 'smooth' });

      const update = () => {
        const max = track.scrollWidth - track.clientWidth - 2;
        car.classList.toggle('car-off', track.scrollWidth <= track.clientWidth + 4);
        prev.disabled = track.scrollLeft <= 2;
        next.disabled = track.scrollLeft >= max;
      };
      track.addEventListener('scroll', update, { passive: true });
      // Re-evaluate when images finish loading (they change scrollWidth).
      const ro = new ResizeObserver(update);
      ro.observe(track);
      observers.push(ro); // teardown() disconnects it on the next repaint
      update();
    });
  }

  /* ── Divider (bridge arches) ─────────────────────────────── */
  function divider() {
    const d = h('div', 'divider');
    d.setAttribute('aria-hidden', 'true');
    let arches = '';
    for (let x = 40; x < 1200; x += 150) arches += `<path d="M${x} 96 V74 a45 42 0 0 1 90 0 V96 Z"/>`;
    d.innerHTML = `<svg viewBox="0 0 1200 96" preserveAspectRatio="none">
      <g class="fill"><path d="M0 96 V58 h1200 V96 Z"/>${arches}</g>
      <path class="band" d="M0 58 h1200 v-7 H0 Z"/></svg>`;
    return d;
  }

  /* ── Shared builders ── */

  function buildConverter(city) {
    const c = (city.money && city.money.converter) || null;
    if (!c) return null;
    const aside = h('aside', 'converter reveal');
    aside.append(h('h3', 'mini-h', esc(c.title || 'Quick sanity check')), h('p', 'conv-lede', c.lede || ''));

    // Amount and the converted values sit on ONE horizontal row — the old stacked
    // layout was the tallest widget on the page and drove the whole section height.
    const row = h('div', 'conv-row');

    const field = h('label', 'conv-field');
    field.innerHTML = `<span>${esc(c.baseLabel || 'Amount')}</span>`;
    const input = h('input');
    Object.assign(input, { type: 'number', id: 'convBase', value: c.baseDefault ?? 100, min: '0', step: '10' });
    input.setAttribute('inputmode', 'decimal');
    field.append(input);
    row.append(field);

    const out = h('div', 'conv-out');
    (c.targets || []).forEach((tg) => {
      const cell = h('div');
      const b = h('b', null, `${esc(tg.symbol)}—`);
      b.dataset.key = tg.key;
      b.dataset.symbol = tg.symbol;
      cell.append(b, h('span', null, esc(tg.label)));
      out.append(cell);
    });
    row.append(out);
    aside.append(row);

    const det = h('details', 'conv-rates');
    det.append(h('summary', null, esc(t().ratesSummary)));
    (c.targets || []).forEach((tg) => {
      const row = h('div', 'rate-row');
      const lab = h('label', null, `<span>${esc(tg.rateLabel || `per ${tg.symbol}`)}</span>`);
      const inp = h('input');
      Object.assign(inp, { type: 'number', value: tg.rate, step: '0.01' });
      inp.dataset.rate = tg.key;
      lab.append(inp);
      row.append(lab);
      det.append(row);
    });
    det.append(h('p', null, esc(t().ratesNote)));
    aside.append(det);
    if (c.tip) aside.append(h('p', 'conv-tip', c.tip));
    return aside;
  }

  /* ── 01 Essentials (converter + map + the short good-to-know facts) ── */
  function renderEssentials(city) {
    const { sec, wrap } = section('essentials', '01', t().essentialsTitle, t().essentialsLede);

    // Converter is a full-width horizontal strip; facts sit under it in a wide grid.
    const conv = buildConverter(city);
    if (conv) wrap.append(conv);

    const facts = (city.orient && city.orient.facts) || [];
    if (facts.length) {
      const box = h('div', 'ess-facts');
      box.append(h('h3', 'mini-h', esc(t().goodToKnow)));
      const grid = h('div', 'facts-grid');
      facts.forEach((f) => {
        const card = h('div', 'fact-card');
        card.append(h('dt', null, esc(f.term)), h('dd', null, f.def));
        const more = moreBlock(detailList(f.details), moreProse(f.more));
        if (more) card.append(more);
        markExpandable(card);
        grid.append(card);
      });
      box.append(grid);
      wrap.append(box);
    }

    return sec;
  }

  /* ── 02 Arrive (airport → city). Its own section: bolted onto Essentials it
     pushed that section past a laptop screen. ── */
  function renderArrive(city) {
    const arr = city.arrive || {};
    const { sec, wrap } = section('arrive', '02', arr.title, arr.lede, 'sec-tint-a');

    if (arr.options && arr.options.length) {
      const cards = arr.options.map((o) => {
        const tone = o.tone === 'best' ? 'is-best' : o.tone === 'avoid' ? 'is-avoid' : '';
        const art = h('article', `airport-card ${tone}`);
        if (o.tag) art.append(h('span', 'airport-tag', esc(o.tag)));
        // h3: these cards sit directly under the section's h2, so h4 skipped a level.
        art.append(h('h3', null, esc(o.title)));
        const pr = h('p', 'airport-price');
        pr.innerHTML = `${esc(o.price)}${o.unit ? ` <span>${esc(o.unit)}</span>` : ''}`;
        art.append(pr);
        if (o.time) art.append(h('p', 'airport-time', esc(o.time)));
        if (o.body) art.append(h('p', 'airport-body', o.body));
        // The caveat and any extra detail move to the popover — the thumbnail
        // keeps just the route, price and time.
        const more = moreBlock(
          o.note ? h('p', 'airport-note', o.note) : null,
          detailList(o.details),
          moreProse(o.more)
        );
        if (more) art.append(more);
        return art;
      });
      wrap.append(carousel(cards));
    }
    return sec;
  }

  /* ── 02 Stay (neighbourhoods, trimmed to 3, image-led) ── */
  function renderStay(city) {
    const d = city.sleep || {};
    const { sec, wrap } = section('stay', '03', d.title, d.lede, 'sec-tint-b');

    // Neighbourhoods and hotels share ONE carousel — two stacked rows could not fit
    // a laptop screen. Both are "where to stay"; both cards carry a photo.
    const hoodCards = (d.hoods || []).map((n) => {
      const art = h('article', `hood reveal ${n.tone === 'warn' ? 'hood-warn' : ''}`);
      const fig = cardImage(n.image);
      if (fig) art.append(fig);
      const head = h('header');
      head.append(h('h3', null, esc(n.name)), h('p', 'hood-price', `${esc(n.price)} <span>${esc(n.unit || '')}</span>`));
      art.append(head, h('p', 'hood-verdict', esc(n.verdict || '')), h('p', 'hood-body', n.body || ''));
      // The at-a-glance tags and any extra notes are expanded-only.
      const more = moreBlock(tagRow(n.tags), detailList(n.details), moreProse(n.more), mapLinkNode([n.name, city.name]));
      if (more) art.append(more);
      return art;
    });
    /* Named hotels — same honesty posture as the restaurants. */
    const ht = d.hotels || {};
    const hotelItems = Array.isArray(ht.items) ? ht.items : [];
    const hotelCards = hotelItems.map((o) => {
        const art = h('article', 'hotel reveal');

        const fig = cardImage(o.image);
        if (fig) {
          art.append(fig);
        } else {
          // Fallback only — every hotel should carry a photo in the data.
          const plate = h('div', 'hotel-plate');
          plate.append(h('span', null, esc(o.price || o.stars || '')));
          art.append(plate);
        }

        const body = h('div', 'hotel-body');
        const top = h('div', 'hotel-head');
        top.append(h('h4', null, esc(o.name)));
        if (o.stars) top.append(h('span', 'hotel-stars', esc(o.stars)));
        body.append(top);

        body.append(h('p', 'hotel-meta', esc(o.area || '')));

        const priceRow = h('div', 'hotel-price');
        priceRow.append(h('b', null, `${esc(o.price)}${o.priceNote ? ` <span>${esc(o.priceNote)}</span>` : ''}`));
        if (o.score) {
          const sc = h('span', 'hotel-score');
          sc.innerHTML = `★ ${esc(o.score)}${o.scoreNote ? ` <em>${esc(o.scoreNote)}</em>` : ''}`;
          priceRow.append(sc);
        }
        body.append(priceRow);

      if (o.desc) body.append(h('p', 'hotel-desc', o.desc));

      // Popover-only extras: the thumbnail already carries area/class/price, so
      // this is for genuinely new info the data provides (details / guidance).
      const more = moreBlock(detailList(o.details), moreProse(o.more), mapLinkNode([o.name, o.area, city.name]));
      if (more) body.append(more);
      art.append(body);
      return art;
    });

    const cards = hoodCards.concat(hotelCards);
    if (!cards.length) return sec;              // nothing to show at all

    if (hotelCards.length) {
      const head = h('div', 'hotels-head reveal');
      head.append(h('h3', 'mini-h', esc(ht.title || '')));
      if (ht.lede) head.append(h('p', 'mini-lede', ht.lede));
      wrap.append(head);
    }
    wrap.append(carousel(cards));                // always rendered
    return sec;
  }

  /* ── 03 Eat (named restaurants only — compare/traps/dishes/myth dropped) ── */
  function renderEat(city) {
    const d = city.eat || {};
    const { sec, wrap } = section('eat', '04', d.title, d.lede);

    const pl = d.places;
    if (pl && pl.items && pl.items.length) {
      const cards = pl.items.map((p) => {
        const art = h('article', 'place reveal');
        const fig = cardImage(p.image);
        if (fig) art.append(fig);

        const top = h('div', 'place-head');
        top.append(h('h3', null, esc(p.name)));
        if (p.pill) top.append(h('span', 'pill pill-free', esc(p.pill)));
        art.append(top);

        const meta = h('div', 'place-meta');
        if (p.area) meta.append(h('span', 'place-area', esc(p.area)));
        if (p.address) meta.append(h('span', 'place-addr', esc(p.address)));
        if (p.hours) meta.append(h('span', 'place-hours', esc(p.hours)));
        art.append(meta);

        if (p.body) art.append(h('p', 'place-body', p.body));

        // One compact price line (first row) shows on the card; the rest of the
        // table and the note live in .card-more, hidden until the card is expanded.
        if (p.rows && p.rows[0]) {
          const r0 = p.rows[0];
          const pr = h('p', 'place-priceline');
          pr.innerHTML = `<span>${esc(r0.label)}</span><b>${esc(r0.value)}</b>`;
          art.append(pr);
        }
        const extraRows = (p.rows || []).slice(1).map((r) => {
          const pr = h('p', 'place-priceline');
          pr.innerHTML = `<span>${esc(r.label)}</span><b>${esc(r.value)}</b>`;
          return pr;
        });
        /* The links live in the popover, not on the thumbnail: the card itself is
           role="button", and a button must not contain interactive descendants —
           screen readers announce the nesting as one confused control. Inside
           .card-more they're display:none until the card opens, so they stay out
           of the accessibility tree entirely. */
        let listing = null;
        if (p.url) {
          listing = h('a', 'place-link', 'Official listing ↗');
          listing.href = p.url;
          listing.target = '_blank';
          listing.rel = 'noopener';
        }
        const more = moreBlock(
          extraRows,
          p.note ? h('p', 'place-note', p.note) : null,
          detailList(p.details),
          moreProse(p.more),
          mapLinkNode([p.name, p.address, p.area, city.name]),
          listing
        );
        if (more) art.append(more);
        return art;
      });
      wrap.append(carousel(cards));
    }
    return sec;
  }

  /* ── 04 See (ticketed sights — the free extras move to their own section) ── */
  function renderSee(city) {
    const d = city.see || {};
    const { sec, wrap } = section('see', '05', d.title, d.lede, 'sec-tint-c');

    // One tap to see every landmark (sights + the free ones) pinned on a map.
    // A plain Maps directions URL, opened in a new tab — nothing loads here.
    const landmarks = [...(d.sights || []), ...(d.free || [])]
      .map((s) => s.name)
      .filter(Boolean)
      .slice(0, 9) // Maps directions caps at ~10 stops
      .map((n) => `${n}, ${city.name}`);
    if (landmarks.length > 1) {
      const cta = h('a', 'map-cta reveal');
      cta.href = mapDirUrl(landmarks);
      cta.target = '_blank';
      cta.rel = 'noopener';
      cta.innerHTML = `${PIN_ICON}<span>${esc(t().mapSights)}</span> ↗`;
      wrap.append(cta);
    }

    const cards = (d.sights || []).map((s) => {
      const art = h('article', 'sight reveal');
      const fig = cardImage(s.image);
      if (fig) art.append(fig);
      const head = h('div', 'sight-head');
      head.append(h('h3', null, esc(s.name)));
      if (s.pill) head.append(h('span', 'pill pill-free', esc(s.pill)));
      art.append(head, h('p', null, s.body || ''));

      const priceRow = (p) => {
        const row = h('div');
        row.append(h('span', null, esc(p.label)), h('b', null, esc(p.value)));
        return row;
      };
      const allPrices = s.prices || [];
      // Headline price on the thumbnail; the rest of the tiers move to the popover.
      if (allPrices[0]) {
        const prices = h('div', 'sight-price');
        prices.append(priceRow(allPrices[0]));
        art.append(prices);
      }
      const restPrices = allPrices.slice(1);
      let priceMore = null;
      if (restPrices.length) {
        priceMore = h('div', 'sight-price');
        restPrices.forEach((p) => priceMore.append(priceRow(p)));
      }
      const more = moreBlock(
        priceMore,
        s.note ? h('p', 'sight-note', s.note) : null,
        detailList(s.details),
        moreProse(s.more),
        mapLinkNode([s.name, city.name])
      );
      if (more) art.append(more);
      return art;
    });
    wrap.append(carousel(cards));
    return sec;
  }

  /* ── 05 Free (its own section now, image-led cards) ── */
  function renderFree(city) {
    const d = city.see || {};
    const free = d.free || [];
    const { sec, wrap } = section('free', '06', d.freeTitle || 'Free', t().freeLede, 'sec-tint-a');

    const band = bandFigure(d.freeBand);
    if (band) wrap.append(band);

    const cards = free.map((f) => {
      const art = h('article', 'free-card reveal');
      const fig = cardImage(f.image);
      if (fig) art.append(fig);
      const body = h('div', 'free-body');
      body.append(h('span', 'pill pill-free', esc(t().nav[5])));
      body.append(h('h3', null, esc(f.name)), h('p', null, f.desc));
      const more = moreBlock(detailList(f.details), moreProse(f.more), mapLinkNode([f.name, city.name]));
      if (more) body.append(more);
      art.append(body);
      return art;
    });
    wrap.append(carousel(cards));
    return sec;
  }

  /* ── 06 Speak (all twelve, laid out in a grid to study) ── */
  function renderSpeak(city) {
    const d = city.speak || {};
    const { sec, wrap } = section('speak', '07', d.title, d.lede);

    const grid = h('div', 'phrases');
    (d.phrases || []).forEach((p) => {
      const btn = h('button', 'phrase reveal');
      btn.dataset.copy = p.local;
      btn.append(h('span', 'cz', esc(p.local)), h('span', 'pron', esc(p.pron)), h('span', 'en', esc(p.en)));
      grid.append(btn);
    });
    wrap.append(grid);

    const hint = h('p', 'copy-hint');
    hint.id = 'copyHint';
    hint.setAttribute('role', 'status');
    hint.setAttribute('aria-live', 'polite');
    wrap.append(hint);
    return sec;
  }

  /* ── Closing + footer ────────────────────────────────────── */
  function renderClosing(city) {
    const d = city.closing || {};
    const s = h('section', 'closing');
    const wrap = h('div', 'wrap');
    const inner = h('div', 'reveal');
    inner.append(h('p', 'closing-mark', '◆'), h('p', 'closing-text', (d.lines || []).join('<br>')));
    if (d.sig) inner.append(h('p', 'closing-sig', esc(d.sig)));
    wrap.append(inner);
    s.append(wrap);
    return s;
  }

  function renderFooter(city) {
    const d = city.sources || {};
    const f = h('footer', 'foot');
    const wrap = h('div', 'wrap');
    const grid = h('div', 'foot-grid');

    const left = h('div');
    left.append(
      h('p', 'foot-brand', `<img class="foot-logo" src="assets/localpass_logo.png" alt="" width="42" height="42" decoding="async"><span>${esc(BRAND)}</span>`),
      h('p', 'foot-copy', esc(t().footBlurb))
    );

    const right = h('div');
    right.append(h('h4', null, esc(t().sourcesHead)), h('p', 'foot-copy', d.note || ''));
    const ul = h('ul', 'sources');
    (d.links || []).forEach((l) => {
      const li = h('li');
      const a = h('a', null, esc(l.label));
      a.href = l.url;
      a.target = '_blank';
      a.rel = 'noopener';
      li.append(a);
      ul.append(li);
    });
    right.append(ul);

    grid.append(left, right);
    wrap.append(grid);

    /* Photo credits. Built from assets/credits.json, so they can never drift
       from the files actually on disk. */
    const mine = Object.entries(CREDITS).filter(([k]) => k.startsWith(city.slug + '/'));
    if (mine.length) {
      const box = h('div', 'foot-photos');
      box.append(
        h('h4', null, esc(t().photosHead)),
        h('p', 'foot-copy', esc(t().photosBlurb(mine.length)))
      );
      const ul = h('ul', 'credits');
      mine.forEach(([, c]) => {
        const li = h('li');
        const a = h('a', null, esc(c.title.replace(/\.(jpe?g|png)$/i, '')));
        a.href = c.source;
        a.target = '_blank';
        a.rel = 'noopener';
        li.append(a, h('span', null, ` — ${esc(c.author)} · ${esc(c.licence)}`));
        ul.append(li);
      });
      box.append(ul);
      wrap.append(box);
    }

    wrap.append(
      h('p', 'foot-legal', esc(t().legal(city.verified || '—', city.name)))
    );
    f.append(wrap);
    return f;
  }

  /* City display name / country in the current language (used by the picker
     and the chooser map). */
  const nameOf = (c) => c.names?.[LANG] || c.name;
  const countryOf = (c) => c.countries?.[LANG] || c.country || '';

  /* ── Interactions (re-bound on every render) ─────────────── */
  let observers = [];
  let revealTimers = [];
  let closeCityPicker = null;
  let teardownExpand = null;
  let teardownMap = null;

  function teardown() {
    observers.forEach((o) => o.disconnect());
    observers = [];
    // Pending stagger timers would otherwise fire against detached nodes.
    revealTimers.forEach(clearTimeout);
    revealTimers = [];
    // Drop the document-level listeners the open menu installed.
    if (closeCityPicker) closeCityPicker();
    closeCityPicker = null;
    // Drop the overlay's listeners and shut it if a repaint lands mid-open.
    if (teardownExpand) teardownExpand();
    teardownExpand = null;
    // Drop the chooser map's popup + listeners.
    if (teardownMap) teardownMap();
    teardownMap = null;
  }

  /* Scroll state. scrollHeight is a layout read, so it is measured once per
     paint/resize rather than on every scroll event, and the DOM is only
     touched inside a rAF callback. */
  let navEl, barEl, scrollable = 0, ticking = false;

  function applyScroll() {
    ticking = false;
    const y = window.scrollY;
    navEl.classList.toggle('stuck', y > 60);
    const p = scrollable > 0 ? Math.min(1, Math.max(0, y / scrollable)) : 0;
    if (barEl) barEl.style.transform = `scaleX(${p})`;
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(applyScroll);
  }

  function measure() {
    scrollable = document.documentElement.scrollHeight - window.innerHeight;
    applyScroll();
  }

  function bindNav() {
    navEl = document.getElementById('nav');
    barEl = document.getElementById('progressBar');
    // The brand is "home", and home is now the city chooser. From a guide it
    // returns to the map; on the map it does nothing.
    const brand = document.querySelector('.brand');
    if (brand) brand.addEventListener('click', (e) => {
      if (MODE === 'guide') { e.preventDefault(); renderMap(true); }
    });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure, { passive: true });
    // Web fonts land after first paint and change the document height.
    window.addEventListener('load', measure);
    if (document.fonts?.ready) document.fonts.ready.then(measure).catch(() => {});
  }

  function bindSpy() {
    const links = [...document.querySelectorAll('.nav-links a')];
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) spy.observe(el);
    });
    observers.push(spy);
  }

  function bindReveal() {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const els = document.querySelectorAll('.reveal');
    if (reduced) return els.forEach((el) => el.classList.add('in'));

    const io = new IntersectionObserver(
      (entries, obs) => {
        // Stagger only the entries that actually became visible, and cap it —
        // indexing over the whole batch gave elements delays of up to a second.
        let n = 0;
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          obs.unobserve(e.target);
          const delay = Math.min(n++, 4) * 60;
          if (delay === 0) {
            e.target.classList.add('in');
            return;
          }
          revealTimers.push(setTimeout(() => e.target.classList.add('in'), delay));
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 }
    );
    els.forEach((el) => io.observe(el));
    observers.push(io);
  }

  function bindConverter() {
    const base = document.getElementById('convBase');
    if (!base) return;
    const outs = [...document.querySelectorAll('.conv-out b')];
    const rateInputs = [...document.querySelectorAll('[data-rate]')];

    // Pair each output with its rate input once, instead of searching per keystroke.
    const pairs = outs
      .map((out) => ({ out, rate: rateInputs.find((r) => r.dataset.rate === out.dataset.key) }))
      .filter((p) => p.rate);

    const convert = () => {
      const amount = parseFloat(base.value);
      pairs.forEach(({ out, rate }) => {
        const r = parseFloat(rate.value);
        const ok = Number.isFinite(amount) && amount >= 0 && Number.isFinite(r) && r > 0;
        out.textContent = out.dataset.symbol + (ok ? (amount / r).toFixed(2) : '—');
      });
    };
    [base, ...rateInputs].forEach((el) => el.addEventListener('input', convert));
    convert();
  }

  function bindPhrases() {
    const phrases = document.querySelectorAll('.phrase');
    if (!phrases.length) return; // a city may omit the speak section entirely
    const hint = document.getElementById('copyHint');
    let timer;

    phrases.forEach((btn) => {
      btn.addEventListener('click', async () => {
        const text = btn.dataset.copy;
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          // Clipboard API needs a secure context; fall back to a temp selection.
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.cssText = 'position:fixed;opacity:0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
        }
        document.querySelectorAll('.phrase.copied').forEach((p) => p.classList.remove('copied'));
        btn.classList.add('copied');
        if (hint) hint.textContent = t().copied(text);

        clearTimeout(timer);
        timer = setTimeout(() => {
          btn.classList.remove('copied');
          if (hint) hint.textContent = '';
        }, 2200);
        revealTimers.push(timer); // cleared if the city switches mid-toast
      });
    });
  }

  /* ── Tap-to-expand overlay ───────────────────────────────
     One reusable dialog. Since this is a static one-pager there is no detail
     page to open, so a tapped card opens full-size here with its prose
     un-clamped. Tap the card again, the backdrop, the ✕, or press Escape to
     close; tapping a link inside the card still follows the link. */
  function bindExpand() {
    let modal = document.getElementById('cardModal');
    if (!modal) {
      modal = h('div', 'cardmodal');
      modal.id = 'cardModal';
      modal.hidden = true;
      modal.innerHTML =
        '<div class="cardmodal-scrim" data-close></div>' +
        '<div class="cardmodal-panel" role="dialog" aria-modal="true" tabindex="-1">' +
        '<button class="cardmodal-close" type="button">' +
        '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3 3 13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' +
        '</button><div class="cardmodal-body"></div></div>';
      document.body.append(modal);
    }
    const closeBtn = modal.querySelector('.cardmodal-close');
    closeBtn.setAttribute('aria-label', t().closeLabel); // refreshed on language change
    const body = modal.querySelector('.cardmodal-body');
    let lastFocus = null;
    let onScrollClose = null;

    const panel = modal.querySelector('.cardmodal-panel');

    /* Anchor the popover to the tapped card: centre it on the card, then clamp
       inside the viewport so it never spills off an edge. */
    const place = (card) => {
      const cr = card.getBoundingClientRect();
      const pw = panel.offsetWidth, ph = panel.offsetHeight;   // layout size, ignores the entry scale
      const vw = document.documentElement.clientWidth, vh = window.innerHeight;
      const M = 20;
      const cx = cr.left + cr.width / 2, cy = cr.top + cr.height / 2;
      const left = Math.max(M, Math.min(Math.round(cx - pw / 2), vw - pw - M));
      const top = Math.max(M, Math.min(Math.round(cy - ph / 2), Math.max(M, vh - ph - M)));
      panel.style.left = left + 'px';
      panel.style.top = top + 'px';
      // Grow out from the card, wherever it ended up relative to the panel.
      panel.style.transformOrigin = `${Math.round(cx - left)}px ${Math.round(cy - top)}px`;
    };

    const open = (card) => {
      const clone = card.cloneNode(true);
      clone.classList.remove('reveal', 'in', 'expandable');
      clone.classList.add('is-expanded');
      ['role', 'tabindex', 'aria-label', 'title'].forEach((a) => clone.removeAttribute(a));
      // Images must not lazy-load inside a popover that was just revealed.
      clone.querySelectorAll('img').forEach((im) => im.setAttribute('loading', 'eager'));
      body.innerHTML = '';
      body.append(clone);
      lastFocus = card;
      modal.hidden = false;
      place(card);                 // measure + position while still invisible
      // The page isn't locked (the reader should see what's underneath), so an
      // anchored popover would drift on scroll — close it on a deliberate scroll.
      // The threshold ignores the tiny settle when a click scrolls a card into view.
      const startY = window.scrollY;
      onScrollClose = () => { if (Math.abs(window.scrollY - startY) > 24) close(); };
      window.addEventListener('scroll', onScrollClose, { passive: true });
      requestAnimationFrame(() => {
        modal.classList.add('show');
        closeBtn.focus();
      });
    };
    const close = () => {
      if (modal.hidden) return;
      if (onScrollClose) { window.removeEventListener('scroll', onScrollClose); onScrollClose = null; }
      modal.classList.remove('show');
      const finish = () => { modal.hidden = true; body.innerHTML = ''; };
      modal.addEventListener('transitionend', finish, { once: true });
      setTimeout(finish, 260); // fallback if no transition fires
      if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
      lastFocus = null;
    };

    const onAppClick = (e) => {
      // A real control inside a card (link, the copy buttons) behaves normally.
      if (e.target.closest('a, button, input, label, summary, details')) return;
      const card = e.target.closest('.expandable');
      if (card) { e.preventDefault(); open(card); }
    };
    const onAppKey = (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest('.expandable');
      if (card && card === e.target) { e.preventDefault(); open(card); }
    };
    const onModalClick = (e) => {
      if (e.target.closest('.cardmodal-close') || e.target.closest('[data-close]')) { close(); return; }
      if (e.target.closest('a, button, input, label, summary')) return; // let links work
      if (e.target.closest('.cardmodal-panel')) close(); // tap the card again to close
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };

    app.addEventListener('click', onAppClick);
    app.addEventListener('keydown', onAppKey);
    modal.addEventListener('click', onModalClick);
    document.addEventListener('keydown', onKey);

    teardownExpand = () => {
      app.removeEventListener('click', onAppClick);
      app.removeEventListener('keydown', onAppKey);
      modal.removeEventListener('click', onModalClick);
      document.removeEventListener('keydown', onKey);
      if (onScrollClose) { window.removeEventListener('scroll', onScrollClose); onScrollClose = null; }
      modal.hidden = true;
      modal.classList.remove('show');
      body.innerHTML = '';
    };
  }

  /* ── City switcher ───────────────────────────────────────── */
  function buildNavLinks() {
    const nav = document.getElementById('navLinks');
    nav.innerHTML = '';
    sections().forEach((s) => {
      const a = h('a', null, esc(s.label));
      a.href = '#' + s.id;
      nav.append(a);
    });

    const toggle = document.getElementById('navToggle');
    const setOpen = (open) => {
      nav.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
    };
    /* Assigned, not addEventListener: this function re-runs on every language
       change, and stacked listeners toggled the menu open then straight shut
       again on a single tap — the mobile menu never opened. */
    toggle.onclick = () => setOpen(!nav.classList.contains('open'));
    nav.onclick = (e) => { if (e.target.tagName === 'A') setOpen(false); };
  }

  function buildCityPicker(cities, current) {
    const btn = document.getElementById('citypickBtn');
    const menu = document.getElementById('citypickMenu');
    const label = document.getElementById('citypickCurrent');
    label.textContent = current.name;

    menu.innerHTML = '';
    cities.forEach((c) => {
      const li = h('li');
      const b = h('button');
      b.type = 'button';
      b.setAttribute('role', 'option');
      b.setAttribute('aria-selected', String(c.slug === current.slug));
      if (c.slug === current.slug) b.classList.add('on');
      b.innerHTML = `<i style="background:${esc(c.accent)}"></i>
        <span><b>${esc(nameOf(c))}</b><em>${esc(countryOf(c))}</em></span>`;
      b.addEventListener('click', () => {
        close();
        if (c.slug !== current.slug) load(c.slug, true);
      });
      li.append(b);
      menu.append(li);
    });

    const open = () => {
      menu.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      document.addEventListener('click', onDocClick);
      document.addEventListener('keydown', onKey);
    };
    const close = () => {
      menu.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
    const onDocClick = (e) => {
      if (!document.getElementById('citypick').contains(e.target)) close();
    };
    const onKey = (e) => e.key === 'Escape' && close();

    // teardown() calls this, so a re-render never strands the document listeners.
    closeCityPicker = close;

    btn.onclick = (e) => {
      e.stopPropagation();
      menu.classList.contains('open') ? close() : open();
    };
  }

  /* ── Boot ────────────────────────────────────────────────── */
  let CITIES = [];
  let CREDITS = {};
  let MODE = 'guide';       // 'map' (the chooser) or 'guide' (a city page)

  /* ── City chooser: a self-hosted world map ───────────────
     The map SVG (assets/worldmap.svg) is an equirectangular render of
     public-domain geography — no tiles, no third party. These constants MUST
     match tools/build-worldmap.js so a pin lands where it should. */
  const MAP_W = 1000, MAP_LAT_TOP = 83, MAP_SCALE = MAP_W / 360;
  const MAP_VB_FULL = { x: 0, y: 0, w: 1000, h: 386 };
  const mapX = (lng) => (lng + 180) * MAP_SCALE;
  const mapY = (lat) => (MAP_LAT_TOP - lat) * MAP_SCALE;
  let WORLDMAP = null;                 // cached SVG text
  let mapClosePopup = null;            // close the open city popup, if any
  let mapResizeOff = null;             // detach the map's view listeners (resize/pan/zoom)
  let mapNav = null;                   // pan/zoom controller for the current map

  const geoCities = () => CITIES.filter((c) => typeof c.lat === 'number' && typeof c.lng === 'number');

  /* The window (in map units) that frames every available city with enough
     surrounding geography to be recognisable. */
  function cityFrame(cities) {
    const lons = cities.map((c) => c.lng), lats = cities.map((c) => c.lat);
    const cx = (Math.min(...lons) + Math.max(...lons)) / 2;
    const cy = (Math.min(...lats) + Math.max(...lats)) / 2;
    const spanLon = Math.max(Math.max(...lons) - Math.min(...lons) + 16, 30);
    const spanLat = Math.max(Math.max(...lats) - Math.min(...lats) + 9, 18);
    let minLon = cx - spanLon / 2, maxLon = cx + spanLon / 2;
    let minLat = cy - spanLat / 2, maxLat = cy + spanLat / 2;
    minLat = Math.max(-56, minLat); maxLat = Math.min(MAP_LAT_TOP, maxLat);
    return { x: mapX(minLon), y: mapY(maxLat), w: (maxLon - minLon) * MAP_SCALE, h: (maxLat - minLat) * MAP_SCALE };
  }

  async function renderMap(push) {
    teardown();
    MODE = 'map';
    document.documentElement.classList.add('map-mode');
    document.title = `${BRAND} — ${t().chooseHint}`;
    CURRENT_SLUG = null;
    CURRENT_THEME = {};       // no city palette on the chooser — use the defaults
    applyThemeVars();
    if (push) history.pushState({ map: true, lang: LANG }, '', LANG === 'en' ? '/' : `/?lang=${LANG}`);

    const cities = geoCities();
    app.innerHTML = '';
    const sec = h('section', 'mapview');
    const wrap = h('div', 'wrap');
    const head = h('div', 'map-head reveal');
    head.append(
      h('p', 'eyebrow', esc(t().chooseHint)),
      h('h1', 'map-title', esc(t().chooseTitle)),
      h('p', 'map-lede', esc(t().chooseLede(cities.length)))
    );
    wrap.append(head);

    // The map is flanked by floating city bubbles — the accessible / touch path,
    // and a fallback if the SVG fails to load. They split evenly left / right.
    const choose = h('div', 'map-choose reveal');
    const sideL = h('ul', 'map-side map-side-left');
    const sideR = h('ul', 'map-side map-side-right');
    const stage = h('div', 'map-stage');
    const canvas = h('div', 'map-canvas');
    canvas.id = 'mapCanvas';
    stage.append(canvas);
    // Zoom lives inside the canvas so it rides the map's sized box, not the
    // (larger) stage. Appended after the SVG below.
    const zoom = h('button', 'map-zoom', `<span>🌍</span> ${esc(t().chooseWhole)}`);
    zoom.type = 'button';

    const half = Math.ceil(cities.length / 2);
    cities.forEach((c, i) => {
      const li = h('li');
      const btn = h('button');
      btn.type = 'button';
      btn.dataset.slug = c.slug;
      btn.style.setProperty('--pin', c.accent || 'var(--accent)');
      btn.innerHTML = `<i></i><span><b>${esc(nameOf(c))}</b><em>${esc(countryOf(c))}</em></span>`;
      li.append(btn);
      (i < half ? sideL : sideR).append(li);
    });
    choose.append(sideL, stage, sideR);
    wrap.append(choose);
    sec.append(wrap);
    app.append(sec);

    // A bubble goes straight into that city's guide.
    [sideL, sideR].forEach((s) => s.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-slug]');
      if (btn) goToCity(btn.dataset.slug);
    }));

    // Fetch + inject the map, then drop the pins on it.
    try {
      if (!WORLDMAP) WORLDMAP = await fetch('assets/worldmap.svg', { cache: 'force-cache' }).then((r) => r.text());
      canvas.innerHTML = WORLDMAP;
    } catch {
      stage.remove(); // the text list still works, so the page is usable
    }
    const svg = canvas.querySelector('svg');
    const pins = [];
    let ar = 1000 / 386;
    if (svg) {
      cities.forEach((c) => {
        const pin = h('button', 'map-pin');
        pin.type = 'button';
        pin.dataset.slug = c.slug;
        pin.style.setProperty('--pin', c.accent || 'var(--accent)');
        pin.setAttribute('aria-label', `${nameOf(c)}, ${countryOf(c)} — ${t().chooseCta(nameOf(c))}`);
        pin.innerHTML = `<span class="pin-dot"></span><span class="pin-name">${esc(nameOf(c))}</span>`;
        canvas.append(pin);
        pins.push({ el: pin, c });
      });
      canvas.append(zoom);

      // The display keeps a single aspect ratio (the initial city frame), so
      // pan and zoom only ever translate/scale the view — no re-fitting, and
      // the % pin mapping stays exact.
      const AR = (() => { const f = cities.length ? cityFrame(cities) : MAP_VB_FULL; return f.w / f.h; })();
      ar = AR;
      const MIN_W = 40;                         // closest zoom-in (~14° of longitude — a country)
      const clampN = (v, a, z) => Math.max(a, Math.min(v, z));
      const clampView = (v) => {
        v.w = clampN(v.w, MIN_W, 1000);         // never wider than the whole world
        v.h = v.w / AR;
        v.x = v.w >= 1000 ? (1000 - v.w) / 2 : clampN(v.x, 0, 1000 - v.w);
        v.y = v.h >= 386 ? (386 - v.h) / 2 : clampN(v.y, 0, 386 - v.h);
        return v;
      };
      // Expand a lon/lat window to the display aspect (centred), then clamp.
      const frameToAR = (vb) => {
        let { x, y, w, h } = vb; const cx = x + w / 2, cy = y + h / 2;
        if (w / h > AR) h = w / AR; else w = h * AR;
        return clampView({ x: cx - w / 2, y: cy - h / 2, w, h });
      };
      let view = frameToAR(cities.length ? cityFrame(cities) : MAP_VB_FULL);

      // Size the canvas to the space the stage has (never taller than the
      // viewport). Leave 8px for the hard drop-shadow.
      const fit = () => {
        const availW = stage.clientWidth - 8, availH = stage.clientHeight - 8;
        if (availW <= 0) return;
        // Stacked (mobile) layout: the bubbles sit above, so just fill the width
        // — the stage isn't a fixed-height box to fit into.
        if (window.matchMedia('(max-width:999px)').matches) {
          canvas.style.width = `${Math.round(availW)}px`;
          canvas.style.height = `${Math.round(availW / ar)}px`;
          return;
        }
        if (availH <= 0) return;
        let w = availW, hh = w / ar;
        if (hh > availH) { hh = availH; w = hh * ar; }
        canvas.style.width = `${Math.round(w)}px`;
        canvas.style.height = `${Math.round(hh)}px`;
      };
      const positionPins = () => pins.forEach(({ el, c }) => {
        el.style.left = `${((mapX(c.lng) - view.x) / view.w) * 100}%`;
        el.style.top = `${((mapY(c.lat) - view.y) / view.h) * 100}%`;
      });
      const applyView = () => {
        svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);
        positionPins();
      };
      fit(); applyView();
      requestAnimationFrame(fit);

      // Zoom around a focal point given as 0..1 fractions of the canvas.
      const zoomAt = (fx, fy, factor) => {
        const fmx = view.x + fx * view.w, fmy = view.y + fy * view.h;
        view.w = clampN(view.w * factor, MIN_W, 1000);
        view.h = view.w / AR;
        view.x = fmx - fx * view.w; view.y = fmy - fy * view.h;
        clampView(view); applyView();
      };

      // ── Grab to pan, wheel / pinch / double-click to zoom ──
      // 1:1 grab — the spot under the cursor stays under the cursor, which reads
      // as the natural, comfortable speed.
      const PAN_SENS = 1;
      const rectOf = () => canvas.getBoundingClientRect();
      const pointers = new Map();
      let panStart = null, pinchStart = null, moved = 0;

      const onDown = (e) => {
        moved = 0;                                  // reset so a following click isn't treated as a drag
        if (e.target.closest('.map-pin') || e.target.closest('.map-zoom')) return;
        canvas.setPointerCapture?.(e.pointerId);
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.size === 1) {
          panStart = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
          canvas.classList.add('grabbing');
        } else if (pointers.size === 2) {
          const p = [...pointers.values()];
          pinchStart = { d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) || 1, w: view.w, x: view.x, y: view.y,
            mx: (p[0].x + p[1].x) / 2, my: (p[0].y + p[1].y) / 2 };
          panStart = null;
        }
      };
      const onMove = (e) => {
        if (!pointers.has(e.pointerId)) return;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const rect = rectOf();
        if (pointers.size >= 2 && pinchStart) {
          const p = [...pointers.values()];
          const d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) || 1;
          const fx = (pinchStart.mx - rect.left) / rect.width, fy = (pinchStart.my - rect.top) / rect.height;
          view.w = clampN(pinchStart.w * (pinchStart.d / d), MIN_W, 1000); view.h = view.w / AR;
          const fmx = pinchStart.x + fx * pinchStart.w, fmy = pinchStart.y + fy * (pinchStart.w / AR);
          view.x = fmx - fx * view.w; view.y = fmy - fy * view.h;
          clampView(view); applyView(); moved = 20;
          return;
        }
        if (panStart) {
          const dx = e.clientX - panStart.x, dy = e.clientY - panStart.y;
          moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
          view.x = panStart.vx - dx * (view.w / rect.width) * PAN_SENS;
          view.y = panStart.vy - dy * (view.h / rect.height) * PAN_SENS;
          clampView(view); applyView();
        }
      };
      const onUp = (e) => {
        pointers.delete(e.pointerId);
        if (pointers.size < 2) pinchStart = null;
        if (pointers.size === 0) { panStart = null; canvas.classList.remove('grabbing'); }
      };
      const onWheel = (e) => {
        e.preventDefault();
        const rect = rectOf();
        // Proportional zoom (~13% per notch), clamped so a big trackpad flick
        // doesn't jump.
        const dy = Math.max(-90, Math.min(90, e.deltaY));
        zoomAt((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height, Math.pow(1.00135, dy));
      };
      const onDbl = (e) => {
        const rect = rectOf();
        zoomAt((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height, 1 / 1.5);
      };
      const onResize = () => fit();

      canvas.addEventListener('pointerdown', onDown);
      canvas.addEventListener('pointermove', onMove);
      canvas.addEventListener('pointerup', onUp);
      canvas.addEventListener('pointercancel', onUp);
      canvas.addEventListener('wheel', onWheel, { passive: false });
      canvas.addEventListener('dblclick', onDbl);
      window.addEventListener('resize', onResize, { passive: true });
      mapResizeOff = () => {
        window.removeEventListener('resize', onResize);
        for (const [t, fn] of [['pointerdown', onDown], ['pointermove', onMove], ['pointerup', onUp],
          ['pointercancel', onUp], ['wheel', onWheel], ['dblclick', onDbl]]) canvas.removeEventListener(t, fn);
      };

      mapNav = {
        world: () => { view = clampView({ x: 0, y: 0, w: 1000, h: 1000 / AR }); applyView(); },
        cities: () => { view = frameToAR(cityFrame(cities)); applyView(); },
        // True right after a drag/pinch, so the click that follows doesn't open a popup.
        dragged: () => moved > 6,
      };
    }

    bindMapChooser(stage, canvas, zoom, cities);
    // The chooser is one non-scrolling screen. The scroll-reveal observer never
    // fires for anything in the bottom of the viewport (its -12% root margin), so
    // the city list could stay invisible — just fade the whole view in now.
    const revealAll = () => sec.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) revealAll();
    else requestAnimationFrame(revealAll);
  }

  function bindMapChooser(stage, canvas, zoom, cities) {
    let whole = false;
    zoom.onclick = () => {
      whole = !whole;
      if (mapNav) (whole ? mapNav.world() : mapNav.cities());
      zoom.classList.toggle('is-on', whole);
      zoom.innerHTML = `<span>${whole ? '🎯' : '🌍'}</span> ${esc(whole ? t().chooseFocus : t().chooseWhole)}`;
      closePopup();
    };

    // The popup: a small card anchored to the tapped pin, with a CTA into the guide.
    let popup = null;
    const closePopup = () => {
      if (!popup) return;
      popup.remove(); popup = null;
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onDocClick, true);
    };
    mapClosePopup = closePopup;
    const onKey = (e) => { if (e.key === 'Escape') closePopup(); };
    const onDocClick = (e) => { if (popup && !popup.contains(e.target) && !e.target.closest('.map-pin')) closePopup(); };

    const openPopup = (pin, c) => {
      closePopup();
      popup = h('div', 'map-popup');
      popup.style.setProperty('--pin', c.accent || 'var(--accent)');
      const cta = h('button', 'map-popup-cta', `${esc(t().chooseCta(nameOf(c)))} →`);
      cta.type = 'button';
      cta.onclick = () => goToCity(c.slug);
      popup.innerHTML =
        `<p class="map-popup-country">${esc(countryOf(c))}</p>` +
        `<h3 class="map-popup-name">${esc(nameOf(c))}</h3>` +
        `<p class="map-popup-blurb">${esc((c.blurbs && c.blurbs[LANG]) || c.blurbs?.en || '')}</p>`;
      popup.append(cta);
      stage.append(popup);
      // Anchor above the pin, clamped inside the stage.
      const sr = stage.getBoundingClientRect(), pr = pin.getBoundingClientRect();
      const pw = popup.offsetWidth, ph = popup.offsetHeight, M = 10;
      let left = pr.left - sr.left + pr.width / 2 - pw / 2;
      left = Math.max(M, Math.min(left, sr.width - pw - M));
      let top = pr.top - sr.top - ph - 12;
      if (top < M) top = pr.bottom - sr.top + 12;   // flip below if no room above
      popup.style.left = `${Math.round(left)}px`;
      popup.style.top = `${Math.round(top)}px`;
      requestAnimationFrame(() => {
        popup.classList.add('show');
        cta.focus();
        document.addEventListener('keydown', onKey);
        document.addEventListener('click', onDocClick, true);
      });
    };

    canvas.addEventListener('click', (e) => {
      if (mapNav && mapNav.dragged()) return;      // a pan/pinch, not a tap
      const pinEl = e.target.closest('.map-pin');
      if (!pinEl) return;
      const c = cities.find((x) => x.slug === pinEl.dataset.slug);
      if (c) openPopup(pinEl, c);
    });

    teardownMap = () => {
      closePopup();
      if (mapResizeOff) mapResizeOff();
      mapResizeOff = null;
      mapNav = null;
      mapClosePopup = null;
    };
  }

  function goToCity(slug) {
    if (mapClosePopup) mapClosePopup();
    document.documentElement.classList.remove('map-mode');
    MODE = 'guide';
    window.scrollTo({ top: 0, behavior: 'instant' });
    load(slug, true);
  }

  function paint(city) {
    teardown();

    // The nav brand is the product (LocalPass), not the city — the city lives in
    // the picker on the right, so nothing is lost by dropping it from the left.
    // Tab reads "LocalPass — Prague": brand first, city second.
    const display = city.name || city.localName || 'City';
    document.title = `${BRAND} — ${display}`;

    // Five colours drive the whole page. `accent2` is the JSON name for --good.
    // applyThemeVars sets all of them (softened in dark mode), from CURRENT_THEME.
    CURRENT_THEME = city.theme || {};
    applyThemeVars();

    CURRENT_SLUG = city.slug;

    app.innerHTML = '';
    if (city.__fellBack && t().fallbackNote) {
      const n = h('div', 'lang-fallback', esc(t().fallbackNote));
      n.setAttribute('role', 'note');
      app.append(n);
    }
    app.append(renderHero(city));
    const main = h('main');
    main.append(renderEssentials(city));
    main.append(divider());
    main.append(renderArrive(city), renderStay(city), renderEat(city), renderSee(city), renderFree(city), renderSpeak(city), renderClosing(city));
    app.append(main, renderFooter(city));

    bindSpy();
    bindReveal();
    bindConverter();
    bindPhrases();
    bindCarousels();
    bindExpand();
    buildCityPicker(CITIES, city);
    measure(); // the document height just changed
  }

  const cityCache = new Map();

  const cityUrl = (slug, lang) =>
    lang === 'en' ? `data/cities/${slug}.json` : `data/cities/${lang}/${slug}.json`;

  /* A missing translation must never blank the page: fall back to English and
     mark the city so the reader is told why the prose isn't in their language. */
  async function fetchCity(slug, lang) {
    const key = `${lang}:${slug}`;
    const cached = cityCache.get(key);
    if (cached) return cached;

    let city, fellBack = false;
    const res = await fetch(cityUrl(slug, lang), { cache: 'no-cache' });
    if (res.ok) {
      city = await res.json();
    } else if (lang !== 'en') {
      const en = await fetch(cityUrl(slug, 'en'), { cache: 'no-cache' });
      if (!en.ok) throw new Error(String(res.status));
      city = await en.json();
      fellBack = true;
    } else {
      throw new Error(String(res.status));
    }

    city = { ...city, __fellBack: fellBack };
    cityCache.set(key, city);
    return city;
  }

  function pushUrl(slug) {
    const q = new URLSearchParams({ city: slug });
    if (LANG !== 'en') q.set('lang', LANG);
    history.pushState({ slug, lang: LANG }, '', `?${q}`);
  }

  async function load(slug, push) {
    let city;
    try {
      city = await fetchCity(slug, LANG);
    } catch (err) {
      app.innerHTML = `<div class="noscript"><h1>${esc(t().loadFail(slug))}</h1>
        <p>${t().loadFailBody(esc(slug), esc(err.message))}</p></div>`;
      return;
    }

    try {
      localStorage.setItem(STORE_KEY, slug);
    } catch {
      /* private mode — the URL still carries the choice */
    }
    if (push) pushUrl(slug);

    MODE = 'guide';
    document.documentElement.classList.remove('map-mode');
    CURRENT_SLUG = slug;

    // Jump before repainting. scrollTo(0,0) would inherit the smooth
    // scroll-behavior from CSS and animate the full height of the old page.
    if (push) window.scrollTo({ top: 0, behavior: 'instant' });
    paint(city);
  }

  /* ── Language ────────────────────────────────────────────── */
  let CURRENT_SLUG = null;

  /* ── Theme (light / dark) ────────────────────────────────
     The dark stylesheet flips the neutral tokens; the only palette value that
     must change per-theme *and* per-city is --wash (the page base), which
     render.js sets inline — so it is computed here rather than in CSS. */
  function applyThemeVars() {
    const root = document.documentElement;
    const th = CURRENT_THEME || {};
    const A = th.accent || '#C4402A', G = th.accent2 || '#1F7D69',
          P = th.pop || '#2E5BA8', GD = th.gold || '#E2A431';
    if (THEME === 'dark') {
      // Fully saturated hues vibrate against a dark page (halation) and tire
      // the eye. Pull every brand colour toward a common muted warm grey so
      // they read as calm, low-saturation tones — easier to look at and read.
      const soft = (c) => `color-mix(in srgb, ${c} 62%, #7c7266)`;
      root.style.setProperty('--accent', soft(A));
      root.style.setProperty('--good', soft(G));
      root.style.setProperty('--pop', soft(P));
      root.style.setProperty('--gold', soft(GD));
      // A near-black warm base, only faintly tinted so it never looks coloured.
      root.style.setProperty('--wash', `color-mix(in srgb, ${A} 4%, #15120e)`);
    } else {
      root.style.setProperty('--accent', A);
      root.style.setProperty('--good', G);
      root.style.setProperty('--pop', P);
      root.style.setProperty('--gold', GD);
      root.style.setProperty('--wash', th.wash || '#FDF6EC');
    }
  }

  function applyThemeChrome() {
    document.documentElement.setAttribute('data-theme', THEME);
    const btn = document.getElementById('themeToggle');
    if (btn) {
      const dark = THEME === 'dark';
      btn.setAttribute('aria-pressed', String(dark));
      btn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    }
    const meta = document.querySelector('meta[name="theme-color"]:not([media])')
      || document.head.appendChild(Object.assign(document.createElement('meta'), { name: 'theme-color' }));
    meta.setAttribute('content', THEME === 'dark' ? '#14120F' : '#FDF6EC');
  }

  function setTheme(theme) {
    if (theme !== 'light' && theme !== 'dark') return;
    THEME = theme;
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* URL/OS still decides next visit */ }
    applyThemeChrome();
    applyThemeVars();   // recompute --wash live — no full re-render needed
  }

  function bindThemeToggle() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    btn.addEventListener('click', () => setTheme(THEME === 'dark' ? 'light' : 'dark'));
  }

  function applyLangChrome() {
    document.documentElement.lang = LANG;
    const skip = document.querySelector('.skip');
    if (skip) skip.textContent = t().skip;
    const lp = document.getElementById('langpick');
    if (lp) {
      lp.setAttribute('aria-label', t().langLabel);
      lp.querySelectorAll('button').forEach((b) =>
        b.setAttribute('aria-pressed', String(b.dataset.lang === LANG))
      );
    }
    buildNavLinks(); // section labels are translated
  }

  async function setLang(lang, push) {
    if (lang === LANG || !UI[lang]) return;
    LANG = lang;
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* the URL still carries the choice */
    }
    applyLangChrome();
    // On the chooser there is no city to reload — re-render the map so its
    // title and blurbs switch language; otherwise reload the current guide.
    if (MODE === 'map') {
      if (push) history.replaceState({ map: true, lang: LANG }, '', LANG === 'en' ? '/' : `/?lang=${LANG}`);
      await renderMap(false);
    } else {
      if (push) pushUrl(CURRENT_SLUG);
      await load(CURRENT_SLUG, false);
    }
  }

  function bindLangPicker() {
    const lp = document.getElementById('langpick');
    if (!lp) return;
    lp.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-lang]');
      if (btn) setLang(btn.dataset.lang, true);
    });
  }

  async function boot() {
    const params = new URL(location.href).searchParams;
    let storedLang = null;
    try {
      storedLang = localStorage.getItem(LANG_KEY);
    } catch {
      /* ignore */
    }
    const wantedLang = params.get('lang') || storedLang;
    if (UI[wantedLang]) LANG = wantedLang;

    // The inline <head> script already set data-theme (no flash); trust it, then
    // fall back to storage / OS so THEME here matches what the page is showing.
    let storedTheme = null;
    try { storedTheme = localStorage.getItem(THEME_KEY); } catch { /* ignore */ }
    const attrTheme = document.documentElement.getAttribute('data-theme');
    THEME = (attrTheme === 'dark' || attrTheme === 'light') ? attrTheme
      : (storedTheme === 'dark' || storedTheme === 'light') ? storedTheme
      : (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

    buildNavLinks();
    bindNav();
    bindLangPicker();
    bindThemeToggle();
    applyThemeChrome();
    applyLangChrome();

    try {
      const res = await fetch('data/cities.json', { cache: 'no-cache' });
      CITIES = (await res.json()).cities || [];
    } catch {
      CITIES = [{ slug: 'prague', name: 'Prague', country: 'Czech Republic', accent: '#A93B2B' }];
    }

    try {
      CREDITS = await (await fetch('assets/credits.json', { cache: 'no-cache' })).json();
    } catch {
      CREDITS = {}; // no photos deployed — the footer simply omits the section
    }
    if (!CITIES.length) {
      app.innerHTML = `<div class="noscript"><h1>${esc(t().noCities)}</h1><p><a href="/admin">/admin</a></p></div>`;
      return;
    }

    // The front door is the city chooser (the world map). A city is only shown
    // straight away when the URL asks for one — so shared links and the picker
    // still work, but a first-time visitor gets to choose rather than landing on
    // whichever city happens to be default.
    const wantedCity = params.get('city');
    if (wantedCity && CITIES.some((c) => c.slug === wantedCity)) {
      CURRENT_SLUG = wantedCity;
      await load(wantedCity, false);
    } else {
      await renderMap(false);
    }

    /* Back/forward. Chrome also fires popstate for a same-page #hash jump, so
       this must not repaint unconditionally: doing so tore down the very
       section the browser was scrolling to, which left every nav link changing
       the hash without ever moving the page — and rebuilt the whole document
       each time. Only re-render when the city or language actually changed. */
    window.addEventListener('popstate', () => {
      const q = new URL(location.href).searchParams;
      const lang = q.get('lang') || 'en';
      const langChanged = UI[lang] && lang !== LANG;
      if (langChanged) {
        LANG = lang;
        applyLangChrome();
      }
      const city = q.get('city');
      // No ?city in the URL → the chooser map (the front door).
      if (!city || !CITIES.some((c) => c.slug === city)) {
        if (MODE !== 'map' || langChanged) renderMap(false);
        return;
      }
      if (city === CURRENT_SLUG && MODE === 'guide' && !langChanged) return; // a hash jump
      CURRENT_SLUG = city;
      load(city, false);
    });
  }

  boot();
})();
