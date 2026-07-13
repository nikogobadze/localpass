# Georgian translation — notes for a native reviewer

The Georgian was written to be **plain and safe** rather than to match the English literary
voice, on the theory that short clauses are easier to get right than long subordinate ones.
It is fluent, not native. Below are the specific places most worth a second eye.

The source of truth is `tools/lang/ka/<slug>.json` (prose only). After editing, run
`node tools/build-lang.js ka` to rebuild `data/cities/ka/*.json`.

## General decisions (apply everywhere)

- **Formal "you" (თქვენ).** The whole guide addresses the reader with plural/polite verb forms
  (`გადაიხადეთ`, `იქონიეთ`, `მოძებნეთ`). Consistent, but if a warmer register is wanted, this is
  the systematic change.
- **Loanwords kept in Latin:** proper nouns, street names, dish names, brand names, currency
  codes (`CZK`, `EUR`), app names (`Bolt`, `Uber`), and the section anchors. Deliberate — a
  visitor has to recognise `Staroměstské náměstí` on a sign, not a transliteration.
- **Transliterated pronunciations** in the "Speak" section (`დობრი დენ`, `გრიუს გოტ`) are the
  one place I'm least sure of — they render foreign phonology in Georgian letters, which is
  inherently approximate. Worth a careful pass. In particular:
  - Czech `ř` (in words like *Dobrý*) has no Georgian equivalent; I used plain რ.
  - German `ü` (*Grüß*, *für*) → იუ; German `ch` → ხ.
  - Slovene `č`/`š`/`ž` → ჩ/შ/ჟ.

## Word choices I'd want confirmed

| Term used | English | Doubt |
| --- | --- | --- |
| გზამკვლევი | guide (the honest guide) | Reads fine; "პატიოსანი გზამკვლევი" is the tagline everywhere. |
| ჩაის ფული | tip / gratuity | Literally "tea money". Common colloquially; a reviewer may prefer "საბაქშიში" or a rephrase. |
| ონკანის წყალი | tap water | Confident. |
| ხაფანგი | trap (tourist trap) | Confident. |
| ჯიხური | booth / kiosk (exchange, burek) | Confident. |
| გადამცვლელი ჯიხური | currency-exchange booth | Compound; reads clearly but a set phrase may exist. |
| სამოქალაქო ტანსაცმელში | in plain clothes (police, inspectors) | Idiom check. |
| დინამიური ვალუტის კონვერტაცია | dynamic currency conversion | Technical calque; correct but jargon-y, as in English. |
| ნაბახუსევი საჭმელი | hangover food (Ljubljana burek) | Colloquial; intended tone matches English. Confirm register. |
| სკვოტი / სკვოტერები | squat / squatters (Metelkova) | Loanword; no clean native term. |

## Grammar spots most likely to need a fix

These are the constructions where my confidence is lowest — case endings and verb agreement:

1. **prague · orient · facts "ერთი წესი"** — "ცნობილ ადგილს ათი წუთით მოშორდით". The dative +
   `მოშორდით` (move away from) government is the kind of thing I'd want checked.
2. **prague · money · rule 1** — long sentence with "რომლითაც ისინი გყიდიან ევროს". The
   instrumental relative + object marking is a stretch; verify it reads cleanly.
3. **vienna · orient · "უბნის ნომერი მისამართია"** — "შუა ორი ციფრი, ყოველთვის" is a deliberate
   fragment matching the English. Fine stylistically, confirm it's not jarring.
4. **vienna · eat · myth (Café Central)** — the longest passage in the whole site; dense with
   subordinate clauses. Most likely place for an awkward ending.
5. **ljubljana · money · foot** — "პოტიცას მეორე ნაჭერი" (a second slice of potica) as the
   subject of a joke sentence; confirm the genitive + word order land the humour.
6. **All `closing.lines`** — imperative mood, short. `გადაკვეთეთ`, `მოიარეთ`, `ავიდეთ`. Check the
   aspect (perfective vs imperfective) is the natural choice for standing advice.
7. **safe · scams · titles** — several are noun phrases ("ტაქსი, რომელიც თავად გპოულობთ").
   The relative clause verb agreement is worth a glance.

## Things that are NOT errors

- Latin text mid-sentence (proper nouns, `€`, `Kč`, `<strong>` content) is intentional.
- The section anchors in links (`#speak`, `#money`) stay English — they're internal IDs.
- Numbers, prices and dates are shared with the English file and never translated.
