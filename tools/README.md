# tools

Layout checks that need a real browser. They are **not** part of the site and are not served.

```bash
npm install --no-save puppeteer      # ~150 MB, one-off
node server.js &                     # site must be running on :5173
node tools/check-overflow.js         # every grid, 7 viewport widths
node tools/measure-height.js compact # rendered page height per city
```

`check-overflow.js` exists because `.sec { overflow: clip }` hides horizontal overflow.
A card that spills out of its grid is simply cut off — no scrollbar, nothing in the DOM
to notice. Run this after touching any grid or any `white-space: nowrap` value.
