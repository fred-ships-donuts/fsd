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

Without the prototype document and with a prototype in the Work Item, the **behavioral** crossing is not
verifiable: ask the user for the extraction (the extraction skill is a separate request, this skill does not
run it). The **visual** crossing still happens, observing the prototype directly, and item 8.4 cannot be OK: a
visual `defect` makes it Fail; otherwise it is Not verified with that reason. Do not compare with the
prototype from memory.

## The app

- **This skill does not start the application.** The user provides the URL of an instance that is already
  running
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

The **prototype** is the exception: it is only observed, never changed. Open it in Edge, in a new
tab, read-only, and never interact in a way that changes it. The implementation is inspected through the
driver above. Both are open at the same time only for the side-by-side capture; interaction is sequential.

One browser, one session at a time: inspections run in sequence.

## Crossing prototype × implementation

A visual and behavioral analysis: the same scenario runs on both sides and the two results are put side by
side. Without a prototype there is no crossing, but the matrix of step 1 is still built and run on the
implementation alone, as the coverage map of the checklist, and `crossing.md` opens with "no prototype:
nothing was crossed".

**1. Scenario matrix.** Before crossing, list the scenarios and write them in `crossing.md`. The sources are the
prototype document (its 12 groups), the PRD acceptance criteria and the checklist states. Minimum:

| Axis | Scenarios |
|---|---|
| State | initial load, loading, populated, empty, API error, validation error, rule error, success, disabled, offline, expired session, edit conflict, real-time update |
| Interaction | each action of the screen, hover, focus (keyboard), shortcuts, open/close of overlays, sorting, filtering, search, pagination or infinite scroll, selection, drag-and-drop, copy/paste, upload/download, leaving with unsaved changes |
| Data | realistic, long text, many records, zero and negative values, special characters |
| Viewport | 1440 and 375 px; add 1024 and 768 when the prototype adapts; touch and landscape at 375 |
| Preference | each theme the product offers, `forced-colors`, `prefers-reduced-motion`, 200% zoom, each supported locale |
| Profile | each profile whose view differs |
| Flow | happy path, alternatives (cancel, back, empty), error path, interruption and resumption |

A scenario the prototype cannot reach (it has no such state) is registered as `prototype-gap`, not skipped. A
cell the screen does not have (no theme switch, a single locale) is left out with the reason in `crossing.md`.

**2. Cross each scenario.** Put the prototype and the implementation in the same state, at the same width, each with its
own data (**mock in the prototype, real in the implementation**, never one standing in for the other), and capture both: `evidence/<scenario>-prototype.png` and
`evidence/<scenario>-implementation.png`. Compare, in this order:

- **Visual:** structure and order of the blocks; alignment and spacing; typography (family, size, weight);
  colors; icons; texts and labels; proportion and truncation. Measure with the computed style on the
  implementation and by eye or measurement on the prototype; a difference below the prototype's own
  tolerance (anti-aliasing, a 1 px rendering difference) is not a divergence
- **Behavioral:** what happens on hover, click, focus and keyboard; feedback and its timing; transitions and
  animation (duration, easing, what moves); what the state becomes after the action; navigation and URL;
  what each profile sees

**3. Register each divergence** in `crossing.md`: scenario, what the prototype shows or does, what the
implementation shows or does, both screenshots, the checklist item it affects and the class:

| Class | When | Effect |
|---|---|---|
| `defect` | the implementation departs from the prototype and nothing determines it | Fail on item 8.4 and on the specific item, `origin: implementation` |
| `intended` | the PRD or the seam determines the difference (quote the passage) | noted in `evidence`, not Fail |
| `prototype-gap` | the prototype does not define the behavior, or it defines it wrongly | falls back to the checklist; Fail would be `origin: prototype` |

**The prototype runs on mock data and the implementation runs on real data, from the real API.** Names, numbers, dates, counts and the order of records differ between
the prototype and the real application, and that is expected: it is never a divergence. Cross what the data
*shapes*, not the data itself: the structure and columns, the format (date, currency, number), the
truncation and wrapping, the state each kind of data produces (empty, long text, many records, error,
a value outside the usual range) and how the screen reacts to it. To compare, put the implementation in the
equivalent situation, always with real data (a record of the same kind, a filter that empties the list, long text on
`test_data`); the prototype's mock data may be the only place where some situation is shown, and that makes
it the reference for the behavior, not for the content. Never mock the API to make the implementation show
the prototype's data.

A divergence of taste, with no rule behind it, is not a divergence: record it as an observation. Reproduce
the divergence a second time before registering it as `defect`.

**4. Close.** Item 8.4 is OK only with every scenario crossed and no `defect` open; its `evidence` cites
`crossing.md` and the count per class. An open `defect` makes it Fail; with no `defect` and some scenario not
crossed, it is Not verified. A scenario that was not crossed goes to the inspector's "Outside coverage" and to
`meta.limits`, never to OK.

## Triggering states

A state that only appears under a special condition is triggered, not imagined, and **always against the real
API**: no response is simulated, intercepted, aborted or faked, and no mock server stands in for the API. The
state is provoked through the real application: real filters, real invalid input, real sessions, real data
on `test_data`. Browser-level conditions that leave the traffic untouched (offline, network throttling,
media, viewport, locale) are allowed:

| State | How to trigger |
|---|---|
| Loading | Network throttling with 3 s of latency on the real API |
| Empty | Filter without results |
| API error | A real failure: offline emulation, URL of a nonexistent record, an action the profile may not do |
| Rule error | Real data that breaks the rule on `test_data` (for example, a duplicate record), returning the contract's error code |
| Offline | Browser context offline emulation |
| Expired session | Clear the session cookie or token on the client; the real API answers 401 |
| Long text | Record with 120 characters without spaces created in `test_data` |
| Reduced motion | Emulation of the `prefers-reduced-motion: reduce` media |
| Slow network | Network throttling (latency and bandwidth) on all traffic |
| Edit conflict | Two real sessions editing the same record in `test_data` |
| Real-time update | A second real session changes the data, and the first receives the push or the polling |
| Many records | The volume that exists in the instance, or created in `test_data` |
| Theme and forced colors | `page.emulateMedia` with `colorScheme: 'dark'` and with `forcedColors: 'active'`, or the product's theme switch |
| Touch and orientation | New context with `hasTouch` and `isMobile`, viewport 375 × 667 and 667 × 375 |
| Locale and time zone | New context with `locale` and `timezoneId`, or the product's language switch |

In Playwright MCP, use the code tool (`browser_run_code`) for `context.setOffline`, network throttling
(Chrome DevTools Protocol `Network.emulateNetworkConditions`), `page.emulateMedia` and a new context
(`page.context().browser().newContext`); in a new context, sign in again, never with saved state. **Never**
`page.route`, `route.fulfill`, `route.abort`, `page.routeWebSocket` or any other interception of the API.
A state the real API and `test_data` cannot produce (a failure the API never returns, a volume that does not
exist) is not simulated: it is OK (code) with the reason, or Not verified. A mocked state never counts as proof.
Record in `evidence` which state was triggered and how.

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
