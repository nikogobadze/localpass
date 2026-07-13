/**
 * LocalPass — admin.
 *
 * Edits data/cities/<slug>.json through the local API. Identity, theme, hero
 * and skyline get real form fields; the eight prose sections stay a single
 * JSON field, because the writing is the product and splitting it across two
 * hundred inputs would make it worse.
 */
(function () {
  'use strict';

  const TOKEN_KEY = 'honestguide.token';
  const CONTENT_KEYS = ['orient', 'arrive', 'money', 'sleep', 'eat', 'see', 'safe', 'speak', 'closing', 'sources'];

  const $ = (id) => document.getElementById(id);
  const gate = $('gate');
  const admin = $('admin');

  let token = null;
  let cities = [];
  let current = null; // slug of the loaded city, or null for a new one
  let loaded = {}; // last-loaded city, so a save can't drop fields the form doesn't show

  /* ── API ─────────────────────────────────────────────────── */
  async function api(path, options = {}) {
    const res = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'X-Admin-Token': token } : {}),
        ...options.headers,
      },
    });
    const text = await res.text();
    let body;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { error: text.slice(0, 200) };
    }
    if (!res.ok) throw Object.assign(new Error(body.error || `HTTP ${res.status}`), { body, status: res.status });
    return body;
  }

  /* ── Gate ────────────────────────────────────────────────── */
  $('gateForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('gateErr');
    err.textContent = '';
    token = $('tokenInput').value.trim();

    try {
      // Cheapest authenticated round-trip: `__probe__` is an invalid slug, so a
      // good token gets 400 (rejected after the auth check) and a bad one 401.
      await api('/api/cities/__probe__', { method: 'DELETE' });
    } catch (e2) {
      if (e2.status === 401) {
        err.textContent = 'That token was rejected.';
        token = null;
        return;
      }
      if (!e2.status) {
        // No HTTP status at all — the request never reached the server.
        err.textContent = 'Could not reach the server. Is `npm start` still running?';
        token = null;
        return;
      }
      // Any other status (400/404/409) means the token was accepted.
    }

    try {
      sessionStorage.setItem(TOKEN_KEY, token);
      await unlock();
    } catch (e3) {
      err.textContent = `Unlocked, but couldn't load cities: ${e3.message}`;
    }
  });

  $('btnLock').addEventListener('click', () => {
    sessionStorage.removeItem(TOKEN_KEY);
    location.reload();
  });

  async function unlock() {
    gate.hidden = true;
    admin.hidden = false;
    await refreshCities();
  }

  /* ── City list ───────────────────────────────────────────── */
  async function refreshCities(selectSlug) {
    const data = await api('/api/cities');
    cities = data.cities || [];

    const list = $('cityList');
    list.innerHTML = '';
    cities.forEach((c) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      if (c.slug === current) b.classList.add('on');
      b.innerHTML = `<i style="background:${c.accent}"></i><span><b>${c.name}</b><span>${c.country || ''}</span></span>`;
      b.addEventListener('click', () => openCity(c.slug));
      li.append(b);
      list.append(li);
    });

    if (selectSlug) openCity(selectSlug);
  }

  /* ── Editor ──────────────────────────────────────────────── */
  const fields = {
    slug: $('f_slug'), name: $('f_name'), localName: $('f_localName'),
    country: $('f_country'), verified: $('f_verified'), currency: $('f_currency'),
    accent: $('f_accent'), accent2: $('f_accent2'), pop: $('f_pop'), gold: $('f_gold'), wash: $('f_wash'),
    accentHex: $('f_accentHex'), accent2Hex: $('f_accent2Hex'), popHex: $('f_popHex'),
    goldHex: $('f_goldHex'), washHex: $('f_washHex'),
    eyebrow: $('f_eyebrow'), heroTitle: $('f_heroTitle'), heroSub: $('f_heroSub'),
    skyline: $('f_skyline'), content: $('f_content'),
  };

  const SWATCHES = [
    ['accent', 'accentHex'], ['accent2', 'accent2Hex'], ['pop', 'popHex'],
    ['gold', 'goldHex'], ['wash', 'washHex'],
  ];

  /* Keep each colour picker and its hex box in step. */
  SWATCHES.forEach(([pick, hex]) => {
    fields[pick].addEventListener('input', () => {
      fields[hex].value = fields[pick].value.toUpperCase();
      paintThemePreview();
    });
    fields[hex].addEventListener('input', () => {
      const v = fields[hex].value.trim();
      if (/^#[0-9a-f]{6}$/i.test(v)) {
        fields[pick].value = v;
        paintThemePreview();
      }
    });
  });

  function paintThemePreview() {
    const el = $('themePreview');
    if (!el) return;
    el.style.background = fields.wash.value;
    el.innerHTML = ['accent', 'accent2', 'pop', 'gold']
      .map((k) => `<i style="background:${fields[k].value}"></i>`)
      .join('');
  }

  fields.skyline.addEventListener('input', paintSkyPreview);
  fields.content.addEventListener('input', validateContent);

  function paintSkyPreview() {
    $('skyPreview').innerHTML = fields.skyline.value.trim() || '<text x="600" y="130" text-anchor="middle" font-size="18" fill="#A39A8D" font-family="monospace">no skyline — a generic silhouette will be used</text>';
  }

  function validateContent() {
    const el = $('jsonStatus');
    const raw = fields.content.value.trim();
    if (!raw) {
      el.textContent = 'Empty — the page will render with headings only.';
      el.className = 'json-status err';
      return null;
    }
    let obj;
    try {
      obj = JSON.parse(raw);
    } catch (e) {
      el.textContent = `Invalid JSON — ${e.message}`;
      el.className = 'json-status err';
      return null;
    }
    const missing = CONTENT_KEYS.filter((k) => !(k in obj));
    el.textContent = missing.length
      ? `Valid JSON. Missing sections: ${missing.join(', ')} — those will be skipped.`
      : `Valid JSON. All ten sections present.`;
    el.className = missing.length ? 'json-status err' : 'json-status';
    return obj;
  }

  function fill(city) {
    loaded = city;
    fields.slug.value = city.slug || '';
    fields.name.value = city.name || '';
    fields.localName.value = city.localName || '';
    fields.country.value = city.country || '';
    fields.verified.value = city.verified || '';
    fields.currency.value = city.currency?.code || '';

    const t = city.theme || {};
    const set = (pick, hex, val, fallback) => {
      fields[pick].value = val || fallback;
      fields[hex].value = (val || fallback).toUpperCase();
    };
    set('accent', 'accentHex', t.accent, '#C4402A');
    set('accent2', 'accent2Hex', t.accent2, '#1F7D69');
    set('pop', 'popHex', t.pop, '#2E5BA8');
    set('gold', 'goldHex', t.gold, '#E2A431');
    set('wash', 'washHex', t.wash, '#FDF6EC');
    paintThemePreview();

    fields.eyebrow.value = city.hero?.eyebrow || '';
    fields.heroTitle.value = city.hero?.title || '';
    fields.heroSub.value = city.hero?.sub || '';
    fields.skyline.value = city.art?.skyline || '';

    const content = {};
    CONTENT_KEYS.forEach((k) => {
      if (k in city) content[k] = city[k];
    });
    fields.content.value = JSON.stringify(content, null, 2);

    paintSkyPreview();
    validateContent();
  }

  function collect() {
    const content = validateContent();
    if (content === null) throw new Error('Fix the content JSON before saving.');

    return {
      slug: fields.slug.value.trim(),
      name: fields.name.value.trim(),
      localName: fields.localName.value.trim() || fields.name.value.trim(),
      country: fields.country.value.trim(),
      verified: fields.verified.value.trim(),
      // Keep symbol/name — the form only exposes the code.
      currency: { ...(loaded.currency || {}), code: fields.currency.value.trim().toUpperCase() },
      theme: {
        accent: fields.accent.value,
        accent2: fields.accent2.value,
        pop: fields.pop.value,
        gold: fields.gold.value,
        wash: fields.wash.value,
      },
      hero: {
        eyebrow: fields.eyebrow.value.trim(),
        title: fields.heroTitle.value.trim() || fields.localName.value.trim() || fields.name.value.trim(),
        sub: fields.heroSub.value.trim(),
      },
      art: { skyline: fields.skyline.value.trim() },
      ...content,
    };
  }

  function showEditor(city, slug) {
    current = slug;
    $('empty').hidden = true;
    $('editor').hidden = false;
    $('edTitle').textContent = city.name || 'New city';
    $('edPath').textContent = slug ? `data/cities/${slug}.json` : 'not saved yet';
    $('btnPreview').href = slug ? `/?city=${slug}` : '/';
    $('btnPreview').style.display = slug ? '' : 'none';
    $('btnDelete').style.display = slug ? '' : 'none';
    $('status').textContent = '';
    fill(city);
    document.querySelectorAll('.city-list button').forEach((b) => b.classList.remove('on'));
    if (slug) {
      const i = cities.findIndex((c) => c.slug === slug);
      document.querySelectorAll('.city-list button')[i]?.classList.add('on');
    }
  }

  async function openCity(slug) {
    try {
      const city = await api(`/api/cities/${slug}`);
      showEditor(city, slug);
    } catch (e) {
      setStatus(`Couldn't open ${slug}: ${e.message}`, true);
    }
  }

  function setStatus(msg, isErr) {
    const el = $('status');
    el.textContent = msg;
    el.className = isErr ? 'status err' : 'status';
  }

  /* ── New / skeleton ──────────────────────────────────────── */
  const SKELETON = {
    orient: {
      title: 'Orient yourself in sixty seconds',
      lede: '',
      map: {
        riverPath: '',
        riverLabel: '',
        riverLabelX: 196, riverLabelY: 316,
        bridge: null,
        districts: [{ x: 100, y: 120, r: 50, name: 'DISTRICT', note: 'what it is' }],
        caption: 'Not to scale.',
      },
      facts: [{ term: 'Currency', def: '' }, { term: 'The one rule', def: '' }],
    },
    arrive: {
      title: 'From the airport, without being robbed',
      lede: '',
      options: [
        { tone: 'best', tag: 'Best value', title: '', price: '', unit: '€', priceNote: '', time: '', body: '', note: '' },
        { tone: 'avoid', tag: 'Avoid', title: '', price: '', unit: '', priceNote: '', time: '', body: '', note: '' },
      ],
      transit: {
        title: 'Public transport, decoded', lede: '',
        columns: ['Ticket', 'Price', 'Notes'],
        rows: [{ label: '', values: ['', ''], best: 0 }],
        callouts: [{ tone: 'good', title: '', body: '' }],
      },
    },
    money: {
      title: '', lede: '',
      rules: [{ title: '', body: '' }],
      foot: '',
      converter: {
        title: 'Quick sanity check', lede: '', baseLabel: 'Amount in €', baseDefault: 20,
        targets: [{ key: 'usd', symbol: '$', label: 'US dollar', rate: 0.92, rateLabel: '€ per $' }],
        tip: '',
      },
    },
    sleep: {
      title: 'Where to sleep', lede: '',
      hoods: [{ name: '', price: '', unit: '/ night', verdict: '', body: '', tags: [] }],
      tipsTitle: '', tips: [{ title: '', body: '' }],
    },
    eat: {
      title: '', lede: '',
      compare: { title: 'The same thing, two prices', lede: '', rows: [{ item: '', itemNote: '', good: '', bad: '', badNote: '' }], foot: '' },
      trapTitle: '', traps: [''],
      dishTitle: '', dishes: [{ name: '', desc: '' }],
      myth: { title: '', paras: [''] },
    },
    see: {
      title: '', lede: '',
      sights: [{ name: '', pill: 'Free', body: '', prices: [{ label: '', value: '' }], note: '' }],
      freeTitle: '', free: [{ name: '', desc: '' }],
    },
    safe: {
      title: '', lede: '',
      scams: [{ title: '', body: '' }],
      emergency: [{ label: 'Any emergency, any language', number: '112' }],
    },
    speak: {
      title: '', lede: '',
      phrases: [{ local: '', pron: '', en: '' }],
    },
    closing: { lines: [''], sig: '' },
    sources: { note: '', links: [{ label: '', url: '' }] },
  };

  $('btnNew').addEventListener('click', () => {
    showEditor(
      {
        name: '', slug: '', localName: '', country: '', verified: '',
        currency: { code: 'EUR' },
        theme: { accent: '#C4402A', accent2: '#1F7D69', pop: '#2E5BA8', gold: '#E2A431', wash: '#FDF6EC' },
        hero: {}, art: {},
        ...SKELETON,
      },
      null
    );
    fields.slug.focus();
  });

  $('btnSkeleton').addEventListener('click', () => {
    fields.content.value = JSON.stringify(SKELETON, null, 2);
    validateContent();
  });

  $('btnCopyFrom').addEventListener('click', async () => {
    const names = cities.map((c) => c.slug).join(', ');
    const from = prompt(`Copy the content structure from which city?\n\n${names}`);
    if (!from) return;
    try {
      const city = await api(`/api/cities/${from.trim()}`);
      const content = {};
      CONTENT_KEYS.forEach((k) => {
        if (k in city) content[k] = city[k];
      });
      fields.content.value = JSON.stringify(content, null, 2);
      validateContent();
      setStatus(`Copied structure from ${from}. Now replace every price — none of them are true for this city.`, true);
    } catch (e) {
      setStatus(`Couldn't copy from ${from}: ${e.message}`, true);
    }
  });

  /* ── Save / delete ───────────────────────────────────────── */
  $('editor').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('btnSave');
    btn.disabled = true;
    try {
      const city = collect();
      await api(`/api/cities/${city.slug}`, { method: 'PUT', body: JSON.stringify(city) });
      current = city.slug;
      await refreshCities();
      showEditor(city, city.slug);
      setStatus(`Saved to data/cities/${city.slug}.json`, false);
    } catch (err) {
      const detail = err.body?.errors?.join('; ');
      setStatus(detail ? `${err.message}: ${detail}` : err.message, true);
    } finally {
      btn.disabled = false;
    }
  });

  $('btnDelete').addEventListener('click', async () => {
    if (!current) return;
    if (!confirm(`Delete data/cities/${current}.json?\n\nThis removes the city from the live site. It cannot be undone from here.`)) return;
    try {
      await api(`/api/cities/${current}`, { method: 'DELETE' });
      current = null;
      $('editor').hidden = true;
      $('empty').hidden = false;
      await refreshCities();
    } catch (e) {
      setStatus(e.message, true);
    }
  });

  /* ── Boot ────────────────────────────────────────────────── */
  const saved = sessionStorage.getItem(TOKEN_KEY);
  if (saved) {
    token = saved;
    unlock().catch(() => {
      sessionStorage.removeItem(TOKEN_KEY);
      location.reload();
    });
  }
})();
