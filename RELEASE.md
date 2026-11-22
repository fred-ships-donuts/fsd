# Releasing `fsd`

How a version of `fsd` goes from `develop` to a GitHub Release. The team supervisor (`fsd-dispatch`) prepares and executes every step; **the author is the only approver** of the release PR into `main`. There is no npm publish: the release lives on GitHub only.

## Version

- [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html), from the [Conventional Commits](https://www.conventionalcommits.org/) since the last `v*` tag.
- Only commits that touch what ships count: `src/` and `package.json` (the same scope the `changelog` CI job checks). Team tooling in `team/` never changes the product version.
  - `feat` → minor; `fix` or `perf` → patch; `!` after the type, or a `BREAKING CHANGE:` footer → major; anything else → no release.
  - With no tag yet, the first release is the version in `package.json`.
- `team/bin/fsd-release plan` prints the next version and how many product commits it counts.

## When to cut

- `[Unreleased]` in `CHANGELOG.md` is not empty, and `fsd-release plan` gives a version.
- `develop` is green on the 4 required jobs (build, test, paths, shellcheck).
- No card in In Review or Changes Requested that the notes already describe.

## Steps

1. **Prepare** (`team/bin/fsd-release prepare`; `--dry` shows it all first):
   - branch `release/vX.Y.Z` from `develop`;
   - `CHANGELOG.md`: `[Unreleased]` becomes `[X.Y.Z] - YYYY-MM-DD` ([Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/)), with a new empty `[Unreleased]` and the compare links at the bottom;
   - `package.json` version = `X.Y.Z`;
   - a PR from the branch into `main` with the notes, the version and the checklist, with the author as the reviewer.
2. **Approve**: only the author. The `ProtMain` ruleset requires 1 approval after the last push and signed commits.
3. **Merge and tag**: with the author's approval and CI green, the supervisor merges (`--match-head-commit`) and creates the **signed tag** `vX.Y.Z` on the merge commit, with the release key held by the broker.
4. **GitHub Release** for the tag:
   - the notes are the CHANGELOG section;
   - the assets are the package tarball (`npm pack`), an **SBOM** (CycloneDX JSON) and `SHA256SUMS`.
5. **Audit**: one append-only entry per release, with who prepared it, who approved it, the tag, the commit, the CI run and the asset checksums. Each entry carries the hash of the previous one.

## Checklist (also in the PR body)

- [ ] CI green on the release branch (build, test, paths, shellcheck)
- [ ] CHANGELOG section matches what ships (Keep a Changelog)
- [ ] `package.json` version = the tag
- [ ] Release notes reviewed
- [ ] After merge: signed tag, GitHub Release with SBOM and SHA-256 checksums (no npm publish)
- [ ] Audit entry recorded; rollback plan below

## Rollback

A published tag is never moved or deleted.

1. If the problem is found **before the GitHub Release is published**: close the release PR, or revert its merge on `main` through a PR; no tag exists yet.
2. If it is found **after**:
   - mark the GitHub Release as a pre-release, with a note at the top that points to the fix;
   - fix on `develop` (`fix:` commit, so the next version is a patch) and cut `vX.Y.(Z+1)` with the steps above;
   - record the rollback in the audit log, with the bad tag and the fix tag.
