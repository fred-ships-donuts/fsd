---
name: managing-releases
description: Covers how to decide a version is ready and release it predictably. Includes semantic versioning for file formats, flags and messages, pre-releases, a ready-to-publish checklist (nothing open for the milestone, changelog complete, package contents and a clean install checked), tagging and release notes from the changelog, recovery with deprecate and a patch instead of unpublish, and which steps belong to the author. Use when planning a version, deciding whether it is ready, or preparing a release.
---

# Managing releases

## Semantic versioning for a CLI

- **Major:** a change that breaks users or scripts: a removed or renamed command or flag, a changed exit code, a `--json` field removed or retyped, a persisted format that older versions cannot read, a matched message changed.
- **Minor:** something new that changes nothing existing: a command, a flag, an optional field.
- **Patch:** a fix with no change in contract.
- Pre-releases (`1.0.0-rc.1`) for anything that needs real-world use before it is final.

## Ready to publish

```
Release readiness:
- [ ] Nothing open in the milestone, or each open item explicitly moved
- [ ] Every merged issue verified by QA
- [ ] CHANGELOG.md: [Unreleased] complete, written for users, breaking changes marked with a migration note
- [ ] package.json version set
- [ ] npm pack --dry-run: nothing internal ships, nothing needed is missing
- [ ] Clean install from the tarball in a temporary HOME works (fsd -v, fsd init)
```

## Steps

1. Freeze `develop` for the release (only fixes for it).
2. Turn `[Unreleased]` into `## [x.y.z] - YYYY-MM-DD` and fix the compare links.
3. Set the version in `package.json`, in the same PR.
4. **Author:** merge to `main`, tag `vx.y.z`, publish to npm.
5. GitHub Release notes from the same changelog section.
6. After publishing: `npm view <package> version`, a real install, a smoke run.

## When it goes wrong

`npm deprecate <package>@<version> "<reason>"` and publish a patch. Never plan on `npm unpublish`.

## Boundaries

You prepare and decide readiness. Merging into `main` and publishing to npm are the author's.
