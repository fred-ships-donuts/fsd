---
name: investigating-flaky-results
description: Covers what to do when the same check sometimes passes and sometimes fails. Treat it as a bug until explained, measure the failure rate over repeated runs, check the usual suspects (races, timing, leftover state, listing order, screens captured too early, terminal size), isolate one variable at a time, tell product, test and environment flakiness apart, and record the rate and conditions. Use when a repeated run gives a different result.
---

# Investigating flaky results

A result that flips is a bug in the product, the check or the environment, until proven otherwise. Never approve by majority vote.

## 1. Measure

Run the same check N times (10 is a good start) under the same conditions, each from a fresh state. Record the rate: "fails 3 of 10".

## 2. Usual suspects

- **Races:** two processes, a lock, a file read while being written, the terminal redrawing.
- **Timing:** a `sleep`, a timeout, a deadline, the clock crossing a boundary.
- **Leftover state:** temp dirs, a lock, a cache, a registry from the previous run.
- **Order:** directory listing order, object key order, parallel output.
- **Capture too early:** the screen read before it finished drawing.
- **Environment:** terminal size, locale, `HOME`, network, load on the machine.

## 3. Isolate

Change one variable at a time: fresh dirs every run, then add a wait for the expected text, change the order, change the size, run alone versus under load. The variable that changes the rate is the lead.

## 4. Classify

| Finding | What to do |
|---|---|
| The product is flaky (real race, ordering bug) | Report it as a bug with the rate and conditions (`reporting-bugs`); the item fails. |
| The check is flaky (captured too early, depended on order) | Fix how you verify (wait for text, sort output) and re-run; the verdict follows the fixed check. |
| The environment is flaky (machine, network) | Record it, re-run in a clean environment, and say so in the report. |

## 5. Record

The rate, the conditions, and the passing and failing runs side by side. A flip that was not explained is reported as such, never hidden.

<!-- skill-files -->
## Files of this skill

- [`references/suspects.md`](references/suspects.md)
