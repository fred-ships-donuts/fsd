# Document chain templates

Each delivery moves through six documents (names in `../GLOSSARY.md`, paths in `../FSD-DIRECTORY-STRUCTURE.md`):
Craving → Flavor → Rise → Tray → Step → Taste.

**Link rule:** every document except Craving has a required `Source: <path>#<anchor> — <what it says>` pointing to an exact heading of the one before it. A generic "see SPEC" is not allowed. Step links to a Tray delivery item, Taste to a Flavor acceptance item.

| Stage | Limit (lines) | Template | Example |
|---|---|---|---|
| Craving | 40 | `craving.md` | `examples/craving.md` |
| Flavor | 120 | `flavor.md` | `examples/flavor.md` |
| Rise | 60 | `rise.md` | `examples/rise.md` |
| Tray | 60 | `tray.md` | `examples/tray.md` |
| Step | 30 | `step.md` | `examples/step.md` |
| Taste | 50 | `taste.md` | `examples/taste.md` |

- `craving.md`: problem, who, expected result, out of scope.
- `flavor.md`: behavior, inputs, exact messages, edge cases, acceptance items.
- `rise.md`: feasibility, risks, discarded alternatives, open questions.
- `tray.md`: delivery order, files touched, out of scope.
- `step.md`: the `description` of a `NN-<slug>.yaml` step.
- `taste.md`: result and one row per Flavor acceptance item.
