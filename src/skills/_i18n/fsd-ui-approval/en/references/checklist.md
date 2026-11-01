# Interface checklist

The approval ruler: 12 groups, 66 items, 20 blocking (**B**). **All 66 items receive a status**, in every
approval, for every screen in scope. An item without a line in `items.json` invalidates the consolidation.

This file is the source of the IDs, the blocking items and the criteria: `scripts/consolidate.py` reads the
rows of this table. Do not renumber or reorder the rows.

How to read the columns:

- **OK when**: the criterion the implementation must meet. Meeting part of it is not OK
- **How to verify**: the minimum method. The inspector may go further, never fall short
  ([inspection.md](inspection.md))
- **N/A only when**: the only accepted justification. Outside it, the item applies and receives OK, Fail or
  Not verified ([status-and-verdict.md](status-and-verdict.md#na))

When an item bundles several parts (6.1: sorting and filters; 6.5: truncation, numbers, header, scroll), each
part that exists on the screen must pass. A part the screen should have and does not have is Fail.

## 1. Element states

| ID | B | Item | OK when | How to verify | N/A only when |
|---|---|---|---|---|---|
| 1.1 | B | Hover with visible change and correct cursor | Every interactive element changes appearance on hover and the cursor is `pointer` on link, button and clickable row, `text` on field, `not-allowed` on disabled | Hover over each type of interactive element, with a screenshot before and after; cursor via `getComputedStyle(el).cursor` | The screen has no interactive element |
| 1.2 | B | Visible keyboard focus, no trapped focus | Tab goes through all interactive elements in visual order, each stop has a visible focus indicator (contrast ≥ 3:1 against the background) and Shift+Tab leaves all of them; nothing traps focus outside a modal | Sequential Tab with a screenshot on each element type; computed `outline` on `:focus-visible` | Never |
| 1.3 | | Active/pressed with feedback | Button and clickable control show a pressed state (color, shadow, scale) during the click | Mouse down without releasing, screenshot, release; or an `:active` rule in the code (OK (code)) | The screen has no clickable control |
| 1.4 | B | Disabled is distinct, has no action, with a reason when not obvious | Distinct appearance, no action on click or Enter, `disabled` or `aria-disabled` in the DOM, and a visible reason (text or tooltip) when the cause is not obvious | Trigger the condition (invalid form, end of pagination, missing permission), click, Enter, read the attribute | No control on the screen can become disabled |
| 1.5 | | Selected, checked and expanded beyond color | Each state is distinguished by shape, icon, text or weight, and is exposed by `aria-selected`, `aria-checked`, `aria-expanded`, `aria-current` or `aria-sort` | Toggle each control; accessibility snapshot; grayscale screenshot | The screen has no control with these states |
| 1.6 | B | Loading on the element, with double-click blocking | An asynchronous action shows loading on the element itself (button in loading state, skeleton) and repeated triggering is blocked: a double click generates a single request | Delay the response (route with delay), click twice, count the requests | The screen has no asynchronous action or data load |

## 2. Buttons and actions

| ID | B | Item | OK when | How to verify | N/A only when |
|---|---|---|---|---|---|
| 2.1 | | Primary, secondary and destructive hierarchy | At most one primary per decision region, secondary buttons visually subordinate, destructive distinct (color, icon or position) and never with the primary style | Screenshot of the screen and the modals; list the buttons by style | The screen has no action button |
| 2.2 | | Verb + object labels, same as the system | Label starts with a verb and states the object ("Save shipowner"), with no bare "OK" or "Yes"; the same action has the same label across the whole system and in the prototype | List the labels and compare with other screens and with the prototype document | The screen has no action button |
| 2.3 | | Order of Save and Cancel | Order and position follow the system standard and are the same in every form and modal on the screen | Compare the forms and modals of the screen with each other and with the system standard | The screen has no form or confirmation modal |
| 2.4 | B | Confirmation on a destructive action | A destructive or irreversible action asks for a confirmation that says what will be affected, the confirm button carries the action name and the initial focus is on Cancel | Trigger only on declared test data; otherwise, read the code (OK (code)) | The screen has no destructive action, not even via menu or icon |
| 2.5 | B | Feedback after the click | Every user action produces an immediate visible response: state change, message, toast or navigation | Trigger each action on the screen and capture the result | The screen has no action |
| 2.6 | | Click area and icon labels | An icon-only button has an accessible name and tooltip or label; the target is ≥ 24 × 24 CSS px (ideal 44) | `getBoundingClientRect` of the icon buttons; accessibility snapshot | The screen has no interactive icon |

## 3. Forms and data entry

Search and filters are input fields: the group applies to them.

| ID | B | Item | OK when | How to verify | N/A only when |
|---|---|---|---|---|---|
| 3.1 | B | Visible labels, required and optional, `autocomplete` | Every field has an associated visible `label` (a placeholder alone does not count), a consistent indication of required or optional and a suitable `autocomplete` on login and personal data fields | `label[for]`, `required`, `autocomplete` in the DOM; type and check that the label remains | The screen has no input field |
| 3.2 | | Masks and formats | A field with a format (SSN/EIN, date, currency, phone, ZIP code) has a mask, accepts paste and sends the normalized value | Type a valid, an invalid and a pasted value; read the request body | The screen has no formatted field |
| 3.3 | B | Validation with a message next to the field | Validates at the right moment (on leaving the field or on submit, never on every keystroke), shows text next to the field saying how to fix it, uses `aria-invalid` and `aria-describedby`, and moves focus to the first invalid field on submit | Submit empty and invalid; read the attributes; check `document.activeElement` | No field on the screen has a validation rule |
| 3.4 | B | Business-rule errors by stable code | A rule error coming from the API is mapped by the stable code of the contract, not by the text, to a clear message on the field or on the screen; an unknown code falls back to a generic actionable message | Simulate the error response with the contract code (route with a simulated response); read the code map in the code | The screen does not save or apply business rules |
| 3.5 | | Enter, Tab and Esc | Enter submits the form or activates the row, Tab follows a logical order, Esc closes the overlay and cancels editing without silent loss | Test the three keys in each form, overlay and row | The screen has no form or overlay |
| 3.6 | | Dependent fields | Changing the parent field clears or reloads the children and invalidates the previous selection; the child is disabled while the parent is empty | Change the parent with the child filled in | The screen has no dependent fields |
| 3.7 | | Unsaved changes warning | Leaving with a pending edit (menu, back, closing a modal, F5, closing the tab) warns; with no edit, it does not warn | Edit and try to leave in each way | The screen has no editing |
| 3.8 | | Select, autocomplete, datepicker and upload with keyboard | Operable by keyboard (arrows, Enter, Esc, typing to filter), with correct `role` and `aria-expanded`, "no results", loading and, for upload, progress and error | Operate each control by keyboard only; force an empty list | The screen has none of these controls |

## 4. System feedback and states

| ID | B | Item | OK when | How to verify | N/A only when |
|---|---|---|---|---|---|
| 4.1 | B | Loading state | Initial load and reload show a skeleton or spinner in place of the content, with no blank screen and no layout jump | Delay the response (route with delay) and capture | The screen does not load remote data |
| 4.2 | B | Empty state with guidance or action | A list or query without results says why and what to do (adjust the filter, create the first item) and offers the action allowed to the profile | Force empty: filter without results or simulated empty response | The screen has no list or query |
| 4.3 | B | Actionable error state | An API failure shows a message in user language, with no technical detail, with an action ("Try again"), without losing what was typed, with `role="alert"` | Abort the request or simulate a 500 | The screen makes no remote call |
| 4.4 | | Confirmed success | A successful save confirms discreetly (toast, message or visible change) and leads to the next state | Save on declared test data; otherwise, read the code (OK (code)) | The screen does not save |
| 4.5 | | Timeout, offline and expired session | Timeout and offline show a message and allow retrying; an expired session (401) leads to login and returns to the point of origin without losing data | Emulate offline; simulated 401 response; delay above the timeout | The screen makes no remote call |
| 4.6 | | Toasts and banners | Consistent position, long enough to read (≥ 5 s, an error does not disappear on its own), closable by keyboard, `role="status"` or `"alert"`, without covering an action | Trigger each message and measure the duration | The screen shows no toast or banner |

## 5. Navigation and orientation

| ID | B | Item | OK when | How to verify | N/A only when |
|---|---|---|---|---|---|
| 5.1 | | Correct active menu item and title | The menu marks the active item (beyond color, with `aria-current`) and the title, the `<title>` and the breadcrumb match the screen | Navigate to the screen and check the four | Never |
| 5.2 | B | Back, F5 and deep link keep the context | The URL reflects the screen and the relevant state (filters, sorting, page, tab, open record); F5 and opening the URL in another tab reproduce the same state; Back and Forward restore the context | Apply a filter, copy the URL, open in a new tab, F5, Back | The screen has no state to preserve (state which) |
| 5.3 | B | Modal and drawer | Opens with focus inside (title or first field), traps focus (cyclic Tab), closes via X, Esc and click outside (except with unsaved data), returns focus to the originating element, makes the background inert, with `role="dialog"`, `aria-modal` and `aria-labelledby` | Open, Tab 10 times, Esc, click outside, check the focus on closing | The screen has no modal, drawer or modal popover |
| 5.4 | | Tabs and accordions preserve state | Switching preserves filters, scroll and typed data; exposes `role="tab"`, `aria-selected` and `aria-expanded`; arrows navigate the tabs | Switch with state filled in | The screen has no tabs or accordions |
| 5.5 | | 404, 403 and route without permission | A nonexistent route shows 404 with a way back; without permission it shows 403 or redirects with an explanation, without leaking data; a menu item without permission does not appear | Open a nonexistent URL and a URL of another profile | The user excluded it from the scope, recorded in the briefing |
| 5.6 | | Items and actions per profile | Each profile sees only the permitted items and actions; an action without permission is absent or disabled with a reason | Repeat the screen with each profile of the briefing | The system has a single profile, confirmed in the briefing |

## 6. Tables, lists and data

| ID | B | Item | OK when | How to verify | N/A only when |
|---|---|---|---|---|---|
| 6.1 | | Sorting with indicator; filters with apply, clear and counter | A sortable column shows a direction indicator and `aria-sort`; filters apply predictably, offer "Clear filters" and show the count of active filters | Sort each column; apply several filters; clear | The screen has no sorting or filter |
| 6.2 | | Search with debounce and canceled requests | Remote search waits for a pause in typing (300 to 500 ms) and discards the previous request, with no stale response overriding the new one; local search responds immediately | Type fast and count the requests | The screen has no search, or it is local with no request (say which) |
| 6.3 | | Pagination with total and items per page | Shows the total number of records and the items-per-page selector, indicates the current page (`aria-current`), disables previous and next at the ends and keeps sorting and filters when paginating | Paginate with sorting and filter active | The list does not paginate by contract (≤ page size guaranteed) |
| 6.4 | | Row selection and batch actions | Selection per row and "select all" with a count, indeterminate state, batch action only with a selection and confirmation on a destructive batch | Select some, all and none | The screen has no row selection |
| 6.5 | | Truncation, right-aligned numbers, fixed header, horizontal scroll | Truncated text has a tooltip or expansion with the full text; numbers and values on the right (identifiers on the left); the header stays visible when scrolling a long table; horizontal scroll stays in the table container, with the first column identifiable | Load long data and many records; narrow the window | The table has no long text, numbers or scrolling (justify per part) |
| 6.6 | | Row click without conflict with inner actions | Clicking the row performs the main action; inner checkbox, menu and link do not trigger the row action; the clickable row is reachable by keyboard with a suitable `role` | Click each inner control and the row; Tab and Enter | The screen has no clickable row or inner action |
| 6.7 | B | Empty, loading and error inside the table | The three states appear inside the table container, with the header preserved, each with the behavior of 4.1, 4.2 and 4.3 | Trigger the three states | The screen has no table or list |

## 7. Layout and responsiveness

| ID | B | Item | OK when | How to verify | N/A only when |
|---|---|---|---|---|---|
| 7.1 | | Breakpoints without undue horizontal scroll | At 1440, 1280, 1024, 768 and 375 px there is no horizontal page scroll or clipped content, and menu and actions adapt | Resize; `scrollWidth > clientWidth`; capture | The PRD declares the supported width range (quote the passage) |
| 7.2 | | Consistent alignment, spacing and grid | Equivalent elements align to the grid and spacing comes from the design system scale, with no loose values | Screenshot and computed `margin` and `padding` | Never |
| 7.3 | | Long texts, wrapping and overflow | Long title, name, email and message wrap or truncate with a tooltip, without overflowing the container or overlapping | Load or simulate long data | Never |
| 7.4 | | 200% zoom without loss of function | With 200% zoom (equivalent: a 640 px wide viewport over 1280) and enlarged text, everything stays visible and operable, without two-axis scrolling; at 320 px the content reflows | Resize to 640 and 320 px; go through the flow | Never |
| 7.5 | | Fixed elements do not cover content | Fixed header, footer and action bar do not cover content or focus (`scroll-padding`), including at 375 px and with 200% zoom | Tab to the last item and scroll to the end | The screen has no fixed element |

## 8. Visual consistency

| ID | B | Item | OK when | How to verify | N/A only when |
|---|---|---|---|---|---|
| 8.1 | | Design system colors, typography, spacing and icons | Computed values come from the design system tokens, with no loose color or measure in the screen code; same family, type scale and icon set | Computed styles plus a search for literal values in the screen code | Never. Without a defined design system, the item is Not verified |
| 8.2 | | Same components with the same behavior | The same component (table, search, panel, modal, select) has the same appearance and the same behavior on all screens in scope, and uses the shared component, with no copy | Compare the occurrences side by side; search the code for duplicates | The screen is the only one in scope and does not repeat a system component |
| 8.3 | | Terminology equal to the prototype and the legacy system | Terms equal to those of the prototype, the PRD glossary and the rest of the system, with no synonym for the same concept | Compare the screen texts with the prototype document (groups 2 and 11) and with the PRD | Never |
| 8.4 | | Fidelity to the navigable prototype | Each behavior of the prototype document (structure, texts, states, actions) exists identically in the implementation; a divergence is Fail with the line of the document. A divergence that the PRD or the seam determines is noted and is not Fail | Go through the prototype document group by group against the screen | The Work Item has no prototype (confirmed in the briefing) |

## 9. Accessibility

| ID | B | Item | OK when | How to verify | N/A only when |
|---|---|---|---|---|---|
| 9.1 | B | Whole flow operable by keyboard only, logical Tab order | The whole flow (menus, overlays, tables, selects, upload) works without a mouse, Tab order follows visual order, with no focus trap | Run the happy path and the alternatives without the mouse | Never |
| 9.2 | B | Minimum contrast | Normal text ≥ 4.5:1; large text (≥ 24 px, or ≥ 18.66 px bold) ≥ 3:1; interface components and focus ≥ 3:1; includes placeholder, secondary text, hover, badges and error | Measure color and effective background of each distinct combination ([inspection.md](inspection.md#measure-contrast)) and record the ratios | Never |
| 9.3 | B | Information never by color alone | Status, error, selection, sorting and chart carry text, icon or shape beyond color | Capture the screen in grayscale | Never |
| 9.4 | B | Semantic HTML, `label`, `alt`, `aria-*` | Landmarks (`header`, `nav`, `main`), headings in order, `th` with `scope`, `<button>` and `<a>` on controls (never a clickable `div`), `alt` on images (`alt=""` on decorative ones), valid `aria-*` with no redundancy | Accessibility snapshot plus DOM inspection | Never |
| 9.5 | | Errors and toasts announced | Validation error, toast, empty result, result count and loading are in an `aria-live` region or `role="alert"` and `"status"` | Read the attributes of the regions | The screen has none of these messages |
| 9.6 | | `prefers-reduced-motion` respected | With `prefers-reduced-motion: reduce`, non-essential animations are disabled or reduced | Emulate the preference; or find the rule in the styles (OK (code)) | The computed styles of the screen have no `transition` or `animation` |

## 10. Animations and microinteractions

| ID | B | Item | OK when | How to verify | N/A only when |
|---|---|---|---|---|---|
| 10.1 | | Coherent duration and easing | Microinteraction between 100 and 300 ms, overlay up to 500 ms, same easing for the same type of transition, no long decorative animation | Computed `transition-duration`, `animation-duration` and easing | The computed styles of the screen have no `transition` or `animation` |
| 10.2 | | No layout shift or flicker on load | No content jump on load (images with dimensions, skeleton the size of the content) and no state flicker | Measure `layout-shift` with `PerformanceObserver`; record the load | Never |
| 10.3 | | Interruptible and disableable animation | The animation does not block interaction, can be interrupted (close during opening), nothing flashes more than 3 times per second, and respects 9.6 | Interact during the transition | The screen has no animation |

## 11. Content and microcopy

| ID | B | Item | OK when | How to verify | N/A only when |
|---|---|---|---|---|---|
| 11.1 | | Clear messages, no jargon or raw code | No technical jargon, unexplained acronym, raw error code or text in another language; a single tone | Read all the texts of the screen and of the messages | Never |
| 11.2 | | Error says what happened and what to do | Every error message carries the cause in user language and the next action | Trigger each error of the screen | The screen has no error message |
| 11.3 | | Dates, numbers, currency and time zone | Date `MM/dd/yyyy`, time `h:mm a`, numbers `1,234.56`, currency `$`, explicit time zone when relevant, no raw ISO (US product formats) | Check each displayed value | The screen shows no date, number or currency |
| 11.4 | | Spelling, accents and capitalization | No errors in the texts of the screen and of the code (placeholder, `aria-label`, `title`, messages); uniform capitalization | Read the screen and the texts in the code | Never |

## 12. Flow, performance and perceived security

| ID | B | Item | OK when | How to verify | N/A only when |
|---|---|---|---|---|---|
| 12.1 | B | Happy, alternative and error paths end to end | The happy path ends without error; the alternatives (cancel, back, empty) and the error paths (API failure, validation) were followed to the end, and the screen ends in a coherent state | Follow each path of the prototype document and of the PRD | Never |
| 12.2 | | Few clicks and error prevention | The main task uses the minimum reasonable number of steps (counted and compared with the prototype) and the form prevents error (restricts, suggests, confirms) | Count the steps of the main task | Never |
| 12.3 | | Resuming an interrupted flow | A step-based flow preserves the draft when going back, reloading or losing the session and allows resuming from the point | Interrupt in the middle and come back | The flow has no steps or saving |
| 12.4 | | Feedback within 100 ms and slow network | Each action gives a visual response within 100 ms and, on a slow network, nothing is left without an indication or freezes | Delay the responses by 3 s and trigger each action | Never |
| 12.5 | | Sensitive data masked | SSN, EIN, phone, email, token and password follow the product rule (masked, revealed on action); password in `type="password"`; nothing sensitive in the URL, console or storage without need | Inspect screen, URL, console, network and storage | The screen exposes no sensitive data (list what it exposes) |
