# LocalPass

A one-page city guide for people who have just landed. Real local prices, not tourist prices.
No signup, no accounts, no cookie banner, no ads, no affiliate links, no tracking.

Currently ships **Prague**, **Vienna** and **Ljubljana**. Adding a fourth city is a JSON file.

The page is six sections — **Essentials** (currency converter, the good-to-know facts including
tap water and emergency numbers, and how to get in from the airport), **Stay** (neighbourhoods +
8 hotels), **Eat** (8 restaurants), **See**, **Free**, **Speak** (12 phrases). Every section is
sized to fit one screen; long card rows scroll **horizontally** (see *Density* below).

The city JSON files still hold fuller content that isn't displayed (money rules, the scam list,
transit table, dish glossary, price-compare, food myths, the orientation map). Nothing is lost —
re-enable a block by adding a render call. Translations stay in sync via the same files.

```bash
npm start        # → http://127.0.0.1:5173
```

The admin token is printed in the terminal and stored in `.admin-token` (gitignored).

---

## Deploying (Vercel)

**The public site is pure static.** It is `index.html` + `render.js` + `styles.css` + `data/` +
`assets/`, and it never calls an API — it just `fetch`es the JSON files. So it needs no build step,
no server and no runtime. Verified by serving the repo with a dumb static server and rendering it
in a real browser: 7 sections, 27 images, 0 broken, 0 JS errors, both languages.

Import the repo at [vercel.com/new](https://vercel.com/new) and deploy. No settings to change —
`vercel.json` already declares it:

| Setting | Value | Why |
| --- | --- | --- |
| Framework | none | there is no framework |
| Build command | none | there is nothing to build |
| Output directory | `.` | the repo root *is* the site |

`vercel.json` also sets security headers and caching: photos in `assets/img/` are immutable for a
year (they never change once published), while `data/` is revalidated hourly so a price edit goes
live without a redeploy of the images.

### What does NOT get deployed

`.vercelignore` excludes `server.js`, `admin.*` and `tools/`. **This is deliberate, not tidiness:**

- `server.js` is the local dev server and the admin **write** API. It writes to the filesystem,
  which a static host cannot do.
- `admin.*` is the local editor. Without that API it is a dead page, so it has no business in
  production.

To edit content, run the admin **locally** (`npm start` → `/admin`), commit the changed JSON, and
push. Vercel redeploys. The city data is the product; git is its history.

> `.admin-token` is gitignored and is **not** in the repo. It is regenerated on first `npm start`.

---

## How it's put together

| File | What it does |
| --- | --- |
| `index.html` | An empty shell: nav, city switcher, progress bar, `<div id="app">`. |
| `render.js` | Builds the entire page from one city JSON. No framework. |
| `styles.css` | All styling. Five CSS custom properties are swapped per city; the rest is `color-mix()`. |
| `data/cities/*.json` | One file per city. **This is the product.** |
| `data/cities.json` | Auto-generated index the switcher reads. Don't hand-edit. |
| `server.js` | Dev server + admin write API. Zero dependencies. |
| `admin.html/.js/.css` | Local editor for the city files. |

**The public site is entirely static.** It only ever performs `GET`s against `data/`.
To deploy, copy `index.html`, `render.js`, `styles.css` and `data/` to any static host.
Do **not** deploy `server.js` or `admin.*` — they exist for local authoring.

---

## The editorial rule

This site's only real asset is that the numbers on it are true. One rule protects that:

> **Never write a price you have not checked against a published source, in the last few months.**

Everything else follows from it:

- Each city carries a `verified` date, shown in the hero and the footer.
- Each city carries a `sources.links` array. Every price traces to one of them.
- Where sources genuinely disagree, **say so in the copy.** Ljubljana's airport bus fare does
  exactly this — published figures range from €1.30 to €4.10, so the page prints the highest
  recent number and tells the reader why.
- Where a price can't be verified, **print no number.** Vienna's St Stephen's tower ticket says
  "priced at the door" rather than inventing a figure.
- Hotels (`sleep.hotels`) are named, but only as **attributable facts**, never a quality verdict:
  the hotel exists (verified), its star class, neighbourhood, an *indicative* price band, and the
  aggregate **guest score** where a source gives one (cited as the booking-site average, not
  ours). Each block says plainly: we haven't slept here, prices are seasonal, check current rates.
  Photos: where Commons has a real building exterior, that's used. Where it doesn't, the card
  shows a **representative** photo (a street in that neighbourhood) with a caption that says so
  outright — *"a Vinohrady street by it — representative, not the hotel"*. That is the line: a
  representative photo is fine, an *unlabelled* one is a lie. Neighbourhoods remain the primary
  recommendation — the hotels are a supplement.
- **Restaurants are named** (`eat.places`), and the asymmetry is deliberate: a bad meal costs
  €10 and an evening, a bad hotel costs €500 and a week. Every address is checked against an
  official listing — a city tourism board or the venue's own site — because a wrong address
  sends someone across a city to a locked door. Prices at individual restaurants move faster
  than anything else on this page. If you can't verify an address, don't list the place.

Prices rot. Prague raised transit fares on 1 Jan 2026; Vienna abolished its 48- and 72-hour
tickets the same day; Café Central closed for renovation in March. Re-check before each season
and bump `verified`.

---

## Adding a city

**Through the admin** — go to `/admin`, paste the token, click **+ New city**.

Fill in identity, theme and hero, then use **Copy structure from another city** to get a filled-in
skeleton in the content field. Then replace every single price. (The admin says this out loud
when you copy, because copying Prague's prices into Zagreb is the one way to break the site.)

**By hand** — drop a file in `data/cities/`. Restart, or hit any admin endpoint, to rebuild the index.

### Required fields

```jsonc
{
  "slug": "zagreb",                      // lowercase, hyphens, matches the filename
  "name": "Zagreb",                      // shown in the switcher
  "currency": { "code": "EUR" },         // required by the server's validator
  "localName": "Zagreb",                 // the big serif wordmark
  "country": "Croatia",
  "verified": "July 2026",
  "theme": {
    "accent":  "#A5294A",   // city primary
    "accent2": "#2E6E58",   // rendered as --good
    "pop":     "#33538F",
    "gold":    "#EEB135",
    "wash":    "#FDF4E8"
  }
}
```

Then the ten content sections: `orient`, `arrive`, `money`, `sleep`, `eat`, `see`, `safe`,
`speak`, `closing`, `sources`. Any section you omit is skipped rather than breaking the page.

### `eat.places` — named restaurants

Optional. Renders between the price-comparison table and the trap list.

```jsonc
"places": {
  "title": "Four places to actually eat",
  "lede": "…why we name restaurants but not hotels…",
  "items": [{
    "name": "Klobasarna",
    "pill": "The national sausage",       // short badge, top-right
    "area": "Old Town",                   // mono, accent colour
    "address": "Ciril-Metodov trg 15",    // must be verified
    "hours": "Mon–Sat 10:00–21:00",       // optional
    "body": "…prose, inline HTML allowed…",
    "rows": [{ "label": "Sausage", "value": "€6.90–8.90" }],
    "note": "…optional caveat, rendered in a red tint box…",
    "url": "https://www.klobasarna.si/"   // optional; official listing link
  }]
}
```

Cards render in a horizontal carousel, so the item count doesn't change the section's height.
Only the **first** `rows` entry is shown (as a compact price line) — the full table and `note`
are dropped so the card fits a screen.

### Photographs

~30 per city: 8 restaurant, 8 hotel, 4 sight, plus full-width bands. They live in
`assets/img/<city>/` and are attached in the city JSON:

```jsonc
"see": { "sights": [{ "image": { "src": "assets/img/prague/castle.jpg", "alt": "…" } }] },
"sleep": { "band": { "src": "…/band-street.jpg", "alt": "…", "caption": "…" } },
"eat":   { "band": { "src": "…/band-food.jpg",   "alt": "…", "caption": "…" } }
```

Every field is optional — a city with no photos renders exactly as it did before.

Restaurant cards in `eat.places` take the same `image` object, plus a **required `caption`**:

```jsonc
"image": { "src": "…/place-ukroka.jpg", "alt": "…",
           "caption": "Svíčková na smetaně — <strong>the dish, not this restaurant</strong>." }
```

A photo sitting above "U Kroka · Vratislavova 12" reads as a photo *of U Kroka*. Commons has free
photos of almost no restaurant interiors, so most cards show **the dish** you go there for, and a
few show **the actual venue** (Bitzinger, Schweizerhaus, Odprta kuhna, Grand Café Orient, Café
Hawelka). The caption carries the difference and is rendered **on the card**, not hidden in a title
attribute. **Every eat and stay card has a photo; none may have an uncaptioned representative one.**

**Rules, in order of importance:**

1. **Look at the image before you ship it.** Commons category membership and filenames lie.
   `Category:Gulas` is Spanish baby eels. `Category:Goulash`'s top hit is US Army soldiers
   ladling soup at night. A "Ringstraße tram" turned out to be an oil painting; a "Stephansdom"
   a close-up of roof tiles; a "Prague pub" a suburban roadhouse. All 29 images here were viewed.
2. **Free licence only.** CC0, CC BY, CC BY-SA, or public domain. Author, licence and source
   page for each file are in `assets/credits.json`, and `render.js` builds the footer credit
   list from that file — so the credits can never drift from the images actually on disk.
   CC BY-SA requires attribution; do not delete that footer block.
3. **The caption must say something the photo alone doesn't.** "Old Town Square" is a label.
   "Old Town Square — the single most expensive place in the city to order a beer" is the guide.
4. Cards render ~520px wide, bands ~1080px. Fetch card images at ~1040px and bands at ~1600px;
   don't ship 8-megapixel originals. Current total: ~7.8 MB, all `loading="lazy"`.

`aspect-ratio` in CSS reserves each image's box before it loads, so nothing shifts on the page.

### Theme

Five colours drive everything, set as CSS custom properties on `:root` at render time.
Every other shade — panel tints, dark sections, card shadows — is derived from them with
`color-mix()`, so you never pick more than five.

| JSON key | CSS var | Where it shows up |
| --- | --- | --- |
| `accent` | `--accent` | Section number chips, rule badges, keyword highlights, the tourist price |
| `accent2` | `--good` | The honest price, free-entry pills, the "best value" card |
| `pop` | `--pop` | Card shadows, decorative shapes, the map frame, phrase cards |
| `gold` | `--gold` | Dark sections, stickers, the hero sun, emergency numbers |
| `wash` | `--wash` | Page background. Keep it near-white — everything is derived from it |

The first four are used as text somewhere, so keep them dark enough to read on warm paper.
The admin previews all five as swatches on the city's own background.

### Prose fields carry HTML

`<strong>`, `<em>`, `<a href="#money">` all work inside `lede`, `body`, `note` and friends.
Labels, prices and phrases are escaped. **A city JSON is trusted content, exactly like a
template** — don't accept one from a stranger and load it unreviewed.

### Skyline

`art.skyline` is inner SVG markup on a `0 0 1200 240` canvas, ground at `y=240`. Group shapes
into `<g class="sky-far">`, `sky-mid` and `sky-near` for depth; `class="lattice"` gives you a
stroked, unfilled shape (Petřín tower, the Riesenrad). Leave it blank and a generic rooftop
silhouette is used. The admin previews it live as you type.

### Orientation map

A `0 0 400 340` schematic, driven by data rather than drawn:

- `riverPath` — an SVG path for the water. Prague and Ljubljana use one.
- `ring` — a dashed circle instead. Vienna uses this, because Vienna is a ring, not a river.
- `districts` — `{ x, y, r, name, note }` blobs.
- `bridge` — optional `{ x, y, w, label, labelX, labelY }`.

Omit what doesn't apply.

---

## The admin

`/admin`, gated on the token in `.admin-token`.

Identity, theme, hero and skyline get real form fields. The ten prose sections are a single
JSON textarea, validated as you type. That's deliberate: the writing *is* the product, and
splitting it across three hundred inputs would make it worse, not better.

Saving writes to a temp file and renames it, so a crash mid-write can't leave a half-written
city that breaks the live site. `data/cities.json` is rebuilt on every write and delete.

**The token gate is not authentication.** It stops a stray browser tab from rewriting your
files. The server binds `127.0.0.1` only, refuses to serve dotfiles, `server.js` and
`package.json`, and declines to delete the last remaining city. None of that makes it safe to
expose to the internet. Don't.

---

## Branding

The product is **LocalPass**. The nav and footer show the brand (compass logo + wordmark), never
the city — the city lives in the picker on the right, and in the tab title:

    LocalPass — Prague          LocalPass — პრაღა

- Logo: `assets/compass_icon_logo.png` (transparent PNG, so it sits on the cream nav and the dark
  footer alike). It is also the favicon. **It deliberately does not re-tint per city** — a logo
  that changes colour with the theme isn't a logo.
- There is no tagline. "The honest guide" was removed everywhere.
- `BRAND` is a constant at the top of `render.js`. It is a proper noun and is **not** translated.

## Density — every section fits one laptop screen

Each section fits a **1366×768 laptop** viewport, hero included. Measured in a real browser:

| hero | essentials | arrive | stay | eat | see | free | speak |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 609 | 748 | 511 | 761 | 741 | 762 | 668 | 693 |

Three structural decisions make that possible while *increasing* whitespace:

1. **Carousels.** `carousel()` in `render.js` — card rows scroll **horizontally** (swipe, or the
   arrows above-right of each track) instead of wrapping. A section holds 12 options in the
   vertical space of one row. Arrows sit **above** the track; overlaying them covered card titles.
2. **A section is a heading + at most one or two one-row blocks.** Anything more overflows a
   laptop screen no matter the spacing. This is why *Arrive* is its own section (bolted onto
   Essentials it pushed that past 768) and why Stay's neighbourhoods and hotels share **one**
   carousel. If you add a block to a section, re-measure.
3. **The converter is a horizontal strip.** Stacked, it was the tallest widget on the page
   (~380px) and single-handedly drove Essentials' height. Laid out in a row it's ~240px.

**Adding whitespace makes sections taller.** The air here was paid for by the three items above
plus `line-clamp` on card prose (1–3 lines). If you un-clamp a card body or stack another block,
something will stop fitting — `scratchpad/domtest/laptop.js` is the check.

## Browser support

Two modern CSS features are load-bearing. Baseline is **Chrome/Edge 111+, Safari 16.2+,
Firefox 113+** (all shipped 2023).

- `color-mix(in srgb, …)` derives every tint and shadow from the five theme colours. Older
  browsers fall back to the preceding declaration and lose the panel tints; the page stays
  readable.
- `overflow: clip` contains the decorative shapes. It is used instead of `overflow: hidden`
  **deliberately**: `hidden` makes an element a scroll container, which silently disables
  `position: sticky` on any descendant. The converter in §03 is sticky and sits inside `.sec`.
  Same reason `body` uses `overflow-x: clip` — `overflow-x: hidden` forces `overflow-y` to
  `auto`. Don't "fix" either back to `hidden`.

Decorative shapes are hidden below 1240px, and every animation is disabled under
`prefers-reduced-motion`.

---

## Verified

Server, API, and both interaction paths were exercised end-to-end:

- static routes, method guard (405), malformed percent-encoding (400), path-traversal
  containment, private files (403)
- auth: missing, wrong-length, same-length ASCII and **same-length multibyte** tokens all 401
- validation: blank name, array body, oversized payload (413)
- create → validate → delete round-trip; no stray `.tmp` files
- lossless save round-trip for all three cities, theme colours intact
- DOM render of all three under jsdom, zero runtime errors
- city switching: URL, `localStorage`, browser-back, in-memory cache, no stranded listeners
