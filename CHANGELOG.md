# Changelog

All notable changes to `fsd` (Fred Ships Donuts) are documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

First public version (v1.0.0, [#12](https://github.com/fred-ships-donuts/fsd/issues/12)). What v1 ships, by feature:

### Added

- Interactive wizard (`fsd init`) to install, update and remove skills, with a progress bar, themes, a conflicts step and an execution screen. It exits with code 1 when a run fails. ([#1](https://github.com/fred-ships-donuts/fsd/pull/1), [#77](https://github.com/fred-ships-donuts/fsd/pull/77), [#76](https://github.com/fred-ships-donuts/fsd/issues/76))
- `fsd update` updates the CLI itself, and `fsd update skill [name]` updates the installed skills (all, or one). `fsd link skill [name]` links installed skills that have no link. `--force` replaces a skill of the same name that is in the way. Shortcuts: `-u`, `-s`, `-f`. ([#1](https://github.com/fred-ships-donuts/fsd/pull/1))
- Installs run with a journal, undo and recovery of runs that died halfway, so a failed install does not leave the machine half changed. ([#1](https://github.com/fred-ships-donuts/fsd/pull/1), [#44](https://github.com/fred-ships-donuts/fsd/pull/44), [#6](https://github.com/fred-ships-donuts/fsd/issues/6))
- `fsd task new`, `fsd task list` and `fsd task step add` create and list the tasks of `nook/` and add steps to them; `fsd task done` and `fsd task archive` move a task through `nook/bench`, `nook/rack` and `nook/fridge`. ([#27](https://github.com/fred-ships-donuts/fsd/pull/27), [#2](https://github.com/fred-ships-donuts/fsd/issues/2), [#57](https://github.com/fred-ships-donuts/fsd/pull/57), [#7](https://github.com/fred-ships-donuts/fsd/issues/7))
- `--json` on `fsd task new`, `fsd task list` and `fsd task step add`, for agents that read the output. ([#67](https://github.com/fred-ships-donuts/fsd/pull/67), [#18](https://github.com/fred-ships-donuts/fsd/issues/18))
- Baker definitions in `nook/bakers/` and Recipes in `nook/cookbook/` are read and validated, with an error that names the file and the field. ([#107](https://github.com/fred-ships-donuts/fsd/pull/107), [#99](https://github.com/fred-ships-donuts/fsd/issues/99), [#108](https://github.com/fred-ships-donuts/fsd/pull/108), [#103](https://github.com/fred-ships-donuts/fsd/issues/103))
- Skills catalog with one skill per document of the work chain (Craving, Rise, Flavor, Taste, Tray, Step), the code-standard and UI-approval skills, and `fsd-nook-tasks`, which plans tasks and reads `nook/kitchen/`. ([#66](https://github.com/fred-ships-donuts/fsd/pull/66), [#52](https://github.com/fred-ships-donuts/fsd/issues/52), [#46](https://github.com/fred-ships-donuts/fsd/pull/46), [#9](https://github.com/fred-ships-donuts/fsd/issues/9), [#106](https://github.com/fred-ships-donuts/fsd/pull/106), [#97](https://github.com/fred-ships-donuts/fsd/issues/97))
- Install adds `nook/` entries to the project `.gitignore`. ([#49](https://github.com/fred-ships-donuts/fsd/pull/49), [#8](https://github.com/fred-ships-donuts/fsd/issues/8))

### Fixed

- A lock file (`O_EXCL`) stops two `fsd task` commands or runs from writing the same project at once. ([#69](https://github.com/fred-ships-donuts/fsd/pull/69), [#19](https://github.com/fred-ships-donuts/fsd/issues/19))
- `fsd task done` and `fsd task archive` name the right action in their failure messages, and a failed save no longer marks the change as committed. ([#62](https://github.com/fred-ships-donuts/fsd/pull/62), [#31](https://github.com/fred-ships-donuts/fsd/issues/31), [#65](https://github.com/fred-ships-donuts/fsd/pull/65), [#59](https://github.com/fred-ships-donuts/fsd/issues/59))

[Unreleased]: https://github.com/fred-ships-donuts/fsd/commits/develop
