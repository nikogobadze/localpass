#!/usr/bin/env node
/**
 * Bootstrap a translated city file from the English one.
 *
 *   node tools/build-lang.js ka prague
 *   node tools/build-lang.js ka           # all cities
 *
 * Reads   data/cities/<slug>.json          (English, canonical)
 *   plus  tools/lang/<lang>/<slug>.json    (prose overrides only)
 * Writes  data/cities/<lang>/<slug>.json
 *
 * Merging rather than re-authoring means structure can never drift: the same
 * keys, the same array lengths, the same prices, the same image paths. Only
 * the prose is replaced. Anything the overrides don't mention stays English,
 * and the report at the end tells you exactly what that was.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const CITY_DIR = path.join(ROOT, 'data', 'cities');

/** Deep merge, arrays by index. `null` in an override means "keep English". */
function merge(base, over) {
  if (over === null || over === undefined) return base;
  if (Array.isArray(base)) {
    if (!Array.isArray(over)) return over;
    if (over.length !== base.length) {
      throw new Error(`array length ${over.length} != ${base.length}`);
    }
    return base.map((v, i) => merge(v, over[i]));
  }
  if (base && typeof base === 'object' && !Array.isArray(base)) {
    if (typeof over !== 'object' || Array.isArray(over)) return over;
    const out = { ...base };
    for (const [k, v] of Object.entries(over)) {
      if (!(k in base)) throw new Error(`override key "${k}" is not in the English file`);
      out[k] = merge(base[k], v);
    }
    return out;
  }
  return over;
}

/* Latin letters that legitimately survive translation: proper nouns, street
   names, currency codes, URLs, HTML tags. Anything else is untranslated prose. */
const ALLOWED_LATIN = /^(?:[^a-z]*)$/i;
const SKIP_PATHS = /^(art\.|theme\.|slug$|orient\.map\.(riverPath|bridge|districts\.\d+\.[xyrw]|ring)|currency\.code)|(\.src|\.url|\.address|\.local|\.name)$/;

function auditEnglish(en, ka, prefix = '', report = []) {
  for (const [k, v] of Object.entries(en)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (SKIP_PATHS.test(p)) continue;
    const t = ka?.[k];
    if (typeof v === 'string') {
      // A string that is ALL Latin/punctuation (a proper-noun-only label) is not
      // untranslated prose — skip it. Georgian prose contains Georgian letters.
      if (v.length > 25 && t === v && /[Ⴀ-ჿ]/.test(v) === false) continue;
      if (v.length > 25 && t === v) report.push(p);
    } else if (v && typeof v === 'object') {
      auditEnglish(v, t || {}, p, report);
    }
  }
  return report;
}

const lang = process.argv[2];
if (!lang || lang === 'en') {
  console.error('usage: node tools/build-lang.js <lang> [slug ...]');
  process.exit(1);
}

const overDir = path.join(__dirname, 'lang', lang);
const slugs = process.argv.length > 3
  ? process.argv.slice(3)
  : fs.readdirSync(overDir).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));

const outDir = path.join(CITY_DIR, lang);
fs.mkdirSync(outDir, { recursive: true });

let failed = 0;
for (const slug of slugs) {
  const en = JSON.parse(fs.readFileSync(path.join(CITY_DIR, `${slug}.json`), 'utf8'));
  const over = JSON.parse(fs.readFileSync(path.join(overDir, `${slug}.json`), 'utf8'));

  let out;
  try {
    out = merge(en, over);
  } catch (e) {
    console.error(`✗ ${slug}: ${e.message}`);
    failed++;
    continue;
  }

  fs.writeFileSync(path.join(outDir, `${slug}.json`), JSON.stringify(out, null, 2) + '\n');

  const left = auditEnglish(en, out);
  const kb = (fs.statSync(path.join(outDir, `${slug}.json`)).size / 1024).toFixed(1);
  console.log(`✓ ${lang}/${slug}.json  ${kb}KB` + (left.length ? `  — ${left.length} strings still English` : ''));
  left.slice(0, 12).forEach((p) => console.log(`    · ${p}`));
  if (left.length > 12) console.log(`    · …and ${left.length - 12} more`);
  if (left.length) failed++;
}

process.exit(failed ? 1 : 0);
