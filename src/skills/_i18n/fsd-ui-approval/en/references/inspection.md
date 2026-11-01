# Screen inspection

How the inspector observes the implementation. The ruler for each item is in the [checklist](checklist.md);
here is the method, common to all items.

## The source of the expected

In order, without skipping:

1. **The Work Item**: PRD, seam (`spec.md` or `plan.md`) and acceptance criteria. The PRD prevails over the
   prototype
2. **The prototype behavior document**: `docs/prototype-behavior/<screen>.md`, produced by the
   `fsd-extract-prototype-behavior` skill. It has the same 12 groups as the checklist and is the basis
   of items 8.2, 8.3 and 8.4 and of 12.1
3. **The checklist**, which applies even when the two sources above say nothing: behavior that no source
   defines and that the checklist requires is Fail with `origin: prototype`

Without the prototype document and with a prototype in the Work Item, item 8.4 is not verifiable: stop and
ask the user for the extraction (the extraction skill is a separate request, this skill does not run it). Do
not compare with the prototype from memory.

## The app

- **This skill does not start the application.** The user provides the URL of an instance that is already
  running
- **Database.** If the application queries a database, navigating it triggers queries, and the global rule
  `SQL_AUTORIZACAO_CODIGO` applies. Before navigating, ask whether the instance is the one with the data the
  user authorized (or use simulated data). Without that, do not open the screen
- **Profiles.** One login per profile of the briefing, with the credential read from an environment variable
  or a reference. Never ask for or record the value. No `storageState`, cookie or token saved to disk
- **Test data.** Save, delete and confirm only on data the user declared as test data. Without that
  declaration, do not click an action that saves or deletes: read the flow in the code and record OK (code)
  with the reason
- **No git.** The skill writes only to `[UI_DIR]`

## Browser driver

1. **Playwright MCP** (`browser_*` tools) ⇒ preferred. Headless and isolated
2. **`playwright-cli`** ⇒ fallback
3. **Claude in Chrome** only if neither exists and the user agrees
4. None ⇒ stop and say how to configure. Do not check the screen from the code alone: that downgrades every
   item to OK (code) or Not verified

The **prototype** is the exception: it follows the global rule `PROTOTIPO_NAVEGADOR`. Open it in Edge, in a new
tab, read-only. The implementation is inspected through the driver above.

One browser, one session at a time: inspections run in sequence.

## Triggering states

A state that only appears under a special condition is triggered, not imagined:

| State | How to trigger |
|---|---|
| Loading | Route with a delay (3 s) on the screen API |
| Empty | Filter without results; or a simulated response with an empty list |
| API error | Aborted route or simulated 500 response |
| Rule error | Simulated response with the contract error code |
| Offline | Browser context offline emulation |
| Expired session | Simulated 401 response |
| Long text | Simulated data with 120 characters without spaces |
| Reduced motion | Emulation of the `prefers-reduced-motion: reduce` media |
| Slow network | Delay on all responses |

In Playwright MCP, use the code tool (`browser_run_code`) for `page.route`, `context.setOffline` and
`page.emulateMedia`. Simulating a response is reading the interface: it does not change the backend. Record in
`evidence` which state was triggered and how.

## 200% zoom and widths

Playwright does not zoom the page. Use the reflow equivalent: a **640 px** wide viewport over 1280 (WCAG
1.4.4) and **320 px** (1.4.10). Widths for 7.1: 1440, 1280, 1024, 768 and 375.

## Measure contrast

Run in the page context (`browser_evaluate` or an equivalent tool). It returns each distinct combination of
text color, effective background and size, with the ratio. Text with transparency is not blended: the ratio is
approximate, and the evidence says so.

```js
(() => {
  const lum = ([r, g, b]) => { const f = c => (c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const num = s => s.match(/[\d.]+/g).map(Number);
  const background = el => { for (let e = el; e; e = e.parentElement) {
    const n = num(getComputedStyle(e).backgroundColor); if ((n[3] ?? 1) === 1) return n.slice(0, 3); }
    return [255, 255, 255]; };
  const seen = new Map();
  for (const el of document.querySelectorAll('body *')) {
    if (!el.getClientRects().length) continue;
    if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
    const cs = getComputedStyle(el), fg = num(cs.color).slice(0, 3), bg = background(el);
    const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
    const ratio = +((a + 0.05) / (b + 0.05)).toFixed(2);
    const px = parseFloat(cs.fontSize), large = px >= 24 || (px >= 18.66 && +cs.fontWeight >= 700);
    const key = `${cs.color}|${bg}|${px}|${cs.fontWeight}`;
    if (!seen.has(key)) seen.set(key, { text: el.textContent.trim().slice(0, 30), color: cs.color,
      background: `rgb(${bg})`, px, weight: cs.fontWeight, ratio, minimum: large ? 3 : 4.5, passes: ratio >= (large ? 3 : 4.5) });
  }
  return [...seen.values()].sort((x, y) => x.ratio - y.ratio);
})()
```

Interface components (field border, icon, focus) are measured by the same ratio, against the adjacent
background, with a minimum of 3:1. Item 9.2 is only OK with the list of measured combinations and none below
the minimum.

## Measure layout shift

```js
new Promise(res => { let cls = 0;
  new PerformanceObserver(l => l.getEntries().forEach(e => { if (!e.hadRecentInput) cls += e.value; }))
    .observe({ type: 'layout-shift', buffered: true });
  setTimeout(() => res(+cls.toFixed(3)), 3000); })
```

Run right after reloading the screen. CLS ≤ 0.1 is the minimum; the item asks for "no visible jump", and any
jump the screenshot shows is Fail even below 0.1.

## Evidence

- Screenshot in `[UI_DIR]/evidence/<id>-<slug>.png` (for example `4.2-empty-vessels.png`), at the points that
  prove it. The path goes in the `shot` field
- Never capture credentials, tokens or real personal data. Personal data on the screen: crop the screenshot or
  use test data
- Measured values go in the text (the contrast ratio, the target width, the transition duration), not just
  "ok"
- Reproduce a second time before recording a Fail. If it did not reproduce, record the Fail as intermittent in
  `evidence`
